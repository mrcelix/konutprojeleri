import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { aktifKullanici } from '@/lib/auth';

/* ============================================================
   TOTP kurulum QR kodu.

   Sunucuda SVG üretiliyor — QR kütüphanesi istemciye gitmiyor.

   Yetki ZORUNLU: bu uç nokta keyfi metni QR'a çeviren açık bir
   servise dönüşmemeli. Ayrıca yalnızca otpauth:// şemasını kabul
   ediyoruz; başka bir şema, QR'ı kimlik avı bağlantısı üretmek
   için kullanmaya çalışan birinin işine yarardı.
   ============================================================ */

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // girisZorunlu() hata fırlatıp 500'e dönüşürdü; API'de temiz 401 istiyoruz.
  if (!(await aktifKullanici())) {
    return NextResponse.json({ hata: 'Yetkisiz' }, { status: 401 });
  }

  const uri = new URL(request.url).searchParams.get('u') ?? '';
  if (!uri.startsWith('otpauth://totp/')) {
    return NextResponse.json({ hata: 'Geçersiz URI' }, { status: 400 });
  }
  if (uri.length > 512) {
    return NextResponse.json({ hata: 'URI çok uzun' }, { status: 400 });
  }

  const svg = await QRCode.toString(uri, {
    type: 'svg',
    margin: 1,
    width: 176,
    // Koyu temada da okunsun diye zemin beyaz bırakılıyor;
    // QR okuyucular kontrast bekliyor.
    color: { dark: '#16211F', light: '#FFFFFF' },
  });

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // Gizli anahtar içeriyor — hiçbir yerde saklanmamalı
      'Cache-Control': 'no-store, private',
    },
  });
}
