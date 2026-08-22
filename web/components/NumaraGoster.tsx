'use client';

import { useState } from 'react';
import Icon from './Icon';
import { olayBildir } from '@/lib/iz-istemci';

/* ============================================================
   Numarayı göster.

   Emlak ilanlarının değişmez kalıbı: numara yarım duruyor, tıklayınca
   açılıyor. İki işe yarıyor —

   1. TIKLAMA ÖLÇÜLEBİLİYOR. Ekranda duran bir numarayı kaç kişinin
      okuduğu bilinmiyor; açan kişi ilgilenen kişi ve bu, ilanın
      performansının en doğrudan göstergesi.
   2. Sayfayı tarayan botlar numarayı toplamıyor: sunucu HTML'inde
      yalnızca maskeli hâli var, tam numara tıklamayla yazılıyor.

   Numaranın kendisi PROP olarak geliyor (panelden yönetilen site
   bilgisinden); bileşen istemci tarafında olduğu için veri
   katmanını kendisi okuyamıyor.
   ============================================================ */

/** `05321112233` → `0532 111 22 33` */
function bicimle(ham: string): string {
  const s = ham.replace(/\D+/g, '').replace(/^90/, '').replace(/^0/, '');
  if (s.length !== 10) return ham;
  return `0${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 8)} ${s.slice(8, 10)}`;
}

/** Son dört hane gizli: `0532 111 •• ••` */
function maskele(ham: string): string {
  const tam = bicimle(ham);
  const p = tam.split(' ');
  if (p.length !== 4) return `${tam.slice(0, Math.max(0, tam.length - 4))}••••`;
  return `${p[0]} ${p[1]} •• ••`;
}

export default function NumaraGoster({ numara, etiket }: { numara: string; etiket?: string }) {
  const [acik, setAcik] = useState(false);
  const tam = bicimle(numara);

  return (
    <div className="numara-kutu">
      <span className="numara-etiket">{etiket ?? 'Satış danışmanı'}</span>

      {acik ? (
        <a className="numara-deger" href={`tel:+90${numara.replace(/\D+/g, '').replace(/^90/, '').replace(/^0/, '')}`}>
          <Icon n="key" s={16} sw={2} />
          {tam}
        </a>
      ) : (
        <button
          type="button" className="numara-ac"
          onClick={() => { setAcik(true); olayBildir('numara-goster', numara.slice(-4)); }}
        >
          <span className="numara-maske" aria-hidden="true">{maskele(numara)}</span>
          <span className="numara-ac-metin">Numarayı göster</span>
        </button>
      )}
    </div>
  );
}
