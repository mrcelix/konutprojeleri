import type { Metadata } from 'next';
import { dilAlternatifleri } from './i18n';
import { abs, site } from './site';
import type { Bolge, DaireTipi, Proje } from './types';

/* ============================================================
   SEO yardımcıları
   - Kanonik URL her sayfada zorunlu (faceted arama kopyalarını engeller)
   - JSON-LD üreticileri: Organization, WebSite, BreadcrumbList,
     VacationRental, ItemList, FAQPage
   ============================================================ */

interface MetaGirdi {
  baslik: string;
  aciklama: string;
  yol: string;
  gorsel?: string;
  indexle?: boolean;
  yayin?: string;
  guncelleme?: string;
  anahtar?: string[];
}

/** Görsel verilmeyen sayfalarda paylaşım kartına düşen varsayılan. */
export const VARSAYILAN_OG = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&h=630&q=80';

export function meta({
  baslik, aciklama, yol, gorsel, indexle = true, yayin, guncelleme, anahtar,
}: MetaGirdi): Metadata {
  const url = abs(yol);
  return {
    title: baslik,
    description: aciklama,
    keywords: anahtar,
    // hreflang yalnızca GERÇEK karşılığı olan sayfada yayınlanıyor.
    // Karşılığı olmayan sayfaya koymak Search Console'da
    // "alternatif sayfa bulunamadı" hatası üretiyor.
    alternates: dilAlternatifleri(yol) ?? { canonical: url },
    robots: indexle
      ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } }
      : { index: false, follow: true },
    openGraph: {
      type: 'website',
      siteName: site.ad,
      locale: 'tr_TR',
      url,
      title: baslik,
      description: aciklama,
      /* Görsel verilmediğinde SİTE VARSAYILANI kullanılıyor. Önceden
         `undefined` bırakılıyordu ve kurumsal sayfalar, bölge hub'ı
         ve rehber paylaşıldığında kartta hiç görsel çıkmıyordu —
         tıklanma oranını doğrudan düşüren bir eksik. */
      images: [{ url: gorsel ?? VARSAYILAN_OG, width: 1200, height: 630, alt: baslik }],
      ...(yayin ? { publishedTime: yayin } : {}),
      ...(guncelleme ? { modifiedTime: guncelleme } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: baslik,
      description: aciklama,
      images: [gorsel ?? VARSAYILAN_OG],
    },
  };
}

/* ---------------- JSON-LD ---------------- */

/**
 * Kurum şeması.
 *
 * `bilgi` verilirse panelden yönetilen kurum bilgileri kullanılıyor
 * (`lib/site-ayar.ts`); verilmezse koddaki varsayılanlar. Parametre
 * isteğe bağlı: bu yardımcı senkron ve pek çok yerden çağrılıyor,
 * hepsini asenkrona çevirmek gerekmesin diye.
 */
export function organizationLd(bilgi?: {
  unvan: string; aciklama: string; telefon: string; eposta: string;
  adres: { sokak: string; ilce: string; il: string; postaKodu: string; ulke: string };
  sosyal: string[];
}) {
  const b = bilgi ?? site;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': abs('/#organization'),
    name: site.ad,
    legalName: b.unvan,
    url: site.url,
    logo: { '@type': 'ImageObject', url: abs('/logo.svg'), width: 512, height: 512 },
    description: b.aciklama,
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.adres.sokak,
      addressLocality: b.adres.ilce,
      addressRegion: b.adres.il,
      postalCode: b.adres.postaKodu,
      addressCountry: b.adres.ulke,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: b.telefon,
      email: b.eposta,
      contactType: 'customer support',
      areaServed: 'TR',
      availableLanguage: ['Turkish', 'English'],
    },
    sameAs: [...b.sosyal],
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': abs('/#website'),
    url: site.url,
    name: site.ad,
    description: site.aciklama,
    inLanguage: 'tr-TR',
    publisher: { '@id': abs('/#organization') },
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: abs('/arama?q={search_term_string}') },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbLd(items: { ad: string; yol: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.ad,
      item: abs(it.yol),
    })),
  };
}

