import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { projeDetayGetir } from '@/lib/queries/proje';
import { daireTipiCoz } from '@/lib/routing';
import { para, m2Birim, alan } from '@/lib/format';

/**
 * Kat planı sayfası — /istanbul/kadikoy/benesta-benleo-acibadem/2-1-kat-plani
 *
 * Ayrı URL almasının sebebi somut: "X projesi 2+1 kat planı" düzenli aranan
 * bir kalıp ve proje detay sayfası bu sorguyu karşılamıyor.
 *
 * Sayfanın özgün içeriği ODA ODA ALAN TABLOSU — her tip için farklı,
 * gerçek veri. Şablon metin değil, dolayısıyla ince içerik riski yok.
 *
 * İNDEKSLEME KURALI: plan görseli yüklenmemişse sayfa hiç açılmaz.
 * 1.240 proje × 4 tip = binlerce boş sayfa üretmemek için.
 */

export const revalidate = 3600;

type Params = { params: Promise<{ il: string; ilce: string; slug: string; plan: string }> };

function planCoz(plan: string): string | null {
  const m = /^(.+)-kat-plani$/.exec(plan);
  return m ? daireTipiCoz(m[1]!) : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { il, ilce, slug, plan } = await params;
  const tip = planCoz(plan);
  if (!tip) return {};

  const p = await projeDetayGetir(il, ilce, slug);
  const d = p?.daire_tipleri.find((x) => x.tip === tip);
  if (!p || !d) return {};

  return {
    title: `${p.ad} ${tip} Kat Planı — ${d.net_m2 ?? '—'} m²`,
    description:
      `${p.ad} ${tip} kat planı: ${alan(d.net_m2, d.brut_m2) ?? ''}. ` +
      (d.liste_fiyati ? `${para(d.liste_fiyati)}'den. ` : '') +
      `${p.ilce}, ${p.il}.`,
    alternates: { canonical: `/${il}/${ilce}/${slug}/${plan}` },
  };
}

export default async function KatPlaniSayfasi({ params }: Params) {
  const { il, ilce, slug, plan } = await params;
  const tip = planCoz(plan);
  if (!tip) notFound();

  const p = await projeDetayGetir(il, ilce, slug);
  const d = p?.daire_tipleri.find((x) => x.tip === tip);

  // Plan görseli yoksa sayfa yayınlanmaz
  if (!p || !d || !d.kat_plani_key) notFound();

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-6)' }}>
      <nav className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>
        {p.il} › {p.ilce} › {p.ad} › {tip} Kat Planı
      </nav>

      <h1 className="kp-h1">{p.ad} {tip} Kat Planı</h1>
      <p className="kp-lead">
        {alan(d.net_m2, d.brut_m2)} net kullanım alanına sahip {tip} tipi.
        {d.kalan_adet != null && ` Projede bu tipten ${d.kalan_adet} daire müsait.`}
      </p>

      {/* Teknik çizim ASLA ters çevrilmez — koyu temada da beyaz zeminde durur */}
      <figure className="kat-plani kp-card" style={{ padding: 'var(--s-5)', margin: 'var(--s-5) 0' }}>
        {/* TODO aşama 4: yakınlaştırmalı görüntüleyici, ölçü ve mobilya katmanları */}
        <img src={`${process.env.NEXT_PUBLIC_CDN_URL}/${d.kat_plani_key}`} alt={`${p.ad} ${tip} kat planı, ${d.net_m2} m² net`} />
      </figure>

      <div className="kp-card" style={{ padding: 'var(--s-5)' }}>
        <h2 className="kp-h2">Özet</h2>
        <dl className="kp-lead" style={{ display: 'grid', gap: 6 }}>
          <div><b>Fiyat:</b> {para(d.liste_fiyati) ?? 'Firmadan isteyin'}</div>
          <div><b>m² birim:</b> {m2Birim(d.liste_fiyati, d.net_m2) ?? '—'}</div>
          <div><b>Net / brüt:</b> {alan(d.net_m2, d.brut_m2) ?? '—'}</div>
        </dl>
      </div>

      {/* TODO aşama 4: oda oda alan tablosu — bu sayfanın özgün içeriği */}
    </main>
  );
}
