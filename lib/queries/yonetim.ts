import { sql } from '@/lib/db';

/**
 * Yönetim paneli sorguları.
 *
 * İŞ KUYRUĞU FİKRİ: panel açıldığında kullanıcıyı boş bir gösterge
 * tablosu değil, YAPILACAK İŞLER karşılar. Grafik bakılır ve unutulur;
 * kuyruk bitirilir. Her satır tek tıkla gidilebilir bir yere bağlanır.
 *
 * Sayımlar tek sorguda toplanır: panel her açılışta çalıştığı için
 * altı ayrı gidiş-dönüş, Frankfurt'a 50 ms ile 300 ms eder.
 */

export type IsKuyrugu = {
  onayBekleyen: number;
  acilmamisTalep: number;
  bayatFiyat: number;
  koordinatsiz: number;
  gecikmisTeslim: number;
  gorselsiz: number;
};

export async function isKuyrugu(firmaId?: number | null): Promise<IsKuyrugu> {
  const kapsam = firmaId ? sql`and p.firma_id = ${firmaId}` : sql``;

  const [r] = await sql<[IsKuyrugu]>`
    select
      (select count(*)::int from onay_kaydi o
        where o.durum = 'bekliyor'
          ${firmaId ? sql`and o.firma_id = ${firmaId}` : sql``}
      ) as "onayBekleyen",

      -- 24 saatte açılmayan talep. Yanıt süresi firma karnesine işliyor,
      -- bu yüzden ilk sıradaki iş bu.
      (select count(*)::int from talep t
        where t.durum = 'yeni' and t.olusturuldu < now() - interval '24 hours'
          ${firmaId ? sql`and t.firma_id = ${firmaId}` : sql``}
      ) as "acilmamisTalep",

      -- 90 gün tazelik kuralı: fiyatı teyit edilmemiş proje listede
      -- "teyit edilmedi" rozetiyle görünür.
      (select count(*)::int from proje p
        where p.yayinda and p.durum in ('lansman','satista')
          and (p.fiyat_teyit_tarihi is null
               or p.fiyat_teyit_tarihi < current_date - 90)
          ${kapsam}
      ) as "bayatFiyat",

      (select count(*)::int from proje p
        where p.yayinda and p.durum in ('lansman','satista')
          and p.konum is null ${kapsam}
      ) as "koordinatsiz",

      (select count(*)::int from proje p
        where p.yayinda and p.durum in ('lansman','satista')
          and p.teslim_ceyrek is not null
          and p.teslim_ceyrek <
              (extract(year from now())::text || 'Q' ||
               (floor((extract(month from now())::int - 1) / 3) + 1)::text)
          ${kapsam}
      ) as "gecikmisTeslim",

      (select count(*)::int from proje p
        where p.yayinda and p.durum in ('lansman','satista') ${kapsam}
          and not exists (
            select 1 from medya m
            where m.proje_id = p.id and m.tur = 'gorsel'
          )
      ) as "gorselsiz"
  `;

  return r ?? {
    onayBekleyen: 0, acilmamisTalep: 0, bayatFiyat: 0,
    koordinatsiz: 0, gecikmisTeslim: 0, gorselsiz: 0,
  };
}

export type PanelProjesi = {
  id: number;
  slug: string;
  ad: string;
  il: string;
  ilce: string;
  durum: string;
  yayinda: boolean;
  teslim_ceyrek: string | null;
  santiye_yuzde: number | null;
  fiyat_teyit_tarihi: string | null;
  veri_skoru: number;
  guncellendi: string;
  firma_ad: string;
  firma_slug: string;
  daire_tipi_sayisi: number;
  gorsel_sayisi: number;
  min_fiyat: number | null;
};

export type ProjeSuzgeci = {
  ara?: string;
  durum?: string;
  /** 'eksik' → veri skoru düşük ya da görseli yok */
  sorun?: string;
  firmaId?: number | null;
  sayfa?: number;
};

export const PANEL_SAYFA = 25;

