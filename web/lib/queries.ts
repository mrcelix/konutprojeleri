import { cache } from 'react';
import { prisma } from './db';
import type {
  Bolge, DaireTipi, Firma, IkonAdi, OzellikKey, Proje, ProjeDurumu,
  ProjeTipi, TapuDurumu,
} from './types';
import { icerikTamamla } from './bolge-yonet';

/* ============================================================
   Veri erişim katmanı.
   Prisma satırlarını bileşenlerin beklediği görünüm modellerine çevirir;
   böylece sayfa ve bileşen kodu veritabanı şemasına bağımlı kalmaz.

   Tüm okumalar React `cache()` ile sarılı: aynı render geçişinde
   aynı sorgu birden çok kez çağrılsa da veritabanına bir kez gider.
   ============================================================ */

/* ---------------- Ortak select parçaları ---------------- */
const projeSelect = {
  id: true, slug: true, ad: true, tip: true, durum: true,
  mahalle: true, adres: true, lat: true, lng: true,
  fiyatMin: true, fiyatMax: true,
  pesinatOrani: true, taksitAyi: true, krediyeUygun: true, takas: true,
  aidat: true, tapuDurumu: true,
  blokSayisi: true, katSayisi: true, toplamBagimsizBolum: true,
  arsaM2: true, insaatAlaniM2: true, yesilAlanOrani: true,
  baslangicTarihi: true, teslimTarihi: true, ilerlemeYuzde: true,
  ozet: true, sec: true, yeni: true, oneCikan: true,
  yayinTarihi: true, guncelleme: true,
  bolge: { select: { slug: true, ad: true, il: true } },
  firma: {
    select: {
      slug: true, ad: true, logo: true, kurulusYili: true,
      tamamlananProje: true, ozet: true,
    },
  },
  medya: { select: { url: true, alt: true }, orderBy: { sira: 'asc' } },
  ozellikler: { select: { ozellik: { select: { kod: true } } } },
  daireTipleri: {
    where: { yayinda: true },
    orderBy: { sira: 'asc' },
    select: {
      id: true, ad: true, odaSayisi: true, banyo: true, brutM2: true,
      netM2: true, nitelik: true, fiyatMin: true, fiyatMax: true,
      adet: true, kalanAdet: true, katPlaniUrl: true, katPlaniAlt: true,
    },
  },
} as const;

type ProjeSatiri = {
  id: string; slug: string; ad: string; tip: ProjeTipi; durum: ProjeDurumu;
  mahalle: string; adres: string | null; lat: number; lng: number;
  fiyatMin: number; fiyatMax: number | null;
  pesinatOrani: number; taksitAyi: number; krediyeUygun: boolean; takas: boolean;
  aidat: number | null; tapuDurumu: TapuDurumu | null;
  blokSayisi: number | null; katSayisi: number | null;
  toplamBagimsizBolum: number | null; arsaM2: number | null;
  insaatAlaniM2: number | null; yesilAlanOrani: number | null;
  baslangicTarihi: Date | null; teslimTarihi: Date | null; ilerlemeYuzde: number;
  ozet: string; sec: string | null; yeni: boolean; oneCikan: boolean;
  yayinTarihi: Date; guncelleme: Date;
  bolge: { slug: string; ad: string; il: string };
  firma: {
    slug: string; ad: string; logo: string | null; kurulusYili: number | null;
    tamamlananProje: number; ozet: string;
  };
  medya: { url: string; alt: string }[];
  ozellikler: { ozellik: { kod: string } }[];
  daireTipleri: {
    id: string; ad: string; odaSayisi: string; banyo: number; brutM2: number;
    netM2: number | null; nitelik: string | null; fiyatMin: number | null;
    fiyatMax: number | null; adet: number | null; kalanAdet: number | null;
    katPlaniUrl: string | null; katPlaniAlt: string | null;
  }[];
};

