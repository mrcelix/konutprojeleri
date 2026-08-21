import { sql } from '@/lib/db';

/**
 * Ana sayfa verisi — lüks konut ve villa.
 *
 * HİÇBİR SAYI SABİT YAZILMAZ. "312 lüks proje" gibi bir rakam şablona
 * gömülürse ilk haftadan yalan olur ve sitenin en görünür yerinde
 * durur. Bugünkü sitenin "2019 Teslim" hatası tam olarak buydu.
 *
 * Tek sorgu: ana sayfa her ziyaretçinin gördüğü ilk şey; yedi ayrı
 * gidiş-dönüş Frankfurt'a 3 ms ile bile gereksiz.
 */

export type VitrinProjesi = {
  id: number;
  slug: string;
  ad: string;
  il: string;
  ilce: string;
  mahalle: string | null;
  tip: string;
  durum: string;
  firma_ad: string;
  firma_slug: string;
  firma_sicil: string | null;
  teslim_ceyrek: string | null;
  santiye_yuzde: number | null;
  denize_mesafe_m: number | null;
  havuz_tipi: string | null;
  toplam_konut: number | null;
  faizsiz: boolean | null;
  vade_ay: number | null;
  pesinat_orani: number | null;
  ozellikler: Record<string, boolean>;
  min_fiyat: number | null;
  arsa_m2: number | null;
  kapali_m2: number | null;
  odalar: string | null;
  kalan: number | null;
  kapak: string | null;
};

export type Segment = { tip: string; n: number };
export type Tema = { anahtar: string; n: number };
export type SehirOzeti = { il: string; n: number };
export type SahilBolgesi = { slug: string; ad: string; il: string; n: number };
export type EndeksNoktasi = { donem: string; m2: number };
export type TeslimEdilen = {
  ad: string; il: string; ilce: string; konut: number | null;
  ilan_edilen: string; gerceklesen: string; gecikme_ay: number;
  firma_ad: string; firma_slug: string; sicil: string | null;
};
export type TakvimYili = { yil: number; ceyrekler: { c: number; n: number }[] };

export type KarneSatiri = {
  slug: string; ad: string; sicil: string | null;
  ort_gecikme: number | null; tamamlanan: number | null;
};

export type AnaSayfaVerisi = {
  toplamProje: number;
  toplamFirma: number;
  toplamIl: number;
  buHafta: number;
  yakindaTeslim: number;
  vitrin: VitrinProjesi[];
  segmentler: Segment[];
  temalar: Tema[];
  sehirler: SehirOzeti[];
  sahiller: SahilBolgesi[];
  endeks: EndeksNoktasi[];
  endeksYillik: number | null;
  karne: KarneSatiri[];
  teslimler: TeslimEdilen[];
  takvim: TakvimYili[];
};

/**
 * Aktif proje koşulu.
 *
 * FONKSİYON OLMAK ZORUNDA, sabit değil. Modül seviyesinde
 * `const AKTIF = sql\`...\`` yazmak sql'i import anında çağırır ve
 * DATABASE_URL olmayan ortamda (CI, önizleme derlemesi) bağlantı
 * kurulmaya çalışıldığı için `next build` daha veri çekmeden kırılır.
 * Aynı hata lib/queries/arama.ts'te de yaşandı; kalite işi tam olarak
 * bunu yakalamak için veritabanısız çalışıyor.
 */
const aktif = () => sql`p.yayinda and p.durum in ('lansman','satista')`;

/**
 * Veri gelmediğinde kullanılan boş küme.
 *
 * Sorgu HATAYI YUTMUYOR — gerçek bir kesintiyi sessizce gizlemek,
 * ana sayfanın boş ama "çalışıyor" görünmesi demek olurdu. Bunun
 * yerine çağıran taraf hatayı yakalayıp bu kümeyle çiziyor: bölümler
 * kendiliğinden basılmıyor, sayfa yine ayakta kalıyor.
 *
 * Veritabanısız derleme (CI'daki `kalite` işi) tam olarak bu yolu
 * kullanıyor.
 */
