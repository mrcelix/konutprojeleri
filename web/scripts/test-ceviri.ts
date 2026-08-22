import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/db';
import { ceviriYaz, dilKapsami, type DilEnum } from '../lib/ceviri';
import { getBolgelerEn, getProjelerEn, getProjeEn } from '../lib/queries-en';
import { DILLER, DIL_ETIKET, DIL_KODU, DIL_YON, TUM_DILLER } from '../lib/i18n';

/**
 * Çeviri altyapısı testleri.
 *   node --conditions=react-server --import tsx scripts/test-ceviri.ts
 *
 * Çeviriler dil başına SÜTUN değil, ayrı tabloda. En önemli iddialar:
 * Türkçe çeviri tablosuna yazılamaz, çevrilmemiş kayıt o dilde
 * görünmez, ve varlık silinince çevirisi de gider.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzz-f33';

async function temizle() {
  const v = await prisma.proje.findMany({ where: { slug: { startsWith: ONEK } }, select: { id: true } });
  for (const x of v) await prisma.proje.delete({ where: { id: x.id } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZF33' } } });
  await prisma.ozellik.deleteMany({ where: { kod: { startsWith: ONEK } } });
}

async function main() {
  await temizle();

  console.log('\n═══ 1. Dil tanımları ═══');
  bekle('dört dil tanımlı', TUM_DILLER.length === 4, TUM_DILLER.join(', '));
  bekle('rota ağacı olan diller ayrı ve daha dar',
    DILLER.length === 2 && DILLER.every((d) => TUM_DILLER.includes(d)));
  bekle('her dilin etiketi var', TUM_DILLER.every((d) => !!DIL_ETIKET[d]));
  bekle('her dilin hreflang kodu var',
    TUM_DILLER.every((d) => /^[a-z]{2}-[A-Z]{2}$/.test(DIL_KODU[d])));
  bekle('yalnızca Arapça sağdan sola',
    DIL_YON.ar === 'rtl' && DIL_YON.tr === 'ltr' && DIL_YON.en === 'ltr' && DIL_YON.ru === 'ltr');

  console.log('\n═══ 2. Türkçe çeviri tablosunda tutulmuyor ═══');
  const bolge = await prisma.bolge.findFirstOrThrow({ select: { id: true } });
  const trDeneme = await ceviriYaz('bolge', bolge.id, 'TR', { ozet: 'Türkçe metin' });
  bekle('TR yazımı reddediliyor', !!trDeneme.hata, trDeneme.hata ?? '');

  /* Uygulama katmanı atlansa bile veritabanı reddetmeli: kural
     kodda değil, kısıtta duruyor. */
  let kisitCalisti = false;
  try {
    await prisma.bolgeCeviri.create({ data: { bolgeId: bolge.id, dil: 'TR', ozet: 'x' } });
  } catch { kisitCalisti = true; }
  bekle('veritabanı kısıtı da TR satırını reddediyor', kisitCalisti);

  console.log('\n═══ 3. Yazma ve okuma ═══');
  const fi = await prisma.firma.create({
    data: {
      slug: `${ONEK}-firma`, ad: 'ZZF33 Firma',
      ozet: 'Çeviri testleri için açılan geçici firma kaydı.',
    },
    select: { id: true },
  });
  const proje = await prisma.proje.create({
    data: {
      slug: `${ONEK}-${randomBytes(2).toString('hex')}`, ad: 'ZZF33 Projesi',
      bolgeId: bolge.id, firmaId: fi.id, mahalle: 'Test', lat: 40.98, lng: 29.12,
      tip: 'KONUT', durum: 'SATISTA', fiyatMin: 4_000_000,
      ozet: 'Çeviri testleri için açılan geçici proje kaydıdır, en az kırk karakter uzunluğunda.',
      yayinda: true, yayinTarihi: new Date(),
      medya: { create: [{ url: 'https://ornek.test/1.webp', alt: 'Projenin dış cephesi', sira: 0 }] },
      daireTipleri: {
        create: [{
          ad: '2+1', odaSayisi: '2+1', banyo: 1, brutM2: 95, netM2: 78,
          fiyatMin: 4_000_000, sira: 0,
        }],
      },
    },
    select: { id: true, slug: true },
  });

  const yaz = await ceviriYaz('proje', proje.id, 'RU', { ozet: 'Новостройка в Аташехире.' });
  bekle('Rusça çeviri kaydedildi', yaz.tamam === true, yaz.hata ?? '');
  const ruSatir = await prisma.projeCeviri.findUnique({
    where: { projeId_dil: { projeId: proje.id, dil: 'RU' } }, select: { ozet: true },
  });
  bekle('metin okunuyor', ruSatir?.ozet === 'Новостройка в Аташехире.');

  // Aynı kayda ikinci yazım güncelliyor, kopya üretmiyor
  await ceviriYaz('proje', proje.id, 'RU', { ozet: 'Güncellendi.' });
  bekle('ikinci yazım güncelliyor',
    (await prisma.projeCeviri.count({ where: { projeId: proje.id, dil: 'RU' } })) === 1);

  /* Boş metin NULL yazılmalı: "çevrilmedi" ile "boş" aynı şey değil,
     boş string sayfayı boş içerikle yayına sokardı. */
  await ceviriYaz('proje', proje.id, 'RU', { ozet: '   ' });
  const bosluk = await prisma.projeCeviri.findUnique({
    where: { projeId_dil: { projeId: proje.id, dil: 'RU' } }, select: { ozet: true },
  });
  bekle('boş metin NULL yazılıyor', bosluk?.ozet === null);

  console.log('\n═══ 4. Çevrilmemiş kayıt o dilde görünmüyor ═══');
  const enProjeler = await getProjelerEn();
  bekle('İngilizce listede çevrilmemiş proje yok',
    !enProjeler.some((v) => v.slug === proje.slug), `${enProjeler.length} proje`);
  bekle('çevrilmemiş proje tekil sorguda da yok', (await getProjeEn(proje.slug)) === null);

  const EN_OZET = 'A test development with two-bedroom units.';
  await ceviriYaz('proje', proje.id, 'EN', { ozet: EN_OZET });
  bekle('çevrilince listeye giriyor',
    (await getProjelerEn()).some((v) => v.slug === proje.slug));
  const tekil = await getProjeEn(proje.slug);
  bekle('tekil sorgu İngilizce özeti veriyor', tekil?.ozet === EN_OZET, tekil?.ozet ?? '');
  bekle('Türkçe özet sızmıyor', !(tekil?.ozet ?? '').includes('geçici proje kaydıdır'));

  console.log('\n═══ 5. Taşınan içerik yerinde ═══');
  const bolgeler = await getBolgelerEn();
  bekle('İngilizce bölgeler geliyor', bolgeler.length > 0, `${bolgeler.length} bölge`);
  bekle('bölge özetleri dolu', bolgeler.every((b) => b.ozet.length > 0));
  bekle('bölge içeriği taşındı', bolgeler.some((b) => b.icerik !== null));
  const ozellikliProje = (await getProjelerEn()).find((v) => v.ozellikler.length > 0);
  bekle('özellik adları İngilizce geliyor', !!ozellikliProje,
    ozellikliProje?.ozellikler[0]?.ad ?? 'özellikli proje yok');

  console.log('\n═══ 6. İniş yolu tekilliği ═══');
  const o1 = await prisma.ozellik.create({
    data: { kod: `${ONEK}-a`, ad: 'ZZF33 A', ikon: 'star', sira: 900 }, select: { id: true },
  });
  const o2 = await prisma.ozellik.create({
    data: { kod: `${ONEK}-b`, ad: 'ZZF33 B', ikon: 'star', sira: 901 }, select: { id: true },
  });
  bekle('ilk iniş yolu kaydediliyor',
    (await ceviriYaz('ozellik', o1.id, 'RU', { ad: 'А', landingSlug: 'zzf33-yol' })).tamam === true);
  const cakisma = await ceviriYaz('ozellik', o2.id, 'RU', { ad: 'Б', landingSlug: 'zzf33-yol' });
  bekle('aynı dilde çakışan yol reddediliyor', !!cakisma.hata, cakisma.hata ?? '');
  /* Diller arası çakışma SERBEST: ayrı adres ağaçları, aynı yol
     farklı dillerde farklı sayfa. */
  bekle('farklı dilde aynı yol serbest',
    (await ceviriYaz('ozellik', o2.id, 'AR', { ad: 'ب', landingSlug: 'zzf33-yol' })).tamam === true);

  console.log('\n═══ 7. Kapsam raporu ═══');
  const ruKapsam = await dilKapsami('RU');
  bekle('Rusça proje sayısı raporlanıyor', ruKapsam.proje.toplam > 0);
  bekle('Rusça henüz hazır değil', ruKapsam.hazir === false,
    `${ruKapsam.proje.cevrili} proje, ${ruKapsam.bolge.cevrili} bölge çevrili`);
  const enKapsam = await dilKapsami('EN');
  bekle('İngilizce hazır', enKapsam.hazir === true,
    `${enKapsam.proje.cevrili}/${enKapsam.proje.toplam} proje`);
  const trKapsam = await dilKapsami('TR');
  bekle('Türkçe her zaman tam', trKapsam.hazir === true
    && trKapsam.proje.cevrili === trKapsam.proje.toplam);

  console.log('\n═══ 8. Varlık silinince çevirisi de gidiyor ═══');
  const projeId = proje.id;
  bekle('silmeden önce çeviri var',
    (await prisma.projeCeviri.count({ where: { projeId } })) > 0);
  await prisma.proje.delete({ where: { id: projeId } });
  bekle('proje silinince çeviri satırı da gitti',
    (await prisma.projeCeviri.count({ where: { projeId } })) === 0);

  const ozellikId = o1.id;
  await prisma.ozellik.delete({ where: { id: ozellikId } });
  bekle('özellik silinince çeviri satırı da gitti',
    (await prisma.ozellikCeviri.count({ where: { ozellikId } })) === 0);

  console.log('\n═══ 9. Temizlik ═══');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.proje.count({ where: { slug: { startsWith: ONEK } } })) === 0
    && (await prisma.ozellik.count({ where: { kod: { startsWith: ONEK } } })) === 0);
  bekle('gerçek İngilizce içerik yerinde',
    (await prisma.projeCeviri.count({ where: { dil: 'EN' as DilEnum } })) >= 6);

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
