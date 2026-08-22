/* ============================================================
   Düzenlenebilir metin kaydı.

   Sayfalara serpiştirilmiş kısa metinlerin ANAHTARLARI ve
   VARSAYILANLARI burada. `metin` tablosu yalnızca üzerine yazmaları
   tutuyor; satır yoksa buradaki varsayılan gösteriliyor.

   Neden kod tarafında varsayılan var:

   - Tablo boşken (yeni kurulum, boş veritabanı) site eksiksiz
     çalışıyor. Tohumlama gerekmiyor.
   - Panelde "varsayılana dön" satırı silmek demek; geri alma bedava.
   - Yeni bir metin eklemek kayda bir satır yazmak; göç gerekmiyor,
     panelde kendiliğinden beliriyor.
   - Anahtar yazım hatası derleme hatası (`MetinAnahtari` birleşim
     tipi), çalışma zamanında boş metin değil.

   Kayıtta olmayan anahtarlar panelde görünmüyor; kaldırılan bir
   metnin veritabanında kalan satırı zararsız.
   ============================================================ */

import type { Dil } from './i18n';

export type MetinTipi = 'satir' | 'paragraf';

export interface MetinTanimi {
  /** Panelde görünen grup — genelde sayfa adı */
  grup: string;
  /** Panelde alanın etiketi */
  etiket: string;
  /** Metnin nerede/nasıl göründüğü; yöneticiye bağlam veriyor */
  ipucu?: string;
  tip: MetinTipi;
  /** Kod içindeki karşılık; tabloda satır yoksa bu gösteriliyor */
  tr: string;
  /** İngilizce karşılık. Yoksa İngilizce sayfada da Türkçesi çıkar. */
  en?: string;
}

