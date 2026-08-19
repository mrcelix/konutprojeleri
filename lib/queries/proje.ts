import { sql } from '@/lib/db';

/**
 * Proje sorguları.
 *
 * KURAL: Ağ gecikmesi sorgu SAYISIYLA çarpılır, veri boyutuyla değil.
 * Proje detayı TEK sorguda toplanır — daire tipleri, medya, firma karnesi,
 * çevre mesafeleri ve benzer projeler aynı turda gelir. 9 ayrı sorgu
 * yerine 1 sorgu: ~90 ms yerine ~12 ms.
 */

export type Oda = { ad: string; alan: number | null; cephe?: string | null; not?: string | null };

export type DaireTipi = {
  tip: string;
  net_m2: number | null;
  brut_m2: number | null;
  liste_fiyati: number | null;
  m2_birim: number | null;
  toplam_adet: number | null;
  kalan_adet: number | null;
  kat_plani_key: string | null;
  plan_pdf_key: string | null;
  /** Kat planı sayfasının özgün içeriği. Boşsa sayfa yine açılır, tablo basılmaz. */
  odalar: Oda[];
  cephe: string | null;
  manzara: string | null;
  bulundugu_katlar: string | null;
};

export type Cevre = { tip: string; ad: string; metre: number };

export type BenzerProje = {
  slug: string; ad: string; il: string; ilce: string;
  min_fiyat: number | null; teslim_ceyrek: string | null; kapak: string | null;
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
  ticari_birim: number | null;
  blok_sayisi: number | null;
  kat_sayisi: number | null;
  tavan_yuksekligi: number | null;
  aidat: number | null;
  pesinat_orani: number | null;
  vade_ay: number | null;
  faizsiz: boolean | null;
  santiye_yuzde: number | null;
  ozellikler: Record<string, boolean>;
  aciklama: string | null;
  fiyat_teyit_tarihi: string | null;
  goruntulenme: number;
  firma_slug: string;
  firma_ad: string;
  firma_sicil: string | null;
  firma_ort_gecikme: number | null;
  firma_tamamlanan: number | null;
  daire_tipleri: DaireTipi[];
  gorseller: { key: string; alt: string | null }[];
  cevre: Cevre[];
  benzer: BenzerProje[];
};

export async function projeDetayGetir(
  il: string,
  ilce: string,
  slug: string
): Promise<ProjeDetay | null> {
  const rows = await sql<ProjeDetay[]>`
    select
      p.id, p.slug, p.ad, p.il, p.ilce, p.mahalle, p.tip, p.durum,
      p.teslim_ceyrek, p.toplam_konut, p.ticari_birim, p.blok_sayisi,
      p.kat_sayisi, p.tavan_yuksekligi, p.aidat, p.pesinat_orani,
      p.vade_ay, p.faizsiz, p.santiye_yuzde, p.ozellikler, p.aciklama,
      p.fiyat_teyit_tarihi, p.goruntulenme,
      f.slug as firma_slug,
      f.ad   as firma_ad,
      k.sicil        as firma_sicil,
      k.ort_gecikme  as firma_ort_gecikme,
      k.tamamlanan   as firma_tamamlanan,

      coalesce((
        select json_agg(json_build_object(
          'tip', d.tip, 'net_m2', d.net_m2, 'brut_m2', d.brut_m2,
          'liste_fiyati', d.liste_fiyati, 'm2_birim', d.m2_birim,
          'toplam_adet', d.toplam_adet, 'kalan_adet', d.kalan_adet,
          'kat_plani_key', m2.key,
          'plan_pdf_key', mp.key,
          'odalar', d.odalar,
          'cephe', d.cephe,
          'manzara', d.manzara,
          'bulundugu_katlar',
            case when d.bulundugu_katlar is null then null
                 else lower(d.bulundugu_katlar) || '–' || (upper(d.bulundugu_katlar) - 1) end
        ) order by d.net_m2 nulls last)
        from daire_tipi d
        left join medya m2 on m2.id = d.kat_plani_id
        left join medya mp on mp.id = d.plan_pdf_id
        where d.proje_id = p.id
      ), '[]') as daire_tipleri,

      coalesce((
        select json_agg(json_build_object('key', m.key, 'alt', m.alt) order by m.sira)
        from medya m
        where m.proje_id = p.id and m.tur = 'gorsel' and m.varyant_hazir
      ), '[]') as gorseller,

      -- Çevre mesafeleri PostGIS ile. 2 km yarıçapta en yakın POI'ler.
      coalesce((
        select json_agg(c order by c.metre)
        from (
          select distinct on (i.tip)
            i.tip, i.ad, round(st_distance(p.konum, i.konum))::int as metre
          from poi i
          where p.konum is not null and st_dwithin(p.konum, i.konum, 3000)
          order by i.tip, st_distance(p.konum, i.konum)
        ) c
      ), '[]') as cevre,

      -- Benzer projeler: aynı ilçe, yakın bütçe
      coalesce((
        select json_agg(b) from (
          select p2.slug, p2.ad, p2.il, p2.ilce, p2.teslim_ceyrek,
                 (select min(d2.liste_fiyati) from daire_tipi d2 where d2.proje_id = p2.id) as min_fiyat,
                 (select m3.key from medya m3 where m3.proje_id = p2.id and m3.tur = 'gorsel'
                   order by m3.sira limit 1) as kapak
          from proje p2
          where p2.yayinda and p2.id <> p.id and p2.ilce = p.ilce
            and p2.durum in ('lansman','satista')
          order by p2.goruntulenme desc
          limit 3
        ) b
      ), '[]') as benzer

    from proje p
    join firma f on f.id = p.firma_id
    left join mv_firma_karne k on k.firma_id = f.id
    where p.yayinda
      and p.il = ${il} and p.ilce = ${ilce} and p.slug = ${slug}
    limit 1
  `;
  return rows[0] ?? null;
}

/** ISR için önceden üretilecek yollar — en çok görüntülenenler. */
export async function populerProjeYollari(limit = 200) {
  return sql<{ il: string; ilce: string; slug: string }[]>`
    select il, ilce, slug from proje
    where yayinda and durum in ('lansman', 'satista')
    order by goruntulenme desc nulls last
    limit ${limit}
  `;
}

/**
 * Aylık taksit. Firma senedi FAİZSİZ olduğu için basit bölme;
 * banka kredisi bileşik faizle hesaplanır.
 * Varsayım (aylık faiz oranı) ekranda görünür olmak zorunda.
 */
export function taksitHesapla(
  fiyat: number,
  pesinatOrani: number,
  vadeAy: number,
  bankaAylikFaiz = 0.0219
) {
  const pesinat = Math.round((fiyat * pesinatOrani) / 100);
  const kalan = fiyat - pesinat;

  const senet = Math.round(kalan / vadeAy);

  const i = bankaAylikFaiz;
  const kredi = Math.round((kalan * i * (1 + i) ** vadeAy) / ((1 + i) ** vadeAy - 1));

  return {
    pesinat,
    kalan,
    senet,
    kredi,
    senetToplam: fiyat,
    krediToplam: pesinat + kredi * vadeAy,
    bankaAylikFaiz,
  };
}
