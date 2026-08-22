'use client';

/* ============================================================
   İstemci tarafı olay bildirimi.

   Sayfa GÖRÜNTÜLEMELERİ burada değil, middleware'de sayılıyor
   (bkz. middleware.ts): botlar JavaScript çalıştırmıyor ve arama
   motoru ziyaretleri yalnızca sunucudan görülüyor.

   Burada yalnızca ETKİLEŞİMLER var — bunlar sunucuya hiç uğramıyor:
   filtre değişimi, hızlı bakış, favori, karşılaştırma.

   `sendBeacon` kullanılıyor: sayfa kapanırken bile gönderiliyor ve
   ana iş parçacığını bekletmiyor. `fetch` ile gönderilseydi
   villaya tıklayıp hemen gezinen kullanıcının olayı kaybolurdu.
   ============================================================ */

export type OlayTuru =
  | 'proje-ac' | 'hizli-bakis' | 'filtre' | 'arama' | 'harita' | 'favori'
  | 'karsilastir' | 'whatsapp' | 'telefon' | 'fiyat-alarmi'
  /* Kat planı en çok tıklanan tek görsel; hangi tipin planına
     bakıldığı, hangi tipin talep ürettiğinden bağımsız bir sinyal. */
  | 'kat-plani' | 'daire-tipi'
  /* Numarayı açan kişi ilgilenen kişi — ekranda duran bir numarayı
     kaç kişinin okuduğu ölçülemiyor. */
  | 'numara-goster'
  /* Huni: formu AÇAN ile GÖNDEREN ayrı ölçülüyor. İkisi arasındaki
     fark, formun kendisinin terk edilme oranı. */
  | 'talep-basla' | 'talep-gonder';

export function olayBildir(tur: OlayTuru, hedef?: string, deger?: number): void {
  if (typeof window === 'undefined') return;
  /* Tarayıcı "izleme yapma" diyorsa saymıyoruz. Ölçüm zaten
     kimliksiz ama kullanıcının açık tercihi bundan önce gelir. */
  if (navigator.doNotTrack === '1') return;

  const govde = JSON.stringify({
    tur,
    hedef: hedef?.slice(0, 120),
    deger: Number.isFinite(deger) ? deger : undefined,
    yol: window.location.pathname,
  });

  try {
    const yollandi = navigator.sendBeacon?.('/api/iz', new Blob([govde], { type: 'application/json' }));
    if (yollandi) return;
  } catch { /* sendBeacon yoksa alttaki yedek */ }

  fetch('/api/iz', {
    method: 'POST', body: govde, keepalive: true,
    headers: { 'content-type': 'application/json' },
  }).catch(() => { /* ölçüm sayfayı bozmamalı */ });
}
