/* ============================================================
   Kategori ikon listesi.

   `lib/panel-eylemler.ts` bir `'use server'` dosyası ve YALNIZCA
   async fonksiyon dışa aktarabiliyor; sabit bir dizi orada
   `Failed to collect page data` ile derlemeyi düşürüyor. Hem sunucu
   doğrulaması hem istemci formu aynı listeyi kullanıyor, o yüzden
   ayrı ve yönergesiz bir dosyada duruyor.
   ============================================================ */
export const KATEGORI_IKONLARI = [
  'shield', 'flame', 'waves', 'droplet', 'baby', 'paw', 'heart', 'users',
  'steam', 'access', 'wifi', 'snow', 'grill', 'car', 'wash', 'dish', 'tv',
  'coffee', 'game', 'cam', 'pool', 'kapali', 'manzara', 'agac', 'magaza',
  'perde', 'spark', 'key', 'home', 'star',
] as const;

/* ============================================================
   Proje sabitleri.

   `lib/panel-eylemler.ts` bir `'use server'` dosyası ve YALNIZCA
   async fonksiyon dışa aktarabiliyor; sabit bir dizi orada
   `Failed to collect page data` ile derlemeyi düşürüyor. Hem sunucu
   doğrulaması hem istemci formu aynı listeyi kullanıyor, o yüzden
   ayrı ve yönergesiz bir dosyada duruyor. (Aynı gerekçe:
   `KATEGORI_IKONLARI`.)
   ============================================================ */

export const PROJE_TIPLERI = ['KONUT', 'VILLA', 'OFIS', 'KARMA'] as const;

export const PROJE_DURUMLARI = [
  'YAKINDA', 'SATISTA', 'SON_DAIRELER', 'TUKENDI', 'TESLIM_EDILDI',
] as const;

export const TAPU_DURUMLARI = [
  'KAT_MULKIYETI', 'KAT_IRTIFAKI', 'ARSA_TAPULU', 'HISSELI', 'TAHSIS',
] as const;

export const ODEME_SEKILLERI = [
  'BELIRTILMEDI', 'PESIN', 'KREDI', 'TAKSIT', 'TAKAS',
] as const;

export const TALEP_DURUMLARI = [
  'YENI', 'ARANDI', 'ULASILAMADI', 'RANDEVU', 'ILGILENMIYOR', 'SATIS', 'KAPANDI',
] as const;

export const TALEP_NIYETLERI = ['BILGI', 'FIYAT_LISTESI', 'KATALOG', 'RANDEVU'] as const;
