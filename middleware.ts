import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Oturum tazeleme ve panel koruması.
 *
 * İki iş yapar:
 *
 *  1. Supabase erişim token'ını yeniler. Sunucu bileşenleri çerez
 *     yazamadığı için bu iş middleware'e ait; yapılmazsa oturum bir
 *     saat sonra sessizce düşer ve kullanıcı sebepsiz yere girişe atılır.
 *
 *  2. /yonetim altını korur. Bu YALNIZCA ilk savunmadır — token'ın
 *     varlığına bakar, rolüne değil. Asıl yetki kontrolü lib/yetki.ts
 *     içinde, veritabanına sorularak yapılır. Middleware'e güvenip
 *     sayfa içinde kontrolü atlamak, çerezi taklit eden birine paneli
 *     açardı.
 */

export async function middleware(istek: NextRequest) {
  let cevap = NextResponse.next({ request: istek });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return istek.cookies.getAll();
        },
        setAll(yenile) {
          for (const { name, value } of yenile) istek.cookies.set(name, value);
          cevap = NextResponse.next({ request: istek });
          for (const { name, value, options } of yenile) {
            cevap.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  const yol = istek.nextUrl.pathname;
  const girisSayfasi = yol.startsWith('/yonetim/giris');

  if (!data.user && yol.startsWith('/yonetim') && !girisSayfasi) {
    const url = istek.nextUrl.clone();
    url.pathname = '/yonetim/giris';
    // Girişten sonra kullanıcıyı istediği sayfaya geri götürmek için.
    url.searchParams.set('don', yol);
    return NextResponse.redirect(url);
  }

  if (data.user && girisSayfasi) {
    const url = istek.nextUrl.clone();
    url.pathname = '/yonetim';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return cevap;
}

export const config = {
  matcher: ['/yonetim/:path*'],
};
