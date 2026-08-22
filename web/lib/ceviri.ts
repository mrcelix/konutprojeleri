import 'server-only';
import { prisma } from './db';
import { ROTA_AGACI, TUM_DILLER, VARSAYILAN_DIL, type Dil as DilKodu } from './i18n';
import { METIN_KAYDI, varsayilanMetin, type MetinAnahtari } from './metin-kayit';

/** Sayfa metni anahtarları — kapsam hesabı için. */
const SAYFA_METNI_ANAHTARLARI = Object.keys(METIN_KAYDI) as MetinAnahtari[];

/* ============================================================
   Çeviri katmanı.

   ÖNCEKİ YAPI dil başına SÜTUNDU: `ozetEn`, `icerikEn`, `adEn`,
   `landingSlugEn`… İki dil için çalışıyordu. Dördüncü dilde 21 sütun
   ediyor ve her yeni dil bir şema göçü gerektiriyordu — yani dil
   eklemek geliştirici işi oluyordu, içerik işi değil.

   Artık dil bir VERİ değeri. Yeni dil açmak şema değiştirmiyor.

   TÜRKÇE BURADA DEĞİL. Varsayılan dil ana tablodaki sütunlarda
   duruyor ve her zaman dolu; `dil = 'TR'` satırı veritabanı kısıtıyla
   reddediliyor. İki yerde birden tutmak "içerik ya orada ya burada"
   belirsizliği üretirdi.
   ============================================================ */

/** Veritabanındaki enum karşılığı. */
export type DilEnum = 'TR' | 'EN' | 'RU' | 'AR';

export const dilEnum = (d: DilKodu): DilEnum => d.toUpperCase() as DilEnum;

/** Enum → kısa kod. Sayfa metni kaydı kısa kodla çalışıyor. */
const dilKodu = (d: DilEnum): DilKodu => d.toLowerCase() as DilKodu;

/* ---------------- Okuma ---------------- */

/**
 * Bir dildeki bölge çevirilerini bölge kimliğine göre döndürür.
 *
 * Toplu yükleniyor: sayfa başına bölge sayısı kadar sorgu atmak
 * (N+1) liste sayfalarında ölçülebilir gecikme üretiyordu.
 */
export async function bolgeCevirileri(dil: DilEnum, bolgeIdler?: string[]) {
  if (dil === 'TR') return new Map<string, { ozet: string | null; icerik: unknown }>();
  const satirlar = await prisma.bolgeCeviri.findMany({
    where: { dil, ...(bolgeIdler ? { bolgeId: { in: bolgeIdler } } : {}) },
    select: { bolgeId: true, ozet: true, icerik: true },
  });
  return new Map(satirlar.map((s) => [s.bolgeId, { ozet: s.ozet, icerik: s.icerik }]));
}

export async function projeCevirileri(dil: DilEnum, projeIdler?: string[]) {
  if (dil === 'TR') return new Map<string, { ozet: string | null }>();
  const satirlar = await prisma.projeCeviri.findMany({
    where: { dil, ...(projeIdler ? { projeId: { in: projeIdler } } : {}) },
    select: { projeId: true, ozet: true },
  });
  return new Map(satirlar.map((s) => [s.projeId, { ozet: s.ozet }]));
}

export async function ozellikCevirileri(dil: DilEnum) {
  if (dil === 'TR') return new Map<string, OzellikCeviriDegeri>();
  const satirlar = await prisma.ozellikCeviri.findMany({
    where: { dil },
    select: {
      ozellikId: true, ad: true,
      landingSlug: true, landingBaslik: true, landingAciklama: true,
    },
  });
  return new Map(satirlar.map((s) => [s.ozellikId, s as OzellikCeviriDegeri]));
}

export interface OzellikCeviriDegeri {
  ozellikId: string;
  ad: string | null;
  landingSlug: string | null;
  landingBaslik: string | null;
  landingAciklama: string | null;
}

/* ---------------- Yazma ---------------- */

export type CeviriVarlik = 'bolge' | 'proje' | 'ozellik';

export interface CeviriSonucu { hata?: string; tamam?: boolean }

