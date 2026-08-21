'use client';

/**
 * Next <Image> için özel loader.
 *
 * Görseller Vercel'in görsel optimizasyonundan GEÇMEZ — kaynak görsel başına
 * ücretlendirilir ve bu ölçekte pahalıdır. Bunun yerine R2'nin önündeki
 * Cloudflare Images kullanılır; varyantlar kenarda üretilir.
 *
 * Orijinal dosya asla doğrudan servis edilmez.
 */

const CDN = process.env.NEXT_PUBLIC_CDN_URL ?? 'https://cdn.konutprojeleri.com';

type LoaderArgs = { src: string; width: number; quality?: number };

export default function imageLoader({ src, width, quality }: LoaderArgs): string {
  /* DIŞ ADRESLER OLDUĞU GİBİ GEÇER.
     Loader `custom` olduğunda Next HER src'yi buraya veriyor —
     tam adresler dahil. Anahtar muamelesi görüp CDN yoluna
     eklenirlerse ortaya `cdn.konutprojeleri.com/.../https://...`
     gibi bir adres çıkıyor ve bütün fotoğraflar kırık geliyor.

     Unsplash kendi dönüştürücüsünü sorgu dizesinde taşıyor; genişlik
     ve kaliteyi ona bildirip olduğu gibi bırakıyoruz. */
  if (/^https?:\/\//.test(src)) {
    try {
      const u = new URL(src);
      if (u.hostname === 'images.unsplash.com') {
        u.searchParams.set('w', String(width));
        u.searchParams.set('q', String(quality ?? 72));
        u.searchParams.set('auto', 'format');
        u.searchParams.set('fit', 'crop');
      }
      return u.toString();
    } catch {
      return src;
    }
  }

  const key = src.replace(/^\/+/, '');
  const params = [
    `width=${width}`,
    `quality=${quality ?? 72}`,
    'format=auto', // AVIF > WebP > JPEG, tarayıcıya göre
    'fit=cover',
  ].join(',');

  return `${CDN}/cdn-cgi/image/${params}/${key}`;
}

/** Tasarım sisteminde tanımlı varyant genişlikleri. */
export const VARYANT_GENISLIKLERI = [320, 640, 1280, 2400] as const;
