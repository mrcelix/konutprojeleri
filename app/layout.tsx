import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import './components.css';

/**
 * Tipografi.
 *
 * next/font dosyaları kendi alan adımızdan servis eder ve derleme
 * anında alt küme çıkarır: Google'a istek gitmez, düzen kayması olmaz.
 *
 * TEK AİLE. Hiyerarşi ağırlıkla kuruluyor (800 başlık / 400 gövde).
 * İkinci bir başlık ailesi bu temada gereksiz — ferahlık ve ağırlık
 * farkı hiyerarşiyi zaten taşıyor.
 */
const sans = Plus_Jakarta_Sans({
  subsets: ['latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--yazi-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://konutprojeleri.com'),
  title: {
    default: 'Konut Projeleri — Fiyat, Kat Planı ve Teslim Bilgileriyle',
    // Başlıktaki yıl ve sayı DEĞİŞKENDEN gelir, sabit yazılmaz.
    // "2019 Teslim" hatası tam olarak bu yüzden bayatlamıştı.
    template: '%s | Konutprojeleri.com',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // maximum-scale ASLA kullanılmaz — parmakla yakınlaştırmayı kapatmak
  // erişilebilirlik ihlalidir. Bugünkü sitenin hatalarından biriydi.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // lang="tr" — uppercase dönüşümünde "i" harfinin "İ" olması için gerekli
    <html lang="tr" className={sans.variable} suppressHydrationWarning>
      <head>
        {/* Tema ilk boyamadan önce uygulanır; aksi halde koyu temada beyaz parlama olur */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('tema');if(t)document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
