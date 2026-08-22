import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ProjeKart from '@/components/ProjeKart';
import { getFirma, getFirmalar, getProjelerByFirma } from '@/lib/queries';
import { DURUM_ADI, TLkisa } from '@/lib/bicim';
import { breadcrumbLd, firmaLd, itemListLd, meta } from '@/lib/seo';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const firmalar = await getFirmalar();
  return firmalar.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFirma(slug);
  if (!f) return {};

  const projeler = await getProjelerByFirma(slug);

  return meta({
    baslik: `${f.ad} — Projeleri ve Teslim Geçmişi`,
    aciklama: `${f.ad}: ${f.tamamlanan > 0 ? `${f.tamamlanan} teslim edilmiş proje, ` : ''}`
      + `sitede ${projeler.length} proje. ${f.ozet}`,
    yol: `/firma/${f.slug}`,
    gorsel: f.logo ?? projeler[0]?.foto[0],
    anahtar: [f.ad, `${f.ad} projeleri`, `${f.ad} yeni proje`, 'müteahhit', 'geliştirici firma'],
  });
}

export default async function FirmaSayfasi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await getFirma(slug);
  if (!f) notFound();

  const projeler = await getProjelerByFirma(slug);

  /* `hakkinda` panelden geliyor ve JSON; şekli bozuksa sayfa
     düşmemeli — bloklar ayıklanıyor, ayıklanamazsa bölüm hiç
     basılmıyor. */
  const hakkinda = Array.isArray(f.hakkinda)
    ? (f.hakkinda as { h?: string; p?: string; liste?: string[] }[])
    : [];

  /* Satıştaki ve teslim edilmiş projeler AYRI: firma sayfasının iki
     işi var — bugün ne satıyor ve geçmişte ne teslim etti. İkisini
     tek listede karıştırmak, teslim edilmiş bir projeyi satın
     alınabilir gibi gösteriyordu. */
  const satista = projeler.filter(
    (p) => p.durum === 'YAKINDA' || p.durum === 'SATISTA' || p.durum === 'SON_DAIRELER',
  );
  const gecmis = projeler.filter(
    (p) => p.durum === 'TUKENDI' || p.durum === 'TESLIM_EDILDI',
  );

  const enDusuk = satista.length ? Math.min(...satista.map((p) => p.fiyatMin)) : 0;
  const bolgeler = [...new Set(projeler.map((p) => p.bolge))];

  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: 'Firmalar', yol: '/firmalar' },
    { ad: f.ad, yol: `/firma/${f.slug}` },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbLd(kirintilar),
        firmaLd(f, projeler.length),
        ...(satista.length ? [itemListLd(satista, `${f.ad} projeleri`)] : []),
      ]} />

      <div className="wrap">
        <Breadcrumbs items={kirintilar} />

        <section className="landing-hero landing-hero-dar">
          <div>
            <span className="eyebrow">Geliştirici firma</span>
            <h1 className="h1" style={{ marginTop: 8 }}>{f.ad}</h1>
            <p className="prose" style={{ marginTop: 14 }}>{f.ozet}</p>

            {/* Sayaçlar VAAT DEĞİL GEÇMİŞ: "teslim edilmiş proje"
                sayısı, bir projenin zamanında biteceğine dair
                elimizdeki tek somut gösterge. */}
            <div className="landing-stats">
              {f.tamamlanan > 0 && (
                <div><b>{f.tamamlanan}</b><span>teslim edilmiş proje</span></div>
              )}
              {f.yil && <div><b>{f.yil}</b><span>kuruluş yılı</span></div>}
              {satista.length > 0 && (
                <div><b>{satista.length}</b><span>satıştaki proje</span></div>
              )}
              {enDusuk > 0 && (
                <div><b>{TLkisa(enDusuk)}</b><span>başlangıç fiyatı</span></div>
              )}
            </div>

            <p className="tiny dim" style={{ marginTop: 12 }}>
              Teslim edilmiş proje sayısı firma beyanına dayanıyor.
              {bolgeler.length > 0 && ` Sitede yer aldığı bölgeler: ${bolgeler.join(', ')}.`}
            </p>

            {(f.web || f.telefon) && (
              <div className="firma-iletisim">
                {f.web && (
                  <a className="btn btn-ghost btn-sm" href={f.web} target="_blank" rel="noopener nofollow">
                    <Icon n="arrowR" s={14} /> Firma sitesi
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Uzun tanıtım — panelden blok editörüyle giriliyor.
            `Sayfa.govde` ile AYNI şekil; ayrı bir çizici yazmak iki
            içerik biçimi öğretmek olurdu. */}
        {hakkinda.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="prose">
              {hakkinda.map((blok, i) => (
                <div key={i}>
                  {blok.h && <h2>{blok.h}</h2>}
                  {blok.p && <p>{blok.p}</p>}
                  {blok.liste && <ul>{blok.liste.map((l) => <li key={l}>{l}</li>)}</ul>}
                </div>
              ))}
            </div>
          </section>
        )}

        {satista.length > 0 && (
          <section className="section" style={{ paddingTop: 10 }}>
            <div className="section-head">
              <div><h2 className="h2">Satıştaki projeler</h2></div>
            </div>
            <div className="grid-projeler cols-3">
              {satista.map((p, i) => <ProjeKart key={p.id} p={p} oncelikli={i < 2} />)}
            </div>
          </section>
        )}

        {gecmis.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="section-head">
              <div>
                <h2 className="h2">Teslim edilmiş projeler</h2>
                <p>
                  Bu projelerde satılık bağımsız bölüm kalmadı. Firmanın
                  geçmişini gösterdiği için sayfada duruyorlar.
                </p>
              </div>
            </div>
            <ul className="gecmis-liste">
              {gecmis.map((p) => (
                <li key={p.id}>
                  <Link href={`/proje/${p.slug}`}>{p.ad}</Link>
                  <span className="tiny dim">
                    {p.mahalle}, {p.bolge} · {DURUM_ADI[p.durum]}
                    {p.olcek.bagimsizBolum && ` · ${p.olcek.bagimsizBolum} bağımsız bölüm`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {projeler.length === 0 && (
          <section className="section">
            <p className="bos-durum">
              Bu firmanın sitede yayında projesi yok.{' '}
              <Link href="/firmalar">Diğer firmalara</Link> bakabilirsiniz.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
