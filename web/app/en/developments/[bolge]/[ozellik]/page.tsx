import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ProjeKartEn from '@/components/en/ProjeKartEn';
import {
  getLandingKombinasyonlariEn, getLandingProjelerEn, type LandingEn,
} from '@/lib/queries-en';
import { VARSAYILAN_OG } from '@/lib/seo';
import { site } from '@/lib/site';

/* ============================================================
   İngilizce özellik iniş sayfası — /en/developments/<bölge>/<özellik>

   VERİ KATMANI HAZIRDI, SAYFA YOKTU. `getLandingKombinasyonlariEn`
   ve `getLandingProjelerEn` yazılmış, site haritası da bu adresleri
   yayınlıyordu — ama rota hiç açılmamıştı ve yaklaşık elli adres
   404 veriyordu. Aynı boşluk `/en/developments`, `/en/project` ve
   `/en/developer` için de vardı.

   hreflang BURADA ELDE veriliyor: `turkceYol()` adresten yola çıkıp
   ters eşleme yapıyor ama özellik slug'ları iki dilde farklı
   (`akilli-ev-projeleri` ↔ `smart-home-developments`) ve adresten
   türetilemiyor. Türkçe karşılık sorgudan (`trSlug`) geliyor.
   ============================================================ */

export const revalidate = 3600;
export const dynamicParams = false;

type Params = Promise<{ bolge: string; ozellik: string }>;

export async function generateStaticParams() {
  const k = await getLandingKombinasyonlariEn();
  return k.map((x) => ({ bolge: x.bolge, ozellik: x.ozellik }));
}

const TL = (n: number) =>
  `TRY ${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(n / 1_000_000)}M`;

async function kombinasyon(bolge: string, ozellik: string): Promise<LandingEn | undefined> {
  const hepsi = await getLandingKombinasyonlariEn();
  return hepsi.find((k) => k.bolge === bolge && k.ozellik === ozellik);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { bolge, ozellik } = await params;
  const k = await kombinasyon(bolge, ozellik);
  if (!k) return {};

  const list = await getLandingProjelerEn(k.bolge, k.ozellikKod);
  const enDusuk = list.length ? Math.min(...list.map((p) => p.fiyatMin)) : 0;
  const baslik = `${k.baslik} in ${k.bolgeAd}`;
  const aciklama = `${list.length} ${k.aciklama.toLowerCase()} in ${k.bolgeAd}, with unit `
    + `types, floor plans and delivery dates.${enDusuk ? ` Prices from ${TL(enDusuk)}.` : ''}`;

  const enYol = `/en/developments/${k.bolge}/${k.ozellik}`;
  const trYol = `/projeler/${k.bolge}/${k.trSlug}`;
  const kanonik = new URL(enYol, site.url).toString();

  return {
    title: baslik,
    description: aciklama,
    alternates: {
      canonical: kanonik,
      languages: {
        'tr-TR': new URL(trYol, site.url).toString(),
        'en-GB': kanonik,
        'x-default': new URL(trYol, site.url).toString(),
      },
    },
    openGraph: {
      type: 'website', siteName: site.ad, locale: 'en_GB',
      url: kanonik, title: baslik, description: aciklama,
      images: [{ url: list[0]?.foto[0] || VARSAYILAN_OG, width: 1200, height: 630, alt: baslik }],
    },
    twitter: {
      card: 'summary_large_image', title: baslik, description: aciklama,
      images: [list[0]?.foto[0] || VARSAYILAN_OG],
    },
  };
}

export default async function EnOzellikSayfasi({ params }: { params: Params }) {
  const { bolge, ozellik } = await params;
  const k = await kombinasyon(bolge, ozellik);
  if (!k) notFound();

  const [list, hepsi] = await Promise.all([
    getLandingProjelerEn(k.bolge, k.ozellikKod),
    getLandingKombinasyonlariEn(),
  ]);

  /* Kardeş bağlantılar yalnızca AYNI BÖLGEDE sonucu olan
     kombinasyonlara. `dynamicParams` kapalı; sonucu olmayan bir
     kombinasyona bağlanmak doğrudan 404 demek. */
  const kardesler = hepsi
    .filter((x) => x.bolge === k.bolge && x.ozellik !== k.ozellik)
    .slice(0, 8);

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${k.baslik} in ${k.bolgeAd}`,
        description: k.aciklama,
        inLanguage: 'en-GB',
        url: `${site.url}/en/developments/${k.bolge}/${k.ozellik}`,
      }} />

      <Breadcrumbs items={[
        { ad: 'Home', yol: '/en' },
        { ad: 'Regions', yol: '/en/regions' },
        { ad: k.bolgeAd, yol: `/en/developments/${k.bolge}` },
        { ad: k.baslik, yol: `/en/developments/${k.bolge}/${k.ozellik}` },
      ]} />

      <h1 className="h1" style={{ marginTop: 12 }}>{k.baslik} in {k.bolgeAd}</h1>
      <p className="muted" style={{ maxWidth: '62ch', marginTop: 12, fontSize: 16 }}>
        {k.aciklama}
      </p>

      <section style={{ marginTop: 32 }}>
        <div className="section-head">
          <div>
            <h2 className="h2">{list.length} development{list.length === 1 ? '' : 's'}</h2>
            <p className="muted">
              Starting prices declared by the developer. They vary by floor,
              aspect and payment plan.
            </p>
          </div>
          <Link className="btn btn-quiet btn-sm" href={`/en/developments/${k.bolge}`}>
            All in {k.bolgeAd} <Icon n="arrowR" s={15} />
          </Link>
        </div>

        {list.length === 0 ? (
          /* Boş sayfa 404 DEĞİL: kombinasyon üretildiğinde sonucu
             vardı, envanter sonradan boşalmış olabilir ve adres
             dizine girmiş olabilir. */
          <div className="kart p-bos" style={{ marginTop: 16 }}>
            <Icon n="building" s={30} />
            <p>No development here matches this feature right now.</p>
            <Link className="btn btn-primary btn-sm" href={`/en/developments/${k.bolge}`}>
              All developments in {k.bolgeAd}
            </Link>
          </div>
        ) : (
          <div className="grid-projeler cols-3" style={{ marginTop: 16 }}>
            {list.map((p) => <ProjeKartEn key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {kardesler.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <div className="section-head">
            <div><h2 className="h2">Other features in {k.bolgeAd}</h2></div>
          </div>
          <div className="etiket-serit" style={{ marginTop: 12 }}>
            {kardesler.map((x) => (
              <Link key={x.ozellik} className="chip"
                href={`/en/developments/${x.bolge}/${x.ozellik}`}>
                {x.baslik}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
