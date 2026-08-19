import { sql } from '@/lib/db';
import { OZELLIKLER, type Filtre } from '@/lib/filtre';

/**
 * Teslim takvimi.
 *
 * Zaman ekseni birincil eksen olan tek görünüm. Kullanıcı "nerede" değil
 * "ne zaman taşınmak istiyorum" diye başlar. Hiçbir Türk portalında
 * karşılığı yok.
 *
 * Alttaki histogram arz yoğunluğunu gösterir: aynı çeyrekte 5.000 daire
 * teslim ediliyorsa alıcının pazarlık gücü artar. Bu bilgi firmayı
 * rahatsız edebilir — editoryal bağımsızlığın kanıtı da o.
 */

export type TakvimProjesi = {
  id: number;
  slug: string;
  ad: string;
  il: string;
  ilce: string;
  firma_ad: string;
  firma_slug: string;
  teslim_ceyrek: string;
  santiye_yuzde: number | null;
  durum: string;
  toplam_konut: number | null;
  kalan: number | null;
  min_fiyat: number | null;
};

export type CeyrekOzet = { ceyrek: string; daire: number; proje: number };

export type TakvimVerisi = {
  projeler: TakvimProjesi[];
  histogram: CeyrekOzet[];
  toplamProje: number;
  toplamDaire: number;
};

/** '2027Q2' → 8 (2026Q1 = 0 tabanlı sıra numarası) */
export function ceyrekSira(ceyrek: string): number | null {
  const m = /^(\d{4})Q([1-4])$/.exec(ceyrek);
  if (!m) return null;
  return Number(m[1]) * 4 + (Number(m[2]) - 1);
}

export function siraCeyrek(sira: number): string {
  const yil = Math.floor(sira / 4);
  const c = (sira % 4) + 1;
  return `${yil}Q${c}`;
}

export function buCeyrek(): string {
  const d = new Date();
  return `${d.getFullYear()}Q${Math.floor(d.getMonth() / 3) + 1}`;
}

/** Eksende gösterilecek çeyrek listesi. */
export function ceyrekListesi(adet = 10): string[] {
  const bas = ceyrekSira(buCeyrek())!;
  return Array.from({ length: adet }, (_, i) => siraCeyrek(bas + i));
}

export async function takvimVerisi(f: Filtre, ceyrekSayisi = 10): Promise<TakvimVerisi> {
  const ceyrekler = ceyrekListesi(ceyrekSayisi);
  const ilk = ceyrekler[0]!;
  const son = ceyrekler[ceyrekler.length - 1]!;

  const kosullar = [
    sql`p.yayinda`,
    sql`p.durum in ('lansman','satista')`,
    sql`p.teslim_ceyrek is not null`,
    // Eksen dışına düşen projeler gösterilmez; sayıları ayrıca bildirilir.
    sql`p.teslim_ceyrek >= ${ilk}`,
    sql`p.teslim_ceyrek <= ${son}`,
  ];

  if (f.il) kosullar.push(sql`p.il = ${f.il}`);
  if (f.ilce) kosullar.push(sql`p.ilce = ${f.ilce}`);
  if (f.kategori) kosullar.push(sql`p.tip = ${f.kategori.replace(/-/g, '_')}`);
  if (f.maxAidat) kosullar.push(sql`p.aidat <= ${f.maxAidat}`);
  for (const o of f.ozellik ?? []) {
    if (o in OZELLIKLER) kosullar.push(sql`p.ozellikler @> ${JSON.stringify({ [o]: true })}::jsonb`);
  }

  const daireKosullari = [];
  if (f.daireTipi?.length) daireKosullari.push(sql`d.tip = any(${f.daireTipi})`);
  if (f.minFiyat) daireKosullari.push(sql`d.liste_fiyati >= ${f.minFiyat}`);
  if (f.maxFiyat) daireKosullari.push(sql`d.liste_fiyati <= ${f.maxFiyat}`);
  if (daireKosullari.length) {
    const dk = daireKosullari.reduce((a, b) => sql`${a} and ${b}`);
    kosullar.push(sql`exists (select 1 from daire_tipi d where d.proje_id = p.id and ${dk})`);
  }

  const where = kosullar.reduce((a, b) => sql`${a} and ${b}`);
  const tipSuzgeci = f.daireTipi?.length ? sql`and dx.tip = any(${f.daireTipi})` : sql``;

  // Projeler ve çeyrek toplamları TEK sorguda.
  const [satir] = await sql<
    [{ projeler: TakvimProjesi[]; histogram: CeyrekOzet[]; toplam_proje: number; toplam_daire: number }]
  >`
    with eslesen as (
      select
        p.id, p.slug, p.ad, p.il, p.ilce, p.teslim_ceyrek, p.santiye_yuzde,
        p.durum, p.toplam_konut,
        f.ad as firma_ad, f.slug as firma_slug,
        fx.kalan::int as kalan,
        fx.min_fiyat::float8 as min_fiyat
      from proje p
      join firma f on f.id = p.firma_id
      left join lateral (
        select sum(dx.kalan_adet) as kalan, min(dx.liste_fiyati) as min_fiyat
        from daire_tipi dx where dx.proje_id = p.id ${tipSuzgeci}
      ) fx on true
      where ${where}
    )
    select
      (select coalesce(json_agg(e order by e.teslim_ceyrek, e.santiye_yuzde desc nulls last), '[]')
        from eslesen e) as projeler,
      (select coalesce(json_agg(h order by h.ceyrek), '[]') from (
        select teslim_ceyrek as ceyrek,
               coalesce(sum(toplam_konut), 0)::int as daire,
               count(*)::int as proje
        from eslesen group by teslim_ceyrek
      ) h) as histogram,
      (select count(*)::int from eslesen) as toplam_proje,
      (select coalesce(sum(toplam_konut), 0)::int from eslesen) as toplam_daire
  `;

  return {
    projeler: satir?.projeler ?? [],
    histogram: satir?.histogram ?? [],
    toplamProje: satir?.toplam_proje ?? 0,
    toplamDaire: satir?.toplam_daire ?? 0,
  };
}

