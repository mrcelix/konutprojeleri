import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import { dilAlternatifleriEn } from '@/lib/i18n';
import { metinler } from '@/lib/icerik';
import { getBolgelerEn } from '@/lib/queries-en';
import { VARSAYILAN_OG } from '@/lib/seo';
import { site } from '@/lib/site';

export const revalidate = 3600;

const BASLIK = 'Districts with New Developments in Türkiye';
const ACIKLAMA =
  'Ataşehir, Başakşehir, Kartal, Çankaya, Bornova and Nilüfer — compare the districts '
  + 'where new stock is being built, by character, transport and who lives there.';

export function generateMetadata(): Metadata {
  const alt = dilAlternatifleriEn('/en/regions')!;
  return {
    title: BASLIK, description: ACIKLAMA, alternates: alt,
    openGraph: {
      type: 'website', siteName: site.ad, locale: 'en_GB',
      url: alt.canonical, title: BASLIK, description: ACIKLAMA,
      /* Paylaşım kartı görseli: Türkçe tarafta `meta()` varsayılanı
         koyuyor, İngilizce sayfalar kendi metadata'sını yazdığı için
         atlanmıştı ve kart görselsiz çıkıyordu. */
      images: [{ url: VARSAYILAN_OG, width: 1200, height: 630, alt: BASLIK }],
    },
    twitter: { card: 'summary_large_image', title: BASLIK, description: ACIKLAMA, images: [VARSAYILAN_OG] },
  };
}

export default async function EnRegions() {
  const [bolgeler, m] = await Promise.all([getBolgelerEn(), metinler('en')]);

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      <Breadcrumbs items={[{ ad: 'Home', yol: '/en' }, { ad: 'Regions', yol: '/en/regions' }]} />

      <h1 className="h1" style={{ marginTop: 12 }}>Districts with new developments</h1>
      <p className="muted" style={{ maxWidth: 680, marginTop: 12, fontSize: 16 }}>
        {m('int.bolgeler.giris')}
      </p>

      <div className="bolge-liste" style={{ marginTop: 32 }}>
        {bolgeler.map((b) => (
          <Link key={b.slug} className="bolge-satir" href={`/en/developments/${b.slug}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.img} alt={`${b.ad}, ${b.il}`} loading="lazy" width={160} height={110} />
            <div>
              <h2 className="h3">{b.ad}</h2>
              <p className="tiny dim">{b.il} · {b.projeSayisi} developments</p>
              <p className="muted small" style={{ marginTop: 6 }}>
                {b.ozet}
              </p>
            </div>
            <Icon n="arrowR" s={18} />
          </Link>
        ))}
      </div>
    </div>
  );
}
