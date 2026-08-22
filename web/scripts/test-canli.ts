import 'dotenv/config';
import { prisma } from '../lib/db';
import { CANLI_ESIK, TALEP_ESIK, canliOzet, canliSayi, talepSayisi } from '../lib/canli';

/**
 * Sosyal kanıt sayıları.
 *   node --conditions=react-server --import tsx scripts/test-canli.ts
 *
 * En kritik kural: SAYILAR UYDURULMUYOR. Eşiğin altındaki her sayı
 * `null` dönmeli ve rozet hiç basılmamalı; yuvarlayıp şişirmek de
 * uydurma olurdu. Sınamalar bunu ve pencere sınırlarını doğruluyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzz-f114';
const YOL = '/proje/zzz-f114-test';

async function temizle() {
  await prisma.ziyaret.deleteMany({ where: { ziyaretci: { startsWith: ONEK } } });
  await prisma.talep.deleteMany({ where: { kod: { startsWith: 'ZZZ-F114' } } });
  await prisma.proje.deleteMany({ where: { slug: { startsWith: ONEK } } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZZ F114' } } });
  await prisma.bolge.deleteMany({ where: { slug: { startsWith: ONEK } } });
}

/** N ayrık oturum, verilen dakika kadar geçmişte. */
async function ziyaretEkle(adet: number, dakikaOnce: number, onek: string) {
  const an = new Date(Date.now() - dakikaOnce * 60_000);
  await prisma.ziyaret.createMany({
    data: Array.from({ length: adet }, (_, i) => ({
      yol: YOL, tip: 'proje', kanal: 'dogrudan', bot: false, cihaz: 'masaustu',
      ziyaretci: `${ONEK}-${onek}-${i}`, oturum: `${ONEK}-${onek}-o-${i}`,
      olusturma: an,
    })),
  });
}

