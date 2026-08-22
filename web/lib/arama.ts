import 'server-only';
import { Prisma } from './generated/prisma';
import { prisma } from './db';
import type { ProjeDurumu, ProjeTipi } from './types';

/* ============================================================
   Arama motoru.

   NEDEN AYRI BİR ARAMA SERVİSİ (Meilisearch / Typesense) YOK:

   1. Senkron gecikmesi diye bir sorun kalmıyor. İndeks veritabanı
      tetikleyicileriyle aynı işlemde güncelleniyor; panelden yapılan
      düzenleme anında aranabilir oluyor. Ayrı servis kullanan her
      kurulum er ya da geç "proje güncellendi ama aramada eski"
      hatasını yaşıyor.
   2. Daire tipi ve fiyat aynı sorguda filtrelenebiliyor. "3+1 var mı"
      filtresi çocuk tabloya bakıyor ve stok (kalan adet) sürekli
      değişiyor; dış servise taşınsaydı iki aşamalı sorgu ve sayfalama
      bozulması kaçınılmazdı.
   3. Bir servis daha işletmek, izlemek ve yedeklemek gerekmiyor.

   Ne kaybediyoruz: Meilisearch'ün "her tuş vuruşunda 5 ms" hedefi ve
   daha iyi yazım hatası toleransı. Bunu trigram benzerliğiyle kısmen
   telafi ediyoruz. Envanter yüz binlere çıkarsa yeniden
   değerlendirilmeli; `aramaSorgusu` tek giriş noktası olduğu için
   değişim tek dosyada kalır.
   ============================================================ */

export type Siralama =
  | 'alaka' | 'onerilen' | 'ucuz' | 'pahali' | 'yeni' | 'teslim' | 'ilerleme';

export interface AramaGirdisi {
  q?: string;
  bolge?: string;
  /** Özellik kodları — hepsini birden sağlamalı (AND) */
  ozellikler?: string[];
  tip?: ProjeTipi;
  durum?: ProjeDurumu[];
  firma?: string;
  /** Oda sayısı: "2+1". Projede O TİPTEN en az bir daire olmalı. */
  oda?: string[];
  /** En az brüt m² — daire tipi üzerinden */
  minM2?: number;
  minFiyat?: number;
  maxFiyat?: number;
  /** Bu tarihten önce teslim (ISO gün) */
  maxTeslim?: Date;
  krediyeUygun?: boolean;
  takas?: boolean;
  /** En az peşinat oranı değil, EN FAZLA — düşük peşinat aranıyor */
  maxPesinat?: number;
  /** En az vade (ay) */
  minVade?: number;
  /** Harita görünümü: [güney, batı, kuzey, doğu] */
  kutu?: [number, number, number, number];
  /** Yarıçap araması: merkez + km */
  merkez?: [number, number];
  yaricapKm?: number;
  sirala?: Siralama;
  sayfa?: number;
  limit?: number;
}

export interface AramaSonucu {
  id: string;
  slug: string;
  ad: string;
  tip: ProjeTipi;
  durum: ProjeDurumu;
  bolge: string;
  bolgeSlug: string;
  il: string;
  mahalle: string;
  lat: number;
  lng: number;
  fiyatMin: number;
  fiyatMax: number | null;
  pesinatOrani: number;
  taksitAyi: number;
  krediyeUygun: boolean;
  teslimTarihi: Date | null;
  ilerlemeYuzde: number;
  yeni: boolean;
  sec: string | null;
  ozet: string;
  firmaAd: string;
  firmaSlug: string;
  foto: string[];
  fotoAlt: string[];
  ozellikler: string[];
  /** Projedeki daire tipleri — "1+1", "2+1"… */
  odalar: string[];
  /** Metin araması yapıldıysa alaka skoru */
  skor: number;
  /** Yarıçap araması yapıldıysa merkeze uzaklık (km) */
  uzaklikKm: number | null;
}

export interface AramaCevabi {
  sonuclar: AramaSonucu[];
  toplam: number;
  sayfa: number;
  limit: number;
  /** Uygulanan filtrelerle birlikte her özelliğin sonuç sayısı */
  yuzler: { kod: string; ad: string; sayi: number }[];
  /** Fiyat filtresi UYGULANMADAN hesaplanan dağılım — kaydırıcının altındaki histogram */
  fiyatDagilimi: { enAz: number; enCok: number; kovalar: number[] };
  /** Metin araması sonuç vermediyse önerilen düzeltme */
  oneri: string | null;
  sureMs: number;
}

