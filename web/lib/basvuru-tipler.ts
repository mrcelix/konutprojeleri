/* ============================================================
   Başvuru tipleri.

   `lib/basvuru.ts` sunucuya kilitli (`server-only`); form bileşeni
   istemcide çalışıyor ve sonuç tipini kullanması gerekiyor.
   ============================================================ */

export interface BasvuruSonucu {
  hata?: string;
  alan?: string;
  tamam?: boolean;
  /** Hatada forma geri yazılan değerler — React 19 formu sıfırlıyor */
  degerler?: Record<string, string>;
  /** Kaydedilen başvurunun kimliği — bildirim için */
  basvuruId?: string;
  /**
   * Yeni kayıt mı, var olanın güncellenmesi mi.
   * Mükerrer gönderimde ekibi ikinci kez uyandırmamak için.
   */
  yeniKayit?: boolean;
}

export const BASVURU_EN_COK_MESAJ = 1000;
