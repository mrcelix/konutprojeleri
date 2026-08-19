import Link from 'next/link';
import { gecikmeOlc } from '@/lib/db';

export const revalidate = 3600;

export default async function AnaSayfa() {
  // Birinci aşamanın kabul kriteri: Vercel fra1 ↔ Supabase eu-central-1
  // arası gidiş-dönüş 3 ms'nin altında olmalı. Üstündeyse bölge yanlış.
  let gecikme: number | null = null;
  let hata: string | null = null;
  try {
    gecikme = await gecikmeOlc();
  } catch (e) {
    hata = e instanceof Error ? e.message : 'bilinmeyen hata';
  }

  const saglikli = gecikme != null && gecikme < 3;

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
        {hata ? (
          <p className="kp-lead">
            <span className="kp-pill is-danger">Bağlantı yok</span>{' '}
            <code>{hata}</code>
            <br />
            <code>.env.example</code> dosyasını <code>.env.local</code> olarak kopyalayıp
            Supabase bilgilerini girin.
          </p>
        ) : (
          <p className="kp-lead">
            <span className={`kp-pill ${saglikli ? 'is-success' : 'is-danger'}`}>
              {gecikme} ms
            </span>{' '}
            {saglikli
              ? 'Bölge eşleşmesi doğru. Geliştirmeye devam edilebilir.'
              : 'Beklenen değer 3 ms altı. Vercel bölgesi fra1 ve Supabase bölgesi eu-central-1 mi, kontrol edin.'}
          </p>
        )}
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
          <li><code>/fiyat-endeksi</code> — m² fiyat endeksi (<Link href="/fiyat-endeksi">örnek</Link>)</li>
          <li><code>/api/onay</code> — onay kuyruğu, etiketli ISR yenilemesi</li>
        </ul>
      </div>
    </main>
  );
}
