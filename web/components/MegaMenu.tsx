'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import SuluboyaIkon from './SuluboyaIkon';
import type { IkonAdi } from '@/lib/types';

/* ============================================================
   Mega menü.

   Tek satırlık açılır liste villa kategorilerini taşıyamıyordu: on
   kategori + dokuz bölge alt alta 19 satırlık bir sütun demek. Panel
   üç sütuna ayrılıyor, her sütun bir SORUYA karşılık geliyor —
   "nasıl bir tatil?", "villada ne olsun?", "nerede olsun?".

   Açılma hem imleçle hem klavyeyle: `onMouseEnter` tek başına klavye
   kullanıcısını dışarıda bırakıyor, `onClick` tek başına imleçle
   gezineni yavaşlatıyor. Kapanma Escape, dışarı tıklama ve odak
   çıkışıyla.
   ============================================================ */

export interface MegaBaglanti { ad: string; yol: string; ikon: IkonAdi; not?: string }
export interface MegaSutun { baslik: string; baglantilar: MegaBaglanti[] }

export interface MegaTanim {
  ad: string;
  /** Menü başlığının kendi hedefi — panel açılmasa da gidilecek yer */
  yol: string;
  sutunlar: MegaSutun[];
  tanitim: { baslik: string; metin: string; dugme: string; yol: string };
  populer: MegaBaglanti[];
  populerBaslik: string;
}

export default function MegaMenu({ menuler, aktifYol }: { menuler: MegaTanim[]; aktifYol: string }) {
  const [acik, setAcik] = useState<string | null>(null);
  const kap = useRef<HTMLDivElement>(null);
  const kapatZaman = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Panelle başlık arasında birkaç piksel boşluk var; imleç oradan
     geçerken menü kapanmasın diye kapanma geciktiriliyor. */
  const gecikmeliKapat = () => {
    kapatZaman.current = setTimeout(() => setAcik(null), 140);
  };
  const iptalKapat = () => {
    if (kapatZaman.current) { clearTimeout(kapatZaman.current); kapatZaman.current = null; }
  };

  useEffect(() => {
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') setAcik(null); };
    const tik = (e: MouseEvent) => {
      if (kap.current && !kap.current.contains(e.target as Node)) setAcik(null);
    };
    document.addEventListener('keydown', tus);
    document.addEventListener('click', tik);
    return () => {
      document.removeEventListener('keydown', tus);
      document.removeEventListener('click', tik);
      if (kapatZaman.current) clearTimeout(kapatZaman.current);
    };
  }, []);

  return (
    /* Kap `display: contents` — kendi kutusu yok, tetikler dış
       menünün flex öğesi olarak kalıyor. <nav> içinde <nav> olmasın
       diye div. */
    <div
      className="mega-nav" ref={kap}
      onMouseLeave={gecikmeliKapat}
      onMouseEnter={iptalKapat}
    >
      {menuler.map((m) => {
        const bu = acik === m.ad;
        return (
          <div className="mega-kap" key={m.ad}>
            <button
              type="button"
              className={'mega-tetik' + (bu ? ' acik' : '') + (aktifYol === m.yol ? ' active' : '')}
              aria-expanded={bu}
              aria-haspopup="true"
              onMouseEnter={() => { iptalKapat(); setAcik(m.ad); }}
              onClick={() => setAcik(bu ? null : m.ad)}
              onFocus={() => setAcik(m.ad)}
            >
              {m.ad}
              <Icon n={bu ? 'chevU' : 'chevD'} s={14} sw={2.4} />
            </button>

            {bu && (
              <div className="mega-panel" onMouseEnter={iptalKapat}>
                <div className="mega-ic">
                  <div className="mega-sutunlar">
                    {m.sutunlar.map((s) => (
                      <div className="mega-sutun" key={s.baslik}>
                        <h2 className="mega-baslik">{s.baslik}</h2>
                        {s.baglantilar.map((b) => (
                          <Link className="mega-oge" key={b.yol} href={b.yol} onClick={() => setAcik(null)}>
                            <span className="mega-ikon"><SuluboyaIkon n={b.ikon} s={19} /></span>
                            <span className="mega-ad">
                              {b.ad}
                              {b.not && <span className="mega-not">{b.not}</span>}
                            </span>
                            <Icon n="chevR" s={15} sw={2.2} />
                          </Link>
                        ))}
                        {s === m.sutunlar[0] && (
                          <Link className="mega-tumu" href={m.yol} onClick={() => setAcik(null)}>
                            Tümünü gör <Icon n="arrowR" s={15} />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>

                  <aside className="mega-tanitim">
                    <div>
                      <h2>{m.tanitim.baslik}</h2>
                      <p>{m.tanitim.metin}</p>
                    </div>
                    <Link className="btn btn-cta" href={m.tanitim.yol} onClick={() => setAcik(null)}>
                      {m.tanitim.dugme} <Icon n="arrowR" s={16} />
                    </Link>
                  </aside>
                </div>

                <div className="mega-serit">
                  <span className="mega-serit-bas">
                    <Icon n="spark" s={14} /> {m.populerBaslik}
                  </span>
                  {m.populer.map((b) => (
                    <Link className="mega-cip" key={b.yol} href={b.yol} onClick={() => setAcik(null)}>
                      <Icon n={b.ikon} s={15} sw={1.8} />{b.ad}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
