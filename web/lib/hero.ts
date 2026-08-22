import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';

/* ============================================================
   Hero görselleri.

   Görsel koda yazılıydı: `app/page.tsx` içinde tek bir Unsplash
   adresi. Sezon değiştiğinde ya da kampanya görseli koymak
   gerektiğinde dağıtım şarttı.

   Birden fazla görsel varsa hero yavaş geçişli bir gösteriye
   dönüşüyor; tek görsel varsa geçiş yok. Tablo boşsa koddaki
   varsayılana düşülüyor — hero'suz bir ana sayfa, sitenin ilk
   ekranının boş olması demek.
   ============================================================ */

export const HERO_ETIKET = 'hero';

/**
 * Hero görseli sitenin en büyük görseli ve tek fotoğrafta bile ilk
 * ekranın tamamını kaplıyor; kart görsellerinin sıkıştırmasıyla
 * basılamaz. `w=2400&q=80` — kart havuzu `w=1200&q=72` kullanıyor,
 * hero'da o ayar geniş ekranda gözle görülür şekilde bulanıktı.
 */
const HERO_IMG = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2400&q=80`;

/** Tablo boşken kullanılan varsayılan. Metadata da bunu kullanıyor. */
export const VARSAYILAN_HERO = HERO_IMG('1486406146926-c627a92ad1ab');

export interface HeroKare {
  id: string;
  url: string;
  alt: string;
  etiket: string | null;
}

/**
 * Tablo boşken gösterilen kareler.
 *
 * Tek kare yerine ÜÇ kare: `HeroGosteri` tek kareyle zamanlayıcı bile
 * kurmuyor, yani hiç kurulmamış bir sitede hero durgun bir fotoğraf
 * oluyordu. Üçü sitenin üç vitrinini gösteriyor — konut, villa, ofis —
 * panelden kendi görselleri girilene kadar.
 *
 * ETİKET PROJE ADI DEĞİL, KATEGORİ. Varsayılan kareler stok görsel ve
 * gerçek bir projeyi göstermiyor; üzerine proje adı yazmak, olmayan
 * bir projeyi varmış gibi sunmak olurdu.
 */
const VARSAYILAN_KARELER: HeroKare[] = [
  {
    id: 'varsayilan-konut', url: HERO_IMG('1545324418-cc1a3fa10c00'),
    alt: 'Akşam ışığında, cam cepheli çok katlı konut bloklarının dış görünümü',
    etiket: 'Konut projeleri',
  },
  {
    id: 'varsayilan-villa', url: HERO_IMG('1613977257363-707ba9348227'),
    alt: 'Bahçeli, iki katlı müstakil villalardan oluşan site içi yol',
    etiket: 'Villa projeleri',
  },
  {
    id: 'varsayilan', url: VARSAYILAN_HERO,
    alt: 'Şehir merkezinde cam cepheli ofis kulesi',
    etiket: 'Ofis projeleri',
  },
];

/** Ham sorgu, önbelleksiz — testler ve betikler için. */
export async function heroOku(): Promise<HeroKare[]> {
  return prisma.heroGorsel.findMany({
    where: { aktif: true },
    orderBy: [{ sira: 'asc' }, { olusturma: 'asc' }],
    take: 8,
    select: { id: true, url: true, alt: true, etiket: true },
  });
}

const onbellekli = unstable_cache(heroOku, ['hero-gorselleri'], { tags: [HERO_ETIKET] });

export async function heroKareleri(): Promise<HeroKare[]> {
  try {
    const kareler = await onbellekli();
    if (kareler.length > 0) return kareler;
  } catch (e) {
    console.error('Hero görselleri okunamadı, varsayılana düşülüyor:', e);
  }
  return VARSAYILAN_KARELER;
}

/** Panel listesi — pasif kareler de görünüyor. */
export async function heroListesi() {
  return prisma.heroGorsel.findMany({
    orderBy: [{ sira: 'asc' }, { olusturma: 'asc' }],
    take: 50,
  });
}

export interface HeroGirdisi {
  url: string;
  alt: string;
}

export function heroDenetle(g: HeroGirdisi): string | null {
  const url = g.url.trim();
  if (!/^https?:\/\/\S+$/.test(url)) return 'Görsel adresi tam bir https adresi olmalı.';
  /* Alt metin ZORUNLU: hero sayfanın en büyük görseli ve alt metni
     olmadan ekran okuyucu kullanan biri sayfanın ne anlattığını hiç
     öğrenemiyor. Denetim de bunu yakalıyor (npm run erisim). */
  if (g.alt.trim().length < 10) return 'Alt metin en az 10 karakter olmalı (erişilebilirlik için zorunlu).';
  if (g.alt.trim().length > 200) return 'Alt metin en fazla 200 karakter olabilir.';
  return null;
}
