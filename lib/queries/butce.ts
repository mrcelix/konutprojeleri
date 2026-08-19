import { sql } from '@/lib/db';

/**
 * Bütçe eşleşmesi — ödeme kapasitesi birincil eksen.
 *
 * Zaman ekseninin ikizi. Kullanıcı fiyat aralığı değil ELİNDEKİ PARAYI
 * ve AYLIK ÖDEYEBİLECEĞİNİ bilir. "3–5 milyon ₺ arası" filtresi bu iki
 * bilgiyi kullanıcının kafasında çevirmesini bekler; çoğu çeviremez.
 *
 * DİKKAT — burada hesaplanan, firmanın kendi SENETLİ ödeme planıdır:
 * peşinat oranı ve vade firmanın beyanıdır, banka kredisi değildir.
 * Faiz hesabı yapılmaz; senet tutarı kalan bedelin vadeye bölümüdür.
 * Banka kredisi karşılaştırması proje detayındaki hesaplayıcıda yapılır.
 *
 * Ödeme planı bildirilmemiş projeler hesaplanamaz. Sessizce düşmezler;
 * sayıları sayfada yazar.
 */

export type ButceGirdi = {
  pesinat: number;
  aylik: number;
  il?: string;
  tip?: string;
};

export type ButceDairesi = {
  id: number;
  slug: string;
  ad: string;
  il: string;
  ilce: string;
  firma_ad: string;
  teslim_ceyrek: string | null;
  santiye_yuzde: number | null;
  faizsiz: boolean | null;
  pesinat_orani: number;
  vade_ay: number;
  tip: string;
  net_m2: number | null;
  liste_fiyati: number;
  gereken_pesinat: number;
  aylik_senet: number;
};

export type ButceSonuc = {
  uyanlar: ButceDairesi[];
  yakinlar: ButceDairesi[];
  projeSayisi: number;
  daireSayisi: number;
  esik10: number;
  esik25: number;
  pesinatUyan: number;
  aylikUyan: number;
  plansiz: number;
  enYuksekFiyat: number | null;
};

const LISTE_SINIRI = 60;

