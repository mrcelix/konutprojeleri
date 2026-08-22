import type { Metadata, Viewport } from 'next';
import { Inter, Nunito } from 'next/font/google';
import AltPanel from '@/components/AltPanel';
import { AppState, temaScript } from '@/components/AppState';
import YuklemeCubugu from '@/components/YuklemeCubugu';
import CompareBar from '@/components/CompareBar';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { baslikMenusu } from '@/lib/menu';
import { aktifKampanya } from '@/lib/kampanya';
import KampanyaSeridi from '@/components/KampanyaSeridi';
import HizliMenu from '@/components/HizliMenu';
import WhatsAppHatti from '@/components/WhatsAppHatti';
import YukariDugmesi from '@/components/YukariDugmesi';
import Olcum from '@/components/Olcum';
import { headers } from 'next/headers';
import type { Dil } from '@/lib/i18n';
import JsonLd from '@/components/JsonLd';
import { getBolgeler, getProjeler } from '@/lib/queries';
import { organizationLd, websiteLd } from '@/lib/seo';
import { siteBilgi } from '@/lib/site-ayar';
import { metinler } from '@/lib/icerik';
import { site } from '@/lib/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/*
 * Başlık fontu: Nunito — TrendMatik tasarım sistemiyle aynı ikili.
 *
 * Gövde Inter, başlık Nunito. Bir ara tek aileye (Plus Jakarta Sans)
 * indirilmişti; başlıkta ayrı bir ses olmayınca sayfa düzleşiyordu.
 * Nunito'nun yuvarlak uçları koyu hero bloğunda ısınma sağlıyor.
 *
 * `latin-ext` alt kümesi ç ğ ı İ ö ş ü için şart.
 */
const nunito = Nunito({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['600', '700', '800'],
});

/**
 * Arama motoru doğrulama etiketleri.
 * Değerler ortam değişkeninde; boşsa etiket hiç basılmıyor.
 */
