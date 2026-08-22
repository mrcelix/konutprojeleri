import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ProjeKart from '@/components/ProjeKart';
import { getProjelerByBolge } from '@/lib/queries';
import { breadcrumbLd, meta } from '@/lib/seo';
import { abs, site } from '@/lib/site';
import { yaziGetir, yazilar } from '@/lib/yazi';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await yazilar()).map((y) => ({ slug: y.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const y = await yaziGetir(slug);
  if (!y) return {};
  return meta({
    baslik: y.baslik, aciklama: y.ozet, yol: `/rehber/${slug}`,
    gorsel: y.kapak ?? undefined,
  });
}

const trTarih = (d: Date) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);

export default async function YaziSayfasi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const y = await yaziGetir(slug);
  if (!y) notFound();

  /* Yazı bölgeye bağlıysa o bölgenin villaları gösteriliyor: içerik ile
     envanter arasında bağ olmazsa rehber, sitenin geri kalanıyla
     konuşmayan ayrı bir ada olur. */
  const projeler = y.bolge ? (await getProjelerByBolge(y.bolge.slug)).slice(0, 3) : [];
  const digerYazilar = (await yazilar()).filter((x) => x.slug !== slug).slice(0, 3);

  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: 'Rehber', yol: '/rehber' },
    { ad: y.baslik, yol: `/rehber/${slug}` },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbLd(kirintilar),
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: y.baslik,
          description: y.ozet,
          datePublished: y.yayinTarihi.toISOString(),
          dateModified: y.guncelleme.toISOString(),
          author: { '@type': 'Organization', name: y.yazar ?? site.ad },
          publisher: { '@type': 'Organization', name: site.ad },
          mainEntityOfPage: abs(`/rehber/${slug}`),
          ...(y.kapak ? { image: y.kapak } : {}),
        },
      ]} />

      <div className="wrap" style={{ paddingBottom: 60 }}>
        <Breadcrumbs items={kirintilar} />

        <article className="yazi-sayfa">
          <header>
            {y.bolge && (
              <Link className="yazi-bolge" href={`/projeler/${y.bolge.slug}`}>
                {y.bolge.ad}
              </Link>
            )}
            <h1 className="h1" style={{ margin: '10px 0 8px' }}>{y.baslik}</h1>
            <p className="yazi-meta">
              <Icon n="clock" s={14} /> {y.okumaDk} dk okuma · {trTarih(y.yayinTarihi)}
              {y.yazar && ` · ${y.yazar}`}
            </p>
          </header>

          {y.kapak && (
            <div className="yazi-kapak">
              <Image src={y.kapak} alt="" width={1200} height={630} priority
                sizes="(max-width: 900px) 100vw, 760px" style={{ objectFit: 'cover' }} />
            </div>
          )}

          <div className="prose">
            {y.govde.map((blok, i) => (
              <div key={i}>
                {blok.h && <h2>{blok.h}</h2>}
                {blok.p && <p>{blok.p}</p>}
                {blok.liste && <ul>{blok.liste.map((l) => <li key={l}>{l}</li>)}</ul>}
              </div>
            ))}
          </div>
        </article>

        {projeler.length > 0 && y.bolge && (
          <section className="section">
            <div className="section-head">
              <div>
                <h2 className="h2">{y.bolge.ad} projeleri</h2>
                <p>Bu yazıda anlatılan bölgedeki yeni projeler.</p>
              </div>
              <Link className="link-more" href={`/projeler/${y.bolge.slug}`}>
                Tümünü gör <Icon n="arrowR" s={16} />
              </Link>
            </div>
            <div className="grid-projeler cols-3">
              {projeler.map((p) => <ProjeKart key={p.id} p={p} />)}
            </div>
          </section>
        )}

        {digerYazilar.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="section-head"><div><h2 className="h2">Diğer yazılar</h2></div></div>
            <div className="yazi-grid">
              {digerYazilar.map((d) => (
                <article className="yazi-kart" key={d.slug}>
                  <Link href={`/rehber/${d.slug}`}>
                    <div className="yazi-foto">
                      {d.kapak
                        ? <Image src={d.kapak} alt="" width={640} height={420} sizes="33vw" style={{ objectFit: 'cover' }} />
                        : <span className="bakilan-bos" aria-hidden="true"><Icon n="grid" s={24} /></span>}
                    </div>
                    <div className="yazi-govde">
                      {d.bolge && <span className="yazi-bolge">{d.bolge.ad}</span>}
                      <h3>{d.baslik}</h3>
                      <span className="yazi-meta"><Icon n="clock" s={13} /> {d.okumaDk} dk</span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
