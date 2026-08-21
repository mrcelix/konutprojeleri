import Link from 'next/link';

/**
 * Mobil alt gezinti çubuğu — tasarım sisteminin `.alt-panel` bloğu.
 *
 * Yalnızca 620px altında görünür (CSS). Beş öğe: masaüstü
 * gezintisindeki her şey buraya sığmaz, bu yüzden en sık kullanılan
 * beş yol seçildi.
 *
 * ORTADAKİ öğe `.vurgu` — dönüşüm eylemi sekme gibi değil düğme gibi
 * okunuyor: altın dolgu ve hafifçe yukarıda. Parmağın en kolay
 * ulaştığı yer ve sitenin asıl işi orada.
 */

const OGELER = [
  { yol: '/', ad: 'Keşfet', ikon: <Ikon d="m3 11 9-8 9 8v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /> },
  { yol: '/ara', ad: 'Projeler', ikon: <Ikon d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm9 16-4-4" /> },
  { yol: '/butce', ad: 'Bütçem', vurgu: true, ikon: <Ikon d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /> },
  { yol: '/karsilastir', ad: 'Karşılaştır', ikon: <Ikon d="M12 3v18M5 8l-3 6h6ZM19 8l-3 6h6Z" /> },
  { yol: '/yonetim/giris', ad: 'Hesabım', ikon: <Ikon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" /> },
];

export function MobilCubuk({ aktif = '/' }: { aktif?: string }) {
  return (
    <nav className="alt-panel" aria-label="Mobil gezinti">
      {OGELER.map((o) => (
        <Link
          key={o.yol}
          href={o.yol}
          className={`alt-oge${o.vurgu ? ' vurgu' : ''}${aktif === o.yol ? ' etkin' : ''}`}
          aria-current={aktif === o.yol ? 'page' : undefined}
        >
          <span className="alt-ikon">{o.ikon}</span>
          {o.ad}
        </Link>
      ))}
    </nav>
  );
}

function Ikon({ d }: { d: string }) {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
