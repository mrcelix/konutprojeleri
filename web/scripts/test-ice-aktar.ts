import 'dotenv/config';
import { prisma } from '../lib/db';
import { basligiAnahtarla, csvNesneler, csvSatirlar, csvYaz, evetHayir, sayiCoz } from '../lib/csv';
import { iceAktarCozumle, iceAktarUygula, sablonSatirlari } from '../lib/ice-aktar';

/**
 * Toplu içe aktarma testleri.
 *   node --conditions=react-server --import tsx scripts/test-ice-aktar.ts
 *
 * CSV çözümleme ve Türkçe Excel tuzakları burada; server action'lar
 * oturum bağlamı gerektirdiği için çözümleme ve uygulama katmanları
 * doğrudan çağrılıyor. Panel tarayıcıda uçtan uca doğrulandı.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const TEST_ONEK = 'ZZZ Aktarma';

async function temizle() {
  const v = await prisma.proje.findMany({
    where: { ad: { startsWith: TEST_ONEK } }, select: { id: true },
  });
  for (const x of v) await prisma.proje.delete({ where: { id: x.id } });
}

async function main() {
  await temizle();

  console.log('\n═══ 1. Ayraç sezimi ═══');
  bekle('noktalı virgül seziliyor',
    csvSatirlar('a;b;c\n1;2;3')[1].length === 3);
  bekle('virgül seziliyor',
    csvSatirlar('a,b,c\n1,2,3')[1].length === 3);
  bekle('sekme seziliyor',
    csvSatirlar('a\tb\tc\n1\t2\t3')[1].length === 3);
  // Türkçe Excel `;` yazıyor ama alanların içinde virgül olabiliyor
  bekle('noktalı virgüllü dosyada alan içi virgül bölmüyor',
    csvSatirlar('ad;adres\nProje;Barbaros, Ataşehir')[1][1] === 'Barbaros, Ataşehir');

  console.log('\n═══ 2. Tırnak ve kaçış ═══');
  bekle('tırnak içindeki ayraç korunuyor',
    csvSatirlar('a;b\n"x;y";z')[1][0] === 'x;y');
  bekle('tırnak içindeki satır sonu korunuyor',
    csvSatirlar('a;b\n"iki\nsatir";z')[1][0] === 'iki\nsatir');
  bekle('çift tırnak tek tırnağa iniyor',
    csvSatirlar('a\n"de ""bu"" dedi"')[1][0] === 'de "bu" dedi');
  bekle('CRLF satır sonu çalışıyor', csvSatirlar('a;b\r\n1;2').length === 2);
  bekle('BOM ilk sütunu bozmuyor',
    Object.keys(csvNesneler('﻿ad;bolge\nX;Ataşehir').satirlar[0]).includes('ad'));
  bekle('sondaki boş satırlar atılıyor', csvSatirlar('a;b\n1;2\n\n\n').length === 2);

  console.log('\n═══ 3. Başlık eşlemesi ═══');
  bekle('büyük harf yok sayılıyor', basligiAnahtarla('AD') === 'ad');
  bekle('Türkçe harfler sadeleşiyor', basligiAnahtarla('Proje Adı') === 'projeadi');
  bekle('büyük İ doğru dönüşüyor', basligiAnahtarla('İL') === 'il', basligiAnahtarla('İL'));
  bekle('boşluk ve noktalama atılıyor', basligiAnahtarla('Firma (Ad)') === 'firmaad');
  bekle('alt çizgi atılıyor', basligiAnahtarla('fiyat_min') === 'fiyatmin');

  console.log('\n═══ 4. Türkçe sayı biçimi ═══');
  bekle('ondalık virgül', sayiCoz('36,201234') === 36.201234, String(sayiCoz('36,201234')));
  bekle('binlik nokta', sayiCoz('6.750.000') === 6750000, String(sayiCoz('6.750.000')));
  bekle('binlik nokta + ondalık virgül', sayiCoz('1.234,56') === 1234.56);
  bekle('binlik virgül (İngilizce)', sayiCoz('1,500') === 1500, String(sayiCoz('1,500')));
  bekle('para birimi eki atılıyor', sayiCoz('6750000 TL') === 6750000);
  bekle('yüzde işareti atılıyor', sayiCoz('%10') === 10);
  bekle('düz tam sayı', sayiCoz('240') === 240);
  bekle('sıfır sayı olarak okunuyor', sayiCoz('0') === 0);
  bekle('boş girdi null', sayiCoz('') === null);
  bekle('metin null', sayiCoz('bilinmiyor') === null);
  // "6.750.000" binlik ama "40.99" ondalık; ikisi de doğru okunmalı
  bekle('tek haneli ondalık nokta korunuyor', sayiCoz('40.99') === 40.99);

  console.log('\n═══ 5. Evet/hayır ═══');
  bekle('evet', evetHayir('Evet') === true);
  bekle('var', evetHayir('VAR') === true);
  bekle('hayır', evetHayir('Hayır') === false);
  bekle('yok', evetHayir('yok') === false);
  bekle('boş null', evetHayir('') === null);
  bekle('tanınmayan null', evetHayir('belki') === null);

  console.log('\n═══ 6. Şablon gidiş-dönüş ═══');
  const sablon = csvYaz(sablonSatirlari());
  bekle('şablon BOM ile başlıyor', sablon.startsWith('﻿'));
  bekle('şablon noktalı virgülle yazılıyor', sablon.includes('ad;bolge;'));
  const geri = csvNesneler(sablon);
  bekle('şablon kendi çözümleyicimizle okunuyor', geri.satirlar.length === 1);
  bekle('şablonda zorunlu sütunlar var',
    ['ad', 'bolge', 'firma', 'mahalle', 'enlem', 'boylam', 'fiyatmin', 'ozet']
      .every((z) => z in geri.satirlar[0]));
  bekle('şablondaki koordinat okunabiliyor', sayiCoz(geri.satirlar[0].enlem) === 40.992134);
  bekle('şablondaki fiyat okunabiliyor', sayiCoz(geri.satirlar[0].fiyatmin) === 6750000);
  /* Şablondaki teslim tarihi ÇEYREK biçiminde: firmalar "2027Q4"
     yazıyor ve gün vermeye zorlamak, tutulamayacak bir tarih
     uydurtuyordu. */
  bekle('şablondaki teslim çeyrek biçiminde', geri.satirlar[0].teslimtarihi === '2027Q4');

  console.log('\n═══ 7. Eksik sütun ═══');
  const eksik = await iceAktarCozumle('ad;bolge\nProje;Ataşehir');
  bekle('zorunlu sütun eksikse dosya işlenmiyor',
    eksik.onizleme.eksikSutunlar.length > 0 && eksik.cozulmus.length === 0,
    eksik.onizleme.eksikSutunlar.join(','));

  console.log('\n═══ 8. Satır doğrulama ═══');
  const bolge = await prisma.bolge.findFirstOrThrow({ select: { ad: true } });
  const firma = await prisma.firma.findFirstOrThrow({ select: { ad: true } });
  const OZET = 'Bu proje toplu içe aktarma testleri için hazırlanmış geçici bir kayıttır.';

  const basliklar = 'ad;bolge;firma;mahalle;enlem;boylam;fiyatMin;ozet;tip;'
    + 'pesinatOrani;teslimTarihi;ozellikler;fotograflar;bilinmeyenSutun';
  const satir = (ad: string, ek: Partial<Record<string, string>> = {}) => [
    ad, ek.bolge ?? bolge.ad, ek.firma ?? firma.ad, 'Test Mahallesi',
    ek.enlem ?? '40,992134', ek.boylam ?? '29,127456', ek.fiyatmin ?? '6.750.000',
    ek.ozet ?? OZET, ek.tip ?? 'KONUT', ek.pesinatorani ?? '25',
    ek.teslimtarihi ?? '2027Q4',
    ek.ozellikler ?? 'guvenlik|kapaliotopark|yokboylebirozellik',
    ek.fotograflar ?? 'https://ornek.test/1.jpg>Projenin dış cephesi|gecersiz-adres>Alt metni',
    'yoksay',
  ].join(';');

  const csv = [
    basliklar,
    satir(`${TEST_ONEK} Bir`),
    satir(`${TEST_ONEK} İki`, { bolge: 'Olmayan Bölge' }),
    satir(`${TEST_ONEK} Üç`, { enlem: '99,9' }),
    satir(`${TEST_ONEK} Dört`, { ozet: 'kısa' }),
    satir(`${TEST_ONEK} Beş`, { pesinatorani: 'yüzde yirmi beş' }),
    satir(`${TEST_ONEK} Altı`, { tip: 'Dükkan' }),
    satir(`${TEST_ONEK} Bir`),                       // dosya içi ad çakışması
  ].join('\n');

  const { onizleme, cozulmus } = await iceAktarCozumle(csv);
  bekle('yedi satır çözümlendi', onizleme.sonuclar.length === 7);
  bekle('geçerli satır "yeni" işaretleniyor', onizleme.sonuclar[0].durum === 'yeni');
  bekle('olmayan bölge hata veriyor',
    onizleme.sonuclar[1].durum === 'hata'
    && onizleme.sonuclar[1].hatalar.some((h) => h.includes('Bölge bulunamadı')));
  bekle('sınır dışı koordinat hata veriyor',
    onizleme.sonuclar[2].hatalar.some((h) => h.includes('Enlem')));
  bekle('kısa açıklama hata veriyor',
    onizleme.sonuclar[3].hatalar.some((h) => h.includes('Açıklama')));
  /* Sessizce varsayılana düşmek "yüzde yirmi beş" yazan satırı %0
     peşinatlı yapardı — ve %0 sitede "belirtilmedi" demek. */
  bekle('okunamayan sayı sessizce varsayılana düşmüyor',
    onizleme.sonuclar[4].hatalar.some((h) => h.includes('Peşinat oranı okunamadı')));
  /* Tanınmayan TİP de hata: "Dükkan" yazılmış bir satırın konut
     olarak açılması, yanlış vitrine düşen bir proje demek ve kimse
     fark etmiyor. */
  bekle('bilinmeyen proje tipi hata veriyor',
    onizleme.sonuclar[5].hatalar.some((h) => h.includes('Bilinmeyen proje tipi')));
  bekle('dosya içi ad çakışmasında ikinci satır farklı adres alıyor',
    onizleme.sonuclar[6].slug !== onizleme.sonuclar[0].slug,
    `${onizleme.sonuclar[0].slug} / ${onizleme.sonuclar[6].slug}`);
  bekle('bilinmeyen sütun bildiriliyor',
    onizleme.bilinmeyenSutunlar.includes('bilinmeyenSutun'));
  bekle('bilinmeyen özellik uyarıyla atlanıyor',
    onizleme.sonuclar[0].uyarilar.some((u) => u.includes('Bilinmeyen özellik')));
  bekle('geçersiz görsel adresi uyarıyla atlanıyor',
    onizleme.sonuclar[0].uyarilar.some((u) => u.includes('Geçersiz görsel')));
  bekle('hatalı satırlar uygulamaya geçmiyor', cozulmus.length === 2, `${cozulmus.length} satır`);
  bekle('çözümleme veritabanına yazmıyor',
    (await prisma.proje.count({ where: { ad: { startsWith: TEST_ONEK } } })) === 0);

  console.log('\n═══ 9. Uygulama ═══');
  const r1 = await iceAktarUygula(cozulmus);
  bekle('iki proje eklendi', r1.eklenen === 2 && r1.guncellenen === 0,
    `+${r1.eklenen} ~${r1.guncellenen}`);

  const eklenen = await prisma.proje.findFirstOrThrow({
    where: { ad: `${TEST_ONEK} Bir` },
    select: {
      yayinda: true, fiyatMin: true, lat: true, tip: true,
      pesinatOrani: true, teslimTarihi: true,
      medya: { select: { alt: true } },
      ozellikler: { select: { ozellik: { select: { kod: true } } } },
    },
  });
  bekle('proje TASLAK olarak açılıyor', eklenen.yayinda === false);
  bekle('binlik noktalı fiyat doğru', eklenen.fiyatMin === 6750000, String(eklenen.fiyatMin));
  bekle('ondalık virgüllü koordinat doğru', Math.abs(eklenen.lat - 40.992134) < 1e-9);
  bekle('peşinat oranı okundu', eklenen.pesinatOrani === 25);
  bekle('tip okundu', eklenen.tip === 'KONUT');
  /* Çeyrek biçimi çeyreğin İLK GÜNÜNE çözülüyor: sitede zaten
     "2027 4. çeyrek" diye gösteriliyor, gün hiçbir yerde görünmüyor. */
  bekle('çeyrek biçimi tarihe çözüldü',
    eklenen.teslimTarihi?.toISOString().startsWith('2027-10-01') === true,
    String(eklenen.teslimTarihi));
  bekle('yalnızca geçerli görsel yazıldı', eklenen.medya.length === 1,
    `${eklenen.medya.length} görsel`);
  bekle('yalnızca tanınan özellikler bağlandı',
    eklenen.ozellikler.length === 2,
    eklenen.ozellikler.map((o) => o.ozellik.kod).join(','));

  console.log('\n═══ 10. Tekrar çalıştırma ═══');
  // Aynı dosya ikinci kez: kopya açılmamalı
  const ikinci = await iceAktarCozumle(csv);
  bekle('var olan projeler "güncelleme" işaretleniyor',
    ikinci.onizleme.guncelleme >= 1 && ikinci.onizleme.yeni <= 1,
    `yeni:${ikinci.onizleme.yeni} güncelleme:${ikinci.onizleme.guncelleme}`);

  const r2 = await iceAktarUygula(ikinci.cozulmus);
  const toplam = await prisma.proje.count({ where: { ad: { startsWith: TEST_ONEK } } });
  bekle('kopya proje açılmıyor', toplam === 2, `${toplam} proje`);
  bekle('güncelleme raporlanıyor', r2.guncellenen >= 1);

  // Yayındaki proje içe aktarmayla taslağa düşmemeli
  const ilk = await prisma.proje.findFirstOrThrow({
    where: { ad: `${TEST_ONEK} Bir` }, select: { id: true },
  });
  await prisma.proje.update({ where: { id: ilk.id }, data: { yayinda: true } });
  const ucuncu = await iceAktarCozumle(csv);
  await iceAktarUygula(ucuncu.cozulmus);
  bekle('güncelleme yayın durumunu bozmuyor',
    (await prisma.proje.findUniqueOrThrow({ where: { id: ilk.id }, select: { yayinda: true } })).yayinda,
  );

  bekle('görseller kopyalanmıyor',
    (await prisma.medya.count({ where: { projeId: ilk.id } })) === 1);

  console.log('\n═══ 11. Temizlik ═══');
  await temizle();
  bekle('test projeleri silindi',
    (await prisma.proje.count({ where: { ad: { startsWith: TEST_ONEK } } })) === 0);

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
