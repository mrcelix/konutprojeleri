'use client';

import { useActionState } from 'react';
import Icon from '@/components/Icon';
import { bolgeGuncelle, type ProjeSonucu } from '@/lib/panel-eylemler';

export default function BolgeDuzenle({
  bolge,
}: {
  bolge: {
    id: string; ad: string; slug: string; ozet: string; adet: number; yayinda: boolean;
    /** `soru | cevap` satırları — bölge sayfasındaki SSS bölümü */
    sss: string;
  };
}) {
  const [durum, gonder, bekliyor] = useActionState<ProjeSonucu | null, FormData>(bolgeGuncelle, null);

  return (
    <form action={gonder} className="p-form">
      <input type="hidden" name="bolgeId" value={bolge.id} />

      <div className="p-alan">
        <label htmlFor={`ozet-${bolge.id}`}>Bölge özeti</label>
        <textarea id={`ozet-${bolge.id}`} name="ozet" defaultValue={bolge.ozet} rows={4} minLength={40} required />
        <span className="ipucu">
          İniş sayfasının giriş metni ve meta açıklamasının bir parçası. En az 40 karakter.
        </span>
      </div>

      <div className="p-satir">
        <div className="p-alan">
          <label htmlFor={`adet-${bolge.id}`}>Listelenen villa sayısı</label>
          <input id={`adet-${bolge.id}`} name="adet" type="number" defaultValue={bolge.adet} min={0} required />
          <span className="ipucu">Pazarlama sayısı; sayfada &quot;{bolge.adet} villa&quot; olarak görünür.</span>
        </div>
        <div className="p-alan" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <label className="p-onay">
            <input type="checkbox" name="yayinda" defaultChecked={bolge.yayinda} />
            <span>Yayında</span>
          </label>
        </div>
      </div>

      {/* SIK SORULANLAR: bölge sayfasında zaten basılıyordu (arama
          motoruna giden FAQ şeması dâhil) ama panelde düzenlenemiyordu.
          Biçim kurumsal sayfalardakiyle aynı. */}
      <div className="p-alan">
        <label htmlFor={`sss-${bolge.id}`}>Sık sorulanlar</label>
        <textarea
          id={`sss-${bolge.id}`} name="sss" rows={5} defaultValue={bolge.sss}
          style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
        />
        <span className="ipucu">
          Her satıra bir soru: <code>soru | cevap</code>. Boş bırakılırsa sayfadaki
          SSS bölümü hiç görünmüyor.
        </span>
      </div>

      {durum?.hata && <p className="form-hata" role="alert"><Icon n="x" s={16} sw={2.4} /> {durum.hata}</p>}
      {durum?.tamam && <p className="form-basarili" role="status"><Icon n="check" s={16} sw={2.4} /> Kaydedildi.</p>}

      <div>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