const isoGun = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/** null → undefined; isteğe bağlı alanlar "bilinmiyor" olarak kalsın diye. */
const ops = <T>(v: T | null): T | undefined => (v === null ? undefined : v);

function daireye(d: ProjeSatiri['daireTipleri'][number]): DaireTipi {
  return {
    id: d.id,
    ad: d.ad,
    oda: d.odaSayisi,
    banyo: d.banyo,
    brutM2: d.brutM2,
    netM2: ops(d.netM2),
    nitelik: ops(d.nitelik),
    fiyatMin: ops(d.fiyatMin),
    fiyatMax: ops(d.fiyatMax),
    adet: ops(d.adet),
    kalan: ops(d.kalanAdet),
    katPlani: ops(d.katPlaniUrl),
    katPlaniAlt: ops(d.katPlaniAlt),
  };
}

function firmaya(f: ProjeSatiri['firma']): Firma {
  return {
    slug: f.slug,
    ad: f.ad,
    logo: ops(f.logo),
    yil: ops(f.kurulusYili),
    tamamlanan: f.tamamlananProje,
    ozet: f.ozet,
  };
}

/** Prisma satırı → bileşenlerin kullandığı Proje görünüm modeli. */
function projeye(p: ProjeSatiri): Proje {
  return {
    id: p.id,
    slug: p.slug,
    ad: p.ad,
    tip: p.tip,
    durum: p.durum,
    bolgeSlug: p.bolge.slug,
    bolge: p.bolge.ad,
    il: p.bolge.il,
    mahalle: p.mahalle,
    adres: ops(p.adres),
    lat: p.lat,
    lng: p.lng,
    fiyatMin: p.fiyatMin,
    fiyatMax: ops(p.fiyatMax),
    olcek: {
      blok: ops(p.blokSayisi),
      kat: ops(p.katSayisi),
      bagimsizBolum: ops(p.toplamBagimsizBolum),
      arsaM2: ops(p.arsaM2),
      insaatM2: ops(p.insaatAlaniM2),
      yesilOran: ops(p.yesilAlanOrani),
    },
    odeme: {
      pesinat: p.pesinatOrani,
      vade: p.taksitAyi,
      krediyeUygun: p.krediyeUygun,
      takas: p.takas,
      aidat: ops(p.aidat),
      tapu: ops(p.tapuDurumu),
    },
    baslangic: p.baslangicTarihi ? isoGun(p.baslangicTarihi) : undefined,
    teslim: p.teslimTarihi ? isoGun(p.teslimTarihi) : undefined,
    ilerleme: p.ilerlemeYuzde,
    ozellik: p.ozellikler.map((o) => o.ozellik.kod as OzellikKey),
    daireTipleri: p.daireTipleri.map(daireye),
    foto: p.medya.map((m) => m.url),
    fotoAlt: p.medya.map((m) => m.alt),
    ozet: p.ozet,
    sec: p.sec ?? '',
    yeni: p.yeni,
    oneCikan: p.oneCikan,
    firma: firmaya(p.firma),
    yayin: isoGun(p.yayinTarihi),
    guncelleme: isoGun(p.guncelleme),
  };
}

