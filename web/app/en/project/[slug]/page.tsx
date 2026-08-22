import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { dilAlternatifleriEn } from '@/lib/i18n';
import { getProjeEn, getProjelerEn } from '@/lib/queries-en';
import { VARSAYILAN_OG } from '@/lib/seo';
import { site } from '@/lib/site';

/* ============================================================
   İngilizce proje sayfası.

   Türkçe karşılığından DAHA SADE ve bu bilinçli: talep formu, fiyat
   alarmı, karşılaştırma panosu ve soru formu burada YOK. Hepsi
   istemci bileşeni ve hepsi Türkçe metin basıyor; yarı çevrilmiş bir
   form, hiç olmayan bir formdan kötü. İngilizce okur satış ekibine
   e-postayla yönlendiriliyor.

   SAYFANIN İŞİ BİLGİ VERMEK: daire tipi tablosu, ödeme koşulları ve
   teslim tarihi. Bunlar İngilizce okurun form doldurmadan önce
   sorduğu şeyler ve hepsi dilden bağımsız veri.
   ============================================================ */

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const list = await getProjelerEn();
  return list.map((p) => ({ slug: p.slug }));
}

const TL = (n: number) => `TRY ${new Intl.NumberFormat('en-GB').format(n)}`;
const TLkisa = (n: number) =>
  `TRY ${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(n / 1_000_000)}M`;

/** Delivery is a quarter, never a day — quoting a day promises what cannot be kept. */
function ceyrek(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
}

const TIP_ADI: Record<string, string> = {
  KONUT: 'Residential', VILLA: 'Villa', OFIS: 'Office', KARMA: 'Mixed use',
};
const DURUM_ADI: Record<string, string> = {
  YAKINDA: 'Coming soon', SATISTA: 'On sale', SON_DAIRELER: 'Final units',
  TUKENDI: 'Sold out', TESLIM_EDILDI: 'Delivered',
};

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProjeEn(slug);
  if (!p) return {};

  const baslik = `${p.ad} — ${p.bolge}, ${p.il}`;
  const alt = dilAlternatifleriEn(`/en/project/${p.slug}`);
  return {
    title: baslik,
    description: p.ozet,
    ...(alt ? { alternates: alt } : {}),
    openGraph: {
      type: 'website', siteName: site.ad, locale: 'en_GB',
      url: alt?.canonical, title: baslik, description: p.ozet,
      images: [{ url: p.foto[0] || VARSAYILAN_OG, width: 1200, height: 630, alt: p.fotoAlt[0] ?? baslik }],
    },
    twitter: {
      card: 'summary_large_image', title: baslik, description: p.ozet,
      images: [p.foto[0] || VARSAYILAN_OG],
    },
  };
}

