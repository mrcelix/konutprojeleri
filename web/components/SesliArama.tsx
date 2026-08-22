'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

/* ============================================================
   Sesli arama.

   Tarayıcının konuşma tanıma arayüzü (Web Speech API) kullanılıyor:
   ses cihazdan çıkmıyor, bizim sunucumuza hiçbir kayıt gelmiyor ve
   ek bir kitaplık inmiyor.

   DESTEKLEMEYEN TARAYICIDA DÜĞME HİÇ ÇIKMIYOR. Firefox'ta arayüz
   yok; görünen ama basınca hiçbir şey olmayan bir mikrofon, bozuk
   bir özellikten daha kötü. Destek bilgisi ilk boyamada değil
   `useEffect` içinde okunuyor — sunucuda `window` yok ve ikisi
   uyuşmazsa hidrasyon uyarısı çıkıyor.

   Dil `tr-TR`: bölge ve villa adları Türkçe; İngilizce tanıma
   "Kalkan"ı "Kalkin" diye yazıyordu.
   ============================================================ */

interface TanimaSonucu {
  isFinal?: boolean;
  0: { transcript: string };
  length: number;
}

interface Taniyici {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<TanimaSonucu> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type TaniyiciYapici = new () => Taniyici;

function taniyiciYapici(): TaniyiciYapici | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: TaniyiciYapici;
    webkitSpeechRecognition?: TaniyiciYapici;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function SesliArama(
  { sonuc, buyuk = false, basladi, konusurken }:
  {
    /** Konuşma bittiğinde kesinleşen metin */
    sonuc: (metin: string) => void;
    buyuk?: boolean;
    /** Mikrofon açıldığı an — perdeyi açmak için */
    basladi?: () => void;
    /** Konuşulurken ARA metin: ekranda canlı gösteriliyor */
    konusurken?: (metin: string, bitti: boolean) => void;
  },
) {
  const [destek, setDestek] = useState(false);
  const [dinliyor, setDinliyor] = useState(false);
  const taniyici = useRef<Taniyici | null>(null);

  useEffect(() => { setDestek(taniyiciYapici() !== null); }, []);

  useEffect(() => () => { taniyici.current?.stop(); }, []);

  if (!destek) return null;

  function basla(e: React.MouseEvent) {
    // Düğme arama kutusunun İÇİNDE: tıklama kutuyu da açmasın
    e.preventDefault();
    e.stopPropagation();

    if (dinliyor) { taniyici.current?.stop(); return; }

    const Yapici = taniyiciYapici();
    if (!Yapici) return;

    const t = new Yapici();
    t.lang = 'tr-TR';
    t.continuous = false;
    /* ARA SONUÇLAR AÇIK: konuşurken ekranda ne anlaşıldığı görünüyor.
       Kapalıyken kullanıcı konuşmayı bitirene kadar hiçbir geri
       bildirim almıyor ve mikrofonun çalışıp çalışmadığını
       bilmiyordu. */
    t.interimResults = true;
    t.onresult = (olay) => {
      const hepsi = Array.from({ length: olay.results.length }, (_, i) => olay.results[i]);
      const metin = hepsi.map((r) => r[0]?.transcript ?? '').join(' ').trim();
      const bitti = hepsi.some((r) => r.isFinal);
      if (metin) konusurken?.(metin, bitti);
      if (bitti && metin) sonuc(metin);
    };
    t.onerror = () => setDinliyor(false);
    t.onend = () => setDinliyor(false);
    taniyici.current = t;
    setDinliyor(true);
    basladi?.();
    try { t.start(); } catch { setDinliyor(false); }
  }

  return (
    <button
      type="button"
      className={'ses-dugme' + (dinliyor ? ' dinliyor' : '') + (buyuk ? ' buyuk' : '')}
      onClick={basla}
      aria-label={dinliyor ? 'Dinlemeyi durdur' : 'Sesle ara'}
      aria-pressed={dinliyor}
      title={dinliyor ? 'Dinleniyor…' : 'Sesle ara'}
    >
      <Icon n="mic" s={buyuk ? 19 : 16} sw={1.9} />
      {dinliyor && <span className="ses-dalga" aria-hidden="true" />}
    </button>
  );
}
