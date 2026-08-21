import Image from 'next/image';
import { havuzGorseli, projeKapagi, type GorselTuru } from '@/lib/gorsel-havuzu';

/**
 * Sayfa görselleri.
 *
 * Kaynak sırası: PROJENİN KENDİ FOTOĞRAFI → stok havuzu. Havuz
 * `lib/gorsel-havuzu.ts` içinde ve oradaki her kare tek tek gözden
 * geçirildi.
 *
 * Buradaki bileşenler yalnızca doğru kareyi seçip `next/image`e
 * veriyor; çerçeve, oran ve kırpma tasarım sisteminin işi
 * (`.vcard-media`, `.region`, `.surec-foto` kendi `aspect-ratio`sunu
 * taşıyor).
 *
 * Önceki sürüm elle çizilmiş SVG manzaralardı — 69 sabit renk kodu,
 * hiçbiri tokendan gelmiyordu. Tema doğru uygulandığı halde sayfa
 * pastel görünüyordu, çünkü bu görseller sayfanın en büyük yüzeyini
 * kaplıyor.
 */

/** Kart ve bölge görsellerinin ortak boyut ipucu. */
const KART_BOYUT = '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw';

/**
 * Hero fotoğrafı.
 *
 * `priority` — ilk ekranın tamamını kaplıyor ve LCP ögesi. Tembel
 * yüklenirse ilk boyamada hero boş kalıyor.
 *
 * `quality` kart havuzundan yüksek: hero geniş ekranda 2400 px'e
 * kadar açılıyor ve kart ayarında gözle görülür şekilde bulanık.
 */
export function HeroGorseli({ src, alt }: { src: string; alt?: string }) {
  return (
    <Image
      src={src}
      alt={alt ?? ''}
      fill
      priority
      quality={80}
      sizes="100vw"
      className="hero-kare on"
      style={{ objectFit: 'cover' }}
    />
  );
}

/**
 * Proje kartı görseli.
 *
 * Anahtar proje slug'ı: aynı proje her zaman aynı kareyi alıyor.
 * Rastgele seçim hem hydration uyuşmazlığı üretir hem de ziyaretçi
 * geri döndüğünde projeyi tanıyamaz.
 */
export function KartGorseli({
  tip, slug, ad,
}: {
  tip: string;
  slug: string;
  ad: string;
}) {
  return (
    <Image
      src={projeKapagi({ kapak: null, slug, tip })}
      alt={ad}
      fill
      quality={72}
      sizes={KART_BOYUT}
      className="vcard-img"
      style={{ objectFit: 'cover' }}
    />
  );
}

/** Bölge kartı görseli. */
export function BolgeGorseli({
  tur, anahtar, ad,
}: {
  tur: 'sahil' | 'sehir';
  anahtar: string;
  ad: string;
}) {
  return (
    <Image
      src={havuzGorseli(tur, anahtar)}
      alt={ad}
      fill
      quality={72}
      sizes={KART_BOYUT}
      style={{ objectFit: 'cover' }}
    />
  );
}

/** Süreç adımı görseli — havuz türü çağıran tarafça seçiliyor. */
export function AdimGorseli({
  tur, anahtar, alt,
}: {
  tur: GorselTuru;
  anahtar: string;
  alt?: string;
}) {
  return (
    <Image
      src={havuzGorseli(tur, anahtar)}
      alt={alt ?? ''}
      fill
      quality={70}
      sizes="(max-width: 700px) 50vw, 25vw"
      style={{ objectFit: 'cover' }}
    />
  );
}
