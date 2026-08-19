/**
 * Filtre modeli.
 *
 * URL TEK DOĞRULUK KAYNAĞIDIR. Filtre durumu bileşen state'inde değil
 * adreste tutulur; böylece filtre paylaşılabilir, geri tuşu çalışır ve
 * arama motoru filtreli sayfaları görebilir.
 *
 * Her filtre çipi gerçek bir <a href>; JavaScript yalnızca sayfayı
 * yeniden yüklemeden günceller.
 */

export type Filtre = {
  il?: string;
  ilce?: string;
  mahalle?: string;
  daireTipi?: string[];
  kategori?: string;
  minFiyat?: number;
  maxFiyat?: number;
  minM2?: number;
  maxM2?: number;
  teslimYili?: number[];
  santiyeDurumu?: string[];
  maxAidat?: number;
  maxAylik?: number;
  maxPesinat?: number;
  ozellik?: string[];
  sicil?: string;
  siralama?: Siralama;
  sayfa?: number;
};

export type Siralama =
  | 'onerilen'
  | 'fiyat-artan'
  | 'fiyat-azalan'
  | 'm2-artan'
  | 'teslim-yakin'
  | 'yeni';

export const SIRALAMALAR: { deger: Siralama; ad: string }[] = [
  { deger: 'onerilen', ad: 'Önerilen' },
  { deger: 'fiyat-artan', ad: 'Fiyat: düşükten yükseğe' },
  { deger: 'fiyat-azalan', ad: 'Fiyat: yüksekten düşüğe' },
  { deger: 'm2-artan', ad: 'm² birim fiyatı: artan' },
  { deger: 'teslim-yakin', ad: 'Teslim tarihi: en yakın' },
  { deger: 'yeni', ad: 'Yeni eklenenler' },
];

export const SAYFA_BOYUTU = 20;

/** Özellik filtreleri — jsonb anahtarı → görünen ad */
export const OZELLIKLER: Record<string, string> = {
  kapali_otopark: 'Kapalı otopark',
  acik_havuz: 'Açık yüzme havuzu',
  kapali_havuz: 'Kapalı yüzme havuzu',
  spor_salonu: 'Spor salonu',
  guvenlik_247: '7/24 güvenlik',
  cocuk_oyun: 'Çocuk oyun alanı',
  deniz_manzarasi: 'Deniz manzarası',
  ankastre: 'Ankastre mutfak',
  akilli_ev: 'Akıllı ev sistemi',
  yerden_isitma: 'Yerden ısıtma',
  ebeveyn_banyo: 'Ebeveyn banyosu',
  deprem_2018: '2018 deprem yönetmeliği',
  sismik_izolator: 'Sismik izolatör',
  site_ici_okul: 'Site içinde okul',
};

export const DAIRE_TIPLERI = ['1+0', '1+1', '2+1', '3+1', '4+1', '5+1'];
export const SANTIYE_DURUMLARI: Record<string, string> = {
  lansman: 'Lansman / ön satış',
  kaba: 'Kaba inşaat',
  ince: 'İnce işler',
  tamamlandi: 'Tamamlandı',
};

type Ham = Record<string, string | string[] | undefined>;