const LIMIT_VARSAYILAN = 24;
const LIMIT_AZAMI = 100;

/** Vitrinde görünen satış aşamaları — filtre verilmezse varsayılan. */
const SATILABILIR: ProjeDurumu[] = ['YAKINDA', 'SATISTA', 'SON_DAIRELER'];

/**
 * Kullanıcı metnini tsquery'e çevirir.
 *
 * `websearch_to_tsquery` tırnak, OR ve - operatörlerini anlıyor ve
 * hatalı girdide istisna fırlatmıyor — `to_tsquery` fırlatıyor.
 * Kullanıcı girdisi doğrudan geçtiği için bu önemli.
 */
function sorguMetni(q: string): string {
  return q.trim().slice(0, 120);
}

/**
 * Arama sorgusu.
 *
 * Tek bir SQL ifadesi: filtreler, daire tipi koşulları, sıralama ve
 * toplam sayı birlikte hesaplanıyor. İki ayrı sorgu (önce say, sonra
 * getir) yerine pencere fonksiyonu kullanılıyor — sayfa geçişlerinde
 * tutarsızlık olmuyor.
 */
export async function aramaSorgusu(g: AramaGirdisi): Promise<AramaCevabi> {
  const basla = Date.now();

  const limit = Math.min(Math.max(1, g.limit ?? LIMIT_VARSAYILAN), LIMIT_AZAMI);
  const sayfa = Math.max(1, g.sayfa ?? 1);
  const atla = (sayfa - 1) * limit;
  const q = g.q ? sorguMetni(g.q) : '';
  const metinVar = q.length > 0;

  const kosullar: Prisma.Sql[] = [Prisma.sql`p.yayinda = true`];

  /* Satış aşaması: filtre verilmediyse tükenmiş ve teslim edilmiş
     projeler listeye çıkmıyor. Arayan kişi alınabilecek proje arıyor;
     geçmiş projeler firma sayfasında duruyor. */
  const durumlar = g.durum?.length ? g.durum : SATILABILIR;
  kosullar.push(Prisma.sql`p.durum::text = ANY(${durumlar.map(String)})`);

  if (metinVar) {
    // Tam metin VEYA trigram benzerliği — yazım hatasında ikincisi devreye giriyor.
    kosullar.push(Prisma.sql`(
      a.vektor @@ websearch_to_tsquery('tr_unaccent', ${q})
      OR unaccent(a.metin) % unaccent(${q})
    )`);
  }

  /* ÇOKLU BÖLGE: arama kutusu virgülle ayrılmış liste gönderiyor
     ("Ataşehir ve Kadıköy'e bakıyorum" en sık kurulan cümle). Tek
     değer de aynı yoldan geçiyor — ayrı bir dal tutmaya gerek yok. */
  if (g.bolge) {
    const dilimler = g.bolge.split(',').map((x) => x.trim()).filter(Boolean);
    if (dilimler.length === 1) kosullar.push(Prisma.sql`b.slug = ${dilimler[0]}`);
    else if (dilimler.length > 1) kosullar.push(Prisma.sql`b.slug = ANY(${dilimler})`);
  }

  /* KARMA projeler tip filtresinde de görünüyor: içinde hem konut hem
     ofis var ve ikisini arayan da onu görmeli (bkz. queries.ts). */
  if (g.tip) {
    kosullar.push(g.tip === 'KARMA'
      ? Prisma.sql`p.tip = 'KARMA'`
      : Prisma.sql`p.tip::text = ANY(${[g.tip, 'KARMA']})`);
  }
  if (g.firma) kosullar.push(Prisma.sql`f.slug = ${g.firma}`);
  if (g.krediyeUygun) kosullar.push(Prisma.sql`p."krediyeUygun" = true`);
  if (g.takas) kosullar.push(Prisma.sql`p.takas = true`);
  if (g.maxPesinat !== undefined) {
    /* Peşinat oranı 0 "bilgi verilmedi" demek, "peşinatsız" değil.
       Sıfırları düşük peşinat filtresine dâhil etmek, bilgisi olmayan
       projeleri en cazip gibi gösteriyordu. */
    kosullar.push(Prisma.sql`p."pesinatOrani" > 0 AND p."pesinatOrani" <= ${g.maxPesinat}`);
  }
  if (g.minVade) kosullar.push(Prisma.sql`p."taksitAyi" >= ${g.minVade}`);
  if (g.maxTeslim) {
    kosullar.push(Prisma.sql`p."teslimTarihi" IS NOT NULL AND p."teslimTarihi" <= ${g.maxTeslim}::date`);
  }

  /* Fiyat koşulları AYRI tutuluyor: histogram, fiyat filtresi
     UYGULANMADAN hesaplanmalı. Aynı `nerede`yi kullansaydı kaydırıcıyı
     kısan kullanıcı histogramı da kısıyor, dağılım her hareketle
     yeniden şekilleniyor ve "aralığın dışında ne var" bilgisi
     kayboluyordu. */
  const fiyatKosullari: Prisma.Sql[] = [];
  if (g.minFiyat) fiyatKosullari.push(Prisma.sql`p."fiyatMin" >= ${g.minFiyat}`);
  /* Üst sınır ARALIĞIN ALT UCUNA bakıyor: "5 milyona kadar" diyen kişi,
     1+1'i 4 milyon olan bir projeyi görmeli — üst ucu 12 milyon diye
     elemek, o projede bütçesine uyan daire olduğu gerçeğini gizliyor. */
  if (g.maxFiyat) fiyatKosullari.push(Prisma.sql`p."fiyatMin" <= ${g.maxFiyat}`);
  kosullar.push(...fiyatKosullari);

  // Özellikler: hepsi birden sağlanmalı
  if (g.ozellikler?.length) {
    kosullar.push(Prisma.sql`(
      SELECT count(DISTINCT o.kod) FROM proje_ozellik po
      JOIN ozellik o ON o.id = po."ozellikId"
      WHERE po."projeId" = p.id AND o.kod IN (${Prisma.join(g.ozellikler)})
    ) = ${g.ozellikler.length}`);
  }

  /* Oda sayısı: projede O TİPTEN yayında bir daire olmalı. Birden
     fazla seçilirse HERHANGİ BİRİ yeter (OR) — özelliklerin aksine.
     "2+1 veya 3+1 olsun" demek isteyen kişi ikisini birden isteyen
     bir projeyi aramıyor. */
  if (g.oda?.length) {
    kosullar.push(Prisma.sql`EXISTS (
      SELECT 1 FROM daire_tipi d
      WHERE d."projeId" = p.id AND d.yayinda AND d."odaSayisi" = ANY(${g.oda})
    )`);
  }
  if (g.minM2) {
    kosullar.push(Prisma.sql`EXISTS (
      SELECT 1 FROM daire_tipi d
      WHERE d."projeId" = p.id AND d.yayinda AND d."brutM2" >= ${g.minM2}
    )`);
  }

  // Harita görünümü — sınır kutusu
  if (g.kutu) {
    const [g1, b1, k1, d1] = g.kutu;
    kosullar.push(Prisma.sql`p.lat BETWEEN ${g1} AND ${k1} AND p.lng BETWEEN ${b1} AND ${d1}`);
  }

  // Yarıçap: önce ucuz sınır kutusu, sonra tam haversine.
  // Kutu ön filtresi indeksi kullanabildiği için trigonometri yalnızca
  // aday satırlarda çalışıyor.
  let uzaklik = Prisma.sql`NULL::float`;
  if (g.merkez && g.yaricapKm) {
    const [mLat, mLng] = g.merkez;
    const dLat = g.yaricapKm / 111.0;
    const dLng = g.yaricapKm / (111.0 * Math.max(0.01, Math.cos((mLat * Math.PI) / 180)));
    uzaklik = Prisma.sql`(6371 * acos(least(1, greatest(-1,
      sin(radians(${mLat})) * sin(radians(p.lat)) +
      cos(radians(${mLat})) * cos(radians(p.lat)) * cos(radians(p.lng) - radians(${mLng}))
    ))))`;
    kosullar.push(Prisma.sql`p.lat BETWEEN ${mLat - dLat} AND ${mLat + dLat}`);
    kosullar.push(Prisma.sql`p.lng BETWEEN ${mLng - dLng} AND ${mLng + dLng}`);
    kosullar.push(Prisma.sql`${uzaklik} <= ${g.yaricapKm}`);
  }

  const nerede = Prisma.sql`WHERE ${Prisma.join(kosullar, ' AND ')}`;

  const skor = metinVar
    ? Prisma.sql`GREATEST(
        ts_rank(a.vektor, websearch_to_tsquery('tr_unaccent', ${q})),
        similarity(unaccent(a.metin), unaccent(${q})) * 0.4
      )`
    : Prisma.sql`0::float`;

  const sirala = (() => {
    switch (g.sirala) {
      case 'ucuz': return Prisma.sql`p."fiyatMin" ASC`;
      case 'pahali': return Prisma.sql`p."fiyatMin" DESC`;
      case 'yeni': return Prisma.sql`p."yayinTarihi" DESC`;
      /* Teslimi en yakın önce; tarihi açıklanmamış projeler SONA.
         NULLS LAST olmasaydı tarih vermeyen projeler "hemen teslim"
         gibi en üste çıkardı. */
      case 'teslim': return Prisma.sql`p."teslimTarihi" ASC NULLS LAST`;
      case 'ilerleme': return Prisma.sql`p."ilerlemeYuzde" DESC`;
      case 'alaka': return Prisma.sql`skor DESC, p."yayinTarihi" DESC`;
      default:
        /* Önerilen: metin varsa alaka öncelikli. Yoksa öne çıkarılanlar,
           sonra inşaatı ilerlemiş projeler — teslime yakın olmak
           alıcı için en somut güven sinyali. */
        return metinVar
          ? Prisma.sql`skor DESC, p."ilerlemeYuzde" DESC`
          : Prisma.sql`p."oneCikan" DESC, p."ilerlemeYuzde" DESC, p."yayinTarihi" DESC`;
    }
  })();

  const satirlar = await prisma.$queryRaw<(AramaSonucu & { toplam: bigint })[]>(Prisma.sql`
    SELECT
      p.id, p.slug, p.ad, p.tip::text AS tip, p.durum::text AS durum,
      b.ad AS bolge, b.slug AS "bolgeSlug", b.il, p.mahalle,
      p.lat, p.lng, p."fiyatMin", p."fiyatMax",
      p."pesinatOrani", p."taksitAyi", p."krediyeUygun",
      p."teslimTarihi", p."ilerlemeYuzde",
      p.yeni, p.sec, p.ozet,
      f.ad AS "firmaAd", f.slug AS "firmaSlug",
      COALESCE((SELECT array_agg(m.url ORDER BY m.sira) FROM (
        SELECT url, sira FROM medya WHERE "projeId" = p.id ORDER BY sira LIMIT 5
      ) m), ARRAY[]::text[]) AS foto,
      COALESCE((SELECT array_agg(m.alt ORDER BY m.sira) FROM (
        SELECT alt, sira FROM medya WHERE "projeId" = p.id ORDER BY sira LIMIT 5
      ) m), ARRAY[]::text[]) AS "fotoAlt",
      COALESCE((
        SELECT array_agg(o.kod ORDER BY o.sira)
        FROM proje_ozellik po JOIN ozellik o ON o.id = po."ozellikId"
        WHERE po."projeId" = p.id
      ), ARRAY[]::text[]) AS ozellikler,
      COALESCE((
        SELECT array_agg(DISTINCT d."odaSayisi")
        FROM daire_tipi d WHERE d."projeId" = p.id AND d.yayinda
      ), ARRAY[]::text[]) AS odalar,
      ${skor} AS skor,
      ${uzaklik} AS "uzaklikKm",
      count(*) OVER () AS toplam
    FROM proje p
    JOIN bolge b ON b.id = p."bolgeId"
    JOIN firma f ON f.id = p."firmaId"
    LEFT JOIN proje_arama a ON a."projeId" = p.id
    ${nerede}
    ORDER BY ${sirala}, p.id
    LIMIT ${limit} OFFSET ${atla}
  `);

  const toplam = satirlar.length > 0 ? Number(satirlar[0].toplam) : 0;

  // Yüzler (facet): aynı filtrelerle her özelliğin sonuç sayısı.
  // Kullanıcı "3 sonuç" yazan bir filtreye tıklayıp boş sayfa görmemeli.
  const yuzler = await prisma.$queryRaw<{ kod: string; ad: string; sayi: bigint }[]>(Prisma.sql`
    SELECT o.kod, o.ad, count(DISTINCT p.id) AS sayi
    FROM proje p
    JOIN bolge b ON b.id = p."bolgeId"
    JOIN firma f ON f.id = p."firmaId"
    LEFT JOIN proje_arama a ON a."projeId" = p.id
    JOIN proje_ozellik po ON po."projeId" = p.id
    JOIN ozellik o ON o.id = po."ozellikId"
    ${nerede}
    GROUP BY o.kod, o.ad, o.sira
    ORDER BY o.sira
  `);

  /* Fiyat dağılımı: yirmi eşit kova. Kullanıcı kaydırıcıyı kör
     sürüklüyordu — "4 ile 9 milyon arasında kaç proje var" sorusuna
     ancak deneyerek cevap bulunuyordu. */
  const fiyatsizNerede = kosullar.length > fiyatKosullari.length
    ? Prisma.sql`WHERE ${Prisma.join(kosullar.filter((k) => !fiyatKosullari.includes(k)), ' AND ')}`
    : Prisma.sql`WHERE p.yayinda = true`;
  const KOVA = 20;
  const dagilimSatir = await prisma.$queryRaw<{ enAz: number; enCok: number; kova: number; sayi: bigint }[]>(Prisma.sql`
    WITH s AS (
      SELECT min(p."fiyatMin")::int AS "enAz", max(p."fiyatMin")::int AS "enCok"
      FROM proje p
      JOIN bolge b ON b.id = p."bolgeId"
      JOIN firma f ON f.id = p."firmaId"
      LEFT JOIN proje_arama a ON a."projeId" = p.id
      ${fiyatsizNerede}
    )
    SELECT s."enAz", s."enCok",
      width_bucket(p."fiyatMin", s."enAz", greatest(s."enCok" + 1, s."enAz" + 2), ${KOVA}) AS kova,
      count(*) AS sayi
    FROM proje p
    JOIN bolge b ON b.id = p."bolgeId"
    JOIN firma f ON f.id = p."firmaId"
    LEFT JOIN proje_arama a ON a."projeId" = p.id
    CROSS JOIN s
    ${fiyatsizNerede}
    GROUP BY s."enAz", s."enCok", kova
    ORDER BY kova
  `);

  const kovalar = Array.from({ length: KOVA }, () => 0);
  for (const r of dagilimSatir) {
    const i = Math.min(KOVA, Math.max(1, Number(r.kova))) - 1;
    kovalar[i] += Number(r.sayi);
  }
  const fiyatDagilimi = {
    enAz: dagilimSatir.length ? Number(dagilimSatir[0].enAz) : 0,
    enCok: dagilimSatir.length ? Number(dagilimSatir[0].enCok) : 0,
    kovalar,
  };

  // Sonuç yoksa yazım düzeltmesi öner
  let oneri: string | null = null;
  if (metinVar && toplam === 0) oneri = await benzerTerim(q);

  return {
    sonuclar: satirlar.map(({ toplam: _t, ...r }) => ({
      ...r,
      skor: Number(r.skor ?? 0),
      uzaklikKm: r.uzaklikKm === null ? null : Number(r.uzaklikKm),
    })),
    toplam,
    sayfa,
    limit,
    yuzler: yuzler.map((y) => ({ kod: y.kod, ad: y.ad, sayi: Number(y.sayi) })),
    fiyatDagilimi,
    oneri,
    sureMs: Date.now() - basla,
  };
}

