import 'server-only';
import { prisma } from '../db';
import type { BildirimTipi, Kanal } from '../generated/prisma';
import { site } from '../site';
import { smsSaglayici, gercekSms } from '../sms/saglayicilar';
import type { SmsSablon } from '../sms/sablonlar';
import { adresNormalle, engelEkle, engelliMi, telefonGecerli } from './engel';
import { epostaSaglayici, gercekEposta } from './saglayicilar';
import type { Sablon } from './sablonlar';

export * from './sablonlar';
export * from './engel';
export { gercekEposta, epostaSaglayici } from './saglayicilar';

/* ============================================================
   Bildirim kuyruğu.

   Neden kuyruk? İki nedenle:
   1. Kullanıcı e-posta sağlayıcısının yavaşlığını beklemesin —
      talep akışı SMTP'ye bağımlı hale gelmemeli.
   2. Sağlayıcı geçici olarak düşerse bildirim kaybolmasın; kayıt
      KUYRUKTA kalır ve zamanlanmış iş yeniden dener.

   Hatırlatmalar geleceğe planlanır (`planlanan`), anlık bildirimler
   hemen işlenir.

   Kanal (EPOSTA / SMS) aynı kuyruğu paylaşıyor: yeniden deneme,
   mükerrer engelleme ve planlama mantığı ikisinde de aynı. Fark
   yalnızca gönderim anında hangi sağlayıcının çağrıldığı.
   ============================================================ */

const AZAMI_DENEME = 3;

export interface KuyrukGirdisi {
  tip: BildirimTipi;
  alici: string;
  aliciAd: string;
  sablon: Sablon;
  talepId?: string;
  konusmaId?: string;
  kullaniciId?: string;
  /** Bu andan önce gönderilmez. Verilmezse hemen. */
  planlanan?: Date;
  yanitAdresi?: string;
}

export interface SmsGirdisi {
  tip: BildirimTipi;
  /** Ham telefon; E.164'e normalize ediliyor */
  alici: string;
  aliciAd: string;
  sablon: SmsSablon;
  talepId?: string;
  kullaniciId?: string;
  planlanan?: Date;
}

/**
 * Bildirimi kuyruğa alır.
 *
 * İki durumda kayıt oluşturulmaz:
 *   · Adres engel listesindeyse (kalıcı hata / şikâyet)
 *   · Aynı talep + kanal + tip için kayıt zaten varsa
 *     (kısmi tekil indeks reddeder — hatırlatmalar mükerrer gitmez)
 *
 * Her ikisi de beklenen durum; sessizce null döner.
 */
export async function bildirimKuyrukla(g: KuyrukGirdisi): Promise<string | null> {
  return kuyrukla({
    kanal: 'EPOSTA',
    tip: g.tip,
    alici: g.alici,
    aliciAd: g.aliciAd,
    konu: g.sablon.konu,
    govdeHtml: g.sablon.html,
    govdeMetin: g.sablon.metin,
    talepId: g.talepId,
    konusmaId: g.konusmaId,
    kullaniciId: g.kullaniciId,
    planlanan: g.planlanan,
  });
}

/** SMS'i kuyruğa alır. Telefon geçersizse kayıt oluşturulmaz. */
export async function smsKuyrukla(g: SmsGirdisi): Promise<string | null> {
  const e164 = adresNormalle('SMS', g.alici);
  if (!telefonGecerli(e164)) return null;

  return kuyrukla({
    kanal: 'SMS',
    tip: g.tip,
    alici: e164,
    aliciAd: g.aliciAd,
    konu: g.sablon.etiket,
    govdeHtml: '',
    govdeMetin: g.sablon.metin,
    talepId: g.talepId,
    kullaniciId: g.kullaniciId,
    planlanan: g.planlanan,
  });
}

interface KayitGirdisi {
  kanal: Kanal;
  tip: BildirimTipi;
  alici: string;
  aliciAd: string;
  konu: string;
  govdeHtml: string;
  govdeMetin: string;
  talepId?: string;
  konusmaId?: string;
  kullaniciId?: string;
  planlanan?: Date;
}

async function kuyrukla(k: KayitGirdisi): Promise<string | null> {
  // Engel kuyruğun ÖNÜNDE: ölü adrese kayıt bile oluşturmuyoruz.
  if (await engelliMi(k.kanal, k.alici)) return null;

  try {
    const kayit = await prisma.bildirim.create({
      data: {
        kanal: k.kanal,
        tip: k.tip,
        alici: k.kanal === 'EPOSTA' ? k.alici : adresNormalle('SMS', k.alici),
        aliciAd: k.aliciAd,
        konu: k.konu,
        govdeHtml: k.govdeHtml,
        govdeMetin: k.govdeMetin,
        talepId: k.talepId ?? null,
        konusmaId: k.konusmaId ?? null,
        kullaniciId: k.kullaniciId ?? null,
        saglayici: k.kanal === 'EPOSTA' ? epostaSaglayici().ad : smsSaglayici().ad,
        planlanan: k.planlanan ?? new Date(),
      },
    });
    return kayit.id;
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    // Mükerrer kayıt — zaten kuyrukta ya da gönderilmiş
    if (m.includes('bildirim_tekil_talep') || m.includes('Unique constraint')) return null;
    console.error('Bildirim kuyruğa alınamadı:', e);
    return null;
  }
}

