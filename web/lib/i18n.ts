import { site } from './site';

/* ============================================================
   Çok dillilik.

   YAKLAŞIM: ayrı rota ağacı, `[dil]` parametresi değil.

   Sebep SEO. İngilizce arayan kullanıcı "konut projeleri" yazmıyor,
   "new developments" yazıyor. `/[dil]/projeler/atasehir` yapısı
   Türkçe slug'ı İngilizce sayfada da taşırdı ve o sayfanın anahtar
   kelime uyumunu düşürürdü. Bunun yerine:

     /projeler/atasehir          → Türkçe
     /en/developments/atasehir   → İngilizce

   Maliyeti: İngilizce sayfa dosyaları ayrı. Kazancı: her dilin kendi
   URL'i kendi diline uygun ve kanonik/hreflang ilişkisi net.

   HREFLANG KURALI: yalnızca GERÇEKTEN karşılığı olan sayfalarda
   yayınlanıyor. Karşılığı olmayan sayfaya hreflang koymak Google'ın
   "alternatif sayfa bulunamadı" hatası vermesine ve iki sayfanın da
   zayıflamasına yol açıyor. `cevirisiVar` bayrağı bunu kontrol ediyor.
   ============================================================ */

export type Dil = 'tr' | 'en' | 'ru' | 'ar';

/**
 * ROTA AĞACI OLAN diller. Gezinme, dil değiştirici ve site haritası
 * bunu kullanıyor.
 *
 * `TUM_DILLER` ile aynı değil ve olmamalı: içerik girilebilen bir dil
 * ile sayfa üretilen bir dil ayrı şeyler. Çevrilmemiş dilde sayfa
 * yayınlamak (Faz 13 kararı) hreflang hatası üretiyor ve iki dili
 * birden zayıflatıyor.
 */
/**
 * Rota ağacı olan diller — sayfa DOSYALARI var mı.
 *
 * TEK KAYNAK. Bir dilin `/ru/...` altında sayfası olmadan gezinmede
 * görünmesi, tıklayanı 404'e götürür. Rusça sözlük ve yol eşlemesi
 * hazır; ağaç açıldığında burası `true` olacak ve gezinme, hreflang,
 * site haritası, dil değiştirici hep birden açılacak.
 *
 * Önceden bu bilgi hem burada hem `DILLER` dizisinde duruyordu; ikisi
 * ayrı ayrı düzenlenebildiği için biri açıkken diğeri kapalı
 * kalabiliyordu. `DILLER` artık buradan TÜRETİLİYOR.
 */
export const ROTA_AGACI: Record<Dil, boolean> = {
  tr: true, en: true, ru: false, ar: false,
};

/** İçerik girilebilen diller — çeviri paneli bunu kullanıyor. */
export const TUM_DILLER: Dil[] = ['tr', 'en', 'ru', 'ar'];

/** Rota ağacı olan diller — `ROTA_AGACI`'dan türetiliyor. */
export const DILLER: Dil[] = TUM_DILLER.filter((d) => ROTA_AGACI[d]);

/**
 * Rota ağacı olan diller — ARAYÜZ sözlüğü bu tipe bağlı.
 *
 * İçerik çevirisiyle karıştırılmamalı. Proje özeti bir veri; "Proje
 * ara" düğmesinin yazısı ise uygulamanın parçası ve o dilde sayfa
 * üretilmeden bir işe yaramıyor. Boş bir Rusça sözlük tanımlamak,
 * yarısı Türkçe bir arayüz üretirdi.
 */
export type RotaDili = Extract<Dil, 'tr' | 'en' | 'ru'>;

export const VARSAYILAN_DIL: Dil = 'tr';

export const DIL_ETIKET: Record<Dil, string> = {
  tr: 'Türkçe', en: 'English', ru: 'Русский', ar: 'العربية',
};
export const DIL_KODU: Record<Dil, string> = {
  tr: 'tr-TR', en: 'en-GB', ru: 'ru-RU', ar: 'ar-SA',
};
export const OG_LOCALE: Record<Dil, string> = {
  tr: 'tr_TR', en: 'en_GB', ru: 'ru_RU', ar: 'ar_AR',
};