/**
 * "Bunu mu demek istediniz?" — trigram benzerliğiyle en yakın proje,
 * firma veya bölge adını bulur.
 */
async function benzerTerim(q: string): Promise<string | null> {
  const satir = await prisma.$queryRaw<{ ad: string }[]>(Prisma.sql`
    SELECT ad FROM (
      SELECT b.ad, similarity(unaccent(b.ad), unaccent(${q})) AS s FROM bolge b WHERE b.yayinda
      UNION ALL
      SELECT p.ad, similarity(unaccent(p.ad), unaccent(${q})) AS s FROM proje p WHERE p.yayinda
      UNION ALL
      SELECT f.ad, similarity(unaccent(f.ad), unaccent(${q})) AS s FROM firma f WHERE f.yayinda
    ) t
    WHERE s > 0.25
    ORDER BY s DESC
    LIMIT 1
  `);
  return satir[0]?.ad ?? null;
}

export interface Oneri {
  tip: 'bolge' | 'proje' | 'firma' | 'ozellik';
  ad: string;
  altBilgi: string;
  yol: string;
}

/**
 * Yazarken öneri (autocomplete).
 *
 * Bölgeler önce geliyor: kullanıcı çoğunlukla yer arıyor. Firma
 * önerisi bölgeden sonra — konut alıcısının önemli bir kısmı
 * müteahhit adıyla arıyor ("Emlak Konut projeleri") ve o sorgunun
 * karşılığı yoksa arama boş dönüyordu. Önek eşleşmesi benzerlikten
 * önce sıralanıyor: "ata" yazan biri "Ataşehir"i ilk sırada görmeli.
 */