export const BOS_ANASAYFA: AnaSayfaVerisi = {
  toplamProje: 0, toplamFirma: 0, toplamIl: 0, buHafta: 0, yakindaTeslim: 0,
  vitrin: [], segmentler: [], temalar: [], sehirler: [], sahiller: [],
  endeks: [], endeksYillik: null, karne: [], teslimler: [], takvim: [],
};

export async function anaSayfaVerisi(): Promise<AnaSayfaVerisi> {
  const [r] = await sql<[AnaSayfaVerisi]>`
    select
      (select count(*)::int from proje p where ${aktif()}) as "toplamProje",
      (select count(distinct p.firma_id)::int from proje p where ${aktif()}) as "toplamFirma",
      (select count(distinct p.il)::int from proje p where ${aktif()}) as "toplamIl",
      (select count(*)::int from proje p
        where ${aktif()} and p.olusturuldu > now() - interval '7 days') as "buHafta",

      -- Önümüzdeki iki çeyrekte teslim edilecekler. Villa alıcısı için
      -- "yakında teslim" ayrı bir segment: bekleyecek vakti olmayan
      -- alıcı doğrudan buraya bakar.
      (select count(*)::int from proje p
        where ${aktif()} and p.teslim_ceyrek is not null
          and p.teslim_ceyrek <= to_char(now() + interval '6 months', 'YYYY') || 'Q' ||
              (floor((extract(month from now() + interval '6 months')::int - 1) / 3) + 1)::text
      ) as "yakindaTeslim",

      -- Vitrin: sponsorlu slot varsa önce o, sonra fiyatı YENİ TEYİT
      -- EDİLENLER. Eklenme tarihine göre sıralamak eski ama bakımlı
      -- projeyi cezalandırırdı; teyit tarihi bakımın ölçüsü.
      (select coalesce(json_agg(v order by v.one_cikarma desc nulls last,
                                v.fiyat_teyit_tarihi desc nulls last), '[]')
        from (
          select
            p.id, p.slug::text as slug, p.ad, p.il, p.ilce, p.mahalle,
            p.tip, p.durum, p.teslim_ceyrek, p.santiye_yuzde,
            p.denize_mesafe_m, p.havuz_tipi,
            p.toplam_konut, p.faizsiz, p.vade_ay,
            p.pesinat_orani::float8 as pesinat_orani,
            p.ozellikler, p.one_cikarma, p.fiyat_teyit_tarihi,
            f.ad as firma_ad, f.slug::text as firma_slug, k.sicil as firma_sicil,
            fx.min_fiyat::float8 as min_fiyat,
            fx.arsa_m2::float8   as arsa_m2,
            fx.kapali_m2::float8 as kapali_m2,
            fx.odalar, fx.kalan::int as kalan,
            (select m.key from medya m
              where m.proje_id = p.id and m.tur = 'gorsel'
              order by m.sira limit 1) as kapak
          from proje p
          join firma f on f.id = p.firma_id
          left join mv_firma_karne k on k.firma_id = f.id
          left join lateral (
            select min(d.liste_fiyati) as min_fiyat,
                   max(d.arsa_m2)      as arsa_m2,
                   max(coalesce(d.brut_m2, d.net_m2)) as kapali_m2,
                   sum(d.kalan_adet)   as kalan,
                   -- En büyük tipin oda dökümü: vitrinde projenin
                   -- üst ucunu göstermek doğru, ortalamasını değil.
                   (array_agg(d.tip order by coalesce(d.net_m2, 0) desc))[1] as odalar
            from daire_tipi d where d.proje_id = p.id
          ) fx on true
          where ${aktif()} and fx.min_fiyat is not null
          order by p.one_cikarma desc nulls last, p.fiyat_teyit_tarihi desc nulls last
          limit 6
        ) v
      ) as vitrin,

      (select coalesce(json_agg(s order by s.n desc), '[]') from (
        select p.tip, count(*)::int as n from proje p where ${aktif()}
        group by p.tip
      ) s) as segmentler,

      -- Temalar segmentlerden ayrı: segment projenin NE OLDUĞU,
      -- tema alıcının NE ARADIĞI. Aynı proje birden çok temaya girer.
      (select coalesce(json_agg(t order by t.n desc), '[]') from (
        select 'denize_sifir' as anahtar, count(*)::int as n from proje p
          where ${aktif()} and p.denize_mesafe_m is not null and p.denize_mesafe_m <= 300
        union all
        select 'ozel_havuz', count(*)::int from proje p
          where ${aktif()} and p.havuz_tipi = 'ozel'
        union all
        select 'mustakil', count(*)::int from proje p
          where ${aktif()} and p.tip in ('villa','mustakil','yali')
        union all
        select 'yakinda', count(*)::int from proje p
          where ${aktif()} and p.teslim_ceyrek is not null
            and p.teslim_ceyrek <= to_char(now() + interval '6 months', 'YYYY') || 'Q' ||
                (floor((extract(month from now() + interval '6 months')::int - 1) / 3) + 1)::text
      ) t where t.n > 0) as temalar,

      (select coalesce(json_agg(s order by s.n desc), '[]') from (
        select p.il, count(*)::int as n from proje p where ${aktif()}
        group by p.il order by count(*) desc limit 12
      ) s) as sehirler,

      -- Sahil bölgeleri ilçe değil pazarlama bölgesi: Yalıkavak
      -- Bodrum'un mahallesi ama villa alıcısı "Bodrum" değil
      -- "Yalıkavak" arar. Proje sayısı ilçe eşleşmesinden gelir.
      (select coalesce(json_agg(b order by b.sira, b.n desc), '[]') from (
        select sb.slug::text as slug, sb.ad, sb.il, sb.sira,
               (select count(*)::int from proje p
                 where ${aktif()} and p.il = sb.il and p.ilce = any(sb.ilceler)) as n
        from sahil_bolgesi sb where sb.yayinda
      ) b where b.n > 0) as sahiller,

      -- Villa segmentinin kendi endeksi. Genel endeksi göstermek
      -- yanıltıcı olurdu: apartman ve villa aynı eğriyi izlemiyor.
      (select coalesce(json_agg(e order by e.donem), '[]') from (
        select to_char(donem, 'YYYY-MM') as donem, m2_fiyat::float8 as m2
        from mv_endeks_donem
        where il is null and donem >= date_trunc('month', current_date) - interval '12 months'
        order by donem
      ) e) as endeks,

      (select round(
                (max(m2_fiyat) filter (where donem = (select max(donem) from mv_endeks_donem where il is null))
                 / nullif(min(m2_fiyat) filter (where donem = (select min(donem) from mv_endeks_donem
                     where il is null and donem >= date_trunc('month', current_date) - interval '12 months')), 0)
                 - 1) * 1000
              )::float8 / 10
        from mv_endeks_donem where il is null) as "endeksYillik",

      -- Teslim edilen projeler: söz verilen ile gerçekleşen yan yana.
      -- İYİ ÖRNEKLE KÖTÜ ÖRNEK BİRLİKTE gelir; yalnızca zamanında
      -- teslim edilenleri göstermek reklam olurdu, kanıt değil.
      (select coalesce(json_agg(t order by t.gerceklesen desc), '[]') from (
        select p.ad, p.il, p.ilce, p.toplam_konut as konut,
               tk.ilan_edilen, tk.gerceklesen, tk.gecikme_ay,
               f.ad as firma_ad, f.slug::text as firma_slug, mk.sicil
        from teslim_kaydi tk
        join firma f on f.id = tk.firma_id
        join proje p on p.id = tk.proje_id
        left join mv_firma_karne mk on mk.firma_id = f.id
        where tk.gerceklesen is not null and tk.durum = 'teyitli'
        order by tk.gerceklesen desc
        limit 3
      ) t) as teslimler,

      -- Teslim takvimi ızgarası: yıl → çeyrek → proje sayısı.
      (select coalesce(json_agg(y order by y.yil), '[]') from (
        select q.yil,
               json_agg(json_build_object('c', q.c, 'n', q.n) order by q.c) as ceyrekler
        from (
          select left(p.teslim_ceyrek, 4)::int as yil,
                 right(p.teslim_ceyrek, 1)::int as c,
                 count(*)::int as n
          from proje p where ${aktif()} and p.teslim_ceyrek is not null
          group by 1, 2
        ) q
        where q.yil >= extract(year from now())::int
        group by q.yil
        order by q.yil
        limit 4
      ) y) as takvim,

      (select coalesce(json_agg(k order by k.ort_gecikme nulls last), '[]') from (
        select f.slug::text as slug, f.ad, mk.sicil,
               mk.ort_gecikme::float8 as ort_gecikme, mk.tamamlanan
        from firma f
        join mv_firma_karne mk on mk.firma_id = f.id
        where mk.sicil is not null
        order by mk.ort_gecikme asc nulls last
        limit 4
      ) k) as karne
  `;

  return r ?? {
    toplamProje: 0, toplamFirma: 0, toplamIl: 0, buHafta: 0, yakindaTeslim: 0,
    vitrin: [], segmentler: [], temalar: [], sehirler: [], sahiller: [],
    endeks: [], endeksYillik: null, karne: [], teslimler: [], takvim: [],
  };
}