export async function panelProjeleri(
  f: ProjeSuzgeci
): Promise<{ satirlar: PanelProjesi[]; toplam: number }> {
  const kosullar = [sql`true`];

  if (f.firmaId) kosullar.push(sql`p.firma_id = ${f.firmaId}`);
  if (f.durum) kosullar.push(sql`p.durum = ${f.durum}`);
  if (f.ara) {
    // tr_unaccent indeksle uyumlu olmak zorunda; düz unaccent()
    // çağrısı tablo taramasına düşerdi.
    kosullar.push(
      sql`(tr_unaccent(p.ad) ilike tr_unaccent(${'%' + f.ara + '%'})
           or p.slug ilike ${'%' + f.ara + '%'})`
    );
  }
  if (f.sorun === 'gorselsiz') {
    kosullar.push(sql`not exists (
      select 1 from medya m where m.proje_id = p.id and m.tur = 'gorsel')`);
  }
  if (f.sorun === 'koordinatsiz') kosullar.push(sql`p.konum is null`);
  if (f.sorun === 'bayat') {
    kosullar.push(sql`(p.fiyat_teyit_tarihi is null
                       or p.fiyat_teyit_tarihi < current_date - 90)`);
  }
  if (f.sorun === 'geciken') {
    kosullar.push(sql`p.teslim_ceyrek is not null
      and p.durum in ('lansman','satista')
      and p.teslim_ceyrek <
          (extract(year from now())::text || 'Q' ||
           (floor((extract(month from now())::int - 1) / 3) + 1)::text)`);
  }
  if (f.sorun === 'fiyatsiz') {
    kosullar.push(sql`not exists (
      select 1 from daire_tipi d
      where d.proje_id = p.id and d.liste_fiyati is not null)`);
  }

  const where = kosullar.reduce((a, b) => sql`${a} and ${b}`);
  const sayfa = Math.max(1, f.sayfa ?? 1);
  const offset = (sayfa - 1) * PANEL_SAYFA;

  const [r] = await sql<[{ satirlar: PanelProjesi[]; toplam: number }]>`
    with eslesen as (
      select
        p.id, p.slug::text as slug, p.ad, p.il, p.ilce, p.durum, p.yayinda,
        p.teslim_ceyrek, p.santiye_yuzde,
        to_char(p.fiyat_teyit_tarihi, 'YYYY-MM-DD') as fiyat_teyit_tarihi,
        p.veri_skoru,
        to_char(p.guncellendi, 'YYYY-MM-DD') as guncellendi,
        f.ad as firma_ad, f.slug::text as firma_slug,
        (select count(*)::int from daire_tipi d where d.proje_id = p.id) as daire_tipi_sayisi,
        (select count(*)::int from medya m
          where m.proje_id = p.id and m.tur = 'gorsel') as gorsel_sayisi,
        (select min(d.liste_fiyati)::float8 from daire_tipi d
          where d.proje_id = p.id) as min_fiyat
      from proje p
      join firma f on f.id = p.firma_id
      where ${where}
    )
    select
      (select coalesce(json_agg(s order by s.guncellendi desc, s.id desc), '[]')
         from (select * from eslesen order by guncellendi desc, id desc
               limit ${PANEL_SAYFA} offset ${offset}) s
      ) as satirlar,
      (select count(*)::int from eslesen) as toplam
  `;

  return { satirlar: r?.satirlar ?? [], toplam: r?.toplam ?? 0 };
}

/** Durum süzgeci çipleri için sayımlar. */
export async function durumSayimlari(firmaId?: number | null) {
  return sql<{ durum: string; n: number }[]>`
    select durum, count(*)::int as n from proje
    where true ${firmaId ? sql`and firma_id = ${firmaId}` : sql``}
    group by durum order by count(*) desc
  `;
}

export const SORUN_ADLARI: Record<string, string> = {
  bayat: 'Fiyatı bayat',
  geciken: 'Teslimi gecikmiş',
  gorselsiz: 'Görseli yok',
  koordinatsiz: 'Koordinatı yok',
  fiyatsiz: 'Fiyatı yok',
};

export const DURUM_ADLARI: Record<string, string> = {
  taslak: 'Taslak',
  lansman: 'Lansman',
  satista: 'Satışta',
  teslim_edildi: 'Teslim edildi',
  arsiv: 'Arşiv',
};
