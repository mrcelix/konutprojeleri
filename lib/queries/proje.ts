import { sql } from '@/lib/db';

/**
 * Proje sorguları.
 *
 * KURAL: Ağ gecikmesi sorgu SAYISIYLA çarpılır, veri boyutuyla değil.
 * Bir sayfa için N+1 sorgu atmak bu mimaride normalden çok daha pahalı.
 * Proje detayı tek sorguda toplanır — daire tipleri, medya ve firma
 * json_agg ile aynı turda gelir.
 */

export type DaireTipi = {
  tip: string;
  net_m2: number | null;
  brut_m2: number | null;
  liste_fiyati: number | null;
  m2_birim: number | null;
  toplam_adet: number | null;
  kalan_adet: number | null;
  kat_plani_key: string | null;
};

export type ProjeDetay = {
  id: number;
  slug: string;
  ad: string;
  il: string;
  ilce: string;
  mahalle: string | null;
  tip: string;
  durum: string;
  teslim_ceyrek: string | null;
  toplam_konut: number | null;
  blok_sayisi: number | null;
  kat_sayisi: number | null;
  tavan_yuksekligi: number | null;
  aidat: number | null;
  pesinat_orani: number | null;
  vade_ay: number | null;
  santiye_yuzde: number | null;
  ozellikler: Record<string, boolean>;
  aciklama: string | null;
  fiyat_teyit_tarihi: string | null;
  firma_slug: string;
  firma_ad: string;
  firma_sicil: string | null;
  daire_tipleri: DaireTipi[];
  gorseller: { key: string; alt: string }[];
};

/** Proje detay sayfası — TEK sorgu. */
export async function projeDetayGetir(
  il: string,
  ilce: string,
  slug: string
): Promise<ProjeDetay | null> {
  const rows = await sql<ProjeDetay[]>`
    select
      p.id, p.slug, p.ad, p.il, p.ilce, p.mahalle, p.tip, p.durum,
      p.teslim_ceyrek, p.toplam_konut, p.blok_sayisi, p.kat_sayisi,
      p.tavan_yuksekligi, p.aidat, p.pesinat_orani, p.vade_ay,
      p.santiye_yuzde, p.ozellikler, p.aciklama, p.fiyat_teyit_tarihi,
      f.slug as firma_slug,
      f.ad   as firma_ad,
      k.sicil as firma_sicil,
      coalesce(
        (select json_agg(d order by d.tip)
         from daire_tipi d where d.proje_id = p.id), '[]'
      ) as daire_tipleri,
      coalesce(
        (select json_agg(json_build_object('key', m.key, 'alt', m.alt) order by m.sira)
         from medya m where m.proje_id = p.id and m.tur = 'gorsel'), '[]'
      ) as gorseller
    from proje p
    join firma f on f.id = p.firma_id
    left join mv_firma_karne k on k.firma_id = f.id
    where p.yayinda
      and p.il = ${il} and p.ilce = ${ilce} and p.slug = ${slug}
    limit 1
  `;
  return rows[0] ?? null;
}

/** ISR için önceden üretilecek yollar. Şimdilik en çok görüntülenenler. */
export async function populerProjeYollari(limit = 200) {
  return sql<{ il: string; ilce: string; slug: string }[]>`
    select il, ilce, slug from proje
    where yayinda and durum in ('lansman', 'satista')
    order by goruntulenme desc nulls last
    limit ${limit}
  `;
}

/** Arama sonuçları — kart için gereken her şey tek sorguda, JOIN ile. */
export async function projeAra(params: {
  il?: string;
  ilce?: string;
  daireTipi?: string;
  minFiyat?: number;
  maxFiyat?: number;
  limit?: number;
  offset?: number;
}) {
  const { il, ilce, daireTipi, minFiyat, maxFiyat, limit = 20, offset = 0 } = params;

  return sql`
    select
      p.id, p.slug, p.ad, p.il, p.ilce, p.mahalle,
      p.teslim_ceyrek, p.santiye_yuzde, p.aidat,
      f.slug as firma_slug, f.ad as firma_ad,
      min(d.liste_fiyati) as min_fiyat,
      min(d.m2_birim)     as min_m2_birim,
      sum(d.kalan_adet)   as kalan_toplam,
      (select m.key from medya m
        where m.proje_id = p.id and m.tur = 'gorsel'
        order by m.sira limit 1) as kapak
    from proje p
    join firma f on f.id = p.firma_id
    left join daire_tipi d on d.proje_id = p.id
    where p.yayinda
      and p.durum in ('lansman', 'satista')
      ${il ? sql`and p.il = ${il}` : sql``}
      ${ilce ? sql`and p.ilce = ${ilce}` : sql``}
      ${daireTipi ? sql`and d.tip = ${daireTipi}` : sql``}
      ${minFiyat ? sql`and d.liste_fiyati >= ${minFiyat}` : sql``}
      ${maxFiyat ? sql`and d.liste_fiyati <= ${maxFiyat}` : sql``}
    group by p.id, f.slug, f.ad
    order by p.one_cikarma desc nulls last, p.guncellendi desc
    limit ${limit} offset ${offset}
  `;
}
