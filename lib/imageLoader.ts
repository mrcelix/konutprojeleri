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
