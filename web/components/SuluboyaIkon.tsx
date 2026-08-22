'use client';

import { useId } from 'react';
import Icon from './Icon';
import type { IkonAdi } from '@/lib/types';

/* ============================================================
   Suluboya ikon.

   Mega menüdeki çizgi ikonlar teknik ve birbirine benziyordu: yirmi
   madde art arda gelince hiçbiri ayırt edilmiyordu. Burada her
   maddenin arkasında SULUBOYA LEKESİ var — konuya göre renkli,
   kenarları düzensiz.

   Görsel dosyası YOK: leke SVG'de üretiliyor. Yirmi kategori için
   yirmi PNG, hem indirilecek ağırlık hem de koyu temada ikinci bir
   set demekti. `feTurbulence` + `feDisplacementMap` kenarı boya gibi
   dalgalandırıyor, iki katmanlı degrade de kâğıda çekilmiş boya
   izlenimi veriyor.

   Renk KATEGORİYE bağlı ve sabit: aynı ikon her yerde aynı tonda
   çıkmalı, yoksa menü her açılışta başka görünürdü. Ton, ikon adının
   basit bir özetinden türetiliyor.
   ============================================================ */

/** Ada göre sabit ton (0–360). Aynı ad → aynı renk. */
function ton(ad: string): number {
  let t = 0;
  for (let i = 0; i < ad.length; i++) t = (t * 31 + ad.charCodeAt(i)) % 360;
  return t;
}

/** Bazı konuların rengi ANLAM taşıyor; onlar elle bağlanıyor. */
const SABIT_TON: Partial<Record<IkonAdi, number>> = {
  waves: 196,   // deniz
  droplet: 205, // havuz
  flame: 18,    // ısıtma
  agac: 128,    // doğa
  heart: 340,   // balayı
  paw: 32,      // evcil hayvan
  baby: 46,     // çocuk
  shield: 248,  // korunaklı
  snow: 190,
  sun: 42,
  pin: 262,
  home: 258,
};

export default function SuluboyaIkon(
  { n, s = 22 }: { n: IkonAdi; s?: number },
) {
  const kimlik = useId().replace(/:/g, '');
  const h = SABIT_TON[n] ?? ton(n);

  return (
    <span className="sb-ikon" style={{ '--sb-h': h } as React.CSSProperties}>
      <svg className="sb-leke" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <defs>
          <filter id={`sb-f-${kimlik}`} x="-25%" y="-25%" width="150%" height="150%">
            {/* Düşük frekanslı gürültü kenarı dalgalandırıyor: düzgün
                bir daire "vektör", dalgalı kenar "fırça" okunuyor. */}
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="7" result="g" />
            <feDisplacementMap in="SourceGraphic" in2="g" scale="7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <radialGradient id={`sb-g-${kimlik}`} cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor={`hsl(${h} 85% 72%)`} stopOpacity=".95" />
            <stop offset="55%" stopColor={`hsl(${h} 72% 62%)`} stopOpacity=".8" />
            <stop offset="100%" stopColor={`hsl(${(h + 24) % 360} 65% 52%)`} stopOpacity=".55" />
          </radialGradient>
        </defs>
        <g filter={`url(#sb-f-${kimlik})`}>
          {/* Alt katman biraz kaymış ve soluk: suluboyada boya iki
              geçişte birikiyor, tek katman düz bir daire gibi
              duruyordu. */}
          <circle cx="30" cy="34" r="24" fill={`hsl(${h} 70% 66%)`} opacity=".38" />
          <circle cx="33" cy="30" r="23" fill={`url(#sb-g-${kimlik})`} />
        </g>
      </svg>
      <Icon n={n} s={s} sw={1.9} />
    </span>
  );
}