/**
 * Yazı yönü.
 *
 * Arapça sağdan sola. Yön yalnızca `dir` özniteliği değil: yerleşim
 * mantıksal özelliklere (`margin-inline-start` gibi) çevrilmeden
 * arayüz aynalanmıyor. Bu yüzden AR'ın rota ağacı henüz açılmadı —
 * çeviri girilebiliyor, sayfa üretilmiyor.
 */
export const DIL_YON: Record<Dil, 'ltr' | 'rtl'> = {
  tr: 'ltr', en: 'ltr', ru: 'ltr', ar: 'rtl',
};

/**
 * Yol eşlemesi.
 *
 * Türkçe yol → İngilizce yol. Dinamik parçalar (slug) korunuyor;
 * bölge, proje ve firma slug'ları çevrilmiyor çünkü özel adlar
 * çevrilmez (Ataşehir, Meridyen Park) ve URL değişikliği bağlantı
 * değerini böler.
 */
const YOL_ESLEME: Record<Dil, Record<string, string>> = {
  tr: {},
  en: {
    '/': '/en',
    '/bolgeler': '/en/regions',
    '/arama': '/en/search',
    '/nasil-calisir': '/en/how-it-works',
    '/sikca-sorulanlar': '/en/faq',
    '/hakkimizda': '/en/about',
    '/iletisim': '/en/contact',
  },
  /* Rusça yollar ŞİMDİDEN yazıldı ama rota ağacı yok — `ROTA_AGACI`
     false olduğu sürece bu eşlemeler kullanılmıyor. Burada durmalarının
     sebebi, ağaç açıldığında yol adlarının tek yerden gelmesi:
     "arenda-villy" hem sayfada hem hreflang'de hem site haritasında
     aynı olmalı. */
  ru: {
    '/': '/ru',
    '/bolgeler': '/ru/regiony',
    '/arama': '/ru/poisk',
    '/nasil-calisir': '/ru/kak-eto-rabotaet',
    '/sikca-sorulanlar': '/ru/voprosy',
    '/hakkimizda': '/ru/o-nas',
    '/iletisim': '/ru/kontakty',
  },
  ar: {},
};

/** Dinamik yol kökleri — dile göre. */
const KOK: Record<Dil, { bolge: string; proje: string; firma: string } | null> = {
  tr: { bolge: '/projeler', proje: '/proje', firma: '/firma' },
  en: { bolge: '/en/developments', proje: '/en/project', firma: '/en/developer' },
  ru: { bolge: '/ru/novostroyki', proje: '/ru/proekt', firma: '/ru/zastroyshchik' },
  ar: null,
};

/**
 * Henüz İngilizcesi YAZILMAMIŞ sayfalar.
 *
 * Faz 13'te kurumsal sayfalar ve arama yazıldı; liste şimdilik boş.
 * Yeni bir Türkçe sayfa eklenip İngilizcesi geciktiğinde buraya
 * yazılmalı ve `/en/...` adresi next.config.ts'te Türkçesine
 * yönlendirilmeli — hreflang basılmadan. Yönlendirilen bir adresi
 * alternatif dil olarak bildirmek Google'da "alternatif sayfa
 * yönlendirme" hatası üretiyor.
 */
export const YONLENDIRILEN_EN: Record<string, string> = {};

const TERS_ESLEME: Record<string, string> = Object.fromEntries(
  Object.values(YOL_ESLEME).flatMap((m) => Object.entries(m).map(([tr, ceviri]) => [ceviri, tr])),
);

/**
 * Türkçe yolun başka bir dildeki karşılığı. Karşılığı yoksa null.
 *
 * `ROTA_AGACI` kontrolü BURADA: sayfası olmayan bir dile yol üretmek,
 * hreflang'i 404'e bağlamak demek.
 */
