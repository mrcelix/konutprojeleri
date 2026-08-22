import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import { metinler, sayfaGetir, sayfalar } from '@/lib/icerik';
import { breadcrumbLd, faqLd, meta } from '@/lib/seo';

/* ============================================================
   Kurumsal sayfalar (nasıl çalışır, KVKK, iletişim…).

   İçerik Faz 20'de koddan `sayfa` tablosuna taşındı; panelden
   düzenleniyor ve yeni sayfa açılabiliyor. Okuma `lib/icerik.ts`
   üzerinden etiketli önbellekle yapılıyor, sayfa hâlâ statik
   üretiliyor: kayıt yapılınca etiket düşürülüp yeniden üretiliyor.

   `dynamicParams` AÇIK: panelden yeni açılan bir sayfa, yeniden
   dağıtım beklemeden ilk istekte üretilebilsin. Tabloda olmayan
   adres yine 404.
   ============================================================ */

export const revalidate = 86400;

export async function generateStaticParams() {
  return (await sayfalar('tr')).map((s) => ({ sayfa: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ sayfa: string }> }): Promise<Metadata> {
  const { sayfa } = await params;
  const s = await sayfaGetir(sayfa, 'tr');
  if (!s) return {};
  return meta({ baslik: s.baslik, aciklama: s.aciklama, yol: `/${sayfa}`, indexle: s.indexle });
}

export default async function KurumsalSayfa({ params }: { params: Promise<{ sayfa: string }> }) {
  const { sayfa } = await params;
  const [s, m] = await Promise.all([sayfaGetir(sayfa, 'tr'), metinler('tr')]);
  if (!s) notFound();

  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: s.baslik, yol: `/${sayfa}` },
  ];

  return (
    <>
      <JsonLd data={s.sss ? [breadcrumbLd(kirintilar), faqLd(s.sss)] : breadcrumbLd(kirintilar)} />

      <div className="wrap" style={{ paddingBottom: 60 }}>
        <Breadcrumbs items={kirintilar} />

        <h1 className="h1" style={{ margin: '22px 0 20px' }}>{s.h1}</h1>

        <div className="prose">
          {s.govde.map((blok, i) => (
            <div key={i}>
              {blok.h && <h2>{blok.h}</h2>}
              {blok.p && <p>{blok.p}</p>}
              {blok.liste && <ul>{blok.liste.map((l) => <li key={l}>{l}</li>)}</ul>}
            </div>
          ))}
        </div>

        {s.sss && (
          <section className="section" style={{ paddingBottom: 0 }}>
            <div className="section-head"><div><h2 className="h2">{m('sayfa.sss.baslik')}</h2></div></div>
            <div className="faq">
              {s.sss.map((f, i) => (
                <details key={f.s} open={i === 0}>
                  <summary>{f.s}</summary>
                  <div className="a">{f.c}</div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Sayfaya özel düğme varsa o gösteriliyor. Gövde bağlantı
            kabul etmediği için (Faz 20, XSS) sayfanın kendi hedefine
            yönlendirmesinin tek yolu bu. */}
        <p style={{ marginTop: 34 }}>
          {s.ctaMetin && s.ctaYol ? (
            <Link className="btn btn-primary btn-lg" href={s.ctaYol}>{s.ctaMetin}</Link>
          ) : (
            <Link className="btn btn-ghost" href="/bolgeler">{m('sayfa.altcta')}</Link>
          )}
        </p>
      </div>
    </>
  );
}
