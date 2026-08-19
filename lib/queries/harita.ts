import { sql } from '@/lib/db';
import { OZELLIKLER, type Filtre } from '@/lib/filtre';

/**
 * Harita verisi.
 *
 * Aramanın üçüncü modu. Filtreye uyan TÜM projeler tek seferde gelir;
 * kullanıcı pan/zoom yaptıkça yeniden sorgu atılmaz.
 *
 * Neden böyle: bir ilçe filtresinde ~40, il filtresinde ~500 nokta var.
 * Alan başına ~120 bayt → en kötü ihtimalle 60 kB. Her pan hareketinde
 * Frankfurt'a gidip gelmek yerine bir kez alıp istemcide filtrelemek
 * hem hızlı hem ucuz.
 *
 * Sınır: filtresiz Türkiye geneli (1.240 proje) için üst sınır konur;
 * o ölçekte zaten kullanıcı önce bölge seçmeli.
 */

export type HaritaNoktasi = {
  id: number;
  slug: string;
  ad: string;
  il: string;
  ilce: string;
  lng: number;
  lat: number;
  min_fiyat: number | null;
  m2_birim: number | null;
  teslim_ceyrek: string | null;
  santiye_yuzde: number | null;
  kalan: number | null;
  firma_ad: string;
  kapak: string | null;
};

const UST_SINIR = 1500;

export async function haritaNoktalari(f: Filtre): Promise<HaritaNoktasi[]> {
  const kosullar = [
    sql`p.yayinda`,
    sql`p.durum in ('lansman','satista')`,
    // Koordinatı olmayan proje haritada görünemez — sessizce düşer,
    // ama yönetim panelindeki iş kuyruğunda "koordinat yok" olarak çıkar.
    sql`p.konum is not null`,
  ];

  if (f.il) kosullar.push(sql`p.il = ${f.il}`);
  if (f.ilce) kosullar.push(sql`p.ilce = ${f.ilce}`);
  if (f.mahalle) kosullar.push(sql`p.mahalle = ${f.mahalle}`);
  if (f.kategori) kosullar.push(sql`p.tip = ${f.kategori.replace(/-/g, '_')}`);
  if (f.teslimYili?.length) {
    kosullar.push(sql`left(p.teslim_ceyrek, 4)::int = any(${f.teslimYili})`);
  }
  if (f.maxAidat) kosullar.push(sql`p.aidat <= ${f.maxAidat}`);
  if (f.maxPesinat) kosullar.push(sql`p.pesinat_orani <= ${f.maxPesinat}`);
  for (const o of f.ozellik ?? []) {
    if (o in OZELLIKLER) kosullar.push(sql`p.ozellikler @> ${JSON.stringify({ [o]: true })}::jsonb`);
  }

  const daireKosullari = [];
  if (f.daireTipi?.length) daireKosullari.push(sql`d.tip = any(${f.daireTipi})`);
  if (f.minFiyat) daireKosullari.push(sql`d.liste_fiyati >= ${f.minFiyat}`);
  if (f.maxFiyat) daireKosullari.push(sql`d.liste_fiyati <= ${f.maxFiyat}`);
  if (f.minM2) daireKosullari.push(sql`d.net_m2 >= ${f.minM2}`);
  if (f.maxM2) daireKosullari.push(sql`d.net_m2 <= ${f.maxM2}`);

  if (daireKosullari.length) {
    const dk = daireKosullari.reduce((a, b) => sql`${a} and ${b}`);
    kosullar.push(sql`exists (select 1 from daire_tipi d where d.proje_id = p.id and ${dk})`);
  }

  const where = kosullar.reduce((a, b) => sql`${a} and ${b}`);
  const tipSuzgeci = f.daireTipi?.length ? sql`and dx.tip = any(${f.daireTipi})` : sql``;

  return sql<HaritaNoktasi[]>`
    select
      p.id, p.slug, p.ad, p.il, p.ilce,
      st_x(p.konum::geometry)::float8 as lng,
      st_y(p.konum::geometry)::float8 as lat,
      fx.min_fiyat::float8   as min_fiyat,
      fx.min_m2_birim::float8 as m2_birim,
      p.teslim_ceyrek, p.santiye_yuzde,
      fx.kalan::int as kalan,
      f.ad as firma_ad,
      (select m.key from medya m
        where m.proje_id = p.id and m.tur = 'gorsel'
        order by m.sira limit 1) as kapak
    from proje p
    join firma f on f.id = p.firma_id
    left join lateral (
      select min(dx.liste_fiyati) as min_fiyat,
             min(dx.m2_birim)     as min_m2_birim,
             sum(dx.kalan_adet)   as kalan
      from daire_tipi dx
      where dx.proje_id = p.id ${tipSuzgeci}
    ) fx on true
    where ${where}
    limit ${UST_SINIR}
  `;
}

// Bantlar lib/bant.ts'te: istemci bileşenleri oradan import eder.
export { BANTLAR, bant } from '@/lib/bant';
