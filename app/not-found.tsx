import Link from 'next/link';

/**
 * 404 — kurtarma ekranı.
 *
 * Kullanıcı asla çıkmazda bırakılmaz. Teslim edilen proje SİLİNMEZ,
 * arşive geçer; 404 yalnızca gerçekten kaldırılan içerikte görünür ve
 * her zaman bir çıkış yolu sunar.
 */

export default function NotFound() {
  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-8)', maxWidth: 560 }}>
      <div className="kp-card kp-empty">
        <p className="kp-label">404</p>
        <h1 className="kp-empty__title" style={{ fontSize: 22 }}>
          Bu sayfa artık yayında değil
        </h1>
        <p className="kp-empty__text">
          Aradığınız proje teslim edilmiş, yayından kaldırılmış ya da adres
          değişmiş olabilir. Sizi boşa çıkarmayalım:
        </p>

        <Link href="/" className="kp-empty__option is-primary">
          Konut projelerine dön
        </Link>
        <Link href="/istanbul-konut-projeleri" className="kp-empty__option">
          İstanbul&apos;da <b>499 aktif proje</b>
        </Link>
        <Link href="/firmalar" className="kp-empty__option">
          Firma karnelerine göz atın
        </Link>
      </div>
    </main>
  );
}
