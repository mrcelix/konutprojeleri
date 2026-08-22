'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Map as MLMap, Marker } from 'maplibre-gl';
import { TL } from '@/lib/bicim';

/* ============================================================
   Gerçek harita (MapLibre GL).

   Karo (tile) kaynağı:
   ------------------------------------------------------------
   Varsayılan OpenStreetMap raster karoları GELİŞTİRME İÇİNDİR.
   OSM'in kullanım politikası ticari/yoğun kullanımı yasaklıyor.
   Üretimde `NEXT_PUBLIC_HARITA_STIL` değişkenine bir sağlayıcı
   stil URL'i verin (MapTiler, Protomaps, Stadia). Detay: docs/arama.md

   maplibre-gl ~230 KB (gzip). Bu sayfaya özel `dynamic` import ile
   yükleniyor; site genelindeki paket boyutunu etkilemiyor. Arama
   sayfası zaten indekslenmiyor, Core Web Vitals bütçesi burada
   iniş sayfalarındaki kadar sıkı değil.

   KÜMELEME EKRAN UZAYINDA
   ------------------------------------------------------------
   Türkiye ölçeğinde bakınca aynı mahalledeki sekiz projenin sekiz fiyat
   balonu üst üste biniyor: en üstteki okunuyor, altındakiler
   tıklanamıyordu. İşaretçiler her hareketten sonra EKRAN
   koordinatına çevrilip ~68 pikselik hücrelere bölünüyor; hücrede
   birden çok proje varsa tek bir sayı balonu çiziliyor ve tıklayınca
   o gruba yakınlaşıyor.

   Kümeleme coğrafi ızgarada değil ekran ızgarasında: çakışma bir
   ekran olayı — aynı iki nokta yakınlaşınca ayrılıyor, uzaklaşınca
   birleşiyor. Coğrafi ızgara her yakınlaştırma düzeyi için ayrı bir
   eşik tablosu isterdi.
   ============================================================ */

export interface HaritaPin {
  id: string;
  slug: string;
  ad: string;
  lat: number;
  lng: number;
  fiyat: number;
  gorsel: string | null;
  bolge: string;
  puan: number;
  /// Yorum sayısı: sıfırsa balonda puan yerine "Yeni" yazıyor
  yorum: number;
}

/** Dışarıdan haritayı yönetmek için (sonuçlara sığdır). */
export interface HaritaKolu {
  sigdir: () => void;
}

const OSM_STIL = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap katkıcıları',
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
};

/** Kümeleme hücresi — bu kadar piksel yakındaki pinler tek balon. */
const HUCRE = 72;
/** İkinci geçişin birleştirme mesafesi. Hücreden GENİŞ: balonun kendisi
    ~90 piksel; merkezleri bir hücre kadar uzak iki balon hâlâ üst üste
    biniyor. */
const BIRLESTIR = 104;

