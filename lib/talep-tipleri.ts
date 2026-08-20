/**
 * Talepler · saf tipler ve etiketler.
 *
 * BU DOSYA VERİTABANINA DOKUNMAZ. Talep satırı bir istemci bileşeni;
 * bunları sorgu modülünden alsaydı postgres sürücüsü tarayıcı paketine
 * girer ve derleme kırılırdı. (lib/bant.ts ve lib/onay-tipleri.ts ile
 * aynı sebep — bu üçüncüsü, artık kalıp belli.)
 */

export type Talep = {
  id: number;
  ad: string;
  telefon_maskeli: string;
  daire_tipi: string | null;
  butce_min: number | null;
  butce_max: number | null;
  tasinma: string | null;
  kaynak_sayfa: string | null;
  uyum_skoru: number | null;
  durum: string;
  proje_id: number | null;
  proje_ad: string | null;
  il: string | null;
  ilce: string | null;
  firma_ad: string | null;
  olusturuldu: string;
  acilma_zamani: string | null;
  /** Açılmamışsa bekleme saati, açılmışsa yanıt süresi. */
  saat: number | null;
};

export const TALEP_DURUMLARI: Record<string, string> = {
  yeni: 'Yeni',
  iletildi: 'İletildi',
  acildi: 'Açıldı',
  randevu: 'Randevu',
  satis: 'Satış',
  kayip: 'Kayıp',
  spam: 'Spam',
};
