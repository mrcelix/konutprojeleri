'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import { sayfaVarsayilanaDondur } from '@/lib/panel-eylemler';

/* ============================================================
   Sayfayı koda gömülü hâline döndür.

   Kurumsal sayfa metni veritabanında duruyor; `icerik-varsayilan.ts`
   yalnızca tohumlanmamış kurulumun yedeği. Metin kodda güncellendiğinde
   yayındaki sayfa eski hâlinde kalıyor ve tazelemenin tek yolu sunucuya
   erişip tohum betiğini çalıştırmaktı — panelden içerik yöneten kişinin
   elinde böyle bir imkân yok.

   İKİ ADIM: düğme önce onay istiyor. Tek tıkla çalışsaydı, sayfada
   saatlerce uğraşılmış bir metin yanlışlıkla geri alınırdı ve geri
   dönüşü yok.
   ============================================================ */

export default function SayfaVarsayilan({ id }: { id: string }) {
  const yonlendir = useRouter();
  const [bekliyor, gecis] = useTransition();
  const [onay, setOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  if (!onay) {
    return (
      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOnay(true)}>
        <Icon n="refresh" s={14} sw={2.2} /> Varsayılana döndür
      </button>
    );
  }

  return (
    <div className="sayfa-varsayilan">
      <p>
        <b>Bu sayfadaki düzenlemeleriniz silinecek</b> ve metin
        yazılımdaki hâline dönecek. Geri alınamıyor.
      </p>
      {hata && <p className="form-hata" role="alert">{hata}</p>}
      <div className="p-islem">
        <button
          type="button" className="btn btn-danger btn-sm" disabled={bekliyor}
          onClick={() => gecis(async () => {
            const s = await sayfaVarsayilanaDondur(id);
            if (s.hata) { setHata(s.hata); return; }
            setOnay(false);
            yonlendir.refresh();
          })}
        >
          {bekliyor ? 'Döndürülüyor…' : 'Evet, varsayılana döndür'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={bekliyor}
          onClick={() => { setOnay(false); setHata(null); }}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}
