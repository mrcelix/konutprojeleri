import 'dotenv/config';
import { prisma } from '../lib/db';
import {
  DILLER, YONLENDIRILEN_EN, dilAlternatifleri, dilAlternatifleriEn, ingilizceYol, sozluk, turkceYol,
} from '../lib/i18n';
import { soruYanitBildirimi } from '../lib/bildirim/baglayici';
import {
  getBolgelerEn, getLandingKombinasyonlariEn, getLandingProjelerEn, getProjelerEn,
} from '../lib/queries-en';
import { BOYUTLAR, gorsel } from '../lib/gorsel';

/**
 * Çok dillilik ve büyüme altyapısı testleri.
 *   node --conditions=react-server --import tsx scripts/test-i18n.ts
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const EPOSTA = 'i18n@demo.test';

async function temizle() {
  await prisma.konusma.deleteMany({ where: { soranEposta: EPOSTA } });
}

async function main() {
  await temizle();

  console.log('\n═══ 1. Yol eşlemesi ═══');
  bekle('ana sayfa', ingilizceYol('/') === '/en');
  bekle('bölge hub', ingilizceYol('/bolgeler') === '/en/regions');
  bekle('bölge iniş', ingilizceYol('/projeler/atasehir') === '/en/developments/atasehir');
  bekle('proje detay',
    ingilizceYol('/proje/meridyen-park-atasehir') === '/en/project/meridyen-park-atasehir');
  bekle('firma sayfası',
    ingilizceYol('/firma/meridyen-yapi') === '/en/developer/meridyen-yapi');
  bekle('kurumsal sayfa', ingilizceYol('/nasil-calisir') === '/en/how-it-works');
  bekle('arama', ingilizceYol('/arama') === '/en/search');
  // Yazılmamış İngilizce sayfa kalmadı; yeni sayfa eklenirse buraya girer
  bekle('yönlendirme listesi boş', Object.keys(YONLENDIRILEN_EN).length === 0);

  // Uzun kuyruk iniş sayfalarının İngilizcesi yok — hreflang de olmamalı
  bekle('karşılığı olmayan sayfa null dönüyor',
    ingilizceYol('/projeler/atasehir/guvenlikli-siteler') === null);
  bekle('bilinmeyen yol null dönüyor', ingilizceYol('/olmayan-sayfa') === null);

  console.log('\n═══ 2. Ters eşleme (simetri) ═══');
  const yollar = ['/', '/bolgeler', '/arama', '/projeler/atasehir',
    '/proje/meridyen-park-atasehir', '/firma/meridyen-yapi',
    '/nasil-calisir', '/sikca-sorulanlar'];
  for (const tr of yollar) {
    const en = ingilizceYol(tr);
    bekle(`${tr} ↔ ${en}`, en !== null && turkceYol(en) === tr);
  }
  bekle('İngilizce bilinmeyen yol null', turkceYol('/en/nope') === null);

  console.log('\n═══ 3. hreflang kümesi ═══');
  const alt = dilAlternatifleri('/projeler/atasehir');
  bekle('küme üretiliyor', alt !== null);
  bekle('tr-TR var', !!alt?.languages['tr-TR']);
  bekle('en-GB var', !!alt?.languages['en-GB']);
  bekle('x-default Türkçeyi gösteriyor',
    alt?.languages['x-default'] === alt?.languages['tr-TR']);
  bekle('kanonik kendi dilini gösteriyor', alt?.canonical === alt?.languages['tr-TR']);

  const altEn = dilAlternatifleriEn('/en/developments/atasehir');
  bekle('İngilizce taraf aynı kümeyi üretiyor',
    altEn?.languages['tr-TR'] === alt?.languages['tr-TR']
    && altEn?.languages['en-GB'] === alt?.languages['en-GB'],
    'karşılıklı (reciprocal)');
  bekle('İngilizce kanonik kendi URL\'i', altEn?.canonical === altEn?.languages['en-GB']);

  bekle('karşılığı olmayan sayfada hreflang YOK',
    dilAlternatifleri('/projeler/atasehir/guvenlikli-siteler') === null);

  console.log('\n═══ 4. Sözlük ═══');
  const tr = sozluk('tr'), en = sozluk('en');
  const anahtarlar = Object.keys(tr) as (keyof typeof tr)[];
  bekle('iki sözlük aynı anahtarlara sahip',
    anahtarlar.every((k) => k in en), `${anahtarlar.length} anahtar`);
  bekle('hiçbir İngilizce değer boş değil', anahtarlar.every((k) => en[k].trim().length > 0));
  bekle('İngilizce değerler Türkçeden farklı',
    anahtarlar.filter((k) => en[k] === tr[k]).length <= 2,
    `${anahtarlar.filter((k) => en[k] === tr[k]).length} aynı (villa gibi ortak sözcükler)`);
  bekle('İngilizce metinlerde Türkçe karakter yok',
    !anahtarlar.some((k) => /[ğĞıİşŞçÇöÖüÜ]/.test(en[k])),
    anahtarlar.filter((k) => /[ğĞıİşŞçÇöÖüÜ]/.test(en[k])).join(',') || 'temiz');
  bekle('iki dil tanımlı', DILLER.length === 2);

  console.log('\n═══ 5. İngilizce içerik ═══');
  const bolgelerEn = await getBolgelerEn();
  const projelerEn = await getProjelerEn();
  const bolgeToplam = await prisma.bolge.count({ where: { yayinda: true } });

  bekle('bölgelerin hepsi çevrilmiş', bolgelerEn.length === bolgeToplam,
    `${bolgelerEn.length}/${bolgeToplam}`);
  bekle('çevrilmiş proje var', projelerEn.length > 0, `${projelerEn.length} proje`);
  bekle('her bölgenin editöryel içeriği var', bolgelerEn.every((b) => b.icerik !== null));
  bekle('içerik alanları dolu',
    bolgelerEn.every((b) => b.icerik!.giris.length > 200 && b.icerik!.mevkiler.length >= 3
      && b.icerik!.yatirim.length > 80 && b.icerik!.ulasim.length > 80
      && b.icerik!.ipuclari.length >= 3));

  /* Çeviri gerçekten İngilizce mi?
     Türkçe KARAKTERE bakmak yanlış sonuç veriyor: İngilizce metin de
     Ataşehir, Başakşehir, Nilüfer gibi yer adları içeriyor ve bunlar
     çevrilmez. Bunun yerine Türkçe İŞLEV SÖZCÜKLERİ aranıyor — bir
     metinde "ve", "için", "ile" geçiyorsa gerçekten çevrilmemiş
     demektir. */
  const trIsaret = /\b(ve|ile|için|bir|bu|çok|daha|olan|olarak|kadar|sonra|gibi|dakika|saat)\b/gi;
  const isaretSay = (m: string) => (m.match(trIsaret) ?? []).length;

  const supheli = bolgelerEn.filter((b) => isaretSay(`${b.ozet} ${b.icerik!.giris}`) > 1);
  bekle('bölge metinleri İngilizce', supheli.length === 0,
    supheli.map((b) => b.slug).join(', ') || `${bolgelerEn.length} bölge kontrol edildi`);

  const supheliProje = projelerEn.filter((v) => isaretSay(v.ozet) > 1);
  bekle('proje özetleri İngilizce', supheliProje.length === 0,
    supheliProje.map((v) => v.slug).join(', ') || `${projelerEn.length} proje kontrol edildi`);

  // Türkçesiyle birebir aynı metin = çeviri unutulmuş
  const kopyalar = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*)::bigint AS n
    FROM proje p
    JOIN proje_ceviri pc ON pc."projeId" = p.id AND pc.dil = 'EN'
    WHERE p.yayinda AND pc.ozet = p.ozet`;
  bekle('İngilizce özet Türkçesinin kopyası değil', Number(kopyalar[0].n) === 0);

  console.log('\n═══ 6. İçerik bütünlüğü ═══');
  bekle('her projenin görseli var', projelerEn.every((v) => v.foto.length > 0));
  bekle('görsel ve alt metin sayıları eşit',
    projelerEn.every((v) => v.foto.length === v.fotoAlt.length));
  bekle('başlangıç fiyatları pozitif', projelerEn.every((v) => v.fiyatMin > 0));
  bekle('özellik adları çevrilmiş',
    projelerEn.every((v) => v.ozellikler.every((o) => !/[ğĞıİşŞçÇöÖüÜ]/.test(o.ad))));
  /* Teslim tarihi ISO METİN dönmeli: `Date` nesnesi sunucu bileşeninden
     istemciye geçerken serileşiyor ve `toLocaleDateString` ikinci
     isabette patlıyordu. */
  bekle('teslim tarihi ISO metin ya da null',
    projelerEn.every((v) => v.teslimTarihi === null || /^\d{4}-\d{2}-\d{2}$/.test(v.teslimTarihi)));
  /* Daire tipi olmayan proje yayına alınamıyor; İngilizce listede de
     olmamalı — "hangi tipler var, kaça?" sorusuna cevabı yok. */
  bekle('her projenin daire tipi var', projelerEn.every((v) => v.daireTipleri.length > 0));
  bekle('oda etiketleri dolu',
    projelerEn.every((v) => v.daireTipleri.every((d) => d.oda.length > 0)));

  console.log('\n═══ 7. İngilizce soru–yanıt akışı ═══');
  /* Talep formunda dil alanı YOK: talep satış ekibine gidiyor ve ekip
     Türkçe çalışıyor. Dil boyutu ZİYARETÇİYE dönen yerde anlamlı ve
     orası yazışma: İngilizce sayfadan soru soran kişi yanıtı Türkçe
     okuyamaz. */
  const projeEn = await prisma.proje.findFirstOrThrow({
    where: { yayinda: true, ceviri: { some: { dil: 'EN', ozet: { not: null } } } },
    select: { id: true },
  });

  const konusmaEn = await prisma.konusma.create({
    data: {
      projeId: projeEn.id, dil: 'EN',
      soranAd: 'Sarah Whitfield', soranEposta: EPOSTA,
      konu: 'Delivery date',
      mesajlar: { create: [{ soranMi: true, metin: 'When is delivery?' }] },
    },
    select: { id: true, dil: true },
  });
  bekle('yazışma dili kaydediliyor', konusmaEn.dil === 'EN');

  await soruYanitBildirimi(konusmaEn.id, 'Delivery is scheduled for the second quarter of 2027.');
  const bildirimler = await prisma.bildirim.findMany({
    where: { konusmaId: konusmaEn.id },
    select: { tip: true, govdeHtml: true, govdeMetin: true, alici: true },
  });
  bekle('yanıt bildirimi üretildi', bildirimler.length === 1, `${bildirimler.length}`);
  bekle('İngilizce şablon kullanıldı',
    bildirimler.every((b) => /<html lang="en"/.test(b.govdeHtml)));

  /* URL yollarında "proje" geçiyor; yalnızca DÜZ METİN CÜMLELERİNE
     bakılmalı, bağlantı satırları elenmeli. */
  const cumleler = (m: string) =>
    m.split('\n').filter((l) => !/^(https?:|Details:|View)/.test(l.trim())).join(' ');
  const trCumle = /\b(Merhaba|yanıtladı|Sayın|proje hakkında|edilmiştir)\b/i;
  bekle('İngilizce metinde Türkçe cümle yok',
    bildirimler.every((b) => !trCumle.test(cumleler(b.govdeMetin))),
    bildirimler.filter((b) => trCumle.test(cumleler(b.govdeMetin))).map((b) => b.tip).join(',') || 'temiz');
  bekle('bağlantı /en/ altına gidiyor',
    bildirimler.every((b) => !/https?:\/\/[^\s"]*\/proje\//.test(b.govdeMetin)));

  // Türkçe soran kişi Türkçe yanıt almalı — aynı yol, ters yön
  const konusmaTr = await prisma.konusma.create({
    data: {
      projeId: projeEn.id, dil: 'TR',
      soranAd: 'Ayşe Yılmaz', soranEposta: EPOSTA,
      konu: 'Teslim tarihi',
      mesajlar: { create: [{ soranMi: true, metin: 'Teslim ne zaman?' }] },
    },
    select: { id: true },
  });
  await soruYanitBildirimi(konusmaTr.id, 'Teslim 2027 2. çeyrekte planlanıyor.');
  const trBildirim = await prisma.bildirim.findFirstOrThrow({
    where: { konusmaId: konusmaTr.id }, select: { govdeHtml: true },
  });
  bekle('Türkçe soruya Türkçe yanıt', /<html lang="tr"/.test(trBildirim.govdeHtml));

  await temizle();

  console.log('\n═══ 8. Uzun kuyruk iniş sayfaları ═══');
  const enLanding = await getLandingKombinasyonlariEn();
  bekle('İngilizce iniş kombinasyonu üretiliyor', enLanding.length > 0, `${enLanding.length} sayfa`);
  bekle('slugları İngilizce', enLanding.every((k) => /^[a-z-]+$/.test(k.ozellik)));
  bekle('Türkçe slugdan farklı', enLanding.every((k) => k.ozellik !== k.trSlug));
  bekle('hepsinin başlığı ve açıklaması var',
    enLanding.every((k) => k.baslik.length > 3 && k.aciklama.length > 40));

  const ornek = enLanding[0];
  const landingProjeler = await getLandingProjelerEn(ornek.bolge, ornek.ozellikKod);
  bekle('kombinasyon proje döndürüyor', landingProjeler.length > 0,
    `${ornek.bolge}/${ornek.ozellik}: ${landingProjeler.length}`);
  bekle('hepsi o özelliğe sahip',
    landingProjeler.every((v) => v.ozellikler.some((o) => o.kod === ornek.ozellikKod)));
  // Boş iniş sayfası üretmek hem kullanıcıyı hem tarama bütçesini harcar
  const ilkBes = await Promise.all(enLanding.slice(0, 5).map((k) =>
    getLandingProjelerEn(k.bolge, k.ozellikKod).then((l) => l.length)));
  bekle('boş kombinasyon üretilmiyor', ilkBes.every((n) => n > 0), ilkBes.join(','));

  console.log('\n═══ 9. Görsel CDN soyutlaması ═══');
  const kaynak = 'https://images.unsplash.com/photo-123?w=800';
  bekle('CDN yokken URL değişmiyor', gorsel(kaynak) === kaynak);
  bekle('boş girdi çökmüyor', gorsel('') === '');
  bekle('sizes değerleri tanımlı',
    Object.values(BOYUTLAR).every((b) => b.includes('vw')));
  bekle('kart sizes mobilde tam genişlik', BOYUTLAR.kart.includes('100vw'));

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
