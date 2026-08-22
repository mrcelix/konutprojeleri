import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { getFirmalar } from '@/lib/queries';
import { breadcrumbLd, meta } from '@/lib/seo';

export const revalidate = 3600;

export const metadata = meta({
  baslik: 'Geliştirici Firmalar',
  aciklama: 'Sitede yer alan müteahhit ve gayrimenkul geliştirme firmaları: '
    + 'kuruluş yılı, teslim ettikleri proje sayısı ve satıştaki projeleri.',
  yol: '/firmalar',
  anahtar: ['müteahhit firmalar', 'gayrimenkul geliştirici', 'inşaat firmaları', 'konut projeleri firma'],
});

export default async function FirmalarSayfasi() {
  const firmalar = await getFirmalar();

  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: 'Firmalar', yol: '/firmalar' },
  ];

  /* Sıralama TESLİM ETTİĞİ PROJE SAYISINA göre: sitedeki proje sayısı
     kimin çok reklam verdiğini gösteriyor, teslim sayısı kimin işi
     bitirdiğini. Alıcı için ikincisi belirleyici. */
  const sirali = [...firmalar].sort(
    (a, b) => b.tamamlanan - a.tamamlanan || b.projeSayisi - a.projeSayisi,
  );

  return (
    <>
      <JsonLd data={[breadcrumbLd(kirintilar)]} />

      <div className="wrap">
        <Breadcrumbs items={kirintilar} />

        <section className="landing-hero landing-hero-dar">
          <div>
            <span className="eyebrow">{firmalar.length} firma</span>
            <h1 className="h1" style={{ marginTop: 8 }}>Geliştirici Firmalar</h1>
            <p className="prose" style={{ marginTop: 14 }}>
              Projeyi kimin yaptığı, ne zaman teslim edileceğine dair en güçlü
              sinyal. Her firmanın bugüne kadar TESLİM ETTİĞİ proje sayısını
              gösteriyoruz — vaat değil geçmiş.
            </p>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 10 }}>
          {sirali.length === 0 ? (
            <p className="bos-durum">Henüz yayında firma yok.</p>
          ) : (
            <div className="kart-agi">
              {sirali.map((f) => (
                <article key={f.slug} className="firma-buyuk-kart">
                  <h2 className="h3">
                    <Link href={`/firma/${f.slug}`}>{f.ad}</Link>
                  </h2>
                  <p>{f.ozet}</p>
                  <div className="firma-sayilar">
                    {f.tamamlanan > 0 && (
                      <span><Icon n="check" s={14} /> {f.tamamlanan} teslim</span>
                    )}
                    {f.yil && <span><Icon n="clock" s={14} /> {f.yil}’den beri</span>}
                    <span><Icon n="building" s={14} /> {f.projeSayisi} proje</span>
                  </div>
                  <Link className="link-more" href={`/firma/${f.slug}`}>
                    Projelerini gör <Icon n="arrowR" s={15} />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="cta-blok">
            <div>
              <h2 className="h2">Projenizi burada tanıtın</h2>
              <p>
                Ekibimiz projeyi şantiyede inceliyor, siz görselleri ve kat
                planlarını panelden yüklüyorsunuz. Talepler doğrudan satış
                ekibinize düşüyor; komisyon almıyoruz.
              </p>
            </div>
            <Link className="btn btn-cta btn-lg" href="/firma-basvuru">
              Firma başvurusu yapın <Icon n="arrowR" s={16} />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
