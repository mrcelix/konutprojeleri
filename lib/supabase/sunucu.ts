import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase istemcisi — sunucu tarafı.
 *
 * Oturum çerezde taşınır. Sunucu bileşenleri çerez YAZAMAZ; yazma işi
 * middleware'e ve sunucu eylemlerine (server action) ait. Bu yüzden
 * `set` çağrıları burada sessizce yutulur — bunu istisna yapmak, sadece
 * okuma yapan her sayfayı gereksiz yere kırardı.
 *
 * DİKKAT: burada kullanılan anahtar publishable (anon) anahtardır.
 * Gizli anahtar bu istemciye ASLA verilmez; verilirse oturum kontrolü
 * anlamsızlaşır ve her istek yönetici yetkisiyle çalışır.
 */
export async function supabaseSunucu() {
  const cerez = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cerez.getAll();
        },
        setAll(yenile) {
          try {
            for (const { name, value, options } of yenile) {
              cerez.set(name, value, options);
            }
          } catch {
            // Sunucu bileşeninden çağrıldı; oturumu middleware tazeliyor.
          }
        },
      },
    }
  );
}
