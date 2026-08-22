import 'server-only';
import sharp from 'sharp';

/* ============================================================
   Yüklenen görselin işlenmesi.

   Üç iş yapıyor ve üçü de güvenlik gerekçeli:

   1. TÜRÜ İÇERİKTEN OKUYOR. Tarayıcının gönderdiği `Content-Type`
      istemci verisi; ".jpg" uzantısı da öyle. İlk baytlara bakmadan
      "bu bir resim" demek, resim olmayan bir şeyi resim diye
      yayınlamak demek.

   2. YENİDEN KODLUYOR. Girdi baytları hiçbir zaman olduğu gibi
      servis edilmiyor. Aynı anda hem geçerli JPEG hem geçerli HTML
      olan dosyalar (polyglot) yeniden kodlamadan sağ çıkamıyor.

   3. ÜST VERİYİ SİLİYOR. Telefonla çekilmiş şantiye fotoğrafı EXIF
      içinde GPS koordinatı taşıyor. Şantiyenin yaklaşık konumunu
      bilerek yayınlıyoruz; şantiyenin tam koordinatını
      yayınlamak başka bir şey. `sharp` üst veriyi varsayılan olarak
      düşürüyor — buna güvenmek yerine test ediyoruz.
   ============================================================ */

/** En büyük kabul edilen dosya. Telefon fotoğrafları 3–8 MB bandında. */
export const EN_COK_BAYT = 12 * 1024 * 1024;
/** Tek istekte en çok dosya. */
export const EN_COK_DOSYA = 20;
/** Bir projede en çok görsel. */
export const PROJE_EN_COK_GORSEL = 40;
/** Çıktı uzun kenarı. 2400 px, 4K ekranda tam genişlik galeriye yetiyor. */
export const HEDEF_GENISLIK = 2400;
/** Sıkıştırma kalitesi. 82 ile 90 arası fark gözle görülmüyor, dosya %35 büyüyor. */
const KALITE = 82;

/**
 * Çözülmüş piksel sınırı — sıkıştırma bombasına karşı.
 *
 * 30 000 × 30 000 PNG birkaç yüz kilobayt sıkışabiliyor ama açılınca
 * gigabaytlarca bellek istiyor. Boyut sınırı bunu yakalamıyor.
 */
const EN_COK_PIKSEL = 80_000_000;

export interface IslenmisGorsel {
  veri: Buffer;
  genislik: number;
  yukseklik: number;
  icerikTipi: 'image/webp';
}

export interface IslemeSonucu {
  tamam: boolean;
  hata?: string;
  gorsel?: IslenmisGorsel;
}

/** İlk baytlardan gerçek türü okur. Uzantıya ve Content-Type'a bakmıyor. */
export function turuOku(veri: Buffer): string | null {
  if (veri.length < 12) return null;

  if (veri[0] === 0xff && veri[1] === 0xd8 && veri[2] === 0xff) return 'jpeg';
  if (veri.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (veri.subarray(0, 4).toString('latin1') === 'RIFF'
    && veri.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';

  // HEIC/HEIF: ISO-BMFF kutusu, 4. bayttan itibaren "ftyp" + marka
  if (veri.subarray(4, 8).toString('latin1') === 'ftyp') {
    const marka = veri.subarray(8, 12).toString('latin1');
    if (['heic', 'heix', 'hevc', 'mif1', 'msf1', 'heim'].includes(marka)) return 'heif';
    if (marka === 'avif') return 'avif';
  }
  return null;
}

/** Kurulu sharp bu türü çözebiliyor mu — HEIC her derlemede yok. */
function okuyabilirMi(tur: string): boolean {
  if (tur === 'heif') return sharp.format.heif?.input?.buffer === true;
  if (tur === 'avif') return sharp.format.heif?.input?.buffer === true;
  return true;
}

export async function gorseliIsle(veri: Buffer): Promise<IslemeSonucu> {
  if (veri.length === 0) return { tamam: false, hata: 'Dosya boş.' };
  if (veri.length > EN_COK_BAYT) {
    return { tamam: false, hata: `Dosya çok büyük (${Math.round(veri.length / 1048576)} MB). En çok ${EN_COK_BAYT / 1048576} MB.` };
  }

  const tur = turuOku(veri);
  if (!tur) {
    return { tamam: false, hata: 'Bu bir görsel dosyası değil. JPEG, PNG veya WebP yükleyin.' };
  }
  if (!okuyabilirMi(tur)) {
    /* iPhone varsayılan olarak HEIC çekiyor ve Türkiye'deki ev
       sahiplerinin çoğu telefonla fotoğraf gönderiyor. "Desteklenmiyor"
       deyip bırakmak, kişiyi çözümü aramaya bırakır. */
    return {
      tamam: false,
      hata: 'HEIC/HEIF desteklenmiyor. iPhone’da Ayarlar → Kamera → Formatlar → '
        + '“En Uyumlu” seçip yeniden çekin, ya da fotoğrafı JPEG olarak dışa aktarın.',
    };
  }

  try {
    const boru = sharp(veri, { limitInputPixels: EN_COK_PIKSEL, failOn: 'error' });
    const bilgi = await boru.metadata();
    if (!bilgi.width || !bilgi.height) {
      return { tamam: false, hata: 'Görselin boyutları okunamadı, dosya bozuk olabilir.' };
    }
    if (bilgi.width < 800 || bilgi.height < 600) {
      return {
        tamam: false,
        hata: `Çözünürlük çok düşük (${bilgi.width}×${bilgi.height}). En az 800×600 gerekiyor.`,
      };
    }

    const cikti = await sharp(veri, { limitInputPixels: EN_COK_PIKSEL })
      /* `rotate()` argümansız çağrılınca EXIF yönünü uygular ve etiketi
         düşürür. Olmadan, dik çekilmiş telefon fotoğrafları üst veri
         silinince yan yatıyor. */
      .rotate()
      .resize({ width: HEDEF_GENISLIK, withoutEnlargement: true })
      // withMetadata() ÇAĞRILMIYOR: EXIF/GPS burada düşüyor
      .webp({ quality: KALITE })
      .toBuffer({ resolveWithObject: true });

    return {
      tamam: true,
      gorsel: {
        veri: cikti.data,
        genislik: cikti.info.width,
        yukseklik: cikti.info.height,
        icerikTipi: 'image/webp',
      },
    };
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (/pixel|limit/i.test(m)) return { tamam: false, hata: 'Görsel çözünürlüğü sınırın üstünde.' };
    return { tamam: false, hata: 'Görsel işlenemedi, dosya bozuk olabilir.' };
  }
}
