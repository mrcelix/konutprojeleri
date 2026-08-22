import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from './db';
import { site } from './site';

/* ============================================================
   Fiyat alarmı / proje takibi.

   Konut alımında karar aylar sürüyor: ziyaretçi bakıyor, pahalı
   buluyor, ayrılıyor. Geri gelip gelmediğini kimse bilmiyordu.
   Alarm, ilgiyi kaybetmeden yakalıyor.

   İKİ AYRI KULLANIM, TEK TABLO:
   · `hedef > 0` → "şu fiyatın altına düşerse haber ver"
   · `hedef = 0` → "satışa çıkınca haber ver" (lansman öncesi proje)

   İkincisi, YAKINDA aşamasındaki projelerde lansman öncesi liste
   oluşturmanın tek yolu ve bu sitede alarmın asıl kullanımı. Ayrı bir
   tablo açmak, aynı çift onay ve abonelikten çıkma akışını ikinci kez
   yazmak demekti.

   ÇİFT ONAY zorunlu. Adres doğrulanmadan tek bir bildirim bile
   gönderilmiyor: onaysız gönderim, başkasının adresini forma yazan
   birinin bizi istenmeyen posta göndericisi yapması demekti.

   Jeton hem doğrulama hem abonelikten çıkma bağlantısında kullanılıyor.
   Ayrı iki jeton üretmek, iki tabloyu senkron tutmak demekti; tek
   jetonun ele geçmesiyle yapılabilecek en kötü şey zaten "alarmı
   iptal etmek".
   ============================================================ */

export interface AlarmSonucu {
  tamam: boolean;
  hata?: string;
  bilgi?: string;
}

const EPOSTA = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

/** Hedef fiyatın makul aralığı — mevcut fiyatın yüzdesi olarak. */
export const EN_DUSUK_ORAN = 0.5;

/**
 * @param hedef  0 → "satışa çıkınca haber ver"; bu durumda fiyat
 *               karşılaştırması hiç yapılmıyor.
 * @param mevcut Projenin şu anki başlangıç fiyatı (`fiyatMin`).
 */
export function alarmDenetle(eposta: string, hedef: number, mevcut: number): string | null {
  if (!EPOSTA.test(eposta.trim())) return 'Geçerli bir e-posta adresi girin.';
  if (!Number.isFinite(hedef) || hedef < 0) return 'Hedef fiyat negatif olamaz.';

  // Satışa çıkış takibi — fiyat kuralları uygulanmıyor.
  if (hedef === 0) return null;

  /* Hedef mevcut fiyatın ÜSTÜNDEyse alarm anında tetiklenir ve bildirim
     hiçbir şey söylemez. Kullanıcı büyük ihtimalle yanlış alana yazdı. */
  if (hedef >= mevcut) {
    return `Hedef, şu anki başlangıç fiyatının (${mevcut.toLocaleString('tr-TR')} ₺) altında olmalı.`;
  }
  /* Çok düşük hedef hiç tetiklenmez; "kurdum ama hiç haber gelmedi"
     şikâyetinin kaynağı bu. Konut fiyatları kiralama gibi sezonluk
     dalgalanmıyor — %50 altı bir hedef gerçekçi değil. */
  if (hedef < mevcut * EN_DUSUK_ORAN) {
    return 'Hedef fiyat gerçekçi değil. Şu anki fiyatın en fazla %50 altını seçin.';
  }
  return null;
}

export function alarmJetonu(): string {
  return randomBytes(24).toString('base64url');
}

export const dogrulamaUrl = (jeton: string) =>
  new URL(`/alarm/${jeton}?islem=onayla`, site.url).toString();
export const iptalUrl = (jeton: string) =>
  new URL(`/alarm/${jeton}?islem=iptal`, site.url).toString();

/**
 * Alarm kurar ya da var olanı günceller.
 *
 * Aynı adres aynı projeye ikinci kez alarm kurarsa yeni satır
 * açılmıyor: hedefi güncellenip yeni jeton veriliyor. Kopya satır,
 * fiyat düşünce aynı kişiye iki e-posta demekti.
 */
export async function alarmKur(
  projeId: string, epostaHam: string, hedef: number,
): Promise<AlarmSonucu & { jeton?: string; alarmId?: string; zatenOnayli?: boolean }> {
  const proje = await prisma.proje.findUnique({
    where: { id: projeId }, select: { id: true, fiyatMin: true, yayinda: true },
  });
  if (!proje || !proje.yayinda) return { tamam: false, hata: 'Proje bulunamadı.' };

  const eposta = epostaHam.trim().toLowerCase();
  const hata = alarmDenetle(eposta, hedef, proje.fiyatMin);
  if (hata) return { tamam: false, hata };

  const jeton = alarmJetonu();
  const mevcut = await prisma.fiyatAlarmi.findUnique({
    where: { projeId_eposta: { projeId, eposta } },
    select: { id: true, dogrulandi: true },
  });

  if (mevcut) {
    await prisma.fiyatAlarmi.update({
      where: { id: mevcut.id },
      data: {
        hedef: Math.round(hedef), kurulusFiyati: proje.fiyatMin, aktif: true,
        /* Doğrulanmış aboneliğin onayı KORUNUYOR: hedefini güncelleyen
           kişiye yeniden doğrulama e-postası göndermek, çalışan bir
           aboneliği kırmak olurdu. */
        ...(mevcut.dogrulandi ? {} : { jeton }),
      },
    });
    return {
      tamam: true,
      jeton: mevcut.dogrulandi ? undefined : jeton,
      alarmId: mevcut.dogrulandi ? undefined : mevcut.id,
      zatenOnayli: mevcut.dogrulandi,
    };
  }

  const yeni = await prisma.fiyatAlarmi.create({
    data: { projeId, eposta, hedef: Math.round(hedef), kurulusFiyati: proje.fiyatMin, jeton },
    select: { id: true },
  });
  return { tamam: true, jeton, alarmId: yeni.id };
}

