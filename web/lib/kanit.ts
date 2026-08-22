import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';
import { KONTROL_MADDELERI } from './kontrol-kayit';

/* ============================================================
   Ana sayfadaki kanıt şeridi.

   Üst çubuktaki güven şeridi ve hero'nun altındaki cam şerit birer
   VAAT söylüyor: "her proje yerinde incelendi", "fiyat açık".
   Vaat, tekrarlandıkça değil KANITLANDIKÇA güven kazanıyor — bu
   şerit aynı üç sözü tarihli sayılarla söylüyor:

     "12 projenin 12'si yerinde denetlendi · son kontrol Ağustos 2026"

   Sayılar canlı ziyaretçi rozetlerindeki kuralla aynı: uydurulmuyor,
   yuvarlanmıyor. kontrol raporu olmayan proje varsa oran olduğu gibi
   yazılıyor — "12'nin 9'u" cümlesi "12'nin 12'si"nden daha az
   etkileyici ama doğru, ve tersi fark edildiğinde bütün sayfayı
   şüpheli hâle getiriyor.
   ============================================================ */

export interface KanitOzeti {
  /** Yayındaki proje sayısı */
  proje: number;
  /** Bunlardan kaçının yayınlanmış kontrol raporu var */
  kontrollu: number;
  /* Tarihler ISO METİN, `Date` değil: `unstable_cache` dönen değeri
     serileştirip saklıyor ve önbellekten gelen bir `Date` düz bir
     dizeye dönüşüyor — `toLocaleDateString` ilk isabette çalışıp
     ikincisinde patlıyordu. Tip, gerçekte gelen şeyi söylesin. */
  /** En son yapılan yerinde kontrolün tarihi (ISO) */
  sonKontrol: string | null;
  /** En son güncellenen proje kaydı — fotoğraf tazeliğinin ölçüsü (ISO) */
  sonCekim: string | null;
  /** Kontrol listesindeki madde sayısı (koddan) */
  madde: number;
}

/**
 * Ham sorgu, önbelleksiz — testler ve betikler için.
 * (`lib/menu-kayit.ts` içindeki `menuOku` ile aynı kalıp:
 * `unstable_cache` istek bağlamı dışında çalışmıyor.)
 */
export async function kanitOku(): Promise<KanitOzeti> {
  const [proje, kontrollu, sonRapor, sonProje] = await Promise.all([
    prisma.proje.count({ where: { yayinda: true } }),
    prisma.kontrolRaporu.count({ where: { yayinda: true, proje: { yayinda: true } } }),
    prisma.kontrolRaporu.findFirst({
      where: { yayinda: true, proje: { yayinda: true } },
      orderBy: { ziyaret: 'desc' },
      select: { ziyaret: true },
    }),
    prisma.proje.findFirst({
      where: { yayinda: true },
      orderBy: { guncelleme: 'desc' },
      select: { guncelleme: true },
    }),
  ]);

  return {
    proje,
    kontrollu,
    sonKontrol: sonRapor?.ziyaret.toISOString() ?? null,
    sonCekim: sonProje?.guncelleme.toISOString() ?? null,
    madde: KONTROL_MADDELERI.length,
  };
}

/* Şerit her ana sayfa isteğinde dört sorgu demek. Sayılar günde bir
   kez bile değişmiyor; on beş dakikalık önbellek fazlasıyla taze. */
export const kanitOzeti = unstable_cache(kanitOku, ['kanit-ozeti'], { revalidate: 900 });
