import { NextResponse } from 'next/server';
import { canliOzet } from '@/lib/canli';

/* ============================================================
   Sosyal kanıt sayıları (canlı ziyaretçi + haftalık talep).

   Ayrı uç nokta, çünkü sayı sayfa boyunca TAZELENİYOR: proje sayfası
   sunucuda üretilip önbelleğe alınıyor ve içine gömülen "şu anda 6
   kişi" beş dakika sonra yalan olurdu. Rozet ilk sayıyı sunucudan
   alıyor, sonra buradan periyodik tazeliyor.

   Yanıt otuz saniye önbellekli: sayının kendisi beş dakikalık bir
   pencereden geliyor, saniyelik tazelik bir şey katmıyor ama her
   ziyaretçi için iki sorgu demek.
   ============================================================ */

export const dynamic = 'force-dynamic';

export async function GET(istek: Request) {
  const p = new URL(istek.url).searchParams;
  const yol = p.get('yol') ?? '';
  const proje = p.get('proje') ?? undefined;

  /* Yol kendi sitemizden gelmeli: dışarıdan gelen rastgele bir yol
     tabloyu tarar ve uca ucuz bir tarama aracı olurdu. */
  if (!yol.startsWith('/') || yol.length > 200) {
    return NextResponse.json({ canli: null, talep: null });
  }

  try {
    const ozet = await canliOzet(yol, proje);
    return NextResponse.json(ozet, {
      headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
    });
  } catch (e) {
    console.error('Canlı özet hatası:', e);
    /* Sayı gelmezse rozet kendini gizliyor — hata gösterecek bir yer
       değil, süs bir bileşen. */
    return NextResponse.json({ canli: null, talep: null });
  }
}