export default function Harita({
  pinler, vurgu, onVurgu, onGorunum, onSec, onHareket, kol,
}: {
  pinler: HaritaPin[];
  vurgu: string | null;
  onVurgu: (id: string | null) => void;
  /** Harita durduğunda yeni sınır kutusu: [güney, batı, kuzey, doğu] */
  onGorunum: (kutu: [number, number, number, number]) => void;
  onSec: (p: HaritaPin) => void;
  /** Kullanıcı haritayı elle oynattı — "bu alanda ara" düğmesi için */
  onHareket?: () => void;
  kol?: React.Ref<HaritaKolu>;
}) {
  const kapRef = useRef<HTMLDivElement>(null);
  const haritaRef = useRef<MLMap | null>(null);
  const isaretRef = useRef<Marker[]>([]);
  const pinRef = useRef<HaritaPin[]>(pinler);
  pinRef.current = pinler;
  // `kuruldu` harita nesnesi oluşur oluşmaz true olur. İşaretçiler sadece
  // DOM elemanı konumlandırıyor; stilin/karoların yüklenmesini beklemeleri
  // gerekmiyor. `load` olayına bağlamak, karolar yavaş veya erişilemez
  // olduğunda pinlerin hiç görünmemesine yol açıyordu.
  const [kuruldu, setKuruldu] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [karoHatasi, setKaroHatasi] = useState(false);

  // Geri çağrıları ref'te tutuyoruz: her render'da haritayı yeniden
  // kurmamak için efektin bağımlılık listesi boş kalmalı.
  const cbRef = useRef({ onGorunum, onSec, onVurgu, onHareket });
  cbRef.current = { onGorunum, onSec, onVurgu, onHareket };

  const vurguRef = useRef<string | null>(vurgu);
  vurguRef.current = vurgu;

  /** Bütün işaretçileri kümeleyip yeniden çiziyor. */
  const ciz = useCallback(async () => {
    const harita = haritaRef.current;
    if (!harita) return;
    const maplibre = await import('maplibre-gl');
    if (haritaRef.current !== harita) return;

    for (const m of isaretRef.current) m.remove();
    isaretRef.current = [];

    /* Ekran ızgarası: her pin bir hücreye düşüyor. Görünümün dışında
       kalanlar da çiziliyor — kenardan içeri süzülen bir pin kaybolmuş
       gibi görünmesin. */
    const hucreler = new Map<string, { pin: HaritaPin; x: number; y: number }[]>();
    for (const p of pinRef.current) {
      const n = harita.project([p.lng, p.lat]);
      const k = `${Math.floor(n.x / HUCRE)}:${Math.floor(n.y / HUCRE)}`;
      const kayit = { pin: p, x: n.x, y: n.y };
      const liste = hucreler.get(k);
      if (liste) liste.push(kayit); else hucreler.set(k, [kayit]);
    }

    /* İKİNCİ GEÇİŞ: komşu hücrelerin balonları yine üst üste binebiliyor
       — ızgara sınırı coğrafyayı umursamıyor, bir koyun iki yakası iki
       ayrı hücreye düşüyor. Merkezleri bir hücreden yakın olan gruplar
       birleştiriliyor; ekranda iki balon yerine bir tane kalıyor. */
    const merkez = (g: { x: number; y: number }[]) => ({
      x: g.reduce((t, k) => t + k.x, 0) / g.length,
      y: g.reduce((t, k) => t + k.y, 0) / g.length,
    });
    const kalanlar = [...hucreler.values()].sort((a, b) => b.length - a.length);
    const gruplar: { pin: HaritaPin; x: number; y: number }[][] = [];
    while (kalanlar.length) {
      const g = kalanlar.shift()!;
      let m = merkez(g);
      for (let i = kalanlar.length - 1; i >= 0; i--) {
        const o = merkez(kalanlar[i]);
        if (Math.hypot(o.x - m.x, o.y - m.y) < BIRLESTIR) {
          g.push(...kalanlar.splice(i, 1)[0]);
          m = merkez(g);
        }
      }
      gruplar.push(g);
    }

    for (const kayitlar of gruplar) {
      const grup = kayitlar.map((k) => k.pin);
      if (grup.length === 1) {
        const p = grup[0];
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'harita-pin';
        el.dataset.pin = p.id;
        el.textContent = TL(p.fiyat);
        el.setAttribute('aria-label', `${p.ad}, ${p.bolge}, ${TL(p.fiyat)}’den başlayan`);
        el.addEventListener('click', (ev) => { ev.stopPropagation(); cbRef.current.onSec(p); });
        el.addEventListener('mouseenter', () => cbRef.current.onVurgu(p.id));
        el.addEventListener('mouseleave', () => cbRef.current.onVurgu(null));
        isaretRef.current.push(
          new maplibre.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(harita),
        );
        continue;
      }

      /* Küme balonu grubun ORTASINDA değil, en ucuz projenin üstünde
         durmuyor: ortalama konum, balonu kapsadığı pinlerin arasına
         koyuyor ve hangilerini temsil ettiği okunuyor. */
      const lng = grup.reduce((t, p) => t + p.lng, 0) / grup.length;
      const lat = grup.reduce((t, p) => t + p.lat, 0) / grup.length;
      const enUcuz = Math.min(...grup.map((p) => p.fiyat));

      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'harita-kume';
      el.innerHTML = `<b>${grup.length}</b><span>${TL(enUcuz)}’den</span>`;
      el.setAttribute('aria-label', `${grup.length} proje, en ucuzu ${TL(enUcuz)}’den başlıyor. Yakınlaştırmak için tıklayın.`);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        /* Gruba SIĞDIR, sabit bir kademe yakınlaştırma değil: iki
           proje yan yanaysa bir kademe onları ayırmaya yetmiyor,
           sekizi bir koydaysa üç kademe fazla geliyor. */
        const enler: [number, number, number, number] = [
          Math.min(...grup.map((p) => p.lng)), Math.min(...grup.map((p) => p.lat)),
          Math.max(...grup.map((p) => p.lng)), Math.max(...grup.map((p) => p.lat)),
        ];
        harita.fitBounds([[enler[0], enler[1]], [enler[2], enler[3]]], {
          padding: 90, maxZoom: 16, duration: 420,
        });
      });
      isaretRef.current.push(
        new maplibre.Marker({ element: el }).setLngLat([lng, lat]).addTo(harita),
      );
    }

    /* Vurgu yeniden çizimden sonra da kalmalı. */
    for (const m of isaretRef.current) {
      const el = m.getElement();
      el.classList.toggle('vurgu', !!el.dataset.pin && el.dataset.pin === vurguRef.current);
    }
  }, []);

  /** Sonuçların tamamını ekrana sığdır. */
  const sigdir = useCallback(() => {
    const harita = haritaRef.current;
    const p = pinRef.current;
    if (!harita || p.length === 0) return;
    const kutu: [[number, number], [number, number]] = [
      [Math.min(...p.map((x) => x.lng)), Math.min(...p.map((x) => x.lat))],
      [Math.max(...p.map((x) => x.lng)), Math.max(...p.map((x) => x.lat))],
    ];
    harita.fitBounds(kutu, { padding: 70, maxZoom: 13, duration: 500 });
  }, []);

  useImperativeHandle(kol, () => ({ sigdir }), [sigdir]);

  useEffect(() => {
    let iptal = false;

    (async () => {
      try {
        const maplibre = await import('maplibre-gl');
        if (iptal || !kapRef.current) return;

        const stilUrl = process.env.NEXT_PUBLIC_HARITA_STIL;
        const harita = new maplibre.Map({
          container: kapRef.current,
          style: stilUrl ? stilUrl : OSM_STIL,
          center: [29.5, 36.8],
          zoom: 7,
          attributionControl: { compact: true },
          // Türkiye dışına kaymayı sınırla — kullanıcı boş denize düşmesin
          maxBounds: [[24.0, 34.0], [46.0, 43.0]],
        });

        harita.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
        harita.addControl(new maplibre.GeolocateControl({ trackUserLocation: false }), 'top-right');

        // Karo kaynağı erişilemezse haritayı gizlemek yerine uyarı gösteriyoruz;
        // pinler ve konum bilgisi yine de kullanılabilir durumda kalıyor.
        harita.on('error', (o) => {
          if (o?.error && /tile|source|network|fetch/i.test(String(o.error.message ?? ''))) {
            if (!iptal) setKaroHatasi(true);
          }
        });

        /* Kullanıcının kendi hareketi ile programlı hareket AYRI:
           "bu alanda ara" düğmesi yalnızca kullanıcı haritayı
           oynattığında çıkmalı, sonuçlara sığdırdığımızda değil. */
        harita.on('dragstart', () => cbRef.current.onHareket?.());
        harita.on('zoomstart', (o) => {
          if ((o as { originalEvent?: unknown }).originalEvent) cbRef.current.onHareket?.();
        });

        // Hareket bittiğinde sonuçları tazele. `moveend` sürükleme ve
        // yakınlaştırmanın ikisini de kapsıyor; her karede sorgu atmıyoruz.
        harita.on('moveend', () => {
          const s = harita.getBounds();
          cbRef.current.onGorunum([s.getSouth(), s.getWest(), s.getNorth(), s.getEast()]);
          void ciz();
        });

        haritaRef.current = harita;
        if (!iptal) setKuruldu(true);
      } catch (e) {
        console.error('Harita yüklenemedi:', e);
        if (!iptal) setHata('Harita yüklenemedi. Liste görünümü çalışmaya devam ediyor.');
      }
    })();

    return () => {
      iptal = true;
      for (const m of isaretRef.current) m.remove();
      isaretRef.current = [];
      haritaRef.current?.remove();
      haritaRef.current = null;
    };
  }, [ciz]);

  // Pinler değişince yeniden kümele
  useEffect(() => {
    if (!kuruldu) return;
    void ciz();
  }, [pinler, kuruldu, ciz]);

  // Listeden gelen vurguyu haritaya yansıt
  useEffect(() => {
    for (const m of isaretRef.current) {
      const el = m.getElement();
      el.classList.toggle('vurgu', !!el.dataset.pin && el.dataset.pin === vurgu);
    }
  }, [vurgu, pinler]);

  return (
    <div className="harita-kap">
      <div ref={kapRef} className="harita-tuval" />
      {!kuruldu && !hata && <div className="harita-durum">Harita yükleniyor…</div>}
      {hata && <div className="harita-durum harita-hata">{hata}</div>}
      {kuruldu && karoHatasi && (
        <div className="harita-uyari" role="status">
          Harita görselleri yüklenemedi — konum işaretleri çalışmaya devam ediyor.
        </div>
      )}
    </div>
  );
}
