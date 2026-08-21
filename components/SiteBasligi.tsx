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
  { yol: '/ara', ad: 'Projeler' },
  { yol: '/ara?tip=villa', ad: 'Satılık Villa' },
  { yol: '/ara?tip=ofis', ad: 'Satılık Ofis' },
  { yol: '/teslim-takvimi', ad: 'Teslim takvimi' },
  { yol: '/firmalar', ad: 'Firmalar' },
];

export function SiteBasligi({ aktif }: { aktif?: string }) {
  return (
    <>
    {/* Üst mini şerit — güven ve destek bağlantıları. Ana gezintiyi
        kalabalıklaştırmadan bunlara yer açıyor. */}
    <div className="sb-ust0">
      <div className="vh-sar">
        <Link href="/#nasil">Nasıl çalışır</Link>
        <Link href="/firma-karnesi-metodoloji">Teslim karnesi</Link>
        <Link href="/duzeltme">Düzeltme bildir</Link>
        <span className="sag">
          <Link href="/karsilastir">Karşılaştırmam</Link>
          <Link href="/yonetim/giris">Firma girişi</Link>
        </span>
      </div>
    </div>

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
          {/* Dil seçici görsel olarak duruyor; ikinci dil eklenene
              kadar bağlantı değil, etiket. Tıklanan ama hiçbir şey
              yapmayan düğme koymaktan iyidir. */}
          <span className="sb-dil">TR</span>
          <span className="sb-dil">TR</span>
          <Link href="/yonetim/giris" className="kp-btn is-ghost is-small">Giriş yap</Link>
          {/* Dönüşüm eylemi amber — gezinme indigo. */}
          <Link href="/yonetim/giris" className="kp-btn is-eylem is-small">Fiyat al</Link>
        </div>
      </div>
    </header>
    </>
  );
}
