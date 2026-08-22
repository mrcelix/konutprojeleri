import { TL } from '@/lib/bicim';

/* ============================================================
   Bağımlılıksız SVG grafikler.

   Chart kütüphanesi eklemek yerine iki basit bileşen: sunucu tarafında
   render edilir, istemciye JS gitmez, tema değişkenleriyle uyumlu.
   ============================================================ */

export interface SeriNoktasi {
  etiket: string;
  deger: number;
  ikincil?: number;
}

const kisaSayi = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${Math.round(n / 1000)}B`
      : String(n);

/** Dikey sütun grafiği. İkincil seri varsa çizgi olarak üstüne biner. */
export function SutunGrafik({
  seri, yukseklik = 200, paraMi = true, ikincilAd,
}: {
  seri: SeriNoktasi[];
  yukseklik?: number;
  paraMi?: boolean;
  ikincilAd?: string;
}) {
  if (!seri.length) return <p className="muted small">Gösterilecek veri yok.</p>;

  const enBuyuk = Math.max(...seri.map((s) => s.deger), 1);
  const enBuyukIkincil = Math.max(...seri.map((s) => s.ikincil ?? 0), 1);
  const G = 100 / seri.length;          // her sütunun yüzde genişliği
  const cizgi = seri.some((s) => s.ikincil !== undefined);

  const nokta = (s: SeriNoktasi, i: number) =>
    `${(i + 0.5) * G},${100 - ((s.ikincil ?? 0) / enBuyukIkincil) * 88}`;

  return (
    <div className="grafik">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: yukseklik }} role="img"
        aria-label={`${seri.length} dönemlik grafik`}>
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} className="izgara" vectorEffect="non-scaling-stroke" />
        ))}
        {seri.map((s, i) => {
          const h = (s.deger / enBuyuk) * 88;
          return (
            <rect key={s.etiket} x={i * G + G * 0.22} y={100 - h} width={G * 0.56} height={Math.max(h, 0.4)}
              className="sutun" rx="0.6" />
          );
        })}
        {cizgi && (
          <>
            <polyline points={seri.map(nokta).join(' ')} className="cizgi" vectorEffect="non-scaling-stroke" />
            {seri.map((s, i) => {
              const [x, y] = nokta(s, i).split(',');
              return <circle key={s.etiket} cx={x} cy={y} r="0.9" className="cizgi-nokta" />;
            })}
          </>
        )}
      </svg>

      <div className="grafik-eksen">
        {seri.map((s) => (
          <span key={s.etiket} title={`${s.etiket}: ${paraMi ? TL(s.deger) : s.deger}`}>{s.etiket}</span>
        ))}
      </div>

      <div className="grafik-lejant">
        <span><i className="kutu sutun-renk" />{paraMi ? 'Gelir' : 'Adet'} · en yüksek {paraMi ? TL(enBuyuk) : enBuyuk}</span>
        {cizgi && ikincilAd && <span><i className="kutu cizgi-renk" />{ikincilAd} · en yüksek {kisaSayi(enBuyukIkincil)}</span>}
      </div>
    </div>
  );
}

/** Yatay oranlı çubuk listesi — bölge/villa kırılımı için. */
export function OranListesi({
  satirlar, paraMi = true, bos = 'Kayıt yok.',
}: {
  satirlar: { ad: string; deger: number; alt?: string; yol?: string }[];
  paraMi?: boolean;
  bos?: string;
}) {
  if (!satirlar.length) return <p className="muted small">{bos}</p>;
  const enBuyuk = Math.max(...satirlar.map((s) => s.deger), 1);

  return (
    <div className="oran-listesi">
      {satirlar.map((s) => (
        <div className="oran-satir" key={s.ad}>
          <div className="oran-bas">
            <span className="oran-ad">{s.ad}{s.alt && <small> · {s.alt}</small>}</span>
            <b>{paraMi ? TL(s.deger) : s.deger.toLocaleString('tr-TR')}</b>
          </div>
          <span className="oran-yol">
            <i style={{ width: `${Math.max((s.deger / enBuyuk) * 100, 1.5)}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Tek göstergeli KPI kartı. */
export function KpiKart({
  baslik, deger, alt, degisim, tersMi = false,
}: {
  baslik: string;
  deger: string;
  alt?: string;
  degisim?: number | null;
  /** Artış kötüyse (iptal oranı gibi) renkler ters çevrilir */
  tersMi?: boolean;
}) {
  const iyi = degisim == null ? null : tersMi ? degisim <= 0 : degisim >= 0;
  return (
    <div className="kpi">
      <span className="kpi-baslik">{baslik}</span>
      <b className="kpi-deger">{deger}</b>
      <div className="kpi-alt">
        {degisim != null && (
          <span className={'kpi-degisim ' + (iyi ? 'artis' : 'azalis')}>
            {degisim > 0 ? '▲' : degisim < 0 ? '▼' : '■'} %{Math.abs(degisim)}
          </span>
        )}
        {alt && <span className="dim">{alt}</span>}
      </div>
    </div>
  );
}
