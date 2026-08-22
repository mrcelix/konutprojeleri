import { Suspense } from 'react';
import SearchClient, { type FiltreSecenegi } from '@/components/SearchClient';
import { getLandingOzellikler } from '@/lib/queries';
import { meta } from '@/lib/seo';

/* Faceted arama İNDEKSLENMİYOR (index bloat + kopya içerik riski)
   ancak bağlantılar takip ediliyor; indekslenecek yüzeyler
   /projeler/... iniş sayfaları. */
export const metadata = meta({
  baslik: 'Proje arama',
  aciklama: 'Bölge, proje tipi, daire tipi, bütçe, teslim tarihi ve ödeme '
    + 'koşullarına göre filtreleyerek yeni konut, villa ve ofis projeleri arayın.',
  yol: '/arama',
  indexle: false,
});

/* Sonuçlar istemciden /api/arama ile geliyor; sayfanın kendisi
   yalnızca filtre taksonomisini taşıyor ve statik kalabiliyor. */
export const revalidate = 3600;

/* Süreçle ilgili sorular — bölgeye özgü olanlar iniş sayfalarında. */
const SSS: { s: string; c: string }[] = [
  {
    s: 'Listedeki fiyat neyi gösteriyor?',
    c: 'Projenin en düşük daire tipinin başlangıç fiyatı. Aynı projede 1+1 ile '
      + '4+1 arasında kat kat fark olabiliyor; kesin fiyatı proje sayfasındaki '
      + 'daire tipi tablosunda tip tip görebilirsiniz. Fiyatlar kat, cephe ve '
      + 'ödeme planına göre de değişiyor.',
  },
  {
    s: 'Bütçe filtresi nasıl çalışıyor?',
    c: 'Üst sınır, projenin EN DÜŞÜK daire tipine bakıyor. "5 milyona kadar" '
      + 'dediğinizde 1+1’i 4 milyon olan bir proje listede çıkıyor — üst ucu '
      + '12 milyon olsa bile, çünkü o projede bütçenize uyan bir tip var. '
      + 'Alt sınır sormuyoruz: alıcı "en fazla şu kadar" diye düşünüyor.',
  },
  {
    s: 'Peşinat filtresinde neden bazı projeler çıkmıyor?',
    c: 'Peşinat oranı yayımlanmamış projeler bu filtrede görünmüyor. Sıfır '
      + 'yazan bir kayıt "peşinatsız" değil "bilgi verilmedi" demek; onları '
      + 'düşük peşinatlı gibi göstermek, bilgisi olmayan projeleri en cazip '
      + 'sırada listelerdi. Filtresiz aradığınızda hepsi çıkıyor.',
  },
  {
    s: 'Teslim tarihi kesin mi?',
    c: 'Hayır, bir taahhüt ama sapma sektörde yaygın. Bu yüzden tarihi gün '
      + 'olarak değil çeyrek olarak yazıyoruz. Projenin güncel inşaat '
      + 'ilerlemesini ve firmanın bugüne kadar teslim ettiği proje sayısını '
      + 'da gösteriyoruz — ikisi birlikte, tek başına tarihten daha iyi bir '
      + 'gösterge.',
  },
  {
    s: 'Karma projeler neden hem konut hem ofis listesinde?',
    c: 'Karma projede aynı parselde hem konut hem ticari birim var. Yalnızca '
      + 'kendi etiketine göre listelenseydi, konut arayan da ofis arayan da '
      + 'o projeyi hiç görmezdi.',
  },
  {
    s: 'Talep gönderince ne oluyor?',
    c: 'Bilgileriniz doğrudan o projenin satış ekibine iletiliyor. Komisyon '
      + 'almıyoruz ve numaranızı başka firmalarla paylaşmıyoruz. Yerinde '
      + 'görmek isterseniz randevu ücretsiz, satın alma zorunluluğu yok.',
  },
];

export default async function AramaSayfasi() {
  const ozellikler = await getLandingOzellikler();

  const filtreler: FiltreSecenegi[] = ozellikler.map((o) => ({
    k: o.key,
    i: o.ikon,
    t: o.baslik.replace(' Projeleri', '').replace(' Projeler', ''),
  }));

  return (
    <>
      <Suspense fallback={(
        <div className="wrap" style={{ padding: '60px 0' }}>
          <p className="muted">Projeler yükleniyor…</p>
        </div>
      )}>
        <SearchClient filtreler={filtreler} />
      </Suspense>

      {/* Sonuçların ALTINDA: arama yapan kişinin ilk işi soru okumak
          değil, filtrelemek. Aynı sorular iniş sayfalarında da var ama
          orada bölgeye özgü; buradakiler süreçle ilgili.

          Sayfa `indexle: false` olduğu için FAQ şeması BASILMIYOR —
          indekslenmeyen sayfada yapılandırılmış veri, arama motoruna
          göstermediğin bir şeyi tarif etmek olurdu. */}
      <section className="wrap section">
        <div className="section-head">
          <div>
            <h2 className="h2">Proje ararken sık sorulanlar</h2>
            <p>Aradığınızı bulamadıysanız WhatsApp hattından yazabilirsiniz.</p>
          </div>
        </div>
        <div className="faq">
          {SSS.map((f, i) => (
            <details key={f.s} open={i === 0}>
              <summary>{f.s}</summary>
              <div className="a">{f.c}</div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
