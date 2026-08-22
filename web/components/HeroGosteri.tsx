'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { HeroKare } from '@/lib/hero';

/* ============================================================
   Hero gösterisi.

   Tek fotoğraf sabit duruyordu. Birden fazla kare varsa yavaş bir
   geçişle dönüyor ve fotoğraf hafifçe yakınlaşıyor (Ken Burns):
   hareketsiz bir bant, sitenin ilk ekranını durgun gösteriyordu.

   Hareket `prefers-reduced-motion` altında TAMAMEN duruyor — ilk kare
   sabit kalıyor. Hareket hassasiyeti olan biri için yavaşça kayan
   büyük bir fotoğraf, süslemeden fazlası.

   Tek kare varsa zamanlayıcı hiç kurulmuyor: her 6 saniyede bir
   yeniden çizim, tek fotoğrafta boşa iş.
   ============================================================ */

const SURE_MS = 6000;

export default function HeroGosteri({ kareler }: { kareler: HeroKare[] }) {
  const [i, setI] = useState(0);
  const durduRef = useRef(false);

  useEffect(() => {
    if (kareler.length < 2) return;
    const azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (azHareket) return;

    /* İLK KARE AÇILIŞ SAHNESİNİ BEKLİYOR. Sayfa açıldığında hero beş
       saniye yalnızca fotoğrafı gösteriyor, sonra bloklar sırayla
       giriyor (bkz. `globals.css` → `hero-belir`). Kare tam o sırada
       değişince iki hareket üst üste biniyor ve ikisi de silikleşiyordu.

       Sahne atlanmışsa (aynı sekmede ikinci ziyaret; işareti
       `app/page.tsx` koyuyor) normal süre geçerli. */
    const sahne = !document.documentElement.classList.contains('hero-atla');
    let dongu: ReturnType<typeof setInterval> | undefined;
    const ilk = setTimeout(() => {
      dongu = setInterval(() => {
        if (!durduRef.current) setI((k) => (k + 1) % kareler.length);
      }, SURE_MS);
      if (!durduRef.current) setI((k) => (k + 1) % kareler.length);
    }, sahne ? 8500 : SURE_MS);

    return () => { clearTimeout(ilk); if (dongu) clearInterval(dongu); };
  }, [kareler.length]);

  return (
    <div
      className="hero-foto"
      /* İmleç bandın üzerindeyken geçiş duruyor: kullanıcı arama
         kutusunu doldururken arkasındaki fotoğrafın değişmesi
         dikkat dağıtıyor. */
      onMouseEnter={() => { durduRef.current = true; }}
      onMouseLeave={() => { durduRef.current = false; }}
    >
      {kareler.map((k, n) => (
        <Image
          key={k.id}
          className={'hero-kare' + (n === i ? ' on' : '')}
          src={k.url}
          alt={n === 0 ? k.alt : ''}
          fill
          priority={n === 0}
          loading={n === 0 ? undefined : 'lazy'}
          sizes="100vw"
          style={{ objectFit: 'cover' }}
          aria-hidden={n === i ? undefined : true}
        />
      ))}

      {kareler.length > 1 && (
        <div className="hero-noktalar" role="tablist" aria-label="Hero görselleri">
          {kareler.map((k, n) => (
            <button
              key={k.id} type="button" role="tab"
              className={n === i ? 'on' : ''}
              aria-selected={n === i}
              aria-label={`${n + 1}. görsel`}
              onClick={() => setI(n)}
            />
          ))}
        </div>
      )}

      {kareler[i]?.etiket && (
        <span className="hero-kare-etiket">{kareler[i].etiket}</span>
      )}
    </div>
  );
}
