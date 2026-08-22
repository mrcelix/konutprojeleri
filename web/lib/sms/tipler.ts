import 'server-only';

/* ============================================================
   SMS sağlayıcı sözleşmesi.

   E-postadaki desenin aynısı: uygulama sağlayıcıyı bilmez.
   ============================================================ */

export interface SmsMesaji {
  /** E.164 biçiminde: +905321234567 */
  alici: string;
  metin: string;
}

export interface SmsSonucu {
  basarili: boolean;
  referans?: string;
  hata?: string;
  /** Kalıcı hata (numara yok, kapalı hat) — yeniden denenmemeli */
  kalici?: boolean;
}

export interface SmsSaglayici {
  ad: string;
  /** false ise gerçekten gönderim yapılmıyor (geliştirme) */
  gercek: boolean;
  gonder(mesaj: SmsMesaji): Promise<SmsSonucu>;
}