export async function butceEslesme(g: ButceGirdi): Promise<ButceSonuc> {
  const p = Math.max(0, Math.round(g.pesinat));
  const a = Math.max(0, Math.round(g.aylik));

  const [r] = await sql<[ButceSonuc & Record<string, unknown>]>`
    with aday as (
      select
        p.id, p.slug, p.ad, p.il, p.ilce, p.teslim_ceyrek, p.santiye_yuzde,
        p.faizsiz,
        p.pesinat_orani::float8 as pesinat_orani,
        p.vade_ay,
        f.ad as firma_ad,
        d.tip,
        d.net_m2::float8 as net_m2,
        d.liste_fiyati::float8 as liste_fiyati,
        round(d.liste_fiyati * p.pesinat_orani / 100.0)::float8 as gereken_pesinat,
        round(
          (d.liste_fiyati - d.liste_fiyati * p.pesinat_orani / 100.0) / p.vade_ay
        )::float8 as aylik_senet
      from proje p
      join firma f on f.id = p.firma_id
      join daire_tipi d on d.proje_id = p.id
      where p.yayinda
        and p.durum in ('lansman','satista')
        and d.liste_fiyati is not null
        and p.pesinat_orani is not null
        and p.vade_ay is not null and p.vade_ay > 0
        ${g.il ? sql`and p.il = ${g.il}` : sql``}
        ${g.tip ? sql`and d.tip = ${g.tip}` : sql``}
    ),
    uyan as (
      select * from aday where gereken_pesinat <= ${p} and aylik_senet <= ${a}
    ),
    -- Proje başına tek satır: bütçeye uyan EN UCUZ daire tipi.
    en_uygun as (
      select distinct on (id) * from uyan order by id, liste_fiyati
    ),
    -- Az farkla kaçanlar. Gizlemek değil göstermek doğru: kullanıcı
    -- kendi eşiğini kendisi tartar.
    yakin as (
      select distinct on (id) * from aday
      where not (gereken_pesinat <= ${p} and aylik_senet <= ${a})
        and gereken_pesinat <= ${p} * 1.3
        and aylik_senet <= ${a} * 1.3
      order by id, liste_fiyati
    )
    select
      (select coalesce(json_agg(e order by e.liste_fiyati), '[]')
         from (select * from en_uygun order by liste_fiyati limit ${LISTE_SINIRI}) e
      ) as uyanlar,
      (select coalesce(json_agg(y order by y.liste_fiyati), '[]')
         from (select * from yakin order by liste_fiyati limit 6) y
      ) as yakinlar,
      (select count(distinct id)::int from uyan) as "projeSayisi",
      (select count(*)::int from uyan) as "daireSayisi",
      -- Bütçe %10 / %25 artarsa kaç projeye erişilir
      (select count(distinct id)::int from aday
        where gereken_pesinat <= ${p} * 1.1 and aylik_senet <= ${a} * 1.1) as "esik10",
      (select count(distinct id)::int from aday
        where gereken_pesinat <= ${p} * 1.25 and aylik_senet <= ${a} * 1.25) as "esik25",
      -- Hangi kısıt bağlıyor: peşinat mı, aylık mı
      (select count(distinct id)::int from aday where gereken_pesinat <= ${p}) as "pesinatUyan",
      (select count(distinct id)::int from aday where aylik_senet <= ${a}) as "aylikUyan",
      -- Ödeme planı bildirilmediği için hesaplanamayanlar
      (select count(*)::int from proje x
        where x.yayinda and x.durum in ('lansman','satista')
          and (x.pesinat_orani is null or x.vade_ay is null or x.vade_ay = 0)
          ${g.il ? sql`and x.il = ${g.il}` : sql``}
      ) as "plansiz",
      (select max(liste_fiyati)::float8 from uyan) as "enYuksekFiyat"
  `;

  return {
    uyanlar: (r?.uyanlar as ButceDairesi[]) ?? [],
    yakinlar: (r?.yakinlar as ButceDairesi[]) ?? [],
    projeSayisi: r?.projeSayisi ?? 0,
    daireSayisi: r?.daireSayisi ?? 0,
    esik10: r?.esik10 ?? 0,
    esik25: r?.esik25 ?? 0,
    pesinatUyan: r?.pesinatUyan ?? 0,
    aylikUyan: r?.aylikUyan ?? 0,
    plansiz: r?.plansiz ?? 0,
    enYuksekFiyat: r?.enYuksekFiyat ?? null,
  };
}

/**
 * Bütçeyi bağlayan kısıt hangisi?
 *
 * Kullanıcıya "hiçbir şey bulunamadı" demek yerine NEDEN bulunamadığını
 * söylemek gerekir. Peşinatı yeten 60 proje varken aylığı yeten 3 proje
 * varsa sorun peşinat değildir.
 */
export function baglayan(s: ButceSonuc): 'pesinat' | 'aylik' | 'ikisi' | null {
  if (s.projeSayisi > 0) return null;
  if (s.pesinatUyan === 0 && s.aylikUyan === 0) return 'ikisi';
  if (s.pesinatUyan < s.aylikUyan) return 'pesinat';
  if (s.aylikUyan < s.pesinatUyan) return 'aylik';
  return 'ikisi';
}

/** Bu bütçeyle alınabilecek azami liste fiyatı — kaba üst sınır. */
export function tavanFiyat(g: ButceGirdi, pesinatOrani = 30, vadeAy = 36): number {
  // Peşinatın izin verdiği tavan ile aylığın izin verdiği tavanın küçüğü.
  const pesinattan = g.pesinat / (pesinatOrani / 100);
  const aylikTan = (g.aylik * vadeAy) / (1 - pesinatOrani / 100);
  return Math.round(Math.min(pesinattan, aylikTan));
}
