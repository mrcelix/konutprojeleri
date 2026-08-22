import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import JsonLd from '@/components/JsonLd';
import { metinler, sayfaGetir, sayfalar } from '@/lib/icerik';
import { dilAlternatifleriEn, turkceYol } from '@/lib/i18n';
import { site } from '@/lib/site';

/* ============================================================
   İngilizce kurumsal sayfalar.

   Türkçe `[sayfa]` rotasının aynı yapısı, ayrı içerik. Metinler
   çeviri değil: İngilizce okurun sorduğu sorular farklı. Türk alıcı
   "peşinat oranı kaç" diye sorarken yabancı alıcı "yabancı olarak
   ödüyorum, ülke dışından iptal edersem ne oluyor, depozito nasıl geri
   geliyor" diye soruyor. Sayfalar bu sorulara göre kurgulandı.

   İçerik `sayfa` tablosunda `dil = EN` satırlarında; panelden
   düzenleniyor.

   HREFLANG kod tarafında: `lib/i18n.ts` → `YOL_ESLEME`. Panelden yeni
   açılan bir sayfa çifti eşlemede yer almadığı sürece hreflang
   BASILMIYOR. Bu bilinçli — karşılığı olmayan bir adresi alternatif
   dil olarak bildirmek Google'da hata üretiyor. Yeni sayfa kalıcıysa
   eşlemeye satır eklenmeli.
   ============================================================ */

export const revalidate = 3600;

/* ============================================================
   DERLEME KAPSAMI: İngilizce ağaç ÖNCEDEN ÜRETİLMİYOR.

   Dağıtım süresi Faz 62'den sonra 2 dakikadan 10 dakikaya çıktı;
   sebebi veritabanının dolmasıyla önceden üretilen sayfa sayısının
   sıfırdan iki yüzü aşmasıydı. İngilizce ağaç bu sayının yaklaşık
   yarısı ve trafiği henüz Türkçenin çok altında.

   Sayfalar KAYBOLMUYOR: `dynamicParams` varsayılan olarak açık,
   ilk ziyarette üretilip `revalidate` süresince önbellekte
   kalıyorlar. Site haritası da bu listeden bağımsız (kendi
   sorgusunu yapıyor), yani tarama kapsamı değişmiyor.

   Geri almak için: `[]` yerine eski eşlemeyi döndürmek yeterli.
   ============================================================ */
export async function generateStaticParams(): Promise<{ sayfa: string }[]> {
  return [];
}

export async function generateMetadata(
  { params }: { params: Promise<{ sayfa: string }> },
): Promise<Metadata> {
  const { sayfa } = await params;
  const s = await sayfaGetir(sayfa, 'en');
  if (!s) return {};

  const alt = dilAlternatifleriEn(`/en/${sayfa}`);
  return {
    title: s.baslik,
    description: s.aciklama,
    ...(s.indexle ? {} : { robots: { index: false, follow: true } }),
    ...(alt ? { alternates: alt } : {}),
    openGraph: {
      type: 'article', siteName: site.ad, locale: 'en_GB',
      url: `${site.url}/en/${sayfa}`, title: s.baslik, description: s.aciklama,
    },
  };
}

export default async function EnKurumsal({ params }: { params: Promise<{ sayfa: string }> }) {
  const { sayfa } = await params;
  const [s, m] = await Promise.all([sayfaGetir(sayfa, 'en'), metinler('en')]);
  if (!s) notFound();

  const trYol = turkceYol(`/en/${sayfa}`);
  const kirintilar = [
    { ad: 'Home', yol: '/en' },
    { ad: s.baslik, yol: `/en/${sayfa}` },
  ];

  return (
    <>
      <JsonLd data={[
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: kirintilar.map((k, i) => ({
            '@type': 'ListItem', position: i + 1, name: k.ad, item: `${site.url}${k.yol}`,
          })),
        },
        ...(s.sss ? [{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          inLanguage: 'en-GB',
          mainEntity: s.sss.map((f) => ({
            '@type': 'Question', name: f.s,
            acceptedAnswer: { '@type': 'Answer', text: f.c },
          })),
        }] : []),
      ]} />

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

        <div style={{ marginTop: 34, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost" href="/en/regions">{m('sayfa.altcta')}</Link>
          {/* Türkçe karşılığı yoksa bağlantı basılmıyor — kırık bağlantı vermeyelim */}
          {trYol && (
            <Link className="btn btn-quiet" href={trYol} hrefLang="tr">Türkçe sayfa</Link>
          )}
        </div>
      </div>
    </>
  );
}
