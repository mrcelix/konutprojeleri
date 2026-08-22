import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';
import { varsayilanSayfalar } from './icerik-varsayilan';
import type { Dil, RotaDili } from './i18n';
import {
  METIN_KAYDI, varsayilanMetin,
  type MetinAnahtari,
} from './metin-kayit';
import { site } from './site';

/* ============================================================
   İçerik okuma katmanı.

   Sayfaların çoğu statik üretiliyor (`revalidate` + ISR). İçeriği
   veritabanından okumak bunu bozmamalı: okumalar `unstable_cache`
   ile ETİKETLİ önbelleğe alınıyor, panelden kayıt yapılınca
   `revalidateTag` ile tek seferde düşürülüyor. Böylece sayfalar
   statik kalıyor ama düzenleme anında yayına giriyor.

   Veritabanı erişilemezse VARSAYILANA düşülüyor: içerik yönetimi
   sitenin ayakta kalmasının önüne geçmemeli.
   ============================================================ */

export const ICERIK_ETIKET = 'icerik';

/* ---------------- Kısa metinler ---------------- */

type MetinHaritasi = Partial<Record<MetinAnahtari, string>>;

/**
 * Ham sorgu, önbelleksiz.
 *
 * `unstable_cache` yalnızca istek bağlamında çalışıyor; sorguyu ayrı
 * tutmak testlerin ve betiklerin okuma mantığını doğrudan
 * çağırabilmesini sağlıyor.
 */
export async function metinleriOku(): Promise<Record<RotaDili, MetinHaritasi>> {
  const satirlar = await prisma.metin.findMany({ select: { anahtar: true, dil: true, deger: true } });
  const sonuc: Record<RotaDili, MetinHaritasi> = { tr: {}, en: {}, ru: {} };
  for (const s of satirlar) {
    // Kayıttan çıkarılmış eski anahtarlar yok sayılıyor
    if (!(s.anahtar in METIN_KAYDI)) continue;
    /* Kayıtta olmayan dilin satırı yok sayılıyor: `Dil` enum'u dört
       değerli ama sayfa metinleri yalnızca rota ağacı olan dillerde
       kullanılıyor. */
    const d = s.dil.toLowerCase() as RotaDili;
    if (!(d in sonuc)) continue;
    sonuc[d][s.anahtar as MetinAnahtari] = s.deger;
  }
  return sonuc;
}

const uzerineYazmalar = unstable_cache(
  metinleriOku, ['metin-uzerine-yazmalar'], { tags: [ICERIK_ETIKET] },
);

export type MetinOkuyucu = (anahtar: MetinAnahtari, degiskenler?: Record<string, string | number>) => string;

/**
 * Sayfanın kullandığı metin okuyucusunu üretir.
 *
 * Bileşenler `const m = await metinler(dil)` deyip `m('anasayfa.hero.baslik')`
 * çağırıyor. Anahtar tipli olduğu için yazım hatası derlemede yakalanıyor.
 */
export async function metinler(dil: RotaDili = 'tr'): Promise<MetinOkuyucu> {
  let harita: MetinHaritasi = {};
  try {
    harita = (await uzerineYazmalar())[dil];
  } catch (e) {
    // Veritabanı yoksa varsayılanlarla devam — sayfa yine de çıksın
    console.error('Metinler okunamadı, varsayılanlara düşülüyor:', e);
  }

  return (anahtar, degiskenler) => {
    const ham = harita[anahtar] ?? varsayilanMetin(anahtar, dil);
    return degiskenDoldur(ham, dil, degiskenler);
  };
}

/**
 * Metindeki `{ad}` yer tutucularını doldurur.
 *
 * Her metinde geçerli ortak değişkenler (marka, unvan, yıl, villa ve
 * bölge sayısı) burada; sayfaya özgü olanlar çağrıda geçiliyor.
 * Karşılığı olmayan yer tutucu OLDUĞU GİBİ bırakılıyor — sessizce
 * boşaltmak yöneticinin yazım hatasını görünmez kılardı.
 */
function degiskenDoldur(
  metin: string,
  dil: Dil,
  ek?: Record<string, string | number>,
): string {
  const yerel = dil === 'en' ? 'en-US' : 'tr-TR';
  const ortak: Record<string, string> = {
    marka: site.ad,
    unvan: site.unvan || site.ad,
    yil: String(new Date().getFullYear()),
  };
  /* `{proje}` ve `{bolge}` BİLEREK ORTAK LİSTEDE YOK: sayılar veriden
     geliyor ve çağrı yerinde `ek` ile geçiliyor. Sabit bir varsayılan
     koymak, çağrıyı unutan bir sayfada sessizce "0 proje" yazdırırdı;
     karşılığı olmayan yer tutucu olduğu gibi kalıyor ve eksik olduğu
     ekranda görünüyor. */
  return metin.replace(/\{(\w+)\}/g, (tam, ad: string) => {
    const d = ek?.[ad] ?? ortak[ad];
    if (d === undefined) return tam;
    // Sayılar dilin binlik ayracıyla: "1.240 proje" / "1,240 developments"
    return typeof d === 'number' ? d.toLocaleString(yerel) : String(d);
  });
}

/* ---------------- Kurumsal sayfalar ---------------- */

export interface SayfaBlogu { h?: string; p?: string; liste?: string[] }
export interface SayfaSss { s: string; c: string }

