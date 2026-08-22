import 'server-only';
import { sureDolanOturumlariTemizle } from './auth';
import { bildirimKuyrukla, kuyruguIsle } from './bildirim';
import { prisma } from './db';
import { imhaCalistir } from './kisisel-veri';
import { eskiSinirlariTemizle } from './hiz-sinir';
import { eskiIzleriSil } from './iz';
import { eskiOlcumleriTemizle } from './olcum';
import { indexNowBildir, indexNowAnahtari } from './indexnow';
import { alarmDamgala, tetiklenenAlarmlar } from './fiyat-alarmi';
import { alarmDusus, alarmSatista } from './bildirim/sablonlar';

/* ============================================================
   Zamanlanmış işler — tek kaynak.

   İki yerden çağrılıyor:
     · `npm run isler`            → scripts/zamanlanmis.ts (yerel, cron)
     · `GET /api/isler`           → app/api/isler/route.ts (sunucusuz planlayıcı)

   Tüm işler idempotent: iki kez çalışması zarar vermez. Bu şart —
   sunucusuz planlayıcılar zaman zaman aynı işi iki kez tetikliyor.
   ============================================================ */

export interface IsSonucu {
  ad: string;
  islenen: number;
  notlar: string[];
  hata?: string;
  sure: number;
}

export interface CalismaSonucu {
  basladi: string;
  toplam: number;
  sure: number;
  isler: IsSonucu[];
}

interface Is {
  (not: (m: string) => void): Promise<number>;
}

/** 1. Bildirim kuyruğunu işle — vadesi gelmiş hatırlatmalar dahil. */
const bildirimler: Is = async (not) => {
  const s = await kuyruguIsle(50);
  if (s.islenen) not(`${s.islenen} işlendi — ${s.basarili} gönderildi, ${s.basarisiz} başarısız`);
  return s.islenen;
};

/**
 * 2. Yanıtlanmamış satış taleplerini raporla.
 *
 * Konut satışında ilk temasın hızı belirleyici: alıcı aynı gün üç
 * projeye form dolduruyor ve ilk arayan öne geçiyor. Dört saati geçen
 * YENİ talep, kaybedilmiş bir talep demek.
 */
const gecikenTalepler: Is = async (not) => {
  const sinir = new Date(Date.now() - 4 * 3600_000);
  const gecikenler = await prisma.talep.findMany({
    where: { durum: 'YENI', olusturma: { lt: sinir } },
    select: { kod: true, ad: true, niyet: true, proje: { select: { ad: true } } },
    take: 100,
  });
  for (const g of gecikenler) {
    not(`⚠ ${g.kod} · ${g.ad}${g.proje ? ` · ${g.proje.ad}` : ''} — 4 saattir aranmadı`);
  }
  return gecikenler.length;
};

/**
 * 3. Randevusu geçmiş talepleri raporla.
 *
 * RANDEVU niyetiyle gelen ama hâlâ YENİ ya da ARANDI durumunda duran
 * talepler: ya randevu yapılmadı ya sonucu işlenmedi. İkisi de satış
 * ekibinin görmesi gereken bir boşluk.
 */
const bekleyenRandevular: Is = async (not) => {
  const sinir = new Date(Date.now() - 3 * 864e5);
  const bekleyen = await prisma.talep.count({
    where: { niyet: 'RANDEVU', durum: { in: ['YENI', 'ARANDI'] }, olusturma: { lt: sinir } },
  });
  if (bekleyen) not(`⚠ ${bekleyen} randevu talebi 3 gündür sonuçlanmadı — /yonetim/talepler`);
  return bekleyen;
};

/** 4. Süresi dolmuş oturumları ve hız sınırı sayaçlarını sil. */
const oturumlar: Is = async (not) => {
  const silinen = await sureDolanOturumlariTemizle();
  if (silinen) not(`${silinen} oturum silindi`);

  const sinir = await eskiSinirlariTemizle();
  if (sinir) not(`${sinir} hız sınırı sayacı temizlendi`);

  // KVKK saklama ilkesi: ölçümler süresiz tutulmuyor
  const olcum = await eskiOlcumleriTemizle(90);
  if (olcum) not(`${olcum} eski ölçüm silindi`);

  /* Ziyaret izleri 400 gün: yıllık karşılaştırma için bir yıl + pay
     yeterli. Süresiz tutmak hem "gerektiği kadar saklama" ilkesine
     aykırı hem de tabloyu şişiriyor. */
  const iz = await eskiIzleriSil(400);
  if (iz.ziyaret || iz.olay) not(`${iz.ziyaret} ziyaret, ${iz.olay} olay izi silindi`);

  return silinen + sinir + olcum + iz.ziyaret + iz.olay;
};

/**
 * 5. Teslim tarihi geçmiş projeleri raporla.
 *
 * Teslim tarihi geçtiği hâlde hâlâ SATISTA görünen proje, sitedeki
 * en zararlı yanlış bilgi: alıcıya tutulmamış bir söz gösteriyor.
 * Otomatik güncellenmiyor — teslimin gerçekleşip gerçekleşmediğini
 * yalnızca ekip bilebilir; burada yalnızca uyarılıyor.
 */
const gecikenTeslimler: Is = async (not) => {
  const bugun = new Date();
  const gecikenler = await prisma.proje.findMany({
    where: {
      yayinda: true,
      teslimTarihi: { lt: bugun },
      durum: { in: ['YAKINDA', 'SATISTA', 'SON_DAIRELER'] },
    },
    select: { slug: true, ad: true, teslimTarihi: true },
    take: 100,
  });
  for (const p of gecikenler) {
    const ay = Math.round((bugun.getTime() - p.teslimTarihi!.getTime()) / (30 * 864e5));
    not(`⚠ ${p.ad}: teslim tarihi ${ay} ay geçti, durum hâlâ satışta — /yonetim/projeler`);
  }
  return gecikenler.length;
};

