import { sql } from '@/lib/db';

/**
 * Firma karnesi sorguları.
 *
 * Karne YALNIZCA doğrulanabilir dört veriden hesaplanır:
 * teslim isabeti (40), deneyim hacmi (20), veri şeffaflığı (20),
 * yanıt süresi (20). Yorum, kullanıcı puanı, abonelik paketi girmez.
 *
 * Teslim kayıtları elle girilen tek veridir ve her satır kaynak
 * gösterir; kaynaksız satır karneye dahil edilmez.
 */

/** Sektör ortalamaları — karne rakamları bunlarla karşılaştırılır. */
export const SEKTOR = {
  ortGecikme: 2.7,
  zamanindaOrani: 0.41,
  yanitSuresiSaat: 19,
} as const;

export type TeslimKaydi = {
  proje_ad: string | null;
  proje_slug: string | null;
  il: string | null;
  ilce: string | null;
  toplam_konut: number | null;
  ilan_edilen: string;
  gerceklesen: string | null;
  gecikme_ay: number | null;
  kaynak: string;
  durum: string;
  teslim_m2_fiyati: number | null;
  guncel_m2_fiyati: number | null;
};

export type FirmaProje = {
  slug: string; ad: string; il: string; ilce: string;
  durum: string; teslim_ceyrek: string | null; santiye_yuzde: number | null;
  toplam_konut: number | null; kalan: number | null;
  min_fiyat: number | null; min_m2_birim: number | null;
  ilce_m2: number | null; kapak: string | null;
};

export type FirmaKarne = {
  id: number;
  slug: string;
  ad: string;
  kurulus_yili: number | null;
  merkez_il: string | null;
  merkez_ilce: string | null;
  dogrulandi: boolean;
  paket: string;
  ortakliklar: string[] | null;
  hakkinda: string | null;
  sicil: string | null;
  ort_gecikme: number | null;
  zamaninda_orani: number | null;
  tamamlanan: number;
  veri_skoru: number | null;
  toplam_konut: number;
  aktif_proje: number;
  musait_daire: number;
  bolgeler: { ilce: string; adet: number }[];
  teslimler: TeslimKaydi[];
  aktifler: FirmaProje[];
  acik_itiraz: number;
};

export async function firmaKarnesi(slug: string): Promise<FirmaKarne | null> {
  const rows = await sql<FirmaKarne[]>`
    select
      f.id, f.slug, f.ad, f.kurulus_yili, f.merkez_il, f.merkez_ilce,
      f.dogrulandi, f.paket, f.ortakliklar, f.hakkinda,
      k.sicil, k.ort_gecikme, k.zamaninda_orani,
      coalesce(k.tamamlanan, 0) as tamamlanan,
      k.veri_skoru,

      coalesce((select sum(p.toplam_konut)::int from proje p where p.firma_id = f.id), 0) as toplam_konut,
      coalesce((select count(*)::int from proje p
        where p.firma_id = f.id and p.yayinda and p.durum in ('lansman','satista')), 0) as aktif_proje,
      coalesce((select sum(d.kalan_adet)::int from daire_tipi d
        join proje p on p.id = d.proje_id
        where p.firma_id = f.id and p.yayinda and p.durum in ('lansman','satista')), 0) as musait_daire,

      coalesce((select count(*)::int from teslim_kaydi t
        where t.firma_id = f.id and t.durum = 'itiraz'), 0) as acik_itiraz,

      coalesce((
        select json_agg(b order by b.adet desc)
        from (
          select p.ilce, count(*)::int as adet
          from proje p where p.firma_id = f.id
          group by p.ilce
        ) b
      ), '[]') as bolgeler,

      -- Teslim arşivi: karnenin %40'ı buradan. Kaynaksız satır girmez.
      coalesce((
        select json_agg(t order by t.gerceklesen desc nulls first)
        from (
          select p.ad as proje_ad, p.slug as proje_slug, p.il, p.ilce,
                 p.toplam_konut, p.teslim_m2_fiyati, p.guncel_m2_fiyati,
                 tk.ilan_edilen, tk.gerceklesen, tk.gecikme_ay, tk.kaynak, tk.durum
          from teslim_kaydi tk
          left join proje p on p.id = tk.proje_id
          where tk.firma_id = f.id
        ) t
      ), '[]') as teslimler,

      -- Aktif projeler + ilçe ortalamasıyla fiyat konumlanması
      coalesce((
        select json_agg(a order by a.min_fiyat nulls last)
        from (
          select p.slug, p.ad, p.il, p.ilce, p.durum, p.teslim_ceyrek,
                 p.santiye_yuzde, p.toplam_konut,
                 (select sum(d.kalan_adet)::int from daire_tipi d where d.proje_id = p.id) as kalan,
                 (select min(d.liste_fiyati) from daire_tipi d where d.proje_id = p.id) as min_fiyat,
                 (select min(d.m2_birim) from daire_tipi d where d.proje_id = p.id) as min_m2_birim,
                 mi.m2_fiyat as ilce_m2,
                 (select m.key from medya m where m.proje_id = p.id and m.tur = 'gorsel'
                   order by m.sira limit 1) as kapak
          from proje p
          left join mv_ilce_m2 mi on mi.il = p.il and mi.ilce = p.ilce
          where p.firma_id = f.id and p.yayinda and p.durum in ('lansman','satista')
        ) a
      ), '[]') as aktifler

    from firma f
    left join mv_firma_karne k on k.firma_id = f.id
    where f.slug = ${slug}
    limit 1
  `;
  return rows[0] ?? null;
}

/** Firmalar dizini — karne sıralı. */
export async function firmalar(il?: string) {
  return sql<{
    slug: string; ad: string; kurulus_yili: number | null; merkez_il: string | null;
    sicil: string | null; ort_gecikme: number | null; zamaninda_orani: number | null;
    tamamlanan: number; aktif: number;
  }[]>`
    select f.slug, f.ad, f.kurulus_yili, f.merkez_il,
           k.sicil, k.ort_gecikme, k.zamaninda_orani,
           coalesce(k.tamamlanan, 0) as tamamlanan,
           (select count(*)::int from proje p
             where p.firma_id = f.id and p.yayinda
               and p.durum in ('lansman','satista')) as aktif
    from firma f
    left join mv_firma_karne k on k.firma_id = f.id
    ${il ? sql`where f.merkez_il = ${il}` : sql``}
    order by k.ort_gecikme asc nulls last, k.tamamlanan desc nulls last
  `;
}
