/* ============================================================
   Görsel kaynağı soyutlaması.

   Şu an görseller Unsplash'ten geliyor — örnek amaçlı. Üretimde
   kendi CDN'imizde olmaları gerekiyor:

   · Unsplash'in kullanım koşulları ticari ürün görseli olarak
     kullanımı kapsamıyor; villa fotoğrafları zaten bizim ekibimizin
     çektiği gerçek fotoğraflar olacak.
   · Harici alan adına bağımlılık LCP'yi bize bağlı olmayan bir
     sunucunun hızına bırakıyor.
   · `next/image` optimizasyonu harici kaynakta her istekte yeniden
     boyutlandırma yapıyor; kendi CDN'imizde dönüşüm kenarda önbellekli.

   Bu dosya tek değiştirme noktası: `GORSEL_CDN` tanımlanınca tüm
   görseller oradan servis ediliyor, kod değişmiyor.
   ============================================================ */

export type CdnSaglayici = 'yok' | 'cloudflare' | 'bunny' | 'imgix';

const CDN = process.env.NEXT_PUBLIC_GORSEL_CDN?.trim() ?? '';
const SAGLAYICI = (process.env.NEXT_PUBLIC_GORSEL_SAGLAYICI ?? 'yok') as CdnSaglayici;

export interface GorselSecenek {
  genislik?: number;
  kalite?: number;
  /** Kırpma davranışı; varsayılan kapsayacak şekilde ölçekle */
  kirp?: boolean;
}

/**
 * Görsel URL'ini üretir.
 *
 * CDN tanımlı değilse kaynak URL olduğu gibi dönüyor — geliştirme ve
 * mevcut Unsplash görselleri çalışmaya devam ediyor.
 */
export function gorsel(kaynak: string, s: GorselSecenek = {}): string {
  if (!CDN || !kaynak) return kaynak;

  // Zaten CDN'den geliyorsa dokunma
  if (kaynak.startsWith(CDN)) return kaynak;

  const { genislik, kalite = 78, kirp = true } = s;
  const yol = kaynak.replace(/^https?:\/\/[^/]+\//, '');
  const taban = CDN.replace(/\/$/, '');

  switch (SAGLAYICI) {
    case 'cloudflare': {
      // /cdn-cgi/image/width=800,quality=78,fit=cover/<kaynak>
      const p = [
        genislik ? `width=${genislik}` : '',
        `quality=${kalite}`,
        kirp ? 'fit=cover' : 'fit=scale-down',
        'format=auto',
      ].filter(Boolean).join(',');
      return `${taban}/cdn-cgi/image/${p}/${yol}`;
    }
    case 'bunny': {
      const p = new URLSearchParams();
      if (genislik) p.set('width', String(genislik));
      p.set('quality', String(kalite));
      if (kirp) p.set('aspect_ratio', '3:2');
      return `${taban}/${yol}?${p}`;
    }
    case 'imgix': {
      const p = new URLSearchParams({ auto: 'format,compress', q: String(kalite) });
      if (genislik) p.set('w', String(genislik));
      if (kirp) p.set('fit', 'crop');
      return `${taban}/${yol}?${p}`;
    }
    default:
      return `${taban}/${yol}`;
  }
}

/**
 * `next/image` için `sizes` değeri.
 *
 * Yanlış `sizes` en sık görülen LCP hatası: tarayıcı gereğinden büyük
 * görsel indiriyor. Kullandığımız üç yerleşim için hazır değerler.
 */
export const BOYUTLAR = {
  /** Liste kartı — 3 sütun geniş ekranda, 1 sütun mobilde */
  kart: '(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 33vw',
  /** Villa detay galerisi — tam genişlik */
  galeri: '(max-width: 1080px) 100vw, 60vw',
  /** Bölge kartı */
  bolge: '(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 25vw',
  /** Hero */
  hero: '100vw',
} as const;

/** CDN yapılandırılmış mı — panelde uyarı göstermek için. */
export const cdnAktif = () => CDN.length > 0;
