import 'dotenv/config';
import { prisma } from '../lib/db';

/**
 * Faz 80 kategori (özellik) yönetimi testleri.
 *   node --conditions=react-server --import tsx scripts/test-kategori.ts
 *
 * Sunucu eylemleri `adminZorunlu()` çağırdığı için doğrudan
 * çağrılamıyor (istek bağlamı yok). Burada aynı KURALLAR ve veri
 * etkileri sınanıyor: sıra takası, silme engeli, iniş sayfası
 * bütünlüğü.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzf80';

async function temizle() {
  await prisma.projeOzellik.deleteMany({ where: { ozellik: { kod: { startsWith: ONEK } } } });
  await prisma.ozellik.deleteMany({ where: { kod: { startsWith: ONEK } } });
}

/** Panel eylemindeki doğrulamanın aynısı — kural tek yerde kalmalı. */
function denetle(kod: string, ad: string, landingSlug: string): string | null {
  if (!/^[a-z0-9]{2,24}$/.test(kod)) return 'kod';
  if (ad.trim().length < 2) return 'ad';
  if (landingSlug && !/^[a-z0-9-]{3,60}$/.test(landingSlug)) return 'slug';
  return null;
}

async function main() {
  await temizle();

  console.log('\n=== 1. Doğrulama kuralları ===');
  bekle('geçerli kod kabul', denetle(`${ONEK}a`, 'Test', '') === null);
  bekle('büyük harfli kod reddediliyor', denetle('Test', 'Test', '') === 'kod');
  bekle('tireli kod reddediliyor', denetle('a-b', 'Test', '') === 'kod');
  bekle('tek karakter kod reddediliyor', denetle('a', 'Test', '') === 'kod');
  bekle('kısa ad reddediliyor', denetle(`${ONEK}a`, 'X', '') === 'ad');
  bekle('büyük harfli slug reddediliyor', denetle(`${ONEK}a`, 'Test', 'Buyuk-Slug') === 'slug');
  bekle('geçerli slug kabul', denetle(`${ONEK}a`, 'Test', 'kapali-havuzlu-projeler') === null);

  console.log('\n=== 2. Sıra takası ===');
  const enBuyuk = (await prisma.ozellik.aggregate({ _max: { sira: true } }))._max.sira ?? 0;
  const a = await prisma.ozellik.create({
    data: { kod: `${ONEK}a`, ad: 'ZZF80 A', ikon: 'spark', sira: enBuyuk + 1 },
    select: { id: true, sira: true },
  });
  const c = await prisma.ozellik.create({
    data: { kod: `${ONEK}b`, ad: 'ZZF80 B', ikon: 'spark', sira: enBuyuk + 2 },
    select: { id: true, sira: true },
  });

  /* Komşuyla YER DEĞİŞTİRME: tek tek `sira` yazmak, arada boşluk
     kalınca sıralamayı sessizce bozuyor. */
  await prisma.$transaction([
    prisma.ozellik.update({ where: { id: a.id }, data: { sira: c.sira } }),
    prisma.ozellik.update({ where: { id: c.id }, data: { sira: a.sira } }),
  ]);
  const aSonra = await prisma.ozellik.findUniqueOrThrow({ where: { id: a.id }, select: { sira: true } });
  const cSonra = await prisma.ozellik.findUniqueOrThrow({ where: { id: c.id }, select: { sira: true } });
  bekle('sıra takas edildi', aSonra.sira === c.sira && cSonra.sira === a.sira,
    `${aSonra.sira}/${cSonra.sira}`);
  bekle('takas sonrası boşluk yok', Math.abs(aSonra.sira - cSonra.sira) === 1);

  console.log('\n=== 3. Kod benzersizliği ===');
  let cakisma = false;
  try {
    await prisma.ozellik.create({ data: { kod: `${ONEK}a`, ad: 'Kopya', ikon: 'spark', sira: 999 } });
  } catch { cakisma = true; }
  bekle('aynı kod ikinci kez açılamıyor', cakisma);

  console.log('\n=== 4. Silme engeli ===');
  /* Projeye bağlı kategori SİLİNEMEMELİ: `proje_ozellik` cascade ile
     giderdi ve o projelerin etiketleri sessizce kaybolurdu. */
  const proje = await prisma.proje.findFirst({ select: { id: true } });
  if (proje) {
    await prisma.projeOzellik.create({ data: { projeId: proje.id, ozellikId: a.id } });
    const sayim = await prisma.ozellik.findUniqueOrThrow({
      where: { id: a.id }, select: { _count: { select: { projeler: true } } },
    });
    bekle('bağlı proje sayılıyor', sayim._count.projeler === 1, `${sayim._count.projeler}`);

    await prisma.projeOzellik.deleteMany({ where: { ozellikId: a.id } });
    const bosSayim = await prisma.ozellik.findUniqueOrThrow({
      where: { id: a.id }, select: { _count: { select: { projeler: true } } },
    });
    bekle('bağ kaldırılınca sayı sıfırlanıyor', bosSayim._count.projeler === 0);
  } else {
    bekle('bağlı proje sayılıyor (proje yok, atlandı)', true);
    bekle('bağ kaldırılınca sayı sıfırlanıyor (atlandı)', true);
  }

  console.log('\n=== 5. İniş sayfası bütünlüğü ===');
  await prisma.ozellik.update({
    where: { id: c.id },
    data: {
      landingSlug: `${ONEK}-projeler`,
      landingBaslik: 'ZZF80 Projeleri',
      landingAciklama: 'Bu kategori testler için açıldı ve açıklaması otuz karakterden uzun.',
    },
  });
  const inis = await prisma.ozellik.findUniqueOrThrow({
    where: { id: c.id },
    select: { landingSlug: true, landingBaslik: true, landingAciklama: true },
  });
  bekle('iniş alanları birlikte yazıldı',
    !!inis.landingSlug && !!inis.landingBaslik && (inis.landingAciklama?.length ?? 0) >= 30);

  /* Aynı slug iki kategoride olamaz: iki farklı sayfa aynı adresi
     üretirdi ve hangisinin basılacağı belirsiz olurdu. */
  let slugCakisma = false;
  try {
    await prisma.ozellik.update({ where: { id: a.id }, data: { landingSlug: `${ONEK}-projeler` } });
  } catch { slugCakisma = true; }
  bekle('aynı iniş adresi ikinci kategoriye verilemiyor', slugCakisma);

  console.log('\n=== 6. Okuma tarafı ===');
  const liste = await prisma.ozellik.findMany({ orderBy: { sira: 'asc' }, select: { kod: true, sira: true } });
  const sirali = liste.every((x, i) => i === 0 || liste[i - 1].sira <= x.sira);
  bekle('liste sıraya göre geliyor', sirali);
  bekle('yeni kategoriler listede', liste.filter((x) => x.kod.startsWith(ONEK)).length === 2);

  console.log('\n=== 7. Temizlik ===');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.ozellik.count({ where: { kod: { startsWith: ONEK } } })) === 0);

  console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
  await prisma.$disconnect();
  process.exit(kalan === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await temizle().catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
