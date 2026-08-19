import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { bolgeIcerik } from '@/lib/queries/bolge';
import { projeAra } from '@/lib/queries/proje';

/**
 * İlçe sayfası — /istanbul/kadikoy-konut-projeleri
 * Şehir şablonunun türevi; kapsam daralır, yapı aynıdır.
 *
 * İNDEKSLEME EŞİĞİ: 3 aktif proje + 120 kelime özgün metin.
 * Eşiğin altındaki sayfa noindex olur — ince içerik yığını üretmemek için.
 */

export const revalidate = 3600;

type Params = { params: Promise<{ il: string; ilce: string }> };

function ilceCoz(slug: string): string | null {
  const m = /^(.+)-konut-projeleri$/.exec(slug);
  return m?.[1] ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { il, ilce: ilceSlug } = await params;
  const ilce = ilceCoz(ilceSlug);
  if (!ilce) return {};

  const icerik = await bolgeIcerik(il, ilce);
  const indekslenebilir = icerik?.indekslenebilir ?? false;

  return {
    title: `${ilce} Konut Projeleri`,
    // Eşiği geçmeyen sayfa indekslenmez ama bağlantıları taranır
    robots: indekslenebilir ? { index: true, follow: true } : { index: false, follow: true },
    alternates: { canonical: `/${il}/${ilceSlug}` },
  };
}

export default async function IlceSayfasi({ params }: Params) {
  const { il, ilce: ilceSlug } = await params;
  const ilce = ilceCoz(ilceSlug);
  if (!ilce) notFound();

  const [icerik, projeler] = await Promise.all([
    bolgeIcerik(il, ilce),
    projeAra({ il, ilce, limit: 24 }),
  ]);

  if (projeler.length === 0) notFound();

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-6)' }}>
      <h1 className="kp-h1">{ilce} Konut Projeleri</h1>
      {icerik?.metin && <p className="kp-lead">{icerik.metin}</p>}
      <p className="kp-label" style={{ marginTop: 'var(--s-4)' }}>
        {projeler.length} proje listeleniyor
      </p>
      {/* TODO aşama 3: ProjeKarti listesi + filtre paneli */}
    </main>
  );
}
