'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

/* ============================================================
   Proje galerisi ve TAM EKRAN GÖRÜNTÜLEYİCİ.

   Perde basit bir "büyük görsel" değil: projeyi seçtiren şey
   görseller ve alıcı onları yakınlaştırarak inceliyor —
   havuzun zemini, mutfağın donanımı, yatağın genişliği. Bu yüzden
   görüntüleyicide yakınlaştırma, sürükleme, kaydırma hareketi,
   ızgara görünümü ve klavye kısayolları var.

   Kısayollar:
     ← →   önceki / sonraki
     + −   yakınlaş / uzaklaş     0  sıfırla
     G     ızgara görünümü        F  tam ekran
     Esc   kapat (yakınken önce yakınlaştırmayı sıfırlar)
   ============================================================ */

const AZAMI_ZUM = 4;

export default function Gallery({ foto, fotoAlt, ad }: { foto: string[]; fotoAlt: string[]; ad: string }) {
  const [aktif, setAktif] = useState<number | null>(null);
  const [zum, setZum] = useState(1);
  const [kaydirma, setKaydirma] = useState({ x: 0, y: 0 });
  const [izgara, setIzgara] = useState(false);
  /** Geçiş yönü — kare değişince kısa bir kayma animasyonu veriyor. */
  const [yon, setYon] = useState<1 | -1>(1);
  const kareler = foto.slice(0, 5);

  const sahne = useRef<HTMLDivElement>(null);
  const surukle = useRef<{ x: number; y: number; kx: number; ky: number } | null>(null);
  const dokunus = useRef<{ x: number; y: number; t: number } | null>(null);

  const sifirla = useCallback(() => { setZum(1); setKaydirma({ x: 0, y: 0 }); }, []);

  const kaydir = useCallback((d: number) => {
    setYon(d >= 0 ? 1 : -1);
    setAktif((i) => (i === null ? i : (i + d + foto.length) % foto.length));
    sifirla();
  }, [foto.length, sifirla]);

  const ac = useCallback((i: number) => { setAktif(i); setIzgara(false); sifirla(); }, [sifirla]);

  const zumla = useCallback((delta: number, merkez?: { x: number; y: number }) => {
    setZum((z) => {
      const yeni = Math.min(AZAMI_ZUM, Math.max(1, +(z + delta).toFixed(2)));
      // Tam uzaklaşınca kaydırma da sıfırlanmalı; yoksa fotoğraf
      // kadrajın dışında takılı kalıyor.
      if (yeni === 1) setKaydirma({ x: 0, y: 0 });
      else if (merkez && sahne.current) {
        /* İmlecin altındaki nokta sabit kalsın: tarayıcı
           yakınlaştırması da böyle davranıyor ve elle
           hizalamaktan çok daha az yoruyor. */
        const k = sahne.current.getBoundingClientRect();
        const dx = merkez.x - (k.left + k.width / 2);
        const dy = merkez.y - (k.top + k.height / 2);
        const oran = yeni / z;
        setKaydirma((p) => ({ x: (p.x - dx) * oran + dx, y: (p.y - dy) * oran + dy }));
      }
      return yeni;
    });
  }, []);

  /* ---------------- Klavye ve gövde kaydırması ---------------- */
  useEffect(() => {
    if (aktif === null) return;
    const f = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': return zum > 1 ? sifirla() : setAktif(null);
        case 'ArrowRight': return kaydir(1);
        case 'ArrowLeft': return kaydir(-1);
        case '+': case '=': return zumla(0.5);
        case '-': case '_': return zumla(-0.5);
        case '0': return sifirla();
        case 'g': case 'G': return setIzgara((g) => !g);
        case 'f': case 'F': {
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen().catch(() => {});
          return;
        }
        default:
      }
    };
    document.addEventListener('keydown', f);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', f); document.body.style.overflow = ''; };
  }, [aktif, kaydir, sifirla, zum, zumla]);

  /* Tekerlek olayı PASİF OLMAYAN dinleyici istiyor: React'in onWheel'i
     pasif bağlanıyor ve `preventDefault` çalışmıyor — sayfa perdenin
     altında kayıyordu. */
  useEffect(() => {
    const el = sahne.current;
    if (!el || aktif === null) return;
    const f = (e: WheelEvent) => {
      e.preventDefault();
      zumla(e.deltaY > 0 ? -0.35 : 0.35, { x: e.clientX, y: e.clientY });
    };
    el.addEventListener('wheel', f, { passive: false });
    return () => el.removeEventListener('wheel', f);
  }, [aktif, zumla]);

  if (aktif !== null && (aktif < 0 || aktif >= foto.length)) setAktif(0);

  /* ---------------- Fare / dokunuş ---------------- */
  function basla(e: React.PointerEvent) {
    dokunus.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    if (zum > 1) {
      surukle.current = { x: e.clientX, y: e.clientY, kx: kaydirma.x, ky: kaydirma.y };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }
  }
  function hareket(e: React.PointerEvent) {
    if (!surukle.current) return;
    setKaydirma({
      x: surukle.current.kx + (e.clientX - surukle.current.x),
      y: surukle.current.ky + (e.clientY - surukle.current.y),
    });
  }
  function bitir(e: React.PointerEvent) {
    surukle.current = null;
    const d = dokunus.current;
    dokunus.current = null;
    if (!d || zum > 1) return;
    // Yatay kaydırma hareketi: 60 px'ten uzun ve dikeyden baskınsa
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) kaydir(dx < 0 ? 1 : -1);
  }

  const altMetin = (i: number) => fotoAlt[i] ?? `${ad} — fotoğraf ${i + 1}`;

  return (
    <>
      <div className="gallery">
        {kareler.map((f, i) => (
          <div key={f} onClick={() => ac(i)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') ac(i); }}
            aria-label={`${ad} fotoğraf ${i + 1} — büyüt`}>
            <Image
              src={f}
              alt={altMetin(i)}
              fill sizes={i === 0 ? '(max-width: 900px) 100vw, 50vw' : '25vw'}
              priority={i < 3} style={{ objectFit: 'cover' }}
            />
            {/* Proje adı BÜYÜK karenin üzerinde, arkası bulanık cam
                kutuda ve altın harflerle. Başlık galerinin altında da
                duruyor; buradaki kopya fotoğrafı adsız bırakmamak
                için — ekran görüntüsü paylaşıldığında ad fotoğrafla
                birlikte gidiyor. `aria-hidden`: aynı metin h1'de var. */}
            {i === 0 && (
              <span className="g-cam" aria-hidden="true">
                <b>{ad}</b>
              </span>
            )}
          </div>
        ))}
        <button type="button" className="all-photos" onClick={() => ac(0)}>
          <Icon n="grid" s={15} /> {foto.length} fotoğrafın tümü
        </button>
      </div>

      {aktif !== null && (
        <div className="lightbox open" role="dialog" aria-modal="true"
          aria-label={`${ad} fotoğraf galerisi`}
          onClick={(e) => { if (e.target === e.currentTarget) setAktif(null); }}>

          {/* ---------------- Üst çubuk ----------------
              BÜTÜN METİNLER BURADA: proje adı, görselin açıklaması,
              kaçıncı fotoğraf ve klavye ipucu tek satırda. Önceden
              açıklama sahnenin üstünde, sayaç ve ipucu altındaydı;
              ikisi birlikte ekranın 70 pikselini alıyor ve asıl iş
              olan FOTOĞRAFI küçültüyordu. */}
          <div className="lb-bar">
            <span className="lb-baslik">{ad}</span>
            {!izgara && (
              <>
                <span className="lb-ayrac" aria-hidden="true" />
                <span className="lb-aciklama">{altMetin(aktif)}</span>
                <span className="lb-ayrac" aria-hidden="true" />
                <span className="lb-count">{aktif + 1} / {foto.length}</span>
                <span className="lb-ayrac" aria-hidden="true" />
                <span className="lb-ipucu">← → gezin · çift tık yakınlaştır · G ızgara · Esc kapat</span>
              </>
            )}
            <div className="lb-araclar">
              <button type="button" className="lb-arac" onClick={() => zumla(-0.5)}
                disabled={zum <= 1} aria-label="Uzaklaştır">
                <Icon n="minus" s={17} sw={2.4} />
              </button>
              <span className="lb-zum" aria-live="polite">%{Math.round(zum * 100)}</span>
              <button type="button" className="lb-arac" onClick={() => zumla(0.5)}
                disabled={zum >= AZAMI_ZUM} aria-label="Yakınlaştır">
                <Icon n="plus" s={17} sw={2.4} />
              </button>
              <button type="button" className={'lb-arac' + (izgara ? ' on' : '')}
                onClick={() => setIzgara((g) => !g)} aria-pressed={izgara}
                aria-label="Izgara görünümü">
                <Icon n="grid" s={17} />
              </button>
              <button type="button" className="lb-arac" aria-label="Tam ekran"
                onClick={() => {
                  if (document.fullscreenElement) void document.exitFullscreen();
                  else void document.documentElement.requestFullscreen().catch(() => {});
                }}>
                <Icon n="scale" s={17} />
              </button>
              <button type="button" className="lb-arac lb-kapat" onClick={() => setAktif(null)}
                aria-label="Kapat">
                <Icon n="x" s={19} sw={2.4} />
              </button>
            </div>
          </div>

          {izgara ? (
            /* ---------------- Izgara görünümü ----------------
               Otuz görselli bir projede aranan kareyi ok tuşuyla
               bulmak yerine doğrudan seçtiriyor. */
            <div className="lb-izgara">
              {foto.map((f, i) => (
                <button type="button" key={f} className={'lb-izkare' + (i === aktif ? ' on' : '')}
                  onClick={() => ac(i)} aria-label={`${i + 1}. fotoğraf`}>
                  <Image src={f} alt="" fill sizes="240px" style={{ objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* ---------------- Sahne ---------------- */}
              <div className="lb-sahne" ref={sahne}
                data-zum={zum > 1 ? 'acik' : 'kapali'}
                onPointerDown={basla} onPointerMove={hareket}
                onPointerUp={bitir} onPointerCancel={() => { surukle.current = null; }}
                onDoubleClick={(e) => (zum > 1 ? sifirla() : zumla(1.5, { x: e.clientX, y: e.clientY }))}>
                <div className="lb-tuval" key={aktif}
                  data-yon={yon === 1 ? 'sag' : 'sol'}
                  style={{
                    transform: `translate3d(${kaydirma.x}px, ${kaydirma.y}px, 0) scale(${zum})`,
                  }}>
                  <Image
                    key={foto[aktif]}
                    src={foto[aktif]}
                    alt={altMetin(aktif)}
                    fill sizes="100vw" style={{ objectFit: 'contain' }} priority
                  />
                </div>
              </div>

              <button type="button" className="lb-nav lb-prev" onClick={() => kaydir(-1)} aria-label="Önceki">
                <Icon n="chevL" s={22} sw={2.2} />
              </button>
              <button type="button" className="lb-nav lb-next" onClick={() => kaydir(1)} aria-label="Sonraki">
                <Icon n="chevR" s={22} sw={2.2} />
              </button>

              {/* Şerit GENİŞ EKRANDA SAĞDA ve dikey (bkz. globals.css):
                  yatay şerit fotoğrafın altından 80 piksel alıyordu ve
                  fotoğraf o kadar kısalıyordu. Dar ekranda yine altta. */}
              <div className="lb-serit">
                {foto.map((f, i) => (
                  <button type="button" key={f} className={'lb-kare' + (i === aktif ? ' on' : '')}
                    onClick={() => ac(i)} aria-label={`${i + 1}. fotoğraf`}
                    ref={(el) => { if (el && i === aktif) el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}>
                    <Image src={f} alt="" width={120} height={80} sizes="120px" style={{ objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