/* ---------------- Bölgeler ---------------- */
export const getBolgeler = cache(async (): Promise<Bolge[]> => {
  const satirlar = await prisma.bolge.findMany({
    where: { yayinda: true },
    orderBy: { sira: 'asc' },
    include: {
      sss: { orderBy: { sira: 'asc' } },
      /* Proje sayısı CANLI sayılıyor. `Bolge.adet` sabit bir sütun ve
         proje eklenip çıkarıldıkça güncellenmiyordu: mega menüde ve
         önerilerde bölgeler "0 proje" diye görünüyordu. Sayının
         doğruluğu editöryel bir tercih değil, gerçeğin kendisi.

         TÜKENMİŞ VE TESLİM EDİLMİŞ PROJELER SAYILMIYOR: bölge kartına
         tıklayan kişi alınabilecek proje arıyor. "12 proje" yazıp
         listede 4 tane göstermek, sayının olmamasından kötü. */
      _count: {
        select: {
          projeler: {
            where: {
              yayinda: true,
              durum: { in: ['YAKINDA', 'SATISTA', 'SON_DAIRELER'] },
            },
          },
        },
      },
    },
  });

  return satirlar.map((b) => ({
    slug: b.slug,
    ad: b.ad,
    il: b.il,
    lat: b.lat,
    lng: b.lng,
    adet: b._count.projeler,
    img: b.img,
    ozet: b.ozet,
    /* Eksik alanlar tamamlanıyor: iniş sayfası `icerik.mevkiler.map`
       diyor ve alan yoksa herkese açık bir sayfa 500 veriyordu.
       Yeni açılan bölgenin içeriği doldurulana kadar boş dizi. */
    icerik: {
      ...icerikTamamla(b.icerik),
      sss: b.sss.map((s) => ({ s: s.soru, c: s.cevap })),
    },
  }));
});

export const getBolge = cache(async (slug: string): Promise<Bolge | null> => {
  const hepsi = await getBolgeler();
  return hepsi.find((b) => b.slug === slug) ?? null;
});

/* ---------------- Özellikler ---------------- */
export interface LandingOzellik {
  key: OzellikKey;
  ikon: IkonAdi;
  slug: string;
  baslik: string;
  aciklama: string;
}

export const getOzellikler = cache(async (): Promise<Record<OzellikKey, { ad: string; ikon: IkonAdi }>> => {
  const satirlar = await prisma.ozellik.findMany({ orderBy: { sira: 'asc' } });
  const out = {} as Record<OzellikKey, { ad: string; ikon: IkonAdi }>;
  for (const o of satirlar) out[o.kod as OzellikKey] = { ad: o.ad, ikon: o.ikon as IkonAdi };
  return out;
});

export const getLandingOzellikler = cache(async (): Promise<LandingOzellik[]> => {
  const satirlar = await prisma.ozellik.findMany({
    where: { landingSlug: { not: null } },
    orderBy: { sira: 'asc' },
  });
  return satirlar.map((o) => ({
    key: o.kod as OzellikKey,
    ikon: o.ikon as IkonAdi,
    slug: o.landingSlug!,
    baslik: o.landingBaslik!,
    aciklama: o.landingAciklama!,
  }));
});

export const getOzellikBySlug = cache(async (slug: string): Promise<LandingOzellik | null> => {
  const hepsi = await getLandingOzellikler();
  return hepsi.find((o) => o.slug === slug) ?? null;
});

/* ---------------- Projeler ---------------- */

/**
 * SATIN ALINABİLİR projeler. Tükenmiş ve teslim edilmiş olanlar
 * vitrinde yok.
 *
 * Teslim edilmiş proje sitede DURUYOR (firma sayfasından ve doğrudan
 * adresinden açılıyor) çünkü firmanın geçmişini kanıtlıyor; ama
 * listeye çıkarsa arayan kişiye alamayacağı şey gösterilmiş oluyor.
 */
const SATILABILIR = ['YAKINDA', 'SATISTA', 'SON_DAIRELER'] as const;

export const getProjeler = cache(async (): Promise<Proje[]> => {
  const satirlar = await prisma.proje.findMany({
    where: { yayinda: true, durum: { in: [...SATILABILIR] } },
    select: projeSelect,
    orderBy: { yayinTarihi: 'desc' },
  });
  return (satirlar as unknown as ProjeSatiri[]).map(projeye);
});

/** Tipe göre vitrin: /konut-projeleri, /villa-projeleri, /ofis-projeleri */
export const getProjelerByTip = cache(async (tip: ProjeTipi): Promise<Proje[]> => {
  const satirlar = await prisma.proje.findMany({
    /* KARMA projeler HER İKİ vitrinde de çıkıyor: içinde hem konut hem
       ofis var ve ikisini arayan da onu görmeli. Yalnızca kendi
       etiketine bakmak, karma projeyi hiçbir listeye sokmuyordu. */
    where: {
      yayinda: true,
      durum: { in: [...SATILABILIR] },
      tip: tip === 'KARMA' ? 'KARMA' : { in: [tip, 'KARMA'] },
    },
    select: projeSelect,
    orderBy: { yayinTarihi: 'desc' },
  });
  return (satirlar as unknown as ProjeSatiri[]).map(projeye);
});

