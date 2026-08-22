import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import DogrulamaFormu from '@/components/DogrulamaFormu';
import Icon from '@/components/Icon';
import { bekleyenOturum } from '@/lib/auth';
import { site } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Doğrulama | ${site.ad}`,
  robots: { index: false, follow: false },
};

export default async function DogrulamaSayfasi() {
  // Parola aşamasını geçmemiş biri buraya doğrudan gelemez.
  const bekleyen = await bekleyenOturum();
  if (!bekleyen) redirect('/giris');

  return (
    <main className="giris-sayfa">
      <div className="giris-kart">
        <div className="giris-logo">
          {site.ad}
        </div>

        <h1 className="h3">İki adımlı doğrulama</h1>
        <p className="muted small" style={{ marginBottom: 18 }}>
          Doğrulayıcı uygulamanızdaki 6 haneli kodu girin.
          Telefonunuza erişemiyorsanız yedek kodlarınızdan birini kullanabilirsiniz.
        </p>

        <DogrulamaFormu />

        <p className="tiny dim" style={{ marginTop: 18, textAlign: 'center' }}>
          Kod 30 saniyede bir yenileniyor. Doğrulama 10 dakika içinde tamamlanmalı.
        </p>
      </div>
    </main>
  );
}