/**
 * Çeviri kaydeder. Boş bırakılan alan NULL yazılıyor — "çevrilmedi"
 * ile "boş string" aynı şey değil; boş string sayfayı boş metinle
 * yayına sokardı.
 */
export async function ceviriYaz(
  varlik: CeviriVarlik,
  varlikId: string,
  dil: DilEnum,
  alanlar: Record<string, string | null>,
): Promise<CeviriSonucu> {
  if (dil === 'TR') {
    return { hata: 'Türkçe içerik çeviri tablosunda tutulmuyor; ana kayıttan düzenlenir.' };
  }

  const temiz = (a?: string | null) => {
    const t = (a ?? '').trim();
    return t.length ? t : null;
  };

  try {
    if (varlik === 'bolge') {
      const veri = { ozet: temiz(alanlar.ozet) };
      await prisma.bolgeCeviri.upsert({
        where: { bolgeId_dil: { bolgeId: varlikId, dil } },
        create: { bolgeId: varlikId, dil, ...veri },
        update: veri,
      });
    } else if (varlik === 'proje') {
      const veri = { ozet: temiz(alanlar.ozet) };
      await prisma.projeCeviri.upsert({
        where: { projeId_dil: { projeId: varlikId, dil } },
        create: { projeId: varlikId, dil, ...veri },
        update: veri,
      });
    } else {
      const veri = {
        ad: temiz(alanlar.ad),
        landingSlug: temiz(alanlar.landingSlug),
        landingBaslik: temiz(alanlar.landingBaslik),
        landingAciklama: temiz(alanlar.landingAciklama),
      };
      await prisma.ozellikCeviri.upsert({
        where: { ozellikId_dil: { ozellikId: varlikId, dil } },
        create: { ozellikId: varlikId, dil, ...veri },
        update: veri,
      });
    }
    return { tamam: true };
  } catch (e) {
    // Aynı dilde iki özellik aynı iniş yolunu kullanamaz
    if (e instanceof Error && 'code' in e && (e as { code?: string }).code === 'P2002') {
      return { hata: 'Bu iniş sayfası yolu aynı dilde başka bir özellikte kullanılıyor.' };
    }
    return { hata: 'Çeviri kaydedilemedi.' };
  }
}

/* ---------------- Kapsam ---------------- */

export interface DilKapsami {
  dil: DilEnum;
  bolge: { toplam: number; cevrili: number };
  proje: { toplam: number; cevrili: number };
  ozellik: { toplam: number; cevrili: number };
  /** Sayfa metinleri — başlık, spot, güven kartları */
  sayfaMetni: { toplam: number; cevrili: number };
  /** İniş sayfası yolu yazılmış özellik sayısı */
  inisYolu: number;
  /** Sayfa üretilebilir mi — bkz. `yayinaHazir` */
  hazir: boolean;
}

/**
 * Bir dilin ne kadarının çevrildiği.
 *
 * Yayına hazır sayılmak için EN AZ BİR bölge ve EN AZ BİR villa
 * çevrilmiş olmalı. Sebep Faz 13 kararı: çevrilmemiş sayfaya
 * hreflang basmak Search Console'da "alternatif sayfa bulunamadı"
 * hatası üretiyor ve iki dili birden zayıflatıyor. Boş bir dil ağacı
 * açmak, o ağacın tamamını bu hataya sokar.
 */
