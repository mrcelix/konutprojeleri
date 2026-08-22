import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { dilAlternatifleriEn } from '@/lib/i18n';
import ProjeKartEn from '@/components/en/ProjeKartEn';
import { getBolgeEn, getBolgelerEn, getProjelerEn } from '@/lib/queries-en';
import { VARSAYILAN_OG } from '@/lib/seo';
import { site } from '@/lib/site';

/* ============================================================
   İngilizce bölge sayfası.

   Türkçe karşılığından (`/projeler/[bolge]`) DAHA SADE: uzun kuyruk
   iniş bağlantıları, bölge yazıları ve SSS burada yok — o içeriğin
   İngilizcesi yazılmadı ve yarısı çevrilmiş bir sayfa, hiç olmayan
   bir sayfadan daha kötü.

   Kart burada ELDE ÇİZİLİYOR, `ProjeKart` kullanılmıyor: o bileşen
   Türkçe etiketler basıyor ("… kalan daire", "2027 2. çeyrek") ve
   İngilizce sayfada yarı Türkçe bir kart çıkardı.
   ============================================================ */

export const revalidate = 3600;
export const dynamicParams = false;

export async function generateStaticParams() {
  const bolgeler = await getBolgelerEn();
  return bolgeler.map((b) => ({ bolge: b.slug }));
}

const TL = (n: number) =>
  `TRY ${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(n / 1_000_000)}M`;

export async function generateMetadata(
  { params }: { params: Promise<{ bolge: string }> },
): Promise<Metadata> {
  const { bolge } = await params;
  const b = await getBolgeEn(bolge);
  if (!b) return {};

  const list = await getProjelerEn(bolge);
  const enDusuk = list.length ? Math.min(...list.map((p) => p.fiyatMin)) : 0;
  const baslik = `New Developments in ${b.ad} — ${b.il}`;
  const aciklama = `${list.length} new residential, villa and office developments in ${b.ad}, `
    + `with unit types, floor plans and delivery dates.`
    + `${enDusuk ? ` Prices from ${TL(enDusuk)}.` : ''}`;

  const alt = dilAlternatifleriEn(`/en/developments/${b.slug}`);
  return {
    title: baslik,
    description: aciklama,
    ...(alt ? { alternates: alt } : {}),
    openGraph: {
      type: 'website', siteName: site.ad, locale: 'en_GB',
      url: alt?.canonical, title: baslik, description: aciklama,
      images: [{ url: b.img || VARSAYILAN_OG, width: 1200, height: 630, alt: baslik }],
    },
    twitter: {
      card: 'summary_large_image', title: baslik, description: aciklama,
      images: [b.img || VARSAYILAN_OG],
    },
  };
}

export default async function EnBolgeSayfasi(
  { params }: { params: Promise<{ bolge: string }> },
) {
  const { bolge } = await params;
  const b = await getBolgeEn(bolge);
  if (!b) notFound();

  const list = await getProjelerEn(bolge);
  const c = b.icerik;

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `New developments in ${b.ad}`,
        description: b.ozet,
        inLanguage: 'en-GB',
        url: `${site.url}/en/developments/${b.slug}`,
      }} />

      <Breadcrumbs items={[
        { ad: 'Home', yol: '/en' },
        { ad: 'Regions', yol: '/en/regions' },
        { ad: b.ad, yol: `/en/developments/${b.slug}` },
      ]} />

      <h1 className="h1" style={{ marginTop: 12 }}>New developments in {b.ad}</h1>
      <p className="muted" style={{ maxWidth: '62ch', marginTop: 12, fontSize: 16 }}>{b.ozet}</p>

      {c && (
        <section className="prose" style={{ maxWidth: '68ch', marginTop: 28 }}>
          <p>{c.giris}</p>

          <h2>Neighbourhoods</h2>
          {c.mevkiler.map((mv) => (
            <p key={mv.baslik}><b>{mv.baslik}</b> — {mv.metin}</p>
          ))}

          <h2>Buying here</h2>
          <p>{c.yatirim}</p>

          <h2>Getting there</h2>
          <p>{c.ulasim}</p>

          <h2>Local tips</h2>
          <ul>{c.ipuclari.map((i) => <li key={i}>{i}</li>)}</ul>
        </section>
      )}

      <section style={{ marginTop: 36 }}>
        <div className="section-head">
          <div>
            <h2 className="h2">{list.length} development{list.length === 1 ? '' : 's'}</h2>
            <p className="muted">Each one visited and photographed by our team.</p>
          </div>
          <Link className="btn btn-quiet btn-sm" href="/en/search">
            All developments <Icon n="arrowR" s={15} />
          </Link>
        </div>

        {list.length === 0 ? (
          /* Boş bölge sayfası 404 DEĞİL: bölge gerçek, envanteri
             geçici olarak boş. Ziyaretçiye ne olduğu söyleniyor. */
          <div className="kart p-bos" style={{ marginTop: 16 }}>
            <Icon n="building" s={30} />
            <p>No development in {b.ad} has an English page yet.</p>
            <Link className="btn btn-primary btn-sm" href="/en/search">Browse all developments</Link>
          </div>
        ) : (
          <div className="grid-projeler cols-3" style={{ marginTop: 16 }}>
            {list.map((p) => <ProjeKartEn key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
