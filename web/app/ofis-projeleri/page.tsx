import type { Metadata } from 'next';
import TipVitrini from '@/components/TipVitrini';
import { getProjelerByTip } from '@/lib/queries';
import { TLkisa } from '@/lib/bicim';
import { meta } from '@/lib/seo';
import { TIP_VITRINLERI } from '@/lib/tip-vitrin';

/* Ofis projeleri vitrini — bkz. `app/konut-projeleri/page.tsx`. */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const v = TIP_VITRINLERI.OFIS;
  const list = await getProjelerByTip('OFIS');
  const enDusuk = list.length ? Math.min(...list.map((p) => p.fiyatMin)) : 0;

  return meta({
    baslik: `${v.h1} — KonutProjeleri`,
    aciklama: list.length
      ? `${list.length} ofis projesi.${enDusuk ? ` ${TLkisa(enDusuk)}'den başlayan fiyatlar.` : ''} `
        + v.metaOzet
      : v.metaOzet,
    yol: `/${v.slug}`,
    gorsel: list[0]?.foto[0],
    anahtar: v.anahtar,
  });
}

export default function OfisProjeleriSayfasi() {
  return <TipVitrini tip="OFIS" />;
}
