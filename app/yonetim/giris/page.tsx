import type { Metadata } from 'next';
import { GirisFormu } from './GirisFormu';

/**
 * /yonetim/giris
 *
 * Panelin tek herkese açık sayfası. Arama motoruna kapalı: giriş
 * ekranının indekslenmesinin hiçbir faydası, saldırı yüzeyini
 * genişletmesinin ise gerçek bir maliyeti var.
 */

export const metadata: Metadata = {
  title: 'Panel girişi',
  robots: { index: false, follow: false },
};

export default async function GirisSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const ham = Array.isArray(q.don) ? q.don[0] : q.don;
  const don = ham && ham.startsWith('/') && !ham.startsWith('//') ? ham : '/yonetim';

  return (
    <main className="yn-giris">
      <div className="yn-giris__kart">
        <p className="kp-label" style={{ marginBottom: 4 }}>konutprojeleri.com</p>
        <h1 className="kp-h2" style={{ marginBottom: 'var(--s-4)' }}>Panel girişi</h1>

        <GirisFormu don={don} />

        <p className="yn-giris__not">
          Firma yetkilisiyseniz hesabınız site yönetimi tarafından açılır.
          Parolanızı unuttuysanız yönetimle iletişime geçin.
        </p>
      </div>
    </main>
  );
}
