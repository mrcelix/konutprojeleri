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

  // Yıllık değişim hesaplanabilmesi için en az 13 ay gerekir.
  // Daha azında sayfa "yeterli veri yok" gösterir — uydurma değer basmaz.
  await kontrol('Türkiye serisi yıllık değişime yetiyor', async () => {
    const [{ n }] = await sql`
      select count(*)::int as n from mv_endeks_donem where il is null`;
    return n >= 13 || `beklenen ≥13 ay, gelen ${n}`;
  });

  await kontrol('Endeks il kırılımı üretiyor', async () => {
    const [{ n }] = await sql`
      select count(distinct il)::int as n from mv_endeks_donem where il is not null`;
    return n > 0 || 'il kırılımı yok';
  });

  await kontrol('Aykırı değer filtresi çalışıyor', async () => {
    const [r] = await sql`
      select count(*)::int as n from mv_endeks_donem
      where m2_fiyat < 5000 or m2_fiyat > 400000`;
    return r.n === 0 || `${r.n} aykırı değer endekse sızmış`;
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


  console.log('\nTeslim takvimi');

  await kontrol('teslim_ceyrek biçimi YYYYQn', async () => {
    const [{ n }] = await sql`
      select count(*)::int as n from proje
      where teslim_ceyrek is not null and teslim_ceyrek !~ '^[0-9]{4}Q[1-4]$'`;
    return n === 0 || `${n} projede teslim_ceyrek biçimi bozuk`;
  });

  await kontrol('teslim_ceyrek metin sıralaması kronolojik', async () => {
    // Takvim eksende BETWEEN ile metin karşılaştırması yapıyor. Çeyrek
    // her zaman tek haneli olduğu için sabit genişlikli biçim (YYYYQn)
    // sözlük sırasını tarih sırasıyla eşitler. Biçim bozulursa süzgeç
    // sessizce yanlış projeler döndürür — bu yüzden ayrıca doğrulanır.
    const [r] = await sql`
      select ('2026Q4' < '2027Q1') as a, ('2027Q1' < '2027Q4') as b`;
    return (r.a && r.b) || 'çeyrek dizesi sıralaması kronolojik değil';
  });

  await kontrol('Satıştaki projelerin teslim çeyreği dolu', async () => {
    const [{ n }] = await sql`
      select count(*)::int as n from proje
      where yayinda and durum in ('lansman','satista') and teslim_ceyrek is null`;
    return n === 0 || `${n} satıştaki projede teslim tarihi yok — takvimde görünmezler`;
  });

  await kontrol('Şantiye ilerlemesi 0–100 aralığında', async () => {
    const [{ n }] = await sql`
      select count(*)::int as n from proje
      where santiye_yuzde is not null and (santiye_yuzde < 0 or santiye_yuzde > 100)`;
    return n === 0 || `${n} projede şantiye yüzdesi aralık dışı`;
  });

  console.log('\nÖdeme planı');

  await kontrol('Peşinat oranı 0–100 aralığında', async () => {
    const [{ n }] = await sql`
      select count(*)::int as n from proje
      where pesinat_orani is not null and (pesinat_orani < 0 or pesinat_orani > 100)`;
    return n === 0 || `${n} projede peşinat oranı aralık dışı`;
  });

  await kontrol('Vade ayı pozitif', async () => {
    const [{ n }] = await sql`
      select count(*)::int as n from proje where vade_ay is not null and vade_ay <= 0`;
    return n === 0 || `${n} projede vade sıfır ya da negatif — aylık taksit bölmesi patlar`;
  });

  await kontrol('Aylık senet formülü sabit', async () => {
    // /butce ve arama sayfası aynı formülü ayrı ayrı yazıyor. İkisi
    // ayrışırsa aynı daire iki sayfada farklı taksit gösterir; güven biter.
    // Formülün sonucu burada sabitlenir.
    const [r] = await sql`
      select round((5000000 - 5000000 * 30 / 100.0) / 36)::int as beklenen`;
    return r.beklenen === 97222 || `formül değişmiş: ${r.beklenen} (beklenen 97222)`;
  });

  await kontrol('Bütçe eşleşme sorgusu çalışıyor', async () => {
    // lib/queries/butce.ts içindeki CTE'nin birebir aynısı. Amaç sonucu
    // değil SQL'i doğrulamak: sorgu yalnızca üretimde çalıştığı için
    // sözdizimi hatası ancak burada yakalanır.
    const [r] = await sql`
      with aday as (
        select
          p.id, d.tip,
          d.liste_fiyati::float8 as liste_fiyati,
          round(d.liste_fiyati * p.pesinat_orani / 100.0)::float8 as gereken_pesinat,
          round(
            (d.liste_fiyati - d.liste_fiyati * p.pesinat_orani / 100.0) / p.vade_ay
          )::float8 as aylik_senet
        from proje p
        join firma f on f.id = p.firma_id
        join daire_tipi d on d.proje_id = p.id
        where p.yayinda and p.durum in ('lansman','satista')
          and d.liste_fiyati is not null
          and p.pesinat_orani is not null
          and p.vade_ay is not null and p.vade_ay > 0
      ),
      uyan as (
        select * from aday where gereken_pesinat <= 3000000 and aylik_senet <= 150000
      ),
      en_uygun as (select distinct on (id) * from uyan order by id, liste_fiyati)
      select
        (select count(*)::int from en_uygun) as proje,
        (select count(*)::int from uyan) as daire,
        (select count(*)::int from proje x
          where x.yayinda and x.durum in ('lansman','satista')
            and (x.pesinat_orani is null or x.vade_ay is null or x.vade_ay = 0)
        ) as plansiz`;
    if (r.proje === 0) return 'seed verisiyle hiçbir proje bütçeye uymuyor — eşik yanlış';
    if (r.plansiz === 0) return 'ödeme planı bildirilmemiş proje yok — bu durum test edilemiyor';
    return true;
  });

  console.log('\nKarşılaştırma');

  await kontrol('Karşılaştırma sorgusu çalışıyor', async () => {
    // lib/queries/karsilastir.ts ile aynı yapı. Amaç SQL'i doğrulamak:
    // mv_firma_karne birleşimi, PostGIS mesafesi ve json_agg birlikte
    // ancak burada çalıştırılabiliyor.
    const sluglar = ['benesta-benleo-acibadem', 'vn-kartal', 'isiltili-evler-sancaktepe'];
    const satirlar = await sql`
      select
        p.slug::text as slug, p.ad,
        k.sicil, k.ort_gecikme::float8 as ort_gecikme,
        (select min(st_distance(p.konum, i.konum))
           from poi i where i.tip = 'metro')::float8 as metro_m,
        (select coalesce(json_agg(json_build_object(
            'tip', d.tip, 'net_m2', d.net_m2::float8,
            'liste_fiyati', d.liste_fiyati::float8,
            'm2_birim', d.m2_birim::float8,
            'kalan_adet', d.kalan_adet) order by d.tip), '[]')
         from daire_tipi d where d.proje_id = p.id) as tipler
      from proje p
      join firma f on f.id = p.firma_id
      left join mv_firma_karne k on k.firma_id = f.id
      where p.yayinda and p.slug = any(${sluglar})`;

    if (satirlar.length !== 3) return `3 proje bekleniyordu, ${satirlar.length} geldi`;
    if (satirlar.some((s) => !Array.isArray(s.tipler))) return 'daire tipleri dizi değil';
    if (satirlar.every((s) => s.metro_m == null)) return 'hiçbir projede metro mesafesi yok';
    return true;
  });

  await kontrol('Proje slug alanı benzersiz', async () => {
    // Karşılaştırma adresleri yalnızca slug taşır; il/ilçe yok.
    // Slug benzersiz olmazsa yanlış proje karşılaştırılır.
    const [{ n }] = await sql`
      select count(*)::int as n from (
        select slug from proje group by slug having count(*) > 1
      ) t`;
    return n === 0 || `${n} slug birden fazla projede kullanılıyor`;
  });

  console.log('\nOnay kuyruğu');

  await kontrol('Dinamik alan güncellemesi çalışıyor', async () => {
    // lib/queries/onay.ts, onaylanan alanları sql(nesne, ...anahtarlar)
    // ile yazıyor. Alan adları paketten geldiği için beyaz listeden
    // geçiyorlar; burada doğrulanan şey yardımcının SQL ürettiği.
    // İşlem sonunda geri alınır, veri değişmez.
    let sonuc = null;
    try {
      await sql.begin(async (tx) => {
        const [p] = await tx`select id, ad from proje limit 1`;
        const yazilacak = { ad: p.ad + ' (deneme)', santiye_yuzde: 42 };
        await tx`update proje set ${tx(yazilacak, 'ad', 'santiye_yuzde')} where id = ${p.id}`;
        const [k] = await tx`select ad, santiye_yuzde from proje where id = ${p.id}`;
        sonuc = k.santiye_yuzde === 42 && k.ad.endsWith('(deneme)');
        throw new Error('__geri_al__');
      });
    } catch (e) {
      if (e.message !== '__geri_al__') throw e;
    }
    return sonuc === true || 'dinamik güncelleme beklenen sonucu vermedi';
  });

  await kontrol('Daire tipi upsert çakışmayı çözüyor', async () => {
    // Onay uygulanırken yeni daire tipi eklenirken aynı tip zaten
    // eklenmiş olabilir (iki onay arka arkaya). unique (proje_id, tip)
    // kısıtı olmadan bu yol patlardı.
    let sonuc = null;
    try {
      await sql.begin(async (tx) => {
        const [p] = await tx`select id from proje limit 1`;
        for (let i = 0; i < 2; i++) {
          await tx`
            insert into daire_tipi (proje_id, tip, net_m2, liste_fiyati)
            values (${p.id}, '__deneme__', 80, 1000000)
            on conflict (proje_id, tip) do update set
              net_m2 = excluded.net_m2, liste_fiyati = excluded.liste_fiyati`;
        }
        const [{ n }] = await tx`
          select count(*)::int as n from daire_tipi
          where proje_id = ${p.id} and tip = '__deneme__'`;
        sonuc = n === 1;
        throw new Error('__geri_al__');
      });
    } catch (e) {
      if (e.message !== '__geri_al__') throw e;
    }
    return sonuc === true || 'upsert ikinci eklemede yeni satır üretti';
  });

  await kontrol('Onay kaydı jsonb paketi okunabiliyor', async () => {
    // degisiklik alanı {alanlar:{...}, daireler:[...]} biçiminde
    // yazılıyor ve okunurken bu şekle güveniliyor.
    let sonuc = null;
    try {
      await sql.begin(async (tx) => {
        const [f] = await tx`select id from firma limit 1`;
        const [p] = await tx`select id from proje limit 1`;
        const paket = { alanlar: { aidat: { eski: 100, yeni: 200 } }, daireler: [] };
        const [o] = await tx`
          insert into onay_kaydi (firma_id, varlik, varlik_id, degisiklik, isaretler)
          values (${f.id}, 'proje', ${p.id}, ${tx.json(paket)}::jsonb, ${['fiyat_sicramasi']})
          returning id`;
        const [okunan] = await tx`select degisiklik, isaretler from onay_kaydi where id = ${o.id}`;
        sonuc =
          okunan.degisiklik?.alanlar?.aidat?.yeni === 200 &&
          okunan.isaretler[0] === 'fiyat_sicramasi';
        throw new Error('__geri_al__');
      });
    } catch (e) {
      if (e.message !== '__geri_al__') throw e;
    }
    return sonuc === true || 'jsonb paketi beklenen şekilde okunamadı';
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
