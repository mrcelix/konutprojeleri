import Link from 'next/link';
import { sql } from '@/lib/db';
import { haritaNoktalari } from '@/lib/queries/harita';
import { filtreYaz, seciliSayisi, type Filtre } from '@/lib/filtre';
import { HaritaPanel } from './HaritaPanel';

/**
 * Harita görünümü — aramanın üçüncü modu.
 *
 * Sunucu veriyi çeker, istemci yalnızca haritayı çizer. Koordinatı olmayan
 * projeler haritada görünmez; bu sessiz bir kayıp olmasın diye sayfada
 * kaç projenin düştüğü yazılır.
 */

export async function HaritaGorunumu({
  taban, baslik, filtre,
}: {
  taban: string;
  baslik: string;
  filtre: Filtre;
}) {
  const [noktalar, poi] = await Promise.all([
    haritaNoktalari(filtre),
    sql<{ tip: string; ad: string; lng: number; lat: number }[]>`
      select tip, ad,
             st_x(konum::geometry)::float8 as lng,
             st_y(konum::geometry)::float8 as lat
      from poi
    `,
  ]);

  // Koordinatsız proje sayısı — şeffaflık için gösterilir
  const [eksik] = await sql<{ n: number }[]>`
    select count(*)::int as n from proje p
    where p.yayinda and p.durum in ('lansman','satista')
      and p.konum is null
      ${filtre.il ? sql`and p.il = ${filtre.il}` : sql``}
      ${filtre.ilce ? sql`and p.ilce = ${filtre.ilce}` : sql``}
  `;

  const merkez: [number, number] = noktalar.length
    ? [
        noktalar.reduce((t, n) => t + n.lat, 0) / noktalar.length,
        noktalar.reduce((t, n) => t + n.lng, 0) / noktalar.length,
      ]
    : [41.0082, 28.9784]; // İstanbul

  const listeYolu = taban + filtreYaz({ ...filtre, sayfa: 1 });

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-4)' }}>
      <div className="kp-row" style={{ marginBottom: 'var(--s-3)' }}>
        <h1 className="kp-h1" style={{ margin: 0, fontSize: 22 }}>{baslik}</h1>

        <nav className="kp-row" style={{ marginLeft: 'auto', gap: 4 }} aria-label="Görünüm">
          <Link href={listeYolu} className="kp-chip">Liste</Link>
          <span className="kp-chip is-selected">Harita</span>
        </nav>
      </div>

      <p className="kp-label" style={{ marginBottom: 'var(--s-3)', textTransform: 'none', letterSpacing: 0 }}>
        {noktalar.length} proje haritada
        {seciliSayisi(filtre) > 0 && ` · ${seciliSayisi(filtre)} filtre uygulandı`}
        {eksik && eksik.n > 0 && (
          <> · <b>{eksik.n} projenin koordinatı girilmemiş</b>, haritada görünmüyor</>
        )}
      </p>

      {noktalar.length === 0 ? (
        <div className="kp-card kp-empty">
          <p className="kp-empty__title">Bu filtrelerle haritada gösterilecek proje yok</p>
          <p className="kp-empty__text">
            Filtreleri gevşetin ya da liste görünümüne geçin — koordinatı olmayan
            projeler listede görünmeye devam eder.
          </p>
          <Link href={listeYolu} className="kp-empty__option is-primary">Liste görünümü</Link>
        </div>
      ) : (
        <HaritaPanel
          noktalar={noktalar}
          poi={poi}
          merkez={merkez}
          yakinlik={11}
          listeYolu={listeYolu}
        />
      )}
    </main>
  );
}
