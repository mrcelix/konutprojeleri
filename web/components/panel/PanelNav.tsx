'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import type { NavOge } from './PanelKabuk';

/* ============================================================
   Panel menüsü.

   Yönetim menüsü YİRMİ YEDİ satıra çıkmıştı ve düz bir liste olarak
   duruyordu: "kampanya nerede?" sorusunun cevabı her seferinde
   yukarıdan aşağı okumaktı. Satırlar artık başlıklar altında
   gruplanıyor (İçerik, Operasyon, Finans, Sistem) ve üstte bir
   SÜZME kutusu var — yazarken liste daralıyor, `Enter` ilk sonuca
   gidiyor.

   Süzme kutusu yalnızca liste uzunsa (10+) basılıyor: firma
   panelinde on bir satır var ve orada arama kutusu fazlalık olurdu.
   ============================================================ */

export default function PanelNav({ nav }: { nav: NavOge[] }) {
  const yol = usePathname();
  const [suzgec, setSuzgec] = useState('');
  const kutu = useRef<HTMLInputElement>(null);

  /* Kısayol: panelde "/" tuşu menü süzmesine odaklanıyor. Metin
     alanındayken çalışmıyor, aksi hâlde yazarken odak kayardı. */
  useEffect(() => {
    const tus = (e: KeyboardEvent) => {
      const h = e.target as HTMLElement | null;
      const yaziyor = h && (h.tagName === 'INPUT' || h.tagName === 'TEXTAREA' || h.isContentEditable);
      if (e.key === '/' && !yaziyor) { e.preventDefault(); kutu.current?.focus(); }
      if (e.key === 'Escape' && document.activeElement === kutu.current) {
        setSuzgec(''); kutu.current?.blur();
      }
    };
    document.addEventListener('keydown', tus);
    return () => document.removeEventListener('keydown', tus);
  }, []);

  const norm = (x: string) => x.toLocaleLowerCase('tr').replace(/[ıİ]/g, 'i');
  const suzulmus = useMemo(
    () => (suzgec.trim() ? nav.filter((n) => norm(n.ad).includes(norm(suzgec.trim()))) : nav),
    [nav, suzgec],
  );

  /* Gruplar TANIMLANMA SIRASINI koruyor: alfabetik sıralamak
     "Analitik"i en üste alıp günlük işi aşağı iterdi. */
  const gruplar = useMemo(() => {
    const m = new Map<string, NavOge[]>();
    for (const n of suzulmus) {
      const g = n.grup ?? '';
      m.set(g, [...(m.get(g) ?? []), n]);
    }
    return [...m.entries()];
  }, [suzulmus]);

  const aktifMi = (n: NavOge) => {
    // Kök rota yalnızca tam eşleşmede aktif; alt rotalar önek eşleşmesiyle
    const kokMu = n.yol.split('/').length <= 2;
    return kokMu ? yol === n.yol : yol.startsWith(n.yol);
  };

  return (
    <div className="panel-nav-sar">
      {nav.length >= 10 && (
        <div className="panel-suz">
          <Icon n="search" s={14} sw={2.2} />
          <input
            ref={kutu} type="search" value={suzgec} placeholder="Menüde ara ( / )"
            aria-label="Menüde ara"
            onChange={(e) => setSuzgec(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && suzulmus[0]) {
                e.preventDefault();
                window.location.href = suzulmus[0].yol;
              }
            }}
          />
        </div>
      )}

      <nav className="panel-nav" aria-label="Panel menüsü">
        {suzulmus.length === 0 && <p className="panel-nav-bos">Eşleşen sayfa yok</p>}
        {gruplar.map(([grup, ogeler]) => (
          <div className="panel-nav-grup" key={grup || 'genel'}>
            {grup && !suzgec.trim() && <h3>{grup}</h3>}
            {ogeler.map((n) => {
              const aktif = aktifMi(n);
              return (
                <Link key={n.yol} href={n.yol} className={aktif ? 'aktif' : ''}
                  aria-current={aktif ? 'page' : undefined}>
                  <Icon n={n.ikon} s={17} />
                  <span>{n.ad}</span>
                  {!!n.rozet && n.rozet > 0 && <b className="rozet">{n.rozet > 99 ? '99+' : n.rozet}</b>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
