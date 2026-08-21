'use client';

import { useState } from 'react';

/**
 * Kat planı görüntüleyici.
 *
 * Teknik çizim koyu temada ASLA ters çevrilmez — mimari çizim beyaz kağıt
 * üzerine siyah çizgidir; bu bir stil değil, sektörün okuma alışkanlığıdır.
 * Ters çevrilen bir plan hem yabancı görünür hem yazdırıldığında kullanılamaz.
 * Bu yüzden kap `.kat-plani` sınıfını taşır (globals.css: filter yok, zemin beyaz).
 */

type Props = { kaynak: string; alt: string; pdfKaynak?: string | null };

const KADEMELER = [1, 1.5, 2, 3] as const;

export function PlanGoruntuleyici({ kaynak, alt, pdfKaynak }: Props) {
  const [kademe, setKademe] = useState(0);
  const [olculer, setOlculer] = useState(true);
  const [mobilya, setMobilya] = useState(false);

  const zoom = KADEMELER[kademe] ?? 1;

  return (
    <figure className="kat-plani kart" style={{ padding: 'var(--s-4)', margin: 0, position: 'relative' }}>
      <div className="satir" style={{ marginBottom: 'var(--s-3)', gap: 6 }}>
        <button
          type="button"
          onClick={() => setOlculer((v) => !v)}
          className={`chip${olculer ? ' is-selected' : ''}`}
          aria-pressed={olculer}
        >
          Ölçüler
        </button>
        <button
          type="button"
          onClick={() => setMobilya((v) => !v)}
          className={`chip${mobilya ? ' is-selected' : ''}`}
          aria-pressed={mobilya}
        >
          Mobilya
        </button>

        <span className="satir" style={{ marginLeft: 'auto', gap: 4 }}>
          <button
            type="button"
            onClick={() => setKademe((k) => Math.max(0, k - 1))}
            disabled={kademe === 0}
            className="chip"
            aria-label="Uzaklaştır"
          >
            −
          </button>
          <span className="eyebrow sayi" style={{ minWidth: 34, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setKademe((k) => Math.min(KADEMELER.length - 1, k + 1))}
            disabled={kademe === KADEMELER.length - 1}
            className="chip"
            aria-label="Yakınlaştır"
          >
            +
          </button>
        </span>
      </div>

      <div
        style={{
          overflow: 'auto',
          borderRadius: 'var(--r-block)',
          background: '#ffffff',
          maxHeight: 560,
        }}
      >
        {/* Next <Image> kullanılmaz: teknik çizim yeniden boyutlandırılınca
            çizgi kalınlıkları ve ölçü yazıları okunmaz hale gelir. */}
        <img
          src={kaynak}
          alt={alt}
          data-olculer={olculer}
          data-mobilya={mobilya}
          style={{
            width: `${zoom * 100}%`,
            maxWidth: 'none',
            transition: 'width var(--dur) var(--ease)',
            display: 'block',
            margin: '0 auto',
          }}
        />
      </div>

      {pdfKaynak && (
        <figcaption style={{ marginTop: 'var(--s-3)' }}>
          <a href={pdfKaynak} download className="btn btn-primary is-secondary is-small">
            Kat planını indir · PDF
          </a>
        </figcaption>
      )}
    </figure>
  );
}