async function main() {
  await temizle();

  /* ---------- Canlı sayı ---------- */
  bekle('ziyaret yokken sayı null', (await canliSayi(YOL)) === null);

  await ziyaretEkle(CANLI_ESIK - 1, 1, 'az');
  bekle('eşiğin altındaki sayı gösterilmiyor', (await canliSayi(YOL)) === null,
    `${CANLI_ESIK - 1} oturum`);

  await ziyaretEkle(4, 1, 'yeni');
  const canli = await canliSayi(YOL);
  bekle('eşiği geçince gerçek sayı dönüyor', canli === CANLI_ESIK - 1 + 4, `${canli}`);

  /* Beş dakikadan eski ziyaret SAYILMIYOR: "şu anda bakanlar"
     penceresi beş dakika. */
  await ziyaretEkle(20, 9, 'eski');
  bekle('beş dakikadan eski ziyaret sayılmıyor',
    (await canliSayi(YOL)) === CANLI_ESIK - 1 + 4, `${await canliSayi(YOL)}`);

  /* Aynı oturumun ikinci sayfa görüntülemesi kişiyi ikiye katlamamalı. */
  await prisma.ziyaret.create({
    data: {
      yol: YOL, tip: 'proje', kanal: 'dogrudan', bot: false, cihaz: 'masaustu',
      ziyaretci: `${ONEK}-yeni-0`, oturum: `${ONEK}-yeni-o-0`,
    },
  });
  bekle('aynı oturum bir kez sayılıyor',
    (await canliSayi(YOL)) === CANLI_ESIK - 1 + 4);

  /* Bot trafiği sosyal kanıt değil. */
  await prisma.ziyaret.createMany({
    data: Array.from({ length: 30 }, (_, i) => ({
      yol: YOL, tip: 'proje', kanal: 'organik', bot: true, botAdi: 'googlebot',
      cihaz: 'masaustu', ziyaretci: `${ONEK}-bot-${i}`, oturum: `${ONEK}-bot-o-${i}`,
    })),
  });
  bekle('bot ziyaretleri sayılmıyor',
    (await canliSayi(YOL)) === CANLI_ESIK - 1 + 4, `${await canliSayi(YOL)}`);

  /* Başka yolun ziyareti bu sayfaya yazılmamalı. */
  await prisma.ziyaret.createMany({
    data: Array.from({ length: 9 }, (_, i) => ({
      yol: '/proje/zzz-f114-baska', tip: 'proje', kanal: 'dogrudan', bot: false,
      cihaz: 'masaustu', ziyaretci: `${ONEK}-bsk-${i}`, oturum: `${ONEK}-bsk-o-${i}`,
    })),
  });
  bekle('sayı yola göre ayrışıyor',
    (await canliSayi(YOL)) === CANLI_ESIK - 1 + 4);

  /* ---------- Talep ---------- */
  const bolge = await prisma.bolge.create({
    data: {
      slug: `${ONEK}-koy`, ad: 'ZZZ F114', il: 'ZZ', lat: 36.2, lng: 29.6,
      img: 'photo-0', ozet: 'x'.repeat(60),
      icerik: { fiyatlar: [], ulasim: [], yapilacaklar: [], ipuclari: [] },
      adet: 0, yayinda: true,
    },
  });
  const firma = await prisma.firma.create({
    data: {
      slug: `${ONEK}-firma`, ad: 'ZZZ F114 Firma',
      ozet: 'Canlı sayı testleri için açılan geçici firma kaydı.',
    },
  });
  const proje = await prisma.proje.create({
    data: {
      slug: `${ONEK}-proje`, ad: 'ZZZ F114 Proje', bolgeId: bolge.id,
      firmaId: firma.id, mahalle: 'ZZ', lat: 40.98, lng: 29.12,
      tip: 'KONUT', durum: 'SATISTA',
      fiyatMin: 4_000_000, fiyatMax: 8_000_000, ozet: 'x'.repeat(60),
      yayinTarihi: new Date('2026-01-01T00:00:00Z'), yayinda: true,
    },
  });

  bekle('talep yokken null', (await talepSayisi(proje.id)) === null);

  /* Sayılan tek şey FORM DOLDURANLAR. Görüntüleme sayılsaydı rozet
     "3 kişi ilgilendi" derken kimse form doldurmamış olabilirdi;
     sosyal kanıt ancak gerçek bir eylemi yansıtıyorsa işe yarıyor. */
  await prisma.talep.createMany({
    data: Array.from({ length: TALEP_ESIK - 1 }, (_, i) => ({
      kod: `ZZZ-F114-A${i}`, projeId: proje.id, ad: 'Zzz',
      telefon: `532111${String(1000 + i).slice(0, 4)}`, kvkkOnay: true,
    })),
  });
  bekle('eşiğin altındaki talep gösterilmiyor', (await talepSayisi(proje.id)) === null);

  await prisma.talep.createMany({
    data: Array.from({ length: 3 }, (_, i) => ({
      kod: `ZZZ-F114-B${i}`, projeId: proje.id, ad: 'Zzz',
      telefon: `532222${String(2000 + i).slice(0, 4)}`, kvkkOnay: true,
    })),
  });
  const talep = await talepSayisi(proje.id);
  bekle('eşiği geçince gerçek talep dönüyor', talep === TALEP_ESIK - 1 + 3, `${talep}`);

  /* Sekiz günlük talep haftalık sayıya girmemeli. */
  await prisma.talep.create({
    data: {
      kod: 'ZZZ-F114-ESKI', projeId: proje.id, ad: 'Zzz',
      telefon: '5329998877', kvkkOnay: true,
      olusturma: new Date(Date.now() - 8 * 864e5),
    },
  });
  bekle('yedi günden eski talep sayılmıyor',
    (await talepSayisi(proje.id)) === TALEP_ESIK - 1 + 3, `${await talepSayisi(proje.id)}`);

  /* ---------- Birleşik özet ---------- */
  const ozet = await canliOzet(YOL, proje.id);
  bekle('özet iki sayıyı birlikte veriyor',
    ozet.canli === CANLI_ESIK - 1 + 4 && ozet.talep === TALEP_ESIK - 1 + 3);
  const projesiz = await canliOzet(YOL);
  bekle('proje verilmezse talep sorulmuyor', projesiz.talep === null);

  await temizle();
  console.log(`\n  ${gecen} geçti, ${kalan} kaldı`);
  await prisma.$disconnect();
  if (kalan) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await temizle().catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
