import 'server-only';
import { prisma } from './db';
import type { DilEnum } from './ceviri';
import type { ProjeDurumu, ProjeTipi } from './types';

/* ============================================================
   Çevrilmiş içerik sorguları.

   Türkçe görünüm modeline (lib/queries.ts) dokunmuyoruz: oradaki
   tipler tüm Türkçe sayfa ağacını besliyor ve çeviri alanlarını oraya
   karıştırmak her sayfada opsiyonel alan kontrolü gerektirirdi.

   KURAL: çevirisi olmayan kayıt o dilde GÖRÜNMEZ. Yarı Türkçe bir
   sayfa hem kullanıcı hem arama motoru için kötü.

   ADLAR HÂLÂ `...En`. Sorgular dil-bağımsız (`dil` parametresi,
   varsayılan 'EN') ama tek tüketici `/en` rota ağacı. RU/AR rota
   ağacı açıldığında adlar da genelleşecek — ikinci bir çağıran
   olmadan yeniden adlandırmak, karşılığı olmayan bir risk.

   YABANCI ALICI KİTLESİ bu sitede gerçek: Türkiye'de yeni konut
   projelerinin önemli bir kısmı yurt dışına da satılıyor ve
   vatandaşlık eşiği aranan bir bilgi. Bu yüzden `/en` bir çeviri
   deneyi değil, kendi hunisi olan bir yüzey.
   ============================================================ */

export interface BolgeIcerikEn {
  giris: string;
  mevkiler: { baslik: string; metin: string }[];
  yatirim: string;
  ulasim: string;
  ipuclari: string[];
}

export interface BolgeEnGorunum {
  slug: string;
  ad: string;
  il: string;
  lat: number;
  lng: number;
  img: string;
  ozet: string;
  icerik: BolgeIcerikEn | null;
  projeSayisi: number;
}

/** Vitrinde görünen satış aşamaları — Türkçe tarafla aynı kural. */
const SATILABILIR: ProjeDurumu[] = ['YAKINDA', 'SATISTA', 'SON_DAIRELER'];

/** Yalnızca o dilde özeti olan bölgeler. */
export async function getBolgelerEn(dil: DilEnum = 'EN'): Promise<BolgeEnGorunum[]> {
  const satirlar = await prisma.bolge.findMany({
    where: { yayinda: true, ceviri: { some: { dil, ozet: { not: null } } } },
    orderBy: { sira: 'asc' },
    select: {
      slug: true, ad: true, il: true, lat: true, lng: true, img: true,
      // Tek sorguda geliyor; bölge başına ayrı çeviri sorgusu N+1 olurdu
      ceviri: { where: { dil }, select: { ozet: true, icerik: true } },
      _count: {
        select: {
          projeler: {
            where: {
              yayinda: true,
              durum: { in: SATILABILIR },
              ceviri: { some: { dil, ozet: { not: null } } },
            },
          },
        },
      },
    },
  });

  return satirlar.map((b) => ({
    slug: b.slug, ad: b.ad, il: b.il, lat: b.lat, lng: b.lng, img: b.img,
    ozet: b.ceviri[0]!.ozet!,
    icerik: (b.ceviri[0]?.icerik as unknown as BolgeIcerikEn) ?? null,
    projeSayisi: b._count.projeler,
  }));
}

export async function getBolgeEn(slug: string, dil: DilEnum = 'EN'): Promise<BolgeEnGorunum | null> {
  const hepsi = await getBolgelerEn(dil);
  return hepsi.find((b) => b.slug === slug) ?? null;
}

export interface DaireTipiEn {
  id: string;
  ad: string;
  oda: string;
  banyo: number;
  brutM2: number;
  netM2: number | null;
  fiyatMin: number | null;
  fiyatMax: number | null;
  kalan: number | null;
  katPlani: string | null;
}

export interface ProjeEnGorunum {
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
  ozet: string;
  fiyatMin: number;
  fiyatMax: number | null;
  pesinatOrani: number;
  taksitAyi: number;
  krediyeUygun: boolean;
  teslimTarihi: string | null;
  ilerlemeYuzde: number;
  blokSayisi: number | null;
  toplamBagimsizBolum: number | null;
  firmaAd: string;
  firmaSlug: string;
  firmaTamamlanan: number;
  foto: string[];
  fotoAlt: string[];
  daireTipleri: DaireTipiEn[];
  ozellikler: { kod: string; ad: string }[];
}