/** Doğrulama bağlantısı. */
export async function alarmOnayla(jeton: string): Promise<AlarmSonucu & { projeSlug?: string }> {
  const a = await prisma.fiyatAlarmi.findUnique({
    where: { jeton },
    select: { id: true, dogrulandi: true, proje: { select: { slug: true } } },
  });
  if (!a) return { tamam: false, hata: 'Bağlantı geçersiz ya da alarm kaldırılmış.' };
  if (a.dogrulandi) {
    return { tamam: true, bilgi: 'Bu alarm zaten etkin.', projeSlug: a.proje.slug };
  }
  await prisma.fiyatAlarmi.update({
    where: { id: a.id }, data: { dogrulandi: true, aktif: true },
  });
  return { tamam: true, projeSlug: a.proje.slug };
}

/** Abonelikten çıkma. Satır SİLİNİYOR — "aktif: false" bırakmak, adresi elimizde tutmak olurdu. */
export async function alarmIptal(jeton: string): Promise<AlarmSonucu> {
  const a = await prisma.fiyatAlarmi.findUnique({ where: { jeton }, select: { id: true } });
  if (!a) return { tamam: true, bilgi: 'Bu alarm zaten kaldırılmış.' };
  await prisma.fiyatAlarmi.delete({ where: { id: a.id } });
  return { tamam: true };
}

export interface TetiklenenAlarm {
  id: string;
  eposta: string;
  jeton: string;
  hedef: number;
  kurulusFiyati: number;
  yeniFiyat: number;
  projeAdi: string;
  projeSlug: string;
  /** `fiyat` → fiyat düştü, `satis` → proje satışa çıktı */
  sebep: 'fiyat' | 'satis';
}

/** Aynı alarm için iki bildirim arasında beklenen en az süre. */
export const BEKLEME_GUN = 7;

/**
 * Tetiklenmesi gereken alarmları bulur.
 *
 * İki ayrı tetik:
 *
 * · SATIŞA ÇIKIŞ (`hedef = 0`): proje YAKINDA'dan çıkıp satışa
 *   geçtiyse. Bir kez gönderiliyor — `sonBildirim` doluysa bir daha
 *   bakılmıyor, çünkü proje ikinci kez satışa çıkmıyor.
 *
 * · FİYAT DÜŞÜŞÜ (`hedef > 0`): hedefin altına düşmüş olmak yetmiyor.
 *   Aynı alarma her gün e-posta göndermemek için son bildirimden bu
 *   yana `BEKLEME_GUN` geçmiş olmalı VE fiyat son bildirilen fiyattan
 *   daha da düşmüş olmalı. İkincisi olmadan, fiyat sabit kalsa bile
 *   haftada bir "düştü" e-postası giderdi.
 */
export async function tetiklenenAlarmlar(): Promise<TetiklenenAlarm[]> {
  const alarmlar = await prisma.fiyatAlarmi.findMany({
    where: { aktif: true, dogrulandi: true },
    select: {
      id: true, eposta: true, jeton: true, hedef: true, kurulusFiyati: true,
      sonBildirim: true, sonFiyat: true,
      proje: { select: { ad: true, slug: true, fiyatMin: true, durum: true, yayinda: true } },
    },
  });

  const simdi = Date.now();
  const out: TetiklenenAlarm[] = [];

  for (const a of alarmlar) {
    if (!a.proje.yayinda) continue;
    const fiyat = a.proje.fiyatMin;

    const ortak = {
      id: a.id, eposta: a.eposta, jeton: a.jeton, hedef: a.hedef,
      kurulusFiyati: a.kurulusFiyati, yeniFiyat: fiyat,
      projeAdi: a.proje.ad, projeSlug: a.proje.slug,
    };

    if (a.hedef === 0) {
      // Satışa çıkış takibi — bir kez bildiriliyor.
      if (a.sonBildirim) continue;
      if (a.proje.durum !== 'SATISTA' && a.proje.durum !== 'SON_DAIRELER') continue;
      out.push({ ...ortak, sebep: 'satis' });
      continue;
    }

    if (fiyat > a.hedef) continue;
    if (a.sonBildirim && simdi - a.sonBildirim.getTime() < BEKLEME_GUN * 864e5) continue;
    if (a.sonFiyat !== null && fiyat >= a.sonFiyat) continue;
    out.push({ ...ortak, sebep: 'fiyat' });
  }
  return out;
}

/** Bildirim gönderildikten sonra damgalanıyor. */
export async function alarmDamgala(id: string, fiyat: number): Promise<void> {
  await prisma.fiyatAlarmi.update({
    where: { id }, data: { sonBildirim: new Date(), sonFiyat: fiyat },
  });
}
