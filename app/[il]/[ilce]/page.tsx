import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bolgeIcerik } from '@/lib/queries/bolge';
import { filtreCoz } from '@/lib/filtre';
import { AramaSayfasi } from '@/components/arama/AramaSayfasi';
import { HaritaGorunumu } from '@/components/harita/HaritaGorunumu';

/**
 * İlçe sayfası — /istanbul/kadikoy-konut-projeleri
 *
 * Şehir şablonunun türevi; kapsam daralır, arama bileşeni aynıdır.
 *
 * İNDEKSLEME EŞİĞİ: 120 kelime özgün metin. Eşiğin altındaki sayfa
 * noindex olur ama bağlantıları taranır — ince içerik yığını üretmemek için.
 */

export const revalidate = 3600;

type Params = {
  params: Promise<{ il: string; ilce: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function ilceCoz(slug: string): string | null {
  const m = /^(.+)-konut-projeleri$/.exec(slug);
  return m?.[1] ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { il, ilce: ilceSlug } = await params;
  const ilce = ilceCoz(ilceSlug);
  if (!ilce) return {};

  const icerik = await bolgeIcerik(il, ilce);
  const ad = ilce.charAt(0).toUpperCase() + ilce.slice(1);

  return {
    title: `${ad} Konut Projeleri`,
    robots: icerik?.indekslenebilir
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: { canonical: `/${il}/${ilceSlug}` },
  };
}

export default async function IlceSayfasi({ params, searchParams }: Params) {
  const { il, ilce: ilceSlug } = await params;
  const q = await searchParams;
  const ilce = ilceCoz(ilceSlug);
  if (!ilce) notFound();

  const filtre = filtreCoz({ il, ilce }, q);
  const ad = ilce.charAt(0).toUpperCase() + ilce.slice(1);
  const taban = `/${il}/${ilceSlug}`;

  // Aramanın üçüncü modu. Harita dinamiktir, ISR'a girmez.
  if (q.gorunum === 'harita') {
    return <HaritaGorunumu taban={taban} baslik={`${ad} Konut Projeleri`} filtre={filtre} />;
  }

  const icerik = await bolgeIcerik(il, ilce);

  return (
    <AramaSayfasi
      taban={taban}
      baslik={`${ad} Konut Projeleri`}
      filtre={filtre}
      girisMetni={icerik?.metin ?? null}
    />
  );
}
