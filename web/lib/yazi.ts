import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';
import { ICERIK_ETIKET } from './icerik';
import type { GovdeBlogu } from './icerik-bicim';

/* ============================================================
   Rehber yazıları.

   İniş sayfaları "Ataşehir konut projeleri" gibi İŞLEM niyetli sorguları
   karşılıyor. "Kaş'ta ne yenir", "eylülde deniz sıcaklığı" gibi
   ARAŞTIRMA niyetli sorguların karşılığı yoktu; rakiplerin (enuygun,
   gotatil) içerik ağı buradan besleniyor.

   Yazı bir bölgeye bağlanabiliyor: iniş sayfası yazılarını, yazı da
   bölgenin projelerini gösteriyor. Bağ olmadan blog, sitenin geri
   kalanıyla konuşmayan ayrı bir ada olurdu.

   Okuma listesi `Sayfa` ile aynı önbellek etiketini kullanıyor
   (`ICERIK_ETIKET`): panelde içerik kaydedildiğinde ikisi de düşüyor.
   ============================================================ */

export interface YaziOzet {
  slug: string;
  baslik: string;
  ozet: string;
  kapak: string | null;
  yazar: string | null;
  okumaDk: number;
  yayinTarihi: Date;
  bolge: { slug: string; ad: string } | null;
}

export interface YaziTam extends YaziOzet {
  govde: GovdeBlogu[];
  guncelleme: Date;
}

const blokAyikla = (ham: unknown): GovdeBlogu[] =>
  (Array.isArray(ham) ? ham : []) as GovdeBlogu[];

const SECIM = {
  slug: true, baslik: true, ozet: true, kapak: true, yazar: true,
  okumaDk: true, yayinTarihi: true,
  bolge: { select: { slug: true, ad: true } },
} as const;

/**
 * Ham sorgu, önbelleksiz.
 *
 * `unstable_cache` yalnızca istek bağlamında çalışıyor; sorguyu ayrı
 * tutmak testlerin ve betiklerin okuma mantığını doğrudan
 * çağırabilmesini sağlıyor. (`lib/icerik.ts` ile aynı kalıp.)
 */
export async function yazilariOku(dil: 'TR' | 'EN' = 'TR'): Promise<YaziOzet[]> {
  return prisma.yazi.findMany({
    where: { dil, yayinda: true },
    orderBy: { yayinTarihi: 'desc' },
    take: 200,
    select: SECIM,
  });
}

const onbellekli = unstable_cache(yazilariOku, ['rehber-yazilari'], { tags: [ICERIK_ETIKET] });

/** Yayındaki yazılar. Veritabanı erişilemezse boş liste — rehber, sitenin ayakta kalmasının önüne geçmemeli. */
export async function yazilar(dil: 'TR' | 'EN' = 'TR'): Promise<YaziOzet[]> {
  try {
    return await onbellekli(dil);
  } catch (e) {
    console.error('Rehber yazıları okunamadı:', e);
    return [];
  }
}

export async function yaziGetir(slug: string): Promise<YaziTam | null> {
  try {
    const y = await prisma.yazi.findFirst({
      where: { slug, yayinda: true },
      select: { ...SECIM, govde: true, guncelleme: true },
    });
    if (!y) return null;
    return { ...y, govde: blokAyikla(y.govde) };
  } catch (e) {
    console.error('Yazı okunamadı:', e);
    return null;
  }
}

/** Bir bölgeye bağlı yazılar — iniş sayfasında gösteriliyor. */
export async function bolgeYazilari(bolgeSlug: string, limit = 3): Promise<YaziOzet[]> {
  return (await yazilar()).filter((y) => y.bolge?.slug === bolgeSlug).slice(0, limit);
}

/** Bölge bağı — önbelleksiz sürüm; testler ve betikler için. */
export async function bolgeYazilariHam(bolgeSlug: string, limit = 3): Promise<YaziOzet[]> {
  return (await yazilariOku()).filter((y) => y.bolge?.slug === bolgeSlug).slice(0, limit);
}

/** Panel listesi — yayında olmayanlar da görünüyor. */
export async function yaziListesi() {
  return prisma.yazi.findMany({
    orderBy: [{ yayinda: 'asc' }, { yayinTarihi: 'desc' }],
    take: 200,
    select: {
      id: true, slug: true, baslik: true, yayinda: true, yayinTarihi: true,
      okumaDk: true, bolge: { select: { ad: true } },
    },
  });
}

/**
 * Okuma süresi.
 *
 * Türkçe için dakikada ~200 kelime alınıyor. Süre panelde elle
 * girilseydi güncellenen yazılarda eskirdi; gövdeden hesaplanıyor.
 */
export function okumaSuresi(bloklar: GovdeBlogu[]): number {
  const kelime = bloklar.reduce(
    (a, b) => a
      + (b.h ? b.h.split(/\s+/).length : 0)
      + (b.p ? b.p.split(/\s+/).length : 0)
      + (b.liste ?? []).reduce((x, m) => x + m.split(/\s+/).length, 0),
    0,
  );
  return Math.max(1, Math.round(kelime / 200));
}

export interface YaziGirdisi {
  slug: string;
  baslik: string;
  ozet: string;
  kapak?: string | null;
  govde: GovdeBlogu[];
}

/** Adres çakışması kurumsal sayfalarla da olabilir; ikisi ayrı ağaçta ama slug tekilliği yine gerekli. */
export function yaziDenetle(g: YaziGirdisi): string | null {
  if (!/^[a-z0-9-]{3,80}$/.test(g.slug)) {
    return 'Adres yalnızca küçük harf, rakam ve tire içerebilir (3–80 karakter).';
  }
  if (g.baslik.trim().length < 8) return 'Başlık en az 8 karakter olmalı.';
  /* Özet hem liste kartında hem meta açıklamasında kullanılıyor;
     Google 50–160 arasını kırpmadan gösteriyor. */
  const ozet = g.ozet.trim();
  if (ozet.length < 50 || ozet.length > 200) {
    return `Özet 50–200 karakter olmalı (şu an ${ozet.length}).`;
  }
  if (g.govde.length === 0) return 'Yazı gövdesi boş olamaz.';
  if (g.kapak && !/^https?:\/\//.test(g.kapak)) return 'Kapak görseli tam adres olmalı (https://…).';
  return null;
}
