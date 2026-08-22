/* ============================================================
   Görünüm modelleri.

   Prisma'nın ürettiği tipler VERİTABANI şeklini taşıyor; buradakiler
   SAYFANIN gördüğü şekli. İkisini ayrı tutmak, sütun eklemenin
   otomatik olarak her bileşene sızmasını engelliyor — ve sayfaların
   ihtiyaç duymadığı alanları (depo anahtarı, denetim damgaları)
   istemciye hiç göndermiyoruz.
   ============================================================ */

/** Proje ölçeğindeki olanaklar. Daire içi donanım DEĞİL site geneli. */
export type OzellikKey =
  /* Güvenlik ve giriş */
  | 'guvenlik' | 'kamera' | 'kapalisite' | 'akillEv'
  /* Otopark */
  | 'kapaliotopark' | 'acikotopark' | 'sarj'
  /* Sosyal tesis */
  | 'yuzmehavuzu' | 'kapalihavuz' | 'fitness' | 'sauna' | 'spa'
  | 'cocukoyun' | 'basketbol' | 'tenis' | 'kosuparkuru' | 'sosyaltesis'
  /* Çevre ve konum */
  | 'peyzaj' | 'manzara' | 'denizemesafe' | 'metroyakin' | 'okulyakin'
  | 'avmyakin' | 'hastaneyakin' | 'merkez' | 'doga'
  /* Yapı */
  | 'depremyonetmelik' | 'jeneratör' | 'asansor' | 'engelli'
  | 'isiyalitim' | 'sesyalitim' | 'yerdenisitma' | 'dogalgaz';

export type IkonAdi =
  | 'search' | 'pin' | 'star' | 'users' | 'bed' | 'bath' | 'ruler' | 'waves'
  | 'flame' | 'shield' | 'droplet' | 'baby' | 'paw' | 'heart' | 'steam'
  | 'access' | 'wifi' | 'snow' | 'grill' | 'car' | 'wash' | 'dish' | 'tv'
  | 'coffee' | 'game' | 'cam' | 'cal' | 'x' | 'chevL' | 'chevR' | 'chevD' | 'chevU'
  | 'arrowR' | 'sliders' | 'sun' | 'moon' | 'check' | 'plus' | 'minus' | 'refresh'
  | 'share' | 'grid' | 'map' | 'scale' | 'key' | 'spark' | 'clock' | 'home'
  | 'filter' | 'pool' | 'mic'
  | 'kapali' | 'manzara' | 'agac' | 'magaza' | 'perde'
  /* Proje alanına özgü */
  | 'building' | 'crane' | 'plan' | 'deed' | 'wallet' | 'percent' | 'phone';

export interface Ozellik {
  ad: string;
  ikon: IkonAdi;
  /** Bölge × özellik iniş sayfası üretilecek mi? (SEO landing) */
  landing?: { slug: string; baslik: string; aciklama: string };
}

/** Bölgeye özgü editöryel içerik — her bölge için elle yazılır, şablon kullanılmaz. */
export interface BolgeIcerik {
  /** Giriş paragrafları (2–3 adet) */
  giris: string[];
  /** Mahalle / mevki kırılımı — uzun kuyruk sorguların ana kaynağı */
  mevkiler: { ad: string; metin: string }[];
  /** Yatırım ve bölge notu — "burada neden proje çıkıyor" */
  yatirim: { baslik: string; not: string }[];
  /** Mesafe tablosu */
  ulasim: { yol: string; sure: string }[];
  /** Çevrede ne var: okul, hastane, AVM, metro */
  cevre: { ad: string; metin: string }[];
  /** Yerel ipuçları */
  ipuclari: string[];
  /** Bölgeye özgü SSS — görünür içerikle FAQPage schema'sı birebir eşleşir */
  sss: { s: string; c: string }[];
}

export interface Bolge {
  slug: string;
  ad: string;
  il: string;
  /** Yaklaşık merkez — schema.org geo ve harita için */
  lat: number;
  lng: number;
  /** Yayındaki proje sayısı — iniş sayfası bunları listeliyor. */
  adet: number;
  img: string;
  ozet: string;
  icerik: BolgeIcerik;
}

