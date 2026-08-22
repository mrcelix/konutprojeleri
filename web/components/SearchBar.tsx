'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { olayBildir } from '@/lib/iz-istemci';
import { TLkisa } from '@/lib/bicim';
import type { IkonAdi } from '@/lib/types';

/* ============================================================
   Ana sayfa arama kutusu.

   ÜÇ BÖLME: nerede, ne tipi, bütçe. Villa kiralamada bu kutu tarih ve
   kişi sayısı soruyordu; konut alımında ikisinin de karşılığı yok
   ve kutuyu doldurulamayan alanlarla açmak, aramayı hiç
   başlatmıyordu.

   BÜTÇE ÜST SINIRI, aralık değil. Alıcı "en fazla şu kadar" diye
   düşünüyor; alt sınırı da sormak, kaydırıcıyı iki uçtan
   ayarlatmak demek ve alt sınır pratikte hep sıfırda kalıyordu.

   Öneriler bölge ve projeyi AYNI listede gösteriyor: arayan kişi
   ikisini ayırt etmiyor, "Ataşehir" de "Park Vadi" de aynı kutuya
   yazılıyor. Bölge seçimi doğrudan iniş sayfasına gidiyor —
   filtrelenmiş arama sayfası yerine, o bölgenin editöryel içeriği
   olan sayfa daha iyi bir varış noktası.
   ============================================================ */

export interface Oneri {
  ad: string;
  alt: string;
  /** `building` proje, `pin` bölge, `home` daire tipi. */
  ikon: 'pin' | 'home' | 'building' | 'key';
  yol: string;
  /** Bölge önerileri doğrudan iniş sayfasına gider */
  bolgeSlug?: string;
  /** Bölgenin ili — liste il başlıkları altında gruplanıyor */
  il?: string;
  /** Bölgedeki proje sayısı; listede satırın sağında */
  adet?: number;
}

export interface HizliTema {
  kod: string;
  ad: string;
  ikon: IkonAdi;
}

const TIPLER = [
  { kod: '', ad: 'Farketmez' },
  { kod: 'KONUT', ad: 'Konut' },
  { kod: 'VILLA', ad: 'Villa' },
  { kod: 'OFIS', ad: 'Ofis' },
] as const;

/* Bütçe basamakları LOGARİTMİK değil ama eşit de değil: konut
   fiyatlarının yoğunlaştığı 4–12 milyon aralığında sık, üstünde
   seyrek. Eşit aralıklı bir kaydırıcı, alıcıların çoğunun bulunduğu
   bandı iki tık içine sıkıştırıyordu. */
const BUTCE = [
  3_000_000, 4_000_000, 5_000_000, 6_000_000, 7_500_000, 9_000_000,
  11_000_000, 14_000_000, 18_000_000, 25_000_000, 40_000_000, 0,
];

