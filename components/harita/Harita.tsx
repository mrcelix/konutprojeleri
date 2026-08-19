'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import type { HaritaNoktasi } from '@/lib/queries/harita';
// Saf fonksiyon; sorgu modülünden alınsaydı postgres sürücüsü
// tarayıcı paketine girerdi.
import { bant } from '@/lib/bant';
import { paraKisa } from '@/lib/format';

/**
 * Harita görünümü.
 *
 * Leaflet SUNUCUDA çalışamaz (window'a bağımlı), bu yüzden modül
 * useEffect içinde dinamik import edilir. next/dynamic ssr:false yerine
 * bu yol seçildi: sunucu paketine hiç girmiyor ve sarmalayıcı bileşen
 * gerektirmiyor.
 *
 * Pinler divIcon: tasarımdaki "fiyat etiketli baloncuk" ancak HTML ile
 * yapılabilir. Vector sembollerle aynı görünüm elde edilemezdi.
 *
 * Karo sağlayıcısı ortam değişkeninden gelir. Üretimde OSM'in genel
 * sunucusu KULLANILMAMALI (kullanım politikası yasaklıyor); Protomaps
 * PMTiles'ı R2'ye koymak bu yığında en ucuz yol — çıkış trafiği zaten
 * ücretsiz.
 */

type Poi = { tip: string; ad: string; lng: number; lat: number };

type Props = {
  noktalar: HaritaNoktasi[];
  poi: Poi[];
  merkez: [number, number];
  yakinlik: number;
  onGorunur?: (idler: number[]) => void;
};

const POI_ADLARI: Record<string, string> = {
  metro: 'Metro', metrobus: 'Metrobüs', okul: 'Okul',
  hastane: 'Hastane', avm: 'AVM', sahil: 'Sahil',
};

const ACIK_KARO =
  process.env.NEXT_PUBLIC_HARITA_KARO ??
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const KOYU_KARO = process.env.NEXT_PUBLIC_HARITA_KARO_KOYU ?? ACIK_KARO;

