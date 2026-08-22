import 'dotenv/config';
import { prisma } from '../lib/db';
import { ceviriYaz, dilKapsami, dilYayindaMi, yayindakiDiller } from '../lib/ceviri';
import { METIN_KAYDI, varsayilanMetin, type MetinAnahtari } from '../lib/metin-kayit';
import {
  DIL_KODU, DILLER, dilYolu, ingilizceYol, ROTA_AGACI, turkceYol, TUM_DILLER,
} from '../lib/i18n';

const SAYFA_ANAHTARLARI = Object.keys(METIN_KAYDI) as MetinAnahtari[];

/**
 * Faz 34 dil yayın kapısı testleri.
 *   node --conditions=react-server --import tsx scripts/test-dil-kapisi.ts
 *
 * Asıl iddia: içeriği olmayan bir dil hiçbir yerde DUYURULMAZ. Boş
 * bir dil için hreflang basmak Google'da "alternatif sayfa
 * bulunamadı" hatası üretiyor ve İKİ dili birden zayıflatıyor —
 * yani yanlış yapmanın bedeli yalnızca yeni dilde değil.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

async function temizle() {
  await prisma.projeCeviri.deleteMany({ where: { dil: 'RU' } });
  await prisma.bolgeCeviri.deleteMany({ where: { dil: 'RU' } });
  await prisma.metin.deleteMany({ where: { dil: 'RU' } });
}

async function main() {
  await temizle();

  console.log('\n═══ 1. Rota ağacı bildirimi ═══');
  bekle('Türkçe ve İngilizce ağacı var', ROTA_AGACI.tr && ROTA_AGACI.en);
  bekle('Rusça ve Arapça ağacı yok', !ROTA_AGACI.ru && !ROTA_AGACI.ar);
  bekle('gezinme listesi ağacı olanlarla sınırlı',
    DILLER.every((d) => ROTA_AGACI[d]), DILLER.join(', '));
  bekle('içerik girilebilen diller daha geniş',
    TUM_DILLER.length > DILLER.length);

  console.log('\n═══ 2. Yol eşlemesi ═══');
  bekle('Türkçe yol kendine eşleniyor', dilYolu('/bolgeler', 'tr') === '/bolgeler');
  bekle('İngilizce kurumsal yol', dilYolu('/bolgeler', 'en') === '/en/regions');
  bekle('İngilizce proje yolu', dilYolu('/proje/x', 'en') === '/en/project/x');
  bekle('İngilizce bölge yolu',
    dilYolu('/projeler/atasehir', 'en') === '/en/developments/atasehir');
  bekle('eski ad hâlâ çalışıyor', ingilizceYol('/bolgeler') === '/en/regions');

  /* Rusça eşlemeler YAZILI ama ağaç kapalı: yol üretmek, hreflang'i
     404'e bağlamak demek. Ağaç açıldığında aynı fonksiyon çalışacak. */
  bekle('Rusça yol üretilmiyor (ağaç kapalı)', dilYolu('/bolgeler', 'ru') === null);
  bekle('Arapça yol üretilmiyor', dilYolu('/bolgeler', 'ar') === null);

  bekle('geri eşleme çalışıyor', turkceYol('/en/regions') === '/bolgeler');
  bekle('geri eşleme proje yolunda', turkceYol('/en/project/x') === '/proje/x');
  bekle('bilinmeyen yol null', turkceYol('/en/olmayan-sayfa') === null);

  console.log('\n═══ 3. Yayın kapısı ═══');
  bekle('Türkçe her zaman yayında', await dilYayindaMi('tr'));
  bekle('İngilizce yayında (içerik var)', await dilYayindaMi('en'));
  bekle('Rusça yayında değil', !(await dilYayindaMi('ru')));
  bekle('Arapça yayında değil', !(await dilYayindaMi('ar')));

  const diller = await yayindakiDiller();
  bekle('yayındaki diller yalnızca tr + en',
    diller.length === 2 && diller.includes('tr') && diller.includes('en'), diller.join(', '));

  console.log('\n═══ 4. İçerik tek başına yetmiyor ═══');
  /* Rusça içerik girilse bile rota ağacı olmadan yayına girmemeli:
     iki koşul AYRI sebeplerle eksik olabiliyor. */
  const bolge = await prisma.bolge.findFirstOrThrow({ where: { yayinda: true }, select: { id: true } });
  const proje = await prisma.proje.findFirstOrThrow({ where: { yayinda: true }, select: { id: true } });
  await ceviriYaz('bolge', bolge.id, 'RU', { ozet: 'Регион на побережье.' });
  await ceviriYaz('proje', proje.id, 'RU', { ozet: 'Вилла с бассейном.' });

  bekle('içerik girildi',
    (await prisma.projeCeviri.count({ where: { dil: 'RU', ozet: { not: null } } })) === 1);
  bekle('içerik var ama ağaç yok — hâlâ yayında değil', !(await dilYayindaMi('ru')));
  bekle('yayındaki diller değişmedi', (await yayindakiDiller()).length === 2);

  console.log('\n═══ 5. Ağaç tek başına da yetmiyor ═══');
  /* Ağacı geçici olarak açıp içeriği boşaltıyoruz: kapı bu kez
     içerik tarafından kapanmalı. */
  await temizle();
  const eskiRu = ROTA_AGACI.ru;
  ROTA_AGACI.ru = true;
  bekle('ağaç açık ama içerik yok — yayında değil', !(await dilYayindaMi('ru')));

  await ceviriYaz('bolge', bolge.id, 'RU', { ozet: 'Регион на побережье.' });
  bekle('yalnızca bölge çevrili — hâlâ yetmiyor', !(await dilYayindaMi('ru')));

  await ceviriYaz('proje', proje.id, 'RU', { ozet: 'Вилла с бассейном.' });
  /* Faz 36'da ÜÇÜNCÜ koşul eklendi: sayfa metinleri. Bölge ve proje
     çevrili olsa da başlıklar ve güven kartları boş kalırsa sayfa
     ayakta ama içi yok. */
  bekle('bölge + proje yetmiyor — sayfa metinleri de gerekiyor',
    !(await dilYayindaMi('ru')));
  const eksik = await dilKapsami('RU');
  bekle('eksik sayfa metni sayısı raporlanıyor',
    eksik.sayfaMetni.cevrili === 0 && eksik.sayfaMetni.toplam > 40,
    `${eksik.sayfaMetni.cevrili}/${eksik.sayfaMetni.toplam}`);

  await prisma.metin.createMany({
    data: SAYFA_ANAHTARLARI.map((anahtar) => ({ anahtar, dil: 'RU' as const, deger: 'Текст' })),
    skipDuplicates: true,
  });
  bekle('sayfa metinleri girilince kapsam doluyor',
    (await dilKapsami('RU')).sayfaMetni.cevrili === eksik.sayfaMetni.toplam);
  bekle('üç koşul da sağlanınca yayında', await dilYayindaMi('ru'));
  bekle('yayındaki diller listesine giriyor',
    (await yayindakiDiller()).includes('ru'));
  bekle('yol üretimi de açılıyor', dilYolu('/bolgeler', 'ru') === '/ru/regiony');
  bekle('Rusça proje yolu', dilYolu('/proje/x', 'ru') === '/ru/proekt/x');
  bekle('Rusça geri eşleme', turkceYol('/ru/regiony') === '/bolgeler');

  ROTA_AGACI.ru = eskiRu;
  bekle('ağaç kapatılınca yine kapanıyor', !(await dilYayindaMi('ru')));

  console.log('\n═══ 6. Anahtarlarda dil yok ═══');
  /* `anasayfa-en.*` anahtarları dili ADINDA taşıyordu ve `tr`/`en`
     değerleri aynı İngilizce metindi — dil boyutu işlevsizdi. Rusça
     eklemek üçüncü bir anahtar kümesi demekti. Aile `int.*` oldu. */
  const dilliAnahtar = SAYFA_ANAHTARLARI.filter((a) => /-(en|ru|ar)\./.test(a));
  bekle('hiçbir anahtar dil adı taşımıyor', dilliAnahtar.length === 0,
    dilliAnahtar.join(', '));
  bekle('uluslararası aile int. öneki kullanıyor',
    SAYFA_ANAHTARLARI.some((a) => a.startsWith('int.')));
  /* `tr` ile `en` aynıysa dil boyutu yine işlevsiz demektir. Şu an
     istisna yok; bir teknik kısaltma (örneğin "256-bit SSL") eklenirse
     buraya değil, kaydın kendisine bakılıp karar verilmeli. */
  const ayni = SAYFA_ANAHTARLARI
    .filter((a) => METIN_KAYDI[a].en && METIN_KAYDI[a].en === METIN_KAYDI[a].tr);
  bekle('tr ve en değerleri gerçekten farklı', ayni.length === 0, ayni.join(', '));

  /* Kayıtta karşılığı olmayan dil BOŞ dönmeli, Türkçeye düşmemeli.
     İlk yazımda yalnızca Rusça eleniyordu ve Arapça sessizce Türkçe
     metinle "48/48 çevrildi" görünüyordu. */
  bekle('Arapça sayfa metni Türkçeye düşmüyor',
    SAYFA_ANAHTARLARI.every((a) => varsayilanMetin(a, 'ar') === ''));
  bekle('Rusça sayfa metni Türkçeye düşmüyor',
    SAYFA_ANAHTARLARI.every((a) => varsayilanMetin(a, 'ru') === ''));
  bekle('Türkçe ve İngilizce dolu',
    SAYFA_ANAHTARLARI.every((a) => varsayilanMetin(a, 'tr') !== ''
      && varsayilanMetin(a, 'en') !== ''));
  bekle('Arapça kapsamı sıfır', (await dilKapsami('AR')).sayfaMetni.cevrili === 0);

  console.log('\n═══ 7. hreflang kodları ═══');
  bekle('her dilin kodu benzersiz',
    new Set(TUM_DILLER.map((d) => DIL_KODU[d])).size === TUM_DILLER.length);
  bekle('kodlar dil-ülke biçiminde',
    TUM_DILLER.every((d) => /^[a-z]{2}-[A-Z]{2}$/.test(DIL_KODU[d])));

  console.log('\n═══ 8. Temizlik ═══');
  await temizle();
  bekle('Rusça çeviriler silindi',
    (await prisma.projeCeviri.count({ where: { dil: 'RU' } })) === 0);
  bekle('kapı yeniden kapalı', !(await dilYayindaMi('ru')));

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
