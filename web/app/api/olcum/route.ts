import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { istekIp, sinirKontrol } from '@/lib/hiz-sinir';

/* ============================================================
   Core Web Vitals toplama noktası.

   Search Console'daki alan verisi 28 GÜNLÜK ORTALAMA — bir regresyonu
   haftalar sonra görüyorsunuz. Kendi ölçümümüz aynı gün gösteriyor.
   SEO en önemli artımız olduğu için bu ölçüm bir lüks değil.

   KVKK: çerez yok, kullanıcı kimliği yok, IP SAKLANMIYOR (yalnızca hız
   sınırı için anlık kullanılıyor). Sorgu dizesi atılıyor — arama
   terimleri kişisel veri taşıyabilir. Toplanan tek şey "hangi sayfa ne
   kadar hızlı".
   ============================================================ */

export const dynamic = 'force-dynamic';

const METRIKLER = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
const DERECELER = new Set(['good', 'needs-improvement', 'poor']);

/** Ölçüm başına makul üst sınır — bozuk istemci veriyi şişirmesin. */
const AZAMI_DEGER: Record<string, number> = {
  LCP: 60_000, INP: 60_000, FCP: 60_000, TTFB: 60_000, CLS: 10,
};

export async function POST(request: Request) {
  // Sahte veri gönderimini sınırla — ölçüm tablosu şişirilebilir bir yüzey
  const sinir = await sinirKontrol('arama', `olcum:${await istekIp()}`);
  if (!sinir.izin) return new NextResponse(null, { status: 429 });

  let govde: unknown;
  try {
    govde = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const o = govde as { yol?: string; metrik?: string; deger?: number; derece?: string; cihaz?: string };

  if (!o.metrik || !METRIKLER.has(o.metrik)) return new NextResponse(null, { status: 400 });
  if (typeof o.deger !== 'number' || !Number.isFinite(o.deger) || o.deger < 0) {
    return new NextResponse(null, { status: 400 });
  }
  if (o.deger > (AZAMI_DEGER[o.metrik] ?? 60_000)) return new NextResponse(null, { status: 400 });
  if (!o.derece || !DERECELER.has(o.derece)) return new NextResponse(null, { status: 400 });

  // Sorgu dizesi ve fragment atılıyor
  const yol = (o.yol ?? '/').split('?')[0].split('#')[0].slice(0, 200);
  const cihaz = o.cihaz === 'mobil' ? 'mobil' : 'masaustu';

  try {
    await prisma.olcumCWV.create({
      data: { yol, metrik: o.metrik, deger: o.deger, derece: o.derece, cihaz },
    });
  } catch (e) {
    // Ölçüm yazılamaması kullanıcıyı etkilememeli
    console.error('Ölçüm kaydedilemedi:', e);
  }

  // 204: gövde yok, tarayıcı sendBeacon bunu bekliyor
  return new NextResponse(null, { status: 204 });
}
