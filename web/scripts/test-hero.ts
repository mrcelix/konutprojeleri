import 'dotenv/config';
import { prisma } from '../lib/db';
import { ANAHTAR_KALIBI, heroAnahtarUret } from '../lib/depo';

/**
 * Faz 88 hero görseli yönetimi testleri.
 *   node --conditions=react-server --import tsx scripts/test-hero.ts
 *
 * Sunucu eylemleri `adminZorunlu()` çağırdığı için doğrudan
 * çağrılamıyor (istek bağlamı yok). Burada aynı KURALLAR ve veri
 * etkileri sınanıyor: sıra takası, yayın filtresi, depo anahtarının
 * kayda yazılması ve anahtar biçiminin yol geçişine kapalı olması.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'ZZF88';

async function temizle() {
  await prisma.heroGorsel.deleteMany({ where: { alt: { startsWith: ONEK } } });
}

async function main() {
  await temizle();

  console.log('\n=== 1. Depo anahtarı ===');
  const a1 = heroAnahtarUret('abc123XYZ_-');
  bekle('hero anahtarı hero/ altında', a1.startsWith('hero/'), a1);
  bekle('anahtar kalıbı hero anahtarını kabul ediyor', ANAHTAR_KALIBI.test(a1));
  bekle('proje anahtarı da kabul',
    ANAHTAR_KALIBI.test('proje/abc123/xyz789.webp'));
  bekle('yol geçişi reddediliyor',
    !ANAHTAR_KALIBI.test('hero/../../etc/passwd.webp'));
  bekle('webp dışı uzantı reddediliyor', !ANAHTAR_KALIBI.test('hero/abc.png'));
  bekle('baska klasor reddediliyor', !ANAHTAR_KALIBI.test('gizli/abc.webp'));

  console.log('\n=== 2. Kayıt ve sıra takası ===');
  const enBuyuk = (await prisma.heroGorsel.aggregate({ _max: { sira: true } }))._max.sira ?? 0;
  const h1 = await prisma.heroGorsel.create({
    data: {
      url: '/api/gorsel/hero/bir.webp', alt: `${ONEK} birinci görsel`,
      sira: enBuyuk + 1, aktif: true, depoAnahtar: 'hero/bir.webp',
    },
  });
  const h2 = await prisma.heroGorsel.create({
    data: {
      url: 'https://ornek/iki.jpg', alt: `${ONEK} ikinci görsel`,
      sira: enBuyuk + 2, aktif: false,
    },
  });
  bekle('yüklenen kayıtta depo anahtarı var', h1.depoAnahtar === 'hero/bir.webp');
  bekle('adresle eklenen kayıtta anahtar YOK', h2.depoAnahtar === null,
    'dosya bizim değil, silinirken dokunulmamalı');

  await prisma.$transaction([
    prisma.heroGorsel.update({ where: { id: h1.id }, data: { sira: h2.sira } }),
    prisma.heroGorsel.update({ where: { id: h2.id }, data: { sira: h1.sira } }),
  ]);
  const sirali = await prisma.heroGorsel.findMany({
    where: { alt: { startsWith: ONEK } }, orderBy: { sira: 'asc' }, select: { id: true },
  });
  bekle('komşuyla sıra takası çalışıyor', sirali[0].id === h2.id);

  console.log('\n=== 3. Yayın filtresi ===');
  const yayinda = await prisma.heroGorsel.findMany({
    where: { aktif: true, alt: { startsWith: ONEK } }, select: { id: true },
  });
  bekle('yayından kaldırılan görsel listede yok',
    yayinda.length === 1 && yayinda[0].id === h1.id);

  console.log('\n=== 4. Silme ===');
  await prisma.heroGorsel.delete({ where: { id: h1.id } });
  bekle('kayıt silindi',
    (await prisma.heroGorsel.count({ where: { id: h1.id } })) === 0);
  bekle('diğer kayıt duruyor',
    (await prisma.heroGorsel.count({ where: { id: h2.id } })) === 1);

  console.log('\n=== 5. Temizlik ===');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.heroGorsel.count({ where: { alt: { startsWith: ONEK } } })) === 0);

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
