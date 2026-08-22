import 'server-only';
import { cache } from 'react';
import { prisma } from './db';
import { AYLAR } from './bicim';

/* ============================================================
   Analitik motoru.

   Aynı fonksiyonlar hem yönetim panelinde (tüm envanter) hem firma
   panelinde (yalnızca kendi projeleri) kullanılır; kapsam
   `projeIdler` parametresiyle daraltılır. null = tüm envanter.

   ── Neden ciro yok ──────────────────────────────────────────

   Bu sitede para hareketi yok: satış firmanın kendi ofisinde
   kapanıyor ve tutarı bize hiç ulaşmıyor. GMV, ADR, doluluk gibi
   göstergeler burada UYDURMA olurdu — hesaplanabilecek bir tutar yok.

   Ölçülen tek şey HUNİ: kaç kişi baktı, kaç kişi form doldurdu, kaç
   talep arandı, kaçı satışa dönüştü. Dönüşümün son adımını firma
   panele işlediği ölçüde biliyoruz; işlemezse "satış" sayısı düşük
   görünür ve bu, uydurma bir ciro rakamından dürüst.
   ============================================================ */

const GUN = 864e5;
const SAAT = 3600_000;

function kapsam(projeIdler: string[] | null) {
  return projeIdler ? { projeId: { in: projeIdler } } : {};
}

export interface Kpi {
  /** Dönemde açılan talep sayısı */
  talep: number;
  /** Satışa dönüşen */
  satis: number;
  /** Yüzde — satış / talep */
  donusumOrani: number;
  /** Ulaşılamayan talep oranı, yüzde */
  ulasilamamaOrani: number;
  /** Randevuya dönüşen talep sayısı */
  randevu: number;
  /** İlk temasa kadar geçen ortalama süre (saat); ölçülemezse null */
  ortYanitSaati: number | null;
  /** Dönemdeki sayfa görüntüleme (bot hariç) */
  ziyaret: number;
  /** Tekil ziyaretçi (günlük dönen tuzla, geri çevrilemez) */
  ziyaretci: number;
  /** Yüzde — talep / tekil ziyaretçi */
  formDonusumu: number;
  /** Bütçesini belirten taleplerin ortalama üst sınırı */
  ortButce: number | null;
}

/**
 * Belirli bir tarih aralığındaki temel göstergeler.
 *
 * ZİYARET SAYILARI KAPSAMA UYMUYOR. `Ziyaret` tablosu yola göre
 * kaydediliyor ve hangi projenin sayfası olduğu ayrıştırılmıyor; firma
 * paneline site geneli trafiği göstermek yanıltıcı olurdu. Kapsam
 * daraltılmışsa ziyaret alanları sıfır dönüyor ve panel o kartları
 * hiç basmıyor.
 */
export const kpiHesapla = cache(async (
  baslangic: Date,
  bitis: Date,
  projeIdler: string[] | null = null,
): Promise<Kpi> => {
  const k = kapsam(projeIdler);
  const aralik = { gte: baslangic, lt: bitis };

  const [talepler, ziyaret, ziyaretciSatir] = await Promise.all([
    prisma.talep.findMany({
      where: { ...k, olusturma: aralik },
      select: {
        durum: true, niyet: true, butceMax: true,
        olusturma: true, guncelleme: true,
      },
    }),
    projeIdler
      ? Promise.resolve(0)
      : prisma.ziyaret.count({ where: { bot: false, olusturma: aralik } }),
    projeIdler
      ? Promise.resolve<{ n: bigint }[]>([])
      : prisma.$queryRaw<{ n: bigint }[]>`
          SELECT count(DISTINCT ziyaretci) AS n FROM ziyaret
          WHERE bot = false AND olusturma >= ${baslangic} AND olusturma < ${bitis}`,
  ]);

  const talep = talepler.length;
  const satis = talepler.filter((t) => t.durum === 'SATIS').length;
  const ulasilamayan = talepler.filter((t) => t.durum === 'ULASILAMADI').length;
  const randevu = talepler.filter((t) => t.niyet === 'RANDEVU' || t.durum === 'RANDEVU').length;

  /* YANIT SÜRESİ YAKLAŞIK. Talebin ne zaman arandığına dair ayrı bir
     damga yok; `guncelleme` ilk durum değişikliğinde yazılıyor ve
     sonraki her düzenlemede yeniden yazılıyor. Yani hâlâ YENİ olan
     talepler hesaba KATILMIYOR (onlarda güncelleme = oluşturma) ve
     birden çok kez düzenlenen talepler süreyi yukarı çekiyor.
     Ayrı bir `ilkTemas` sütunu bunu kesinleştirir; şimdilik gösterge
     "yaklaşık" etiketiyle basılıyor. */
  const temasEdilen = talepler.filter(
    (t) => t.durum !== 'YENI' && t.guncelleme.getTime() > t.olusturma.getTime(),
  );
  const ortYanitSaati = temasEdilen.length
    ? Math.round(
      (temasEdilen.reduce((s, t) => s + (t.guncelleme.getTime() - t.olusturma.getTime()), 0)
        / temasEdilen.length / SAAT) * 10,
    ) / 10
    : null;

  const butceli = talepler.map((t) => t.butceMax).filter((x): x is number => !!x);
  const ortButce = butceli.length
    ? Math.round(butceli.reduce((s, x) => s + x, 0) / butceli.length)
    : null;

  const ziyaretci = Number(ziyaretciSatir[0]?.n ?? 0);

  const yuzde = (pay: number, payda: number) =>
    (payda ? Math.round((pay / payda) * 1000) / 10 : 0);

  return {
    talep,
    satis,
    donusumOrani: yuzde(satis, talep),
    ulasilamamaOrani: yuzde(ulasilamayan, talep),
    randevu,
    ortYanitSaati,
    ziyaret,
    ziyaretci,
    formDonusumu: yuzde(talep, ziyaretci),
    ortButce,
  };
});