/** Eksen dışında kalan (daha uzak teslimli) proje sayısı — sessiz kayıp olmasın. */
export async function eksenDisi(f: Filtre, ceyrekSayisi = 10): Promise<number> {
  const son = ceyrekListesi(ceyrekSayisi).at(-1)!;
  const [r] = await sql<{ n: number }[]>`
    select count(*)::int as n from proje p
    where p.yayinda and p.durum in ('lansman','satista')
      and p.teslim_ceyrek > ${son}
      ${f.il ? sql`and p.il = ${f.il}` : sql``}
      ${f.ilce ? sql`and p.ilce = ${f.ilce}` : sql``}
  `;
  return r?.n ?? 0;
}

/** '2027Q2' → '2027 Q2' */
export function ceyrekAdi(c: string): string {
  return c.replace('Q', ' Q');
}

/** Eksende projesi olan iller — süzgeç çipleri için. */
export async function takvimIlleri(ceyrekSayisi = 10): Promise<{ il: string; n: number }[]> {
  const c = ceyrekListesi(ceyrekSayisi);
  return sql<{ il: string; n: number }[]>`
    select p.il, count(*)::int as n
    from proje p
    where p.yayinda and p.durum in ('lansman','satista')
      and p.teslim_ceyrek between ${c[0]!} and ${c.at(-1)!}
    group by p.il
    having count(*) > 0
    order by count(*) desc
    limit 12
  `;
}

/**
 * Teslim çeyreği geçmiş ama hâlâ satışta görünen projeler.
 *
 * Eksen bugünden başladığı için bunlar takvimden sessizce düşerdi.
 * Sessiz düşmek en kötüsü: geciken proje, alıcının en çok bilmek
 * istediği şeydir. Ayrı bir bölümde, gecikme ayıyla birlikte gösterilir.
 */
export async function gecikenler(f: Filtre): Promise<(TakvimProjesi & { gecikme_ay: number })[]> {
  const su = buCeyrek();
  return sql<(TakvimProjesi & { gecikme_ay: number })[]>`
    select
      p.id, p.slug, p.ad, p.il, p.ilce, p.teslim_ceyrek, p.santiye_yuzde,
      p.durum, p.toplam_konut,
      f.ad as firma_ad, f.slug as firma_slug,
      fx.kalan::int as kalan,
      fx.min_fiyat::float8 as min_fiyat,
      -- Çeyrek farkı × 3 ay. Gün hassasiyeti yok, olması da gerekmiyor.
      ((left(${su}, 4)::int * 4 + right(${su}, 1)::int)
       - (left(p.teslim_ceyrek, 4)::int * 4 + right(p.teslim_ceyrek, 1)::int)) * 3
        as gecikme_ay
    from proje p
    join firma f on f.id = p.firma_id
    left join lateral (
      select sum(dx.kalan_adet) as kalan, min(dx.liste_fiyati) as min_fiyat
      from daire_tipi dx where dx.proje_id = p.id
    ) fx on true
    where p.yayinda and p.durum in ('lansman','satista')
      and p.teslim_ceyrek is not null
      and p.teslim_ceyrek < ${su}
      ${f.il ? sql`and p.il = ${f.il}` : sql``}
      ${f.ilce ? sql`and p.ilce = ${f.ilce}` : sql``}
    order by p.teslim_ceyrek
    limit 40
  `;
}