export default async function EnProjeSayfasi(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const p = await getProjeEn(slug);
  if (!p) notFound();

  const teslim = ceyrek(p.teslimTarihi);
  const alinamaz = p.durum === 'TUKENDI' || p.durum === 'TESLIM_EDILDI';

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      {/* Yapılandırılmış veri: fiyat ARALIK olarak veriliyor. Tek bir
          rakam vermek, en küçük tipin fiyatını projenin fiyatı gibi
          göstermek olurdu. */}
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': p.tip === 'VILLA' ? 'SingleFamilyResidence' : 'ApartmentComplex',
        name: p.ad,
        description: p.ozet,
        inLanguage: 'en-GB',
        url: `${site.url}/en/project/${p.slug}`,
        image: p.foto,
        address: {
          '@type': 'PostalAddress',
          addressLocality: p.bolge,
          addressRegion: p.il,
          addressCountry: 'TR',
        },
        geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
        numberOfAvailableAccommodationUnits: p.toplamBagimsizBolum ?? undefined,
      }} />

      <Breadcrumbs items={[
        { ad: 'Home', yol: '/en' },
        { ad: 'Regions', yol: '/en/regions' },
        { ad: p.bolge, yol: `/en/developments/${p.bolgeSlug}` },
        { ad: p.ad, yol: `/en/project/${p.slug}` },
      ]} />

      <div className="detail-head" style={{ marginTop: 12 }}>
        <div>
          <span className="badge">{TIP_ADI[p.tip] ?? p.tip}</span>{' '}
          <span className="badge">{DURUM_ADI[p.durum] ?? p.durum}</span>
          <h1 className="h1" style={{ marginTop: 10 }}>{p.ad}</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            <Icon n="pin" s={14} /> {p.mahalle}, {p.bolge}, {p.il}
          </p>
          <p className="muted" style={{ marginTop: 4 }}>
            <Icon n="building" s={14} />{' '}
            <Link href={`/en/developer/${p.firmaSlug}`}>{p.firmaAd}</Link>
            {p.firmaTamamlanan > 0 && ` · ${p.firmaTamamlanan} completed developments`}
          </p>
        </div>
      </div>

      <div className="gallery" style={{ marginTop: 20 }}>
        {p.foto.slice(0, 5).map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt={p.fotoAlt[i] ?? p.ad} loading={i === 0 ? 'eager' : 'lazy'} />
        ))}
      </div>

      <p className="muted" style={{ maxWidth: '68ch', marginTop: 22, fontSize: 16 }}>{p.ozet}</p>

      <section style={{ marginTop: 30 }}>
        <h2 className="h2">Key facts</h2>
        <div className="detail-kunye" style={{ marginTop: 12 }}>
          <span><Icon n="wallet" s={15} /> From {TLkisa(p.fiyatMin)}
            {p.fiyatMax ? ` to ${TLkisa(p.fiyatMax)}` : ''}</span>
          {teslim && <span><Icon n="clock" s={15} /> Delivery {teslim}</span>}
          <span><Icon n="crane" s={15} /> {p.ilerlemeYuzde}% complete</span>
          {p.blokSayisi && <span><Icon n="building" s={15} /> {p.blokSayisi} blocks</span>}
          {p.toplamBagimsizBolum && (
            <span><Icon n="grid" s={15} /> {p.toplamBagimsizBolum} units</span>
          )}
          {/* Peşinat 0 "belirtilmemiş" demek, "peşinatsız" değil —
              satır o durumda hiç basılmıyor. */}
          {p.pesinatOrani > 0 && (
            <span><Icon n="percent" s={15} /> {p.pesinatOrani}% down payment</span>
          )}
          {p.taksitAyi > 0 && (
            <span><Icon n="cal" s={15} /> {p.taksitAyi} monthly instalments</span>
          )}
          {p.krediyeUygun && <span><Icon n="check" s={15} /> Mortgage eligible</span>}
        </div>
      </section>

      {p.daireTipleri.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <h2 className="h2">Unit types</h2>
          {/* NET VE BRÜT AYRI SÜTUN: aradaki fark %15–25 ve alıcının en
              sık yanıldığı yer. Tek bir "size" sütunu yanıltıcı olurdu. */}
          <div className="p-tablo-kap" style={{ marginTop: 12 }}>
            <table className="p-tablo">
              <thead>
                <tr>
                  <th>Type</th><th>Rooms</th><th className="sayi">Gross m²</th>
                  <th className="sayi">Net m²</th><th className="sayi">Baths</th>
                  <th className="sayi">Price</th><th className="sayi">Left</th>
                </tr>
              </thead>
              <tbody>
                {p.daireTipleri.map((d) => (
                  <tr key={d.id}>
                    <td><b>{d.ad}</b></td>
                    <td>{d.oda}</td>
                    <td className="sayi">{d.brutM2}</td>
                    <td className="sayi">{d.netM2 ?? '—'}</td>
                    <td className="sayi">{d.banyo}</td>
                    <td className="sayi">
                      {d.fiyatMin ? TL(d.fiyatMin) : '—'}
                      {d.fiyatMax && d.fiyatMin !== d.fiyatMax ? ` – ${TL(d.fiyatMax)}` : ''}
                    </td>
                    <td className="sayi">{d.kalan ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {p.ozellikler.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <h2 className="h2">Amenities</h2>
          <div className="chips" style={{ marginTop: 12 }}>
            {p.ozellikler.map((o) => <span className="chip" key={o.kod}>{o.ad}</span>)}
          </div>
        </section>
      )}

      <section className="kart" style={{ marginTop: 34, padding: '22px 24px' }}>
        <h2 className="h3">Interested?</h2>
        {alinamaz ? (
          /* Tükenmiş projede iletişim çağrısı YOK: satılamayan bir şey
             için satış ekibini aramak iki tarafın da vaktini alıyor. */
          <p className="muted small" style={{ marginTop: 10, maxWidth: '58ch' }}>
            This development is no longer on sale. Browse current developments in{' '}
            <Link href={`/en/developments/${p.bolgeSlug}`}>{p.bolge}</Link>.
          </p>
        ) : (
          <>
            <p className="muted small" style={{ marginTop: 10, maxWidth: '58ch' }}>
              Email us with the development name and we will put you in touch with
              the sales team. We reply in English, and we take no commission.
            </p>
            <p style={{ marginTop: 16 }}>
              <a className="btn btn-cta" href={`mailto:${site.eposta}?subject=${encodeURIComponent(p.ad)}`}>
                <Icon n="phone" s={15} /> {site.eposta}
              </a>
            </p>
          </>
        )}
        <p className="tiny dim" style={{ marginTop: 14 }}>
          Prices and delivery dates are the developer’s own figures, updated from
          their panel. Confirm them in your conversation.
        </p>
      </section>
    </div>
  );
}