const dogrulama = {
  google: process.env.GOOGLE_DOGRULAMA?.trim() || undefined,
  yandex: process.env.YANDEX_DOGRULAMA?.trim() || undefined,
  other: process.env.BING_DOGRULAMA?.trim()
    ? { 'msvalidate.01': process.env.BING_DOGRULAMA.trim() }
    : undefined,
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  verification: dogrulama,
  title: {
    default: `${site.ad} — konut, villa ve ofis projeleri`,
    template: `%s | ${site.ad}`,
  },
  description: site.aciklama,
  applicationName: site.ad,
  /* Tüzel unvan boş bırakılabiliyor (bkz. lib/site.ts); metadata
     alanlarına boş string basmak yerine marka adına düşüyoruz. */
  authors: [{ name: site.unvan || site.ad, url: site.url }],
  creator: site.unvan || site.ad,
  publisher: site.unvan || site.ad,
  category: 'real estate',
  alternates: {
    canonical: '/',
    languages: { 'tr-TR': '/', 'en-GB': '/en', 'x-default': '/' },
  },
  openGraph: {
    type: 'website',
    siteName: site.ad,
    locale: 'tr_TR',
    url: site.url,
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  formatDetection: { telephone: false },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A1720' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // App Router iç içe layout'ta <html> yeniden yazılamıyor; dil kökten
  // belirleniyor. Yolu başlıktan okuyup /en altındaki sayfalara doğru
  // lang veriyoruz — yanlış lang, ekran okuyucuların metni Türkçe
  // telaffuz etmesine ve arama motorlarının dili yanlış tespit etmesine
  // yol açıyor.
  const h = await headers();
  const yol = h.get('x-yol') ?? h.get('x-invoke-path') ?? '';
  const dil = (yol.startsWith('/en') ? 'en' : 'tr') satisfies Dil;

  /* ---------- Panel kabuğu, vitrin kabuğundan AYRI ----------
     Yönetim ve firma panelleri ziyaretçi başlığının altında
     açılıyordu: kampanya şeridi, mega menü, WhatsApp balonu, hızlı
     işlemler ve mobil sekme çubuğu panelin üstüne biniyor, hızlı
     işlemler kenar çubuğunu kesiyordu. Panel bir iç uygulama; vitrin
     donanımının hiçbiri orada işe yaramıyor.

     Yan fayda: aşağıdaki sorguların (proje listesi, mega menü,
     kampanya, metinler) hiçbiri panelde gerekmiyor — panel sayfaları
     artık bunları hiç çalıştırmıyor. Ölçüm de kapalı: yönetim
     ziyaretleri gerçek kullanıcı CWV verisini kirletiyordu. */
  const panelMi = yol.startsWith('/yonetim') || yol.startsWith('/panel');

  const kabuk = panelMi ? null : await vitrinKabugu(dil);

  return (
    <html
      lang={dil}
      data-theme="light"
      className={`${inter.variable} ${nunito.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <script dangerouslySetInnerHTML={{ __html: temaScript }} />
      </head>
      <body>
        <a href="#icerik" className="sr">{dil === 'en' ? 'Skip to content' : 'İçeriğe geç'}</a>
        {!kabuk && <AppState>{children}</AppState>}
        {kabuk && (
        <>
        <JsonLd data={[organizationLd(kabuk.bilgi), websiteLd()]} />
        <Olcum />
        <AppState>
          {/* Şerit başlığın ÜSTÜNDE: kampanya sayfanın ilk satırı,
              gezinmenin altına düşerse duyuru olmaktan çıkıyor. */}
          {kabuk.kampanya && <KampanyaSeridi k={kabuk.kampanya} />}
          {/* Öneriler başlıktaki arama perdesine gidiyor: bölgeler ve
              projeler zaten burada okunuyor, ikinci bir sorgu yok. */}
          <Header
            dil={dil} mega={kabuk.menu?.mega} duz={kabuk.menu?.duz} guven={kabuk.guven}
            oneriler={kabuk.oneriler}
          />
          {/* Yükleme çubuğu BAŞLIKLA İÇERİK ARASINDA: sayfanın
              indiği süre boyunca renkli dolgu ilerliyor, bitince gri
              bir çizgi olarak kalıyor. */}
          <YuklemeCubugu />
          <main id="icerik">{children}</main>
          <Footer dil={dil} />
          <CompareBar projeler={kabuk.projeler} />
          {/* Sol altta hızlı işlemler, sağ altta WhatsApp: karşı
              köşeler, yoksa dar ekranda üst üste binerler. */}
          <HizliMenu dil={dil} />
          {/* Başa dön, WhatsApp'ın hemen üstünde: aynı köşe, aynı
              hizada iki küçük kontrol. */}
          <YukariDugmesi />
          <WhatsAppHatti numara={kabuk.bilgi.whatsapp} />
          {/* Mobil sekme çubuğu: yalnızca dar ekranda görünüyor. */}
          <AltPanel dil={dil} />
        </AppState>
        </>
        )}
      </body>
    </html>
  );
}

/**
 * Vitrin başlığı/altbilgisi için gereken her şey — panelde çağrılmıyor.
 * Kök düzende dil yalnızca `tr`/`en` olabiliyor (yol `/en` ile başlıyor
 * mu, o kadar); `Dil` birliğinin tamamı sözlükte karşılanmıyor.
 */
async function vitrinKabugu(dil: 'tr' | 'en') {
  /* Karşılaştırma çubuğu ve favori listesi, localStorage'daki
     kimlikleri projeye çevirmek için listeye ihtiyaç duyuyor; başlıktaki
     arama kutusu da aynı listeden besleniyor. */
  const [projeler, bolgeler] = await Promise.all([
    getProjeler(), getBolgeler(),
  ]);

  /* Mega menü içeriği veriden üretiliyor; başlık istemci bileşeni
     olduğu için sorgu katmanını kendisi çağıramıyor. İngilizce tarafta
     bölge × özellik iniş sayfaları ayrı bir ağaçta, panel yok. */
  const menu = dil === 'en' ? null : await baslikMenusu();
  /* Güven şeridi maddeleri metin kaydından: kodda sabitken "7/24
     destek" gibi bir vaadi geri almak dağıtım bekliyordu. */
  const m = await metinler(dil);
  const guven = m('baslik.guven').split('\u00b7').map((x) => x.trim()).filter(Boolean);
  const kampanya = await aktifKampanya();
  /* Kurum bilgileri panelden: altbilgi, WhatsApp bağlantısı ve
     kurum şeması aynı kaynaktan besleniyor. */
  const bilgi = await siteBilgi();

  return {
    projeler, menu, guven, kampanya, bilgi,
    oneriler: [
      ...bolgeler.map((b) => ({
        ad: b.ad, alt: `${b.il} · ${b.adet} proje`, ikon: 'pin' as const,
        yol: `/projeler/${b.slug}`, bolgeSlug: b.slug, il: b.il, adet: b.adet,
      })),
      ...projeler.map((p) => ({
        ad: p.ad, alt: `${p.mahalle}, ${p.bolge}`, ikon: 'building' as const,
        yol: `/proje/${p.slug}`,
      })),
    ],
  };
}
