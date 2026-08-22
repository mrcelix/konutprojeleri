'use client';

import { useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { sayfaSil, sayfaYayinDurumu } from '@/lib/panel-eylemler';

/* Sayfa satırındaki yayına al / kaldır ve sil düğmeleri.
   Silme geri alınamıyor: onay tek tıkla geçilemesin diye iki adımlı. */
export default function SayfaEylem(
  { id, yayinda, baslik }: { id: string; yayinda: boolean; baslik: string },
) {
  const [bekliyor, basla] = useTransition();
  const [onay, setOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  if (onay) {
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="tiny" style={{ color: 'var(--danger)' }}>Silinsin mi?</span>
        <button className="btn btn-sm" type="button" disabled={bekliyor}
          style={{ background: 'var(--danger)', color: '#fff' }}
          onClick={() => basla(async () => {
            const s = await sayfaSil(id);
            if (s.hata) { setHata(s.hata); setOnay(false); }
          })}>
          Evet, sil
        </button>
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => setOnay(false)}>
          Vazgeç
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      <button className="btn btn-ghost btn-sm" type="button" disabled={bekliyor}
        onClick={() => basla(async () => { await sayfaYayinDurumu(id, !yayinda); })}>
        <Icon n={yayinda ? 'x' : 'check'} s={14} sw={2.2} />
        {yayinda ? 'Yayından kaldır' : 'Yayına al'}
      </button>
      <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
        aria-label={`${baslik} sayfasını sil`} onClick={() => setOnay(true)}>
        Sil
      </button>
      {hata && <span className="tiny" role="alert" style={{ color: 'var(--danger)' }}>{hata}</span>}
    </div>
  );
}
