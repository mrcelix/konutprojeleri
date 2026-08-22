'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import type { AktifKampanya } from '@/lib/kampanya';

/* ============================================================
   Kampanya şeridi.

   Kapatılabiliyor ve kapatma KAMPANYA KİMLİĞİYLE hatırlanıyor: tek bir
   "kapattım" bayrağı olsaydı, sonraki kampanya da hiç görünmezdi.

   Geri sayım istemcide hesaplanıyor. Sunucuda hesaplanıp HTML'e
   gömülseydi statik sayfa saatlerce eski bir süre gösterirdi.
   ============================================================ */

const ANAHTAR = 'vn_kampanya_kapali';

function kalanMetin(bitisIso: string): string | null {
  const kalan = Date.parse(bitisIso) - Date.now();
  if (!Number.isFinite(kalan) || kalan <= 0) return null;
  const gun = Math.floor(kalan / 864e5);
  const saat = Math.floor((kalan % 864e5) / 36e5);
  const dakika = Math.floor((kalan % 36e5) / 6e4);
  if (gun > 0) return `${gun} gün ${saat} saat`;
  if (saat > 0) return `${saat} saat ${dakika} dk`;
  return `${dakika} dk`;
}

export default function KampanyaSeridi({ k }: { k: AktifKampanya }) {
  const [gizli, setGizli] = useState(true);
  const [kalan, setKalan] = useState<string | null>(null);

  useEffect(() => {
    /* İlk render'da GİZLİ: sunucu tarafında kapatılıp kapatılmadığı
       bilinmiyor, görünür başlasaydı kapatılmış şerit bir kare
       yanıp sönerdi. */
    let kapali: string[] = [];
    try { kapali = JSON.parse(localStorage.getItem(ANAHTAR) ?? '[]'); } catch { /* yok sayılır */ }
    setGizli(Array.isArray(kapali) && kapali.includes(k.id));
  }, [k.id]);

  useEffect(() => {
    if (!k.geriSayim) return;
    const yenile = () => setKalan(kalanMetin(k.bitisIso));
    yenile();
    const t = setInterval(yenile, 60_000);
    return () => clearInterval(t);
  }, [k.geriSayim, k.bitisIso]);

  function kapat() {
    setGizli(true);
    try {
      const mevcut = JSON.parse(localStorage.getItem(ANAHTAR) ?? '[]');
      const liste = Array.isArray(mevcut) ? mevcut : [];
      localStorage.setItem(ANAHTAR, JSON.stringify([...new Set([...liste, k.id])].slice(-20)));
    } catch { /* kota dolu — şerit bu oturumda kapalı kalıyor */ }
  }

  if (gizli) return null;

  return (
    <div className="kampanya" role="region" aria-label="Kampanya duyurusu">
      <div className="kampanya-ic">
        <span className="kampanya-ikon" aria-hidden="true"><Icon n="spark" s={15} /></span>
        <span className="kampanya-metin">{k.metin}</span>

        {k.geriSayim && kalan && (
          <span className="kampanya-sayac">
            <Icon n="clock" s={13} /> {kalan} kaldı
          </span>
        )}

        {k.cagriAd && k.cagriYol && (
          <Link className="kampanya-cagri" href={k.cagriYol}>
            {k.cagriAd} <Icon n="arrowR" s={14} />
          </Link>
        )}

        <button type="button" className="kampanya-kapat" onClick={kapat} aria-label="Duyuruyu kapat">
          <Icon n="x" s={15} sw={2.4} />
        </button>
      </div>
    </div>
  );
}
