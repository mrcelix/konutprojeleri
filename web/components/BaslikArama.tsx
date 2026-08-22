'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import SearchBar, { type Oneri } from './SearchBar';
import SesliArama from './SesliArama';
import type { MegaTanim } from './MegaMenu';

/* ============================================================
   Başlıktaki arama alanı.

   Önceden `/arama` sayfasına giden bir bağlantıydı: ziyaretçi ne
   aradığını yazmadan önce sayfa değiştiriyor, aradığı villanın
   sayfasındaysa onu kaybediyordu. Şimdi yerinde bir PERDE açıyor ve
   hero'daki gelişmiş arama kutusunun aynısını gösteriyor — tarih,
   oda sayısı ve gelişmiş daraltmalar dâhil. Aynı bileşen: ikinci bir
   arama yüzeyi bakımı ikiye katlardı.

   Perde `body`ye portal ile basılıyor: başlıkta `backdrop-filter`
   var ve filtre uygulanan öğe `position: fixed` çocuklar için
   kapsayıcı blok oluyor — perde ekranı değil başlığı kaplardı.

   Kısayol: `/` tuşu. Metin alanındayken çalışmıyor, aksi hâlde
   yazarken perde açılırdı.
   ============================================================ */

export default function BaslikArama(
  { oneriler, yer, mega }:
  { oneriler: Oneri[]; yer?: string; mega?: MegaTanim[] },
) {
  const [acik, setAcik] = useState(false);
  const [ilkDeger, setIlkDeger] = useState('');
  const kutu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      const hedef = e.target as HTMLElement | null;
      const yaziyor = hedef && (hedef.tagName === 'INPUT' || hedef.tagName === 'TEXTAREA'
        || hedef.isContentEditable);
      if (e.key === '/' && !yaziyor && !acik) { e.preventDefault(); setAcik(true); }
      if (e.key === 'Escape' && acik) setAcik(false);
    };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, [acik]);

  useEffect(() => {
    if (!acik) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [acik]);

  return (
    <>
      <div className="hsearch-trigger" role="search">
        <button type="button" className="hs-ac" onClick={() => { setIlkDeger(''); setAcik(true); }}>
          <Icon n="search" s={15} sw={2.2} />
          <span className="hs-ph">{yer || 'Bölge, villa adı veya özellik ara…'}</span>
          <span className="hs-kbd">/</span>
        </button>
        {/* Mikrofon TETİĞİN İÇİNDE ama ayrı bir düğme: sesle arama tek
            dokunuşla başlamalı, önce perdeyi açtırmamalı. Konuşma
            bitince perde sonucu yazılı olarak açıyor. */}
        <SesliArama
          basladi={() => setAcik(true)}
          sonuc={(metin) => { setIlkDeger(metin); setAcik(true); }}
        />
      </div>

      {acik && typeof document !== 'undefined' && createPortal(
        <div className="arama-perde" role="dialog" aria-modal="true" aria-label="Villa ara"
          onClick={(e) => { if (e.target === e.currentTarget) setAcik(false); }}>
          <div className="arama-perde-kutu" ref={kutu}>
            <button type="button" className="arama-perde-kapat" onClick={() => setAcik(false)}
              aria-label="Kapat">
              <Icon n="x" s={18} sw={2.4} />
            </button>
            {/* Sesli arama artık KUTUNUN KENDİSİNDE (``):
                mikrofon "Ara" düğmesinin solunda, duyulan metin de
                kutunun üstünde. Hero ile perde aynı davranışı
                paylaşıyor, iki ayrı kopya yok.

                Başlıktaki mikrofonla gelen metin `key` ile kutuyu
                yeniden kuruyor: `baslangicQ` yalnızca ilk kurulumda
                okunuyor ve aksi hâlde söylenen metin alana
                yazılmıyordu. */}
            <SearchBar
              key={ilkDeger} oneriler={oneriler} temalar={[]}
            />
            {mega && mega.length > 0 && (
              <div className="arama-perde-hizli">
                <span>Popüler</span>
                {mega[0]?.sutunlar?.[0]?.baglantilar?.slice(0, 5).map((b) => (
                  <a key={b.yol} href={b.yol} className="arama-cip">{b.ad}</a>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