/** Vitrin kartındaki tek rozet. Sahte aciliyet yok. */
export function vitrinRozeti(p: VitrinProjesi): { metin: string; sinif: string } | null {
  if (p.kalan != null && p.kalan > 0 && p.kalan <= 5) {
    return { metin: `Son ${p.kalan} villa`, sinif: 'r-kum' };
  }
  if (p.durum === 'lansman') return { metin: 'Lansman fiyatı', sinif: 'r-gok' };
  if (p.pesinat_orani != null && p.pesinat_orani <= 20) {
    return { metin: `%${Math.round(p.pesinat_orani)} peşinat`, sinif: 'r-mint' };
  }
  if (p.faizsiz && p.vade_ay && p.vade_ay >= 48) {
    return { metin: `${p.vade_ay} ay faizsiz`, sinif: 'r-mint' };
  }
  return null;
}

export const SEGMENT_ADLARI: Record<string, string> = {
  villa: 'Villa',
  mustakil: 'Müstakil ev',
  yali: 'Yalı & sahil',
  rezidans: 'Lüks rezidans',
  konut: 'Konut projesi',
  kentsel_donusum: 'Kentsel dönüşüm',
  toki: 'TOKİ',
  emlak_konut: 'Emlak Konut',
  ofis: 'Ofis',
};

