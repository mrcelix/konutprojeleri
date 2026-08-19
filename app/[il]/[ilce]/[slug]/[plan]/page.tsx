import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { projeDetayGetir, taksitHesapla } from '@/lib/queries/proje';
import { daireTipiCoz, katPlaniYolu, projeYolu } from '@/lib/routing';
import { para, paraKisa, m2Birim, alan, teslim, tarih } from '@/lib/format';
import { PlanGoruntuleyici } from '@/components/PlanGoruntuleyici';
import { Pill } from '@/components/ui/Pill';

/**
 * Kat planı sayfası — /istanbul/kadikoy/benesta-benleo-acibadem/2-1-kat-plani
 *
 * Ayrı URL almasının sebebi somut: "X projesi 2+1 kat planı" düzenli aranan
 * bir kalıp ve proje detay sayfası bu sorguyu karşılamıyor — hedefi farklı.
 *
 * Sayfanın ÖZGÜN İÇERİĞİ oda oda alan tablosu. Her tip için farklı, gerçek
 * veri; şablon metin değil, dolayısıyla ince içerik riski yok.
 *
 * İNDEKSLEME KURALI: plan görseli yoksa sayfa hiç açılmaz.
 * 1.240 proje × ortalama 4 tip = binlerce boş sayfa üretmemek için.
 */

export const revalidate = 3600;

const CEPHE_ADLARI: Record<string, string> = {
  kuzey: 'kuzey', guney: 'güney', dogu: 'doğu', bati: 'batı',
  kuzeydogu: 'kuzeydoğu', kuzeybati: 'kuzeybatı',
  guneydogu: 'güneydoğu', guneybati: 'güneybatı',
};

type Params = { params: Promise<{ il: string; ilce: string; slug: string; plan: string }> };

function planCoz(plan: string): string | null {
  const m = /^(.+)-kat-plani$/.exec(plan);
  return m?.[1] ? daireTipiCoz(m[1]) : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { il, ilce, slug, plan } = await params;
  const tip = planCoz(plan);
  if (!tip) return {};

  const p = await projeDetayGetir(il, ilce, slug);
  const d = p?.daire_tipleri.find((x) => x.tip === tip);
  if (!p || !d || !d.kat_plani_key) return { robots: { index: false, follow: true } };

  return {
    title: `${p.ad} ${tip} Kat Planı — ${d.net_m2 ?? '—'} m² Net`,
    description:
      `${p.ad} ${tip} kat planı ve oda ölçüleri. ${alan(d.net_m2, d.brut_m2) ?? ''}` +
      (d.liste_fiyati ? `, ${para(d.liste_fiyati)}'den` : '') +
      `. ${p.ilce}, ${p.il}. ` +
      (p.fiyat_teyit_tarihi ? `${tarih(p.fiyat_teyit_tarihi)} güncel.` : ''),
    alternates: { canonical: `/${il}/${ilce}/${slug}/${plan}` },
  };
}

