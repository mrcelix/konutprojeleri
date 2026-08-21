import Link from 'next/link';

/**
 * Site başlığı — tasarım sisteminin kabuğu.
 *
 * ÜÇ KATMAN, her biri ayrı bir işe bakıyor:
 *   1. `.utilbar` — destek bağlantıları + KAYAN güven şeridi
 *   2. `.site-header` — logo, gezinme, eylemler (yapışkan)
 *
 * Güven maddeleri arama kutusunun altında DEĞİL en üstteki şeritte:
 * sayfanın ilk satırı, gezinmenin altına düşerse duyuru olmaktan
 * çıkıyor. Kayan şerit `.trustbar-track`; hareket hassasiyeti olan
 * ziyaretçide sistem animasyonu kapatıyor.
 *
 * Gezintide YALNIZCA VAR OLAN sayfalar — yazılmamış sayfaya bağlantı
 * vermek 404 üretmekten başka bir şey yapmaz.
 */

const NAV = [
  { yol: '/ara', ad: 'Projeler' },
  { yol: '/ara?tip=villa', ad: 'Satılık Villa' },
  { yol: '/ara?tip=ofis', ad: 'Satılık Ofis' },
  { yol: '/teslim-takvimi', ad: 'Teslim takvimi' },
  { yol: '/firmalar', ad: 'Firmalar' },
];

/** Güven maddeleri — kayan şerit iki kez basılıyor ki döngü boşluksuz olsun. */
const GUVEN = [
  'Fiyatlar haftalık teyitli',
  'Fiyat arşivi silinmez',
  'Teslim sözü karneyle takip ediliyor',
  'Firma sicili doğrulanıyor',
  'Reklam değil, kayıt',
];

export function SiteBasligi({ aktif }: { aktif?: string }) {
  return (
    <>
      <div className="utilbar">
        <div className="utilbar-inner">
          <div className="utilbar-left">
            <Link href="/#nasil">Nasıl çalışır</Link>
            <Link href="/firma-karnesi-metodoloji">Teslim karnesi</Link>
            <Link href="/duzeltme">Düzeltme bildir</Link>
          </div>

          <div className="trustbar" aria-hidden>
            <div className="trustbar-track">
              {[...GUVEN, ...GUVEN].map((g, i) => (
                <span className="trust-item" key={i}>
                  <Kene />
                  {g}
                </span>
              ))}
            </div>
          </div>

          <div className="utilbar-right">
            <Link href="/karsilastir">Karşılaştırmam</Link>
            <span className="utilbar-sep" />
            <span className="dil-kap">TR</span>
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="logo-i" aria-hidden>kp</span>
            <span className="logo-a">
              konut<span className="logo-b">projeleri</span>
            </span>
          </Link>

          <nav className="nav" aria-label="Ana gezinti">
            {NAV.map((n) => (
              <Link
                key={n.yol}
                href={n.yol}
                aria-current={aktif === n.yol ? 'page' : undefined}
              >
                {n.ad}
              </Link>
            ))}
          </nav>

          <div className="header-right">
            <Link href="/yonetim/giris" className="btn btn-ghost btn-sm">
              Giriş yap
            </Link>
            {/* Dönüşüm eylemi altın, gezinme indigo. İkisi aynı yerde
                kullanılmıyor — hangi düğmenin ileri götürdüğü renkten
                okunuyor. */}
            <Link href="/yonetim/giris" className="btn btn-accent btn-sm">
              Projemi ekle
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

function Kene() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
