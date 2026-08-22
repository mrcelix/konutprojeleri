import 'server-only';
import { prisma } from '../db';
import type { EngelSebebi, Kanal } from '../generated/prisma';

/* ============================================================
   Gönderim engeli (suppression list).

   Neden gerekli: ölü adreslere ısrarla göndermek sağlayıcı nezdinde
   "bounce oranı" olarak birikir. Resend'de %5, çoğu SMTP sağlayıcısında
   benzer bir eşik var; aşıldığında hesap askıya alınıyor. Bir kez kalıcı
   hata veren adrese bir daha göndermemek bu yüzden isteğe bağlı değil.

   Spam şikâyeti daha da ağır: alan adı itibarını doğrudan yakar ve
   toparlanması aylar sürer. Şikâyet eden adrese işlemsel e-posta bile
   göndermiyoruz.

   Engel kuyruğun ÖNÜNDE uygulanıyor — kayıt hiç oluşturulmuyor.
   ============================================================ */

/** E-posta küçük harfe, telefon E.164'e indirgenir. Karşılaştırma bunun üzerinden. */
export function adresNormalle(kanal: Kanal, adres: string): string {
  const t = adres.trim();
  if (kanal === 'EPOSTA') return t.toLowerCase();

  // Telefon: boşluk, tire, parantez temizlenir
  const rakam = t.replace(/[^\d+]/g, '');
  if (rakam.startsWith('+')) return rakam;
  // Türkiye için yaygın yazımlar: 0532…, 532…, 90532…
  if (rakam.startsWith('00')) return `+${rakam.slice(2)}`;
  if (rakam.startsWith('90') && rakam.length === 12) return `+${rakam}`;
  if (rakam.startsWith('0') && rakam.length === 11) return `+90${rakam.slice(1)}`;
  if (rakam.length === 10) return `+90${rakam}`;
  return `+${rakam}`;
}

/** E.164 biçim denetimi — veritabanı kısıtıyla aynı kural. */
export function telefonGecerli(e164: string): boolean {
  return /^\+[1-9][0-9]{7,14}$/.test(e164);
}

/** Bu adrese gönderim yapılabilir mi? */
export async function engelliMi(kanal: Kanal, adres: string): Promise<boolean> {
  const a = adresNormalle(kanal, adres);
  const kayit = await prisma.gonderimEngeli.findUnique({
    where: { kanal_adres: { kanal, adres: a } },
    select: { id: true },
  });
  return kayit !== null;
}

/**
 * Adresi engel listesine ekler. Zaten varsa sebebi günceller —
 * "kalıcı hata" iken gelen "şikâyet" daha ağır bir sinyal.
 */
export async function engelEkle(
  kanal: Kanal,
  adres: string,
  sebep: EngelSebebi,
  kaynak: string,
  detay?: string,
): Promise<void> {
  const a = adresNormalle(kanal, adres);
  if (a.length <= 3) return;

  await prisma.gonderimEngeli.upsert({
    where: { kanal_adres: { kanal, adres: a } },
    create: { kanal, adres: a, sebep, kaynak, detay: detay ?? null },
    update: { sebep, kaynak, detay: detay ?? null },
  });
}

/**
 * Engeli kaldırır.
 *
 * Yalnızca yönetici elle yapabilmeli: kullanıcı adresini düzeltmiş
 * ya da yanlışlıkla şikâyet etmiş olabilir. Otomatik kaldırma yok —
 * o, engellemenin anlamını ortadan kaldırırdı.
 */
export async function engelKaldir(kanal: Kanal, adres: string): Promise<boolean> {
  const a = adresNormalle(kanal, adres);
  const { count } = await prisma.gonderimEngeli.deleteMany({ where: { kanal, adres: a } });
  return count > 0;
}

/** Panel için özet ve son kayıtlar. */
export async function engelOzeti(limit = 100) {
  const [toplam, kirilim, sonKayitlar] = await Promise.all([
    prisma.gonderimEngeli.count(),
    prisma.gonderimEngeli.groupBy({ by: ['kanal', 'sebep'], _count: true }),
    prisma.gonderimEngeli.findMany({ orderBy: { olusturma: 'desc' }, take: limit }),
  ]);
  return { toplam, kirilim, sonKayitlar };
}