export const METIN_KAYDI = {
  /* ---------------- Bölge sayfaları ---------------- */
  'bolgeler.baslik': {
    grup: 'Bölgeler', etiket: 'Sayfa başlığı', tip: 'satir',
    tr: 'Bölgeler', en: 'Areas',
  },
  'bolgeler.tip.baslik': {
    grup: 'Bölgeler', etiket: 'Tipe göre başlık', tip: 'satir',
    tr: 'Proje tipine göre', en: 'By development type',
  },

  /* ---------------- Güven şeridi ---------------- */
  'baslik.guven': {
    grup: 'Başlık', etiket: 'Üst güven şeridi', tip: 'satir',
    ipucu: 'Sayfanın en üstündeki ince şerit. Kısa tutun.',
    tr: 'Her proje yerinde incelendi · Fiyat ve teslim bilgisi firma beyanıyla doğrulandı',
    en: 'Every development inspected on site · Prices and delivery dates verified with the developer',
  },

  /* ---------------- Ana sayfa: hero ---------------- */
  'anasayfa.hero.baslik': {
    grup: 'Ana sayfa', etiket: 'Hero başlığı', tip: 'satir',
    ipucu: 'Tek satır olarak gösterilir. Bölmek isterseniz araya tek bir "|" koyun.',
    tr: 'Yeni konut, villa ve ofis projeleri|tek adreste',
    en: 'New homes, villas and offices|in one place',
  },
  'anasayfa.hero.alt': {
    grup: 'Ana sayfa', etiket: 'Hero alt metni', tip: 'paragraf',
    ipucu: '{proje} ve {bolge} yerine güncel sayılar yazılır.',
    tr: 'Kat planları, daire tipleri, teslim tarihi ve fiyat aralığı bir arada. '
      + 'Beğendiğiniz projenin satış ekibinden tek formla dönüş alın.',
    en: 'Floor plans, unit types, delivery dates and price ranges in one place. '
      + 'One form gets you a call back from the developer’s sales team.',
  },
  'anasayfa.hero.rozet': {
    grup: 'Ana sayfa', etiket: 'Hero rozeti (şu an basılmıyor)', tip: 'satir',
    /* Rozet hero'dan KALDIRILDI; kayıt duruyor çünkü çağrıda geçilen
       yer tutucuyu (`{proje}`, `{bolge}`) kullanan tek metin bu ve
       `scripts/test-icerik.ts` mekanizmayı bunun üzerinden sınıyor.
       Etikette "basılmıyor" yazıyor ki panelde düzenleyen biri
       değişikliğin neden ekrana yansımadığını arasın. */
    ipucu: 'Şu an sayfada basılmıyor. {proje} ve {bolge} yerine güncel '
      + 'sayılar yazılır.',
    tr: '{proje} proje · {bolge} bölge',
    en: '{proje} developments · {bolge} areas',
  },

  /* ---------------- Kanıt şeridi ----------------
     Üst çubuktaki ve hero'daki şeritler birer VAAT söylüyor; bu üç
     kutu aynı sözleri tarihli sayılarla söylüyor. Sayılar veriden
     geliyor, metin buradan: vaadin dili değişince dağıtım
     beklemesin. */
  'anasayfa.kanit.kontrol.baslik': {
    grup: 'Ana sayfa', etiket: 'Kanıt · yerinde inceleme başlığı', tip: 'satir',
    /* `{proje}` KULLANILMIYOR: o, site geneli bir yer tutucu ve
       `site.projeSayisi` (pazarlama rakamı) ile doluyor. Buradaki
       sayı yayındaki gerçek proje adedi, ayrı bir ad gerekiyor. */
    ipucu: '{toplam}, {kontrollu}, {madde} ve {tarih} yerine güncel değerler yazılır.',
    tr: '{toplam} projenin {kontrollu} tanesi yerinde incelendi',
    en: '{kontrollu} of {toplam} developments inspected on site',
  },
  'anasayfa.kanit.kontrol.metin': {
    grup: 'Ana sayfa', etiket: 'Kanıt · yerinde inceleme metni', tip: 'paragraf',
    ipucu: '{toplam}, {kontrollu}, {madde} ve {tarih} yerine güncel değerler yazılır.',
    tr: '{madde} maddelik liste, ziyaret tarihi ve incelemeyi yapan kişi proje '
      + 'sayfasında açık. Son inceleme: {tarih}.',
    en: 'A {madde}-point checklist, the visit date and the inspector are shown on '
      + 'each development page. Last inspection: {tarih}.',
  },
  'anasayfa.kanit.plan.baslik': {
    grup: 'Ana sayfa', etiket: 'Kanıt · kat planı başlığı', tip: 'satir',
    tr: 'Kat planları ve daire tipleri açıkta',
    en: 'Floor plans and unit types out in the open',
  },
  'anasayfa.kanit.plan.metin': {
    grup: 'Ana sayfa', etiket: 'Kanıt · kat planı metni', tip: 'paragraf',
    tr: 'Her projenin tip tablosu sayfada: brüt ve net m², banyo sayısı, '
      + 'başlangıç fiyatı ve kalan adet. Form doldurmadan görebiliyorsunuz.',
    en: 'Every development lists its unit table on the page: gross and net area, '
      + 'bathrooms, starting price and remaining stock — no form required.',
  },
  'anasayfa.kanit.firma.baslik': {
    grup: 'Ana sayfa', etiket: 'Kanıt · firma başlığı', tip: 'satir',
    tr: 'Geliştirici firma her projede yazılı',
    en: 'The developer is named on every listing',
  },
  'anasayfa.kanit.firma.metin': {
    grup: 'Ana sayfa', etiket: 'Kanıt · firma metni', tip: 'paragraf',
    tr: 'Firmanın kuruluş yılı ve bugüne kadar TESLİM ETTİĞİ proje sayısı '
      + 'kartın üstünde. Vaat değil geçmiş.',
    en: 'The developer’s founding year and the number of projects actually '
      + 'delivered are shown on the card. Track record, not promises.',
  },

  /* ---------------- Ana sayfa: bölümler ---------------- */
  'anasayfa.secki.ustbaslik': {
    grup: 'Ana sayfa', etiket: 'Vitrin · üst başlık', tip: 'satir',
    tr: 'Öne çıkanlar', en: 'Featured',
  },
  'anasayfa.secki.baslik': {
    grup: 'Ana sayfa', etiket: 'Vitrin · başlık', tip: 'satir',
    tr: 'Bu ay öne çıkan projeler', en: 'Developments in focus this month',
  },
  'anasayfa.secki.spot': {
    grup: 'Ana sayfa', etiket: 'Vitrin · spot', tip: 'paragraf',
    tr: 'İnşaatı ilerlemiş, teslime yaklaşmış ve daire tipi seçeneği hâlâ geniş projeler.',
    en: 'Developments well into construction, close to delivery, with a wide choice of units left.',
  },

  'anasayfa.bolge.ustbaslik': {
    grup: 'Ana sayfa', etiket: 'Bölgeler · üst başlık', tip: 'satir',
    tr: 'Nerede arıyorsunuz?', en: 'Where are you looking?',
  },
  'anasayfa.bolge.baslik': {
    grup: 'Ana sayfa', etiket: 'Bölgeler · başlık', tip: 'satir',
    tr: 'Bölgeye göre projeler', en: 'Developments by area',
  },
  'anasayfa.bolge.spot': {
    grup: 'Ana sayfa', etiket: 'Bölgeler · spot', tip: 'paragraf',
    tr: 'Her bölge için mevkiler, ulaşım süreleri, çevredeki okul ve hastaneler '
      + 've o bölgeye özgü yatırım notu.',
    en: 'For every area: sub-districts, travel times, nearby schools and hospitals, '
      + 'and notes specific to that market.',
  },

  'anasayfa.adim.ustbaslik': {
    grup: 'Ana sayfa', etiket: 'Nasıl çalışır · üst başlık', tip: 'satir',
    tr: 'Nasıl çalışıyor', en: 'How it works',
  },
  'anasayfa.adim.baslik': {
    grup: 'Ana sayfa', etiket: 'Nasıl çalışır · başlık', tip: 'satir',
    tr: 'Üç adımda satış ekibiyle temas', en: 'Three steps to the sales team',
  },
  'anasayfa.adim.spot': {
    grup: 'Ana sayfa', etiket: 'Nasıl çalışır · spot', tip: 'paragraf',
    tr: 'Aracı değiliz, komisyon almıyoruz. Talebiniz doğrudan projenin satış ekibine gidiyor.',
    en: 'We are not a broker and take no commission. Your enquiry goes straight to the developer’s sales team.',
  },

  'anasayfa.firsat.baslik': {
    grup: 'Ana sayfa', etiket: 'Lansman · başlık', tip: 'satir',
    tr: 'Lansman öncesi projeler', en: 'Pre-launch developments',
  },
  'anasayfa.firsat.spot': {
    grup: 'Ana sayfa', etiket: 'Lansman · spot', tip: 'paragraf',
    tr: 'Satışa çıkmadan takip kurun; daire tipi ve kat seçenekleri en geniş '
      + 'hâlindeyken haberdar olun.',
    en: 'Follow a development before it goes on sale and hear about it while the '
      + 'choice of units and floors is at its widest.',
  },

  'anasayfa.neden.baslik': {
    grup: 'Ana sayfa', etiket: 'Neden biz · başlık', tip: 'satir',
    tr: 'Neden buradan bakmalı?', en: 'Why look here?',
  },
  'anasayfa.neden.spot': {
    grup: 'Ana sayfa', etiket: 'Neden biz · spot', tip: 'paragraf',
    tr: 'Proje tanıtım sitelerinin çoğu fiyatı ve kat planını form arkasına '
      + 'saklıyor. Biz saklamıyoruz.',
    en: 'Most development portals hide prices and floor plans behind a form. We do not.',
  },
  'anasayfa.neden.serit': {
    grup: 'Ana sayfa', etiket: 'Neden biz · alt şerit', tip: 'satir',
    tr: 'Fiyat açık · Kat planı açık · Kalan daire adedi açık',
    en: 'Prices shown · Floor plans shown · Remaining stock shown',
  },

  'anasayfa.tema.baslik': {
    grup: 'Ana sayfa', etiket: 'Temalar · başlık', tip: 'satir',
    tr: 'Aradığınız özelliğe göre', en: 'By the feature you need',
  },
  'anasayfa.tema.spot': {
    grup: 'Ana sayfa', etiket: 'Temalar · spot', tip: 'paragraf',
    tr: 'Metroya yakınlık, kapalı otopark, sosyal tesis — hangisi sizin için '
      + 'belirleyiciyse oradan başlayın.',
    en: 'Metro access, covered parking, on-site facilities — start from whichever matters most.',
  },

  'anasayfa.tip.baslik': {
    grup: 'Ana sayfa', etiket: 'Proje tipi · başlık', tip: 'satir',
    tr: 'Konut, villa ya da ofis', en: 'Homes, villas or offices',
  },
  'anasayfa.tip.spot': {
    grup: 'Ana sayfa', etiket: 'Proje tipi · spot', tip: 'paragraf',
    tr: 'Üç ayrı vitrin. Karma projeler hem konut hem ofis listesinde görünüyor.',
    en: 'Three separate listings. Mixed-use developments appear in both.',
  },

  'anasayfa.firma.baslik': {
    grup: 'Ana sayfa', etiket: 'Firmalar · başlık', tip: 'satir',
    tr: 'Geliştirici firmalar', en: 'Developers',
  },
  'anasayfa.firma.spot': {
    grup: 'Ana sayfa', etiket: 'Firmalar · spot', tip: 'paragraf',
    tr: 'Projeyi kimin yaptığı, ne zaman teslim edileceğine dair en güçlü sinyal. '
      + 'Her firmanın teslim ettiği proje sayısı kartında yazılı.',
    en: 'Who builds it is the strongest signal of whether it will be delivered on time. '
      + 'Each developer card shows how many projects they have completed.',
  },

  'anasayfa.uygun.baslik': {
    grup: 'Ana sayfa', etiket: 'Bütçe · başlık', tip: 'satir',
    tr: 'Bütçenize göre', en: 'By budget',
  },
  'anasayfa.uygun.spot': {
    grup: 'Ana sayfa', etiket: 'Bütçe · spot', tip: 'paragraf',
    tr: 'Fiyat aralığı projenin en düşük daire tipinden başlıyor; üst sınırı '
      + 'seçtiğinizde bütçenize uyan tipi olan projeler listeleniyor.',
    en: 'The range starts from the cheapest unit type. Set an upper limit and you '
      + 'see developments that have a unit within your budget.',
  },

  'anasayfa.aramalar.baslik': {
    grup: 'Ana sayfa', etiket: 'Popüler aramalar · başlık', tip: 'satir',
    tr: 'Sık aranan kombinasyonlar', en: 'Popular searches',
  },

  'anasayfa.firmabasvuru.baslik': {
    grup: 'Ana sayfa', etiket: 'Firma başvurusu · başlık', tip: 'satir',
    tr: 'Projenizi burada tanıtın', en: 'List your development here',
  },
  'anasayfa.firmabasvuru.spot': {
    grup: 'Ana sayfa', etiket: 'Firma başvurusu · spot', tip: 'paragraf',
    tr: 'Ekibimiz projeyi şantiyede inceliyor, siz görselleri ve kat planlarını '
      + 'panelden yüklüyorsunuz. Talepler doğrudan satış ekibinize düşüyor.',
    en: 'Our team inspects the site, you upload the visuals and floor plans from the '
      + 'panel, and enquiries land directly with your sales team.',
  },
  'anasayfa.firmabasvuru.dugme': {
    grup: 'Ana sayfa', etiket: 'Firma başvurusu · düğme', tip: 'satir',
    tr: 'Firma başvurusu yapın', en: 'Apply as a developer',
  },

  /* ---------------- Güven kutuları ---------------- */
  'guven.inceleme.baslik': {
    grup: 'Güven', etiket: 'Yerinde inceleme · başlık', tip: 'satir',
    tr: 'Yerinde inceleme', en: 'On-site inspection',
  },
  'guven.inceleme.metin': {
    grup: 'Güven', etiket: 'Yerinde inceleme · metin', tip: 'paragraf',
    tr: 'Ekibimiz projeyi şantiyede geziyor; ziyaret tarihi ve inceleme maddeleri '
      + 'proje sayfasında açık duruyor.',
    en: 'Our team visits the construction site; the date and the checklist are '
      + 'published on the development page.',
  },
  'guven.fiyat.baslik': {
    grup: 'Güven', etiket: 'Açık fiyat · başlık', tip: 'satir',
    tr: 'Fiyat form arkasında değil', en: 'Prices are not behind a form',
  },
  'guven.fiyat.metin': {
    grup: 'Güven', etiket: 'Açık fiyat · metin', tip: 'paragraf',
    tr: 'Her daire tipinin başlangıç fiyatı ve kalan adedi sayfada yazılı. '
      + 'Numaranızı bırakmadan görebiliyorsunuz.',
    en: 'Every unit type shows its starting price and remaining stock on the page — '
      + 'no phone number required.',
  },
  'guven.tarafsiz.baslik': {
    grup: 'Güven', etiket: 'Tarafsızlık · başlık', tip: 'satir',
    tr: 'Komisyon almıyoruz', en: 'We take no commission',
  },
  'guven.tarafsiz.metin': {
    grup: 'Güven', etiket: 'Tarafsızlık · metin', tip: 'paragraf',
    tr: 'Satıştan pay almıyoruz; hangi projenin öne çıkacağını komisyon oranı '
      + 'belirlemiyor.',
    en: 'We take no cut of the sale, so no commission rate decides which development '
      + 'gets shown first.',
  },
  'guven.kvkk.baslik': {
    grup: 'Güven', etiket: 'Veri · başlık', tip: 'satir',
    tr: 'Numaranız satılmıyor', en: 'Your number is not sold',
  },
  'guven.kvkk.metin': {
    grup: 'Güven', etiket: 'Veri · metin', tip: 'paragraf',
    tr: 'Bilgileriniz yalnızca talep ettiğiniz projenin satış ekibine iletiliyor; '
      + 'başka firmalarla paylaşılmıyor.',
    en: 'Your details go only to the sales team of the development you asked about — '
      + 'never to anyone else.',
  },

  /* ---------------- Altbilgi ---------------- */
  'altbilgi.tanitim': {
    grup: 'Altbilgi', etiket: 'Tanıtım metni', tip: 'paragraf',
    tr: 'Türkiye genelindeki yeni konut, villa ve ofis projelerini kat planı, '
      + 'daire tipi, teslim tarihi ve fiyat aralığıyla birlikte listeliyoruz.',
    en: 'We list new residential, villa and office developments across Türkiye with '
      + 'floor plans, unit types, delivery dates and price ranges.',
  },
  'altbilgi.telif': {
    grup: 'Altbilgi', etiket: 'Telif satırı', tip: 'satir',
    ipucu: '{yil} yerine içinde bulunulan yıl yazılır.',
    tr: '© {yil} {marka}. Tüm hakları saklıdır.',
    en: '© {yil} {marka}. All rights reserved.',
  },
  'altbilgi.yasal': {
    grup: 'Altbilgi', etiket: 'Yasal not', tip: 'paragraf',
    tr: 'Sitedeki proje bilgileri geliştirici firmaların beyanına dayanıyor. '
      + 'Fiyat, teslim tarihi ve daire adedi değişebilir; satın alma öncesi '
      + 'firmadan yazılı teyit alın.',
    en: 'Development details are based on information supplied by the developers. '
      + 'Prices, delivery dates and unit counts may change; obtain written '
      + 'confirmation from the developer before purchase.',
  },

  /* ---------------- İngilizce sayfa metinleri ---------------- */
  'int.rozet': {
    grup: 'İngilizce', etiket: 'Hero rozeti', tip: 'satir',
    tr: 'Yeni projeler · Türkiye', en: 'New developments · Türkiye',
  },
  'int.baslik': {
    grup: 'İngilizce', etiket: 'Hero başlığı', tip: 'satir',
    tr: 'Türkiye’de yeni konut projeleri', en: 'New-build homes in Türkiye',
  },
  'int.spot': {
    grup: 'İngilizce', etiket: 'Hero spotu', tip: 'paragraf',
    tr: 'Kat planları, daire tipleri ve teslim tarihleriyle.',
    en: 'Floor plans, unit types and delivery dates, all on the page.',
  },
  'int.bolge.baslik': {
    grup: 'İngilizce', etiket: 'Bölgeler başlığı', tip: 'satir',
    tr: 'Bölgeler', en: 'Areas',
  },
  'int.bolge.spot': {
    grup: 'İngilizce', etiket: 'Bölgeler spotu', tip: 'paragraf',
    tr: 'Bölgeye göre projeler.', en: 'Developments by area.',
  },
  'int.secki.baslik': {
    grup: 'İngilizce', etiket: 'Vitrin başlığı', tip: 'satir',
    tr: 'Öne çıkan projeler', en: 'Featured developments',
  },
  'int.secki.spot': {
    grup: 'İngilizce', etiket: 'Vitrin spotu', tip: 'paragraf',
    tr: 'İnşaatı ilerlemiş, teslime yaklaşmış projeler.',
    en: 'Well into construction and close to delivery.',
  },
  'int.meta.anasayfa.baslik': {
    grup: 'İngilizce', etiket: 'Meta · ana sayfa başlığı', tip: 'satir',
    tr: 'Türkiye’de yeni konut projeleri', en: 'New-Build Homes in Türkiye',
  },
  'int.meta.anasayfa.aciklama': {
    grup: 'İngilizce', etiket: 'Meta · ana sayfa açıklaması', tip: 'paragraf',
    tr: 'Kat planları, daire tipleri, teslim tarihleri ve fiyat aralıklarıyla.',
    en: 'Floor plans, unit types, delivery dates and price ranges — shown on the page, not behind a form.',
  },
  'int.meta.bolgeler.baslik': {
    grup: 'İngilizce', etiket: 'Meta · bölgeler başlığı', tip: 'satir',
    tr: 'Bölgeler', en: 'Areas',
  },
  'int.meta.bolgeler.aciklama': {
    grup: 'İngilizce', etiket: 'Meta · bölgeler açıklaması', tip: 'paragraf',
    tr: 'Bölgeye göre yeni konut projeleri.',
    en: 'New-build developments by area, with travel times and local notes.',
  },
  'int.bolgeler.giris': {
    grup: 'İngilizce', etiket: 'Bölgeler giriş metni', tip: 'paragraf',
    tr: 'Her bölge için mevkiler, ulaşım ve yatırım notu.',
    en: 'Sub-districts, travel times and local market notes for every area.',
  },
  'int.meta.arama.baslik': {
    grup: 'İngilizce', etiket: 'Meta · arama başlığı', tip: 'satir',
    tr: 'Proje arama', en: 'Search developments',
  },
  'int.meta.arama.aciklama': {
    grup: 'İngilizce', etiket: 'Meta · arama açıklaması', tip: 'paragraf',
    /* 70–160 karakter: altında arama sonucunda zayıf, üstünde
       kesiliyor. */
    tr: 'Bölge, proje tipi, oda sayısı, teslim tarihi, peşinat ve vadeye göre '
      + 'filtreleyerek yeni konut, villa ve ofis projeleri arayın.',
    en: 'Filter new residential, villa and office developments in Türkiye by '
      + 'district, unit type, delivery date, down payment and instalment terms.',
  },
  'int.proje.hakkinda': {
    grup: 'İngilizce', etiket: 'Proje · hakkında başlığı', tip: 'satir',
    tr: 'Proje hakkında', en: 'About this development',
  },
  'int.proje.tipler.baslik': {
    grup: 'İngilizce', etiket: 'Proje · daire tipleri başlığı', tip: 'satir',
    tr: 'Daire tipleri ve fiyatlar', en: 'Unit types and prices',
  },
  'int.proje.kural.pesinat': {
    grup: 'İngilizce', etiket: 'Proje · peşinat notu', tip: 'paragraf',
    tr: 'Peşinat oranı ve vade firmadan firmaya değişiyor.',
    en: 'Down payment and instalment terms vary by developer.',
  },
  'int.proje.kural.tapu': {
    grup: 'İngilizce', etiket: 'Proje · tapu notu', tip: 'paragraf',
    tr: 'İnşaat sürerken tapu kat irtifakı olarak veriliyor; iskân sonrası kat '
      + 'mülkiyetine çevriliyor.',
    en: 'While construction continues the title is issued as “kat irtifakı” '
      + '(construction servitude) and converted to full ownership after occupancy permit.',
  },
  'int.proje.kural.yabanci': {
    grup: 'İngilizce', etiket: 'Proje · yabancı alıcı notu', tip: 'paragraf',
    tr: 'Yabancı alıcılar için tapu işlemleri ve gerekli belgeler firmadan sorulmalı.',
    en: 'Foreign buyers should ask the developer about title deed procedures and required documents.',
  },

  /* ---------------- Kurumsal sayfalar ---------------- */
  'sayfa.sss.baslik': {
    grup: 'Kurumsal sayfalar', etiket: 'SSS başlığı', tip: 'satir',
    tr: 'Sık sorulan sorular', en: 'Frequently asked questions',
  },
  'sayfa.altcta': {
    grup: 'Kurumsal sayfalar', etiket: 'Alt çağrı düğmesi', tip: 'satir',
    tr: 'Projeleri incele', en: 'Browse developments',
  },
} as const satisfies Record<string, MetinTanimi>;

