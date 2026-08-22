import Image from 'next/image';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { metinler } from '@/lib/icerik';
import { getBolgeler, getLandingOzellikler, getProjeler } from '@/lib/queries';
import { TLkisa } from '@/lib/bicim';
import { breadcrumbLd, itemListLd, meta } from '@/lib/seo';
import { abs } from '@/lib/site';

export const revalidate = 3600;

export const metadata = meta({
  baslik: 'Konut Projeleri — Bölgeler',
  aciklama: 'İstanbul, Ankara, İzmir ve Bursa’da yeni konut, villa ve ofis projeleri. '
    + 'Bölge bölge fiyat aralıkları, proje sayıları, ulaşım süreleri ve yatırım notları.',
  yol: '/bolgeler',
  anahtar: [
    'konut projeleri bölgeler', 'istanbul konut projeleri', 'ankara konut projeleri',
    'izmir konut projeleri', 'bursa konut projeleri',
  ],
});

export default async function BolgelerSayfasi() {
  const m = await metinler('tr');
  const [BOLGELER, LANDING_OZELLIKLER, tumProjeler] = await Promise.all([
    getBolgeler(), getLandingOzellikler(), getProjeler(),
  ]);

  const bolgeninProjeleri = (slug: string) => tumProjeler.filter((p) => p.bolgeSlug === slug);

  const iller = [...new Set(BOLGELER.map((b) => b.il))];

  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: 'Bölgeler', yol: '/bolgeler' },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbLd(kirintilar),
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Konut Projeleri — Bölgeler',
          url: abs('/bolgeler'),
          isPartOf: { '@id': abs('/#website') },
        },
        itemListLd(tumProjeler, 'Türkiye konut projeleri'),
      ]} />

      <div className="wrap">
        <Breadcrumbs items={kirintilar} />

        <section style={{ padding: '26px 0 10px' }}>
          <span className="eyebrow">{iller.join(' · ')}</span>
          <h1 className="h1" style={{ marginTop: 8 }}>{m('bolgeler.baslik')}</h1>
          <p className="prose" style={{ marginTop: 14 }}>
            {BOLGELER.length} bölgede yeni konut, villa ve ofis projeleri. Her bölge
            sayfasında o bölgeye özgü mevkiler, ulaşım süreleri, çevredeki okul ve
            hastaneler ile yatırım notu bulacaksınız.
          </p>
        </section>

        <section className="section" style={{ paddingTop: 24 }}>
          <div className="grid-projeler cols-3">
            {BOLGELER.map((b) => {
              const list = bolgeninProjeleri(b.slug);
              const enDusuk = list.length ? Math.min(...list.map((p) => p.fiyatMin)) : 0;
              return (
                <article className="vcard" key={b.slug}>
                  <Link href={`/projeler/${b.slug}`}>
                    <div className="vcard-media">
                      <Image
                        src={b.img} alt={`${b.ad}, ${b.il} — konut projeleri`}
                        width={800} height={600} sizes="(max-width: 900px) 100vw, 33vw"
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    </div>
                    <div className="vcard-body">
                      <div className="vcard-head">
                        <h2 className="vcard-title" style={{ fontSize: 17 }}>
                          {b.ad} konut projeleri
                        </h2>
                      </div>
                      <div className="vcard-loc"><Icon n="pin" s={14} /> {b.il}</div>
                      <p className="small muted" style={{ marginTop: 4 }}>{b.ozet.slice(0, 120)}…</p>
                      <div className="vcard-price">
                        {/* Projesi olmayan bölgede fiyat basılmıyor: "₺0’dan
                            başlayan" cümlesi, bölge sayfasına girmeden önce
                            yanlış bir beklenti kuruyordu. */}
                        {enDusuk > 0
                          ? <><b>{TLkisa(enDusuk)}</b><span className="per">’den</span></>
                          : <b className="dim">Yakında</b>}
                        <span className="total">{b.adet} proje</span>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <div><h2 className="h2">{m('bolgeler.tip.baslik')}</h2></div>
          </div>
          <div className="seo-links">
            {LANDING_OZELLIKLER.map((o) => {
              /* Yalnızca GERÇEKTEN sonucu olan bölgeler: sonucu olmayan
                 kombinasyon için iniş sayfası hiç üretilmiyor ve
                 bağlantı 404 verirdi. */
              const bolgeler = BOLGELER
                .filter((b) => bolgeninProjeleri(b.slug).some((p) => p.ozellik.includes(o.key)))
                .slice(0, 4);
              if (!bolgeler.length) return null;
              return (
                <div key={o.slug}>
                  <h3>{o.baslik}</h3>
                  {bolgeler.map((b) => (
                    <Link key={b.slug} href={`/projeler/${b.slug}/${o.slug}`}>
                      {b.ad} {o.baslik.toLocaleLowerCase('tr')}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
