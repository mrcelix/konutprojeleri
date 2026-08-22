import { NextResponse } from 'next/server';
import { oneriler } from '@/lib/arama';

/* ============================================================
   Yazarken öneri (autocomplete).

   Ayrı uç nokta olmasının sebebi önbellekleme: öneriler filtreye ve
   tarihe bağlı olmadığı için çok daha uzun süre saklanabiliyor.
   ============================================================ */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (q.trim().length < 2) return NextResponse.json({ oneriler: [] });

  try {
    return NextResponse.json({ oneriler: await oneriler(q) }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (e) {
    console.error('Öneri hatası:', e);
    return NextResponse.json({ oneriler: [] });
  }
}
