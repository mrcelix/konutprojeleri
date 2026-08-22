import 'server-only';
import { supabaseSurucu } from './supabase';
import { yerelSurucu } from './yerel';

/* ============================================================
   Nesne deposu soyutlaması.

   Proje görselleri veritabanına değil dosya deposuna gidiyor.
   Sağlayıcı `DEPO_SURUCU` ile seçiliyor; kodun geri kalanı hangisi
   olduğunu bilmiyor.

   İki sürücü var:
     · yerel     — geliştirme. Diske yazıyor, /api/gorsel'den servis.
     · supabase  — üretim. Supabase Storage (zaten oradayız, yeni
                   hesap gerekmiyor).

   YEREL SÜRÜCÜ VERCEL'DE ÇALIŞMAZ: dosya sistemi salt okunur ve her
   dağıtım yeni bir makine. Sessizce bozulmasın diye üretimde açıkça
   reddediyor.
   ============================================================ */

export interface DepoSurucu {
  ad: string;
  yaz(anahtar: string, veri: Buffer, icerikTipi: string): Promise<void>;
  sil(anahtar: string): Promise<void>;
  /** Herkese açık okuma adresi */
  url(anahtar: string): string;
}

/* Değer TIRNAKTAN da temizleniyor: `.env` dosyasında `="yerel"`
   yazımı alışkanlık, Vercel'in arayüzünde ise tırnak değerin PARÇASI
   oluyor ve `"supabase"` değeri "bilinmeyen sürücü" sayılıyordu. */
const surucuAdi = () =>
  (process.env.DEPO_SURUCU ?? '').trim().replace(/^["']|["']$/g, '').toLowerCase();

let onbellek: DepoSurucu | null | undefined;

/** Yapılandırılmış sürücü; kurulmamışsa null. */
export function depo(): DepoSurucu | null {
  if (onbellek !== undefined) return onbellek;

  const secim = surucuAdi();
  if (secim === 'supabase') onbellek = supabaseSurucu();
  else if (secim === 'yerel') onbellek = yerelSurucu();
  else onbellek = null;

  return onbellek;
}

/** Testlerin env değiştirip yeniden sorabilmesi için. */
export function depoOnbelleginiTemizle() { onbellek = undefined; }

/**
 * Depo neden kullanılamıyor — panelde göstermek için.
 * `null` dönerse her şey yolunda.
 */
export function depoEksigi(): string | null {
  const secim = surucuAdi();
  if (!secim) return 'DEPO_SURUCU tanımlı değil — yükleme kapalı, adres girerek ekleyebilirsiniz.';
  if (secim === 'yerel' && process.env.NODE_ENV === 'production') {
    return 'Yerel sürücü üretimde çalışmaz (dosya sistemi salt okunur). DEPO_SURUCU=supabase kullanın.';
  }
  if (secim === 'supabase' && !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE)) {
    return 'SUPABASE_URL veya SUPABASE_SERVICE_ROLE eksik.';
  }
  if (secim !== 'yerel' && secim !== 'supabase') return `Bilinmeyen DEPO_SURUCU: ${secim}`;
  return null;
}

/**
 * Nesne anahtarı üretir: proje/<projeId>/<rastgele>.webp
 *
 * Dosya adı kullanıcıdan GELMİYOR. Gelseydi yol geçişi (../),
 * kodlanmış karakterler ve çakışma sorunlarını tek tek elemek
 * gerekirdi; rastgele ad bu sınıfın tamamını ortadan kaldırıyor.
 */
export function anahtarUret(projeId: string, rastgele: string): string {
  return `proje/${projeId}/${rastgele}.webp`;
}

/**
 * Hero görselinin anahtarı: hero/<rastgele>.webp
 *
 * Hero bir projeye bağlı değil; site geneline ait. Proje klasörüne
 * yazmak, proje silinince hero görselinin de temizlenmesi gereken
 * bir bağ kurardı.
 */
export function heroAnahtarUret(rastgele: string): string {
  return `hero/${rastgele}.webp`;
}

/** Anahtar biçimi — yerel sürücünün servis yolunda yol geçişine karşı. */
export const ANAHTAR_KALIBI = /^(proje\/[A-Za-z0-9_-]+|hero)\/[A-Za-z0-9_-]+\.webp$/;
