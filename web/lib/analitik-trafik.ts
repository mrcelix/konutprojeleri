import 'server-only';
import { prisma } from './db';
import { Prisma } from './generated/prisma';

/* ============================================================
   Trafik raporları.

   `lib/analitik.ts` İŞ analitiği (talep, dönüşüm, huni);
   burası ZİYARET analitiği. İkisi bilerek ayrı: biri talep
   tablosundan, diğeri ziyaret tablosundan besleniyor ve tek dosyada
   toplamak "hangi sayı neyi sayıyor" sorusunu bulanıklaştırıyordu.

   Bot trafiği HER SORGUDA ayrı tutuluyor. Arama motoru robotları
   insan ziyaretçilerle toplandığında "bugün 400 ziyaretçi" gibi
   gerçek olmayan bir sayı çıkıyor; Googlebot bir müşteri değil ama
   taranma sıklığı SEO için başlı başına bir gösterge, o yüzden de
   silinmiyor.
   ============================================================ */

export interface TrafikOzeti {
  ziyaret: number;
  tekil: number;
  oturum: number;
  botZiyaret: number;
  /** Tek sayfalık oturumların oranı (%) */
  hemenCikma: number;
  /** Oturum başına sayfa */
  sayfaOturum: number;
  olay: number;
}

const araligi = (gun: number) => new Date(Date.now() - gun * 864e5);

export async function trafikOzeti(gun = 30): Promise<TrafikOzeti> {
  const bas = araligi(gun);

  const [satir] = await prisma.$queryRaw<{
    ziyaret: bigint; tekil: bigint; oturum: bigint; bot: bigint; teksayfa: bigint;
  }[]>(Prisma.sql`
    WITH o AS (
      SELECT oturum, count(*) AS sayfa
      FROM ziyaret WHERE olusturma >= ${bas} AND bot = false
      GROUP BY oturum
    )
    SELECT
      (SELECT count(*) FROM ziyaret WHERE olusturma >= ${bas} AND bot = false) AS ziyaret,
      (SELECT count(DISTINCT ziyaretci) FROM ziyaret WHERE olusturma >= ${bas} AND bot = false) AS tekil,
      (SELECT count(*) FROM o) AS oturum,
      (SELECT count(*) FROM ziyaret WHERE olusturma >= ${bas} AND bot = true) AS bot,
      (SELECT count(*) FROM o WHERE sayfa = 1) AS teksayfa
  `);

  const olay = await prisma.olay.count({ where: { olusturma: { gte: bas } } });
  const oturum = Number(satir?.oturum ?? 0);
  const ziyaret = Number(satir?.ziyaret ?? 0);

  return {
    ziyaret,
    tekil: Number(satir?.tekil ?? 0),
    oturum,
    botZiyaret: Number(satir?.bot ?? 0),
    hemenCikma: oturum ? Math.round((Number(satir.teksayfa) / oturum) * 100) : 0,
    sayfaOturum: oturum ? Math.round((ziyaret / oturum) * 10) / 10 : 0,
    olay,
  };
}

export interface GunSatiri { gun: string; ziyaret: number; tekil: number; bot: number }

/** Günlük seri — grafik için. Ziyaretsiz günler de dolduruluyor. */
export async function gunlukTrafik(gun = 30): Promise<GunSatiri[]> {
  const bas = araligi(gun);
  const satirlar = await prisma.$queryRaw<{ gun: Date; ziyaret: bigint; tekil: bigint; bot: bigint }[]>(Prisma.sql`
    SELECT date_trunc('day', olusturma) AS gun,
      count(*) FILTER (WHERE bot = false) AS ziyaret,
      count(DISTINCT ziyaretci) FILTER (WHERE bot = false) AS tekil,
      count(*) FILTER (WHERE bot = true) AS bot
    FROM ziyaret
    WHERE olusturma >= ${bas}
    GROUP BY 1 ORDER BY 1
  `);

  /* Boş günler DOLDURULUYOR: eksik günü atlamak grafikte iki noktayı
     yan yana getiriyor ve düşüşü görünmez kılıyordu. */
  const harita = new Map(satirlar.map((s) => [s.gun.toISOString().slice(0, 10), s]));
  const out: GunSatiri[] = [];
  for (let i = gun - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const s = harita.get(d);
    out.push({
      gun: d,
      ziyaret: s ? Number(s.ziyaret) : 0,
      tekil: s ? Number(s.tekil) : 0,
      bot: s ? Number(s.bot) : 0,
    });
  }
  return out;
}

export interface Dilim { ad: string; sayi: number; oran: number }

async function dilimle(alan: 'kanal' | 'cihaz' | 'tip' | 'ulke' | 'kaynak',
  gun: number, bot: boolean): Promise<Dilim[]> {
  const bas = araligi(gun);
  const sutun = Prisma.raw(`"${alan}"`);
  const satirlar = await prisma.$queryRaw<{ ad: string | null; sayi: bigint }[]>(Prisma.sql`
    SELECT ${sutun} AS ad, count(*) AS sayi
    FROM ziyaret
    WHERE olusturma >= ${bas} AND bot = ${bot}
    GROUP BY 1 ORDER BY 2 DESC LIMIT 12
  `);
  const toplam = satirlar.reduce((t, s) => t + Number(s.sayi), 0) || 1;
  return satirlar.map((s) => ({
    ad: s.ad ?? '—',
    sayi: Number(s.sayi),
    oran: Math.round((Number(s.sayi) / toplam) * 100),
  }));
}