export function faqLd(sss: { s: string; c: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sss.map((f) => ({
      '@type': 'Question',
      name: f.s,
      acceptedAnswer: { '@type': 'Answer', text: f.c },
    })),
  };
}

export function itemListLd(projeler: Proje[], baslik: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: baslik,
    numberOfItems: projeler.length,
    itemListElement: projeler.map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: abs(`/proje/${v.slug}`),
      name: v.ad,
    })),
  };
}

/** Satış aşaması → schema.org availability. */
function stokDurumu(durum: Proje['durum']): string {
  if (durum === 'YAKINDA') return 'https://schema.org/PreOrder';
  if (durum === 'SON_DAIRELER') return 'https://schema.org/LimitedAvailability';
  if (durum === 'TUKENDI' || durum === 'TESLIM_EDILDI') return 'https://schema.org/SoldOut';
  return 'https://schema.org/InStock';
}

/**
 * Daire tipi → `Offer`.
 *
 * Fiyatı girilmemiş tip `Offer` ÜRETMİYOR: `price: 0` göndermek
 * Google'ın denetiminde geçersiz ve zengin sonuçta "₺0" gösteriyor.
 * Fiyatsız tip yalnızca sayfada görünüyor, yapılandırılmış veride yok.
 */
function daireOfferi(p: Proje, d: DaireTipi) {
  if (!d.fiyatMin) return null;
  return {
    '@type': 'Offer',
    name: `${d.ad} · ${d.brutM2} m²`,
    ...(d.fiyatMax && d.fiyatMax > d.fiyatMin
      ? { priceSpecification: {
        '@type': 'PriceSpecification',
        minPrice: d.fiyatMin,
        maxPrice: d.fiyatMax,
        priceCurrency: 'TRY',
      } }
      : { price: d.fiyatMin, priceCurrency: 'TRY' }),
    availability: d.kalan === 0 ? 'https://schema.org/SoldOut' : stokDurumu(p.durum),
    url: abs(`/proje/${p.slug}`),
  };
}

/**
 * Projenin yapılandırılmış verisi.
 *
 * `ApartmentComplex` + `Offer` ikilisi: Google'ın emlak geliştirme
 * projeleri için tanıdığı tip bu. `Product` denenebilirdi ama ürün
 * şeması tek bir fiyat ve stok bekliyor; projede on ayrı daire tipi
 * ve on ayrı fiyat var — hepsi `makesOffer` altında ayrı teklif
 * olarak veriliyor.
 *
 * VILLA PROJESİ İÇİN `SingleFamilyResidence`: apartman kompleksi
 * demek, müstakil villa projesinde Google'a yanlış ürün tipi
 * bildirmek olurdu.
 *
 * PUAN/YORUM YOK. Bu sitede kullanıcı değerlendirmesi toplanmıyor;
 * `aggregateRating` yazmak, olmayan bir veriyi uydurmak olurdu ve
 * yapılandırılmış veri denetiminde de yakalanırdı.
 */
