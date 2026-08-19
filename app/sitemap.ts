import type { MetadataRoute } from 'next';
import { sql } from '@/lib/db';

/**
 * Site haritası.
 *
 * BEYAZ LİSTE KURALI: yalnızca tek boyutlu kırılımlar sayfa olur —
 * konum + (daire tipi | kategori | teslim yılı | bütçe eşiği).
 * İki boyut birleşince noindex,follow olur ve haritaya girmez.
 *
 * EŞİK: en az 3 aktif proje ve 120 kelime özgün metin.
 * Eşiğin altına düşen sayfa otomatik olarak haritadan çıkar.
 */

export const revalidate = 86400;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://konutprojeleri.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [projeler, iller, ilceler] = await Promise.all([
      sql<{ il: string; ilce: string; slug: string; guncellendi: Date }[]>`
        select il, ilce, slug, guncellendi from proje
        where yayinda and durum in ('lansman','satista','teslim_edildi','arsiv')
      `,
      sql<{ il: string }[]>`select distinct il from mv_ilce_m2`,
      sql<{ il: string; ilce: string }[]>`
        select il, ilce from mv_ilce_m2 where proje_sayisi >= 3
      `,
    ]);

    return [
      { url: SITE, changeFrequency: 'daily', priority: 1 },
      ...iller.map((i) => ({
        url: `${SITE}/${i.il}-konut-projeleri`,
        changeFrequency: 'daily' as const,
        priority: 0.9,
      })),
      ...ilceler.map((i) => ({
        url: `${SITE}/${i.il}/${i.ilce}-konut-projeleri`,
        changeFrequency: 'daily' as const,
        priority: 0.8,
      })),
      ...projeler.map((p) => ({
        url: `${SITE}/${p.il}/${p.ilce}/${p.slug}`,
        lastModified: p.guncellendi,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return [{ url: SITE }];
  }
}