export default function SearchBar({
  oneriler, temalar = [],
}: {
  oneriler: Oneri[];
  temalar?: HizliTema[];
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [tip, setTip] = useState('');
  const [butceIx, setButceIx] = useState(BUTCE.length - 1);
  const [seciliTemalar, setSeciliTemalar] = useState<string[]>([]);
  const [acik, setAcik] = useState(false);
  const [vurgu, setVurgu] = useState(-1);
  const kutuRef = useRef<HTMLDivElement>(null);

  const butce = BUTCE[butceIx];

  /* Öneriler yazılana kadar YALNIZCA BÖLGELER: proje adlarını da
     baştan listelemek, kutuyu açan kişiye elli satırlık bir liste
     gösteriyordu. İki karakter yazınca proje adları da giriyor. */
  const suzulmus = (() => {
    const terim = q.trim().toLocaleLowerCase('tr');
    if (terim.length < 2) return oneriler.filter((o) => o.ikon === 'pin').slice(0, 8);
    return oneriler
      .filter((o) => o.ad.toLocaleLowerCase('tr').includes(terim)
        || o.alt.toLocaleLowerCase('tr').includes(terim))
      .slice(0, 8);
  })();

  useEffect(() => {
    const disari = (e: MouseEvent) => {
      if (kutuRef.current && !kutuRef.current.contains(e.target as Node)) setAcik(false);
    };
    document.addEventListener('mousedown', disari);
    return () => document.removeEventListener('mousedown', disari);
  }, []);

  const temaAc = (kod: string) => {
    setSeciliTemalar((s) => (s.includes(kod) ? s.filter((x) => x !== kod) : [...s, kod]));
    olayBildir('filtre', kod);
  };

  const ara = (hedef?: Oneri) => {
    olayBildir('arama', hedef?.ad ?? (q.trim() || 'bos'));

    /* Bölge seçildiyse ve başka filtre yoksa DOĞRUDAN iniş sayfası:
       o sayfada bölgenin editöryel içeriği var ve arama sonucundan
       daha iyi bir varış noktası. Filtre varsa arama sayfasına
       gidiliyor, yoksa filtreler kaybolurdu. */
    const filtreVar = tip || butce > 0 || seciliTemalar.length > 0;
    if (hedef?.bolgeSlug && !filtreVar) {
      router.push(`/projeler/${hedef.bolgeSlug}`);
      return;
    }
    if (hedef && !hedef.bolgeSlug) {
      router.push(hedef.yol);
      return;
    }

    const p = new URLSearchParams();
    if (hedef?.bolgeSlug) p.set('bolge', hedef.bolgeSlug);
    else if (q.trim()) p.set('q', q.trim());
    if (tip) p.set('tip', tip);
    if (butce > 0) p.set('maxFiyat', String(butce));
    if (seciliTemalar.length) p.set('f', seciliTemalar.join(','));
    router.push(`/arama?${p.toString()}`);
  };

  const tus = (e: React.KeyboardEvent) => {
    if (!acik || suzulmus.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setVurgu((i) => (i + 1) % suzulmus.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setVurgu((i) => (i - 1 + suzulmus.length) % suzulmus.length); }
    if (e.key === 'Enter' && vurgu >= 0) { e.preventDefault(); setAcik(false); ara(suzulmus[vurgu]); }
    if (e.key === 'Escape') setAcik(false);
  };

  return (
    <div className="arama-kabuk" ref={kutuRef}>
      <div className="arama-hap">
        {/* ---------- Nerede ---------- */}
        <div className="arama-bolme arama-bolme-genis">
          <label htmlFor="ara-q">Nerede</label>
          <input
            id="ara-q" value={q} autoComplete="off"
            placeholder="Bölge ya da proje adı"
            onChange={(e) => { setQ(e.target.value); setAcik(true); setVurgu(-1); }}
            onFocus={() => setAcik(true)}
            onKeyDown={tus}
            role="combobox" aria-expanded={acik} aria-controls="ara-oneri"
            aria-autocomplete="list"
          />
        </div>

        <span className="arama-ayrac" aria-hidden="true" />

        {/* ---------- Ne tipi ---------- */}
        <div className="arama-bolme">
          <label htmlFor="ara-tip">Ne arıyorsunuz</label>
          <select id="ara-tip" value={tip} onChange={(e) => setTip(e.target.value)}>
            {TIPLER.map((t) => <option key={t.kod} value={t.kod}>{t.ad}</option>)}
          </select>
        </div>

        <span className="arama-ayrac" aria-hidden="true" />

        {/* ---------- Bütçe ---------- */}
        <div className="arama-bolme">
          <label htmlFor="ara-butce">
            Bütçe {butce > 0 ? <b>{TLkisa(butce)}’ye kadar</b> : <span className="dim">farketmez</span>}
          </label>
          <input
            id="ara-butce" type="range" min={0} max={BUTCE.length - 1} step={1}
            value={butceIx} onChange={(e) => setButceIx(Number(e.target.value))}
            aria-valuetext={butce > 0 ? `${TLkisa(butce)} ve altı` : 'Bütçe sınırı yok'}
          />
        </div>

        <button type="button" className="arama-dugme" onClick={() => ara()}>
          <Icon n="search" s={18} sw={2.4} />
          <span>Ara</span>
        </button>
      </div>

      {/* ---------- Öneriler ---------- */}
      {acik && suzulmus.length > 0 && (
        <ul className="arama-oneri" id="ara-oneri" role="listbox">
          {suzulmus.map((o, i) => (
            <li key={o.yol}>
              <button
                type="button" role="option" aria-selected={i === vurgu}
                className={i === vurgu ? 'on' : undefined}
                onMouseEnter={() => setVurgu(i)}
                onClick={() => { setAcik(false); ara(o); }}
              >
                <Icon n={o.ikon} s={16} />
                <span className="oneri-ad">
                  <b>{o.ad}</b>
                  <span className="tiny dim">{o.alt}</span>
                </span>
                {o.adet != null && <span className="tiny dim">{o.adet}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- Hızlı temalar ----------
          BAĞLANTI DEĞİL, filtre: tıklanınca kutuya işleniyor ve tek
          "Ara" ile bölge/bütçe seçimiyle birleşiyor. İniş sayfasına
          giden bağlantı, seçilen filtreleri kaybettiriyordu. */}
      {temalar.length > 0 && (
        <div className="arama-cipler">
          {temalar.map((t) => (
            <button
              key={t.kod} type="button"
              className={'arama-cip' + (seciliTemalar.includes(t.kod) ? ' on' : '')}
              aria-pressed={seciliTemalar.includes(t.kod)}
              onClick={() => temaAc(t.kod)}
            >
              <Icon n={t.ikon} s={14} /> {t.ad}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
