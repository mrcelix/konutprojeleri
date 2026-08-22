'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import type { NavOge } from './PanelKabuk';

/* ============================================================
   Komut paleti — Ctrl/⌘ + K.

   Yönetim menüsünde otuza yakın sayfa var. Kenar çubuğundaki süzme
   kutusu yardımcı oluyor ama önce fareyi oraya götürmek, listeyi
   kaydırmak gerekiyor. Palet klavyeden açılıyor: yaz, ok tuşlarıyla
   seç, Enter'a bas.

   Eşleştirme HARF SIRASINA göre (fuzzy) değil, KELİME BAŞINA göre:
   "fa" yazınca "Fiyat alarmları" gelsin isteniyor; harf sırası
   eşleştirmesi "Sayfa metinleri"ni de eşleştirip listeyi gürültüye
   boğuyordu. Türkçe küçültme ve ı/İ karşılığı elle yapılıyor —
   `toLowerCase()` "İ"yi "i̇" (nokta + birleşen nokta) yapıyor ve
   arama tutmuyordu.
   ============================================================ */

interface Komut {
  ad: string;
  yol: string;
  ikon: NavOge['ikon'];
  grup: string;
  /** Menüde olmayan, kabuktan gelen sabit eylemler için */
  disaridaAcilir?: boolean;
}

const norm = (x: string) =>
  x.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr');

/** Sorgudaki her parça, adaydaki bir kelimenin başına oturmalı. */
function eslesir(ad: string, sorgu: string) {
  const kelimeler = norm(ad).split(/[\s·/,()-]+/).filter(Boolean);
  return norm(sorgu).split(/\s+/).filter(Boolean).every(
    (p) => kelimeler.some((k) => k.startsWith(p)) || norm(ad).includes(p),
  );
}

export default function KomutPaleti({ nav, kok }: { nav: NavOge[]; kok: string }) {
  const yonlendir = useRouter();
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState('');
  const [imlec, setImlec] = useState(0);
  const kutu = useRef<HTMLInputElement>(null);
  const liste = useRef<HTMLDivElement>(null);

  const komutlar = useMemo<Komut[]>(() => [
    ...nav.map((n) => ({ ad: n.ad, yol: n.yol, ikon: n.ikon, grup: n.grup ?? 'Sayfalar' })),
    { ad: 'Siteyi yeni sekmede aç', yol: '/', ikon: 'arrowR' as const, grup: 'Kısayol', disaridaAcilir: true },
    kok === '/yonetim'
      ? { ad: 'Firma görünümü', yol: '/panel', ikon: 'home' as const, grup: 'Kısayol' }
      : { ad: 'Yönetim paneli', yol: '/yonetim', ikon: 'sliders' as const, grup: 'Kısayol' },
  ], [nav, kok]);

  const sonuc = useMemo(() => {
    const s = sorgu.trim();
    return s ? komutlar.filter((k) => eslesir(k.ad, s)) : komutlar;
  }, [komutlar, sorgu]);

  /* Sorgu değişince imleç başa dönüyor: aksi hâlde daralan listede
     ekranda olmayan bir satır seçili kalıyordu. */
  useEffect(() => { setImlec(0); }, [sorgu]);

  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setAcik((a) => !a);
        setSorgu('');
      }
    };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, []);

  useEffect(() => {
    if (acik) kutu.current?.focus();
  }, [acik]);

  /* Seçili satır görünür kalsın: ok tuşuyla aşağı inerken liste
     kendiliğinden kaymazsa seçim perdenin altında kayboluyor. */
  useEffect(() => {
    liste.current?.querySelector('[data-secili="1"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [imlec, sonuc]);

  if (!acik) return null;

  const git = (k?: Komut) => {
    if (!k) return;
    setAcik(false);
    if (k.disaridaAcilir) window.open(k.yol, '_blank', 'noopener');
    else yonlendir.push(k.yol);
  };

  return (
    <div className="kp-perde" role="presentation" onMouseDown={() => setAcik(false)}>
      <div
        className="kp-kutu" role="dialog" aria-modal="true" aria-label="Komut paleti"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="kp-giris">
          <Icon n="search" s={17} sw={2.2} />
          <input
            ref={kutu} type="text" value={sorgu} placeholder="Sayfa ara…"
            aria-label="Sayfa ara"
            onChange={(e) => setSorgu(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setAcik(false); return; }
              if (e.key === 'ArrowDown') { e.preventDefault(); setImlec((i) => Math.min(i + 1, sonuc.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setImlec((i) => Math.max(i - 1, 0)); }
              if (e.key === 'Enter') { e.preventDefault(); git(sonuc[imlec]); }
            }}
          />
          <kbd>esc</kbd>
        </div>

        <div className="kp-liste" ref={liste}>
          {sonuc.length === 0 && <p className="kp-bos">Eşleşen sayfa yok.</p>}
          {sonuc.map((k, i) => (
            <button
              key={k.yol + k.ad} type="button" className="kp-satir"
              data-secili={i === imlec ? '1' : undefined}
              onMouseEnter={() => setImlec(i)}
              onClick={() => git(k)}
            >
              <Icon n={k.ikon} s={16} />
              <span>{k.ad}</span>
              <small>{k.grup}</small>
            </button>
          ))}
        </div>

        <div className="kp-alt">
          <span><kbd>↑</kbd><kbd>↓</kbd> gez</span>
          <span><kbd>enter</kbd> aç</span>
          <span><kbd>/</kbd> menüde ara</span>
        </div>
      </div>
    </div>
  );
}
