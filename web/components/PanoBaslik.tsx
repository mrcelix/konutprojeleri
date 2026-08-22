'use client';

import { useState, useTransition } from 'react';
import Icon from './Icon';
import { TLkisa } from '@/lib/bicim';
import { panoBaglamKaydet } from '@/lib/pano-eylemler';

/* ============================================================
   Pano başlığı: paylaşım bağlantısı ve (kuran kişi için) tarih/kişi.

   Bağlantı KOPYALA düğmesiyle veriliyor: paylaşımın tamamı adres
   çubuğundan seçip kopyalamaya kalırsa özellik telefonda kullanılmaz.
   Panoyu kuran kişi tarihleri değiştirebiliyor — kartlardaki toplam
   tutar ve doluluk o tarihlere göre hesaplanıyor.
   ============================================================ */

export default function PanoBaslik(
  { kod, ad, butceMin, butceMax, sahipMi, ogeSayisi }:
  {
    kod: string; ad: string; butceMin: number | null; butceMax: number | null;
    sahipMi: boolean; ogeSayisi: number;
  },
) {
  const [acik, setAcik] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, gecis] = useTransition();

  /* Bütçe aralığı BAŞLIKTA: panoyu açan grup önce "bu bizim
     bütçemize uyuyor mu" sorusuna bakıyor ve kartlardaki uyum
     rozeti bu değere göre basılıyor (bkz. lib/pano.ts). */
  const butce = butceMin && butceMax
    ? `${TLkisa(butceMin)} – ${TLkisa(butceMax)}`
    : butceMin ? `${TLkisa(butceMin)} ve üzeri`
      : butceMax ? `${TLkisa(butceMax)}'ye kadar` : null;

  const kopyala = async () => {
    const adres = `${location.origin}/pano/${kod}`;
    try {
      await navigator.clipboard.writeText(adres);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2500);
    } catch {
      /* Pano hâlâ paylaşılabilmeli: kopyalama izni yoksa adresi
         seçilebilir biçimde gösteriyoruz. */
      window.prompt('Pano bağlantısı', adres);
    }
  };

  return (
    <header className="pano-baslik">
      <div className="pano-baslik-ust">
        <div style={{ minWidth: 0 }}>
          <h1 className="h1">{ad}</h1>
          <p className="pano-ozet">
            {ogeSayisi} proje
            {butce && <> · {butce}</>}
            {!butce && <> · bütçe belirtilmedi</>}
          </p>
        </div>

        <div className="pano-eylem">
          <button type="button" className="btn btn-primary btn-sm" onClick={kopyala}>
            <Icon n={kopyalandi ? 'check' : 'share'} s={16} sw={2.2} />
            {kopyalandi ? 'Kopyalandı' : 'Bağlantıyı kopyala'}
          </button>
          {sahipMi && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAcik((a) => !a)}
              aria-expanded={acik}>
              <Icon n="sliders" s={16} sw={2.2} /> Ad ve bütçe
            </button>
          )}
        </div>
      </div>

      {acik && sahipMi && (
        <form
          className="pano-baglam"
          action={(f) => gecis(async () => {
            const s = await panoBaglamKaydet(f);
            setHata(s.hata ?? null);
            if (!s.hata) setAcik(false);
          })}
        >
          <input type="hidden" name="kod" value={kod} />
          <label>
            <span>Pano adı</span>
            <input type="text" name="ad" defaultValue={ad} maxLength={60} />
          </label>
          <label>
            <span>Bütçe — alt sınır</span>
            <input type="text" inputMode="numeric" name="butceMin"
              defaultValue={butceMin ?? ''} placeholder="6.000.000" />
          </label>
          <label>
            <span>Üst sınır</span>
            <input type="text" inputMode="numeric" name="butceMax"
              defaultValue={butceMax ?? ''} placeholder="9.000.000" />
          </label>
          <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
            {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          {hata && <p className="form-hata" role="alert">{hata}</p>}
        </form>
      )}
    </header>
  );
}