/** Seçim dile bağlı: çeviri satırları `where` ile süzülüyor. */
const projeSecimi = (dil: DilEnum) => ({
  id: true, slug: true, ad: true, tip: true, durum: true,
  mahalle: true, lat: true, lng: true,
  fiyatMin: true, fiyatMax: true, pesinatOrani: true, taksitAyi: true,
  krediyeUygun: true, teslimTarihi: true, ilerlemeYuzde: true,
  blokSayisi: true, toplamBagimsizBolum: true,
  ceviri: { where: { dil }, select: { ozet: true } },
  bolge: { select: { ad: true, slug: true, il: true } },
  firma: { select: { ad: true, slug: true, tamamlananProje: true } },
  medya: { select: { url: true, alt: true }, orderBy: { sira: 'asc' as const } },
  daireTipleri: {
    where: { yayinda: true },
    orderBy: { sira: 'asc' as const },
    select: {
      id: true, ad: true, odaSayisi: true, banyo: true, brutM2: true,
      netM2: true, fiyatMin: true, fiyatMax: true, kalanAdet: true,
      katPlaniUrl: true,
    },
  },
  ozellikler: {
    select: {
      ozellik: {
        select: { kod: true, ad: true, ceviri: { where: { dil }, select: { ad: true } } },
      },
    },
  },
});

type ProjeSatir = Awaited<
  ReturnType<typeof prisma.proje.findMany<{ select: ReturnType<typeof projeSecimi> }>>
>[number];

function bicimle(p: ProjeSatir): ProjeEnGorunum {
  return {
    id: p.id, slug: p.slug, ad: p.ad, tip: p.tip, durum: p.durum,
    bolge: p.bolge.ad, bolgeSlug: p.bolge.slug, il: p.bolge.il,
    mahalle: p.mahalle, lat: p.lat, lng: p.lng,
    ozet: p.ceviri[0]!.ozet!,
    fiyatMin: p.fiyatMin, fiyatMax: p.fiyatMax,
    pesinatOrani: p.pesinatOrani, taksitAyi: p.taksitAyi,
    krediyeUygun: p.krediyeUygun,
    teslimTarihi: p.teslimTarihi ? p.teslimTarihi.toISOString().slice(0, 10) : null,
    ilerlemeYuzde: p.ilerlemeYuzde,
    blokSayisi: p.blokSayisi,
    toplamBagimsizBolum: p.toplamBagimsizBolum,
    firmaAd: p.firma.ad, firmaSlug: p.firma.slug,
    firmaTamamlanan: p.firma.tamamlananProje,
    foto: p.medya.map((m) => m.url),
    fotoAlt: p.medya.map((m) => m.alt),
    /* DAİRE TİPLERİ ÇEVRİLMİYOR: "2+1" uluslararası bir gösterim
       değil ama Türkiye'deki karşılığı da yok — "2 bedrooms + living
       room" diye açmak listeyi okunmaz yapıyor. Sayfada bir kez
       açıklanıyor, tablodaki değerler olduğu gibi kalıyor. */
    daireTipleri: p.daireTipleri.map((d) => ({
      id: d.id, ad: d.ad, oda: d.odaSayisi, banyo: d.banyo,
      brutM2: d.brutM2, netM2: d.netM2,
      fiyatMin: d.fiyatMin, fiyatMax: d.fiyatMax,
      kalan: d.kalanAdet, katPlani: d.katPlaniUrl,
    })),
    // Özellik adı çevrilmemişse Türkçesi gösterilmiyor; o özellik atlanıyor
    ozellikler: p.ozellikler
      .filter((o) => o.ozellik.ceviri[0]?.ad)
      .map((o) => ({ kod: o.ozellik.kod, ad: o.ozellik.ceviri[0]!.ad! })),
  };
}

export async function getProjelerEn(
  bolgeSlug?: string, dil: DilEnum = 'EN',
): Promise<ProjeEnGorunum[]> {
  const satirlar = await prisma.proje.findMany({
    where: {
      yayinda: true,
      durum: { in: SATILABILIR },
      ceviri: { some: { dil, ozet: { not: null } } },
      ...(bolgeSlug ? { bolge: { slug: bolgeSlug } } : {}),
    },
    orderBy: [{ oneCikan: 'desc' }, { ilerlemeYuzde: 'desc' }, { yayinTarihi: 'desc' }],
    select: projeSecimi(dil),
  });
  return satirlar.map(bicimle);
}

