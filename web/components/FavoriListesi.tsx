'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from './AppState';
import Icon from './Icon';
import ProjeKart from './ProjeKart';
import type { Proje } from '@/lib/types';

/* ============================================================
   Favori projeler.

   Favoriler oturum değil TARAYICI kaydı: giriş yapmadan gezen
   ziyaretçi de beğendiğini işaretleyebilsin diye `localStorage`da
   duruyor (`AppState`). Bu yüzden liste sunucuda üretilemiyor;
   sayfa yayındaki projelerin tamamını alıyor, kimlikleri burada
   eşleştiriyor.

   İlk çizimde liste BOŞ basılıyor — `localStorage` sunucuda yok.
   `hazir` bayrağı olmadan "Henüz favoriniz yok" yazısı bir anlığına
   dolu listenin yerine geçiyor ve sayfa yanıp sönüyordu.
   ============================================================ */

export default function FavoriListesi({ projeler }: { projeler: Proje[] }) {
  const { favoriler, toggleFavori } = useApp();
  const [hazir, setHazir] = useState(false);

  useEffect(() => { setHazir(true); }, []);

  /* Sıra FAVORİYE EKLEME SIRASI: proje listesinin kendi sırası,
     "en son neyi beğenmiştim?" sorusunu cevaplamıyor. */
  const secilenler = favoriler
    .map((id) => projeler.find((p) => p.id === id))
    .filter((p): p is Proje => Boolean(p));

  if (!hazir) {
    return <div className="fav-iskelet" aria-hidden="true" />;
  }

  if (secilenler.length === 0) {
    return (
      <div className="fav-bos">
        <Icon n="heart" s={30} sw={1.6} />
        <h2>Henüz favoriniz yok</h2>
        <p>
          Beğendiğiniz projenin kartındaki kalbe dokunun; burada
          birikir ve tarayıcınızda saklanır.
        </p>
        <Link className="btn btn-cta" href="/arama">
          Projelere göz atın <Icon n="arrowR" s={16} />
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="fav-arac">
        <span className="muted small">
          {secilenler.length} proje · yalnızca bu tarayıcıda saklanıyor
        </span>
        <button type="button" className="btn btn-quiet btn-sm"
          onClick={() => secilenler.forEach((v) => toggleFavori(v.id))}>
          <Icon n="x" s={14} sw={2.4} /> Listeyi temizle
        </button>
      </div>

      <div className="grid-projeler cols-3">
        {secilenler.map((p, i) => <ProjeKart key={p.id} p={p} oncelikli={i < 3} />)}
      </div>

      {/* Favorileri kaybetmemenin tek yolu: aynı tarayıcı. Panoya
          aktarmak bağlantıyla paylaşılabilir bir kopya bırakıyor. */}
      <p className="fav-not">
        <Icon n="spark" s={15} />
        Listeyi eşinizle ya da ortağınızla paylaşmak için
        <Link href="/pano"> karşılaştırma panosuna</Link> aktarın.
      </p>
    </>
  );
}
