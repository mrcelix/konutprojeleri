/** Tek kaynak: alan adı, marka bilgileri, sosyal hesaplar. */

/**
 * Kanonik alan adı: konutprojeleri.com
 *
 * Alan adı değişirse burayı değil, `NEXT_PUBLIC_SITE_URL` ortam değişkenini
 * değiştirin — kanonik URL'ler, sitemap, OG etiketleri ve form geri dönüş
 * adresleri hepsi buradan türetiliyor. Adımlar: docs/seo.md → "Alan adı taşıma".
 */
export const site = {
  ad: 'KonutProjeleri',
  /* Tüzel unvan bilinçli olarak boş: uydurma şirket adı basmaktansa
     ilgili satırı hiç göstermemek doğru. Altbilgi ve KVKK metinleri
     boşsa satırı atlıyor. Yayına almadan önce doldurun. */
  unvan: '',
  // `||` bilinçli: değişken tanımlı ama boş bırakılmışsa da varsayılana düş.
  // `??` kullanılsaydı boş string geçer ve her kanonik URL üretimi çökerdi.
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.konutprojeleri.com',
  dil: 'tr-TR',
  slogan: 'Yeni konut, villa ve ofis projeleri tek adreste',
  /* 160 KARAKTERİN ALTINDA: Google arama sonucunda fazlasını kesiyor
     ve kesilen yerde cümle yarım kalıyor. */
  aciklama:
    'Yeni konut, villa ve ofis projeleri: kat planı, daire tipi, teslim '
    + 'tarihi ve fiyat aralığı bir arada. Satış ekibinden tek formla dönüş alın.',
  telefon: '+90 850 000 00 00',
  /* WhatsApp numarası ayrı: destek hattı sabit telefon olabilir ama
     WhatsApp bağlantısı ülke kodlu ve işaretsiz olmak zorunda
     (wa.me formatı). Yayına almadan önce gerçek numarayla değiştirin. */
  whatsapp: '905000000000',
  eposta: 'merhaba@konutprojeleri.com',
  /* Belgeler altbilgide ve güven bölümlerinde gösteriliyor. Boş bırakılırsa
     ilgili satır hiç basılmıyor — olmayan belgeyi varmış gibi göstermek
     yerine gizlemek doğru. */
  belge: {
    tursab: '',
    bakanlik: '',
    etbis: '',
    mersis: '',
  },
  adres: {
    sokak: '',
    ilce: '',
    il: '',
    postaKodu: '',
    ulke: 'TR',
  },
  sosyal: [
    'https://www.instagram.com/konutprojeleri',
    'https://www.youtube.com/@konutprojeleri',
    'https://tr.linkedin.com/company/konutprojeleri',
  ],
  /* Sayaçlar BURADA TUTULMUYOR. Koda gömülü bir "1.240 proje" rakamı
     ilk günden yanlış oluyor ve kimse güncellemiyor; `{proje}` ve
     `{bolge}` yer tutucuları çağrı yerinde gerçek sayılarla
     dolduruluyor (bkz. app/page.tsx). */
} as const;

export const abs = (yol: string) => new URL(yol, site.url).toString();