export default async function KatPlaniSayfasi({ params }: Params) {
  const { il, ilce, slug, plan } = await params;
  const tip = planCoz(plan);
  if (!tip) notFound();

  const p = await projeDetayGetir(il, ilce, slug);
  const d = p?.daire_tipleri.find((x) => x.tip === tip);

  // Plan görseli yoksa sayfa yayınlanmaz — boş sayfa üretmemek için
  if (!p || !d || !d.kat_plani_key) notFound();

  const cdn = process.env.NEXT_PUBLIC_CDN_URL ?? '';
  const odalar = d.odalar ?? [];
  const odaToplam = odalar.reduce((t, o) => t + (o.alan ?? 0), 0);

  const odeme =
    d.liste_fiyati && p.pesinat_orani && p.vade_ay
      ? taksitHesapla(d.liste_fiyati, p.pesinat_orani, p.vade_ay)
      : null;

  const digerTipler = p.daire_tipleri.filter((x) => x.tip !== tip);

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-5)' }}>
      <JsonLd p={p} d={d} tip={tip} />

      <nav className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>
        <Link href={`/${p.il}-konut-projeleri`}>{p.il}</Link> ›{' '}
        <Link href={`/${p.il}/${p.ilce}-konut-projeleri`}>{p.ilce}</Link> ›{' '}
        <Link href={projeYolu(p)}>{p.ad}</Link> › {tip} Kat Planı
      </nav>

      <h1 className="kp-h1">{p.ad} {tip} Kat Planı</h1>
      <p className="kp-lead" style={{ marginBottom: 'var(--s-4)' }}>
        {alan(d.net_m2, d.brut_m2)} net kullanım alanına sahip {tip} tipi
        {d.cephe ? `, ${CEPHE_ADLARI[d.cephe] ?? d.cephe} cepheli` : ''}
        {d.bulundugu_katlar ? ` · ${d.bulundugu_katlar} katlarında` : ''}.
        {d.kalan_adet != null && d.kalan_adet > 0 && (
          <> Projede bu tipten <b>{d.kalan_adet} daire müsait</b>.</>
        )}
        {p.fiyat_teyit_tarihi && ` Plan ve fiyat ${tarih(p.fiyat_teyit_tarihi)} tarihinde firma tarafından güncellendi.`}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 'var(--s-4)', alignItems: 'start' }}>
        <div className="kp-stack">
          {/* Tip geçişi */}
          {digerTipler.length > 0 && (
            <nav className="kp-row" style={{ gap: 5 }} aria-label="Daire tipleri">
              <span className="kp-chip is-selected">{tip}</span>
              {digerTipler.map((x) =>
                x.kat_plani_key ? (
                  <Link key={x.tip} href={katPlaniYolu(p, x.tip)} className="kp-chip">
                    {x.tip}
                  </Link>
                ) : (
                  <span key={x.tip} className="kp-chip is-empty" title="Plan yüklenmedi">
                    {x.tip}
                  </span>
                )
              )}
              <Link href={`${projeYolu(p)}#daireler`} className="kp-chip" style={{ marginLeft: 'auto' }}>
                Tüm tipleri karşılaştır
              </Link>
            </nav>
          )}

          <PlanGoruntuleyici
            kaynak={`${cdn}/${d.kat_plani_key}`}
            alt={`${p.ad} ${tip} kat planı, ${d.net_m2 ?? ''} m² net`}
            pdfKaynak={d.plan_pdf_key ? `${cdn}/${d.plan_pdf_key}` : null}
          />

          {/* ── Sayfanın özgün içeriği ── */}
          {odalar.length > 0 && (
            <section className="kp-card" style={{ padding: 'var(--s-5)' }}>
              <h2 className="kp-h2">Oda oda alanlar</h2>
              <p className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>net kullanım alanı</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }} className="tabular">
                  <thead>
                    <tr>
                      {['Mahal', 'Alan', 'Cephe', 'Not'].map((h) => (
                        <th key={h} className="kp-label" style={{ textAlign: 'left', padding: '0 9px 8px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {odalar.map((o, i) => (
                      <tr key={`${o.ad}-${i}`} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: 9, fontWeight: 650, color: 'var(--text-primary)' }}>{o.ad}</td>
                        <td style={{ padding: 9 }}>{o.alan ? `${o.alan} m²` : '—'}</td>
                        <td style={{ padding: 9 }}>{o.cephe ? (CEPHE_ADLARI[o.cephe] ?? o.cephe) : '—'}</td>
                        <td style={{ padding: 9, color: 'var(--text-muted)' }}>{o.not ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '1.5px solid var(--border-strong)' }}>
                      <td style={{ padding: 9, fontWeight: 750 }}>Toplam net</td>
                      <td style={{ padding: 9, fontWeight: 750 }}>
                        {odaToplam ? `${odaToplam.toFixed(1)} m²` : alan(d.net_m2)}
                      </td>
                      <td colSpan={2} style={{ padding: 9, color: 'var(--text-muted)' }}>
                        Brüt {d.brut_m2 ?? '—'} m² · ortak alan payı dahil
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="kp-label" style={{ marginTop: 'var(--s-3)', textTransform: 'none', letterSpacing: 0 }}>
                Çizim ölçeklidir ancak imalat toleransı nedeniyle gerçekleşen ölçüler
                yaklaşık %2&apos;ye kadar farklılık gösterebilir.
              </p>
            </section>
          )}
        </div>

        {/* Yan sütun */}
        <aside className="kp-stack" style={{ position: 'sticky', top: 16 }}>
          <div className="kp-card" style={{ padding: 'var(--s-5)' }}>
            {d.liste_fiyati ? (
              <>
                <span className="kp-label">{tip} fiyatları</span>
                <span className="kp-num" style={{ display: 'block', fontSize: 24 }}>
                  {para(d.liste_fiyati)}
                </span>
                <p className="kp-lead" style={{ fontSize: 11.5, marginTop: 3 }}>
                  {m2Birim(d.liste_fiyati, d.net_m2)} net
                  {odeme && <> · aylık {para(odeme.senet)}&apos;den</>}
                </p>
              </>
            ) : (
              <>
                <span className="kp-label">Fiyat</span>
                <p className="kp-lead" style={{ fontSize: 12 }}>Firma henüz açıklamadı.</p>
              </>
            )}

            <dl style={{ borderTop: '1px solid var(--border)', marginTop: 'var(--s-3)', paddingTop: 'var(--s-3)', display: 'grid', gap: 0 }}>
              <Satir ad="Net / brüt" deger={alan(d.net_m2, d.brut_m2)} />
              <Satir ad="Cephe" deger={d.cephe ? (CEPHE_ADLARI[d.cephe] ?? d.cephe) : null} />
              <Satir ad="Manzara" deger={d.manzara} />
              <Satir ad="Bulunduğu katlar" deger={d.bulundugu_katlar} />
              <Satir ad="Tavan yüksekliği" deger={p.tavan_yuksekligi ? `${p.tavan_yuksekligi} m` : null} />
              <Satir ad="Aidat" deger={para(p.aidat)} />
              <Satir ad="Müsait" deger={d.kalan_adet != null ? `${d.kalan_adet} daire` : null} />
              <Satir ad="Teslim" deger={teslim(p.teslim_ceyrek)} />
            </dl>

            <Link href={`${projeYolu(p)}#odeme`} className="kp-btn" style={{ width: '100%', marginTop: 'var(--s-4)' }}>
              Bu tip için fiyat listesi iste
            </Link>
          </div>

          {digerTipler.length > 0 && (
            <div className="kp-card" style={{ padding: 'var(--s-4)' }}>
              <h2 className="kp-label" style={{ marginBottom: 'var(--s-2)' }}>Projedeki diğer tipler</h2>
              {digerTipler.map((x) => (
                <Link
                  key={x.tip}
                  href={x.kat_plani_key ? katPlaniYolu(p, x.tip) : `${projeYolu(p)}#daireler`}
                  className="kp-row"
                  style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: 11.5 }}
                >
                  <span>{x.tip} · {x.net_m2 ?? '—'} m²</span>
                  <b style={{ marginLeft: 'auto' }} className="tabular">
                    {paraKisa(x.liste_fiyati) ?? 'Fiyat isteyin'}
                  </b>
                </Link>
              ))}
            </div>
          )}

          {p.benzer.length > 0 && (
            <div className="kp-card" style={{ padding: 'var(--s-4)' }}>
              <h2 className="kp-label" style={{ marginBottom: 'var(--s-2)' }}>
                {p.ilce}&apos;de benzer planlar
              </h2>
              {p.benzer.map((b) => (
                <Link
                  key={b.slug}
                  href={`/${b.il}/${b.ilce}/${b.slug}`}
                  style={{ display: 'block', padding: '6px 0', borderBottom: '1px dashed var(--border)' }}
                >
                  <b style={{ fontSize: 12, display: 'block' }}>{b.ad}</b>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }} className="tabular">
                    {paraKisa(b.min_fiyat) ?? 'Fiyat isteyin'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function Satir({ ad, deger }: { ad: string; deger: string | null | undefined }) {
  if (!deger) return null; // veri yoksa satır basılmaz
  return (
    <div className="kp-row" style={{ padding: '5px 0', fontSize: 11.5 }}>
      <dt style={{ color: 'var(--text-muted)' }}>{ad}</dt>
      <dd style={{ margin: '0 0 0 auto', fontWeight: 700 }} className="tabular">{deger}</dd>
    </div>
  );
}

function JsonLd({ p, d, tip }: { p: Awaited<ReturnType<typeof projeDetayGetir>> & object; d: { net_m2: number | null; liste_fiyati: number | null; kalan_adet: number | null; kat_plani_key: string | null }; tip: string }) {
  const cdn = process.env.NEXT_PUBLIC_CDN_URL ?? '';
  const oda = tip.split('+').reduce((t, x) => t + Number(x || 0), 0);

  const veri: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: `${p.ad} ${tip}`,
    numberOfRooms: oda,
    floorSize: d.net_m2 ? { '@type': 'QuantitativeValue', value: d.net_m2, unitCode: 'MTK' } : undefined,
    image: d.kat_plani_key ? `${cdn}/${d.kat_plani_key}` : undefined,
    containedInPlace: {
      '@type': 'ApartmentComplex',
      name: p.ad,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/${p.il}/${p.ilce}/${p.slug}`,
    },
  };

  // Fiyatı olmayan tipte offers HİÇ basılmaz
  if (d.liste_fiyati) {
    veri.offers = {
      '@type': 'Offer',
      price: d.liste_fiyati,
      priceCurrency: 'TRY',
      availability: (d.kalan_adet ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
    };
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(veri) }} />;
}
