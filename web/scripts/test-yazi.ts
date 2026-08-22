import 'dotenv/config';
import { prisma } from '../lib/db';
/* Önbellekli sarmalayıcılar (`yazilar`, `bolgeYazilari`) istek bağlamı
   olmadan boş dönüyor ve iddialar boşa geçerdi; ham okuyucular sınanıyor. */
import { bolgeYazilariHam, okumaSuresi, yaziDenetle, yaziGetir, yazilariOku } from '../lib/yazi';
import type { GovdeBlogu } from '../lib/icerik-bicim';

/**
 * Faz 61 rehber yazısı testleri.
 *   node --conditions=react-server --import tsx scripts/test-yazi.ts
 *
 * Sınananlar: yayında olmayan yazı hiçbir okuma yolundan görünmüyor
 * (liste, tekil, bölge bağı) ve okuma süresi gövdeden türüyor. İkincisi
 * elle girilseydi güncellenen yazılarda eskirdi.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzf61';

async function temizle() {
  await prisma.yazi.deleteMany({ where: { slug: { startsWith: ONEK } } });
}

const govde: GovdeBlogu[] = [
  { h: 'Başlık', p: 'Bir paragraf metin.' },
  { liste: ['madde bir', 'madde iki'] },
];

async function main() {
  await temizle();

  console.log('\n=== 1. Okuma suresi ===');
  bekle('boş gövde en az 1 dk', okumaSuresi([]) === 1);
  const uzun: GovdeBlogu[] = [{ p: Array.from({ length: 600 }, () => 'kelime').join(' ') }];
  bekle('600 kelime 3 dk', okumaSuresi(uzun) === 3, `${okumaSuresi(uzun)}`);
  bekle('liste maddeleri de sayılıyor',
    okumaSuresi([{ liste: Array.from({ length: 400 }, () => 'kelime') }]) === 2,
    `${okumaSuresi([{ liste: Array.from({ length: 400 }, () => 'kelime') }])}`);

  console.log('\n=== 2. Dogrulama ===');
  const temel = {
    slug: `${ONEK}-kas-rehberi`,
    baslik: 'Kaş’ta üç gün: nerede kalınır, ne yenir',
    ozet: 'Kaş’ta üç günlük bir program: hangi mevkide kalmalı, hangi koya gitmeli ve akşam nerede yemek yenir.',
    govde,
  };
  bekle('geçerli girdi kabul', yaziDenetle(temel) === null, yaziDenetle(temel) ?? '');
  bekle('büyük harfli slug reddediliyor', yaziDenetle({ ...temel, slug: 'Kas-Rehberi' }) !== null);
  bekle('kısa slug reddediliyor', yaziDenetle({ ...temel, slug: 'ab' }) !== null);
  bekle('kısa başlık reddediliyor', yaziDenetle({ ...temel, baslik: 'Kısa' }) !== null);
  /* Özet hem kartta hem Google sonucunda görünüyor. */
  bekle('kısa özet reddediliyor', yaziDenetle({ ...temel, ozet: 'çok kısa' }) !== null);
  bekle('uzun özet reddediliyor', yaziDenetle({ ...temel, ozet: 'x'.repeat(201) }) !== null);
  bekle('boş gövde reddediliyor', yaziDenetle({ ...temel, govde: [] }) !== null);
  bekle('göreli kapak adresi reddediliyor', yaziDenetle({ ...temel, kapak: '/foto.jpg' }) !== null);
  bekle('tam kapak adresi kabul', yaziDenetle({ ...temel, kapak: 'https://x.test/a.jpg' }) === null);

  console.log('\n=== 3. Yayin kapisi ===');
  const bolge = await prisma.bolge.findFirstOrThrow({ select: { id: true, slug: true } });
  const taslak = await prisma.yazi.create({
    data: {
      slug: `${ONEK}-taslak`, baslik: 'Taslak yazı başlığı burada',
      ozet: 'Bu bir taslak yazının özeti; elli karakterden uzun olması gerektiği için biraz uzatılmıştır.',
      govde: govde as never, bolgeId: bolge.id, yayinda: false, okumaDk: 2,
    },
    select: { id: true },
  });
  /* Yayında olmayan yazı HİÇBİR okuma yolundan görünmemeli. */
  bekle('taslak listede yok', !(await yazilariOku()).some((y) => y.slug === `${ONEK}-taslak`));
  bekle('taslak tekil okumada yok', (await yaziGetir(`${ONEK}-taslak`)) === null);
  bekle('taslak bölge bağında yok',
    !(await bolgeYazilariHam(bolge.slug, 50)).some((y) => y.slug === `${ONEK}-taslak`));

  await prisma.yazi.update({ where: { id: taslak.id }, data: { yayinda: true } });
  bekle('yayına alınınca tekil okumada var', (await yaziGetir(`${ONEK}-taslak`)) !== null);

  console.log('\n=== 4. Bolge bagi ===');
  const okunan = await yaziGetir(`${ONEK}-taslak`);
  bekle('bölge bilgisi taşınıyor', okunan?.bolge?.slug === bolge.slug, okunan?.bolge?.slug ?? '');
  bekle('gövde blokları okundu', (okunan?.govde.length ?? 0) === 2, `${okunan?.govde.length}`);

  const bolgesiz = await prisma.yazi.create({
    data: {
      slug: `${ONEK}-bolgesiz`, baslik: 'Bölgesiz yazı başlığı burada',
      ozet: 'Bölgeye bağlı olmayan bir yazının özeti; elli karakterden uzun olsun diye biraz uzatıldı.',
      govde: govde as never, yayinda: true, okumaDk: 1,
    },
    select: { id: true },
  });
  bekle('bölgesiz yazı bölge bağında çıkmıyor',
    !(await bolgeYazilariHam(bolge.slug, 50)).some((y) => y.slug === `${ONEK}-bolgesiz`),
    `${bolgesiz.id.slice(0, 4)}`);

  console.log('\n=== 5. Temizlik ===');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.yazi.count({ where: { slug: { startsWith: ONEK } } })) === 0);

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