export function dilYolu(trYol: string, dil: Dil): string | null {
  if (dil === VARSAYILAN_DIL) return trYol;
  if (!ROTA_AGACI[dil]) return null;

  const esleme = YOL_ESLEME[dil];
  if (esleme[trYol]) return esleme[trYol];

  const kok = KOK[dil];
  if (!kok) return null;

  const bolge = /^\/projeler\/([^/]+)$/.exec(trYol);
  if (bolge) return `${kok.bolge}/${bolge[1]}`;

  const proje = /^\/proje\/([^/]+)$/.exec(trYol);
  if (proje) return `${kok.proje}/${proje[1]}`;

  const firma = /^\/firma\/([^/]+)$/.exec(trYol);
  if (firma) return `${kok.firma}/${firma[1]}`;

  // Uzun kuyruk iniş sayfaları (bölge × özellik): özellik slug'ları iki
  // dilde FARKLI ("kapali-otoparkli-projeler" ↔ "projects-with-parking"),
  // eşleme veritabanından gelmeli. Bu fonksiyon senkron olduğu için
  // burada çözemiyoruz; o sayfalar hreflang'i kendi
  // generateMetadata'sında üretiyor (bkz. app/projeler/[bolge]/[ozellik]).
  return null;
}

/** Geriye dönük ad — İngilizce yol. */
export const ingilizceYol = (trYol: string): string | null => dilYolu(trYol, 'en');

/** Çevrilmiş yolun Türkçe karşılığı. */
export function turkceYol(cevrilmisYol: string): string | null {
  if (TERS_ESLEME[cevrilmisYol]) return TERS_ESLEME[cevrilmisYol];

  for (const [dil, kok] of Object.entries(KOK) as [Dil, typeof KOK[Dil]][]) {
    if (dil === VARSAYILAN_DIL || !kok) continue;
    const bolge = new RegExp(`^${kok.bolge}/([^/]+)$`).exec(cevrilmisYol);
    if (bolge) return `/projeler/${bolge[1]}`;
    const proje = new RegExp(`^${kok.proje}/([^/]+)$`).exec(cevrilmisYol);
    if (proje) return `/proje/${proje[1]}`;
    const firma = new RegExp(`^${kok.firma}/([^/]+)$`).exec(cevrilmisYol);
    if (firma) return `/firma/${firma[1]}`;
  }
  return null;
}

/* ---------------- Sözlük ---------------- */

export interface Sozluk {
  // Gezinme
  kesfet: string; projeler: string; bolgeler: string; firmaOl: string;
  girisYap: string; anaSayfa: string; arama: string;
  // Arama ve liste
  projeAra: string; sonuc: string; sonucYok: string; filtreleriTemizle: string;
  tumFiltreler: string; krediyeUygun: string; siralama: string;
  onerilen: string; ucuzdan: string; pahalidan: string; enYakinTeslim: string;
  enYeni: string; ilerlemeyeGore: string;
  // Proje
  baslangicFiyati: string; fiyattan: string; odaSayisi: string; brutM2: string; netM2: string;
  banyo: string; teslim: string; ilerleme: string; daireTipleri: string; kalanDaire: string;
  olanaklar: string; konum: string; firma: string; karsilastir: string; favori: string;
  // Talep
  bilgiAl: string; randevuAl: string; katalogIste: string; fiyatListesi: string;
  pesinat: string; vade: string; aidat: string; tapuDurumu: string;
  adSoyad: string; telefon: string; eposta: string;
  // Genel
  detayGor: string; tumunuGor: string; dahaFazla: string; kapat: string;
  yukleniyor: string; hata: string; proje: string; bolge: string;
  // Altbilgi
  kurumsal: string; yardim: string; haklar: string;
}

