import type { Metadata, Viewport } from 'next';
import './globals.css';
import './components.css';

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
    <html lang="tr" suppressHydrationWarning>
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
