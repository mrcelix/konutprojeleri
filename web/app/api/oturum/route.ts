import { NextResponse } from 'next/server';
import { aktifKullanici } from '@/lib/auth';
import { googleAcikMi } from '@/lib/google';

/* ============================================================
   Başlıktaki oturum düğmesinin veri kaynağı.

   Neden ayrı bir uç nokta: oturum çerezini sunucu bileşeninde
   okumak `app/layout.tsx`i DİNAMİK yapar ve site genelindeki statik
   üretimi (238 sayfa) tümüyle iptal ederdi. Başlık statik kalıyor,
   "Giriş yap" ile basılıyor; oturum varsa istemci bu uçtan öğrenip
   düğmeyi değiştiriyor.

   Dönen alanlar EN AZ: oturum var mı, görünen ad ve rol. E-posta,
   kimlik ya da yetki ayrıntısı dönmüyor — başlık için gereksiz.
   ============================================================ */

export const dynamic = 'force-dynamic';

export async function GET() {
  const k = await aktifKullanici();

  const kok = k?.rol === 'ADMIN' ? '/yonetim' : k?.rol === 'ZIYARETCI' ? '/hesap' : '/panel';
  /* `google` alanı oturumdan bağımsız: giriş penceresi Google
     düğmesini basıp basmayacağını buradan öğreniyor. Yapılandırma
     yoksa düğme hiç görünmüyor. */
  const govde = k
    ? { var: true, ad: k.ad, rol: k.rol, kok, google: googleAcikMi() }
    : { var: false, google: googleAcikMi() };

  return NextResponse.json(govde, {
    // Oturum durumu KİŞİYE ÖZEL: ara önbelleklerde paylaşılmamalı.
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
