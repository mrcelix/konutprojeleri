import { NextResponse } from 'next/server';
import { SEPET_COOKIE, SEPET_AZAMI, sepetCoz, guvenliDon } from '@/lib/sepet';

/**
 * Karşılaştırma sepetine ekleme / çıkarma.
 *
 * POST kullanılır. GET bağlantısı olsaydı Next'in bağlantı ön yüklemesi
 * (prefetch) kullanıcı tıklamadan projeyi sepete atardı — sessiz ve
 * anlaşılması güç bir hata olurdu.
 */

export const runtime = 'nodejs';

export async function POST(istek: Request) {
  const form = await istek.formData();
  const don = guvenliDon(form.get('don'));

  const mevcut = sepetCoz(istek.headers.get('cookie')?.match(
    new RegExp(`(?:^|; )${SEPET_COOKIE}=([^;]*)`)
  )?.[1]);

  const ekle = sepetCoz(String(form.get('ekle') ?? ''))[0];
  const cikar = sepetCoz(String(form.get('cikar') ?? ''))[0];

  let yeni = mevcut;
  if (form.get('temizle')) {
    yeni = [];
  } else if (cikar) {
    yeni = mevcut.filter((s) => s !== cikar);
  } else if (ekle) {
    // Zaten varsa çıkar: aynı düğme hem ekler hem geri alır.
    yeni = mevcut.includes(ekle)
      ? mevcut.filter((s) => s !== ekle)
      : [...mevcut, ekle].slice(0, SEPET_AZAMI);
  }

  const cevap = NextResponse.redirect(new URL(don, istek.url), 303);
  cevap.cookies.set(SEPET_COOKIE, yeni.join(','), {
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    httpOnly: true,
  });
  return cevap;
}
