/* ============================================================
   E-posta sağlayıcı sözleşmesi.

   Ödeme katmanındaki desenin aynısı: uygulama sağlayıcıyı bilmez,
   yalnızca bu arayüzü çağırır. Yeni sağlayıcı eklemek tek dosya.
   ============================================================ */

export interface EpostaMesaji {
  alici: string;
  aliciAd: string;
  konu: string;
  html: string;
  metin: string;
  /** Yanıtla düğmesi bu adrese gitsin (firma/ziyaretçi yazışması için) */
  yanitAdresi?: string;
}

export interface GonderimSonucu {
  basarili: boolean;
  referans?: string;
  hata?: string;
}

export interface EpostaSaglayici {
  ad: string;
  /** Gerçekten e-posta gidiyor mu? Panelde uyarı göstermek için. */
  gercek: boolean;
  gonder(mesaj: EpostaMesaji): Promise<GonderimSonucu>;
}
