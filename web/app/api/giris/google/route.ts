import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { durumUret, googleAcikMi, googleYetkiAdresi, pkceUret } from '@/lib/google';

/* ============================================================
   Google ile girişin BAŞLANGICI.

   Kullanıcıyı Google'ın onay ekranına yolluyor. İki kısa ömürlü
   çerez bırakıyor:
     · durum (state) — geri dönen isteğin bizim başlattığımız akışa
       ait olduğunu kanıtlıyor (CSRF)
     · PKCE doğrulayıcısı — yetki kodu çalınsa bile jetona
       çevrilememesi için

   Yapılandırma yoksa 404: yarım yapılandırmayla açık bir giriş yolu,
   hata ekranına götüren bir düğmeden daha kötü.
   ============================================================ */

export const dynamic = 'force-dynamic';

const CEREZ_DURUM = 'vn_g_durum';
const CEREZ_PKCE = 'vn_g_pkce';
const CEREZ_HEDEF = 'vn_g_hedef';

export async function GET(istek: Request) {
  if (!googleAcikMi()) {
    return NextResponse.json({ hata: 'Google ile giriş kapalı.' }, { status: 404 });
  }

  const durum = durumUret();
  const { dogrulayici, meydan } = pkceUret();
  const adres = googleYetkiAdresi(durum, meydan);
  if (!adres) return NextResponse.json({ hata: 'Google ile giriş kapalı.' }, { status: 404 });

  const c = await cookies();
  const ayar = {
    httpOnly: true, sameSite: 'lax' as const, path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600, // 10 dakika: onay ekranında geçirilen makul süre
  };
  c.set(CEREZ_DURUM, durum, ayar);
  c.set(CEREZ_PKCE, dogrulayici, ayar);

  /* Kullanıcı hangi sayfadan başladıysa oraya dönmeli. YALNIZCA
     kendi sitemizdeki bir yol kabul ediliyor: dışarıdan gelen adres,
     girişi başka bir siteye taşıyan açık yönlendirme olurdu. */
  const hedef = new URL(istek.url).searchParams.get('hedef') ?? '';
  if (/^\/[A-Za-z0-9\-_/?=&.]*$/.test(hedef) && !hedef.startsWith('//')) {
    c.set(CEREZ_HEDEF, hedef, ayar);
  }

  return NextResponse.redirect(adres);
}