export interface AySerisi {
  ay: string;
  talep: number;
  satis: number;
  randevu: number;
}

/** Son N ayın aylık serisi — grafik için. */
export const aylikSeri = cache(async (
  ayAdedi = 12,
  projeIdler: string[] | null = null,
): Promise<AySerisi[]> => {
  const simdi = new Date();
  const basla = new Date(Date.UTC(simdi.getUTCFullYear(), simdi.getUTCMonth() - (ayAdedi - 1), 1));

  const talepler = await prisma.talep.findMany({
    where: { ...kapsam(projeIdler), olusturma: { gte: basla } },
    select: { durum: true, niyet: true, olusturma: true },
  });

  /* Ay kovaları ÖNCE kuruluyor: talebi olmayan ay grafikte boşluk
     değil sıfır olarak görünmeli, aksi halde çizgi o ayı atlayıp
     iki nokta arasında düz gidiyordu. */
  const kovalar = new Map<string, AySerisi>();
  for (let i = 0; i < ayAdedi; i += 1) {
    const d = new Date(Date.UTC(basla.getUTCFullYear(), basla.getUTCMonth() + i, 1));
    const anahtar = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    kovalar.set(anahtar, {
      ay: `${AYLAR[d.getUTCMonth()].slice(0, 3)} ${String(d.getUTCFullYear()).slice(2)}`,
      talep: 0, satis: 0, randevu: 0,
    });
  }

  for (const t of talepler) {
    const anahtar = `${t.olusturma.getUTCFullYear()}-${t.olusturma.getUTCMonth()}`;
    const kova = kovalar.get(anahtar);
    if (!kova) continue;
    kova.talep += 1;
    if (t.durum === 'SATIS') kova.satis += 1;
    if (t.niyet === 'RANDEVU' || t.durum === 'RANDEVU') kova.randevu += 1;
  }

  return [...kovalar.values()];
});

export interface ProjePerformans {
  id: string;
  slug: string;
  ad: string;
  bolge: string;
  firma: string;
  durum: string;
  talep: number;
  satis: number;
  donusumOrani: number;
  fiyatMin: number;
  /** Yayına girdiğinden bu yana geçen gün — talep sayısını bağlamlıyor */
  yayindaGun: number;
}

/**
 * Proje bazlı talep performansı — en çok talep alanlar önde.
 *
 * `yayindaGun` ile birlikte okunmalı: iki ay önce yayına giren bir
 * projenin 40 talebi, iki yıldır yayında olan bir projenin 60
 * talebinden iyidir. Sıralama yine ham talep sayısına göre — "günlük
 * ortalama" sıralaması, bir hafta önce açılmış tek talepli projeyi
 * listenin başına taşıyordu.
 */
export const projePerformansi = cache(async (
  baslangic: Date,
  bitis: Date,
  projeIdler: string[] | null = null,
): Promise<ProjePerformans[]> => {
  const projeler = await prisma.proje.findMany({
    where: projeIdler ? { id: { in: projeIdler } } : {},
    select: {
      id: true, slug: true, ad: true, durum: true, fiyatMin: true, yayinTarihi: true,
      bolge: { select: { ad: true } },
      firma: { select: { ad: true } },
      talepler: {
        where: { olusturma: { gte: baslangic, lt: bitis } },
        select: { durum: true },
      },
    },
  });

  const simdi = Date.now();
  return projeler
    .map((p) => {
      const talep = p.talepler.length;
      const satis = p.talepler.filter((t) => t.durum === 'SATIS').length;
      return {
        id: p.id,
        slug: p.slug,
        ad: p.ad,
        bolge: p.bolge.ad,
        firma: p.firma.ad,
        durum: p.durum,
        talep,
        satis,
        donusumOrani: talep ? Math.round((satis / talep) * 1000) / 10 : 0,
        fiyatMin: p.fiyatMin,
        yayindaGun: Math.max(1, Math.round((simdi - p.yayinTarihi.getTime()) / GUN)),
      };
    })
    .sort((a, b) => b.talep - a.talep || b.satis - a.satis);
});

export interface BolgePerformans {
  slug: string;
  ad: string;
  il: string;
  projeSayisi: number;
  talep: number;
  satis: number;
  /** Proje başına düşen talep — bölgenin gerçek ilgisini bu gösteriyor */
  projeBasinaTalep: number;
  ortFiyat: number;
}

