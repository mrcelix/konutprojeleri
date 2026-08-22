import { NextResponse } from 'next/server';
import { islerCalistir, IS_ADLARI } from '@/lib/isler';

/* ============================================================
   Zamanlanmış işlerin HTTP tetikleyicisi.

   Yerelde `npm run isler` yeterli; ancak sunucusuz ortamlarda
   (Vercel, Netlify) sürekli çalışan bir cron süreci yok — planlayıcı
   bir HTTP adresi çağırıyor. Aynı iş kodunu iki yerden çalıştırmamak
   için mantık `lib/isler.ts` içinde; burası yalnızca kapı.

   Yetki: `CRON_SECRET` ortam değişkeni.
     · Vercel Cron kendi çağrılarına `Authorization: Bearer $CRON_SECRET`
       başlığını otomatik ekler.
     · Elle tetiklemek için `?anahtar=…` de kabul ediliyor.

   CRON_SECRET tanımlı değilse uç nokta KAPALIDIR. Açık bırakmak
   herkesin kuyruğu tetiklemesine izin verirdi.
   ============================================================ */

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function yetkili(request: Request): boolean {
  const gizli = process.env.CRON_SECRET?.trim();
  if (!gizli) return false;

  const baslik = request.headers.get('authorization') ?? '';
  if (baslik === `Bearer ${gizli}`) return true;

  return new URL(request.url).searchParams.get('anahtar') === gizli;
}

async function isle(request: Request) {
  if (!yetkili(request)) {
    // Sebebi ayırmıyoruz: "anahtar yanlış" ile "uç nokta kapalı" arasındaki
    // fark saldırgana bilgi verir.
    return NextResponse.json({ hata: 'Yetkisiz' }, { status: 401 });
  }

  const secilen = new URL(request.url).searchParams.get('is');
  if (secilen && !IS_ADLARI.includes(secilen)) {
    return NextResponse.json(
      { hata: `Bilinmeyen iş: ${secilen}`, gecerli: IS_ADLARI },
      { status: 400 },
    );
  }

  const sonuc = await islerCalistir(secilen ?? undefined);
  return NextResponse.json(sonuc, {
    // Planlayıcı yanıtı önbelleğe almamalı.
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: Request) {
  return isle(request);
}

/** Bazı planlayıcılar POST atar. */
export async function POST(request: Request) {
  return isle(request);
}
