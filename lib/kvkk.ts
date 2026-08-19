import { createHash } from 'node:crypto';

/**
 * KVKK açık rıza kaydı.
 *
 * Supabase Frankfurt'ta olduğu için talep formundaki ad ve telefon
 * YURT DIŞINA AKTARILIYOR. KVKK madde 9 gereği bu, açık rıza ya da uygun
 * bir aktarım mekanizması gerektiriyor.
 *
 * Kritik nokta: rızanın ALINDIĞI ANDAKİ METNİN hangi sürüm olduğunu
 * kanıtlayabilmek gerekir. Metin sonradan değişirse eski rızanın neye
 * verildiği belirsizleşir. Bu yüzden her kayıtta sürüm etiketi ve metnin
 * özeti (hash) saklanır.
 *
 * Bu bir hukuki görüş değildir. Metni bir avukata yazdırın —
 * ama kayıt mekanizmasını baştan kurun, sonradan eklemek çok daha zor.
 */

/** Metin her değiştiğinde bu sürüm artırılır ve eski kayıtlar dokunulmaz kalır. */
export const KVKK_SURUM = 'v1.0 · 2026-08-19';

export const KVKK_METNI = `Konutprojeleri.com üzerinden ilettiğiniz ad, soyad ve telefon
bilgileriniz; talebinizin ilgili proje geliştiricisine ulaştırılması ve size dönüş
yapılabilmesi amacıyla işlenir. Bu bilgiler yalnızca talebinizi ilettiğiniz firmayla
paylaşılır, üçüncü taraflara satılmaz.

Verileriniz, hizmet sağlayıcımızın Almanya'da bulunan sunucularında saklanır. Bu,
6698 sayılı Kanun kapsamında yurt dışına veri aktarımı anlamına gelir ve açık
rızanızla gerçekleştirilir.

Dilediğiniz zaman verilerinizin silinmesini talep edebilir, rızanızı geri
çekebilirsiniz.`;

export function kvkkHash(metin = KVKK_METNI): string {
  return createHash('sha256').update(metin.trim(), 'utf8').digest('hex').slice(0, 32);
}
