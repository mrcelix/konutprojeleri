import 'dotenv/config';
import { prisma } from '../lib/db';
import { kampanyaDenetle } from '../lib/kampanya';

/**
 * Faz 59 kampanya şeridi testleri.
 *   node --conditions=react-server --import tsx scripts/test-kampanya.ts
 *
 * Asıl sınanan, şeridin TARİHE bağlı olması: süresi dolan kampanya
 * kendiliğinden düşmeli. Elle kapatmayı beklemek, unutulunca süresi
 * geçmiş bir indirimi vaat etmek demekti.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'ZZF59';
const gun = (n: number) => new Date(Date.now() + n * 864e5);

async function temizle() {
  await prisma.kampanya.deleteMany({ where: { metin: { startsWith: ONEK } } });
}

/** Sitenin gösterdiği kampanyayı seçen sorgu — `lib/kampanya.ts` ile aynı kural. */
async function yayindaki() {
  const simdi = new Date();
  return prisma.kampanya.findFirst({
    where: { aktif: true, baslangic: { lte: simdi }, bitis: { gt: simdi } },
    orderBy: { baslangic: 'desc' },
    select: { metin: true },
  });
}

async function main() {
  await temizle();

  console.log('\n=== 1. Dogrulama ===');
  const temel = { metin: `${ONEK} erken rezervasyonda indirim`, baslangic: gun(0), bitis: gun(7) };
  bekle('geçerli girdi kabul', kampanyaDenetle(temel) === null);
  bekle('kısa metin reddediliyor', kampanyaDenetle({ ...temel, metin: 'kısa' }) !== null);
  bekle('uzun metin reddediliyor', kampanyaDenetle({ ...temel, metin: 'x'.repeat(201) }) !== null);
  bekle('ters tarih reddediliyor',
    kampanyaDenetle({ ...temel, baslangic: gun(7), bitis: gun(1) }) !== null);
  bekle('aynı tarih reddediliyor',
    kampanyaDenetle({ ...temel, baslangic: gun(3), bitis: gun(3) }) !== null);
  bekle('bozuk tarih reddediliyor',
    kampanyaDenetle({ ...temel, bitis: new Date('olmayan') }) !== null);

  /* Düğme ya tam ya hiç: yalnızca metin girilirse tıklanamayan bir
     düğme, yalnızca adres girilirse etiketsiz bir düğme çıkardı. */
  bekle('yalnız düğme metni reddediliyor',
    kampanyaDenetle({ ...temel, cagriAd: 'Gör' }) !== null);
  bekle('yalnız düğme adresi reddediliyor',
    kampanyaDenetle({ ...temel, cagriYol: '/arama' }) !== null);
  bekle('ikisi birlikte kabul',
    kampanyaDenetle({ ...temel, cagriAd: 'Gör', cagriYol: '/arama' }) === null);
  bekle('dış adres reddediliyor',
    kampanyaDenetle({ ...temel, cagriAd: 'Gör', cagriYol: 'https://baska.site' }) !== null);

  console.log('\n=== 2. Yayinda olma kurali ===');
  await prisma.kampanya.create({
    data: { metin: `${ONEK} aktif`, baslangic: gun(-1), bitis: gun(5), aktif: true },
  });
  bekle('aktif kampanya yayında', (await yayindaki())?.metin === `${ONEK} aktif`);

  await temizle();
  await prisma.kampanya.create({
    data: { metin: `${ONEK} gelecek`, baslangic: gun(3), bitis: gun(10), aktif: true },
  });
  bekle('başlamamış kampanya yayında değil', (await yayindaki()) === null);

  await temizle();
  await prisma.kampanya.create({
    data: { metin: `${ONEK} bitmis`, baslangic: gun(-10), bitis: gun(-1), aktif: true },
  });
  /* SÜRESİ DOLAN KENDİLİĞİNDEN DÜŞÜYOR: elle kapatılması gerekmiyor. */
  bekle('süresi dolan kampanya yayında değil', (await yayindaki()) === null);

  await temizle();
  await prisma.kampanya.create({
    data: { metin: `${ONEK} kapali`, baslangic: gun(-1), bitis: gun(5), aktif: false },
  });
  bekle('kapalı kampanya yayında değil', (await yayindaki()) === null);

  console.log('\n=== 3. Coklu kampanya ===');
  await temizle();
  await prisma.kampanya.createMany({
    data: [
      { metin: `${ONEK} eski`, baslangic: gun(-5), bitis: gun(5), aktif: true },
      { metin: `${ONEK} yeni`, baslangic: gun(-1), bitis: gun(5), aktif: true },
    ],
  });
  // En son BAŞLAYAN kazanıyor
  bekle('en son başlayan gösteriliyor', (await yayindaki())?.metin === `${ONEK} yeni`,
    (await yayindaki())?.metin ?? '');

  console.log('\n=== 4. Temizlik ===');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.kampanya.count({ where: { metin: { startsWith: ONEK } } })) === 0);

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