const TR: Sozluk = {
  kesfet: 'Keşfet', projeler: 'Projeler', bolgeler: 'Bölgeler', firmaOl: 'Projenizi yayınlayın',
  girisYap: 'Giriş yap', anaSayfa: 'Ana sayfa', arama: 'Arama',
  projeAra: 'Bölge, proje adı veya firma ara…', sonuc: 'proje', sonucYok: 'Proje bulunamadı',
  filtreleriTemizle: 'Filtreleri temizle', tumFiltreler: 'Tüm filtreler',
  krediyeUygun: 'Krediye uygun', siralama: 'Sıralama',
  onerilen: 'Önerilen sıralama', ucuzdan: 'Fiyat: düşükten yükseğe',
  pahalidan: 'Fiyat: yüksekten düşüğe', enYakinTeslim: 'Teslimi en yakın',
  enYeni: 'En yeni eklenenler', ilerlemeyeGore: 'İnşaatı en ilerlemiş',
  baslangicFiyati: 'Başlangıç fiyatı', fiyattan: '’den başlayan', odaSayisi: 'oda',
  brutM2: 'brüt m²', netM2: 'net m²', banyo: 'banyo',
  teslim: 'Teslim', ilerleme: 'İnşaat ilerlemesi', daireTipleri: 'Daire tipleri',
  kalanDaire: 'kalan daire',
  olanaklar: 'Proje özellikleri', konum: 'Konum', firma: 'Geliştirici firma',
  karsilastir: 'Karşılaştır', favori: 'Favori',
  bilgiAl: 'Bilgi al', randevuAl: 'Randevu al', katalogIste: 'Katalog iste',
  fiyatListesi: 'Fiyat listesi iste',
  pesinat: 'Peşinat', vade: 'Vade', aidat: 'Aidat', tapuDurumu: 'Tapu durumu',
  adSoyad: 'Ad soyad', telefon: 'Telefon', eposta: 'E-posta',
  detayGor: 'Detayları gör', tumunuGor: 'Tümünü gör', dahaFazla: 'Daha fazla',
  kapat: 'Kapat', yukleniyor: 'Yükleniyor…', hata: 'Bir sorun oldu',
  proje: 'proje', bolge: 'bölge',
  kurumsal: 'Kurumsal', yardim: 'Yardım', haklar: 'Tüm hakları saklıdır.',
};

const EN: Sozluk = {
  kesfet: 'Discover', projeler: 'Developments', bolgeler: 'Regions',
  firmaOl: 'List your development',
  girisYap: 'Sign in', anaSayfa: 'Home', arama: 'Search',
  projeAra: 'Search a district, development or developer…',
  sonuc: 'developments', sonucYok: 'No developments found',
  filtreleriTemizle: 'Clear filters', tumFiltreler: 'All filters',
  krediyeUygun: 'Mortgage eligible', siralama: 'Sort',
  onerilen: 'Recommended', ucuzdan: 'Price: low to high',
  pahalidan: 'Price: high to low', enYakinTeslim: 'Earliest delivery',
  enYeni: 'Newest', ilerlemeyeGore: 'Most advanced construction',
  baslangicFiyati: 'Starting price', fiyattan: ' and up', odaSayisi: 'rooms',
  brutM2: 'gross m²', netM2: 'net m²', banyo: 'bathrooms',
  teslim: 'Delivery', ilerleme: 'Construction progress', daireTipleri: 'Unit types',
  kalanDaire: 'units left',
  olanaklar: 'Amenities', konum: 'Location', firma: 'Developer',
  karsilastir: 'Compare', favori: 'Save',
  bilgiAl: 'Request information', randevuAl: 'Book a viewing',
  katalogIste: 'Request brochure', fiyatListesi: 'Request price list',
  pesinat: 'Down payment', vade: 'Instalments', aidat: 'Service charge',
  tapuDurumu: 'Title status',
  adSoyad: 'Full name', telefon: 'Phone', eposta: 'Email',
  detayGor: 'View details', tumunuGor: 'View all', dahaFazla: 'More',
  kapat: 'Close', yukleniyor: 'Loading…', hata: 'Something went wrong',
  proje: 'development', bolge: 'district',
  kurumsal: 'Company', yardim: 'Help', haklar: 'All rights reserved.',
};

/**
 * Rusça arayüz sözlüğü.
 *
 * ANA DİLİ RUSÇA OLAN BİRİ GÖZDEN GEÇİRMELİ. Bunlar kısa arayüz
 * etiketleri — proje açıklaması gibi vaat taşıyan metin değil — ama
 * yine de denetlenmemiş çeviri. Fiyat ve ödeme koşulu metinleri
 * çeviri panelinden insan eliyle giriliyor.
 */
