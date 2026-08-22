import 'server-only';
import { headers } from 'next/headers';
import { prisma } from './db';

/* ============================================================
   Hız sınırı.

   Faz 8'de "başarısız giriş denemeleri kaydediliyor" demiştik ama
   SINIRLANMIYORDU — yani parola deneme saldırısı kayıt bırakarak
   çalışmaya devam ediyordu. Bu onu kapatıyor.

   NEDEN VERİTABANI, BELLEK DEĞİL:
   Sunucusuz ortamda her fonksiyon örneği kendi belleğine sahip.
   Saldırgan istekleri farklı örneklere dağıldığında bellekteki sayaç
   hiç dolmuyor ve sınır hiç devreye girmiyor. Redis eklemek yerine
   veritabanı kullanılıyor: zaten her istekte oraya gidiliyor.

   İKİ EKSENDE SINIR:
   · IP başına — tek makineden yapılan saldırıyı durdurur
   · Hesap (e-posta) başına — dağıtık saldırıda hedef hesabı korur
   Yalnızca IP'ye bakmak botnet'e açık; yalnızca hesaba bakmak ise
   saldırganın kurbanın hesabını kilitlemesine izin verir (bu yüzden
   hesap sınırı IP sınırından daha gevşek tutuluyor).
   ============================================================ */

export interface SinirKurali {
  /** Pencere içinde izin verilen deneme */
  azami: number;
  /** Pencere uzunluğu (saniye) */
  pencereSn: number;
  /** Sınır aşılınca engelin süresi (saniye) */
  engelSn: number;
}

export const KURALLAR = {
  /** Parola denemesi — IP başına sıkı */
  girisIp: { azami: 10, pencereSn: 300, engelSn: 900 },
  /** Parola denemesi — hesap başına, kilitleme saldırısına karşı gevşek */
  girisHesap: { azami: 20, pencereSn: 900, engelSn: 900 },
  /** İki adımlı doğrulama kodu — 6 hane, kaba kuvvete çok açık */
  ikinciAsama: { azami: 6, pencereSn: 300, engelSn: 1800 },
  /** Proje sorusu — spam */
  soru: { azami: 5, pencereSn: 600, engelSn: 3600 },
  /** KVKK veri talebi — başkasının adresine doğrulama postası yağdırma */
  veriTalebi: { azami: 3, pencereSn: 3600, engelSn: 3600 },
  /* Ziyaret ölçümü — uç herkese açık ve kimlik doğrulaması yok.
     Sınırsız bırakmak tabloyu şişirmek isteyene bedava yol vermek
     olurdu. 120/dk normal gezinmenin çok üstünde: bir sayfa
     görüntüleme + birkaç tıklama, dakikada onlarca değil. */
  iz: { azami: 120, pencereSn: 60, engelSn: 300 },
  /** Firma başvurusu — spam ve sahte başvuru */
  basvuru: { azami: 3, pencereSn: 3600, engelSn: 3600 },
  /* Satış talebi — sitenin TEK dönüşüm hedefi ve kimlik doğrulaması
     olmayan tek yazma ucu. Sınırsız bırakmak, satış ekibinin gerçek
     talepleri göremediği bir kuyruk demek. Saatte 5, aynı evden
     birden fazla kişinin başvurmasına yetiyor. */
  talep: { azami: 5, pencereSn: 3600, engelSn: 3600 },
  /** Talep kodu sorgulama — kod uzayını deneyerek başkasının kaydını bulma */
  talepSorgu: { azami: 8, pencereSn: 900, engelSn: 1800 },
  /** Fiyat alarmı — başkasının adresine doğrulama e-postası yağdırma */
  alarm: { azami: 5, pencereSn: 3600, engelSn: 3600 },
  /** Arama API'si — kazıma (scraping) */
  arama: { azami: 120, pencereSn: 60, engelSn: 300 },
  /** Fotoğraf yükleme — oturum gerektiriyor ama depoyu şişirmek mümkün */
  yukleme: { azami: 60, pencereSn: 600, engelSn: 1800 },
} as const satisfies Record<string, SinirKurali>;

export type KuralAdi = keyof typeof KURALLAR;

export interface SinirSonucu {
  izin: boolean;
  /** Kalan deneme hakkı */
  kalan: number;
  /** Engelliyse ne zaman açılacağı */
  acilis?: Date;
  /** Kullanıcıya gösterilecek mesaj */
  mesaj?: string;
}

/** İstek sahibinin IP'si. Ters vekil arkasında x-forwarded-for ilk değer. */
export async function istekIp(): Promise<string> {
  try {
    const h = await headers();
    const xff = h.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    return h.get('x-real-ip') ?? 'bilinmeyen';
  } catch {
    return 'bilinmeyen';
  }
}

const saniye = (d: Date, sn: number) => new Date(d.getTime() + sn * 1000);

/**
 * Sayacı artırır ve izin verilip verilmediğini döner.
 *
 * ÖNEMLİ: bu fonksiyon denemeyi SAYAR. Başarılı işlemden sonra
 * `sinirSifirla` çağrılmalı, aksi halde meşru kullanıcı da sınıra
 * takılır (10 kez doğru parola girmek yasak olmamalı).
 */
