'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Harita } from './Harita';
import type { HaritaNoktasi } from '@/lib/queries/harita';
import { paraKisa, para, teslim } from '@/lib/format';

/**
 * Harita + liste ikilisi.
 *
 * Liste haritanın görünür alanına bağlıdır: kullanıcı kaydırdıkça soldaki
 * kartlar süzülür. Bu, "haritada gördüğüm neyse listede o var" beklentisini
 * karşılar — iki panelin ayrı davrandığı haritalar kafa karıştırır.
 */

type Poi = { tip: string; ad: string; lng: number; lat: number };

export function HaritaPanel({
  noktalar, poi, merkez, yakinlik, listeYolu,
}: {
  noktalar: HaritaNoktasi[];
  poi: Poi[];
  merkez: [number, number];
  yakinlik: number;
  listeYolu: string;
}) {
  const [gorunur, setGorunur] = useState<number[] | null>(null);

  const liste = useMemo(() => {
    if (!gorunur) return noktalar;
    const küme = new Set(gorunur);
    return noktalar.filter((n) => küme.has(n.id));
  }, [noktalar, gorunur]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 352px) minmax(0, 1fr)',
        gap: 'var(--s-3)',
        height: 'calc(100vh - 190px)',
        minHeight: 520,
      }}
    >
      {/* Liste */}
      <div className="kp-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          className="kp-row"
          style={{ padding: 'var(--s-3) var(--s-4)', borderBottom: '1px solid var(--border)' }}
        >
          <b style={{ fontSize: 12.5 }}>{liste.length} proje</b>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>haritada görünen</span>
          <Link href={listeYolu} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--brand)', fontWeight: 650 }}>
            Liste görünümü
          </Link>
        </div>

        <div style={{ overflowY: 'auto', padding: 'var(--s-3)', display: 'grid', gap: 'var(--s-3)' }}>
          {liste.length === 0 ? (
            <p className="kp-lead" style={{ fontSize: 12, padding: 'var(--s-3)' }}>
              Bu alanda proje yok. Haritayı kaydırın veya uzaklaştırın.
            </p>
          ) : (
            liste.map((n) => (
              <Link
                key={n.id}
                href={`/${n.il}/${n.ilce}/${n.slug}`}
                style={{
                  border: '1px solid var(--border)', borderRadius: 'var(--r-block)',
                  padding: 'var(--s-3)', display: 'block',
                }}
              >
                <b style={{ display: 'block', fontSize: 12.5, letterSpacing: '-0.02em' }}>{n.ad}</b>
                <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 7px' }}>
                  {n.ilce} · {n.firma_ad}
                  {teslim(n.teslim_ceyrek) ? ` · ${teslim(n.teslim_ceyrek)}` : ''}
                </span>
                <span className="kp-row" style={{ gap: 6 }}>
                  <b style={{ fontSize: 13, letterSpacing: '-0.02em' }} className="tabular">
                    {paraKisa(n.min_fiyat) ?? 'Fiyat isteyin'}
                  </b>
                  {n.m2_birim && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }} className="tabular">
                      {para(Math.round(n.m2_birim))}/m²
                    </span>
                  )}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Harita */}
      <div className="kp-card" style={{ overflow: 'hidden' }}>
        <Harita
          noktalar={noktalar}
          poi={poi}
          merkez={merkez}
          yakinlik={yakinlik}
          onGorunur={setGorunur}
        />
      </div>
    </div>
  );
}
