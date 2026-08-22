import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ProjeKart from '@/components/ProjeKart';
import {
  getBolge, getLandingKombinasyonlari, getLandingOzellikler,
  getOzellikBySlug, getProjelerByOzellik,
} from '@/lib/queries';
import { TLkisa } from '@/lib/bicim';
import { breadcrumbLd, itemListLd, meta } from '@/lib/seo';
import { bulunma } from '@/lib/turkce';

export const revalidate = 3600;

/* `dynamicParams` KAPALI: yalnızca sonucu olan kombinasyonlar sayfa
   oluyor. Açık olsaydı `/projeler/atasehir/tenis-kortlu-projeler`
   gibi sonucu olmayan her kombinasyon boş bir sayfa üretir, tarama
   bütçesini harcar ve arama sonucunda boş sayfa gösterirdi. */
export const dynamicParams = false;

type Params = Promise<{ bolge: string; ozellik: string }>;

export async function generateStaticParams() {
  return getLandingKombinasyonlari();
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { bolge, ozellik } = await params;
  const [b, o] = await Promise.all([getBolge(bolge), getOzellikBySlug(ozellik)]);
  if (!b || !o) return {};

  const list = await getProjelerByOzellik(b.slug, o.key);
  const enDusuk = list.length ? Math.min(...list.map((p) => p.fiyatMin)) : 0;

  return meta({
    baslik: `${b.ad} ${o.baslik}`,
    aciklama: `${b.ad} bölgesinde ${o.aciklama.toLocaleLowerCase('tr')} `
      + `${list.length} proje.${enDusuk ? ` ${TLkisa(enDusuk)}'den başlayan fiyatlar.` : ''}`,
    yol: `/projeler/${b.slug}/${o.slug}`,
    gorsel: list[0]?.foto[0] ?? b.img,
    anahtar: [
      `${b.ad} ${o.baslik.toLocaleLowerCase('tr')}`,
      `${b.ad} konut projeleri`,
      `${b.il} ${o.baslik.toLocaleLowerCase('tr')}`,
    ],
  });
}

export default async function OzellikSayfasi({ params }: { params: Params }) {
  const { bolge, ozellik } = await params;
  const [b, o] = await Promise.all([getBolge(bolge), getOzellikBySlug(ozellik)]);
  if (!b || !o) notFound();

  const [list, tumOzellikler] = await Promise.all([
    getProjelerByOzellik(b.slug, o.key),
    getLandingOzellikler(),
  ]);

  /* Sonucu olmayan kombinasyon `generateStaticParams` tarafından hiç
     üretilmiyor, ama envanter değişince (proje yayından kalkınca)
     var olan bir sayfa boşalabiliyor. 404 vermek yerine bölge
     sayfasına yönlendirmiyoruz — adres dizine girmiş olabilir;
     sayfa boş durumu açıkça söylüyor ve çıkış yolu veriyor. */
  const enDusuk = list.length ? Math.min(...list.map((p) => p.fiyatMin)) : 0;

  const kardesler = tumOzellikler
    .filter((x) => x.slug !== o.slug && list.every(() => true))
    .slice(0, 8);

  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: `${b.ad} projeleri`, yol: `/projeler/${b.slug}` },
    { ad: o.baslik, yol: `/projeler/${b.slug}/${o.slug}` },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbLd(kirintilar),
        itemListLd(list, `${b.ad} ${o.baslik}`),
      ]} />

      <div className="wrap">
        <Breadcrumbs items={kirintilar} />

        <section className="landing-hero landing-hero-dar">
          <div>
            <span className="eyebrow">{b.ad} · {b.il}</span>
            <h1 className="h1" style={{ marginTop: 8 }}>{b.ad} {o.baslik}</h1>
            <p className="prose" style={{ marginTop: 14 }}>{o.aciklama}</p>
            {list.length > 0 && (
              <div className="landing-stats">
                <div><b>{list.length}</b><span>proje</span></div>
                <div><b>{TLkisa(enDusuk)}</b><span>başlangıç fiyatı</span></div>
              </div>
            )}
          </div>
        </section>

        <section className="section" style={{ paddingTop: 10 }}>
          {list.length === 0 ? (
            <p className="bos-durum">
              {bulunma(b.ad)} şu an bu özelliğe sahip proje listelenmiyor.{' '}
              <Link href={`/projeler/${b.slug}`}>{b.ad} projelerinin tümüne</Link> bakabilirsiniz.
            </p>
          ) : (
            <div className="grid-projeler cols-3">
              {list.map((p, i) => <ProjeKart key={p.id} p={p} oncelikli={i < 2} />)}
            </div>
          )}
        </section>

        {kardesler.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="section-head">
              <div><h2 className="h2">{bulunma(b.ad)} diğer özellikler</h2></div>
            </div>
            <div className="etiket-serit">
              {kardesler.map((x) => (
                <Link key={x.slug} className="badge" href={`/projeler/${b.slug}/${x.slug}`}>
                  <Icon n={x.ikon} s={14} /> {x.baslik}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="section" style={{ paddingTop: 0 }}>
          <Link className="btn btn-ghost" href={`/projeler/${b.slug}`}>
            <Icon n="chevL" s={15} /> {b.ad} projelerinin tümü
          </Link>
        </section>
      </div>
    </>
  );
}