/** Tek bir bildirimi gönderir ve sonucu kaydeder. */
async function tekGonder(id: string): Promise<boolean> {
  const b = await prisma.bildirim.findUnique({ where: { id } });
  if (!b || b.durum !== 'KUYRUKTA') return false;

  // Kuyrukta beklerken engellenmiş olabilir (webhook araya girmiş olabilir)
  if (await engelliMi(b.kanal, b.alici)) {
    await prisma.bildirim.update({
      where: { id: b.id },
      data: { durum: 'IPTAL', hataMesaji: 'Adres gönderim engeli listesinde' },
    });
    return false;
  }

  const sonuc = b.kanal === 'SMS'
    ? await smsSaglayici().gonder({ alici: b.alici, metin: b.govdeMetin })
    : await epostaSaglayici().gonder({
      alici: b.alici,
      aliciAd: b.aliciAd,
      konu: b.konu,
      html: b.govdeHtml,
      metin: b.govdeMetin,
      yanitAdresi: site.eposta,
    });

  if (sonuc.basarili) {
    await prisma.bildirim.update({
      where: { id: b.id },
      data: {
        durum: 'GONDERILDI',
        referans: sonuc.referans,
        gonderim: new Date(),
        denemeSayisi: b.denemeSayisi + 1,
        hataMesaji: null,
      },
    });
    return true;
  }

  // Sağlayıcı "kalıcı hata" diyorsa yeniden denemenin anlamı yok;
  // adresi engel listesine alıp bir daha uğraşmıyoruz.
  const kalici = 'kalici' in sonuc && sonuc.kalici === true;
  if (kalici) {
    await engelEkle(b.kanal, b.alici, 'KALICI_HATA', b.saglayici, sonuc.hata);
    await prisma.bildirim.update({
      where: { id: b.id },
      data: { durum: 'BASARISIZ', hataMesaji: sonuc.hata ?? 'kalıcı hata', denemeSayisi: b.denemeSayisi + 1 },
    });
    return false;
  }

  const deneme = b.denemeSayisi + 1;
  await prisma.bildirim.update({
    where: { id: b.id },
    data: {
      // Deneme hakkı bittiyse BASARISIZ, değilse kuyrukta kalıp tekrar denenir
      durum: deneme >= AZAMI_DENEME ? 'BASARISIZ' : 'KUYRUKTA',
      hataMesaji: sonuc.hata ?? 'bilinmeyen hata',
      denemeSayisi: deneme,
      // Yeniden deneme aralığı artar: 5 dk, 20 dk
      planlanan: new Date(Date.now() + 5 * 60_000 * deneme * deneme),
    },
  });
  return false;
}

/**
 * Kuyruğa alıp hemen göndermeyi dener.
 * Gönderim hatası çağıran akışı bozmaz — kayıt kuyrukta kalır.
 */
export async function bildirimGonder(g: KuyrukGirdisi): Promise<void> {
  const id = await bildirimKuyrukla(g);
  if (!id) return;
  if (g.planlanan && g.planlanan > new Date()) return; // ileri tarihli, kuyrukta beklesin
  await tekGonder(id).catch((e) => console.error('Bildirim gönderilemedi:', e));
}

/** SMS'i kuyruğa alıp hemen göndermeyi dener. */
export async function smsGonder(g: SmsGirdisi): Promise<void> {
  const id = await smsKuyrukla(g);
  if (!id) return;
  if (g.planlanan && g.planlanan > new Date()) return;
  await tekGonder(id).catch((e) => console.error('SMS gönderilemedi:', e));
}

/**
 * Vadesi gelmiş kuyruğu işler. Zamanlanmış iş bunu çağırır.
 * @param limit tek turda gönderilecek azami bildirim
 */
export async function kuyruguIsle(limit = 50) {
  const bekleyenler = await prisma.bildirim.findMany({
    where: { durum: 'KUYRUKTA', planlanan: { lte: new Date() } },
    orderBy: { planlanan: 'asc' },
    take: limit,
    select: { id: true },
  });

  let basarili = 0, basarisiz = 0;
  for (const b of bekleyenler) {
    // Sıralı gönderim: sağlayıcı hız sınırlarına takılmamak için
    (await tekGonder(b.id)) ? basarili++ : basarisiz++;
  }
  return { islenen: bekleyenler.length, basarili, basarisiz };
}

/** Panelde gösterilecek özet. */
export async function bildirimOzeti() {
  const [kuyrukta, gonderildi, basarisiz, iptal, engel, sonHata] = await Promise.all([
    prisma.bildirim.count({ where: { durum: 'KUYRUKTA' } }),
    prisma.bildirim.count({ where: { durum: 'GONDERILDI' } }),
    prisma.bildirim.count({ where: { durum: 'BASARISIZ' } }),
    prisma.bildirim.count({ where: { durum: 'IPTAL' } }),
    prisma.gonderimEngeli.count(),
    prisma.bildirim.findFirst({
      where: { durum: 'BASARISIZ' },
      orderBy: { guncelleme: 'desc' },
      select: { hataMesaji: true, guncelleme: true },
    }),
  ]);
  return {
    kuyrukta, gonderildi, basarisiz, iptal, engel, sonHata,
    gercek: gercekEposta(),
    smsGercek: gercekSms(),
  };
}