export async function dilKapsami(dil: DilEnum): Promise<DilKapsami> {
  const [bolgeToplam, projeToplam, ozellikToplam] = await Promise.all([
    prisma.bolge.count({ where: { yayinda: true } }),
    prisma.proje.count({ where: { yayinda: true } }),
    prisma.ozellik.count(),
  ]);

  /* Sayfa metinleri KAYITTAN geliyor, veritabanından değil: kodda
     varsayılanı olan anahtar o dilde "yazılmış" sayılıyor, panelden
     girilen üzerine yazma da öyle. İkisini ayrı saymak, kod
     varsayılanı olan bir dili "eksik" göstermek olurdu. */
  const metinToplam = SAYFA_METNI_ANAHTARLARI.length;

  if (dil === 'TR') {
    return {
      dil,
      bolge: { toplam: bolgeToplam, cevrili: bolgeToplam },
      proje: { toplam: projeToplam, cevrili: projeToplam },
      ozellik: { toplam: ozellikToplam, cevrili: ozellikToplam },
      sayfaMetni: { toplam: metinToplam, cevrili: metinToplam },
      inisYolu: await prisma.ozellik.count({ where: { landingSlug: { not: null } } }),
      hazir: true,
    };
  }

  const [bolgeCevrili, projeCevrili, ozellikCevrili, inisYolu, metinSatirlari] = await Promise.all([
    prisma.bolgeCeviri.count({ where: { dil, ozet: { not: null }, bolge: { yayinda: true } } }),
    prisma.projeCeviri.count({ where: { dil, ozet: { not: null }, proje: { yayinda: true } } }),
    prisma.ozellikCeviri.count({ where: { dil, ad: { not: null } } }),
    prisma.ozellikCeviri.count({ where: { dil, landingSlug: { not: null } } }),
    prisma.metin.findMany({ where: { dil }, select: { anahtar: true } }),
  ]);

  const kayitli = new Set(metinSatirlari.map((m) => m.anahtar));
  const metinCevrili = SAYFA_METNI_ANAHTARLARI
    .filter((a) => kayitli.has(a) || varsayilanMetin(a, dilKodu(dil)) !== '').length;

  return {
    dil,
    bolge: { toplam: bolgeToplam, cevrili: bolgeCevrili },
    proje: { toplam: projeToplam, cevrili: projeCevrili },
    ozellik: { toplam: ozellikToplam, cevrili: ozellikCevrili },
    sayfaMetni: { toplam: metinToplam, cevrili: metinCevrili },
    inisYolu,
    /* ÜÇ koşul: bölge, proje VE sayfa metinleri. Faz 34'te ilk ikisi
       vardı; sayfa metinleri olmadan dil açılırsa başlıklar ve
       güven kartları BOŞ çıkıyordu — sayfa ayakta ama içi yok. */
    hazir: bolgeCevrili > 0 && projeCevrili > 0 && metinCevrili === metinToplam,
  };
}

/** Tüm dillerin kapsamı — panel özeti. */
export async function tumDillerinKapsami(diller: DilEnum[]): Promise<DilKapsami[]> {
  const sonuc: DilKapsami[] = [];
  for (const d of diller) sonuc.push(await dilKapsami(d));
  return sonuc;
}

/* ---------------- Yayın kapısı ---------------- */

/**
 * Bu dil gerçekten yayınlanabilir mi.
 *
 * İKİ KOŞUL birden gerekiyor:
 *   · rota ağacı var mı (sayfa dosyaları) — `ROTA_AGACI`
 *   · içerik var mı (en az bir bölge ve bir proje çevrili)
 *
 * İkisi ayrı sebeplerle eksik olabiliyor ve ikisi de tek başına
 * yetmiyor. Ağaç olmadan hreflang 404'e bağlanır; içerik olmadan
 * Google "alternatif sayfa bulunamadı" der ve İKİ dili birden
 * zayıflatır.
 */
export async function dilYayindaMi(dil: DilKodu): Promise<boolean> {
  if (dil === VARSAYILAN_DIL) return true;
  if (!ROTA_AGACI[dil]) return false;
  return (await dilKapsami(dilEnum(dil))).hazir;
}

/**
 * Şu an gerçekten yayında olan diller.
 *
 * Site haritası, hreflang ve dil değiştirici bunu kullanıyor — üçü
 * de aynı listeye bakmalı. Ayrı ayrı karar verselerdi biri diğerinin
 * bilmediği bir dili duyurabilirdi.
 */
export async function yayindakiDiller(): Promise<DilKodu[]> {
  /* `TUM_DILLER` üzerinden geçiliyor, `DILLER` üzerinden değil: rota
     ağacı kontrolü `dilYayindaMi` içinde ve tek yerde olmalı. İki
     ayrı süzgeç, birinin güncellenip diğerinin kalması demekti. */
  const sonuc: DilKodu[] = [];
  for (const d of TUM_DILLER) if (await dilYayindaMi(d)) sonuc.push(d);
  return sonuc;
}
