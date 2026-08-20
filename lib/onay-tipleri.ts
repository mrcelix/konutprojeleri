/**
 * Onay kuyruğu · saf tipler ve etiketler.
 *
 * BU DOSYA VERİTABANINA DOKUNMAZ ve dokunmamalı. Onay kartı bir
 * istemci bileşeni; bunları sorgu modülünden alsaydı revalidateTag ve
 * postgres sürücüsü tarayıcı paketine girer ve derleme kırılırdı.
 * (lib/bant.ts ile aynı sebep.)
 */

export type DegisiklikPaketi = {
  alanlar?: Record<string, { eski: unknown; yeni: unknown }>;
  daireler?: {
    id: number | null;
    tip: string;
    net_m2: number | null;
    brut_m2: number | null;
    liste_fiyati: number | null;
    toplam_adet: number | null;
    kalan_adet: number | null;
  }[];
};

export type BekleyenOnay = {
  id: number;
  firma_id: number;
  firma_ad: string;
  proje_id: number;
  proje_ad: string;
  proje_slug: string;
  il: string;
  ilce: string;
  degisiklik: DegisiklikPaketi;
  isaretler: string[];
  gonderildi: string;
};

export const ISARET_ADLARI: Record<string, string> = {
  fiyat_sicramasi: '%20 üstü fiyat değişimi',
  stok_artisi: 'Stok artışı',
  durum_degisti: 'Durum değişikliği',
  ilk_yayin: 'İlk yayın başvurusu',
};
