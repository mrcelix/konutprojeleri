import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /* Derleme çıktısının klasörü DEĞİŞTİRİLEBİLİR.
     Sebebi: `next build` çalışan `next dev` ile aynı `.next`
     klasörünü kullanıyor ve derleme, dev sunucusunun yüklediği
     parçaları silip yerine yenilerini koyuyor. Dev sunucusu o andan
     sonra "Cannot find module './5873.js'" diyerek her isteğe 500
     dönüyor ve yeniden başlatılana kadar toparlamıyor.
     `npm run derle` bu değişkeni ayrı bir klasöre ayarlıyor. */
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // Görsel optimizasyonu — LCP ve CLS doğrudan SEO'yu etkiliyor.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // Kendi CDN'imiz — NEXT_PUBLIC_GORSEL_CDN tanımlıysa host'u da izinli olmalı
      ...(process.env.NEXT_PUBLIC_GORSEL_CDN
        ? [{ protocol: 'https' as const, hostname: new URL(process.env.NEXT_PUBLIC_GORSEL_CDN).hostname }]
        : []),
      /* Nesne deposu. Yüklenen fotoğraflar buradan geliyor; host
         izinli değilse `next/image` isteği reddediyor ve galeri boş
         çıkıyor. NEXT_PUBLIC_ değil: derleme sunucuda çalışıyor. */
      ...(process.env.DEPO_SURUCU === 'supabase' && process.env.SUPABASE_URL
        ? [{ protocol: 'https' as const, hostname: new URL(process.env.SUPABASE_URL).hostname }]
        : []),
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 420, 640, 768, 1024, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },

  // Eski mockup URL'lerinden yeni SEO yapısına kalıcı yönlendirme.
  async redirects() {
    return [
      { source: '/listeleme.html', destination: '/arama', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },

      // SMS kısa yolları. Uzun URL bir SMS parçasını tek başına doldurur;
      // Türkçe karakterli mesajda parça sınırı 70 karakter.
      // Kalıcı değil (307): kısa yol arayüzün parçası, kanonik değil.
      { source: '/r/:kod', destination: '/rezervasyon/onay/:kod', permanent: false },
      { source: '/b/:kod', destination: '/rezervasyon/bakiye/:kod', permanent: false },
    ];
  },
};

export default nextConfig;