export async function oneriler(q: string, limit = 8): Promise<Oneri[]> {
  const terim = q.trim().slice(0, 60);
  if (terim.length < 2) return [];

  const [bolgeler, projeler, firmalar, ozellikler] = await Promise.all([
    prisma.$queryRaw<{ ad: string; slug: string; il: string; adet: bigint; onek: boolean }[]>(Prisma.sql`
      SELECT b.ad, b.slug, b.il,
        (SELECT count(*) FROM proje p
           WHERE p."bolgeId" = b.id AND p.yayinda
             AND p.durum::text = ANY(${SATILABILIR.map(String)})) AS adet,
        unaccent(lower(b.ad)) LIKE unaccent(lower(${terim})) || '%' AS onek
      FROM bolge b
      WHERE b.yayinda AND (
        unaccent(lower(b.ad)) LIKE '%' || unaccent(lower(${terim})) || '%'
        OR unaccent(b.ad) % unaccent(${terim})
      )
      ORDER BY onek DESC, similarity(unaccent(b.ad), unaccent(${terim})) DESC
      LIMIT ${limit}
    `),
    prisma.$queryRaw<{ ad: string; slug: string; bolge: string }[]>(Prisma.sql`
      SELECT p.ad, p.slug, b.ad AS bolge
      FROM proje p JOIN bolge b ON b.id = p."bolgeId"
      WHERE p.yayinda AND (
        unaccent(lower(p.ad)) LIKE '%' || unaccent(lower(${terim})) || '%'
        OR unaccent(p.ad) % unaccent(${terim})
      )
      ORDER BY unaccent(lower(p.ad)) LIKE unaccent(lower(${terim})) || '%' DESC,
               similarity(unaccent(p.ad), unaccent(${terim})) DESC
      LIMIT ${limit}
    `),
    prisma.$queryRaw<{ ad: string; slug: string; adet: bigint }[]>(Prisma.sql`
      SELECT f.ad, f.slug,
        (SELECT count(*) FROM proje p WHERE p."firmaId" = f.id AND p.yayinda) AS adet
      FROM firma f
      WHERE f.yayinda AND (
        unaccent(lower(f.ad)) LIKE '%' || unaccent(lower(${terim})) || '%'
        OR unaccent(f.ad) % unaccent(${terim})
      )
      ORDER BY unaccent(lower(f.ad)) LIKE unaccent(lower(${terim})) || '%' DESC,
               similarity(unaccent(f.ad), unaccent(${terim})) DESC
      LIMIT 3
    `),
    prisma.$queryRaw<{ ad: string; kod: string }[]>(Prisma.sql`
      SELECT ad, kod FROM ozellik
      WHERE unaccent(lower(ad)) LIKE '%' || unaccent(lower(${terim})) || '%'
      ORDER BY sira LIMIT 3
    `),
  ]);

  const cikti: Oneri[] = [
    ...bolgeler.map((b) => ({
      tip: 'bolge' as const,
      ad: b.ad,
      altBilgi: `${b.il} · ${Number(b.adet)} proje`,
      yol: `/projeler/${b.slug}`,
    })),
    ...firmalar.map((f) => ({
      tip: 'firma' as const,
      ad: f.ad,
      altBilgi: `Firma · ${Number(f.adet)} proje`,
      yol: `/firma/${f.slug}`,
    })),
    ...ozellikler.map((o) => ({
      tip: 'ozellik' as const,
      ad: o.ad,
      altBilgi: 'Özellik',
      yol: `/arama?f=${o.kod}`,
    })),
    ...projeler.map((p) => ({
      tip: 'proje' as const,
      ad: p.ad,
      altBilgi: p.bolge,
      yol: `/proje/${p.slug}`,
    })),
  ];

  return cikti.slice(0, limit);
}

/** Arama indeksini baştan kurar. Zamanlanmış iş ve bakım için. */
export async function aramaIndeksiniYenile(): Promise<number> {
  const satir = await prisma.$queryRaw<{ sayi: bigint }[]>(Prisma.sql`
    WITH y AS (
      SELECT proje_arama_yenile(id) FROM proje
    )
    SELECT count(*) AS sayi FROM y
  `);
  return Number(satir[0]?.sayi ?? 0);
}
