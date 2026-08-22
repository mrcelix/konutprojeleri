import 'server-only';
import { site } from '../site';

/* ============================================================
   SMS şablonları.

   E-postadan farklı üç kural:

   1. KISA. Türkçe karakter varsa parça başına 70 karakter — "ş" bile
      koysanız mesaj UCS-2'ye düşüyor ve maliyet iki katına çıkıyor.
      Yine de Türkçe yazıyoruz: karaktersiz Türkçe ("Randevu teyidi")
      ucuz ama özensiz görünüyor ve marka algısını düşürüyor.

   2. LİNK KISA OLMALI. Uzun URL parça sınırını tek başına doldurur.
      Talep kodunu kullanıp kısa yol veriyoruz.

   3. İŞLEMSEL. Ticari İleti yönetmeliğine göre onay/hatırlatma gibi
      işlemsel mesajlar İYS iznine tabi değil; ancak PAZARLAMA amaçlı tek
      bir cümle eklenirse mesaj ticari sayılır ve İYS kaydı zorunlu olur.
      Bu yüzden şablonlarda kampanya, indirim, öneri YOK.

   NE ZAMAN SMS: bu sitede SMS pahalı ve nadir. Talep alındı teyidi
   SMS ile GİTMİYOR — kişi numarasını bir saniye önce yazdı, "aldık"
   mesajı ona bir şey söylemiyor. SMS yalnızca TARİH TAŞIYAN
   bildirimlerde (randevu) ve güvenlik kodunda kullanılıyor.
   ============================================================ */

export interface SmsSablon {
  /** Panelde ve kayıtta görünen kısa etiket */
  etiket: string;
  metin: string;
}

const kisaTarih = (d: Date) =>
  `${d.getUTCDate().toString().padStart(2, '0')}.${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;

const saat = (d: Date) =>
  `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;

const alan = () => site.url.replace(/^https?:\/\/(www\.)?/, '');

/**
 * Randevu teyidi.
 *
 * SMS'in e-postadan gerçekten üstün olduğu tek yer: talep sahiplerinin
 * büyük bölümü e-posta bırakmıyor ve randevu tarih + saat taşıyor.
 * Yanlış hatırlanan bir randevu, iki taraf için de boşa giden bir gün.
 */
export function randevuTeyit(projeAd: string | null, ne: Date, nerede: string): SmsSablon {
  const proje = projeAd ? `${projeAd} ` : '';
  return {
    etiket: 'Randevu teyidi',
    metin:
      `${site.ad}: ${proje}randevunuz ${kisaTarih(ne)} ${saat(ne)} olarak onaylandı. `
      + `Yer: ${nerede}. Degisiklik icin bizi arayin.`,
  };
}

/** İki adımlı doğrulama — panel girişinde tek kullanımlık kod. */
export function girisKodu(kod: string): SmsSablon {
  return {
    etiket: 'Giriş kodu',
    metin: `${site.ad} panel giriş kodunuz: ${kod}. 5 dakika geçerli. Bu kodu kimseyle paylaşmayın.`,
  };
}

/**
 * Talep sahibine: satış ekibi ulaşamadı.
 *
 * İki başarısız aramadan sonra gönderiliyor. Bilinmeyen numaradan
 * gelen iki cevapsız çağrı, çoğu kişide "kim aradı" sorusunu bile
 * doğurmuyor; kimin aradığını yazmak talebi kurtarıyor.
 */
export function ulasilamadi(projeAd: string | null): SmsSablon {
  const proje = projeAd ? `${projeAd} ` : '';
  return {
    etiket: 'Ulaşılamadı',
    metin:
      `${site.ad}: ${proje}talebiniz icin aradik, ulasamadik. `
      + `Uygun oldugunuzda bize donebilirsiniz: ${site.telefon}`,
  };
}

/** Talep sahibine: katalog / fiyat listesi e-postayla gönderildi. */
export function katalogGonderildi(projeAd: string | null): SmsSablon {
  const proje = projeAd ? `${projeAd} ` : '';
  return {
    etiket: 'Katalog gönderildi',
    metin: `${site.ad}: ${proje}fiyat listesi e-posta adresinize gonderildi. ${alan()}`,
  };
}
