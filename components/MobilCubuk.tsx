import Link from 'next/link';

/**
 * Mobil alt gezinti çubuğu.
 *
 * Yalnızca 720px altında görünür (CSS). Beş öğe: masaüstü
 * gezintisindeki her şey buraya sığmaz, bu yüzden en sık kullanılan
 * beş eylem seçildi. "Fiyat al" ortada — dönüşüm eylemi en kolay
 * ulaşılan yerde durur.
 */

const OGELER = [
  { yol: '/', ad: 'Keşfet', ikon: '🔍' },
  { yol: '/ara', ad: 'Projeler', ikon: '📍' },
  { yol: '/butce', ad: 'Bütçem', ikon: '💬' },
  { yol: '/karsilastir', ad: 'Karşılaştır', ikon: '⚖️' },
  { yol: '/yonetim/giris', ad: 'Hesabım', ikon: '👤' },
];

export function MobilCubuk({ aktif = '/' }: { aktif?: string }) {
  return (
    <nav className="mb" aria-label="Mobil gezinti">
      <div className="mb-ic">
        {OGELER.map((o) => (
          <Link key={o.yol} href={o.yol} className={aktif === o.yol ? 'is-aktif' : undefined}>
            <i aria-hidden>{o.ikon}</i>
            {o.ad}
          </Link>
        ))}
      </div>
    </nav>
  );
}
