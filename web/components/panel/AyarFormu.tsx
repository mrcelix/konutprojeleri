'use client';

import { useActionState } from 'react';
import Icon from '@/components/Icon';
import { siteAyarKaydet, type IcerikSonucu } from '@/lib/panel-eylemler';

/* ============================================================
   Site bilgileri formu.

   Her alanın altında KODDAKİ VARSAYILAN yazıyor: alanı boş bırakmak
   "varsayılana dön" demek ve yönetici neye döneceğini görmeden bu
   kararı veremiyordu.
   ============================================================ */

interface Alan {
  ad: string;
  etiket: string;
  deger: string;
  varsayilan: string;
  ipucu?: string;
  cok?: boolean;
}

export default function AyarFormu({ gruplar }: { gruplar: { baslik: string; alanlar: Alan[] }[] }) {
  const [sonuc, eylem, bekliyor] = useActionState<IcerikSonucu | null, FormData>(
    siteAyarKaydet, null,
  );

  return (
    <form action={eylem} className="ayar-formu">
      {gruplar.map((g) => (
        <section className="p-kart" key={g.baslik}>
          <h2 className="p-kart-bas">{g.baslik}</h2>
          <div className="ayar-izgara">
            {g.alanlar.map((a) => (
              <label className={'ayar-alan' + (a.cok ? ' genis' : '')} key={a.ad}>
                <span>{a.etiket}</span>
                {a.cok ? (
                  <textarea name={a.ad} defaultValue={a.deger} rows={3} placeholder={a.varsayilan} />
                ) : (
                  <input type="text" name={a.ad} defaultValue={a.deger} placeholder={a.varsayilan} />
                )}
                {a.ipucu && <small>{a.ipucu}</small>}
                {a.varsayilan && (
                  <small className="ayar-varsayilan">
                    Boş bırakılırsa: <b>{a.varsayilan}</b>
                  </small>
                )}
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="ayar-alt">
        {sonuc?.hata && <p className="p-hata" role="alert">{sonuc.hata}</p>}
        {sonuc?.tamam && !bekliyor && (
          <p className="p-tamam" role="status"><Icon n="check" s={15} sw={2.4} /> Kaydedildi.</p>
        )}
        <button className="btn btn-primary" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
        </button>
      </div>
    </form>
  );
}