function sayi(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function liste(v: string | string[] | undefined): string[] | undefined {
  if (!v) return undefined;
  const s = Array.isArray(v) ? v.join(',') : v;
  const parts = s.split(',').map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

/** searchParams → Filtre */
export function filtreCoz(
  konum: { il?: string; ilce?: string; mahalle?: string; daireTipi?: string; kategori?: string },
  q: Ham
): Filtre {
  const siralamaHam = Array.isArray(q.sirala) ? q.sirala[0] : q.sirala;
  const siralama = SIRALAMALAR.find((s) => s.deger === siralamaHam)?.deger ?? 'onerilen';

  return {
    il: konum.il,
    ilce: konum.ilce,
    mahalle: konum.mahalle,
    kategori: konum.kategori,
    daireTipi: konum.daireTipi ? [konum.daireTipi] : liste(q.tip),
    minFiyat: sayi(q.minf),
    maxFiyat: sayi(q.maxf),
    minM2: sayi(q.minm2),
    maxM2: sayi(q.maxm2),
    teslimYili: liste(q.teslim)?.map(Number).filter(Number.isFinite),
    santiyeDurumu: liste(q.santiye),
    maxAidat: sayi(q.aidat),
    maxAylik: sayi(q.aylik),
    maxPesinat: sayi(q.pesinat),
    ozellik: liste(q.ozellik),
    sicil: Array.isArray(q.sicil) ? q.sicil[0] : q.sicil,
    siralama,
    sayfa: Math.max(1, sayi(q.sayfa) ?? 1),
  };
}

/** Filtre → sorgu dizesi. Konum bilgisi yola girer, buraya değil. */
export function filtreYaz(f: Filtre): string {
  const p = new URLSearchParams();
  if (f.daireTipi?.length) p.set('tip', f.daireTipi.join(','));
  if (f.minFiyat) p.set('minf', String(f.minFiyat));
  if (f.maxFiyat) p.set('maxf', String(f.maxFiyat));
  if (f.minM2) p.set('minm2', String(f.minM2));
  if (f.maxM2) p.set('maxm2', String(f.maxM2));
  if (f.teslimYili?.length) p.set('teslim', f.teslimYili.join(','));
  if (f.santiyeDurumu?.length) p.set('santiye', f.santiyeDurumu.join(','));
  if (f.maxAidat) p.set('aidat', String(f.maxAidat));
  if (f.maxAylik) p.set('aylik', String(f.maxAylik));
  if (f.maxPesinat) p.set('pesinat', String(f.maxPesinat));
  if (f.ozellik?.length) p.set('ozellik', f.ozellik.join(','));
  if (f.sicil) p.set('sicil', f.sicil);
  if (f.siralama && f.siralama !== 'onerilen') p.set('sirala', f.siralama);
  if (f.sayfa && f.sayfa > 1) p.set('sayfa', String(f.sayfa));
  const s = p.toString();
  return s ? `?${s}` : '';
}

/**
 * Çoklu seçim alanları.
 *
 * Alanın DİZİ OLUP OLMADIĞI türden bilinir, mevcut değerinden değil.
 * Önceden `Array.isArray(mevcut)` bakılıyordu; alan henüz seçilmemişse
 * mevcut undefined olduğu için dal yanlış tarafa düşüyor ve
 * `daireTipi` bir diziye değil düz metne ayarlanıyordu. Sonrasında
 * filtreYaz() `.join()` çağırıp patlıyordu — ilk kez seçilen her
 * çoklu filtre çipinde.
 */
const DIZI_ALANLARI = new Set<keyof Filtre>([
  'daireTipi', 'teslimYili', 'santiyeDurumu', 'ozellik',
]);

/** Bir değeri açıp kapatan bağlantı üretir — filtre çipleri bunu kullanır. */
export function degistir(
  taban: string,
  f: Filtre,
  alan: keyof Filtre,
  deger: string | number
): string {
  const kopya: Filtre = { ...f, sayfa: 1 };
  const mevcut = kopya[alan];

  if (DIZI_ALANLARI.has(alan)) {
    const arr = (Array.isArray(mevcut) ? mevcut : []) as (string | number)[];
    const yeni = arr.includes(deger) ? arr.filter((x) => x !== deger) : [...arr, deger];
    (kopya[alan] as unknown) = yeni.length ? yeni : undefined;
  } else {
    (kopya[alan] as unknown) = mevcut === deger ? undefined : deger;
  }

  return taban + filtreYaz(kopya);
}

/** Tek bir filtreyi kaldıran bağlantı — aktif filtre çiplerindeki × için. */
export function kaldir(taban: string, f: Filtre, alan: keyof Filtre, deger?: string | number): string {
  const kopya: Filtre = { ...f, sayfa: 1 };
  const mevcut = kopya[alan];
  if (DIZI_ALANLARI.has(alan) && deger != null) {
    const arr = (Array.isArray(mevcut) ? mevcut : []) as (string | number)[];
    const yeni = arr.filter((x) => x !== deger);
    (kopya[alan] as unknown) = yeni.length ? yeni : undefined;
  } else {
    (kopya[alan] as unknown) = undefined;
  }
  return taban + filtreYaz(kopya);
}

/** Kaç filtre seçili — başlıkta ve "temizle" düğmesinde gösterilir. */
export function seciliSayisi(f: Filtre): number {
  let n = 0;
  if (f.daireTipi?.length) n += f.daireTipi.length;
  if (f.minFiyat || f.maxFiyat) n += 1;
  if (f.minM2 || f.maxM2) n += 1;
  if (f.teslimYili?.length) n += f.teslimYili.length;
  if (f.santiyeDurumu?.length) n += f.santiyeDurumu.length;
  if (f.maxAidat) n += 1;
  if (f.maxAylik) n += 1;
  if (f.maxPesinat) n += 1;
  if (f.ozellik?.length) n += f.ozellik.length;
  if (f.sicil) n += 1;
  return n;
}
