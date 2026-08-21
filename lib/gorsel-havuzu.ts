/**
 * Stok fotoğraf havuzu.
 *
 * Envanterde gerçek fotoğraf yokken kartlar, hero ve bölge görselleri
 * buradan besleniyor. Gerçek fotoğraf geldiğinde havuz devreye
 * girmiyor — `proje.kapak` doluysa o kullanılıyor.
 *
 * HER KARE TEK TEK GÖZDEN GEÇİRİLDİ. Bu bir formalite değil: aynı
 * yöntemi kullanan referans projede havuz rastgele seçilmiş, sonradan
 * bakıldığında içinde bir KEDİ fotoğrafı çıkmış ve dokuz ilanın
 * galerisinde aylarca durmuş. Aday havuzundan elenenler:
 *   · üç otomobil, bir el sıkışma, bir kahve fincanı  (alakasız)
 *   · beş tropik resort, iki dağ evi                  (yanlış ürün)
 *   · siyah-beyaz kareler          (renkli ızgarada tek başına kalıyor)
 *   · aşırı yakın cephe soyutlamaları    (kartta ne olduğu anlaşılmıyor)
 *   · Türk bayrağı taşıyan kare  (bölge kartı yer gösterir, sembol değil)
 *
 * SEÇİM DETERMİNİSTİK. Rastgele seçim sunucu ve istemcide farklı
 * sonuç verip hydration uyuşmazlığı üretirdi; ayrıca aynı proje her
 * ziyarette başka fotoğrafla görünürdü. Anahtardan türetilen sabit
 * bir indeks kullanılıyor.
 *
 * Lisans: Unsplash License — ticari kullanım serbest, atıf zorunlu
 * değil. https://unsplash.com/license
 */

const TABAN = 'https://images.unsplash.com/photo-';

/** Havuz anahtarları — proje tipi ve bölüm türleriyle eşleşiyor. */
export type GorselTuru =
  | 'konut' | 'villa' | 'ofis' | 'ic' | 'santiye' | 'sahil' | 'sehir';

const HAVUZ: Record<GorselTuru, string[]> = {
  /* Çok katlı konut — asıl ürünümüz. */
  konut: [
    '1590058582642-b130d1620a49', // beyaz, kavisli balkonlu blok
    '1592276040264-e10344a6a10e', // bej konut kulesi
    '1600994562666-98dbd6d44e44', // yeşillik içinde açık renkli bloklar
    '1597833406252-d8b1f7ef034d', // iki gri kule
    '1515263487990-61b07816b324', // koyu cam cepheli az katlı blok
    '1516501312919-d0cb0b7b60b8', // balkonlu modern blok
    '1579632652768-6cb9dcf85912', // tuğla cepheli konut
    '1605267143746-999bf61d0d08', // sade bej cephe
  ],

  /* Villa — referans projeden devralındı, o taraf zaten elemişti. */
  villa: [
    '1613490493576-7fde63acd811', // havuzlu modern villa
    '1580587771525-78b9dba3b914', // havuzlu villa, geniş cam
    '1613977257363-707ba9348227', // havuzlu beyaz villa
    '1600596542815-ffad4c1539a9', // havuzlu villa, düz çatı
    '1600047509807-ba8f99d2cdde', // ahşap-beyaz villa, çim bahçe
    '1600585154340-be6161a56a0c', // koyu cepheli villa, ağaçlar
    '1509600110300-21b9d5fedeb7', // taş villa, havuz, yeşillik
    '1512917774080-9991f1c4c750', // beyaz villa, cam cephe
  ],

  ofis: [
    '1593519741064-a8d20971d8b9', // kavisli modern ofis
    '1574868240055-b2fdf9fda3c7', // mavi cam kule
    '1595273022710-5137700193f2', // ızgara cepheli ofis
    '1631085474949-d8a367d9d26d', // gri modern ofis bloğu
    '1603093946405-e3629b722cda', // gökyüzüne karşı cam kule
    '1604026288681-d9fca55b06fa', // yeşil cam gökdelen
  ],

  /* İç mekân — proje detayında ve süreç bölümünde. */
  ic: [
    '1600566753086-00f18fb6b3ea', // salon + merdiven
    '1600210492486-724fe5c67fb0', // modern salon
    '1600607687920-4e2a09cf159d', // yemek alanı
    '1600607687939-ce8a6c25118c', // ahşap duvarlı salon
    '1600573472550-8090b5e0745e', // cam cephe, havuz manzarası
    '1600121848594-d8644e57abab', // klasik salon
  ],

  santiye: [
    '1644221150167-fb4fafa7f411', // şantiye, arkada cami — Türkiye
    '1644221150141-24f57d9a468b', // geniş şantiye alanı
    '1630500686062-7652e3182d75', // kırmızı vinç, yükselen blok
    '1593630265256-d2cc162ab58f', // iskeleli inşaat
    '1643308012242-704341800ef3', // alacakaranlıkta vinçler
    '1599707254554-027aeb4deacd', // vinçler
  ],

  /* Bölge kartları — sahil. */
  sahil: [
    '1598114570969-a4df3e85de9b', // yamaçta beyaz evler (Bodrum)
    '1566084083228-d6a45b5b589e', // havadan koy, turkuaz
    '1564166489229-dfb970a591bf', // guletler, turkuaz deniz
    '1566084091852-0385135abadc', // havadan kıyı şeridi
    '1591078314870-fe9b75a1665a', // koyda guletler
    '1583061386694-e364c84ba31d', // havadan sahil kasabası
    '1580492327426-62eaa87cdda4', // deniz kenarında kale
    '1591078314943-85c674b3789b', // limanda guletler
  ],

  /* Bölge kartları — şehir. */
  sehir: [
    '1518084823714-2f59a7315a39', // gece İstanbul, Boğaz
    '1524231757912-21f4fe3a7200', // Galata ve şehir
    '1564407727371-3eece6c58961', // Ortaköy ve köprü
    '1589561454226-796a8aa89b05', // sudan İstanbul silueti
    '1623439844752-524658b16ce6', // cami ve Haliç
    '1571941646730-3ad5b00997ef', // Galata, Haliç
    '1564428366891-dc20b1edf33b', // Kız Kulesi
    '1527838832700-5059252407fa', // minareler, pembe gökyüzü
  ],
};