function koyuMu(): boolean {
  if (typeof document === 'undefined') return false;
  const secim = document.documentElement.dataset.theme;
  if (secim === 'dark') return true;
  if (secim === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function Harita({ noktalar, poi, merkez, yakinlik, onGorunur }: Props) {
  const kap = useRef<HTMLDivElement>(null);
  const haritaRef = useRef<unknown>(null);
  const [katmanlar, setKatmanlar] = useState<Record<string, boolean>>({ metro: true });
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    if (!kap.current || haritaRef.current) return;
    let iptal = false;

    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster');
      if (iptal || !kap.current) return;

      const harita = L.map(kap.current, {
        center: merkez,
        zoom: yakinlik,
        scrollWheelZoom: true,
        attributionControl: true,
      });
      haritaRef.current = harita;

      L.tileLayer(koyuMu() ? KOYU_KARO : ACIK_KARO, {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap katkıcıları',
      }).addTo(harita);

      // ── Proje pinleri ──
      const kume = (L as unknown as {
        markerClusterGroup: (o: object) => L.LayerGroup & { addLayer: (l: L.Layer) => void };
      }).markerClusterGroup({
        maxClusterRadius: 48,
        showCoverageOnHover: false,
        iconCreateFunction: (c: { getChildCount: () => number }) =>
          L.divIcon({
            html: `<span>${c.getChildCount()}</span>`,
            className: 'hp-kume',
            iconSize: [44, 44],
          }),
      });

      for (const n of noktalar) {
        const etiket = paraKisa(n.min_fiyat) ?? 'Fiyat isteyin';
        const isaret = L.marker([n.lat, n.lng], {
          icon: L.divIcon({
            html: `<span class="hp-pin hp-pin--${bant(n.m2_birim)}">${etiket}</span>`,
            className: '',
            iconSize: [0, 0],
          }),
        });

        isaret.bindPopup(
          `<a class="hp-pop" href="/${n.il}/${n.ilce}/${n.slug}">
             <b>${n.ad}</b>
             <span>${n.firma_ad} · ${n.ilce}</span>
             <strong>${etiket}</strong>
             ${n.kalan ? `<em>${n.kalan} daire müsait</em>` : ''}
           </a>`,
          { closeButton: true, minWidth: 210 }
        );
        kume.addLayer(isaret);
      }
      harita.addLayer(kume as unknown as L.Layer);

      // ── POI katmanları ──
      const poiKatman: Record<string, L.LayerGroup> = {};
      for (const p of poi) {
        (poiKatman[p.tip] ??= L.layerGroup()).addLayer(
          L.circleMarker([p.lat, p.lng], {
            radius: 5, weight: 2, color: '#5C8A76', fillColor: '#5C8A76', fillOpacity: 0.85,
          }).bindTooltip(`${POI_ADLARI[p.tip] ?? p.tip}: ${p.ad}`)
        );
      }
      for (const [tip, katman] of Object.entries(poiKatman)) {
        if (katmanlar[tip]) katman.addTo(harita);
      }
      (haritaRef.current as { __poi?: Record<string, L.LayerGroup> }).__poi = poiKatman;

      // Görünür alandaki projeler soldaki listeyi süzer
      const bildir = () => {
        const sinir = harita.getBounds();
        onGorunur?.(
          noktalar.filter((n) => sinir.contains([n.lat, n.lng])).map((n) => n.id)
        );
      };
      harita.on('moveend zoomend', bildir);

      if (noktalar.length > 0) {
        harita.fitBounds(noktalar.map((n) => [n.lat, n.lng] as [number, number]), {
          padding: [48, 48], maxZoom: 14,
        });
      }
      bildir();
      setHazir(true);
    })();

    return () => {
      iptal = true;
      const h = haritaRef.current as { remove?: () => void } | null;
      h?.remove?.();
      haritaRef.current = null;
    };
    // Noktalar filtre değiştiğinde sunucudan yeni gelir ve sayfa yeniden
    // kurulur; harita bir kez kurulur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function katmanDegistir(tip: string) {
    const yeni = !katmanlar[tip];
    setKatmanlar((k) => ({ ...k, [tip]: yeni }));

    const h = haritaRef.current as (L.Map & { __poi?: Record<string, L.LayerGroup> }) | null;
    const katman = h?.__poi?.[tip];
    if (!h || !katman) return;
    if (yeni) katman.addTo(h);
    else h.removeLayer(katman);
  }

  const poiTipleri = [...new Set(poi.map((p) => p.tip))];

  return (
    <div style={{ position: 'relative', height: '100%', minHeight: 520 }}>
      <div ref={kap} style={{ position: 'absolute', inset: 0, borderRadius: 'var(--r-block)' }} />

      {/* Katman düğmeleri */}
      {hazir && poiTipleri.length > 0 && (
        <div
          style={{
            position: 'absolute', top: 12, left: 12, zIndex: 500,
            display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 'calc(100% - 90px)',
          }}
        >
          {poiTipleri.map((tip) => (
            <button
              key={tip}
              type="button"
              onClick={() => katmanDegistir(tip)}
              aria-pressed={!!katmanlar[tip]}
              className={`kp-chip${katmanlar[tip] ? ' is-selected' : ''}`}
              style={{ boxShadow: 'var(--elev-1)' }}
            >
              {POI_ADLARI[tip] ?? tip}
            </button>
          ))}
        </div>
      )}

      {/* Efsane — koyu temada da görünür kalmalı */}
      {hazir && (
        <div
          style={{
            position: 'absolute', left: 12, bottom: 12, zIndex: 500,
            background: 'var(--surface-raised)', borderRadius: 'var(--r-block)',
            padding: 'var(--s-3)', boxShadow: 'var(--elev-2)', fontSize: 10.5,
          }}
        >
          <b className="kp-label" style={{ display: 'block', marginBottom: 5 }}>m² birim fiyatı</b>
          {[
            ['ucuz', '60 bin ₺ altı'],
            ['orta', '60–90 bin ₺'],
            ['yuksek', '90–120 bin ₺'],
            ['premium', '120 bin ₺ üzeri'],
          ].map(([sinif, ad]) => (
            <span key={sinif} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 0' }}>
              <i className={`hp-ornek hp-pin--${sinif}`} aria-hidden />
              <span style={{ color: 'var(--text-secondary)' }}>{ad}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