const RU: Sozluk = {
  kesfet: 'Обзор', projeler: 'Новостройки', bolgeler: 'Районы',
  firmaOl: 'Разместить проект',
  girisYap: 'Войти', anaSayfa: 'Главная', arama: 'Поиск',
  projeAra: 'Район, название проекта или застройщик…',
  sonuc: 'проектов', sonucYok: 'Проекты не найдены',
  filtreleriTemizle: 'Сбросить фильтры', tumFiltreler: 'Все фильтры',
  krediyeUygun: 'Ипотека доступна', siralama: 'Сортировка',
  onerilen: 'Рекомендуемые', ucuzdan: 'Цена: по возрастанию',
  pahalidan: 'Цена: по убыванию', enYakinTeslim: 'Ближайшая сдача',
  enYeni: 'Новые', ilerlemeyeGore: 'Наибольшая готовность',
  baslangicFiyati: 'Цена от', fiyattan: ' и выше', odaSayisi: 'комнат',
  brutM2: 'общая м²', netM2: 'жилая м²', banyo: 'ванных',
  teslim: 'Сдача', ilerleme: 'Готовность', daireTipleri: 'Планировки',
  kalanDaire: 'квартир осталось',
  olanaklar: 'Инфраструктура', konum: 'Расположение', firma: 'Застройщик',
  karsilastir: 'Сравнить', favori: 'В избранное',
  bilgiAl: 'Получить информацию', randevuAl: 'Записаться на просмотр',
  katalogIste: 'Запросить каталог', fiyatListesi: 'Запросить прайс-лист',
  pesinat: 'Первый взнос', vade: 'Рассрочка', aidat: 'Обслуживание',
  tapuDurumu: 'Статус ТАПУ',
  adSoyad: 'Имя и фамилия', telefon: 'Телефон', eposta: 'Эл. почта',
  detayGor: 'Подробнее', tumunuGor: 'Показать все', dahaFazla: 'Ещё',
  kapat: 'Закрыть', yukleniyor: 'Загрузка…', hata: 'Произошла ошибка',
  proje: 'проект', bolge: 'район',
  kurumsal: 'Компания', yardim: 'Помощь', haklar: 'Все права защищены.',
};

const SOZLUKLER: Record<RotaDili, Sozluk> = { tr: TR, en: EN, ru: RU };

export const sozluk = (dil: RotaDili): Sozluk => SOZLUKLER[dil];

/* ---------------- Biçimlendirme ---------------- */

/**
 * Para birimi.
 *
 * İngilizce sayfada da FİYATLAR TL. Dönüştürme yapmıyoruz: kur her gün
 * değişiyor, gösterdiğimiz tutarla tahsil ettiğimiz tutar farklı olursa
 * alıcı haklı olarak güvenmiyor. Bunun yerine para birimi açıkça
 * yazılıyor ve İngilizce sayfada "TRY" kısaltması ekleniyor.
 */
export function paraBirimi(tutar: number, dil: Dil): string {
  const s = new Intl.NumberFormat(DIL_KODU[dil], {
    style: 'currency', currency: 'TRY', maximumFractionDigits: 0,
  }).format(tutar);
  return s;
}

export function tarihBicim(d: Date, dil: Dil): string {
  return new Intl.DateTimeFormat(DIL_KODU[dil], {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(d);
}

/* ---------------- hreflang ---------------- */

export interface DilAlternatifleri {
  canonical: string;
  languages: Record<string, string>;
}

/**
 * Bir Türkçe yol için hreflang kümesi üretir.
 *
 * `x-default` Türkçe sayfayı gösteriyor: hedef pazar Türkiye ve
 * trafiğin çoğunluğu Türkçe. Dili belirlenemeyen kullanıcı oraya düşmeli.
 *
 * Karşılığı olmayan sayfada languages BOŞ dönüyor — tek yönlü hreflang
 * Google tarafından yok sayılıyor ve Search Console'da hata üretiyor.
 */
export function dilAlternatifleri(trYol: string): DilAlternatifleri | null {
  const en = ingilizceYol(trYol);
  if (!en) return null;
  return {
    canonical: new URL(trYol, site.url).toString(),
    languages: {
      'tr-TR': new URL(trYol, site.url).toString(),
      'en-GB': new URL(en, site.url).toString(),
      'x-default': new URL(trYol, site.url).toString(),
    },
  };
}

/** İngilizce sayfadan bakınca aynı küme. */
export function dilAlternatifleriEn(enYol: string): DilAlternatifleri | null {
  const tr = turkceYol(enYol);
  if (!tr) return null;
  return {
    canonical: new URL(enYol, site.url).toString(),
    languages: {
      'tr-TR': new URL(tr, site.url).toString(),
      'en-GB': new URL(enYol, site.url).toString(),
      'x-default': new URL(tr, site.url).toString(),
    },
  };
}