export async function sinirKontrol(
  kural: KuralAdi,
  kimlik: string,
): Promise<SinirSonucu> {
  // KİMLİK BİLİNMİYORSA SINIRLAMA YOK.
  //
  // `istekIp()` yalnızca istek bağlamı dışında (zamanlanmış işler, seed,
  // testler) 'bilinmeyen' döner. Bu değeri sınırlamak iki soruna yol
  // açıyor: tüm bağlamsız çağrılar TEK kovayı paylaşıyor ve biri sınırı
  // doldurunca diğerleri de kilitleniyor.
  //
  // DİKKAT: gerçek trafikte de 'bilinmeyen' görüyorsanız ters vekiliniz
  // `x-forwarded-for` başlığını iletmiyor demektir ve hız sınırı
  // ÇALIŞMIYOR. Vercel bunu otomatik gönderiyor; kendi nginx'inizde
  // `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
  // satırının olduğundan emin olun.
  if (!kimlik || kimlik === 'bilinmeyen') return { izin: true, kalan: 0 };

  const k = KURALLAR[kural];
  const anahtar = `${kural}:${kimlik}`.slice(0, 200);
  const simdi = new Date();

  try {
    const mevcut = await prisma.hizSinir.findUnique({ where: { anahtar } });

    // Engel sürüyor
    if (mevcut?.engelBitis && mevcut.engelBitis > simdi) {
      return {
        izin: false,
        kalan: 0,
        acilis: mevcut.engelBitis,
        mesaj: mesajUret(mevcut.engelBitis, simdi),
      };
    }

    // Pencere dolmuş veya kayıt yok → yeniden başlat
    const pencereBitti = !mevcut || saniye(mevcut.pencere, k.pencereSn) <= simdi;
    if (pencereBitti) {
      await prisma.hizSinir.upsert({
        where: { anahtar },
        create: { anahtar, sayac: 1, pencere: simdi, engelBitis: null },
        update: { sayac: 1, pencere: simdi, engelBitis: null },
      });
      return { izin: true, kalan: k.azami - 1 };
    }

    const yeniSayac = mevcut.sayac + 1;

    if (yeniSayac > k.azami) {
      const acilis = saniye(simdi, k.engelSn);
      await prisma.hizSinir.update({
        where: { anahtar },
        data: { sayac: yeniSayac, engelBitis: acilis },
      });
      return { izin: false, kalan: 0, acilis, mesaj: mesajUret(acilis, simdi) };
    }

    await prisma.hizSinir.update({ where: { anahtar }, data: { sayac: yeniSayac } });
    return { izin: true, kalan: k.azami - yeniSayac };
  } catch (e) {
    // Sınır altyapısı çökerse İSTEĞİ ENGELLEMİYORUZ.
    // Bu bilinçli: veritabanı sorunu yüzünden tüm girişleri kilitlemek,
    // korumaya çalıştığımız zarardan büyük olur.
    console.error('Hız sınırı kontrol edilemedi:', e);
    return { izin: true, kalan: 0 };
  }
}

/** Başarılı işlemden sonra sayacı sıfırlar. */
export async function sinirSifirla(kural: KuralAdi, kimlik: string): Promise<void> {
  await prisma.hizSinir
    .deleteMany({ where: { anahtar: `${kural}:${kimlik}`.slice(0, 200) } })
    .catch(() => { /* sayaç temizlenememesi akışı bozmamalı */ });
}

function mesajUret(acilis: Date, simdi: Date): string {
  const dk = Math.max(1, Math.ceil((acilis.getTime() - simdi.getTime()) / 60_000));
  return `Çok fazla deneme yapıldı. ${dk} dakika sonra tekrar deneyin.`;
}

export function mesajUretEn(acilis: Date, simdi = new Date()): string {
  const dk = Math.max(1, Math.ceil((acilis.getTime() - simdi.getTime()) / 60_000));
  return `Too many attempts. Please try again in ${dk} minute${dk === 1 ? '' : 's'}.`;
}

/** Süresi dolmuş sayaçları siler. Zamanlanmış iş çağırıyor. */
export async function eskiSinirlariTemizle(): Promise<number> {
  const sinir = new Date(Date.now() - 24 * 3600_000);
  const { count } = await prisma.hizSinir.deleteMany({
    where: {
      pencere: { lt: sinir },
      OR: [{ engelBitis: null }, { engelBitis: { lt: new Date() } }],
    },
  });
  return count;
}

/** Panelde gösterilecek özet. */
export async function sinirOzeti(limit = 30) {
  const simdi = new Date();
  const [aktifEngel, sonEngeller] = await Promise.all([
    prisma.hizSinir.count({ where: { engelBitis: { gt: simdi } } }),
    prisma.hizSinir.findMany({
      where: { engelBitis: { not: null } },
      orderBy: { engelBitis: 'desc' },
      take: limit,
      select: { anahtar: true, sayac: true, engelBitis: true, pencere: true },
    }),
  ]);
  return { aktifEngel, sonEngeller };
}
