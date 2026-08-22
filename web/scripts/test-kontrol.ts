import 'dotenv/config';
import type { Prisma } from '../lib/generated/prisma';
import { prisma } from '../lib/db';
import {
  KONTROL_MADDELERI, kontrolOzeti, sonuclariAyikla,
} from '../lib/kontrol-kayit';

/**
 * Yerinde inceleme raporu.
 *   node --conditions=react-server --import tsx scripts/test-kontrol.ts
 *
 * Rapor "her proje yerinde incelendi" vaadinin kanıtı; kanıtın kendisi
 * bozuksa vaat de bozuluyor. Sınamalar: bilinmeyen madde kodu
 * ayıklanıyor, geçersiz durum kaydedilmiyor, özet doğru sayıyor,
 * yayında olmayan rapor okunmuyor, proje silinince rapor da gidiyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzz-f110';

async function temizle() {
  await prisma.proje.deleteMany({ where: { slug: { startsWith: ONEK } } });
  await prisma.bolge.deleteMany({ where: { slug: { startsWith: ONEK } } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZF110' } } });
}

async function main() {
  await temizle();

  /* ---------- Ayıklama ---------- */
  const ham = [
    { kod: 'yapi-ruhsati', durum: 'gecti' },
    { kod: 'ilerleme', durum: 'kalmadi', not: '  Sitede %60 yazıyor, şantiyede kaba inşaat sürüyor  ' },
    { kod: 'iskan', durum: 'uygulanmaz' },
    { kod: 'olmayan-madde', durum: 'gecti' },
    { kod: 'ornek-olcu', durum: 'belirsiz' },
    { kod: 'gorsel' },
    'metin',
    null,
  ];
  const temiz = sonuclariAyikla(ham);
  bekle('bilinmeyen madde kodu ayıklanıyor', !temiz.some((x) => x.kod === 'olmayan-madde'));
  bekle('geçersiz durum ayıklanıyor', !temiz.some((x) => x.kod === 'ornek-olcu'));
  bekle('durumsuz madde ayıklanıyor', !temiz.some((x) => x.kod === 'gorsel'));
  bekle('geçerli üç madde kalıyor', temiz.length === 3, `${temiz.length} madde`);
  bekle('not kırpılıyor',
    temiz.find((x) => x.kod === 'ilerleme')?.not
      === 'Sitede %60 yazıyor, şantiyede kaba inşaat sürüyor');

  /* ---------- Özet ---------- */
  const o = kontrolOzeti(temiz);
  bekle('uygulanmaz madde bakılan sayısına girmiyor', o.bakilan === 2, `${o.bakilan} bakılan`);
  bekle('geçen ve kalan doğru', o.gecen === 1 && o.kalan === 1);
  bekle('toplam madde sayısı kayıttan geliyor', o.toplam === KONTROL_MADDELERI.length);

  /* ---------- Veritabanı ---------- */
  const bolge = await prisma.bolge.create({
    data: {
      slug: `${ONEK}-koy`, ad: 'ZZ Koy', il: 'ZZ', lat: 36.2, lng: 29.6,
      img: 'photo-0', ozet: 'x'.repeat(60),
      icerik: { fiyatlar: [], ulasim: [], yapilacaklar: [], ipuclari: [] },
      adet: 0, yayinda: true,
    },
    select: { id: true },
  });
  const firma = await prisma.firma.create({
    data: {
      slug: `${ONEK}-firma`, ad: 'ZZF110 Firma',
      ozet: 'İnceleme raporu testleri için açılan geçici firma kaydı.',
    },
    select: { id: true },
  });
  const proje = await prisma.proje.create({
    data: {
      slug: `${ONEK}-proje`, ad: 'ZZ Proje', bolgeId: bolge.id, firmaId: firma.id,
      mahalle: 'ZZ', lat: 40.98, lng: 29.12, tip: 'KONUT', durum: 'SATISTA',
      fiyatMin: 4_000_000, ilerlemeYuzde: 60,
      ozet: 'x'.repeat(60), yayinTarihi: new Date('2026-01-01T00:00:00Z'), yayinda: true,
    },
    select: { id: true, slug: true },
  });

  await prisma.kontrolRaporu.create({
    data: {
      projeId: proje.id, ziyaret: new Date('2026-06-10T00:00:00Z'),
      kontrolEden: 'ZZ Ekip', ozet: 'Ruhsat görüldü, şantiye çalışır durumda.',
      // Prisma JSON sütunu `InputJsonValue` bekliyor; yapı birebir aynı.
      sonuclar: temiz as unknown as Prisma.InputJsonValue, yayinda: false,
    },
  });

  const gizli = await prisma.kontrolRaporu.findFirst({
    where: { proje: { slug: proje.slug }, yayinda: true },
    select: { id: true },
  });
  bekle('yayında olmayan rapor sayfaya çıkmıyor', gizli === null);

  await prisma.kontrolRaporu.update({ where: { projeId: proje.id }, data: { yayinda: true } });
  const acik = await prisma.kontrolRaporu.findFirst({
    where: { proje: { slug: proje.slug }, yayinda: true },
    select: { kontrolEden: true, sonuclar: true },
  });
  bekle('yayına alınınca okunuyor', acik?.kontrolEden === 'ZZ Ekip');
  bekle('JSON sütunu okunurken doğrulanıyor', sonuclariAyikla(acik?.sonuclar).length === 3);

  /* ---------- Proje başına tek rapor ---------- */
  let ikinci = 'yazildi';
  try {
    await prisma.kontrolRaporu.create({
      data: {
        projeId: proje.id, ziyaret: new Date(), kontrolEden: 'ZZ 2', sonuclar: [],
      },
    });
  } catch { ikinci = 'engellendi'; }
  bekle('proje başına tek rapor tutuluyor', ikinci === 'engellendi');

  /* ---------- Silme zinciri ---------- */
  await prisma.proje.delete({ where: { id: proje.id } });
  const kalanRapor = await prisma.kontrolRaporu.count({ where: { projeId: proje.id } });
  bekle('proje silinince rapor da siliniyor', kalanRapor === 0);

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
