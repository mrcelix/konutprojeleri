'use client';

import { useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { bolgeTasi } from '@/lib/panel-eylemler';

/* ============================================================
   Sıra taşıma düğmeleri.

   Komşuyla YER DEĞİŞTİRİYOR — tek tek `sira` yazmak, arada boşluk
   kalınca sıralamayı sessizce bozuyor. Uçtaki kayıtta sunucu "zaten
   en üstte" diyor; düğmeyi gizlemek yerine sebebi göstermek,
   listenin neresinde olduğunu da söylüyor.
   ============================================================ */
export default function SiraTasi({ id }: { id: string }) {
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  const tasi = (yon: 'yukari' | 'asagi') => basla(async () => {
    const r = await bolgeTasi(id, yon);
    setHata(r.hata ?? null);
  });

  return (
    <span className="sira-tasi" title={hata ?? undefined}>
      <button className="icon-btn" type="button" disabled={bekliyor}
        aria-label="Yukarı taşı" onClick={() => tasi('yukari')}>
        <Icon n="chevU" s={14} sw={2.4} />
      </button>
      <button className="icon-btn" type="button" disabled={bekliyor}
        aria-label="Aşağı taşı" onClick={() => tasi('asagi')}>
        <Icon n="chevD" s={14} sw={2.4} />
      </button>
    </span>
  );
}
