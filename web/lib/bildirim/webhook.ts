import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../db';
import { engelEkle } from './engel';

/* ============================================================
   Sağlayıcı webhook'u — bounce ve şikâyet yakalama.

   Gönderim sonucu her zaman anında belli olmuyor: sağlayıcı "kabul
   edildi" der, alıcı sunucu dakikalar sonra reddeder. Bu geri bildirimi
   yakalamazsak ölü adreslere aylarca gönderim yapmaya devam ederiz.

   İmza doğrulaması ZORUNLU. Doğrulanmamış bir webhook, saldırganın
   istediği adresi engel listesine attırmasına izin verirdi — yani
   rakibinizin alıcılarına e-posta gitmesini engelleyebilirdi.

   Resend, Svix altyapısını kullanıyor:
     svix-id, svix-timestamp, svix-signature başlıkları
     imza = HMAC-SHA256(gizli, "id.timestamp.gövde")
   ============================================================ */

export type WebhookSonuc =
  | { durum: 'tamam'; olay: string; islem: string }
  | { durum: 'yoksay'; sebep: string }
  | { durum: 'hata'; sebep: string };

/**
 * Svix imza doğrulaması.
 *
 * `whsec_` önekli gizli anahtarın base64 kısmı HMAC anahtarıdır.
 * Birden fazla imza gelebilir (anahtar döndürme sırasında); herhangi
 * biri tutarsa geçerli sayılır.
 */
export function imzaDogrula(
  gizli: string,
  id: string,
  damga: string,
  govde: string,
  imzaBasligi: string,
): boolean {
  if (!gizli || !id || !damga || !imzaBasligi) return false;

  // Tekrar saldırısı penceresi: 5 dakika
  const saniye = Number(damga);
  if (!Number.isFinite(saniye)) return false;
  if (Math.abs(Date.now() / 1000 - saniye) > 300) return false;

  const anahtar = Buffer.from(gizli.replace(/^whsec_/, ''), 'base64');
  const beklenen = createHmac('sha256', anahtar)
    .update(`${id}.${damga}.${govde}`)
    .digest();

  // "v1,imza v1,başkaİmza" biçiminde gelebilir
  for (const parca of imzaBasligi.split(' ')) {
    const [surum, imza] = parca.split(',');
    if (surum !== 'v1' || !imza) continue;
    const gelen = Buffer.from(imza, 'base64');
    if (gelen.length === beklenen.length && timingSafeEqual(gelen, beklenen)) return true;
  }
  return false;
}

interface ResendOlay {
  type?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    bounce?: { type?: string; subType?: string; message?: string };
    reason?: string;
  };
}

/**
 * Resend olayını işler.
 *
 * Kalıcı (hard) ve geçici (soft) bounce ayrımı kritik: geçici bounce
 * "posta kutusu dolu" demek ve adres birkaç gün sonra çalışabilir.
 * Yalnızca kalıcı olanı engel listesine alıyoruz.
 */
export async function resendOlayIsle(olay: ResendOlay): Promise<WebhookSonuc> {
  const tip = olay.type ?? '';
  const d = olay.data ?? {};
  const alici = Array.isArray(d.to) ? d.to[0] : d.to;

  // Bildirim kaydını sağlayıcı kimliğiyle eşleştir
  const kayit = d.email_id
    ? await prisma.bildirim.findFirst({ where: { referans: d.email_id }, select: { id: true, alici: true } })
    : null;
  const adres = alici ?? kayit?.alici;

  switch (tip) {
    case 'email.bounced': {
      if (!adres) return { durum: 'yoksay', sebep: 'alıcı adresi yok' };

      const bounceTipi = (d.bounce?.type ?? '').toLowerCase();
      // Resend "Permanent" / "Transient" gönderiyor.
      const kalici = bounceTipi.includes('permanent') || bounceTipi.includes('hard');

      if (!kalici) {
        if (kayit) {
          await prisma.bildirim.update({
            where: { id: kayit.id },
            data: { hataMesaji: `geçici bounce: ${d.bounce?.message ?? bounceTipi}` },
          });
        }
        return { durum: 'tamam', olay: tip, islem: 'geçici bounce — engellenmedi' };
      }

      await engelEkle('EPOSTA', adres, 'KALICI_HATA', 'resend', d.bounce?.message ?? d.bounce?.subType);
      if (kayit) {
        await prisma.bildirim.update({
          where: { id: kayit.id },
          data: { durum: 'BASARISIZ', hataMesaji: `kalıcı bounce: ${d.bounce?.message ?? ''}` },
        });
      }
      return { durum: 'tamam', olay: tip, islem: `${adres} engellendi (kalıcı hata)` };
    }

    case 'email.complained': {
      if (!adres) return { durum: 'yoksay', sebep: 'alıcı adresi yok' };
      // Şikâyette soft/hard ayrımı yok — tek bir şikâyet bile ağır.
      await engelEkle('EPOSTA', adres, 'SIKAYET', 'resend', d.reason);
      return { durum: 'tamam', olay: tip, islem: `${adres} engellendi (şikâyet)` };
    }

    case 'email.delivered': {
      if (kayit) {
        await prisma.bildirim.update({
          where: { id: kayit.id },
          data: { durum: 'GONDERILDI', hataMesaji: null },
        });
      }
      return { durum: 'tamam', olay: tip, islem: 'teslim doğrulandı' };
    }

    // Açılma ve tıklanma takibi KVKK aydınlatması gerektiriyor;
    // toplamıyoruz, olayı sessizce geçiyoruz.
    case 'email.opened':
    case 'email.clicked':
      return { durum: 'yoksay', sebep: 'takip toplanmıyor' };

    default:
      return { durum: 'yoksay', sebep: `bilinmeyen olay: ${tip || '(boş)'}` };
  }
}
