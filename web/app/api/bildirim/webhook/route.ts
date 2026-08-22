import { NextResponse } from 'next/server';
import { imzaDogrula, resendOlayIsle } from '@/lib/bildirim/webhook';

/* ============================================================
   E-posta sağlayıcısı geri bildirim noktası.

   Sağlayıcı panelinden bu adrese abone olun:
     https://www.konutprojeleri.com/api/bildirim/webhook
     Olaylar: email.bounced, email.complained, email.delivered

   İmza doğrulanmadan HİÇBİR işlem yapılmaz. Doğrulanmamış webhook,
   saldırganın istediği adresi engel listesine attırmasına izin verirdi.

   EPOSTA_WEBHOOK_GIZLI tanımlı değilse uç nokta kapalıdır.
   ============================================================ */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const gizli = process.env.EPOSTA_WEBHOOK_GIZLI?.trim();
  if (!gizli) {
    return NextResponse.json({ hata: 'Webhook yapılandırılmamış' }, { status: 404 });
  }

  // İmza ham gövde üzerinden hesaplanıyor — JSON.parse'tan ÖNCE okunmalı.
  const govde = await request.text();

  const gecerli = imzaDogrula(
    gizli,
    request.headers.get('svix-id') ?? '',
    request.headers.get('svix-timestamp') ?? '',
    govde,
    request.headers.get('svix-signature') ?? '',
  );

  if (!gecerli) {
    return NextResponse.json({ hata: 'İmza doğrulanamadı' }, { status: 401 });
  }

  let olay: unknown;
  try {
    olay = JSON.parse(govde);
  } catch {
    return NextResponse.json({ hata: 'Geçersiz JSON' }, { status: 400 });
  }

  try {
    const sonuc = await resendOlayIsle(olay as never);
    // Sağlayıcılar 2xx dışındaki yanıtta tekrar deniyor. İşleyemediğimiz
    // olay için de 200 dönüyoruz — sonsuz tekrar döngüsüne girmesin.
    return NextResponse.json(sonuc, { status: 200 });
  } catch (e) {
    console.error('Webhook işlenemedi:', e);
    // Burada 500 dönmek DOĞRU: gerçek bir hata oldu, sağlayıcı tekrar denesin.
    return NextResponse.json({ hata: 'İşlenemedi' }, { status: 500 });
  }
}