/** Anasayfa vitrini — öne çıkarılanlar, yoksa en yeniler. */
export const getVitrinProjeler = cache(async (adet = 8): Promise<Proje[]> => {
  const secili = await prisma.proje.findMany({
    where: { yayinda: true, durum: { in: [...SATILABILIR] }, oneCikan: true },
    select: projeSelect,
    orderBy: { yayinTarihi: 'desc' },
    take: adet,
  });
  /* Hiç öne çıkarılan yoksa vitrin BOŞ KALMIYOR: yeni kurulan sitede
     kimse `oneCikan` işaretlemiyor ve anasayfanın ortası boş çıkıyordu. */
  if (secili.length >= adet) {
    return (secili as unknown as ProjeSatiri[]).slice(0, adet).map(projeye);
  }
  const kalan = await prisma.proje.findMany({
    where: {
      yayinda: true,
      durum: { in: [...SATILABILIR] },
      id: { notIn: secili.map((p) => p.id) },
    },
    select: projeSelect,
    orderBy: { yayinTarihi: 'desc' },
    take: adet - secili.length,
  });
  return ([...secili, ...kalan] as unknown as ProjeSatiri[]).map(projeye);
});

/**
 * Eski bir adresin bugünkü karşılığı. Yoksa null.
 *
 * Proje adı değişince slug da değişiyor ve eskisi `proje_slug`
 * tablosunda kalıyor; proje rotası 404 vermeden önce buraya bakıp
 * 301 ile yönlendiriyor.
 */
export const guncelSlug = cache(async (eski: string): Promise<string | null> => {
  const kayit = await prisma.projeSlug.findUnique({
    where: { slug: eski },
    select: { proje: { select: { slug: true, yayinda: true } } },
  });
  // Yayından kaldırılmış projeye yönlendirmek 404'ü 301+404'e çevirirdi
  return kayit?.proje.yayinda ? kayit.proje.slug : null;
});

/* Tekil proje sayfasında durum filtresi YOK: tükenmiş ya da teslim
   edilmiş projenin kendi adresi çalışmaya devam ediyor. O adresler
   paylaşılmış ve dizine girmiş durumda; 404 vermek, firmanın
   geçmişini de siliyor. Sayfa "tükendi" rozetiyle açılıyor. */
export const getProje = cache(async (slug: string): Promise<Proje | null> => {
  const satir = await prisma.proje.findFirst({
    where: { slug, yayinda: true },
    select: projeSelect,
  });
  return satir ? projeye(satir as unknown as ProjeSatiri) : null;
});

export const getProjelerByBolge = cache(async (bolgeSlug: string): Promise<Proje[]> => {
  const satirlar = await prisma.proje.findMany({
    where: {
      yayinda: true,
      durum: { in: [...SATILABILIR] },
      bolge: { slug: bolgeSlug },
    },
    select: projeSelect,
    orderBy: { fiyatMin: 'asc' },
  });
  return (satirlar as unknown as ProjeSatiri[]).map(projeye);
});

export const getProjelerByOzellik = cache(async (bolgeSlug: string, kod: OzellikKey): Promise<Proje[]> => {
  const satirlar = await prisma.proje.findMany({
    where: {
      yayinda: true,
      durum: { in: [...SATILABILIR] },
      bolge: { slug: bolgeSlug },
      ozellikler: { some: { ozellik: { kod } } },
    },
    select: projeSelect,
    orderBy: { fiyatMin: 'asc' },
  });
  return (satirlar as unknown as ProjeSatiri[]).map(projeye);
});

