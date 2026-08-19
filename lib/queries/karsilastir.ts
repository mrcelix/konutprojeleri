import { sql } from '@/lib/db';

/**
 * Karşılaştırma verisi.
 *
 * Bugünkü sitede karşılaştırma özelliği var ama arayüzde görünmüyor.
 * Burada her satırda en avantajlı değer işaretlenir — ancak "en iyi"
 * kullanıcının önceliğine göre değişir, bu yüzden işaretler SATIR
 * BAZINDADIR ve öneri değildir. Sayfa bunu açıkça yazar.
 *
 * En fazla dört proje: beşinci sütun okunaksızlaşıyor ve karar
 * kolaylaştırmak yerine zorlaşıyor.
 */

export const AZAMI = 4;

export type KarsiTip = {
  tip: string;
  net_m2: number | null;
  liste_fiyati: number | null;
  m2_birim: number | null;
  kalan_adet: number | null;
};

export type KarsiProje = {
  id: number;
  slug: string;
  ad: string;
  il: string;
  ilce: string;
  mahalle: string | null;
  durum: string;
  teslim_ceyrek: string | null;
  santiye_yuzde: number | null;
  aidat: number | null;
  pesinat_orani: number | null;
  vade_ay: number | null;
  faizsiz: boolean | null;
  toplam_konut: number | null;
  ozellikler: Record<string, boolean>;
  firma_ad: string;
  firma_slug: string;
  sicil: string | null;
  ort_gecikme: number | null;
  tamamlanan: number | null;
  kapak: string | null;
  metro_m: number | null;
  tipler: KarsiTip[];
};

/**
 * Slug listesini sırayı KORUYARAK getirir.
 *
 * Sıra önemli: kullanıcı sütunları kendi eklediği sırada bekler.
 * SQL sırayı garanti etmediği için JS tarafında yeniden diziliyor.
 */
export async function karsilastirVerisi(sluglar: string[]): Promise<KarsiProje[]> {
  const temiz = [...new Set(sluglar.map((s) => s.trim().toLowerCase()).filter(Boolean))]
    .slice(0, AZAMI);
  if (temiz.length === 0) return [];

  const satirlar = await sql<KarsiProje[]>`
    select
      p.id, p.slug::text as slug, p.ad, p.il, p.ilce, p.mahalle, p.durum,
      p.teslim_ceyrek, p.santiye_yuzde,
      p.aidat::float8          as aidat,
      p.pesinat_orani::float8  as pesinat_orani,
      p.vade_ay, p.faizsiz, p.toplam_konut, p.ozellikler,
      f.ad as firma_ad, f.slug::text as firma_slug,
      k.sicil,
      k.ort_gecikme::float8 as ort_gecikme,
      k.tamamlanan,
      (select m.key from medya m
        where m.proje_id = p.id and m.tur = 'gorsel'
        order by m.sira limit 1) as kapak,
      -- En yakın metro. Koordinatı yoksa null döner ve satır boş kalır;
      -- sıfır yazmak yanlış bilgi olurdu.
      (select min(st_distance(p.konum, i.konum))
         from poi i where i.tip = 'metro')::float8 as metro_m,
      (select coalesce(json_agg(json_build_object(
          'tip', d.tip,
          'net_m2', d.net_m2::float8,
          'liste_fiyati', d.liste_fiyati::float8,
          'm2_birim', d.m2_birim::float8,
          'kalan_adet', d.kalan_adet
        ) order by d.tip), '[]')
       from daire_tipi d where d.proje_id = p.id) as tipler
    from proje p
    join firma f on f.id = p.firma_id
    left join mv_firma_karne k on k.firma_id = f.id
    where p.yayinda and p.slug = any(${temiz})
  `;

  const dizin = new Map(satirlar.map((s) => [s.slug.toLowerCase(), s]));
  return temiz.map((s) => dizin.get(s)).filter((x): x is KarsiProje => x != null);
}

/** Karşılaştırılan projelerde ortak olan daire tipleri, sonra kalanlar. */
export function tipSecenekleri(projeler: KarsiProje[]): string[] {
  const sayac = new Map<string, number>();
  for (const p of projeler) {
    for (const t of p.tipler) sayac.set(t.tip, (sayac.get(t.tip) ?? 0) + 1);
  }
  return [...sayac.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))
    .map(([t]) => t);
}

/** Aylık senet — /butce ve arama ile AYNI formül. */
export function aylikSenet(p: KarsiProje, fiyat: number | null): number | null {
  if (fiyat == null || p.pesinat_orani == null || !p.vade_ay) return null;
  return Math.round((fiyat - (fiyat * p.pesinat_orani) / 100) / p.vade_ay);
}

export function gerekenPesinat(p: KarsiProje, fiyat: number | null): number | null {
  if (fiyat == null || p.pesinat_orani == null) return null;
  return Math.round((fiyat * p.pesinat_orani) / 100);
}

const SICIL_SIRA: Record<string, number> = { 'A+': 5, A: 4, B: 3, C: 2, D: 1 };
export const sicilPuani = (s: string | null) => (s ? SICIL_SIRA[s] ?? null : null);

/** '2027Q1' → sıralanabilir sayı. Boşsa null. */
export function ceyrekPuani(c: string | null): number | null {
  const m = c ? /^(\d{4})Q([1-4])$/.exec(c) : null;
  return m ? Number(m[1]) * 4 + Number(m[2]) : null;
}

export type Yon = 'kucuk' | 'buyuk' | 'yok';

/**
 * Satırın kazananı.
 *
 * TEK ve KESİN kazanan yoksa hiçbir hücre işaretlenmez. Beraberlikte
 * iki hücreyi de işaretlemek "en iyi" kavramını anlamsızlaştırır;
 * tek veri varsa karşılaştırma zaten yoktur.
 */
export function kazananIndeks(degerler: (number | null)[], yon: Yon): number | null {
  if (yon === 'yok') return null;
  const gecerli = degerler
    .map((d, i) => ({ d, i }))
    .filter((x): x is { d: number; i: number } => x.d != null);
  if (gecerli.length < 2) return null;

  const en = yon === 'kucuk'
    ? Math.min(...gecerli.map((x) => x.d))
    : Math.max(...gecerli.map((x) => x.d));

  const kazananlar = gecerli.filter((x) => x.d === en);
  return kazananlar.length === 1 ? kazananlar[0]!.i : null;
}

/** Sepetteki slug'ların görünen adları — alt şeritte gösterilir. */
export async function sepetAdlari(sluglar: string[]): Promise<Record<string, string>> {
  if (sluglar.length === 0) return {};
  const satirlar = await sql<{ slug: string; ad: string }[]>`
    select slug::text as slug, ad from proje where slug = any(${sluglar})
  `;
  return Object.fromEntries(satirlar.map((s) => [s.slug.toLowerCase(), s.ad]));
}