export const TEMA_ADLARI: Record<string, string> = {
  denize_sifir: 'Denize sıfır',
  ozel_havuz: 'Özel havuzlu',
  mustakil: 'Müstakil ev',
  yakinda: 'Yakında teslim',
};

/** Tema → süzgeç adresi. Tema bir kısayol, yeni bir sayfa değil. */
export const TEMA_YOLLARI: Record<string, string> = {
  denize_sifir: '/ara?tip=yali',
  ozel_havuz: '/ara?tip=villa',
  mustakil: '/ara?tip=mustakil',
  yakinda: '/teslim-takvimi',
};

export const IL_ADLARI: Record<string, string> = {
  istanbul: 'İstanbul', mugla: 'Muğla', izmir: 'İzmir', antalya: 'Antalya',
  ankara: 'Ankara', bursa: 'Bursa', sakarya: 'Sakarya', balikesir: 'Balıkesir',
  aydin: 'Aydın', kocaeli: 'Kocaeli', tekirdag: 'Tekirdağ', yalova: 'Yalova',
};
export const ilAdi = (s: string) =>
  IL_ADLARI[s] ?? s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);

/** Firma adından iki harfli baş harf — vitrin kartındaki yuvarlak. */
export function basHarfler(ad: string): string {
  const k = ad.split(/\s+/).filter((x) => x.length > 1).slice(0, 2);
  return k.map((x) => x[0]!.toLocaleUpperCase('tr')).join('') || ad.slice(0, 2).toLocaleUpperCase('tr');
}

/** Firma renkleri — ada göre sabit, rastgele değil. */
const RENKLER = ['#6e5c82', '#5c8a76', '#8a6e1e', '#7a4550', '#3d5a60', '#5b4a7a'];
export function firmaRengi(slug: string): string {
  let t = 0;
  for (let i = 0; i < slug.length; i++) t = (t * 31 + slug.charCodeAt(i)) >>> 0;
  return RENKLER[t % RENKLER.length]!;
}