export const getProjelerByFirma = cache(async (firmaSlug: string): Promise<Proje[]> => {
  const satirlar = await prisma.proje.findMany({
    /* Firma sayfasında durum filtresi YOK: teslim edilmiş projeler
       firmanın en güçlü kanıtı ve sayfanın var olma sebebi. */
    where: { yayinda: true, firma: { slug: firmaSlug } },
    select: projeSelect,
    orderBy: [{ durum: 'asc' }, { yayinTarihi: 'desc' }],
  });
  return (satirlar as unknown as ProjeSatiri[]).map(projeye);
});

/* ---------------- Firmalar ---------------- */
export const getFirmalar = cache(async (): Promise<(Firma & { projeSayisi: number })[]> => {
  const satirlar = await prisma.firma.findMany({
    where: { yayinda: true },
    orderBy: { sira: 'asc' },
    select: {
      slug: true, ad: true, logo: true, kurulusYili: true,
      tamamlananProje: true, ozet: true,
      _count: { select: { projeler: { where: { yayinda: true } } } },
    },
  });
  return satirlar.map((f) => ({
    ...firmaya(f),
    projeSayisi: f._count.projeler,
  }));
});

export const getFirma = cache(async (slug: string) => {
  const f = await prisma.firma.findFirst({
    where: { slug, yayinda: true },
    select: {
      slug: true, ad: true, logo: true, kurulusYili: true,
      tamamlananProje: true, ozet: true, hakkinda: true,
      telefon: true, eposta: true, web: true,
    },
  });
  if (!f) return null;
  return {
    ...firmaya(f),
    hakkinda: f.hakkinda,
    telefon: ops(f.telefon),
    eposta: ops(f.eposta),
    web: ops(f.web),
  };
});

/** Bölge × özellik iniş sayfası üretilecek kombinasyonlar — yalnızca sonucu olanlar. */
export const getLandingKombinasyonlari = cache(async () => {
  const satirlar = await prisma.projeOzellik.findMany({
    where: {
      proje: { yayinda: true, durum: { in: [...SATILABILIR] } },
      ozellik: { landingSlug: { not: null } },
    },
    select: {
      proje: { select: { bolge: { select: { slug: true } } } },
      ozellik: { select: { landingSlug: true } },
    },
  });

  const set = new Set(satirlar.map((s) => `${s.proje.bolge.slug}|${s.ozellik.landingSlug}`));
  return [...set].map((k) => {
    const [bolge, ozellik] = k.split('|');
    return { bolge, ozellik };
  }).sort((a, b) => a.bolge.localeCompare(b.bolge) || a.ozellik.localeCompare(b.ozellik));
});

/**
 * Benzer projeler.
 *
 * Yakınlık AYNI TİP İÇİNDE aranıyor: ofis projesine bakan kişiye konut
 * önermek dönüşüm değil gürültü üretiyor. Fiyat farkı `fiyatMin`
 * üzerinden ölçülüyor — aralığın üst ucu çoğu projede boş.
 */
export const getBenzerProjeler = cache(async (slug: string, adet = 4): Promise<Proje[]> => {
  const p = await getProje(slug);
  if (!p) return [];

  const hepsi = await getProjelerByTip(p.tip);
  const kendi = p.fiyatMin;
  /* Bölge farkı, projenin KENDİ ölçeğine oranlanan bir ceza. Sabit bir
     tutar, 2 milyonluk projede belirleyici olurken 40 milyonluk
     projede hiçbir şey ifade etmiyordu. */
  const bolgeCezasi = Math.max(kendi * 0.35, 500_000);

  return hepsi
    .filter((x) => x.id !== p.id)
    .sort((a, b) =>
      (Math.abs(a.fiyatMin - kendi) + (a.bolgeSlug === p.bolgeSlug ? 0 : bolgeCezasi)) -
      (Math.abs(b.fiyatMin - kendi) + (b.bolgeSlug === p.bolgeSlug ? 0 : bolgeCezasi)))
    .slice(0, adet);
});
