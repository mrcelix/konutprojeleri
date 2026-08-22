import type { MetadataRoute } from 'next';
import { abs, site } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Faceted arama ve hesap sayfaları taranmasın — tarama bütçesi iniş sayfalarına kalsın.
        disallow: ['/arama', '/giris', '/hesap/', '/api/', '/panel', '/yonetim', '/pano/'],
      },
    ],
    sitemap: abs('/sitemap.xml'),
    host: site.url,
  };
}
