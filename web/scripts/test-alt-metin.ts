import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/db';
import {
  ALT_EN_AZ, ALT_EN_COK, altMetniDenetle, altRaporu, medyaTipiAdi,
  MEDYA_TIPLERI, otomatikAlt, yayinKapisi,
} from '../lib/alt-metin';

/**
 * Görsel alt metni testleri.
 *   node --conditions=react-server --import tsx scripts/test-alt-metin.ts
 *
 * Yükleme hattı her görsele aynı cümleyi yazıyor. Buradaki testler o
 * boşluğun kapandığını sınıyor: metni makinenin yazdığı
 * işaretleniyor, kopya metin engelleniyor ve kapak görselinin alt
 * metni yazılmadan proje yayına alınamıyor.
 *
 * Sunucu eylemleri buradan ÇAĞRILMIYOR: `adminZorunlu()` istek
 * bağlamı istiyor ve `panel-eylemler` istemci tarafı Next modüllerini
 * içeri çekiyor. Kurallar `lib/alt-metin.ts` içinde tutuluyor,
 * eylemler onları çağırıyor; test kuralları doğrudan sınıyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzz-f31';

async function temizle() {
  const v = await prisma.proje.findMany({ where: { slug: { startsWith: ONEK } }, select: { id: true } });
  for (const x of v) await prisma.proje.delete({ where: { id: x.id } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZF31' } } });
}

async function main() {
  await temizle();

  console.log('\n═══ 1. Metin kuralları ═══');
  bekle('kısa metin reddediliyor', !!altMetniDenetle('cephe').hata);
  bekle('en az uzunluk mesajda geçiyor',
    (altMetniDenetle('cephe').hata ?? '').includes(String(ALT_EN_AZ)));
  bekle('uzun metin reddediliyor', !!altMetniDenetle('a'.repeat(ALT_EN_COK + 1)).hata);

  /* Ekran okuyucu görsel olduğunu zaten duyuruyor; "Fotoğraf:" diye
     başlamak her görselde aynı gereksiz sözcüğü tekrarlatıyor. */
  for (const bas of ['Fotoğraf: projenin dış cephesi akşam ışığında',
    'Resim - bahçe ve giriş aksı', 'görsel örnek daire salon']) {
    bekle(`"${bas.split(/[\s:-]/)[0]}" ile başlayan metin reddediliyor`, !!altMetniDenetle(bas).hata);
  }
  bekle('içinde "fotoğraf" geçen normal metin geçiyor',
    !altMetniDenetle('Şantiyeden çekilen fotoğraflardaki kaba inşaat').hata);

  bekle('geçerli metin kabul ediliyor',
    !altMetniDenetle('Projenin dış cephesi ve giriş aksı').hata);
  bekle('boşluklar sadeleştiriliyor',
    altMetniDenetle('  Örnek   daire   salon  görünümü ').temiz === 'Örnek daire salon görünümü');

  console.log('\n═══ 2. Kopya alt metin ═══');
  const digerleri = ['Projenin dış cephesi ve giriş aksı'];
  bekle('aynı metin reddediliyor',
    !!altMetniDenetle('Projenin dış cephesi ve giriş aksı', digerleri).hata);
  // Büyük/küçük harf ve noktalama farkı "farklı metin" değil
  bekle('noktalama farkı kopyayı gizlemiyor',
    !!altMetniDenetle('projenin dış cephesi ve, giriş aksı!', digerleri).hata);
  bekle('Türkçe büyük harf farkı kopyayı gizlemiyor',
    !!altMetniDenetle('PROJENİN DIŞ CEPHESİ VE GİRİŞ AKSI', digerleri).hata);
  bekle('gerçekten farklı metin geçiyor',
    !altMetniDenetle('Örnek daire salonu ve açık mutfak', digerleri).hata);

  console.log('\n═══ 3. Otomatik metin ve rapor ═══');
  bekle('türsüz otomatik metin proje + konum',
    otomatikAlt('Meridyen Park', 'Barbaros', 'Ataşehir') === 'Meridyen Park, Barbaros Ataşehir');
  bekle('tür verilince metne ekleniyor',
    otomatikAlt('Meridyen Park', 'Barbaros', 'Ataşehir', 'ORNEK_DAIRE').includes('örnek daire'));
  bekle('otomatik metin uzunluk sınırını aşmıyor',
    otomatikAlt('A'.repeat(200), 'B'.repeat(50), 'C', 'MANZARA').length <= ALT_EN_COK);

  const rapor = altRaporu([
    { alt: 'Proje X, Merkez Ataşehir', altOtomatik: true, sira: 0 },
    { alt: 'Örnek daire salonu', altOtomatik: false, sira: 1 },
    { alt: 'Örnek daire salonu', altOtomatik: false, sira: 2 },
  ]);
  bekle('otomatik sayısı doğru', rapor.otomatik === 1, String(rapor.otomatik));
  bekle('kopya sayısı doğru (asıl kayıt sayılmıyor)', rapor.kopya === 1, String(rapor.kopya));
  bekle('kapak hazır değil', rapor.kapakHazir === false);

  const temizRapor = altRaporu([
    { alt: 'Dış cephe akşam ışığında', altOtomatik: false, sira: 0 },
    { alt: 'Örnek daire salonu', altOtomatik: false, sira: 1 },
  ]);
  bekle('temiz galeride kapak hazır', temizRapor.kapakHazir === true);
  bekle('temiz galeride kopya yok', temizRapor.kopya === 0);
  bekle('boş galeride kapak hazır sayılmıyor', altRaporu([]).kapakHazir === false);

  // Sıra karışık gelse de kapak `sira` alanına göre bulunmalı
  const karisik = altRaporu([
    { alt: 'Örnek daire salonu', altOtomatik: false, sira: 2 },
    { alt: 'Proje X, Merkez Ataşehir', altOtomatik: true, sira: 0 },
  ]);
  bekle('kapak sıraya göre seçiliyor, dizi sırasına göre değil',
    karisik.kapakHazir === false);

  console.log('\n═══ 4. Veritabanındaki kayıtlar ═══');
  const bolge = await prisma.bolge.findFirstOrThrow({ select: { id: true, ad: true } });
  const fi = await prisma.firma.create({
    data: {
      slug: `zzf31-${randomBytes(2).toString('hex')}`, ad: 'ZZF31 Firma',
      ozet: 'Alt metin testleri için açılan geçici firma kaydı.',
    },
    select: { id: true },
  });
  const otoAlt = otomatikAlt('ZZF31 Projesi', 'Test', bolge.ad);
  const proje = await prisma.proje.create({
    data: {
      slug: `${ONEK}-${randomBytes(2).toString('hex')}`, ad: 'ZZF31 Projesi',
      bolgeId: bolge.id, firmaId: fi.id, mahalle: 'Test', lat: 40.98, lng: 29.12,
      tip: 'KONUT', durum: 'SATISTA', fiyatMin: 4_000_000,
      ozet: 'Alt metin testleri için açılan geçici proje kaydıdır, en az kırk karakter uzunluğunda.',
      yayinda: false, yayinTarihi: new Date(),
      medya: {
        create: [
          { url: 'https://ornek.test/1.webp', alt: otoAlt, altOtomatik: true, sira: 0 },
          { url: 'https://ornek.test/2.webp', alt: otoAlt, altOtomatik: true, sira: 1 },
        ],
      },
    },
    select: { id: true, medya: { select: { id: true, sira: true }, orderBy: { sira: 'asc' } } },
  });
  const [kapak, ikinci] = proje.medya;

  const oku = () => prisma.medya.findMany({
    where: { projeId: proje.id },
    select: { alt: true, altOtomatik: true, sira: true },
    orderBy: { sira: 'asc' },
  });

  /* Elle eklenen (adres girilerek) görsel otomatik SAYILMAMALI:
     alan yalnızca yükleme hattında true yazılıyor. */
  const elle = await prisma.medya.create({
    data: { projeId: proje.id, url: 'https://ornek.test/3.webp', alt: 'Elle yazılmış alt metin', sira: 2 },
    select: { id: true, altOtomatik: true },
  });
  bekle('varsayılan altOtomatik false', elle.altOtomatik === false);
  await prisma.medya.delete({ where: { id: elle.id } });

  const ilkRapor = altRaporu(await oku());
  bekle('yüklenen iki görsel otomatik sayılıyor', ilkRapor.otomatik === 2);
  bekle('aynı metin kopya olarak görülüyor', ilkRapor.kopya === 1, String(ilkRapor.kopya));
  bekle('kapak hazır değil', ilkRapor.kapakHazir === false);

  console.log('\n═══ 5. Yayın kapısı ═══');
  bekle('otomatik kapakla yayına alınamıyor', !!yayinKapisi(await oku()).hata);
  bekle('gerekçe kapağı işaret ediyor',
    /[Kk]apak/.test(yayinKapisi(await oku()).hata ?? ''), yayinKapisi(await oku()).hata ?? '');

  // Kapağı düzelt, ikinciyi kopya bırak
  await prisma.medya.update({
    where: { id: kapak.id },
    data: { alt: 'Projenin dış cephesi ve giriş aksı', altOtomatik: false },
  });
  await prisma.medya.update({
    where: { id: ikinci.id },
    data: { alt: 'Projenin dış cephesi ve giriş aksı', altOtomatik: false },
  });
  const kopyaKapi = yayinKapisi(await oku());
  bekle('tekrar eden metinle yayına alınamıyor', !!kopyaKapi.hata, kopyaKapi.hata ?? '');
  bekle('kaç tanesinin tekrar ettiği yazıyor', /1 görselde/.test(kopyaKapi.hata ?? ''));

  await prisma.medya.update({
    where: { id: ikinci.id }, data: { alt: 'Örnek daire salonu ve açık mutfak' },
  });
  bekle('düzeltilince yayına alınıyor', !yayinKapisi(await oku()).hata);

  /* Kapak yazılmışsa geri kalanın otomatik olması ENGEL DEĞİL:
     sekiz görselin sekizini şart koşmak projeyi yayına almayı
     pratikte imkânsız kılardı. Panelde sayısı görünüyor. */
  await prisma.medya.update({ where: { id: ikinci.id }, data: { altOtomatik: true } });
  bekle('kapak hazırsa diğerleri otomatik olsa da yayına alınıyor',
    !yayinKapisi(await oku()).hata);
  bekle('ama panelde sayısı görünüyor', altRaporu(await oku()).otomatik === 1);

  bekle('görselsiz proje yayına alınamıyor', !!yayinKapisi([]).hata);

  console.log('\n═══ 6. Tür etiketleri ═══');
  /* Liste şemadaki `MedyaTipi` ile BİREBİR olmak zorunda: panelde
     seçilebilen ama veritabanına yazılamayan bir tür, kaydetmeyi
     sessizce düşürüyordu. */
  const SEMA_TIPLERI = ['DIS_CEPHE', 'IC_MEKAN', 'ORNEK_DAIRE', 'SOSYAL_TESIS',
    'MANZARA', 'VAZIYET_PLANI', 'KAT_PLANI', 'INSAAT_DURUMU'];
  bekle('tür kodları şemadaki enum ile aynı',
    MEDYA_TIPLERI.every(([k]) => SEMA_TIPLERI.includes(k))
    && MEDYA_TIPLERI.length === SEMA_TIPLERI.length);
  bekle('tür adı çözülüyor', medyaTipiAdi('ORNEK_DAIRE') === 'Örnek daire');
  bekle('bilinmeyen tür kodu olduğu gibi dönüyor', medyaTipiAdi('GARAJ') === 'GARAJ');
  bekle('her türün otomatik metin eki var',
    MEDYA_TIPLERI.every(([k]) => otomatikAlt('V', 'M', 'B', k).includes('—')));

  // Her tür kodu veritabanına yazılabiliyor olmalı
  for (const [kod] of MEDYA_TIPLERI) {
    await prisma.medya.update({ where: { id: ikinci.id }, data: { tip: kod } });
  }
  bekle('her tür kodu veritabanına yazılabiliyor',
    (await prisma.medya.findUniqueOrThrow({ where: { id: ikinci.id }, select: { tip: true } })).tip === 'INSAAT_DURUMU');

  console.log('\n═══ 7. Temizlik ═══');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.proje.count({ where: { slug: { startsWith: ONEK } } })) === 0);

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