/**
 * 6. Son 24 saatte güncellenen projeleri arama motorlarına bildir.
 *
 * Bing/Yandex tarafında etkili; Google IndexNow kullanmıyor, onun için
 * sitemap geçerli. Bildirim başarısız olursa iş hata vermiyor —
 * bu bir optimizasyon, kritik yol değil.
 */
const indeksBildirim: Is = async (not) => {
  if (!indexNowAnahtari()) return 0;

  const sinir = new Date(Date.now() - 864e5);
  const projeler = await prisma.proje.findMany({
    where: { yayinda: true, guncelleme: { gte: sinir } },
    select: { slug: true },
    take: 500,
  });
  if (!projeler.length) return 0;

  const s = await indexNowBildir(projeler.map((p) => `/proje/${p.slug}`));
  not(s.gonderildi
    ? `${s.adet} URL bildirildi (HTTP ${s.durum})`
    : `✗ IndexNow: ${s.hata}`);
  return s.gonderildi ? s.adet : 0;
};

/**
 * 7. Saklama süresi dolan kişisel veriyi imha eder (KVKK md. 7).
 *
 * "Belki lazım olur" bir işleme amacı değil. Süreler ve dayanakları
 * `lib/kisisel-veri.ts` içinde; burada yalnızca zamanlaması var.
 */
const imha: Is = async (not) => {
  const s = await imhaCalistir();
  if (s.oturum) not(`${s.oturum} süresi dolmuş oturum silindi`);
  if (s.olcum) not(`${s.olcum} performans ölçümü silindi`);
  if (s.bildirim) not(`${s.bildirim} bildirim kaydı silindi`);
  if (s.konusma) not(`${s.konusma} eski yazışma silindi`);
  if (s.denetimIp) not(`${s.denetimIp} denetim kaydından IP temizlendi`);
  if (s.talep) not(`${s.talep} sonuçlanmış talep silindi`);
  if (s.veriTalebi) not(`${s.veriTalebi} sonuçlanmış başvuru silindi`);
  return s.toplam;
};

/**
 * 8. Fiyat alarmları ve satışa çıkış bildirimleri.
 *
 * Bildirim doğrudan gönderilmiyor, KUYRUĞA yazılıyor: gönderim
 * sağlayıcısı yavaşladığında cron işi zaman aşımına uğrar ve kalan
 * alarmlar hiç işlenmezdi.
 */
const fiyatAlarmlari: Is = async (not) => {
  const tetiklenen = await tetiklenenAlarmlar();
  if (tetiklenen.length === 0) return 0;

  let gonderilen = 0;
  for (const a of tetiklenen) {
    try {
      await bildirimKuyrukla({
        tip: a.sebep === 'satis' ? 'ALARM_SATISTA' : 'ALARM_DUSUS',
        alici: a.eposta,
        aliciAd: a.eposta.split('@')[0],
        sablon: a.sebep === 'satis'
          ? alarmSatista(a.projeAdi, a.projeSlug, a.yeniFiyat, a.jeton)
          : alarmDusus(a.projeAdi, a.projeSlug, a.kurulusFiyati, a.yeniFiyat, a.hedef, a.jeton),
      });
      /* Damga kuyruklamadan SONRA: önce damgalasaydık, kuyruklama
         hata verdiğinde alarm bildirilmiş sayılır ve bir daha hiç
         tetiklenmezdi. */
      await alarmDamgala(a.id, a.yeniFiyat);
      gonderilen++;
    } catch (e) {
      not(`${a.projeSlug} alarmı kuyruğa yazılamadı: ${e instanceof Error ? e.message : e}`);
    }
  }
  not(`${gonderilen} alarm bildirimi kuyruğa alındı`);
  return gonderilen;
};

const ISLER: Record<string, Is> = {
  bildirimler, gecikenTalepler, bekleyenRandevular, oturumlar,
  gecikenTeslimler, indeksBildirim, imha, fiyatAlarmlari,
};

export const IS_ADLARI = Object.keys(ISLER);

/**
 * İşleri çalıştırır. `secilen` verilmezse hepsi sırayla çalışır.
 *
 * Bir işin hatası diğerlerini durdurmaz — kuyruk tıkandı diye
 * saklama süresi dolan verinin imha edilmemesi daha kötü olurdu.
 */
export async function islerCalistir(secilen?: string): Promise<CalismaSonucu> {
  const basla = Date.now();
  const calisacak = secilen ? [secilen] : IS_ADLARI;
  const sonuclar: IsSonucu[] = [];
  let toplam = 0;

  for (const ad of calisacak) {
    const fn = ISLER[ad];
    if (!fn) continue;

    const notlar: string[] = [];
    const t = Date.now();
    try {
      const islenen = await fn((m) => notlar.push(m));
      toplam += islenen;
      sonuclar.push({ ad, islenen, notlar, sure: Date.now() - t });
    } catch (e) {
      sonuclar.push({
        ad, islenen: 0, notlar,
        hata: e instanceof Error ? e.message : String(e),
        sure: Date.now() - t,
      });
    }
  }

  return {
    basladi: new Date(basla).toISOString(),
    toplam,
    sure: Date.now() - basla,
    isler: sonuclar,
  };
}