/* Tekil proje sayfasında durum filtresi YOK — Türkçe tarafla aynı
   gerekçe: tükenmiş projenin adresi çalışmaya devam ediyor. */
export async function getProjeEn(
  slug: string, dil: DilEnum = 'EN',
): Promise<ProjeEnGorunum | null> {
  const p = await prisma.proje.findFirst({
    where: { slug, yayinda: true, ceviri: { some: { dil, ozet: { not: null } } } },
    select: projeSecimi(dil),
  });
  return p ? bicimle(p) : null;
}

/* ---------------- Uzun kuyruk iniş sayfaları ---------------- */

export interface LandingEn {
  bolge: string;       // slug
  bolgeAd: string;
  ozellik: string;     // İngilizce slug
  ozellikKod: string;
  baslik: string;
  aciklama: string;
  trSlug: string;      // Türkçe özellik slug'ı — hreflang için
}

/**
 * Sonuç veren bölge × özellik kombinasyonları.
 *
 * Türkçesiyle aynı kural: sonuç vermeyen kombinasyon için sayfa
 * ÜRETİLMİYOR. Boş iniş sayfası hem kullanıcıyı hem tarama bütçesini
 * harcıyor. Ek olarak İngilizce metni olmayan özellik de atlanıyor.
 */
export async function getLandingKombinasyonlariEn(dil: DilEnum = 'EN'): Promise<LandingEn[]> {
  /* Çeviri tabloları JOIN'lendi. `bc`, `pc`, `oc` üç ayrı dil satırı;
     hepsi AYNI dil için süzülüyor — biri çevrilmemişse kombinasyon
     hiç üretilmiyor, yarı çevrilmiş sayfa çıkmasın. */
  const satirlar = await prisma.$queryRaw<{
    bolgeSlug: string; bolgeAd: string; kod: string;
    slugEn: string; baslikEn: string; aciklamaEn: string; trSlug: string; adet: bigint;
  }[]>`
    SELECT b.slug AS "bolgeSlug", b.ad AS "bolgeAd", o.kod,
           oc."landingSlug" AS "slugEn", oc."landingBaslik" AS "baslikEn",
           oc."landingAciklama" AS "aciklamaEn", o."landingSlug" AS "trSlug",
           count(DISTINCT p.id) AS adet
    FROM bolge b
    JOIN bolge_ceviri bc ON bc."bolgeId" = b.id AND bc.dil = ${dil}::"Dil" AND bc.ozet IS NOT NULL
    JOIN proje p ON p."bolgeId" = b.id AND p.yayinda
      AND p.durum IN ('YAKINDA', 'SATISTA', 'SON_DAIRELER')
    JOIN proje_ceviri pc ON pc."projeId" = p.id AND pc.dil = ${dil}::"Dil" AND pc.ozet IS NOT NULL
    JOIN proje_ozellik po ON po."projeId" = p.id
    JOIN ozellik o ON o.id = po."ozellikId"
    JOIN ozellik_ceviri oc ON oc."ozellikId" = o.id AND oc.dil = ${dil}::"Dil"
      AND oc."landingSlug" IS NOT NULL
    WHERE b.yayinda
    GROUP BY b.slug, b.ad, o.kod, oc."landingSlug", oc."landingBaslik",
             oc."landingAciklama", o."landingSlug", o.sira
    HAVING count(DISTINCT p.id) > 0
    ORDER BY b.slug, o.sira
  `;

  return satirlar.map((r) => ({
    bolge: r.bolgeSlug, bolgeAd: r.bolgeAd,
    ozellik: r.slugEn, ozellikKod: r.kod,
    baslik: r.baslikEn, aciklama: r.aciklamaEn, trSlug: r.trSlug,
  }));
}

/** Bir kombinasyonun projeleri. */
export async function getLandingProjelerEn(
  bolgeSlug: string, ozellikKod: string, dil: DilEnum = 'EN',
): Promise<ProjeEnGorunum[]> {
  const satirlar = await prisma.proje.findMany({
    where: {
      yayinda: true,
      durum: { in: SATILABILIR },
      ceviri: { some: { dil, ozet: { not: null } } },
      bolge: { slug: bolgeSlug },
      ozellikler: { some: { ozellik: { kod: ozellikKod } } },
    },
    orderBy: [{ oneCikan: 'desc' }, { ilerlemeYuzde: 'desc' }],
    select: projeSecimi(dil),
  });
  return satirlar.map(bicimle);
}
