'use client';

import { useReportWebVitals } from 'next/web-vitals';

/* ============================================================
   Core Web Vitals gönderimi.

   `sendBeacon` kullanılıyor: sayfa kapanırken bile isteği tamamlıyor
   ve ana iş parçacığını bloklamıyor. `fetch` sayfa kapanışında iptal
   edilir ve son ölçümler (özellikle INP ve CLS) hiç ulaşmaz.

   Örnekleme: her ziyaretin %20'si. Tam ölçüm veritabanını gereksiz
   şişiriyor; %20 eğilimi görmeye fazlasıyla yetiyor.
   ============================================================ */

const ORAN = 0.2;

export default function Olcum() {
  useReportWebVitals((olcum) => {
    if (Math.random() > ORAN) return;
    if (!['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].includes(olcum.name)) return;

    const veri = JSON.stringify({
      yol: window.location.pathname,
      metrik: olcum.name,
      // CLS ondalıklı, diğerleri milisaniye
      deger: olcum.name === 'CLS' ? olcum.value : Math.round(olcum.value),
      derece: olcum.rating,
      cihaz: window.innerWidth < 768 ? 'mobil' : 'masaustu',
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/olcum', new Blob([veri], { type: 'application/json' }));
      } else {
        void fetch('/api/olcum', { method: 'POST', body: veri, keepalive: true });
      }
    } catch { /* ölçüm gönderilememesi kullanıcıyı etkilememeli */ }
  });

  return null;
}
