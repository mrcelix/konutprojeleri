import type { Nokta } from '@/lib/queries/endeks';

/**
 * Sunucuda üretilen SVG grafikler.
 *
 * İstemci tarafı grafik kütüphanesi kullanılmıyor: bu sayfalar ISR ile
 * statik üretiliyor ve grafikler hiç değişmiyor. Kütüphane eklemek
 * ~50 kB JS ve hidrasyon maliyeti demek olurdu; karşılığında hiçbir şey
 * kazanmıyoruz.
 *
 * Renkler token'lardan gelir; koyu temada ızgara siliklenir ve alan
 * dolgusu opaklığı düşer (--chart-grid, --chart-fill-opacity).
 */

export type Seri = {
  ad: string;
  nokta: Nokta[];
  renk: string;
  kesikli?: boolean;
  dolgulu?: boolean;
};

const G = { sol: 58, sag: 14, ust: 14, alt: 30 };

function binlik(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}b`;
  return String(Math.round(n));
}

export function CizgiGrafik({
  seriler,
  yukseklik = 260,
  genislik = 940,
}: {
  seriler: Seri[];
  yukseklik?: number;
  genislik?: number;
}) {
  const dolu = seriler.filter((s) => s.nokta.length > 1);
  if (dolu.length === 0) {
    return (
      <p className="prose" style={{ fontSize: 12 }}>
        Seri henüz oluşmadı. Endeks, fiyat arşivi biriktikçe anlamlanır.
      </p>
    );
  }

  const tumNokta = dolu.flatMap((s) => s.nokta);
  const enBuyuk = Math.max(...tumNokta.map((n) => n.m2));
  const tavan = Math.ceil(enBuyuk / 10000) * 10000 || 10000;

  // X ekseni tüm serilerin birleşik dönem listesine göre
  const donemler = [...new Set(tumNokta.map((n) => n.donem))].sort();
  const sonIndeks = Math.max(1, donemler.length - 1);

  const x = (donem: string) =>
    G.sol + (donemler.indexOf(donem) / sonIndeks) * (genislik - G.sol - G.sag);
  const y = (m2: number) =>
    G.ust + (1 - m2 / tavan) * (yukseklik - G.ust - G.alt);

  const yEksen = [0, 0.25, 0.5, 0.75, 1].map((o) => tavan * o);

  // X etiketleri: her yılın ilk dönemi
  const yilEtiketleri = donemler.filter((d, i) => i === 0 || d.slice(5) === '01');

  return (
    <svg
      viewBox={`0 0 ${genislik} ${yukseklik}`}
      style={{ display: 'block', width: '100%', height: 'auto' }}
      role="img"
      aria-label={`m² fiyat endeksi grafiği: ${dolu.map((s) => s.ad).join(', ')}`}
    >
      {/* ızgara */}
      <g stroke="var(--chart-grid)" strokeWidth="1">
        {yEksen.map((v) => (
          <line key={v} x1={G.sol} x2={genislik - G.sag} y1={y(v)} y2={y(v)} />
        ))}
      </g>

      {/* y etiketleri */}
      <g fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="10">
        {yEksen.map((v) => (
          <text key={v} x={G.sol - 8} y={y(v) + 3.5} textAnchor="end">
            {binlik(v)}
          </text>
        ))}
      </g>

      {/* x etiketleri */}
      <g fill="var(--text-muted)" fontFamily="var(--font-mono)" fontSize="10">
        {yilEtiketleri.map((d) => (
          <text key={d} x={x(d)} y={yukseklik - 10} textAnchor="middle">
            {d.slice(0, 4)}
          </text>
        ))}
      </g>

      {dolu.map((s, i) => {
        const yol = s.nokta.map((n, j) => `${j === 0 ? 'M' : 'L'} ${x(n.donem)} ${y(n.m2)}`).join(' ');
        const son = s.nokta[s.nokta.length - 1]!;
        const dolguId = `dolgu-${i}`;
        return (
          <g key={s.ad}>
            {s.dolgulu && (
              <>
                <defs>
                  <linearGradient id={dolguId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.renk} stopOpacity="var(--chart-fill-opacity)" />
                    <stop offset="100%" stopColor={s.renk} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`${yol} L ${x(son.donem)} ${y(0)} L ${x(s.nokta[0]!.donem)} ${y(0)} Z`}
                  fill={`url(#${dolguId})`}
                />
              </>
            )}
            <path
              d={yol}
              fill="none"
              stroke={s.renk}
              strokeWidth={s.kesikli ? 1.8 : 2.4}
              strokeDasharray={s.kesikli ? '6 4' : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx={x(son.donem)} cy={y(son.m2)} r="4.5" fill={s.renk} />
          </g>
        );
      })}
    </svg>
  );
}

/** Tablo içi mini seri — eksen yok, yalnızca yön. */
export function Sparkline({ nokta, renk }: { nokta: Nokta[]; renk: string }) {
  if (nokta.length < 2) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  const son12 = nokta.slice(-12);
  const degerler = son12.map((n) => n.m2);
  const enAz = Math.min(...degerler);
  const enCok = Math.max(...degerler);
  const aralik = enCok - enAz || 1;

  const yol = son12
    .map((n, i) => {
      const x = (i / (son12.length - 1)) * 92;
      const y = 20 - ((n.m2 - enAz) / aralik) * 16;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 92 22" style={{ display: 'block', width: 92, height: 22 }} aria-hidden="true">
      <path d={yol} fill="none" stroke={renk} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