export interface SayfaIcerigi {
  slug: string;
  baslik: string;
  h1: string;
  aciklama: string;
  govde: SayfaBlogu[];
  sss?: SayfaSss[];
  indexle: boolean;
  /** Sayfaya özel çağrı düğmesi; yoksa `sayfa.altcta` metni kullanılıyor */
  ctaMetin?: string;
  ctaYol?: string;
}

/** JSON sütunları tip güvenli değil; okurken doğrulanıyor. */
export function blokAyikla(ham: unknown): SayfaBlogu[] {
  if (!Array.isArray(ham)) return [];
  return ham.flatMap((b): SayfaBlogu[] => {
    if (!b || typeof b !== 'object') return [];
    const o = b as Record<string, unknown>;
    const blok: SayfaBlogu = {};
    if (typeof o.h === 'string' && o.h.trim()) blok.h = o.h;
    if (typeof o.p === 'string' && o.p.trim()) blok.p = o.p;
    if (Array.isArray(o.liste)) {
      const l = o.liste.filter((x): x is string => typeof x === 'string' && !!x.trim());
      if (l.length) blok.liste = l;
    }
    return Object.keys(blok).length ? [blok] : [];
  });
}

export function sssAyikla(ham: unknown): SayfaSss[] | undefined {
  if (!Array.isArray(ham)) return undefined;
  const l = ham.flatMap((f): SayfaSss[] => {
    if (!f || typeof f !== 'object') return [];
    const o = f as Record<string, unknown>;
    return typeof o.s === 'string' && typeof o.c === 'string' && o.s.trim() && o.c.trim()
      ? [{ s: o.s, c: o.c }] : [];
  });
  return l.length ? l : undefined;
}

/** Ham sorgu, önbelleksiz — bkz. `metinleriOku`. */
export async function sayfalariOku(dil: 'TR' | 'EN'): Promise<SayfaIcerigi[]> {
  const satirlar = await prisma.sayfa.findMany({
    where: { dil, yayinda: true },
    orderBy: { slug: 'asc' },
    select: {
      slug: true, baslik: true, h1: true, aciklama: true, govde: true,
      sss: true, indexle: true, ctaMetin: true, ctaYol: true,
    },
  });

  /* TABLO HİÇ TOHUMLANMAMIŞSA koda gömülü içerikle devam ediliyor.
     Yayındaki veritabanında `sayfa` kaydı yoktu: altbilgideki
     `/hakkimizda`, `/iletisim`, `/gizlilik`, `/iptal-kosullari`…
     bağlantılarının hepsi 404 dönüyordu. Bir kiralama sitesinin
     iptal koşulları ve gizlilik metni, içerik yönetimi kurulmadı
     diye kaybolmamalı.

     Koşul bilerek dar: "yayında kayıt yok" değil, "hiç kayıt yok".
     Panelden bilinçle yayından kaldırılmış bir sayfa geri
     gelmemeli. Ek sorgu yalnızca boş sonuçta çalışıyor. */
  if (satirlar.length === 0 && (await prisma.sayfa.count({ where: { dil } })) === 0) {
    return varsayilanSayfalar(dil);
  }

  return satirlar.map((s) => ({
    slug: s.slug, baslik: s.baslik, h1: s.h1, aciklama: s.aciklama,
    govde: blokAyikla(s.govde), sss: sssAyikla(s.sss), indexle: s.indexle,
    ...(s.ctaMetin && s.ctaYol ? { ctaMetin: s.ctaMetin, ctaYol: s.ctaYol } : {}),
  }));
}

const yayindakiSayfalar = unstable_cache(
  sayfalariOku, ['kurumsal-sayfalar'], { tags: [ICERIK_ETIKET] },
);

export async function sayfalar(dil: Dil = 'tr'): Promise<SayfaIcerigi[]> {
  try {
    return await yayindakiSayfalar(dil === 'en' ? 'EN' : 'TR');
  } catch (e) {
    /* Veritabanı erişilemiyor: boş liste dönmek kurumsal sayfaların
       hepsini 404 yapıyordu. Koda gömülü içerik en azından ayakta
       kalıyor. */
    console.error('Kurumsal sayfalar okunamadı:', e);
    return varsayilanSayfalar(dil === 'en' ? 'EN' : 'TR');
  }
}

export async function sayfaGetir(slug: string, dil: Dil = 'tr'): Promise<SayfaIcerigi | null> {
  return (await sayfalar(dil)).find((s) => s.slug === slug) ?? null;
}

/* ---------------- Panel biçimleyicileri ----------------
   JSON sütunlarını düzenleyicinin beklediği düz metne çeviriyor.
   Ters yön (`metin → JSON`) sunucu eyleminde; orası 'use server'
   dosyası olduğu için senkron yardımcı dışa aktaramıyor. */

/** Gövde bloklarını düzenlenebilir metne çevirir. */
export function govdeMetne(bloklar: SayfaBlogu[]): string {
  return bloklar.map((b) => [
    b.h ? `## ${b.h}` : null,
    b.p ?? null,
    ...(b.liste ?? []).map((l) => `- ${l}`),
  ].filter(Boolean).join('\n')).join('\n---\n');
}

/** SSS listesini `soru | cevap` satırlarına çevirir. */
export function sssMetne(sss: SayfaSss[] | undefined): string {
  return (sss ?? []).map((f) => `${f.s} | ${f.c}`).join('\n');
}
