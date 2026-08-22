import { readFile } from 'node:fs/promises';
import { ANAHTAR_KALIBI } from '@/lib/depo';
import { yerelTamYol } from '@/lib/depo/yerel';

/* ============================================================
   Yerel depodaki görselleri servis eder — YALNIZCA GELİŞTİRME.

   Üretimde `DEPO_SURUCU=supabase` ve görseller doğrudan depodan
   geliyor; bu rota hiç çağrılmıyor.

   İçerik tipi SABİT `image/webp`. İstemciden gelen hiçbir şey
   başlığa yansımıyor: aksi hâlde depoya konmuş bir dosya HTML
   olarak yorumlanabilir ve kendi alan adımızda betik çalıştırabilirdi.
   ============================================================ */

export const runtime = 'nodejs';

export async function GET(
  _istek: Request,
  { params }: { params: Promise<{ yol: string[] }> },
) {
  const { yol } = await params;
  const anahtar = yol.join('/');

  // Kalıp `..`, kodlanmış ayraç ve webp dışı uzantıyı eliyor
  if (!ANAHTAR_KALIBI.test(anahtar)) return new Response('Bulunamadı', { status: 404 });

  let veri: Buffer;
  try {
    veri = await readFile(yerelTamYol(anahtar));
  } catch {
    return new Response('Bulunamadı', { status: 404 });
  }

  return new Response(new Uint8Array(veri), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      // Anahtar rastgele ve içerik değişmiyor; uzun önbellek güvenli
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
