import type { BolgeIcerik } from './types';

/* ============================================================
   Bölge oluşturma kuralları.

   Bölge, iniş sayfası ağacının kökü: `/projeler/<slug>` ve
   altındaki her özellik kombinasyonu buradan üretiliyor. Slug
   sonradan değiştirilemiyor (yayındaki adresi kırardı), bu yüzden
   girişte sıkı denetleniyor.

   Saf: girdisi form değerleri, çıktısı hata metni. Sunucu eylemi ve
   testler aynı kuralı kullanıyor.
   ============================================================ */

export interface BolgeGirdisi {
  slug: string;
  ad: string;
  il: string;
  lat: number;
  lng: number;
  img: string;
  ozet: string;
}

/** Dinamik `[sayfa]` ve iniş rotalarıyla çakışan adresler. */
const AYRILMIS = new Set([
  'arama', 'bolgeler', 'proje', 'projeler', 'firma', 'firmalar', 'rehber',
  'giris', 'panel', 'yonetim', 'api', 'en', 'ru', 'ar', 'teklif', 'alarm',
]);

export function bolgeDenetle(g: BolgeGirdisi): string | null {
  const slug = g.slug.trim();
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
    return 'Adres yalnızca küçük harf, rakam ve tire içerebilir (2–40 karakter).';
  }
  if (AYRILMIS.has(slug)) return `"${slug}" sistem tarafından kullanılıyor.`;
  if (g.ad.trim().length < 2) return 'Bölge adı en az 2 karakter olmalı.';
  if (g.il.trim().length < 2) return 'İl adı gerekli.';

  /* Koordinat, harita aramasının ve "yakınımdaki villalar" sorgusunun
     temeli; sıfır kalırsa villalar Gine Körfezi'nde görünür. */
  if (!Number.isFinite(g.lat) || g.lat < 35 || g.lat > 43) {
    return 'Enlem Türkiye sınırları içinde olmalı (35–43).';
  }
  if (!Number.isFinite(g.lng) || g.lng < 25 || g.lng > 45) {
    return 'Boylam Türkiye sınırları içinde olmalı (25–45).';
  }

  if (!/^https?:\/\/\S+$/.test(g.img.trim())) return 'Bölge görseli tam bir https adresi olmalı.';
  const ozet = g.ozet.trim();
  if (ozet.length < 40) return `Bölge özeti en az 40 karakter olmalı (şu an ${ozet.length}).`;
  if (ozet.length > 400) return 'Bölge özeti en fazla 400 karakter olabilir.';
  return null;
}

/**
 * Yeni bölgenin editöryel içerik iskeleti.
 *
 * Boş bir JSON yazılamaz: iniş sayfası `icerik.mevkiler.map(...)`
 * diyor ve alan yoksa sayfa 500 veriyor. İskelet, bölge içerik
 * ekranından doldurulana kadar sayfayı ayakta tutuyor.
 */
export const BOS_ICERIK: Omit<BolgeIcerik, 'sss'> = {
  giris: [],
  mevkiler: [],
  yatirim: [],
  ulasim: [],
  cevre: [],
  ipuclari: [],
};

/**
 * Eksik alanları tamamlar.
 *
 * Okuma tarafında da uygulanıyor: elle düzenlenmiş ya da eski biçimde
 * kalmış bir JSON, herkese açık bir sayfayı düşürmemeli.
 */
export function icerikTamamla(ham: unknown): Omit<BolgeIcerik, 'sss'> {
  const o = (ham && typeof ham === 'object' ? ham : {}) as Record<string, unknown>;
  const dizi = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  return {
    giris: dizi<string>(o.giris),
    mevkiler: dizi<{ ad: string; metin: string }>(o.mevkiler),
    yatirim: dizi<{ baslik: string; not: string }>(o.yatirim),
    ulasim: dizi<{ yol: string; sure: string }>(o.ulasim),
    cevre: dizi<{ ad: string; metin: string }>(o.cevre),
    ipuclari: dizi<string>(o.ipuclari),
  };
}
