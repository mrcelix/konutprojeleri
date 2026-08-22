import { indexNowAnahtari } from '@/lib/indexnow';

/**
 * IndexNow anahtar dosyası.
 *
 * Varsayılan sözleşme `/{anahtar}.txt` ama Next dinamik segmenti
 * `[anahtar].txt` biçiminde ayrıştırmıyor (segment adının tamamı
 * dinamik olmalı). IndexNow spesifikasyonu tam da bunun için
 * `keyLocation` alanını tanımlıyor: anahtar dosyası istenen yerde
 * durabilir, adresi istekle birlikte bildiriliyor.
 *
 * Anahtar ortam değişkeninde tutuluyor, depoda değil.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const anahtar = indexNowAnahtari();
  if (!anahtar) return new Response('Bulunamadı', { status: 404 });

  return new Response(anahtar, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}
