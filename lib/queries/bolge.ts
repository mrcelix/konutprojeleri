import { sql } from '@/lib/db';

/**
 * Bölge sorguları — şehir ve ilçe sayfaları.
 *
 * Ortalamalar ANLIK HESAPLANMAZ; mv_ilce_m2 materyalize görünümünden okunur.
 * Görünüm pg_cron ile gece yenilenir.
 */

export type IlceOzet = {
  il: string;
  ilce: string;
  m2_fiyat: number | null;
  proje_sayisi: number;
  daire_sayisi: number;
  yillik_degisim: number | null;
};

export async function ilceler(il: string): Promise<IlceOzet[]> {
  return sql<IlceOzet[]>`
    select il, ilce, m2_fiyat, proje_sayisi, daire_sayisi, yillik_degisim
    from mv_ilce_m2
    where il = ${il}
    order by proje_sayisi desc
  `;
}

export async function ilOzet(il: string) {
  const rows = await sql<
    { proje_sayisi: number; daire_sayisi: number; m2_fiyat: number | null }[]
  >`
    select
      sum(proje_sayisi)::int as proje_sayisi,
      sum(daire_sayisi)::int as daire_sayisi,
      round(sum(m2_fiyat * daire_sayisi) / nullif(sum(daire_sayisi), 0)) as m2_fiyat
    from mv_ilce_m2
    where il = ${il}
  `;
  return rows[0] ?? null;
}

/**
 * Bölge sayfasının SEO metni ve SSS'i.
 * 120 kelimenin altındaki sayfalar indekslenmez — eşik kontrolü burada.
 */
export async function bolgeIcerik(il: string, ilce?: string) {
  const rows = await sql<
    { metin: string | null; sss: { soru: string; cevap: string }[]; indekslenebilir: boolean }[]
  >`
    select
      metin,
      coalesce(sss, '[]') as sss,
      (coalesce(array_length(regexp_split_to_array(metin, '\\s+'), 1), 0) >= 120) as indekslenebilir
    from bolge_sayfasi
    where il = ${il} and ilce is not distinct from ${ilce ?? null}
    limit 1
  `;
  return rows[0] ?? null;
}
