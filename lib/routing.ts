/**
 * URL çözümleme.
 *
 * SEO belgesinde tanımlanan taksonomi tek bir dinamik segmentte çakışıyor:
 *
 *   /istanbul/kadikoy/benesta-benleo-acibadem   → proje detay
 *   /istanbul/kadikoy/2-1-konut-projeleri       → daire tipi listesi
 *   /istanbul/kadikoy/fikirtepe-konut-projeleri → mahalle listesi
 *   /istanbul/kadikoy/kentsel-donusum-projeleri → kategori listesi
 *
 * Ayrım kalıpla yapılır: "-konut-projeleri" veya "-projeleri" ile biten
 * slug listedir, diğerleri projedir. Bu kalıp beyaz listeye bağlıdır —
 * yeni bir liste tipi eklenirse buraya da eklenmeli.
 */

export type SlugCozum =
  | { tip: 'proje'; slug: string }
  | { tip: 'daire-tipi'; daireTipi: string }
  | { tip: 'mahalle'; mahalle: string }
  | { tip: 'kategori'; kategori: string };

const KATEGORILER = new Set([
  'kentsel-donusum',
  'toki',
  'emlak-konut',
  'villa',
  'ofis',
  'rezidans',
]);

/** "2-1" → "2+1" */
export function daireTipiCoz(s: string): string | null {
  const m = /^(\d)-(\d)$/.exec(s);
  return m ? `${m[1]}+${m[2]}` : null;
}

/** "2+1" → "2-1" */
export function daireTipiSlug(tip: string): string {
  return tip.replace('+', '-');
}

export function slugCoz(slug: string): SlugCozum {
  const listeEki = /-(konut-)?projeleri$/;

  if (!listeEki.test(slug)) {
    return { tip: 'proje', slug };
  }

  const govde = slug.replace(listeEki, '');

  const daireTipi = daireTipiCoz(govde);
  if (daireTipi) return { tip: 'daire-tipi', daireTipi };

  if (KATEGORILER.has(govde)) return { tip: 'kategori', kategori: govde };

  return { tip: 'mahalle', mahalle: govde };
}

/** İl sayfası: /istanbul-konut-projeleri */
export function ilSlugCoz(slug: string): string | null {
  const m = /^(.+)-konut-projeleri$/.exec(slug);
  return m?.[1] ?? null;
}

export function projeYolu(p: { il: string; ilce: string; slug: string }): string {
  return `/${p.il}/${p.ilce}/${p.slug}`;
}

export function katPlaniYolu(
  p: { il: string; ilce: string; slug: string },
  tip: string
): string {
  return `${projeYolu(p)}/${daireTipiSlug(tip)}-kat-plani`;
}
