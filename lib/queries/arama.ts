import { sql } from '@/lib/db';
import { SAYFA_BOYUTU, OZELLIKLER, type Filtre } from '@/lib/filtre';

/**
 * Arama sorgusu.
 *
 * Sonuçlar, toplam sayı ve TÜM FASET SAYAÇLARI tek turda gelir.
 * Bu mimaride ağ gecikmesi sorgu SAYISIYLA çarpıldığı için 18 filtre
 * grubu = 18 ayrı COUNT olamaz; hepsi tek taramada FILTER ile hesaplanır.
 *
 * Daire seviyesindeki filtreler (tip, fiyat, m²) EXISTS ile uygulanır —
 * JOIN'e konsaydı faset sayaçları bozulurdu, çünkü eşleşmeyen tipler
 * projeden düşerdi.
 */

export type AramaSonucu = {
  id: number;
  slug: string;
  ad: string;
  il: string;
  ilce: string;
  mahalle: string | null;
  teslim_ceyrek: string | null;
  santiye_yuzde: number | null;
  aidat: number | null;
  pesinat_orani: number | null;
  vade_ay: number | null;
  fiyat_teyit_tarihi: string | null;
  firma_ad: string;
  firma_slug: string;
  firma_sicil: string | null;
  min_fiyat: number | null;
  min_m2_birim: number | null;
  kalan_toplam: number | null;
  kapak: string | null;
  metro_dk: number | null;
  tipler: { tip: string; net_m2: number | null; liste_fiyati: number | null }[];
};

export type Fasetler = {
  daireTipi: Record<string, number>;
  teslimYili: Record<string, number>;
  santiye: Record<string, number>;
  ozellik: Record<string, number>;
  fiyatHistogram: number[];
};

export type AramaCikti = {
  sonuclar: AramaSonucu[];
  toplam: number;
  fasetler: Fasetler;
};

/**
 * Sıralama parçaları FONKSİYON içinde üretilir, modül düzeyinde değil.
 * Modül düzeyinde `sql` şablonu kullanmak, dosya import edildiği anda
 * veritabanı bağlantısı kurmaya çalışır ve env'siz derlemeleri kırar.
 */
function siralamaParcasi(s: string) {
  switch (s) {
    case 'fiyat-artan':  return sql`e.min_fiyat asc nulls last`;
    case 'fiyat-azalan': return sql`e.min_fiyat desc nulls last`;
    case 'm2-artan':     return sql`e.min_m2_birim asc nulls last`;
    case 'teslim-yakin': return sql`e.teslim_ceyrek asc nulls last`;
    case 'yeni':         return sql`e.olusturuldu desc`;
    default:             return sql`e.one_cikarma desc nulls last, e.guncellendi desc`;
  }
}

