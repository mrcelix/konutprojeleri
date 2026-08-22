import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { prisma } from './db';
import type { ProjeDurumu, ProjeTipi } from './types';

/* ============================================================
   Karşılaştırma panosu — okuma katmanı ve anonim kimlik.

   Panoyu açan herkes giriş yapmadan oy verebiliyor ve not
   bırakabiliyor: davet edilen kişiyi kayıt ekranıyla karşılamak
   panonun tek amacını (kolay paylaşım) baltalardı. Kim kime oy
   verdiğini ayırmak için çerezde bir ANONİM KİMLİK tutuluyor —
   kişisel veri değil, yalnızca "aynı tarayıcı" demek.

   Konut alımında karar tek kişilik değil: eş, aile, ortak bakıyor ve
   tartışma WhatsApp'ta dağılıyor. Pano o tartışmayı tek bağlantıda
   toplar.
   ============================================================ */

export const KIMLIK_CEREZ = 'kp_pano_kim';
/** Paylaşım kodu: karışması olası harfler (I, l, 0, O) yok. */
const ALFABE = 'abcdefghjkmnpqrstuvwxyz23456789';

export function panoKodu(uzunluk = 7): string {
  const ham = randomBytes(uzunluk);
  return Array.from(ham, (b) => ALFABE[b % ALFABE.length]).join('');
}

/** Çerezdeki anonim kimlik; yoksa `null` (yazma anında üretiliyor). */
export async function kimlikOku(): Promise<string | null> {
  const c = await cookies();
  return c.get(KIMLIK_CEREZ)?.value ?? null;
}

export interface PanoOgeGorunum {
  id: string;
  projeSlug: string;
  ad: string;
  tip: ProjeTipi;
  durum: ProjeDurumu;
  bolge: string;
  mahalle: string;
  firmaAd: string;
  foto: string | null;
  fiyatMin: number;
  fiyatMax: number | null;
  /** Projedeki daire tipleri — "1+1", "2+1"… */
  odalar: string[];
  teslim: string | null;
  ilerleme: number;
  pesinat: number;
  vade: number;
  ekleyen: string | null;
  /** Panonun bütçesi verilmişse, projenin başlangıç fiyatı içinde mi */
  butceyeUygun: boolean | null;
  /** Proje artık alınamıyorsa (tükendi / teslim edildi) */
  alinamaz: boolean;
  begeni: number;
  begenmeme: number;
  /** Bu tarayıcının oyu: 1, -1 ya da 0 */
  benimOyum: number;
  notlar: { id: string; ad: string; metin: string; olusturma: Date }[];
}

export interface PanoGorunum {
  kod: string;
  ad: string;
  butceMin: number | null;
  butceMax: number | null;
  sahipMi: boolean;
  ogeler: PanoOgeGorunum[];
  /** Panonun geneline yazılan notlar */
  notlar: { id: string; ad: string; metin: string; olusturma: Date }[];
}

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export async function panoGetir(kod: string): Promise<PanoGorunum | null> {
  const kimlik = await kimlikOku();

  const p = await prisma.pano.findUnique({
    where: { kod },
    select: {
      kod: true, ad: true, butceMin: true, butceMax: true, sahipKimlik: true,
      ogeler: {
        orderBy: [{ sira: 'asc' }, { olusturma: 'asc' }],
        select: {
          id: true, ekleyen: true,
          proje: {
            select: {
              slug: true, ad: true, tip: true, durum: true, mahalle: true,
              fiyatMin: true, fiyatMax: true, teslimTarihi: true,
              ilerlemeYuzde: true, pesinatOrani: true, taksitAyi: true,
              bolge: { select: { ad: true } },
              firma: { select: { ad: true } },
              medya: { orderBy: { sira: 'asc' }, take: 1, select: { url: true } },
              daireTipleri: {
                where: { yayinda: true },
                orderBy: { sira: 'asc' },
                select: { odaSayisi: true },
              },
            },
          },
          oylar: { select: { yon: true, kimlik: true } },
          yorumlar: { orderBy: { olusturma: 'asc' }, select: { id: true, ad: true, metin: true, olusturma: true } },
        },
      },
      yorumlar: {
        where: { ogeId: null },
        orderBy: { olusturma: 'asc' },
        select: { id: true, ad: true, metin: true, olusturma: true },
      },
    },
  });
  if (!p) return null;

  const { butceMin, butceMax } = p;
  const butceVar = butceMin !== null || butceMax !== null;

  const ogeler: PanoOgeGorunum[] = p.ogeler.map((o) => {
    const v = o.proje;

    /* BÜTÇEYE UYGUNLUK projenin BAŞLANGIÇ fiyatına bakıyor: panodaki
       bütçe 5 milyonsa, 1+1'i 4 milyon olan bir proje uygun — üst ucu
       12 milyon diye elemek, o projede bütçeye uyan daire olduğu
       gerçeğini gizlerdi. (Arama filtresiyle aynı kural.) */
    const butceyeUygun = butceVar
      ? (butceMin === null || v.fiyatMin >= butceMin)
        && (butceMax === null || v.fiyatMin <= butceMax)
      : null;

    /* ALINAMAZ: pano günlerce hatta haftalarca açık duruyor ve
       üzerinde konuşulan projenin çoktan tükendiğini son adımda
       öğrenmek, grup kararında en sinir bozucu şey. */
    const alinamaz = v.durum === 'TUKENDI' || v.durum === 'TESLIM_EDILDI';

    const begeni = o.oylar.filter((x) => x.yon > 0).length;
    const begenmeme = o.oylar.filter((x) => x.yon < 0).length;
    const benimOyum = kimlik
      ? (o.oylar.find((x) => x.kimlik === kimlik)?.yon ?? 0)
      : 0;

    return {
      id: o.id,
      projeSlug: v.slug,
      ad: v.ad,
      tip: v.tip,
      durum: v.durum,
      bolge: v.bolge.ad,
      mahalle: v.mahalle,
      firmaAd: v.firma.ad,
      foto: v.medya[0]?.url ?? null,
      fiyatMin: v.fiyatMin,
      fiyatMax: v.fiyatMax,
      odalar: [...new Set(v.daireTipleri.map((d) => d.odaSayisi))],
      teslim: iso(v.teslimTarihi),
      ilerleme: v.ilerlemeYuzde,
      pesinat: v.pesinatOrani,
      vade: v.taksitAyi,
      ekleyen: o.ekleyen,
      butceyeUygun,
      alinamaz,
      begeni,
      begenmeme,
      benimOyum,
      notlar: o.yorumlar,
    };
  });

  return {
    kod: p.kod,
    ad: p.ad,
    butceMin,
    butceMax,
    sahipMi: !!kimlik && kimlik === p.sahipKimlik,
    /* Sıralama OYA GÖRE: panonun işi "grup neyi seviyor" sorusunu
       cevaplamak. Eşitlikte eklenme sırası korunuyor. */
    ogeler: ogeler.sort((a, b) => (b.begeni - b.begenmeme) - (a.begeni - a.begenmeme)),
    notlar: p.yorumlar,
  };
}

/** Bu tarayıcının kurduğu panolar — "panolarım" listesi için. */
export async function panolarim() {
  const kimlik = await kimlikOku();
  if (!kimlik) return [];
  return prisma.pano.findMany({
    where: { sahipKimlik: kimlik },
    orderBy: { guncelleme: 'desc' },
    take: 20,
    select: {
      kod: true, ad: true, butceMin: true, butceMax: true, guncelleme: true,
      _count: { select: { ogeler: true } },
    },
  });
}