export type MetinAnahtari = keyof typeof METIN_KAYDI;

export const METIN_ANAHTARLARI = Object.keys(METIN_KAYDI) as MetinAnahtari[];

/** Panelde gösterim sırası — kayıttaki ilk görülme sırasını koruyor. */
export const METIN_GRUPLARI: string[] = [
  ...new Set(METIN_ANAHTARLARI.map((a) => (METIN_KAYDI[a] as MetinTanimi).grup)),
];

/**
 * Anahtarın tanımını genişletilmiş tiple döndürür.
 *
 * `as const satisfies` her girdiyi kendi harfi tipine daraltıyor;
 * bu yüzden `METIN_KAYDI[a].ipucu` yalnızca ipucu OLAN girdilerde
 * derleniyor. Panelde hepsi aynı biçimde okunduğu için burada
 * ortak arayüze geri genişletiliyor.
 */
export const metinTanimi = (anahtar: MetinAnahtari): MetinTanimi => METIN_KAYDI[anahtar];

/** Bir anahtarın kod içindeki karşılığı. İngilizcesi yoksa Türkçesi. */
/**
 * Kayıttaki varsayılan metin.
 *
 * KAYITTA KARŞILIĞI OLMAYAN DİL BOŞ DÖNER — Türkçeye düşmez. Düşseydi
 * o dildeki sayfada Türkçe başlık çıkardı: sessiz ve fark edilmesi
 * zor bir bozukluk.
 *
 * `dilKapsami` bu boşluğu sayıyor ve dili yayına hazır saymıyor;
 * sayfa metinleri panelden girilene kadar o dilin ağacı açılmıyor.
 *
 * İlk yazımda yalnızca Rusça elenmişti ve Arapça sessizce Türkçeye
 * düşüyordu — panel Arapçayı "48/48 çevrildi" gösteriyordu. Kontrol
 * artık dil listesine değil, KAYITTA DEĞER OLUP OLMADIĞINA bakıyor.
 */
export function varsayilanMetin(anahtar: MetinAnahtari, dil: Dil): string {
  const t: MetinTanimi = METIN_KAYDI[anahtar];
  if (dil === 'tr') return t.tr;
  if (dil === 'en') return t.en ?? '';
  return '';
}