/** Projeyi geliştiren firma — kartta ve proje sayfasında görünen özeti. */
export interface Firma {
  slug: string;
  ad: string;
  logo?: string;
  /** Kuruluş yılı; boşsa rozet basılmıyor */
  yil?: number;
  /** TESLİM EDİLMİŞ proje sayısı — vaat değil geçmiş */
  tamamlanan: number;
  ozet: string;
}

export type ProjeTipi = 'KONUT' | 'VILLA' | 'OFIS' | 'KARMA';

export type ProjeDurumu =
  | 'YAKINDA' | 'SATISTA' | 'SON_DAIRELER' | 'TUKENDI' | 'TESLIM_EDILDI';

export type TapuDurumu =
  | 'KAT_MULKIYETI' | 'KAT_IRTIFAKI' | 'ARSA_TAPULU' | 'HISSELI' | 'TAHSIS';

/**
 * Bağımsız bölüm tipi — projenin gerçek satış birimi.
 *
 * `oda` SAYI DEĞİL METİN: "1+1", "4.5+1", "stüdyo" hepsi geçerli ve
 * Türkiye'de yarım oda aranan bir kategori. Sayıya indirgemek
 * "4.5+1"i ya 4'e ya 5'e yuvarlamak demekti.
 */
export interface DaireTipi {
  id: string;
  ad: string;
  oda: string;
  banyo: number;
  brutM2: number;
  netM2?: number;
  nitelik?: string;
  fiyatMin?: number;
  fiyatMax?: number;
  adet?: number;
  /** Satılmadan kalan; 0 → "tükendi" rozeti */
  kalan?: number;
  katPlani?: string;
  katPlaniAlt?: string;
}

/**
 * Ölçek bilgileri.
 *
 * Hepsi isteğe bağlı: lansman öncesi projelerde blok ve kat sayısı
 * belli olsa da arsa alanı açıklanmamış olabiliyor. Eksik alanı
 * sıfırla doldurmak, "bilinmiyor" ile "yok"u aynı şeye çeviriyordu.
 */
export interface ProjeOlcek {
  blok?: number;
  kat?: number;
  bagimsizBolum?: number;
  arsaM2?: number;
  insaatM2?: number;
  /** Yeşil alan oranı, yüzde */
  yesilOran?: number;
}

/** Ödeme koşulları — alıcının ikinci sorusu. */
export interface ProjeOdeme {
  /** Peşinat oranı, yüzde. 0 → bilgi verilmiyor. */
  pesinat: number;
  /** Vade, ay. 0 → firmadan taksit yok. */
  vade: number;
  krediyeUygun: boolean;
  takas: boolean;
  /** Aylık aidat (TL), teslim sonrası tahmini */
  aidat?: number;
  tapu?: TapuDurumu;
}

export interface Proje {
  id: string;
  slug: string;
  ad: string;
  tip: ProjeTipi;
  durum: ProjeDurumu;

  bolgeSlug: string;
  bolge: string;
  il: string;
  mahalle: string;
  adres?: string;
  lat: number;
  lng: number;

  /** Fiyat ARALIĞI (TL); `fiyatMax` yoksa "…'den başlayan" basılıyor */
  fiyatMin: number;
  fiyatMax?: number;

  olcek: ProjeOlcek;
  odeme: ProjeOdeme;

  /** ISO gün (YYYY-AA-GG); boşsa "teslim tarihi açıklanmadı" */
  baslangic?: string;
  teslim?: string;
  /** İnşaat ilerlemesi, yüzde */
  ilerleme: number;

  ozellik: OzellikKey[];
  daireTipleri: DaireTipi[];

  foto: string[];
  /** Her fotoğrafın alt metni — erişilebilirlik ve görsel araması için */
  fotoAlt: string[];

  ozet: string;
  sec: string;
  yeni: boolean;
  oneCikan: boolean;
  firma: Firma;

  yayin: string;
  guncelleme: string;
}
