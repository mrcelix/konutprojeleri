/**
 * `iyzipay` paketi tip tanımı içermiyor. Yalnızca kullandığımız yüzeyi
 * tanımlıyoruz — böylece yanlış alan adı yazarsak derleme hatası alırız,
 * SDK'nın tamamını kopyalamak zorunda kalmadan.
 */
declare module 'iyzipay' {
  type GeriCagirim = (err: unknown, sonuc: Record<string, unknown>) => void;

  interface Ayarlar {
    apiKey: string;
    secretKey: string;
    uri: string;
  }

  interface Kaynak {
    create(istek: Record<string, unknown>, cb: GeriCagirim): void;
    retrieve(istek: Record<string, unknown>, cb: GeriCagirim): void;
  }

  class Iyzipay {
    constructor(ayarlar: Ayarlar);

    checkoutFormInitialize: Kaynak;
    checkoutForm: Kaynak;
    payment: Kaynak;
    refund: Kaynak;
    cancel: Kaynak;

    static LOCALE: { TR: string; EN: string };
    static CURRENCY: { TRY: string; EUR: string; USD: string; GBP: string };
    static PAYMENT_GROUP: { PRODUCT: string; LISTING: string; SUBSCRIPTION: string };
    static BASKET_ITEM_TYPE: { PHYSICAL: string; VIRTUAL: string };
    static PAYMENT_CHANNEL: Record<string, string>;
    static REFUND_REASON: Record<string, string>;
  }

  export = Iyzipay;
}
