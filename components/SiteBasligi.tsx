import Link from 'next/link';

/**
 * Site başlığı.
 *
 * Gezintide YALNIZCA VAR OLAN sayfalar. Mockup'ta "Haberler" de vardı
 * ama o bölüm henüz yazılmadı; bağlantı vermek 404 üretmekten başka
 * bir şey yapmaz.
 *
 * "Projemi ekle" firma tarafına giden tek kapı. Panele giriş ayrı
 * duruyor çünkü iki farklı kitle: biri hesabı olan firma yetkilisi,
 * diğeri henüz sisteme girmemiş müteahhit.
 */

const NAV = [
  { yol: '/ara?tip=villa', ad: 'Villa projeleri' },
  { yol: '/ara?tip=mustakil', ad: 'Müstakil & yalı' },
  { yol: '/ara?tip=rezidans', ad: 'Rezidans' },
  { yol: '/teslim-takvimi', ad: 'Teslim takvimi' },
  { yol: '/firmalar', ad: 'Firmalar' },
];

export function SiteBasligi({ aktif }: { aktif?: string }) {
  return (
    <header className="sb">
      <div className="sb-ic">
        <Link href="/" className="sb-logo">
          konut<span>projeleri</span>
          <i>lüks konut &amp; villa</i>
        </Link>

        <nav className="sb-nav" aria-label="Ana gezinti">
          {NAV.map((n) => (
            <Link
              key={n.yol}
              href={n.yol}
              className={aktif === n.yol ? 'is-aktif' : undefined}
            >
              {n.ad}
            </Link>
          ))}
        </nav>

        <div className="sb-eylem">
          <Link href="/yonetim/giris" className="kp-btn is-ghost is-small">Giriş yap</Link>
          <Link href="/yonetim/giris" className="kp-btn is-small">Projemi ekle</Link>
        </div>
      </div>
    </header>
  );
}
