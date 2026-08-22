import 'server-only';
import { getBolgeler, getLandingOzellikler } from './queries';
import type { MegaTanim } from '@/components/MegaMenu';
import { menuYapisi, type DuzBaglanti, type MenuYapisi } from './menu-kayit';

/* ============================================================
   Mega menü içeriği.

   Kategoriler ve bölgeler VERİDEN geliyor: panelde elle yazılmış bir
   liste tutmak, panelden yeni bir bölge eklendiğinde menünün eski
   kalması demekti. Gruplama burada duruyor çünkü hangi özelliğin
   "güvenlik", hangisinin "sosyal tesis" sorusuna düştüğü veriden
   çıkmıyor — editoryal bir karar.

   Sunucu tarafı: `queries` önbellekli ve `server-only`. Menü düzeni
   layout'ta üretilip başlığa prop olarak geçiyor; başlık istemci
   bileşeni olduğu için veri katmanını kendisi çağıramıyor.
   ============================================================ */

/** Kategori sütunları — özellik anahtarına göre gruplanıyor */
const GRUP: Record<string, string[]> = {
  'Güvenlik ve site': ['guvenlikli-siteler', 'kapali-site-projeleri',
    'akilli-ev-projeleri', 'kapali-otoparkli-projeler'],
  'Sosyal tesis': ['havuzlu-projeler', 'kapali-havuzlu-projeler',
    'cocuk-dostu-projeler'],
  'Konum ve yapı': ['metroya-yakin-projeler', 'denize-yakin-projeler',
    'manzarali-projeler', 'deprem-yonetmeligine-uygun-projeler'],
};

/** Menünün alt şeridinde çıkan kısayollar */
const POPULER = ['guvenlikli-siteler', 'metroya-yakin-projeler',
  'havuzlu-projeler', 'deprem-yonetmeligine-uygun-projeler', 'kapali-site-projeleri'];

const kisalt = (b: string) => b.replace(' Projeleri', '').replace(' Projeler', '');

/* Koddaki varsayılan düz bağlantılar — menü tablosu boşken kullanılıyor. */
/* Başlıkta yalnızca ARAMAYA ve FİRMALARA giden yol duruyor. Rehber ve
   İletişim altbilgiye taşındı: başlık satırı talep formuna giden yolun
   kendisi, blog ve iletişim oraya ait değil. İkisi de panelden geri
   eklenebilir. */
const VARSAYILAN_DUZ: DuzBaglanti[] = [
  { ad: 'Projeler', yol: '/arama', yeniSekme: false },
  /* Firmalar AYRI bir başlık: konut alıcısının önemli bir kısmı
     müteahhit adıyla arıyor ve o kitleyi proje aramasının içine
     gömülmüş bir filtreye yollamak, aradığını hiç bulduramıyordu. */
  { ad: 'Firmalar', yol: '/firmalar', yeniSekme: false },
];

/**
 * Başlık menüsü.
 *
 * ÖNCE panelden yönetilen tabloya bakılıyor; tablo boşsa koddaki
 * varsayılana düşülüyor. Menüsüz bir başlık, gezinmesi olmayan bir
 * site demek — üretim veritabanı boş kaldığında (Faz 62) tam olarak
 * bu riski gördük.
 */
export async function baslikMenusu(): Promise<MenuYapisi> {
  const panelden = await menuYapisi('BASLIK', 'TR');
  if (panelden) return panelden;
  return { duz: VARSAYILAN_DUZ, mega: await menuTanimlari() };
}

export async function menuTanimlari(): Promise<MegaTanim[]> {
  const [ozellikler, bolgeler] = await Promise.all([getLandingOzellikler(), getBolgeler()]);
  const ozBySlug = new Map(ozellikler.map((o) => [o.slug, o]));

  /* Kategori bağlantıları en büyük bölge üzerinden kuruluyor: bölge ×
     özellik iniş sayfaları bölgesiz üretilmiyor, en çok projesi olan
     bölge kategorinin varsayılan vitrini oluyor. */
  const enBuyukBolge = [...bolgeler].sort((a, b) => b.adet - a.adet)[0];
  const katYol = (slug: string) => `/projeler/${enBuyukBolge.slug}/${slug}`;

  const sutunlar = Object.entries(GRUP).map(([baslik, slugler]) => ({
    baslik,
    baglantilar: slugler
      .map((s) => ozBySlug.get(s))
      .filter((o): o is NonNullable<typeof o> => !!o)
      .map((o) => ({ ad: kisalt(o.baslik), yol: katYol(o.slug), ikon: o.ikon })),
  })).filter((s) => s.baglantilar.length > 0);

  /* "Konum ve yapı" sütununa en büyük üç bölge de ekleniyor: özellik
     ve bölge kullanıcı için aynı soruya cevap — "nerede, neye
     yakın". */
  const konum = sutunlar.find((s) => s.baslik === 'Konum ve yapı');
  if (konum) {
    konum.baglantilar.push(
      ...[...bolgeler].sort((a, b) => b.adet - a.adet).slice(0, 3)
        .map((b) => ({ ad: b.ad, yol: `/projeler/${b.slug}`, ikon: 'pin' as const, not: `${b.adet} proje` })),
    );
  }

  const kategoriler: MegaTanim = {
    ad: 'Kategoriler',
    yol: '/arama',
    sutunlar,
    tanitim: {
      baslik: 'Aradığınız projeyi bulun',
      metin: 'Oda sayısı, teslim tarihi, peşinat oranı ve krediye uygunluk — alım kararını belirleyen filtrelerle arayın.',
      dugme: 'Projeleri incele',
      yol: '/arama',
    },
    populerBaslik: 'En çok tercih edilenler',
    populer: POPULER
      .map((s) => ozBySlug.get(s))
      .filter((o): o is NonNullable<typeof o> => !!o)
      .map((o) => ({ ad: kisalt(o.baslik), yol: katYol(o.slug), ikon: o.ikon })),
  };

  const iller = [...new Set(bolgeler.map((b) => b.il))];
  const bolgeMenusu: MegaTanim = {
    ad: 'Bölgeler',
    yol: '/bolgeler',
    sutunlar: iller.slice(0, 3).map((il) => ({
      baslik: il,
      baglantilar: bolgeler.filter((b) => b.il === il).map((b) => ({
        ad: b.ad, yol: `/projeler/${b.slug}`, ikon: 'pin' as const, not: `${b.adet} proje`,
      })),
    })),
    tanitim: {
      baslik: 'Yeni arzın çıktığı ilçeler',
      metin: 'İstanbul’dan Bursa’ya, kentsel dönüşümün ve planlı gelişimin yoğunlaştığı bölgeler.',
      dugme: 'Tüm bölgeler',
      yol: '/bolgeler',
    },
    populerBaslik: 'En çok aranan bölgeler',
    populer: [...bolgeler].sort((a, b) => b.adet - a.adet).slice(0, 5)
      .map((b) => ({ ad: b.ad, yol: `/projeler/${b.slug}`, ikon: 'pin' as const })),
  };

  return [kategoriler, bolgeMenusu];
}
