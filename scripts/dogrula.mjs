/**
 * Şema doğrulaması.
 *
 * Migration ve seed sonrası, tasarımda söz verdiğimiz kuralların
 * veritabanı seviyesinde gerçekten geçerli olduğunu kontrol eder.
 * CI'da her push'ta çalışır.
 *
 * Bu kontroller "kod öyle yapıyor" değil, "veritabanı izin vermiyor"
 * seviyesinde olmalı — bir hatalı göç betiği arşivi götürebilir.
 */

import postgres from 'postgres';

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DIRECT_URL tanımlı değil.');
  process.exit(1);
}
const sql = postgres(url, { max: 1 });

let hata = 0;

async function kontrol(ad, fn) {
  try {
    const sonuc = await fn();
    if (sonuc === true) {
      console.log(`  ✓ ${ad}`);
    } else {
      console.error(`  ✗ ${ad} — ${sonuc}`);
      hata++;
    }
  } catch (e) {
    console.error(`  ✗ ${ad} — ${e.message}`);
    hata++;
  }
}

async function calistir() {
  console.log('\nVeri bütünlüğü');

  await kontrol('Projeler yüklendi', async () => {
    const [{ n }] = await sql`select count(*)::int as n from proje`;
    return n >= 15 || `beklenen ≥15, gelen ${n}`;
  });

  await kontrol('Daire tipleri yüklendi', async () => {
    const [{ n }] = await sql`select count(*)::int as n from daire_tipi`;
    return n >= 20 || `beklenen ≥20, gelen ${n}`;
  });

  await kontrol('Fiyat arşivi dolu', async () => {
    const [{ n }] = await sql`select count(*)::int as n from fiyat_kaydi`;
    return n > 0 || 'fiyat_kaydi boş';
  });

  console.log('\nHesaplanan alanlar');

  await kontrol('m2_birim otomatik hesaplanıyor', async () => {
    const [r] = await sql`
      select liste_fiyati, net_m2, m2_birim from daire_tipi
      where liste_fiyati is not null and net_m2 is not null limit 1`;
    const beklenen = Number(r.liste_fiyati) / Number(r.net_m2);
    return Math.abs(Number(r.m2_birim) - beklenen) < 0.01
      || `m2_birim ${r.m2_birim}, beklenen ${beklenen}`;
  });

  console.log('\nDeğişmezlik kuralları');

  // Bu iki kontrol tasarımın en önemli iddiasını doğrular:
  // fiyat arşivi ve denetim günlüğü YETKİ SEVİYESİNDE silinemez.
  await kontrol('fiyat_kaydi app_rw için güncellenemez', async () => {
    const [r] = await sql`
      select has_table_privilege('app_rw', 'fiyat_kaydi', 'UPDATE') as yetki`;
    return r.yetki === false || 'app_rw fiyat_kaydi üzerinde UPDATE yetkisine sahip';
  });

  await kontrol('fiyat_kaydi app_rw için silinemez', async () => {
    const [r] = await sql`
      select has_table_privilege('app_rw', 'fiyat_kaydi', 'DELETE') as yetki`;
    return r.yetki === false || 'app_rw fiyat_kaydi üzerinde DELETE yetkisine sahip';
  });

  await kontrol('denetim_gunlugu admin için bile silinemez', async () => {
    const [r] = await sql`
      select has_table_privilege('app_admin', 'denetim_gunlugu', 'DELETE') as yetki`;
    return r.yetki === false || 'app_admin denetim_gunlugu üzerinde DELETE yetkisine sahip';
  });

  await kontrol('kvkk_onay değiştirilemez', async () => {
    const [r] = await sql`
      select has_table_privilege('app_rw', 'kvkk_onay', 'UPDATE') as yetki`;
    return r.yetki === false || 'app_rw kvkk_onay üzerinde UPDATE yetkisine sahip';
  });

  console.log('\nMateryalize görünümler');

  await kontrol('mv_firma_karne dolu', async () => {
    const [{ n }] = await sql`select count(*)::int as n from mv_firma_karne`;
    return n > 0 || 'mv_firma_karne boş';
  });

  await kontrol('Sicil eşiği çalışıyor (2 projeden az → not yok)', async () => {
    const [r] = await sql`
      select count(*)::int as n from mv_firma_karne
      where tamamlanan < 2 and sicil is not null`;
    return r.n === 0 || `${r.n} firmaya yetersiz veriyle not verilmiş`;
  });

  await kontrol('mv_endeks_donem seri üretiyor', async () => {
    const [{ n }] = await sql`select count(*)::int as n from mv_endeks_donem`;
    return n > 0 || 'endeks serisi boş';
  });

  console.log('\nPostGIS');

  await kontrol('Koordinatlar yazıldı', async () => {
    const [{ n }] = await sql`select count(*)::int as n from proje where konum is not null`;
    return n > 0 || 'hiçbir projede koordinat yok';
  });

  await kontrol('Mesafe sorgusu çalışıyor', async () => {
    const [r] = await sql`
      select count(*)::int as n from proje p
      join poi i on st_dwithin(p.konum, i.konum, 3000)
      where i.tip = 'metro'`;
    return r.n > 0 || 'metro yakınında proje bulunamadı';
  });

  console.log('\nVeri kalitesi kuralları');

  await kontrol('Fiyatsız proje listede kalıyor (silinmiyor)', async () => {
    const [{ n }] = await sql`
      select count(*)::int as n from proje p
      where p.yayinda and not exists (
        select 1 from daire_tipi d where d.proje_id = p.id and d.liste_fiyati is not null
      )`;
    return n > 0 || 'seed fiyatsız proje içermiyor — bu durum test edilemiyor';
  });

  await kontrol('Arşiv projeleri yayında kalıyor', async () => {
    const [{ n }] = await sql`
      select count(*)::int as n from proje where durum = 'arsiv' and yayinda`;
    return n > 0 || 'arşiv projesi yok';
  });

  await sql.end();

  if (hata > 0) {
    console.error(`\n${hata} kontrol başarısız.`);
    process.exit(1);
  }
  console.log('\nTüm kontroller geçti.');
}

calistir().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
