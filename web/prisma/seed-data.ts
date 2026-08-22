import { BOLGE_ICERIK } from './seed-icerik';
import type {
  Bolge, DaireTipi, Ozellik, OzellikKey, Proje, ProjeDurumu, ProjeTipi, TapuDurumu,
} from '../lib/types';

/* ============================================================
   SEED KAYNAĞI — uygulama bu dosyayı çalışma anında kullanmaz.
   Yalnızca prisma/seed.ts ve lib/tohum.ts tarafından veritabanını
   doldurmak için okunur. Uygulamanın veri erişimi: lib/queries.ts

   FİRMA VE PROJE ADLARI KURGUSAL. Gerçek bir müteahhit ya da gerçek
   bir projeyi taklit eden tohum verisi, demo ortamdan üretime
   sızdığında o firma adına beyanda bulunmak olurdu. Adlar bilerek
   uydurma; bölgeler ve ulaşım bilgileri gerçek.
   ============================================================ */

const IMG = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=72`;

/* Görsel havuzu — konut projesi bağlamına uygun kareler.
   `plan` grubu kat planı YERİNE GEÇMİYOR: gerçek kat planı firmadan
   gelen teknik çizim. Buradakiler mimari görselleştirme. */
const P = {
  cephe: ['1545324418-cc1a3fa10c00', '1486406146926-c627a92ad1ab', '1497366754035-f200968a6e72',
    '1449844908441-8829872d2607', '1512917774080-9991f1c4c750', '1580587771525-78b9dba3b914'],
  ic: ['1600607687939-ce8a6c25118c', '1600210492486-724fe5c67fb0', '1600566753086-00f18fb6b3ea',
    '1600585154340-be6161a56a0c', '1600047509807-ba8f99d2cdde'],
  sosyal: ['1571003123894-1f0594d2b5d9', '1566073771259-6a8506099945', '1540541338287-41700207dee6'],
  santiye: ['1541888946425-d81bb19240f5', '1503387762-abdf1a8b8bee'],
};

/** Projeye altı görsel: iki cephe, üç iç, bir sosyal tesis. */
const kareler = (n: number) => [
  IMG(P.cephe[n % P.cephe.length]),
  IMG(P.cephe[(n + 3) % P.cephe.length]),
  IMG(P.ic[n % P.ic.length]),
  IMG(P.ic[(n + 2) % P.ic.length]),
  IMG(P.ic[(n + 4) % P.ic.length]),
  IMG(P.sosyal[n % P.sosyal.length]),
];

/* ============================================================
   Özellikler
   ============================================================ */

/**
 * Proje ölçeğindeki olanaklar.
 *
 * DAİRE İÇİ DONANIM BURADA YOK (ankastre, yerden ısıtma daire
 * özelliği gibi görünse de proje geneli kararı olduğu için birkaçı
 * duruyor). Filtre listesi uzadıkça kullanılmaz oluyor; `landing`
 * alanı yalnızca gerçekten aranan ve kendi iniş sayfasını hak eden
 * özelliklere veriliyor.
 */
export const OZELLIKLER: Record<OzellikKey, Ozellik> = {
  /* ---- Güvenlik ve giriş ---- */
  guvenlik: {
    ad: '7/24 güvenlik', ikon: 'shield',
    landing: {
      slug: 'guvenlikli-siteler', baslik: 'Güvenlikli Site Projeleri',
      aciklama: '7/24 güvenlik görevlisi, kontrollü araç girişi ve kamera sistemi bulunan projeler.',
    },
  },
  kamera: { ad: 'Kamera sistemi', ikon: 'cam' },
  kapalisite: {
    ad: 'Kapalı site', ikon: 'kapali',
    landing: {
      slug: 'kapali-site-projeleri', baslik: 'Kapalı Site Projeleri',
      aciklama: 'Dışarıya kapalı, yalnızca sakinlerin ve davetlilerin girebildiği site düzenindeki projeler.',
    },
  },
  akillEv: {
    ad: 'Akıllı ev sistemi', ikon: 'spark',
    landing: {
      slug: 'akilli-ev-projeleri', baslik: 'Akıllı Ev Sistemli Projeler',
      aciklama: 'Aydınlatma, iklimlendirme ve güvenliğin uygulamadan yönetilebildiği akıllı ev altyapılı projeler.',
    },
  },

  /* ---- Otopark ---- */
  kapaliotopark: {
    ad: 'Kapalı otopark', ikon: 'car',
    landing: {
      slug: 'kapali-otoparkli-projeler', baslik: 'Kapalı Otoparklı Projeler',
      aciklama: 'Her bağımsız bölüm için kapalı otopark hakkı tanımlanmış konut ve ofis projeleri.',
    },
  },
  acikotopark: { ad: 'Açık otopark', ikon: 'car' },
  sarj: { ad: 'Elektrikli araç şarjı', ikon: 'flame' },

  /* ---- Sosyal tesis ---- */
  yuzmehavuzu: {
    ad: 'Yüzme havuzu', ikon: 'pool',
    landing: {
      slug: 'havuzlu-projeler', baslik: 'Yüzme Havuzlu Projeler',
      aciklama: 'Site içinde açık yüzme havuzu bulunan konut ve villa projeleri.',
    },
  },
  kapalihavuz: {
    ad: 'Kapalı havuz', ikon: 'droplet',
    landing: {
      slug: 'kapali-havuzlu-projeler', baslik: 'Kapalı Havuzlu Projeler',
      aciklama: 'Yıl boyu kullanılabilen kapalı ve ısıtmalı havuzu olan projeler.',
    },
  },
  fitness: { ad: 'Fitness salonu', ikon: 'spark' },
  sauna: { ad: 'Sauna', ikon: 'steam' },
  spa: { ad: 'SPA', ikon: 'droplet' },
  cocukoyun: {
    ad: 'Çocuk oyun alanı', ikon: 'baby',
    landing: {
      slug: 'cocuk-dostu-projeler', baslik: 'Çocuk Dostu Projeler',
      aciklama: 'Site içinde çocuk oyun alanı, oyun grubu ve güvenli yürüyüş hattı bulunan projeler.',
    },
  },
  basketbol: { ad: 'Basketbol sahası', ikon: 'game' },
  tenis: { ad: 'Tenis kortu', ikon: 'game' },
  kosuparkuru: { ad: 'Koşu parkuru', ikon: 'agac' },
  sosyaltesis: { ad: 'Sosyal tesis', ikon: 'coffee' },

  /* ---- Çevre ve konum ---- */
  peyzaj: { ad: 'Geniş peyzaj alanı', ikon: 'agac' },
  manzara: {
    ad: 'Manzara', ikon: 'manzara',
    landing: {
      slug: 'manzarali-projeler', baslik: 'Manzaralı Projeler',
      aciklama: 'Deniz, orman ya da şehir manzarası olan daire tipleri bulunan projeler.',
    },
  },
  denizemesafe: {
    ad: 'Denize yakın', ikon: 'waves',
    landing: {
      slug: 'denize-yakin-projeler', baslik: 'Denize Yakın Projeler',
      aciklama: 'Sahil hattına yürüme ya da kısa araç mesafesindeki konut projeleri.',
    },
  },
  metroyakin: {
    ad: 'Metroya yakın', ikon: 'pin',
    landing: {
      slug: 'metroya-yakin-projeler', baslik: 'Metroya Yakın Projeler',
      aciklama: 'Metro istasyonuna yürüme mesafesindeki konut ve ofis projeleri.',
    },
  },
  okulyakin: { ad: 'Okula yakın', ikon: 'grid' },
  avmyakin: { ad: 'AVM’ye yakın', ikon: 'magaza' },
  hastaneyakin: { ad: 'Hastaneye yakın', ikon: 'shield' },
  merkez: { ad: 'Merkezi konum', ikon: 'pin' },
  doga: { ad: 'Doğayla iç içe', ikon: 'agac' },

  /* ---- Yapı ---- */
  depremyonetmelik: {
    ad: '2018 deprem yönetmeliği', ikon: 'shield',
    landing: {
      slug: 'deprem-yonetmeligine-uygun-projeler', baslik: '2018 Yönetmeliğine Uygun Projeler',
      aciklama: '2018 Türkiye Bina Deprem Yönetmeliği’ne göre projelendirilmiş yeni yapılar.',
    },
  },
  'jeneratör': { ad: 'Jeneratör', ikon: 'flame' },
  asansor: { ad: 'Asansör', ikon: 'chevU' },
  engelli: { ad: 'Engelli erişimi', ikon: 'access' },
  isiyalitim: { ad: 'Isı yalıtımı', ikon: 'snow' },
  sesyalitim: { ad: 'Ses yalıtımı', ikon: 'perde' },
  yerdenisitma: { ad: 'Yerden ısıtma', ikon: 'flame' },
  dogalgaz: { ad: 'Doğalgaz', ikon: 'flame' },
};

export const LANDING_OZELLIKLER = (Object.entries(OZELLIKLER) as [OzellikKey, Ozellik][])
  .filter(([, o]) => o.landing);

export const ozellikBySlug = (slug: string) =>
  LANDING_OZELLIKLER.find(([, o]) => o.landing!.slug === slug) ?? null;

/* ============================================================
   Bölgeler
   ============================================================ */

export const BOLGELER: Bolge[] = [
  {
    slug: 'atasehir', ad: 'Ataşehir', il: 'İstanbul', lat: 40.9923, lng: 29.1244,
    adet: 0, img: IMG(P.cephe[0]),
    ozet: 'Planlı sokak dokusu ve Finans Merkezi hattıyla İstanbul’un Anadolu yakasındaki '
      + 'en yoğun karma proje bölgesi. Konut ve ofisin aynı parselde buluştuğu projeler burada toplanıyor.',
    icerik: BOLGE_ICERIK.atasehir,
  },
  {
    slug: 'basaksehir', ad: 'Başakşehir', il: 'İstanbul', lat: 41.0931, lng: 28.8022,
    adet: 0, img: IMG(P.cephe[1]),
    ozet: 'Etaplar hâlinde sıfırdan planlanmış, geniş metrekare ve aile kullanımına eğilimli '
      + 'konut arzıyla Avrupa yakasının en büyük gelişim alanlarından.',
    icerik: BOLGE_ICERIK.basaksehir,
  },
  {
    slug: 'kartal', ad: 'Kartal', il: 'İstanbul', lat: 40.8886, lng: 29.1903,
    adet: 0, img: IMG(P.cephe[2]),
    ozet: 'Eski sanayi alanlarının konuta dönüştüğü sahil hattı. Deniz görüşü, metro ve '
      + 'Marmaray bağlantısı ilçenin üç ana çekim gücü.',
    icerik: BOLGE_ICERIK.kartal,
  },
  {
    slug: 'cankaya', ad: 'Çankaya', il: 'Ankara', lat: 39.9082, lng: 32.8597,
    adet: 0, img: IMG(P.cephe[3]),
    ozet: 'Ankara’nın yerleşik merkezi. Boş parsel az olduğu için yeni arz kentsel dönüşümden '
      + 'geliyor; 30–80 birimlik butik projeler yaygın.',
    icerik: BOLGE_ICERIK.cankaya,
  },
  {
    slug: 'bornova', ad: 'Bornova', il: 'İzmir', lat: 38.4696, lng: 27.2172,
    adet: 0, img: IMG(P.cephe[4]),
    ozet: 'İzmir’in akademik merkezi. Üniversite kampüsünün ilçe içinde olması küçük tip '
      + 'arzını ve öğrenci kiracı talebini belirliyor.',
    icerik: BOLGE_ICERIK.bornova,
  },
  {
    slug: 'nilufer', ad: 'Nilüfer', il: 'Bursa', lat: 40.2135, lng: 28.9787,
    adet: 0, img: IMG(P.cephe[5]),
    ozet: 'Bursa’nın planlı gelişmiş ilçesi. Geniş bulvarlar, yüksek yeşil alan oranı ve '
      + 'site ölçeğinde aile odaklı konut arzı.',
    icerik: BOLGE_ICERIK.nilufer,
  },
];

export const bolgeBySlug = (slug: string) => BOLGELER.find((b) => b.slug === slug) ?? null;

/* ============================================================
   Geliştirici firmalar — KURGUSAL
   ============================================================ */

export interface SeedFirma {
  slug: string;
  ad: string;
  ozet: string;
  kurulusYili: number;
  tamamlananProje: number;
  web?: string;
}

export const FIRMALAR: SeedFirma[] = [
  {
    slug: 'meridyen-yapi', ad: 'Meridyen Yapı',
    kurulusYili: 2004, tamamlananProje: 18,
    ozet: 'İstanbul’un iki yakasında konut ve karma projeler geliştiriyor. '
      + 'Portföyünde ağırlıklı olarak orta-üst segment site projeleri var.',
  },
  {
    slug: 'anka-gayrimenkul', ad: 'Anka Gayrimenkul',
    kurulusYili: 1998, tamamlananProje: 31,
    ozet: 'Büyük ölçekli toplu konut projelerinde uzmanlaşmış, üç şehirde teslim '
      + 'gerçekleştirmiş yerleşik bir geliştirici.',
  },
  {
    slug: 'kordon-insaat', ad: 'Kordon İnşaat',
    kurulusYili: 2011, tamamlananProje: 9,
    ozet: 'Sahil hattı ve dönüşüm alanlarında yüksek katlı konut projeleri geliştiriyor. '
      + 'Deniz manzaralı projelerde yoğunlaşmış bir portföy.',
  },
  {
    slug: 'ova-yapi', ad: 'Ova Yapı',
    kurulusYili: 2015, tamamlananProje: 5,
    ozet: 'Kentsel dönüşüm odaklı, düşük birim sayılı butik projeler geliştiriyor. '
      + 'Ankara merkezli.',
  },
  {
    slug: 'ege-hane', ad: 'Ege Hane',
    kurulusYili: 2008, tamamlananProje: 14,
    ozet: 'İzmir ve çevresinde konut projeleri geliştiriyor; öğrenci ve genç profesyonel '
      + 'talebine yönelik kompakt tiplerde yoğunlaşmış.',
  },
  {
    slug: 'yesilova-yapi', ad: 'Yeşilova Yapı',
    kurulusYili: 2001, tamamlananProje: 22,
    ozet: 'Bursa merkezli, planlı gelişim bölgelerinde geniş peyzajlı site projeleri '
      + 'geliştiren yerleşik bir firma.',
  },
];

export const firmaBySlug = (slug: string) => FIRMALAR.find((f) => f.slug === slug) ?? null;

/* ============================================================
   Projeler
   ============================================================ */

export type SeedDaire = Omit<DaireTipi, 'id' | 'katPlani' | 'katPlaniAlt'>;

export type SeedProje =
  Omit<Proje, 'id' | 'fotoAlt' | 'firma' | 'bolge' | 'il' | 'daireTipleri' | 'olcek' | 'odeme'>
  & {
    firmaSlug: string;
    daireTipleri: SeedDaire[];
    olcek: Proje['olcek'];
    odeme: Proje['odeme'];
  };

/** Kısa yazım: daire tipi kurar. */
const d = (
  ad: string, oda: string, brutM2: number, netM2: number,
  /* Fiyat İSTEĞE BAĞLI: tam kat ofis gibi tipler "görüşmeye tabi"
     olarak satılıyor ve uydurma bir rakam yazmak, alıcının ilk
     sorusuna yanlış cevap vermek olurdu. */
  fiyatMin: number | undefined, fiyatMax: number | undefined,
  adet: number, kalan: number, banyo = 1, nitelik?: string,
): SeedDaire => ({ ad, oda, banyo, brutM2, netM2, fiyatMin, fiyatMax, adet, kalan, nitelik });

export const PROJELER: SeedProje[] = [
  {
    slug: 'meridyen-park-atasehir', ad: 'Meridyen Park Ataşehir',
    tip: 'KARMA' as ProjeTipi, durum: 'SATISTA' as ProjeDurumu,
    firmaSlug: 'meridyen-yapi',
    bolgeSlug: 'atasehir', mahalle: 'Barbaros', adres: 'Halk Cad. çevresi',
    lat: 40.9908, lng: 29.1272,
    fiyatMin: 8_400_000, fiyatMax: 26_500_000,
    olcek: { blok: 4, kat: 22, bagimsizBolum: 386, arsaM2: 16_400, insaatM2: 78_000, yesilOran: 58 },
    odeme: {
      pesinat: 30, vade: 48, krediyeUygun: true, takas: false,
      aidat: 4200, tapu: 'KAT_IRTIFAKI' as TapuDurumu,
    },
    baslangic: '2025-03-01', teslim: '2027-12-01', ilerleme: 54,
    ozellik: ['guvenlik', 'kamera', 'kapaliotopark', 'sarj', 'kapalihavuz', 'fitness', 'spa',
      'cocukoyun', 'kosuparkuru', 'peyzaj', 'metroyakin', 'avmyakin', 'akillEv',
      'depremyonetmelik', 'yerdenisitma', 'sesyalitim'],
    daireTipleri: [
      d('1+1 Kompakt', '1+1', 68, 54, 8_400_000, 9_600_000, 96, 12, 1),
      d('2+1 Standart', '2+1', 104, 84, 11_900_000, 13_800_000, 142, 34, 1),
      d('3+1 Geniş', '3+1', 148, 122, 16_400_000, 19_200_000, 108, 41, 2),
      d('4+1 Dubleks', '4+1', 214, 178, 22_800_000, 26_500_000, 32, 9, 3, 'Teraslı dubleks'),
      d('Ofis — Blok D', '1+1', 82, 68, 9_800_000, 12_400_000, 48, 22, 1, 'Bağımsız girişli ofis'),
    ],
    foto: kareler(0),
    ozet: 'Ataşehir Barbaros’ta, Finans Merkezi hattına yürüme mesafesinde dört bloklu karma proje. '
      + 'Konut ve ofis girişleri ayrı; kapalı havuz, SPA ve 58% peyzaj oranıyla planlandı.',
    sec: 'Metroya 6 dk', yeni: false, oneCikan: true,
    yayin: '2025-04-10', guncelleme: '2026-08-02',
  },
  {
    slug: 'anka-vadi-basaksehir', ad: 'Anka Vadi Başakşehir',
    tip: 'KONUT' as ProjeTipi, durum: 'SATISTA' as ProjeDurumu,
    firmaSlug: 'anka-gayrimenkul',
    bolgeSlug: 'basaksehir', mahalle: 'Kayaşehir', adres: undefined,
    lat: 41.1088, lng: 28.7794,
    fiyatMin: 5_200_000, fiyatMax: 14_800_000,
    olcek: { blok: 9, kat: 16, bagimsizBolum: 842, arsaM2: 42_000, insaatM2: 164_000, yesilOran: 66 },
    odeme: {
      pesinat: 25, vade: 60, krediyeUygun: true, takas: true,
      aidat: 2900, tapu: 'KAT_IRTIFAKI' as TapuDurumu,
    },
    baslangic: '2024-09-01', teslim: '2027-06-01', ilerleme: 71,
    ozellik: ['guvenlik', 'kamera', 'kapalisite', 'kapaliotopark', 'yuzmehavuzu', 'kapalihavuz',
      'fitness', 'basketbol', 'cocukoyun', 'kosuparkuru', 'peyzaj', 'metroyakin',
      'okulyakin', 'hastaneyakin', 'depremyonetmelik', 'isiyalitim', 'dogalgaz'],
    daireTipleri: [
      d('2+1', '2+1', 98, 78, 5_200_000, 6_400_000, 186, 52, 1),
      d('3+1', '3+1', 138, 112, 7_400_000, 9_100_000, 324, 118, 2),
      d('4+1', '4+1', 186, 154, 10_200_000, 12_600_000, 248, 96, 2),
      d('4+1 Bahçe Dubleks', '4+1', 232, 196, 12_900_000, 14_800_000, 84, 31, 3, 'Bahçe katı dubleks'),
    ],
    foto: kareler(1),
    ozet: 'Kayaşehir’de dokuz bloklu, 842 bağımsız bölümlü büyük ölçekli konut projesi. '
      + '66% yeşil alan oranı, kapalı ve açık havuz, site içi okul servis noktası bulunuyor.',
    sec: '', yeni: false, oneCikan: true,
    yayin: '2024-10-22', guncelleme: '2026-07-28',
  },
  {
    slug: 'kordon-deniz-kartal', ad: 'Kordon Deniz Kartal',
    tip: 'KONUT' as ProjeTipi, durum: 'SON_DAIRELER' as ProjeDurumu,
    firmaSlug: 'kordon-insaat',
    bolgeSlug: 'kartal', mahalle: 'Kordonboyu', adres: 'Sahil hattı',
    lat: 40.8834, lng: 29.1861,
    fiyatMin: 9_800_000, fiyatMax: 31_000_000,
    olcek: { blok: 2, kat: 32, bagimsizBolum: 268, arsaM2: 9_800, insaatM2: 92_000, yesilOran: 44 },
    odeme: {
      pesinat: 35, vade: 36, krediyeUygun: true, takas: false,
      aidat: 5400, tapu: 'KAT_IRTIFAKI' as TapuDurumu,
    },
    baslangic: '2023-05-01', teslim: '2026-11-01', ilerleme: 92,
    ozellik: ['guvenlik', 'kamera', 'kapalisite', 'kapaliotopark', 'sarj', 'kapalihavuz',
      'fitness', 'sauna', 'spa', 'sosyaltesis', 'manzara', 'denizemesafe',
      'metroyakin', 'avmyakin', 'akillEv', 'depremyonetmelik', 'sesyalitim', 'yerdenisitma'],
    daireTipleri: [
      d('1+1 Deniz Cephe', '1+1', 76, 61, 9_800_000, 11_400_000, 64, 6, 1, 'Deniz cephesi'),
      d('2+1 Deniz Cephe', '2+1', 122, 98, 14_200_000, 17_800_000, 96, 11, 2, 'Deniz cephesi'),
      d('3+1 Panoramik', '3+1', 176, 146, 21_500_000, 25_400_000, 72, 4, 2, 'Yüksek kat'),
      d('4.5+1 Penthouse', '4.5+1', 268, 224, 28_000_000, 31_000_000, 12, 2, 4, 'Çatı katı, teraslı'),
    ],
    foto: kareler(2),
    ozet: 'Kartal Kordonboyu’nda, sahil parkına bitişik iki bloklu yüksek katlı proje. '
      + 'Tüm daire tipleri deniz cepheli; teslimine bir yıldan az kaldı.',
    sec: 'Son 23 daire', yeni: false, oneCikan: true,
    yayin: '2023-06-14', guncelleme: '2026-08-11',
  },
  {
    slug: 'ova-residence-cankaya', ad: 'Ova Residence Çankaya',
    tip: 'KONUT' as ProjeTipi, durum: 'SATISTA' as ProjeDurumu,
    firmaSlug: 'ova-yapi',
    bolgeSlug: 'cankaya', mahalle: 'Çukurambar', adres: undefined,
    lat: 39.9086, lng: 32.8103,
    fiyatMin: 6_900_000, fiyatMax: 18_200_000,
    olcek: { blok: 1, kat: 18, bagimsizBolum: 64, arsaM2: 3_100, insaatM2: 18_400, yesilOran: 38 },
    odeme: {
      pesinat: 40, vade: 24, krediyeUygun: true, takas: true,
      aidat: 3800, tapu: 'KAT_IRTIFAKI' as TapuDurumu,
    },
    baslangic: '2025-06-01', teslim: '2028-03-01', ilerleme: 22,
    ozellik: ['guvenlik', 'kamera', 'kapaliotopark', 'fitness', 'sauna', 'sosyaltesis',
      'merkez', 'metroyakin', 'avmyakin', 'akillEv', 'depremyonetmelik',
      'isiyalitim', 'sesyalitim', 'yerdenisitma', 'jeneratör'],
    daireTipleri: [
      d('2+1', '2+1', 112, 92, 6_900_000, 8_400_000, 24, 15, 1),
      d('3+1', '3+1', 158, 132, 10_400_000, 12_800_000, 28, 19, 2),
      d('4+1 Dubleks', '4+1', 236, 198, 15_600_000, 18_200_000, 12, 8, 3, 'Üst kat dubleks'),
    ],
    foto: kareler(3),
    ozet: 'Çukurambar’da tek bloklu, 64 bağımsız bölümlü butik proje. Düşük yoğunluk, '
      + 'daireye tahsisli kapalı otopark ve akıllı ev altyapısı sunuyor.',
    sec: 'Butik proje · 64 daire', yeni: true, oneCikan: false,
    yayin: '2025-07-08', guncelleme: '2026-08-15',
  },
  {
    slug: 'ege-hane-kampus-bornova', ad: 'Ege Hane Kampüs Bornova',
    tip: 'KONUT' as ProjeTipi, durum: 'SATISTA' as ProjeDurumu,
    firmaSlug: 'ege-hane',
    bolgeSlug: 'bornova', mahalle: 'Kazımdirik', adres: undefined,
    lat: 38.4623, lng: 27.2119,
    fiyatMin: 3_100_000, fiyatMax: 7_400_000,
    olcek: { blok: 3, kat: 12, bagimsizBolum: 214, arsaM2: 7_600, insaatM2: 28_500, yesilOran: 41 },
    odeme: {
      pesinat: 20, vade: 48, krediyeUygun: true, takas: false,
      aidat: 1900, tapu: 'KAT_IRTIFAKI' as TapuDurumu,
    },
    baslangic: '2025-01-15', teslim: '2027-09-01', ilerleme: 38,
    ozellik: ['guvenlik', 'kamera', 'kapaliotopark', 'fitness', 'cocukoyun', 'peyzaj',
      'metroyakin', 'okulyakin', 'merkez', 'depremyonetmelik', 'isiyalitim', 'dogalgaz'],
    daireTipleri: [
      d('Stüdyo', 'stüdyo', 46, 38, 3_100_000, 3_600_000, 62, 28, 1),
      d('1+1', '1+1', 64, 52, 4_000_000, 4_700_000, 84, 39, 1),
      d('2+1', '2+1', 96, 78, 5_400_000, 6_300_000, 52, 24, 1),
      d('3+1', '3+1', 132, 108, 6_600_000, 7_400_000, 16, 7, 2),
    ],
    foto: kareler(4),
    ozet: 'Bornova Kazımdirik’te, üniversite kampüsüne ve metro istasyonuna yürüme mesafesinde '
      + 'üç bloklu proje. Stüdyodan 3+1’e uzanan geniş tip yelpazesi bulunuyor.',
    sec: 'Kampüse 8 dk', yeni: true, oneCikan: false,
    yayin: '2025-02-20', guncelleme: '2026-08-09',
  },
  {
    slug: 'yesilova-bahce-nilufer', ad: 'Yeşilova Bahçe Nilüfer',
    tip: 'VILLA' as ProjeTipi, durum: 'SATISTA' as ProjeDurumu,
    firmaSlug: 'yesilova-yapi',
    bolgeSlug: 'nilufer', mahalle: 'İhsaniye', adres: undefined,
    lat: 40.2189, lng: 28.9634,
    fiyatMin: 14_500_000, fiyatMax: 24_000_000,
    olcek: { blok: undefined, kat: 3, bagimsizBolum: 48, arsaM2: 28_000, insaatM2: 19_200, yesilOran: 72 },
    odeme: {
      pesinat: 35, vade: 36, krediyeUygun: true, takas: true,
      aidat: 4600, tapu: 'KAT_IRTIFAKI' as TapuDurumu,
    },
    baslangic: '2024-11-01', teslim: '2027-04-01', ilerleme: 61,
    ozellik: ['guvenlik', 'kamera', 'kapalisite', 'kapaliotopark', 'yuzmehavuzu', 'tenis',
      'basketbol', 'cocukoyun', 'kosuparkuru', 'peyzaj', 'doga', 'okulyakin',
      'depremyonetmelik', 'isiyalitim', 'yerdenisitma', 'akillEv'],
    daireTipleri: [
      d('4+1 Bahçe Villa', '4+1', 268, 224, 14_500_000, 17_200_000, 28, 11, 3, 'Özel bahçeli'),
      d('5+1 Havuzlu Villa', '5+1', 342, 288, 19_800_000, 24_000_000, 20, 9, 4, 'Özel havuzlu'),
    ],
    foto: kareler(5),
    ozet: 'Nilüfer İhsaniye’de 28 dönüm arazi üzerinde 48 müstakil villadan oluşan proje. '
      + '72% yeşil alan oranı, tenis kortu ve site içi koşu parkuru bulunuyor.',
    sec: '', yeni: false, oneCikan: true,
    yayin: '2024-12-05', guncelleme: '2026-07-19',
  },
  {
    slug: 'meridyen-ofis-atasehir', ad: 'Meridyen Ofis Ataşehir',
    tip: 'OFIS' as ProjeTipi, durum: 'YAKINDA' as ProjeDurumu,
    firmaSlug: 'meridyen-yapi',
    bolgeSlug: 'atasehir', mahalle: 'Küçükbakkalköy', adres: undefined,
    lat: 40.9856, lng: 29.1188,
    fiyatMin: 12_000_000, fiyatMax: undefined,
    olcek: { blok: 1, kat: 26, bagimsizBolum: 148, arsaM2: 5_200, insaatM2: 46_000, yesilOran: 24 },
    odeme: {
      pesinat: 40, vade: 24, krediyeUygun: true, takas: false,
      aidat: undefined, tapu: 'ARSA_TAPULU' as TapuDurumu,
    },
    baslangic: undefined, teslim: '2029-06-01', ilerleme: 0,
    ozellik: ['guvenlik', 'kamera', 'kapaliotopark', 'sarj', 'sosyaltesis', 'merkez',
      'metroyakin', 'avmyakin', 'akillEv', 'depremyonetmelik', 'jeneratör', 'engelli'],
    daireTipleri: [
      d('Ofis 90 m²', '1+1', 90, 76, 12_000_000, undefined, 64, 64, 1, 'Açık plan'),
      d('Ofis 160 m²', '2+1', 160, 134, 20_400_000, undefined, 52, 52, 2, 'Bölünebilir'),
      d('Kat Ofisi 420 m²', '4+1', 420, 356, undefined, undefined, 12, 12, 4, 'Tam kat'),
    ],
    foto: kareler(0),
    ozet: 'Küçükbakkalköy’de 26 katlı ofis projesi. Lansman öncesi ön talep toplanıyor; '
      + 'açık plan ve bölünebilir kat ofisi seçenekleri sunulacak.',
    sec: 'Lansman öncesi', yeni: true, oneCikan: false,
    yayin: '2026-06-01', guncelleme: '2026-08-18',
  },
  {
    slug: 'anka-terrace-kartal', ad: 'Anka Terrace Kartal',
    tip: 'KONUT' as ProjeTipi, durum: 'TESLIM_EDILDI' as ProjeDurumu,
    firmaSlug: 'anka-gayrimenkul',
    bolgeSlug: 'kartal', mahalle: 'Cevizli', adres: undefined,
    lat: 40.9021, lng: 29.1704,
    fiyatMin: 7_600_000, fiyatMax: 16_400_000,
    olcek: { blok: 5, kat: 18, bagimsizBolum: 412, arsaM2: 18_600, insaatM2: 86_000, yesilOran: 52 },
    odeme: {
      pesinat: 30, vade: 0, krediyeUygun: true, takas: false,
      aidat: 3600, tapu: 'KAT_MULKIYETI' as TapuDurumu,
    },
    baslangic: '2021-02-01', teslim: '2025-08-01', ilerleme: 100,
    ozellik: ['guvenlik', 'kamera', 'kapalisite', 'kapaliotopark', 'yuzmehavuzu', 'fitness',
      'cocukoyun', 'peyzaj', 'manzara', 'metroyakin', 'depremyonetmelik', 'isiyalitim'],
    daireTipleri: [
      d('2+1', '2+1', 106, 86, 7_600_000, 9_200_000, 164, 0, 1),
      d('3+1', '3+1', 152, 126, 11_200_000, 13_400_000, 186, 0, 2),
      d('4+1', '4+1', 204, 172, 14_600_000, 16_400_000, 62, 0, 3),
    ],
    foto: kareler(1),
    ozet: 'Cevizli’de beş bloklu, 412 bağımsız bölümlü proje. 2025 Ağustos’ta teslim edildi; '
      + 'kat mülkiyeti tapuları düzenlendi.',
    sec: 'Teslim edildi', yeni: false, oneCikan: false,
    yayin: '2021-03-11', guncelleme: '2026-01-14',
  },
];

export const projeBySlug = (slug: string) => PROJELER.find((p) => p.slug === slug) ?? null;
export const projelerByBolge = (bolgeSlug: string) =>
  PROJELER.filter((p) => p.bolgeSlug === bolgeSlug);
export const projelerByOzellik = (bolgeSlug: string, key: OzellikKey) =>
  PROJELER.filter((p) => p.bolgeSlug === bolgeSlug && p.ozellik.includes(key));
