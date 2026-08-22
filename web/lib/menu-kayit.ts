import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';
import type { MegaTanim } from '@/components/MegaMenu';
import type { IkonAdi } from './types';

/* ============================================================
   Panelden yönetilen menü.

   Menü koda yazılıydı; yeni bir sayfa açan yönetici onu menüye
   ekleyemiyor, geliştirici bekliyordu. Rehber ve teklif sayfaları
   eklenirken menü üç kez elle düzenlendi ve üçü de dağıtım
   gerektirdi.

   Tablo BOŞSA site koddaki varsayılana düşüyor (`lib/menu.ts`).
   Menüsüz bir başlık, gezinmesi olmayan bir site demek — üretim
   veritabanı boş kaldığında (Faz 62) tam olarak bu riski gördük.
   ============================================================ */

export const MENU_ETIKET = 'menu';

export interface DuzBaglanti {
  ad: string;
  yol: string;
  yeniSekme: boolean;
}

export interface MenuYapisi {
  /** Mega paneli olmayan düz bağlantılar */
  duz: DuzBaglanti[];
  /** Mega panelli ögeler */
  mega: MegaTanim[];
}

/** Panelde ikon seçilebilmesi için: geçersiz ad basılmasın diye daraltılıyor. */
const IKON_VARSAYILAN: IkonAdi = 'pin';

const SECIM = {
  id: true, ad: true, yol: true, ikon: true, not: true, sira: true,
  mega: true, yeniSekme: true, aktif: true, ustId: true,
  tanitimBaslik: true, tanitimMetin: true, tanitimDugme: true, tanitimYol: true,
  seritBaslik: true,
} as const;

type Satir = {
  id: string; ad: string; yol: string | null; ikon: string | null; not: string | null;
  sira: number; mega: boolean; yeniSekme: boolean; aktif: boolean; ustId: string | null;
  tanitimBaslik: string | null; tanitimMetin: string | null;
  tanitimDugme: string | null; tanitimYol: string | null; seritBaslik: string | null;
};

/**
 * Ham sorgu, önbelleksiz — testler ve betikler için.
 * (`lib/icerik.ts` ve `lib/yazi.ts` ile aynı kalıp.)
 */
export async function menuOku(
  konum: 'BASLIK' | 'YARDIMCI' | 'ALTBILGI' = 'BASLIK', dil: 'TR' | 'EN' = 'TR',
): Promise<Satir[]> {
  return prisma.menuOgesi.findMany({
    where: { konum, dil, aktif: true },
    orderBy: [{ sira: 'asc' }, { ad: 'asc' }],
    select: SECIM,
  });
}

/**
 * Düz satırları üç düzeyli ağaca çevirir.
 *
 * Saf: girdisi satır listesi, çıktısı menü yapısı. Sıralama ve
 * gruplama kuralları burada sınanabiliyor (scripts/test-menu.ts).
 */
export function menuKur(satirlar: Satir[]): MenuYapisi {
  const ustler = satirlar.filter((s) => !s.ustId);
  const altlar = new Map<string, Satir[]>();
  for (const s of satirlar) {
    if (!s.ustId) continue;
    const liste = altlar.get(s.ustId) ?? [];
    liste.push(s);
    altlar.set(s.ustId, liste);
  }

  const duz: DuzBaglanti[] = [];
  const mega: MegaTanim[] = [];

  for (const u of ustler) {
    if (!u.mega) {
      /* Yolu olmayan düz bağlantı tıklanamaz bir menü ögesi olurdu. */
      if (u.yol) duz.push({ ad: u.ad, yol: u.yol, yeniSekme: u.yeniSekme });
      continue;
    }

    const sutunlar = (altlar.get(u.id) ?? []).map((sutun) => ({
      baslik: sutun.ad,
      baglantilar: (altlar.get(sutun.id) ?? [])
        .filter((b) => b.yol)
        .map((b) => ({
          ad: b.ad, yol: b.yol!, ikon: (b.ikon as IkonAdi) || IKON_VARSAYILAN,
          ...(b.not ? { not: b.not } : {}),
        })),
    })).filter((s) => s.baglantilar.length > 0);

    /* Sütunu olmayan mega öge, tıklayınca boş panel açardı — düz
       bağlantıya düşürülüyor. */
    if (sutunlar.length === 0) {
      if (u.yol) duz.push({ ad: u.ad, yol: u.yol, yeniSekme: u.yeniSekme });
      continue;
    }

    /* Kısayol şeridi ayrı bir düzey değil: her sütunun ilk bağlantısı
       alınıyor. Ayrı düzey, yöneticiden aynı bağlantıyı iki kez
       girmesini istemek olurdu. */
    const populer = sutunlar
      .flatMap((s) => s.baglantilar.slice(0, 2))
      .slice(0, 5);

    mega.push({
      ad: u.ad,
      yol: u.yol ?? '/',
      sutunlar,
      populer,
      populerBaslik: u.seritBaslik ?? 'En çok tercih edilenler',
      tanitim: {
        baslik: u.tanitimBaslik ?? '',
        metin: u.tanitimMetin ?? '',
        dugme: u.tanitimDugme ?? '',
        yol: u.tanitimYol ?? '/arama',
      },
    });
  }

  return { duz, mega };
}

const onbellekli = unstable_cache(menuOku, ['menu-ogeleri'], { tags: [MENU_ETIKET] });

/**
 * Panelden yönetilen menü. Tablo boşsa `null` dönüyor ve çağıran
 * taraf koddaki varsayılana düşüyor.
 */
export async function menuYapisi(
  konum: 'BASLIK' | 'YARDIMCI' | 'ALTBILGI' = 'BASLIK', dil: 'TR' | 'EN' = 'TR',
): Promise<MenuYapisi | null> {
  try {
    const satirlar = await onbellekli(konum, dil);
    if (satirlar.length === 0) return null;
    const yapi = menuKur(satirlar);
    return yapi.duz.length || yapi.mega.length ? yapi : null;
  } catch (e) {
    console.error('Menü okunamadı, varsayılana düşülüyor:', e);
    return null;
  }
}

/** Panel listesi — pasif ögeler de görünüyor. */
export async function menuListesi(konum: 'BASLIK' | 'YARDIMCI' | 'ALTBILGI' = 'BASLIK') {
  return prisma.menuOgesi.findMany({
    where: { konum, dil: 'TR' },
    orderBy: [{ sira: 'asc' }, { ad: 'asc' }],
    select: { ...SECIM, konum: true },
  });
}

export interface MenuGirdisi {
  ad: string;
  yol?: string | null;
  ustId?: string | null;
  mega?: boolean;
}

export function menuDenetle(g: MenuGirdisi): string | null {
  if (g.ad.trim().length < 2) return 'Menü adı en az 2 karakter olmalı.';
  if (g.ad.trim().length > 60) return 'Menü adı en fazla 60 karakter olabilir.';
  const yol = g.yol?.trim();
  if (yol && !/^(\/|https?:\/\/)/.test(yol)) {
    return 'Adres "/" ile başlamalı ya da tam bir https adresi olmalı.';
  }
  /* Üst düzey bir öge ya mega paneldir ya da bir yere gider; ikisi de
     değilse menüde tıklanamayan ölü bir başlık olur. */
  if (!g.ustId && !g.mega && !yol) {
    return 'Üst düzey bağlantı için adres gerekli (ya da mega panel olarak işaretleyin).';
  }
  return null;
}
