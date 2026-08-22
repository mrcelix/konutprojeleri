'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

/* ============================================================
   Başa dön düğmesi.

   WhatsApp düğmesinin hemen ÜSTÜNDE, aynı köşede duruyor: sayfa
   uzun (ana sayfada on bölüm, arama sayfasında yüzlerce kart) ve
   aşağıdan başa dönmek için tekerlekle onlarca ekran geri gelmek
   gerekiyordu.

   Bir ekran boyu kaydırılmadan GÖRÜNMÜYOR: sayfanın başındayken
   "başa dön" demek, hiçbir işe yaramayan bir düğmeyi kalıcı olarak
   ekranda tutmak olurdu.
   ============================================================ */

/** Bu kadar kaydırıldıktan sonra beliriyor (bir ekran boyu). */
const ESIK_ORANI = 1;

export default function YukariDugmesi() {
  const [gorunur, setGorunur] = useState(false);

  useEffect(() => {
    const bak = () => setGorunur(window.scrollY > window.innerHeight * ESIK_ORANI);
    bak();
    window.addEventListener('scroll', bak, { passive: true });
    window.addEventListener('resize', bak);
    return () => {
      window.removeEventListener('scroll', bak);
      window.removeEventListener('resize', bak);
    };
  }, []);

  return (
    <button
      type="button"
      className={'yukari-dugme' + (gorunur ? ' gorunur' : '')}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Sayfanın başına dön"
      /* Görünmezken odak sırasından da çıkıyor: klavyeyle gezen
         kullanıcı, ekranda olmayan bir düğmeye takılmamalı. */
      tabIndex={gorunur ? 0 : -1}
      aria-hidden={!gorunur}
    >
      <Icon n="chevU" s={17} sw={2.6} />
    </button>
  );
}