export async function ara(f: Filtre): Promise<AramaCikti> {
  // ── Proje seviyesi koşullar ──
  const kosullar = [sql`p.yayinda`, sql`p.durum in ('lansman','satista')`];

  if (f.il) kosullar.push(sql`p.il = ${f.il}`);
  if (f.ilce) kosullar.push(sql`p.ilce = ${f.ilce}`);
  if (f.mahalle) kosullar.push(sql`p.mahalle = ${f.mahalle}`);
  if (f.kategori) kosullar.push(sql`p.tip = ${f.kategori.replace(/-/g, '_')}`);
  if (f.teslimYili?.length) {
    kosullar.push(sql`left(p.teslim_ceyrek, 4)::int = any(${f.teslimYili})`);
  }
  if (f.maxAidat) kosullar.push(sql`p.aidat <= ${f.maxAidat}`);
  if (f.maxPesinat) kosullar.push(sql`p.pesinat_orani <= ${f.maxPesinat}`);
  // Aylık senet = kalan bedel / vade. /butce sayfasıyla AYNI formül olmak
  // zorunda: iki sayfa aynı daire için farklı taksit gösterirse güven biter.
  if (f.maxAylik) {
    kosullar.push(sql`exists (
      select 1 from daire_tipi da
      where da.proje_id = p.id
        and da.liste_fiyati is not null
        and p.pesinat_orani is not null
        and p.vade_ay is not null and p.vade_ay > 0
        and (da.liste_fiyati - da.liste_fiyati * p.pesinat_orani / 100.0) / p.vade_ay
            <= ${f.maxAylik}
    )`);
  }
  if (f.sicil) kosullar.push(sql`k.sicil = ${f.sicil}`);
  if (f.santiyeDurumu?.length) {
    kosullar.push(sql`(
      case
        when p.santiye_yuzde is null or p.santiye_yuzde < 15 then 'lansman'
        when p.santiye_yuzde < 60 then 'kaba'
        when p.santiye_yuzde < 100 then 'ince'
        else 'tamamlandi'
      end
    ) = any(${f.santiyeDurumu})`);
  }
  for (const o of f.ozellik ?? []) {
    if (o in OZELLIKLER) kosullar.push(sql`p.ozellikler @> ${JSON.stringify({ [o]: true })}::jsonb`);
  }

  // ── Daire seviyesi koşullar: EXISTS ile ──
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

  // Fiyat gösterimi seçili tipe göre hesaplanır
  const tipSuzgeci = f.daireTipi?.length
    ? sql`and dx.tip = any(${f.daireTipi})`
    : sql``;

  const siralama = siralamaParcasi(f.siralama ?? 'onerilen');
  const sayfa = Math.max(1, f.sayfa ?? 1);
  const offset = (sayfa - 1) * SAYFA_BOYUTU;

  const [row] = await sql<
    [{ sonuclar: AramaSonucu[]; toplam: number; fasetler: Fasetler }]
  >`
    with eslesen as (
      select
        p.id, p.slug, p.ad, p.il, p.ilce, p.mahalle, p.teslim_ceyrek,
        p.santiye_yuzde, p.aidat, p.pesinat_orani, p.vade_ay, p.ozellikler,
        p.fiyat_teyit_tarihi, p.one_cikarma, p.guncellendi, p.olusturuldu,
        f.ad as firma_ad, f.slug as firma_slug, k.sicil as firma_sicil,
        fx.min_fiyat, fx.min_m2_birim, fx.kalan_toplam,
        (select m.key from medya m
          where m.proje_id = p.id and m.tur = 'gorsel'
          order by m.sira limit 1) as kapak,
        (select round(min(st_distance(p.konum, i.konum)) / 80)::int
          from poi i where i.tip = 'metro'
            and st_dwithin(p.konum, i.konum, 2000)) as metro_dk,
        (select coalesce(json_agg(json_build_object(
            'tip', dd.tip, 'net_m2', dd.net_m2, 'liste_fiyati', dd.liste_fiyati
          ) order by dd.tip), '[]')
          from daire_tipi dd where dd.proje_id = p.id) as tipler
      from proje p
      join firma f on f.id = p.firma_id
      left join mv_firma_karne k on k.firma_id = f.id
      left join lateral (
        select min(dx.liste_fiyati) as min_fiyat,
               min(dx.m2_birim)     as min_m2_birim,
               sum(dx.kalan_adet)   as kalan_toplam
        from daire_tipi dx
        where dx.proje_id = p.id ${tipSuzgeci}
      ) fx on true
      where ${where}
    ),
    sayfa as (
      -- Takma ad ZORUNLU: siralamaParcasi() 'e.' önekiyle sütun veriyor.
      -- Aliassız 'select * from eslesen' yazıldığında sıralama
      -- "missing FROM-clause entry for table e" ile patlıyordu.
      select e.* from eslesen e
      order by ${siralama}
      limit ${SAYFA_BOYUTU} offset ${offset}
    )
    select
      (select coalesce(json_agg(to_jsonb(s) - 'ozellikler'), '[]') from sayfa s) as sonuclar,
      (select count(*)::int from eslesen) as toplam,
      json_build_object(
        'daireTipi', coalesce((
          select json_object_agg(t.tip, t.adet) from (
            select dd.tip, count(distinct e.id)::int as adet
            from eslesen e join daire_tipi dd on dd.proje_id = e.id
            group by dd.tip
          ) t
        ), '{}'::json),
        'teslimYili', coalesce((
          select json_object_agg(y.yil, y.adet) from (
            select left(e.teslim_ceyrek, 4) as yil, count(*)::int as adet
            from eslesen e where e.teslim_ceyrek is not null
            group by 1
          ) y
        ), '{}'::json),
        'santiye', coalesce((
          select json_object_agg(s2.durum, s2.adet) from (
            select case
              when e.santiye_yuzde is null or e.santiye_yuzde < 15 then 'lansman'
              when e.santiye_yuzde < 60 then 'kaba'
              when e.santiye_yuzde < 100 then 'ince'
              else 'tamamlandi' end as durum,
              count(*)::int as adet
            from eslesen e group by 1
          ) s2
        ), '{}'::json),
        'ozellik', (
          select json_build_object(
            ${sql.unsafe(
              Object.keys(OZELLIKLER)
                .map((k) => `'${k}', count(*) filter (where e.ozellikler->>'${k}' = 'true')::int`)
                .join(', ')
            )}
          ) from eslesen e
        ),
        'fiyatHistogram', coalesce((
          select json_agg(h.adet order by h.kova) from (
            select width_bucket(e.min_fiyat, 0, 30000000, 10) as kova, count(*)::int as adet
            from eslesen e where e.min_fiyat is not null
            group by 1
          ) h
        ), '[]'::json)
      ) as fasetler
  `;

  return {
    sonuclar: row?.sonuclar ?? [],
    toplam: row?.toplam ?? 0,
    fasetler: row?.fasetler ?? {
      daireTipi: {}, teslimYili: {}, santiye: {}, ozellik: {}, fiyatHistogram: [],
    },
  };
}

/**
 * 0 sonuç kurtarma: hangi filtreyi kaldırırsak kaç sonuç gelir?
 * "Filtrelerinizi genişletin" işe yaramaz; sayı vermek işe yarar.
 */
export async function kurtarmaOnerileri(f: Filtre) {
  const adaylar: { alan: keyof Filtre; ad: string; yeni: Filtre }[] = [];

  if (f.ozellik?.length) {
    for (const o of f.ozellik) {
      adaylar.push({
        alan: 'ozellik',
        ad: OZELLIKLER[o] ?? o,
        yeni: { ...f, ozellik: f.ozellik.filter((x) => x !== o), sayfa: 1 },
      });
    }
  }
  if (f.maxFiyat) {
    adaylar.push({
      alan: 'maxFiyat',
      ad: 'bütçe üst sınırı',
      yeni: { ...f, maxFiyat: Math.round(f.maxFiyat * 1.3), sayfa: 1 },
    });
  }
  if (f.ilce) {
    adaylar.push({ alan: 'ilce', ad: 'ilçe sınırı', yeni: { ...f, ilce: undefined, sayfa: 1 } });
  }

  const sonuc = await Promise.all(
    adaylar.slice(0, 4).map(async (a) => ({ ...a, adet: (await ara(a.yeni)).toplam }))
  );

  return sonuc.filter((s) => s.adet > 0).sort((a, b) => b.adet - a.adet);
}
