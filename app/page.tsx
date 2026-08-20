import Link from 'next/link';
import { Suspense } from 'react';
import { GecikmeKarti } from './GecikmeKarti';

export const revalidate = 3600;

export default async function AnaSayfa() {
  return (
    <main className="kp-wrap" style={{ paddingTop: 'var(--s-7)', paddingBottom: 'var(--s-8)' }}>
      <p className="kp-label">Konutprojeleri.com</p>
      <h1 className="kp-h1">Proje iskeleti ayakta</h1>
      <p className="kp-lead" style={{ marginBottom: 'var(--s-6)' }}>
        Next.js App Router · Supabase (Supavisor, transaction mode) · Cloudflare R2.
        Sayfa şablonları <code>app/</code> altında, tasarım token&apos;ları{' '}
        <code>app/globals.css</code> içinde.
      </p>

      <div className="kp-card" style={{ padding: 'var(--s-5)', marginBottom: 'var(--s-5)' }}>
        <h2 className="kp-h2">Aşama 1 — bölge doğrulaması</h2>
        {/* Ölçüm dinamik: sayfanın geri kalanı önbelleklenir, bu kart
            her istekte yeniden hesaplanır. Bkz. GecikmeKarti. */}
        <Suspense fallback={<p className="kp-lead">Gecikme ölçülüyor…</p>}>
          <GecikmeKarti />
        </Suspense>
      </div>

      <div className="kp-card" style={{ padding: 'var(--s-5)' }}>
        <h2 className="kp-h2">Kurulu şablonlar</h2>
        <ul className="kp-lead" style={{ paddingLeft: 'var(--s-5)', display: 'grid', gap: 4 }}>
          <li><code>/[il]</code> — şehir sayfası (<Link href="/istanbul-konut-projeleri">örnek</Link>)</li>
          <li><code>/[il]/[ilce]</code> — ilçe sayfası</li>
          <li><code>/[il]/[ilce]/[slug]</code> — proje detay veya liste (bkz. <code>lib/routing.ts</code>)</li>
          <li><code>/[il]/[ilce]/[slug]/[plan]</code> — kat planı sayfası</li>
          <li><code>/firmalar/[slug]</code> — firma karnesi</li>
          <li><code>/teslim-takvimi</code> — zaman ekseni (<Link href="/teslim-takvimi">örnek</Link>)</li>
          <li><code>/butce</code> — ödeme kapasitesi ekseni (<Link href="/butce">örnek</Link>)</li>
          <li><code>/karsilastir/a+b+c</code> — dört projeye kadar karşılaştırma (arama motoruna kapalı)</li>
          <li><code>/fiyat-endeksi</code> — m² fiyat endeksi (<Link href="/fiyat-endeksi">örnek</Link>)</li>
          <li><code>/api/onay</code> — onay kuyruğu, etiketli ISR yenilemesi</li>
        </ul>
      </div>
    </main>
  );
}