export function projeLd(
  p: Proje,
  ek: { olanaklar: string[] },
) {
  const villaProjesi = p.tip === 'VILLA';
  return {
    '@context': 'https://schema.org',
    '@type': villaProjesi ? 'SingleFamilyResidence' : 'ApartmentComplex',
    '@id': abs(`/proje/${p.slug}#development`),
    identifier: p.id,
    name: `${p.ad}, ${p.bolge}`,
    description: p.ozet,
    url: abs(`/proje/${p.slug}`),
    image: p.foto.slice(0, 6),
    latitude: p.lat,
    longitude: p.lng,
    geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
    address: {
      '@type': 'PostalAddress',
      streetAddress: p.adres ?? p.mahalle,
      addressLocality: p.bolge,
      addressRegion: p.il,
      addressCountry: 'TR',
    },
    ...(p.olcek.bagimsizBolum
      ? { numberOfAccommodationUnits: {
        '@type': 'QuantitativeValue', value: p.olcek.bagimsizBolum,
      } }
      : {}),
    ...(p.olcek.kat ? { numberOfFloors: p.olcek.kat } : {}),
    ...(p.olcek.arsaM2
      ? { lotSize: { '@type': 'QuantitativeValue', value: p.olcek.arsaM2, unitCode: 'MTK' } }
      : {}),
    /* Geliştirici firma AYRI bir kurum olarak veriliyor, `provider`
       ile sitenin kendisine bağlanmıyor: projeyi biz geliştirmiyoruz
       ve Google'a öyle bildirmek yanlış olurdu. */
    ...(p.firma.ad
      ? { additionalProperty: {
        '@type': 'PropertyValue',
        name: 'Geliştirici',
        value: p.firma.ad,
      } }
      : {}),
    amenityFeature: ek.olanaklar.map((ad) => ({
      '@type': 'LocationFeatureSpecification',
      name: ad,
      value: true,
    })),
    makesOffer: p.daireTipleri
      .map((d) => daireOfferi(p, d))
      .filter((o): o is NonNullable<typeof o> => o !== null),
    /* Aralığın kendisi de ayrıca veriliyor: daire tiplerinin hiçbirinde
       fiyat yoksa `makesOffer` boş kalıyor ve projenin fiyatı hiç
       görünmüyordu. */
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TRY',
      ...(p.fiyatMax && p.fiyatMax > p.fiyatMin
        ? { priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: p.fiyatMin,
          maxPrice: p.fiyatMax,
          priceCurrency: 'TRY',
        } }
        : { price: p.fiyatMin }),
      availability: stokDurumu(p.durum),
      url: abs(`/proje/${p.slug}`),
    },
    isPartOf: { '@id': abs('/#website') },
  };
}

/** Bölge iniş sayfası için yer + kapsayıcı liste. */
export function bolgeLd(b: Bolge, projeSayisi: number, enDusuk: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': abs(`/projeler/${b.slug}#page`),
    name: `${b.ad} Konut Projeleri`,
    description: b.ozet,
    url: abs(`/projeler/${b.slug}`),
    isPartOf: { '@id': abs('/#website') },
    about: {
      '@type': 'Place',
      name: b.ad,
      address: { '@type': 'PostalAddress', addressLocality: b.ad, addressRegion: b.il, addressCountry: 'TR' },
      geo: { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lng },
    },
    mainEntity: {
      '@type': 'Offer',
      name: `${b.ad} konut projeleri`,
      priceCurrency: 'TRY',
      lowPrice: enDusuk,
      offerCount: projeSayisi,
      availability: 'https://schema.org/InStock',
    },
  };
}

/**
 * Geliştirici firma sayfası.
 *
 * `Organization` DEĞİL `RealEstateAgent`: firma sayfası bizim
 * kurumsal sayfamız değil, üçüncü bir tarafın profili. `Organization`
 * kullanmak Google'da sitenin kendi kurum kartıyla çakışıyordu.
 */
export function firmaLd(f: {
  slug: string; ad: string; ozet: string; logo?: string;
  yil?: number; tamamlanan: number; web?: string;
}, projeSayisi: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': abs(`/firma/${f.slug}#agent`),
    name: f.ad,
    description: f.ozet,
    url: abs(`/firma/${f.slug}`),
    ...(f.logo ? { logo: f.logo, image: f.logo } : {}),
    ...(f.web ? { sameAs: [f.web] } : {}),
    ...(f.yil ? { foundingDate: String(f.yil) } : {}),
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Tamamlanan proje', value: f.tamamlanan },
      { '@type': 'PropertyValue', name: 'Sitedeki proje', value: projeSayisi },
    ],
  };
}