export const kanalDagilimi = (gun = 30) => dilimle('kanal', gun, false);
export const cihazDagilimi = (gun = 30) => dilimle('cihaz', gun, false);
export const sayfaTipiDagilimi = (gun = 30) => dilimle('tip', gun, false);
export const ulkeDagilimi = (gun = 30) => dilimle('ulke', gun, false);
export const kaynakDagilimi = (gun = 30) => dilimle('kaynak', gun, false);

export interface YolSatiri { yol: string; ziyaret: number; tekil: number }

export async function enCokGezilen(gun = 30, adet = 15): Promise<YolSatiri[]> {
  const bas = araligi(gun);
  const satirlar = await prisma.$queryRaw<{ yol: string; ziyaret: bigint; tekil: bigint }[]>(Prisma.sql`
    SELECT yol, count(*) AS ziyaret, count(DISTINCT ziyaretci) AS tekil
    FROM ziyaret WHERE olusturma >= ${bas} AND bot = false
    GROUP BY yol ORDER BY 2 DESC LIMIT ${adet}
  `);
  return satirlar.map((s) => ({ yol: s.yol, ziyaret: Number(s.ziyaret), tekil: Number(s.tekil) }));
}

export interface MotorSatiri { motor: string; ziyaret: number }

/** Organik trafiğin motor dağılımı — insan ziyaretleri. */
export async function motorDagilimi(gun = 30): Promise<MotorSatiri[]> {
  const bas = araligi(gun);
  const satirlar = await prisma.$queryRaw<{ motor: string; ziyaret: bigint }[]>(Prisma.sql`
    SELECT motor, count(*) AS ziyaret
    FROM ziyaret
    WHERE olusturma >= ${bas} AND bot = false AND motor IS NOT NULL
    GROUP BY motor ORDER BY 2 DESC
  `);
  return satirlar.map((s) => ({ motor: s.motor, ziyaret: Number(s.ziyaret) }));
}

export interface BotSatiri { botAdi: string; ziyaret: number; sonGoruldu: Date | null }

/**
 * Arama motoru robotlarının taranma sıklığı.
 *
 * SEO'da doğrudan gösterge: Googlebot'un uğramadığı sayfa dizine
 * girmiyor. Tarih de tutuluyor — "bir haftadır gelmedi" bilgisi,
 * toplam sayıdan daha çok şey söylüyor.
 */
export async function botTrafigi(gun = 30): Promise<BotSatiri[]> {
  const bas = araligi(gun);
  const satirlar = await prisma.$queryRaw<{ botadi: string; ziyaret: bigint; son: Date }[]>(Prisma.sql`
    SELECT "botAdi" AS botadi, count(*) AS ziyaret, max(olusturma) AS son
    FROM ziyaret
    WHERE olusturma >= ${bas} AND bot = true
    GROUP BY 1 ORDER BY 2 DESC
  `);
  return satirlar.map((s) => ({
    botAdi: s.botadi ?? 'diğer',
    ziyaret: Number(s.ziyaret),
    sonGoruldu: s.son ?? null,
  }));
}

export interface OlaySatiri { tur: string; sayi: number; tekil: number }

export async function olayDagilimi(gun = 30): Promise<OlaySatiri[]> {
  const bas = araligi(gun);
  const satirlar = await prisma.$queryRaw<{ tur: string; sayi: bigint; tekil: bigint }[]>(Prisma.sql`
    SELECT tur, count(*) AS sayi, count(DISTINCT ziyaretci) AS tekil
    FROM olay WHERE olusturma >= ${bas}
    GROUP BY tur ORDER BY 2 DESC
  `);
  return satirlar.map((s) => ({ tur: s.tur, sayi: Number(s.sayi), tekil: Number(s.tekil) }));
}

export interface HedefSatiri { hedef: string; sayi: number }

/** En çok tıklanan villa/filtre — olay türüne göre. */
export async function enCokTiklanan(tur: string, gun = 30, adet = 12): Promise<HedefSatiri[]> {
  const bas = araligi(gun);
  const satirlar = await prisma.$queryRaw<{ hedef: string; sayi: bigint }[]>(Prisma.sql`
    SELECT hedef, count(*) AS sayi
    FROM olay
    WHERE olusturma >= ${bas} AND tur = ${tur} AND hedef IS NOT NULL
    GROUP BY hedef ORDER BY 2 DESC LIMIT ${adet}
  `);
  return satirlar.map((s) => ({ hedef: s.hedef, sayi: Number(s.sayi) }));
}

export interface SaatSatiri { saat: number; sayi: number }

/** Günün saatlerine dağılım — kampanya ve destek saatleri için. */
export async function saatDagilimi(gun = 30): Promise<SaatSatiri[]> {
  const bas = araligi(gun);
  const satirlar = await prisma.$queryRaw<{ saat: number; sayi: bigint }[]>(Prisma.sql`
    SELECT extract(hour FROM olusturma)::int AS saat, count(*) AS sayi
    FROM ziyaret WHERE olusturma >= ${bas} AND bot = false
    GROUP BY 1 ORDER BY 1
  `);
  const harita = new Map(satirlar.map((s) => [Number(s.saat), Number(s.sayi)]));
  return Array.from({ length: 24 }, (_, i) => ({ saat: i, sayi: harita.get(i) ?? 0 }));
}
