import { NextResponse, type NextRequest } from 'next/server';
import { sinirKontrol } from '@/lib/hiz-sinir';
import { olayYaz, ziyaretYaz } from '@/lib/iz';

/* ============================================================
   Ziyaret ve olay toplama ucu.

   İKİ KAYNAKTAN besleniyor:

   1. MIDDLEWARE (sunucu) — her sayfa isteği, BOTLAR DÂHİL.
      Arama motoru robotları JavaScript çalıştırmıyor; yalnızca
      istemci tarafı ölçüm kullanılsaydı Googlebot'un taradığı
      sayfalar raporda hiç görünmezdi ve "arama motoru ziyaretleri"
      diye bir veri olmazdı.

   2. İSTEMCİ — tıklama ve etkileşim olayları. Bunlar sunucuya
      hiç uğramıyor (filtre değişimi, hızlı bakış, favori) ve
      middleware'den görünmüyor.

   IP yalnızca ziyaretçi özeti üretmek için okunuyor, hiçbir yere
   yazılmıyor (bkz. lib/iz.ts).
   ============================================================ */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function istemciIp(istek: NextRequest): string {
  const f = istek.headers.get('x-forwarded-for');
  return (f?.split(',')[0] ?? istek.headers.get('x-real-ip') ?? '0.0.0.0').trim();
}

export async function POST(istek: NextRequest) {
  const ip = istemciIp(istek);
  const ua = istek.headers.get('user-agent') ?? '';

  /* Hız sınırı: uç herkese açık ve kimlik doğrulaması yok. Sınırsız
     bırakmak, tabloyu şişirmek isteyen birine bedava yol vermek
     olurdu. Ziyaretçi başına dakikada 60 olay, normal gezinmenin
     çok üstünde. */
  const izin = await sinirKontrol('iz', ip);
  if (!izin.izin) return new NextResponse(null, { status: 429 });

  let govde: Record<string, unknown>;
  try { govde = await istek.json(); } catch { return NextResponse.json({ tamam: false }, { status: 400 }); }

  const tur = typeof govde.tur === 'string' ? govde.tur : null;
  const yol = typeof govde.yol === 'string' ? govde.yol : '/';

  try {
    if (tur) {
      await olayYaz({
        tur,
        hedef: typeof govde.hedef === 'string' ? govde.hedef : null,
        yol,
        deger: typeof govde.deger === 'number' ? govde.deger : null,
        ua, ip,
      });
    } else {
      await ziyaretYaz({
        yol,
        referrer: typeof govde.referrer === 'string' ? govde.referrer : null,
        utmKaynak: typeof govde.utmKaynak === 'string' ? govde.utmKaynak : null,
        utmOrtam: typeof govde.utmOrtam === 'string' ? govde.utmOrtam : null,
        utmKampanya: typeof govde.utmKampanya === 'string' ? govde.utmKampanya : null,
        ua, ip,
        dil: istek.headers.get('accept-language')?.split(',')[0] ?? null,
        ulke: istek.headers.get('x-vercel-ip-country') ?? null,
      });
    }
  } catch (e) {
    /* Ölçüm HİÇBİR ZAMAN sayfayı bozmamalı: yazma hatası sessizce
       yutuluyor, sunucu günlüğüne düşüyor. */
    console.error('iz yazılamadı:', e);
  }

  // 204: gövde yok, `sendBeacon` yanıtı zaten okumuyor.
  return new NextResponse(null, { status: 204 });
}
