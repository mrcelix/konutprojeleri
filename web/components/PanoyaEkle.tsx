'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import Icon from './Icon';
import { panolarimOzet, panoyaEkle, panoyaHizliEkle } from '@/lib/pano-eylemler';

/* ============================================================
   "Panoya ekle" — proje sayfasındaki giriş.

   Favori tek kişilik ve sessiz bir işaret; pano paylaşılıyor ve
   üzerinde konuşuluyor. Bu yüzden ayrı bir düğme: "kalp" ile aynı
   şey değil.

   Panolar AÇILINCA çekiliyor, sayfa yüklenirken değil: proje
   sayfasına giren herkesin panosu yok ve olmayan bir listeyi her
   ziyarette sormak boşuna sorgu.
   ============================================================ */

export default function PanoyaEkle({ projeSlug, projeAdi }: { projeSlug: string; projeAdi: string }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [liste, setListe] = useState<{ kod: string; ad: string; adet: number }[] | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [bekliyor, gecis] = useTransition();
  const kap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;
    let iptal = false;
    void panolarimOzet().then((l) => { if (!iptal) setListe(l); });
    return () => { iptal = true; };
  }, [acik]);

  useEffect(() => {
    const disari = (e: MouseEvent) => {
      if (kap.current && !kap.current.contains(e.target as Node)) setAcik(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAcik(false); };
    document.addEventListener('click', disari);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('click', disari);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const ekle = (kod: string) => gecis(async () => {
    const s = await panoyaEkle(kod, projeSlug);
    setMesaj(s.hata ?? 'Panoya eklendi.');
    if (!s.hata) setTimeout(() => setAcik(false), 900);
  });

  const yeniPano = () => gecis(async () => {
    const s = await panoyaHizliEkle(projeSlug, `${projeAdi} ve diğerleri`);
    if (s.kod) router.push(`/pano/${s.kod}`);
    else setMesaj(s.hata ?? 'Pano açılamadı.');
  });

  return (
    <div className="panoya-ekle" ref={kap}>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}>
        <Icon n="grid" s={16} sw={2.2} /> Panoya ekle
      </button>

      {acik && (
        <div className="panoya-menu" role="dialog" aria-label="Panoya ekle">
          <p className="panoya-bas">
            Projeyi bir panoya koyun, bağlantıyı paylaşın; aileniz
            oy versin.
          </p>

          {liste === null && <p className="tiny muted">Panolar getiriliyor…</p>}

          {liste?.map((p) => (
            <button key={p.kod} type="button" className="panoya-satir"
              onClick={() => ekle(p.kod)} disabled={bekliyor}>
              <span><b>{p.ad}</b><small>{p.adet} proje</small></span>
              <Icon n="plus" s={15} sw={2.4} />
            </button>
          ))}

          <button type="button" className="panoya-satir yeni" onClick={yeniPano} disabled={bekliyor}>
            <span><b>Yeni pano aç</b><small>bu projeyle başlar</small></span>
            <Icon n="arrowR" s={15} sw={2.2} />
          </button>

          {mesaj && <p className="tiny panoya-mesaj" role="status">{mesaj}</p>}
        </div>
      )}
    </div>
  );
}
