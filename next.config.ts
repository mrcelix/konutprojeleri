import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,

  // Görseller Vercel'in optimizasyonundan geçmez — kaynak görsel başına ücretlendirilir.
  // Cloudflare Images'a özel loader ile yönlendiriyoruz (lib/imageLoader.ts).
  images: {
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.konutprojeleri.com' },
      /* Stok fotoğraf havuzu (lib/gorsel-havuzu.ts). Envanterde
         gerçek fotoğraf yokken kartlar ve hero buradan besleniyor;
         host izinli değilse next/image isteği reddediyor. */
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  // Eski PHP URL'lerinden yeni yapıya kalıcı yönlendirmeler.
  // Toplu harita db/redirects.csv'den üretilip buraya değil, middleware'e taşınacak;
  // burada yalnızca kalıp bazlı olanlar durur.
  async redirects() {
    return [
      { source: '/proje-detay.php', destination: '/', permanent: true },
      { source: '/index.php', destination: '/', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default config;