export const bolgePerformansi = cache(async (
  baslangic: Date,
  bitis: Date,
): Promise<BolgePerformans[]> => {
  const bolgeler = await prisma.bolge.findMany({
    select: {
      slug: true, ad: true, il: true,
      projeler: {
        select: {
          fiyatMin: true,
          talepler: {
            where: { olusturma: { gte: baslangic, lt: bitis } },
            select: { durum: true },
          },
        },
      },
    },
  });

  return bolgeler
    .map((b) => {
      const talepler = b.projeler.flatMap((p) => p.talepler);
      const projeSayisi = b.projeler.length;
      return {
        slug: b.slug,
        ad: b.ad,
        il: b.il,
        projeSayisi,
        talep: talepler.length,
        satis: talepler.filter((t) => t.durum === 'SATIS').length,
        projeBasinaTalep: projeSayisi
          ? Math.round((talepler.length / projeSayisi) * 10) / 10
          : 0,
        ortFiyat: projeSayisi
          ? Math.round(b.projeler.reduce((t, p) => t + p.fiyatMin, 0) / projeSayisi)
          : 0,
      };
    })
    .sort((a, b) => b.talep - a.talep);
});

export interface HuniAdimi {
  ad: string;
  sayi: number;
  /** Bir önceki adımdan geçiş oranı, yüzde */
  gecis: number;
}

/**
 * Satış hunisi — talebin durumlar arasındaki akışı.
 *
 * Durumlar bir sıra oluşturmuyor (bir talep RANDEVU'ya uğramadan
 * SATIS olabiliyor), o yüzden adımlar KÜMÜLATİF sayılıyor: "en az
 * buraya kadar gelenler". Aksi halde randevusuz kapanan satışlar
 * huninin ortasında kayboluyordu.
 */
export const huni = cache(async (
  baslangic: Date,
  bitis: Date,
  projeIdler: string[] | null = null,
): Promise<HuniAdimi[]> => {
  const talepler = await prisma.talep.findMany({
    where: { ...kapsam(projeIdler), olusturma: { gte: baslangic, lt: bitis } },
    select: { durum: true },
  });

  const toplam = talepler.length;
  const say = (durumlar: string[]) => talepler.filter((t) => durumlar.includes(t.durum)).length;

  const temas = say(['ARANDI', 'RANDEVU', 'SATIS', 'ILGILENMIYOR']);
  const randevu = say(['RANDEVU', 'SATIS']);
  const satis = say(['SATIS']);

  const adimlar = [
    { ad: 'Talep', sayi: toplam },
    { ad: 'Temas kuruldu', sayi: temas },
    { ad: 'Randevu', sayi: randevu },
    { ad: 'Satış', sayi: satis },
  ];

  return adimlar.map((a, i) => ({
    ...a,
    gecis: i === 0 || !adimlar[i - 1].sayi
      ? 100
      : Math.round((a.sayi / adimlar[i - 1].sayi) * 1000) / 10,
  }));
});

/** Panel üst şeridi için sayaçlar. */
export const bekleyenIsler = cache(async (projeIdler: string[] | null = null) => {
  const k = kapsam(projeIdler);
  const dortSaatOnce = new Date(Date.now() - 4 * SAAT);

  const [yeniTalep, gecikenTalep, bekleyenRandevu, okunmamisMesaj, yeniBasvuru] =
    await Promise.all([
      prisma.talep.count({ where: { ...k, durum: 'YENI' } }),
      /* Dört saati geçen YENİ talep ayrı sayılıyor: satış ekibinin
         bakması gereken tek gerçek uyarı bu (bkz. lib/isler.ts). */
      prisma.talep.count({ where: { ...k, durum: 'YENI', olusturma: { lt: dortSaatOnce } } }),
      prisma.talep.count({ where: { ...k, niyet: 'RANDEVU', durum: { in: ['YENI', 'ARANDI'] } } }),
      prisma.konusma.count({
        where: { okundu: false, ...(projeIdler ? { projeId: { in: projeIdler } } : {}) },
      }),
      /* Firma başvuruları proje kapsamına bağlı değil — henüz projesi
         olmayan firmadan geliyor. Firma panelinde bu sayaç 0 kalıyor,
         zaten oradaki menüde gösterilmiyor. */
      projeIdler
        ? Promise.resolve(0)
        : prisma.firmaBasvuru.count({ where: { durum: 'YENI' } }),
    ]);

  return { yeniTalep, gecikenTalep, bekleyenRandevu, okunmamisMesaj, yeniBasvuru };
});

/** Firmanın proje kimlikleri — kapsam daraltmak için. */
export const firmaProjeleri = cache(async (firmaId: string): Promise<string[]> => {
  const p = await prisma.proje.findMany({ where: { firmaId }, select: { id: true } });
  return p.map((x) => x.id);
});

/** Geçen döneme göre yüzde değişim — KPI kartlarındaki ok için. */
export function degisim(simdi: number, onceki: number): number | null {
  if (!onceki) return simdi ? 100 : null;
  return Math.round(((simdi - onceki) / onceki) * 1000) / 10;
}