/**
 * Anahtardan sabit indeks.
 *
 * djb2'nin kısaltılmış hali. Amaç dağılım, güvenlik değil; aynı
 * anahtar her zaman aynı kareyi vermeli.
 */
function indeks(anahtar: string, mod: number): number {
  let h = 5381;
  for (let i = 0; i < anahtar.length; i++) h = ((h << 5) + h + anahtar.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

/**
 * Havuzdan bir görsel adresi.
 *
 * @param tur    hangi havuz
 * @param anahtar proje slug'ı gibi sabit bir değer — aynı anahtar
 *                her zaman aynı fotoğrafı verir
 * @param kayma  aynı anahtardan birden fazla kare gerektiğinde
 *               (galeri) sırayı kaydırmak için
 */
export function havuzGorseli(tur: GorselTuru, anahtar: string, kayma = 0): string {
  const liste = HAVUZ[tur];
  const id = liste[(indeks(anahtar, liste.length) + kayma) % liste.length]!;
  return `${TABAN}${id}`;
}

/**
 * Proje tipini havuz türüne çeviriyor.
 *
 * Bilinmeyen tip villaya değil KONUTA düşüyor: envanterin çoğunluğu
 * konut projesi ve yanlış tarafa düşen bir kayıt en az yanlış görünen
 * yerde durmalı.
 */
export function tipHavuzu(tip: string): GorselTuru {
  if (tip === 'ofis') return 'ofis';
  if (tip === 'villa' || tip === 'mustakil' || tip === 'yali') return 'villa';
  return 'konut';
}

/**
 * Görsel CDN'i yayında mı?
 *
 * `medya` tablosunda kapak kaydı OLAN ama dosyası HİÇ YÜKLENMEMİŞ
 * projeler var — tohum verisi kaydı yazıyor, nesne deposu ise henüz
 * bağlı değil. `kapak` dolu göründüğü için havuz devreye girmiyor ve
 * arama sonuçlarının tamamı kırık görselle çiziliyordu
 * (cdn.konutprojeleri.com şu an DNS'te bile yok).
 *
 * Bu yüzden kapak kaydına ancak CDN'in ayakta olduğu AÇIKÇA
 * söylendiğinde güveniyoruz. R2/Cloudflare yayına alındığında
 * ortam değişkeni `1` yapılır ve gerçek fotoğraflar anında devreye
 * girer; kod değişmez.
 */
const CDN_HAZIR = process.env.NEXT_PUBLIC_CDN_HAZIR === '1';

/**
 * Proje kapak görseli.
 *
 * Gerçek fotoğraf her zaman önce gelir; havuz yalnızca boşluğu
 * dolduruyor.
 */
export function projeKapagi(p: {
  kapak: string | null; slug: string; tip: string;
}): string {
  if (p.kapak && CDN_HAZIR) return p.kapak;
  return havuzGorseli(tipHavuzu(p.tip), p.slug);
}

/** Hero için kullanılan kareler — sırayla geçiyorlar. */
export const HERO_KARELERI = [
  `${TABAN}1590058582642-b130d1620a49`, // konut kulesi, mavi gökyüzü
  `${TABAN}1613490493576-7fde63acd811`, // havuzlu villa
  `${TABAN}1518084823714-2f59a7315a39`, // gece İstanbul
] as const;
