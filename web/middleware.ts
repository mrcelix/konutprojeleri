import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

/**
 * Yol bilgisini bir başlıkla aşağı geçiriyor + ziyaret ölçümü.
 *
 * Kök layout'un dili (`<html lang>`) belirleyebilmesi için hangi yolda
 * olduğumuzu bilmesi gerekiyor; App Router layout'a bu bilgiyi doğrudan
 * vermiyor. Başlık eklemek, layout'u `force-dynamic` yapmadan çalışan
 * tek yol.
 *
 * Ziyaret ölçümü BURADA çünkü arama motoru robotları JavaScript
 * çalıştırmıyor. Yalnızca istemci tarafı ölçüm kullanılsaydı
 * Googlebot'un taradığı sayfalar raporda hiç görünmezdi — oysa
 * taranma sıklığı SEO'nun en doğrudan göstergesi.
 *
 * Middleware Edge'de çalışıyor ve Prisma orada yok; kayıt, Node
 * runtime'daki `/api/iz` ucuna ateşle-unut bir istekle yapılıyor.
 * `waitUntil` yanıtı bekletmiyor: ölçüm sayfayı yavaşlatmamalı.
 *
 * `waitUntil` İSTEK üzerinde değil, ikinci parametredeki olay
 * nesnesinde. `istek.waitUntil` yazıldığında Next bunu eski imza
 * sanıp her sayfayı 500 ile düşürüyordu.
 */
export function middleware(istek: NextRequest, olay: NextFetchEvent) {
  const basliklar = new Headers(istek.headers);
  basliklar.set('x-yol', istek.nextUrl.pathname);

  const yanit = NextResponse.next({ request: { headers: basliklar } });

  /* Yalnızca HTML gezinmeleri sayılıyor: prefetch, veri isteği ve
     varlıklar ziyaret değil. `next/link` ön yüklemeyi `purpose:
     prefetch` başlığıyla söylüyor ve sayılırsa hiç görülmemiş
     sayfalar ziyaret almış gibi çıkıyor. */
  const kabul = istek.headers.get('accept') ?? '';
  const onYukleme = istek.headers.get('purpose') === 'prefetch'
    || istek.headers.get('next-router-prefetch') === '1'
    || istek.headers.get('x-middleware-prefetch') === '1';

  if (kabul.includes('text/html') && !onYukleme) {
    const u = istek.nextUrl;
    const govde = JSON.stringify({
      yol: u.pathname,
      referrer: istek.headers.get('referer'),
      utmKaynak: u.searchParams.get('utm_source'),
      utmOrtam: u.searchParams.get('utm_medium'),
      utmKampanya: u.searchParams.get('utm_campaign'),
    });

    const istekVar = fetch(new URL('/api/iz', u.origin), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Sınıflandırma bu üçüne bakıyor; Edge'den elle taşınıyor.
        'user-agent': istek.headers.get('user-agent') ?? '',
        'x-forwarded-for': istek.headers.get('x-forwarded-for') ?? '',
        'accept-language': istek.headers.get('accept-language') ?? '',
        'x-vercel-ip-country': istek.headers.get('x-vercel-ip-country') ?? '',
      },
      body: govde,
    }).catch(() => { /* ölçüm sayfayı bozmamalı */ });

    olay.waitUntil(istekVar);
  }

  return yanit;
}

export const config = {
  // Statik varlıklar ve API'ler için çalıştırmaya gerek yok
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
