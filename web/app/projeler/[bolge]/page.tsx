import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ProjeKart from '@/components/ProjeKart';
import { bolgeYazilari } from '@/lib/yazi';
import {
  getBolge, getBolgeler, getLandingOzellikler, getProjelerByBolge,
} from '@/lib/queries';
import { TLkisa, teslimCeyrek } from '@/lib/bicim';
import { bolgeLd, breadcrumbLd, faqLd, itemListLd, meta } from '@/lib/seo';
import { bulunma, yonelme } from '@/lib/turkce';
import type { Proje } from '@/lib/types';

export const revalidate = 3600;
export const dynamicParams = false;

export async function generateStaticParams() {
  const bolgeler = await getBolgeler();
  return bolgeler.map((b) => ({ bolge: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ bolge: string }> }): Promise<Metadata> {
  const { bolge } = await params;
  const b = await getBolge(bolge);
  if (!b) return {};

  const list = await getProjelerByBolge(bolge);
  const enDusuk = list.length ? Math.min(...list.map((p) => p.fiyatMin)) : 0;

  return meta({
    baslik: `${b.ad} Konut Projeleri — ${b.il}`,
    /* Bölge özeti META AÇIKLAMASINA EKLENMİYOR: editöryel özet 200+
       karakter ve eklendiğinde açıklama 300'ü geçip arama sonucunda
       ortasından kesiliyordu. Sayfada zaten tam hâliyle duruyor. */
    aciklama: `${b.ad} yeni konut, villa ve ofis projeleri: ${list.length} proje, `
      + `kat planı, daire tipi ve teslim tarihleriyle.`
      + `${enDusuk ? ` ${TLkisa(enDusuk)}'den başlayan fiyatlar.` : ''}`,
    yol: `/projeler/${b.slug}`,
    gorsel: b.img,
    anahtar: [
      `${b.ad} konut projeleri`, `${b.ad} yeni proje`, `${b.ad} satılık daire`,
      `${b.il} konut projeleri`, `${b.ad} sıfır daire`, `${b.ad} villa projeleri`,
    ],
  });
}

/** Teslim yılına göre gruplama — "ne zaman oturabilirim" sorusu. */
function teslimGruplari(list: Proje[]) {
  const gruplar = new Map<string, number>();
  for (const p of list) {
    const anahtar = p.teslim ? String(new Date(p.teslim).getUTCFullYear()) : 'Açıklanmadı';
    gruplar.set(anahtar, (gruplar.get(anahtar) ?? 0) + 1);
  }
  return [...gruplar.entries()]
    .sort((a, b) => (a[0] === 'Açıklanmadı' ? 1 : b[0] === 'Açıklanmadı' ? -1 : a[0].localeCompare(b[0])));
}

export default async function BolgeSayfasi({ params }: { params: Promise<{ bolge: string }> }) {
  const { bolge } = await params;
  const b = await getBolge(bolge);
  if (!b) notFound();

  const [list, landing, yazilar] = await Promise.all([
    getProjelerByBolge(bolge),
    getLandingOzellikler(),
    bolgeYazilari(b.slug, 3),
  ]);

  const c = b.icerik;
  const enDusuk = list.length ? Math.min(...list.map((p) => p.fiyatMin)) : 0;
  const teslimler = teslimGruplari(list);

  /* İniş sayfası bağlantısı YALNIZCA sonucu olan kombinasyon için:
     boş bir "kapalı havuzlu projeler" bağlantısı, olmayan envanteri
     vaat ediyor ve tarama bütçesini de harcıyor. */
  const kombinasyonlar = landing.filter((o) => list.some((p) => p.ozellik.includes(o.key)));

  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: `${b.ad} projeleri`, yol: `/projeler/${b.slug}` },
  ];

  const bolumler = [
    { id: 'projeler', ad: 'Projeler' },
    { id: 'nerede', ad: 'Mevkiler' },
    { id: 'yatirim', ad: 'Yatırım notu' },
    { id: 'ulasim', ad: 'Ulaşım' },
    { id: 'cevre', ad: 'Çevrede ne var' },
    { id: 'ipuclari', ad: 'İpuçları' },
    { id: 'sss', ad: 'Sık sorulanlar' },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbLd(kirintilar),
        bolgeLd(b, list.length, enDusuk),
        itemListLd(list, `${b.ad} konut projeleri`),
        faqLd(c.sss),
      ]} />

      <div className="wrap">
        <Breadcrumbs items={kirintilar} />

        {/* ---------- Başlık ---------- */}
        <section className="landing-hero">
          <div>
            <span className="eyebrow">{b.il}</span>
            <h1 className="h1" style={{ marginTop: 8 }}>{b.ad} Konut Projeleri</h1>
            <p className="prose" style={{ marginTop: 14 }}>{b.ozet}</p>
            {/* Sayaçlar CANLI envanterden. Sabit bir pazarlama rakamı
                yazmak, listede dört proje varken "24 proje" demek
                olurdu ve sayfanın kendisi onu yalanlıyordu. */}
            <div className="landing-stats">
              <div><b>{list.length}</b><span>satıştaki proje</span></div>
              {enDusuk > 0 && (
                <div><b>{TLkisa(enDusuk)}</b><span>başlangıç fiyatı</span></div>
              )}
              <div>
                <b>{new Set(list.map((p) => p.firma.slug)).size}</b>
                <span>geliştirici firma</span>
              </div>
              <div>
                <b>{list.filter((p) => p.durum === 'YAKINDA').length}</b>
                <span>lansman öncesi</span>
              </div>
            </div>
          </div>
          <div className="art">
            <Image
              src={b.img} alt={`${b.ad}, ${b.il} — konut projeleri bölgesi`}
              fill priority sizes="(max-width: 1180px) 100vw, 40vw" style={{ objectFit: 'cover' }}
            />
          </div>
        </section>

        {/* ---------- İçindekiler ---------- */}
        <nav className="toc" aria-label="Sayfa içeriği">
          {bolumler.map((s) => <a key={s.id} href={`#${s.id}`}>{s.ad}</a>)}
        </nav>

        {/* ---------- Giriş ---------- */}
        <section className="section" style={{ paddingBottom: 20 }}>
          <div className="prose">
            {c.giris.map((metin, i) => <p key={i}>{metin}</p>)}
          </div>
        </section>

        {/* ---------- Projeler ---------- */}
        <section className="section" id="projeler" style={{ paddingTop: 10, scrollMarginTop: 100 }}>
          <div className="section-head">
            <div>
              <h2 className="h2">{b.ad} projeleri</h2>
              <p className="sonuc-sayi">
                {b.ad} için <b>{list.length}</b> proje listeleniyor. Fiyatlar
                başlangıç fiyatlarıdır; kat, cephe ve ödeme planına göre değişiyor.
              </p>
            </div>
            <Link className="link-more" href={`/arama?bolge=${b.slug}`}>
              Filtreleyerek ara <Icon n="arrowR" s={16} />
            </Link>
          </div>

          {/* Teslim yılı dağılımı: "ne zaman oturabilirim" sorusunun
              bölge ölçeğindeki cevabı ve aynı çeyrekte teslim edilecek
              proje yoğunluğunu da gösteriyor. */}
          {teslimler.length > 1 && (
            <p className="bolge-satilik">
              <Icon n="clock" s={15} /> Teslim dağılımı:{' '}
              {teslimler.map(([yil, adet], i) => (
                <span key={yil}>
                  {i > 0 && ' · '}<b>{adet}</b> proje {yil === 'Açıklanmadı' ? 'tarihi açıklanmadı' : yil}
                </span>
              ))}
            </p>
          )}

          {list.length === 0 ? (
            <p className="bos-durum">
              {bulunma(b.ad)} şu an satışta proje yok. Yeni proje eklendiğinde
              haberdar olmak için <Link href="/arama">arama sayfasından</Link> takip
              kurabilirsiniz.
            </p>
          ) : (
            <div className="grid-projeler cols-3">
              {list.map((p, i) => <ProjeKart key={p.id} p={p} oncelikli={i < 2} />)}
            </div>
          )}
        </section>

        {/* ---------- Mevkiler ---------- */}
        {c.mevkiler.length > 0 && (
          <section className="section" id="nerede" style={{ paddingTop: 0, scrollMarginTop: 100 }}>
            <div className="section-head">
              <div>
                <h2 className="h2">{bulunma(b.ad)} hangi mevki?</h2>
                <p>Mahalleler arasındaki fark fiyatı ve günlük yaşamı belirliyor.</p>
              </div>
            </div>
            <div className="kart-agi">
              {c.mevkiler.map((m) => (
                <article key={m.ad} className="bilgi-kart">
                  <h3>{m.ad}</h3>
                  <p>{m.metin}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Yatırım notu ---------- */}
        {c.yatirim.length > 0 && (
          <section className="section" id="yatirim" style={{ paddingTop: 0, scrollMarginTop: 100 }}>
            <div className="section-head">
              <div>
                <h2 className="h2">{b.ad} için yatırım notu</h2>
                <p>
                  Bölgenin talebini ve risklerini belirleyen etkenler. Getiri oranı
                  vermiyoruz — bölgeye ve döneme göre çok değişken ve tahmin olarak
                  sunulan her rakam yanıltıcı olur.
                </p>
              </div>
            </div>
            <div className="kart-agi">
              {c.yatirim.map((y) => (
                <article key={y.baslik} className="bilgi-kart">
                  <h3>{y.baslik}</h3>
                  <p>{y.not}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Ulaşım ---------- */}
        {c.ulasim.length > 0 && (
          <section className="section" id="ulasim" style={{ paddingTop: 0, scrollMarginTop: 100 }}>
            <div className="section-head">
              <div>
                <h2 className="h2">{yonelme(b.ad)} ulaşım</h2>
                <p>Kapıdan kapıya süreler yaklaşık; trafik yoğunluğuna göre değişiyor.</p>
              </div>
            </div>
            <table className="mesafe-tablo">
              <tbody>
                {c.ulasim.map((u) => (
                  <tr key={u.yol}><th scope="row">{u.yol}</th><td>{u.sure}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ---------- Çevre ---------- */}
        {c.cevre.length > 0 && (
          <section className="section" id="cevre" style={{ paddingTop: 0, scrollMarginTop: 100 }}>
            <div className="section-head">
              <div>
                <h2 className="h2">{bulunma(b.ad)} çevrede ne var?</h2>
                <p>Okul, sağlık, alışveriş ve yeşil alan erişimi.</p>
              </div>
            </div>
            <div className="kart-agi">
              {c.cevre.map((x) => (
                <article key={x.ad} className="bilgi-kart">
                  <h3>{x.ad}</h3>
                  <p>{x.metin}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ---------- İpuçları ---------- */}
        {c.ipuclari.length > 0 && (
          <section className="section" id="ipuclari" style={{ paddingTop: 0, scrollMarginTop: 100 }}>
            <div className="section-head">
              <div><h2 className="h2">{b.ad} için pratik notlar</h2></div>
            </div>
            <ul className="ipucu-liste">
              {c.ipuclari.map((ip) => (
                <li key={ip}><Icon n="check" s={16} /> {ip}</li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------- Özelliğe göre ---------- */}
        {kombinasyonlar.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="section-head">
              <div><h2 className="h2">{bulunma(b.ad)} özelliğe göre</h2></div>
            </div>
            <div className="etiket-serit">
              {kombinasyonlar.map((o) => (
                <Link key={o.slug} className="badge" href={`/projeler/${b.slug}/${o.slug}`}>
                  <Icon n={o.ikon} s={14} /> {o.baslik}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---------- SSS ---------- */}
        {c.sss.length > 0 && (
          <section className="section" id="sss" style={{ paddingTop: 0, scrollMarginTop: 100 }}>
            <div className="section-head">
              <div><h2 className="h2">{b.ad} hakkında sık sorulanlar</h2></div>
            </div>
            <div className="sss-liste">
              {c.sss.map((f) => (
                <details key={f.s}>
                  <summary>{f.s}</summary>
                  <p>{f.c}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Rehber ---------- */}
        {yazilar.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <div className="section-head">
              <div><h2 className="h2">{b.ad} rehberi</h2></div>
              <Link className="link-more" href="/rehber">Tüm yazılar <Icon n="arrowR" s={16} /></Link>
            </div>
            <div className="kart-agi">
              {yazilar.map((y) => (
                <article key={y.slug} className="bilgi-kart">
                  <h3><Link href={`/rehber/${y.slug}`}>{y.baslik}</Link></h3>
                  <p>{y.ozet}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
