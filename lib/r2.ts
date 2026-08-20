import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Cloudflare R2.
 *
 * DOSYA SUNUCUMUZDAN GEÇMEZ. Tarayıcı, imzalı bir adresle dosyayı
 * doğrudan R2'ye yükler; sunucu yalnızca izin verir ve sonucu
 * veritabanına yazar. İki sebep:
 *
 *  1. Vercel fonksiyonlarının istek gövdesi sınırı 4,5 MB. Villa
 *     fotoğrafı rahatlıkla bunu aşar; sunucudan geçirmek mimariyi
 *     ilk büyük dosyada duvara toslatırdı.
 *  2. 20 GB medyayı sunucu üzerinden akıtmak, ödemesi gereksiz bir
 *     bant genişliği faturasıdır. R2'ye doğrudan yüklemede çıkış
 *     trafiği zaten ücretsiz.
 *
 * İSTEMCİ ANAHTARI GÖRMEZ. İmzalı adres 10 dakika geçerlidir ve
 * yalnızca tek bir anahtara, tek bir içerik tipine yazma izni verir.
 */

const HESAP = process.env.R2_ACCOUNT_ID;
const ANAHTAR = process.env.R2_ACCESS_KEY_ID;
const GIZLI = process.env.R2_SECRET_ACCESS_KEY;
export const KOVA = process.env.R2_BUCKET ?? 'konutprojeleri';

export function r2Hazir(): boolean {
  return !!(HESAP && ANAHTAR && GIZLI);
}

let istemci: S3Client | null = null;

/**
 * Bağlantı tembel kurulur — lib/db.ts ile aynı sebep: R2 değişkenleri
 * olmayan ortamda (CI, önizleme derlemesi) modül yüklenirken patlamak
 * derlemeyi kırar.
 */
function baglan(): S3Client {
  if (istemci) return istemci;
  if (!r2Hazir()) {
    throw new Error(
      'R2 yapılandırılmamış: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID ve ' +
      'R2_SECRET_ACCESS_KEY tanımlı olmalı.'
    );
  }
  istemci = new S3Client({
    region: 'auto',
    endpoint: `https://${HESAP}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ANAHTAR!, secretAccessKey: GIZLI! },
  });
  return istemci;
}

/** İzin verilen görsel tipleri. Video ve belge ayrı akışta ele alınır. */
export const GORSEL_TIPLERI = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/avif',
]);

/** 25 MB. Bunun üstü ham makine çıktısıdır; küçültülmeden yüklenmemeli. */
export const AZAMI_BOYUT = 25 * 1024 * 1024;

/**
 * R2 anahtarı üretir.
 *
 * Kullanıcının dosya adı KULLANILMAZ. Türkçe karakter, boşluk ve
 * yol ayracı içeren adlar CDN'de sorun çıkarır; ayrıca dosya adı
 * üzerinden başka bir projenin klasörüne yazma denemesi de böylece
 * imkânsız olur.
 */
export function medyaAnahtari(projeId: number, tur: string, uzanti: string): string {
  const rastgele = crypto.randomUUID().slice(0, 12);
  return `projeler/${projeId}/${tur}/${rastgele}.${uzanti}`;
}

export function uzantiCoz(icerikTipi: string): string | null {
  switch (icerikTipi) {
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/webp': return 'webp';
    case 'image/avif': return 'avif';
    default: return null;
  }
}

/** Tarayıcının doğrudan PUT edebileceği imzalı adres. */
export async function yuklemeAdresi(
  anahtar: string,
  icerikTipi: string,
  boyut: number
): Promise<string> {
  return getSignedUrl(
    baglan(),
    new PutObjectCommand({
      Bucket: KOVA,
      Key: anahtar,
      ContentType: icerikTipi,
      // Boyut imzaya girmez ama R2'ye bildirilir; imzalı adresin
      // sınırsız yükleme için kullanılmasını engellemek amacıyla
      // sunucu tarafında ayrıca doğrulanır.
      ContentLength: boyut,
    }),
    { expiresIn: 600 }
  );
}

export async function medyaSil(anahtar: string): Promise<void> {
  await baglan().send(new DeleteObjectCommand({ Bucket: KOVA, Key: anahtar }));
}

/** Görselin herkese açık adresi — Next <Image> loader'ı da bunu kullanır. */
export function medyaUrl(anahtar: string): string {
  const cdn = process.env.NEXT_PUBLIC_CDN_URL ?? 'https://cdn.konutprojeleri.com';
  return `${cdn}/${anahtar.replace(/^\/+/, '')}`;
}
