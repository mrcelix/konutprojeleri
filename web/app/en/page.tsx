import Link from 'next/link';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ProjeKart from '@/components/ProjeKart';
import { dilAlternatifleriEn } from '@/lib/i18n';
import { metinler } from '@/lib/icerik';
import { getProjeler } from '@/lib/queries';
import { getBolgelerEn } from '@/lib/queries-en';
import { VARSAYILAN_OG } from '@/lib/seo';
import { site } from '@/lib/site';
import type { Metadata } from 'next';

export const revalidate = 3600;

const BASLIK = 'New Property Developments in Türkiye';
const ACIKLAMA =
  'New residential, villa and office developments across Türkiye, each inspected on '
  + 'site by our team. Unit types, floor plans, prices and delivery dates in the open.';

export function generateMetadata(): Metadata {
  const alt = dilAlternatifleriEn('/en')!;
  return {
    title: BASLIK,
    description: ACIKLAMA,
    alternates: alt,
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

export default async function EnHome() {
  const [bolgeler, projeler, m] = await Promise.all([
    getBolgelerEn(), getProjeler(), metinler('en'),
  ]);

  /* KART TÜRKÇE VERİDEN çiziliyor: proje adı, fiyat aralığı ve daire
     tipleri zaten dilden bağımsız. Çevrilmesi gereken tek alan özet
     ve o da proje SAYFASINDA gösteriliyor — `getProjelerEn` yalnızca
     çevirisi olanları döndürdüğü için ana sayfa vitrini boş
     kalıyordu. Vitrin dolu, detay sayfası yalnızca çevrilmişlerde
     açık. */
  const oneCikan = projeler.slice(0, 6);

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: m('int.meta.anasayfa.baslik'),
        description: m('int.meta.anasayfa.aciklama'),
        inLanguage: 'en-GB',
        isPartOf: { '@type': 'WebSite', name: site.ad, url: site.url },
      }} />

      {/* Türkçe ana sayfadaki fotoğraf bandı arama çubuğuna bağlı;
          İngilizce sayfada arama yok, bu yüzden sade açılış. */}
      <section className="hero-sade">
        <div className="wrap">
          <span className="eyebrow">{m('int.rozet')}</span>
          <h1 className="h1" style={{ maxWidth: 760 }}>{m('int.baslik')}</h1>
          <p className="muted" style={{ maxWidth: 620, marginTop: 14, fontSize: 17 }}>
            {m('int.spot')}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 26, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary btn-lg" href="/en/search">
              <Icon n="search" s={17} /> Browse developments
            </Link>
            <Link className="btn btn-ghost btn-lg" href="/en/regions">Explore districts</Link>
          </div>
        </div>
      </section>

      <section className="wrap" style={{ paddingBlock: 56 }}>
        <div className="section-head">
          <div>
            <h2 className="h2">{m('int.bolge.baslik')}</h2>
            <p className="muted">{m('int.bolge.spot')}</p>
          </div>
          <Link className="btn btn-quiet btn-sm" href="/en/regions">
            View all <Icon n="arrowR" s={15} />
          </Link>
        </div>

        <div className="bolge-grid">
          {bolgeler.slice(0, 6).map((b) => (
            <Link key={b.slug} className="bolge-kart" href={`/en/developments/${b.slug}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.img} alt={`${b.ad}, ${b.il}`} loading="lazy" />
              <div className="bolge-kart-b">
                <b>{b.ad}</b>
                <span>{b.il}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 56 }}>
        <div className="section-head">
          <div>
            <h2 className="h2">{m('int.secki.baslik')}</h2>
            <p className="muted">{m('int.secki.spot')}</p>
          </div>
          <Link className="btn btn-quiet btn-sm" href="/en/search">
            View all <Icon n="arrowR" s={15} />
          </Link>
        </div>

        <div className="grid-projeler cols-3">
          {oneCikan.map((p, i) => (
            <ProjeKart key={p.id} p={p} oncelikli={i < 3} karsilastirilabilir={false} />
          ))}
        </div>
      </section>

      <section className="wrap" style={{ paddingBottom: 72 }}>
        <div className="guven-grid">
          <div className="guven-kart">
            <Icon n="shield" s={24} />
            <h3>{m('guven.inceleme.baslik')}</h3>
            <p className="muted small">{m('guven.inceleme.metin')}</p>
          </div>
          <div className="guven-kart">
            <Icon n="scale" s={24} />
            <h3>{m('guven.fiyat.baslik')}</h3>
            <p className="muted small">{m('guven.fiyat.metin')}</p>
          </div>
          <div className="guven-kart">
            <Icon n="key" s={24} />
            <h3>{m('guven.tarafsiz.baslik')}</h3>
            <p className="muted small">{m('guven.tarafsiz.metin')}</p>
          </div>
        </div>
      </section>
    </>
  );
}
