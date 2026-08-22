import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ProjeKart from '@/components/ProjeKart';
import { getBolgeler, getProjelerByTip } from '@/lib/queries';
import { TLkisa } from '@/lib/bicim';
import { breadcrumbLd, faqLd, itemListLd } from '@/lib/seo';
import { TIP_VITRINLERI } from '@/lib/tip-vitrin';
import type { ProjeTipi } from '@/lib/types';

/* ============================================================
   Tip vitrini gövdesi — üç sayfanın ortak iskeleti.

   ÜÇ AYRI SAYFA, TEK BİLEŞEN: `/konut-projeleri`, `/villa-projeleri`
   ve `/ofis-projeleri` aynı yapıyı taşıyor; farkları metin ve
   sorgudaki tip. Rota dosyaları yalnızca metadata ve bu bileşeni
   çağırıyor.

   Sayfa bileşeni olarak yazılıp `export const` ile metin paylaşmak
   denendi ve Next.js "Property is incompatible with index signature"
   ile derlemeyi düşürdü: bir `page.tsx` modülü yalnızca tanınan
   dışa aktarımları taşıyabiliyor.
   ============================================================ */

export default async function TipVitrini({ tip }: { tip: Exclude<ProjeTipi, 'KARMA'> }) {
  const v = TIP_VITRINLERI[tip];
  const [list, bolgeler] = await Promise.all([getProjelerByTip(tip), getBolgeler()]);

  const enDusuk = list.length ? Math.min(...list.map((p) => p.fiyatMin)) : 0;
  const firmaSayisi = new Set(list.map((p) => p.firma.slug)).size;

  /* Bölge kırılımı CANLI listeden sayılıyor, bölge tablosundan değil:
     "Ataşehir" bölgesi yayında olsa da o bölgede hiç villa yoksa
     villa sayfasından oraya bağlanmak boş bir sayfaya götürürdü. */
  const bolgeSayaci = new Map<string, number>();
  for (const p of list) {
    bolgeSayaci.set(p.bolgeSlug, (bolgeSayaci.get(p.bolgeSlug) ?? 0) + 1);
  }
  const bolgeKirilimi = bolgeler
    .filter((b) => bolgeSayaci.has(b.slug))
    .map((b) => ({ ...b, adet: bolgeSayaci.get(b.slug)! }))
    .sort((a, b) => b.adet - a.adet);

  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: v.h1, yol: `/${v.slug}` },
  ];

  return (
    <>
      <JsonLd data={[
        breadcrumbLd(kirintilar),
        itemListLd(list, v.h1),
        faqLd(v.sss),
      ]} />

      <div className="wrap">
        <Breadcrumbs items={kirintilar} />

        <section className="landing-hero landing-hero-dar">
          <div>
            <span className="eyebrow">{v.ustBaslik}</span>
            <h1 className="h1" style={{ marginTop: 8 }}>{v.h1}</h1>
            <p className="prose" style={{ marginTop: 14 }}>{v.ozet}</p>

            {/* Sayaçlar canlı envanterden. Sıfırken hiç basılmıyor:
                "0 proje" bir vitrin değil, bir uyarı. */}
            {list.length > 0 && (
              <div className="landing-stats">
                <div><b>{list.length}</b><span>satıştaki proje</span></div>
                {enDusuk > 0 && (
                  <div><b>{TLkisa(enDusuk)}</b><span>başlangıç fiyatı</span></div>
                )}
                <div><b>{firmaSayisi}</b><span>geliştirici firma</span></div>
                <div><b>{bolgeKirilimi.length}</b><span>bölge</span></div>
              </div>
            )}
          </div>
        </section>

        <section className="section" style={{ paddingBottom: 20 }}>
          <div className="prose">
            {v.giris.map((metin, i) => <p key={i}>{metin}</p>)}
          </div>
        </section>

        {/* ---------- Projeler ---------- */}
        <section className="section" style={{ paddingTop: 10 }}>
          <div className="section-head">
            <div>
              <h2 className="h2">{list.length > 0 ? `${list.length} proje` : 'Proje listesi'}</h2>
              {list.length > 0 && <p className="sonuc-sayi">{v.not}</p>}
            </div>
            <Link className="link-more" href={`/arama?tip=${tip}`}>
              Filtreleyerek ara <Icon n="arrowR" s={16} />
            </Link>
          </div>

          {list.length === 0 ? (
            <div className="bos-durum">
              <Icon n="search" s={26} />
              <b>Bu tipte yayında proje yok</b>
              <p>
                Yeni projeler eklendikçe burada listelenecek. Bu arada tüm
                projelere göz atabilirsiniz.
              </p>
              <Link className="btn btn-primary btn-sm" href="/arama">Tüm projeler</Link>
            </div>
          ) : (
            <div className="grid-projeler cols-3">
              {list.map((p, i) => <ProjeKart key={p.id} p={p} oncelikli={i < 3} />)}
            </div>
          )}
        </section>

        {/* ---------- Bölge kırılımı ---------- */}
        {bolgeKirilimi.length > 0 && (
          <section className="section">
            <div className="section-head">
              <div>
                <h2 className="h2">Bölgeye göre</h2>
                <p>Aynı tipteki projeler bölge bölge — hangi bölgede kaç proje var.</p>
              </div>
            </div>
            <div className="etiket-serit">
              {bolgeKirilimi.map((b) => (
                <Link key={b.slug} className="chip" href={`/projeler/${b.slug}`}>
                  {b.ad} <b>{b.adet}</b>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---------- Sık sorulanlar ---------- */}
        <section className="section">
          <div className="section-head">
            <div>
              <h2 className="h2">{v.h1.toLocaleLowerCase('tr')} hakkında sık sorulanlar</h2>
            </div>
          </div>
          <div className="faq">
            {v.sss.map((f, i) => (
              <details key={f.s} open={i === 0}>
                <summary>{f.s}</summary>
                <div className="a">{f.c}</div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
