import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import BasvuruFormu from '@/components/BasvuruFormu';
import Icon from '@/components/Icon';
import { meta } from '@/lib/seo';
import { site } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata = meta({
  baslik: 'Projenizi Yayınlayın',
  aciklama: `Konut, villa veya ofis projenizi ${site.ad} envanterine ekleyin. Yerinde inceleme ve görsel çekimi ücretsiz, listeleme bedeli yok.`,
  yol: '/firma-basvuru',
  anahtar: [
    'proje yayınlama', 'konut projesi tanıtım', 'müteahhit ilan',
    'geliştirici firma başvuru', 'proje pazarlama',
  ],
});

/* Adımlar SÜREÇ SIRASINDA: başvuru → şantiye ziyareti → panel →
   yayın → talep. Firmanın en çok merak ettiği "ne zaman görünürüm"
   sorusunun cevabı bu sıranın kendisi. */
const ADIMLAR: [string, string][] = [
  ['Başvuru', 'Formu doldurun; 2 iş günü içinde telefonla dönüyoruz.'],
  ['Şantiye ziyareti', 'Ekibimiz projeyi yerinde inceliyor, görselleri kendimiz çekiyoruz — ücretsiz.'],
  ['Panel', 'Daire tiplerini, kat planlarını ve fiyatları panelden siz giriyorsunuz.'],
  ['Yayın', 'İnceleme raporu ve proje sayfası birlikte yayına giriyor.'],
  ['Talepler', 'Gelen talepler doğrudan size düşer: telefon, bütçe ve ilgilendiği daire tipiyle.'],
];

/** Ne veriyoruz — vaadin sınırı da yazılı olsun. */
const SAGLADIKLARIMIZ: { ikon: 'cam' | 'shield' | 'building' | 'phone' | 'scale' | 'plan'; ad: string; not: string }[] = [
  { ikon: 'cam', ad: 'Şantiye görsel çekimi', not: 'ücretsiz' },
  { ikon: 'shield', ad: 'Yerinde inceleme ve doğrulama raporu', not: 'ücretsiz' },
  { ikon: 'plan', ad: 'Daire tipi ve kat planı yönetimi', not: 'panelden' },
  { ikon: 'phone', ad: 'Talepler telefon ve bütçesiyle', not: 'anında' },
  { ikon: 'building', ad: 'Firma sayfası ve proje arşivi', not: 'yayında' },
  { ikon: 'scale', ad: 'Satıştan komisyon alınmıyor', not: 'sıralama satılmıyor' },
];

export default function FirmaBasvuruSayfasi() {
  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: 'Projenizi yayınlayın', yol: '/firma-basvuru' },
  ];

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <Breadcrumbs items={kirintilar} />

      <h1 className="h1" style={{ margin: '22px 0 14px', maxWidth: '20ch' }}>
        Projenizi {site.ad}’nde yayınlayın
      </h1>
      <p className="muted" style={{ maxWidth: '58ch', fontSize: 17 }}>
        Konut, villa ve ofis projeleri aynı formdan başlıyor. Listeleme
        bedeli yok, satıştan komisyon alınmıyor. Yerinde inceleme ve
        görsel çekimi ücretsiz — projeyi görmeden listelemiyoruz.
      </p>

      <div className="basvuru-duzen">
        <div>
          <BasvuruFormu />
        </div>

        <aside className="basvuru-yan">
          <section className="kart" style={{ padding: '20px 22px' }}>
            <h2 className="h3">Nasıl ilerliyor?</h2>
            <ol className="basvuru-adim">
              {ADIMLAR.map(([baslik, metin], i) => (
                <li key={baslik}>
                  <span className="basvuru-no" aria-hidden="true">{i + 1}</span>
                  <div>
                    <b>{baslik}</b>
                    <span>{metin}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="kart" style={{ padding: '20px 22px', marginTop: 14 }}>
            <h2 className="h3">Ne sağlıyoruz?</h2>
            <ul className="basvuru-liste">
              {SAGLADIKLARIMIZ.map((x) => (
                <li key={x.ad}>
                  <Icon n={x.ikon} s={16} />
                  <span>
                    {x.ad}
                    <em className="basvuru-kapsam ortak">{x.not}</em>
                  </span>
                </li>
              ))}
            </ul>
            {/* Vaadin SINIRI da yazılı: lansman öncesi projede
                gösterilecek şantiye yok ve firma bunu ziyaretten önce
                bilmeli. */}
            <p className="tiny dim" style={{ marginTop: 14 }}>
              Henüz inşaatı başlamamış projelerde şantiye çekimi yerine
              vaziyet planı ve görselleştirmeler yayınlanıyor; ikisi
              sayfada ayrı ayrı işaretleniyor.
            </p>
            <p className="tiny dim" style={{ marginTop: 10 }}>
              Sürecin ayrıntısı için{' '}
              <Link href="/firma-rehberi">detaylı sayfaya</Link> bakabilir
              veya <Link href="/iletisim">bize yazabilirsiniz</Link>.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
