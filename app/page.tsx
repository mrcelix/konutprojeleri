import Link from 'next/link';
import { gecikmeOlc, type Gecikme } from '@/lib/db';

export const revalidate = 3600;

export default async function AnaSayfa() {
  // Kabul kriteri: Vercel fra1 ↔ Supabase eu-central-1 arası gidiş-dönüş.
  //
  // ÖLÇÜLEN DEĞER ORTANCA, ilk sorgu DEĞİL. İlk sorgu bağlantı kurulumunu
  // da içerir (DNS, TCP, TLS, havuz kimlik doğrulaması) ve aynı şehirde
  // bile 100-150 ms sürer; onu ölçmek doğru kurulmuş bir sistemde bile
  // alarm veriyordu. Bölge eşleşmesinin ölçüsü, bağlantı kurulduktan
  // sonraki gidiş-dönüştür.
  let gecikme: Gecikme | null = null;
  let hata: string | null = null;
  try {
    gecikme = await gecikmeOlc();
  } catch (e) {
    hata = e instanceof Error ? e.message : 'bilinmeyen hata';
  }

  const saglikli = gecikme != null && gecikme.ortanca < 5;

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
              {gecikme?.ortanca} ms
            </span>{' '}
            {saglikli
              ? 'Bölge eşleşmesi doğru. Geliştirmeye devam edilebilir.'
              : 'Beklenen değer 5 ms altı. Vercel bölgesi fra1 ve Supabase bölgesi eu-central-1 mi, kontrol edin.'}
            <br />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Ortanca gidiş-dönüş {gecikme?.ortanca} ms · ilk sorgu{' '}
              {gecikme?.ilk} ms (bağlantı kurulumu dahil; soğuk başlatmada
              bir kez ödenir, bölge hakkında bilgi vermez).
            </span>
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
          <li><code>/karsilastir/a+b+c</code> — dört projeye kadar karşılaştırma (arama motoruna kapalı)</li>
          <li><code>/fiyat-endeksi</code> — m² fiyat endeksi (<Link href="/fiyat-endeksi">örnek</Link>)</li>
          <li><code>/api/onay</code> — onay kuyruğu, etiketli ISR yenilemesi</li>
        </ul>
      </div>
    </main>
  );
}
