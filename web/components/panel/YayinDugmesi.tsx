'use client';

import { useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { projeYayinDurumu } from '@/lib/panel-eylemler';

/**
 * Projeyı yayına alır / yayından kaldırır.
 *
 * Yayına alma bilinçli bir adım: proje taslak olarak açılıyor ve ekip
 * yerinde doğrulamayı tamamlayana kadar canlıya çıkmıyor. Sunucu tarafı
 * ayrıca fotoğraf ve açıklama kontrolü yapıyor.
 */
export default function YayinDugmesi({
  projeId, yayinda, projeAd,
}: { projeId: string; yayinda: boolean; projeAd: string }) {
  const [bekliyor, basla] = useTransition();
  const [durum, setDurum] = useState(yayinda);
  const [hata, setHata] = useState<string | null>(null);

  function degistir() {
    setHata(null);
    basla(async () => {
      const s = await projeYayinDurumu(projeId, !durum);
      if (s.hata) { setHata(s.hata); return; }
      setDurum(!durum);
    });
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-sm ${durum ? 'btn-quiet' : 'btn-primary'}`}
        onClick={degistir}
        disabled={bekliyor}
        aria-label={durum ? `${projeAd} yayından kaldır` : `${projeAd} yayına al`}
      >
        {/* Kısa etiket: liste satırında "Yayından kaldır" tek başına
            110 piksel yer kaplıyor ve durum sütununu ekran dışına
            itiyordu. Tam anlam `aria-label`de duruyor. */}
        {bekliyor ? '…' : durum ? 'Gizle' : <><Icon n="check" s={14} sw={2.4} /> Yayınla</>}
      </button>
      {hata && <div className="tiny" style={{ color: 'var(--danger)', marginTop: 4 }}>{hata}</div>}
    </>
  );
}
