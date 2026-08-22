import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

/* ============================================================
   Kampanya şeridi.

   Rakiplerde (gotatil) sayfanın en üstünde "31 Ağustos'a kadar %5
   fırsat!" gibi bir bant duruyor ve tıklanma oranı yüksek. Bizde
   duyuru yapılacak tek yer ana sayfadaki bölümlerdi; sezonluk bir
   kampanyayı oraya yazmak, kampanya bitince metni geri almayı
   gerektiriyordu.

   Şerit TARİHE bağlı: bitiş geçince kendiliğinden düşüyor. Panelde
   "kampanya bitti" diye elle kapatmayı beklemek, unutulunca süresi
   geçmiş bir indirimi vaat etmek demekti.
   ============================================================ */

export const KAMPANYA_ETIKET = 'kampanya';

export interface AktifKampanya {
  id: string;
  metin: string;
  cagriAd: string | null;
  cagriYol: string | null;
  geriSayim: boolean;
  /** Geri sayım için ISO zaman damgası — istemci kendi saatiyle hesaplıyor */
  bitisIso: string;
}

async function aktifKampanyayiOku(): Promise<AktifKampanya | null> {
  const simdi = new Date();
  const k = await prisma.kampanya.findFirst({
    where: { aktif: true, baslangic: { lte: simdi }, bitis: { gt: simdi } },
    // Aynı anda birden fazla kampanya olabilir; en son BAŞLAYAN kazanıyor
    orderBy: { baslangic: 'desc' },
    select: { id: true, metin: true, cagriAd: true, cagriYol: true, geriSayim: true, bitis: true },
  });
  if (!k) return null;
  return {
    id: k.id, metin: k.metin, cagriAd: k.cagriAd, cagriYol: k.cagriYol,
    geriSayim: k.geriSayim, bitisIso: k.bitis.toISOString(),
  };
}

/**
 * Önbellek SÜRELİ (60 sn), yalnızca etiketli değil: kampanya panelden
 * kaydedilince etiket düşürülüyor ama BİTİŞ tarihi geçtiğinde kimse
 * kaydetmiyor. Süreli önbellek olmadan biten kampanya, bir sonraki
 * içerik kaydına kadar ekranda kalırdı.
 */
const onbellekli = unstable_cache(
  aktifKampanyayiOku, ['aktif-kampanya'], { tags: [KAMPANYA_ETIKET], revalidate: 60 },
);

export async function aktifKampanya(): Promise<AktifKampanya | null> {
  try {
    return await onbellekli();
  } catch (e) {
    // Şerit süs; veritabanı erişilemezse site şeritsiz açılmalı
    console.error('Kampanya okunamadı:', e);
    return null;
  }
}

/** Panel listesi — geçmiş kampanyalar da görünüyor. */
export async function kampanyaListesi() {
  return prisma.kampanya.findMany({
    orderBy: { baslangic: 'desc' },
    take: 100,
  });
}

export interface KampanyaGirdisi {
  metin: string;
  cagriAd?: string | null;
  cagriYol?: string | null;
  geriSayim?: boolean;
  baslangic: Date;
  bitis: Date;
  aktif?: boolean;
}

/** Formdan gelen kampanyayı doğrular. Sunucu eylemi ve testler aynı kuralı kullanıyor. */
export function kampanyaDenetle(g: KampanyaGirdisi): string | null {
  const metin = g.metin.trim();
  if (metin.length < 8) return 'Kampanya metni en az 8 karakter olmalı.';
  if (metin.length > 200) return 'Kampanya metni en fazla 200 karakter olabilir.';
  if (Number.isNaN(g.baslangic.getTime()) || Number.isNaN(g.bitis.getTime())) {
    return 'Başlangıç ve bitiş tarihi gerekli.';
  }
  if (g.bitis <= g.baslangic) return 'Bitiş tarihi başlangıçtan sonra olmalı.';
  /* Çağrı düğmesi ya tam ya hiç: yalnızca metin girilirse tıklanamayan
     bir düğme, yalnızca adres girilirse etiketsiz bir düğme çıkardı. */
  const ad = g.cagriAd?.trim();
  const yol = g.cagriYol?.trim();
  if ((ad && !yol) || (!ad && yol)) return 'Düğme için hem metin hem adres gerekli.';
  if (yol && !yol.startsWith('/')) return 'Düğme adresi site içi olmalı ve "/" ile başlamalı.';
  return null;
}
