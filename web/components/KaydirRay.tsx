'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Icon from './Icon';

/* ============================================================
   Yatay şerit + gezinme okları.

   Şeritler KAYDIRMA ÇUBUĞUYLA değil oklarla geziliyor: kartların
   altındaki ince çubuk bölümün çerçevesini bozuyor ve dokunmatik
   olmayan cihazda tutup sürüklemek gerekiyordu. Kaydırmanın kendisi
   açık (tekerlek, dokunma, klavye) — oklar onun üstüne binen bir
   kolaylık, tek yol değil.

   Oklar yalnızca GİDİLECEK YER VARKEN görünüyor: her zaman duran ama
   çalışmayan bir ok, tıklanınca hiçbir şey olmayan bir düğme demek.
   ============================================================ */

export default function KaydirRay(
  { children, className = '', etiket, yenile }:
  {
    children: ReactNode;
    /** Şeridin kendi sınıfı — kart genişliğini o belirliyor */
    className?: string;
    etiket?: string;
    /** Değişince oklar yeniden hesaplanıyor (içerik değiştiğinde) */
    yenile?: unknown;
  },
) {
  const ray = useRef<HTMLDivElement>(null);
  const [solVar, setSolVar] = useState(false);
  const [sagVar, setSagVar] = useState(false);

  const oklariTazele = useCallback(() => {
    const r = ray.current;
    if (!r) return;
    // 2 piksel pay: tarayıcılar kesirli kaydırma değeri döndürüyor.
    setSolVar(r.scrollLeft > 2);
    setSagVar(r.scrollLeft + r.clientWidth < r.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const r = ray.current;
    if (!r) return;
    oklariTazele();
    r.addEventListener('scroll', oklariTazele, { passive: true });

    /* Şeridin KENDİSİ değil İÇERİĞİ büyüyor: görseller inince
       `scrollWidth` artıyor ama şeridin kutusu aynı kaldığı için
       `ResizeObserver` hiç tetiklenmiyor ve sağ ok görünmüyordu.
       Çocuklar da izleniyor. */
    const olcer = new ResizeObserver(oklariTazele);
    olcer.observe(r);
    for (const c of Array.from(r.children)) olcer.observe(c);
    // Yerleşim oturduktan sonra bir kez daha: ilk karede genişlikler 0.
    const z = setTimeout(oklariTazele, 400);

    return () => {
      clearTimeout(z);
      r.removeEventListener('scroll', oklariTazele);
      olcer.disconnect();
    };
  }, [oklariTazele, yenile]);

  /** Görünen genişliğin yaklaşık %80'i: bir kart bağlam olarak kalıyor. */
  const kaydir = (yon: 1 | -1) => {
    const r = ray.current;
    if (!r) return;
    r.scrollBy({ left: yon * Math.max(200, r.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <div className="ray-sar">
      {solVar && (
        <button type="button" className="ray-ok sol" onClick={() => kaydir(-1)}
          aria-label={etiket ? `${etiket}: öncekiler` : 'Öncekiler'}>
          <Icon n="chevL" s={18} sw={2.4} />
        </button>
      )}
      {sagVar && (
        <button type="button" className="ray-ok sag" onClick={() => kaydir(1)}
          aria-label={etiket ? `${etiket}: sonrakiler` : 'Sonrakiler'}>
          <Icon n="chevR" s={18} sw={2.4} />
        </button>
      )}
      <div className={`kaydir-ray ${className}`.trim()} ref={ray}>{children}</div>
    </div>
  );
}
