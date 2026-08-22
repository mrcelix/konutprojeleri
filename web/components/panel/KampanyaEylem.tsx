'use client';

import { useActionState, useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import {
  kampanyaDurum, kampanyaKaydet, kampanyaSil, type IcerikSonucu,
} from '@/lib/panel-eylemler';

const BOS: IcerikSonucu | null = null;

export interface KampanyaVeri {
  id: string;
  metin: string;
  cagriAd: string | null;
  cagriYol: string | null;
  geriSayim: boolean;
  baslangic: string;
  bitis: string;
  aktif: boolean;
}

const gunOku = (iso: string) => iso.slice(0, 10);

/** Yeni kampanya ya da mevcut olanın düzenlemesi. */
export function KampanyaFormu({ k }: { k?: KampanyaVeri }) {
  const [durum, gonder, bekliyor] = useActionState<IcerikSonucu | null, FormData>(
    kampanyaKaydet, BOS,
  );
  const [acik, setAcik] = useState(!k);

  if (!acik) {
    return (
      <button className="btn btn-quiet btn-sm" type="button" onClick={() => setAcik(true)}>
        <Icon n="sliders" s={14} sw={2.2} /> Düzenle
      </button>
    );
  }

  const bugun = new Date().toISOString().slice(0, 10);

  return (
    <form action={gonder} className="p-form">
      {k && <input type="hidden" name="id" value={k.id} />}

      {durum?.hata && <p className="form-hata" role="alert">{durum.hata}</p>}
      {durum?.tamam && (
        <p className="tiny" style={{ color: 'var(--success)', margin: '0 0 10px' }}>
          <Icon n="check" s={14} sw={2.4} /> Kaydedildi.
        </p>
      )}

      <label style={{ display: 'block' }}>
        <span className="tiny">Şerit metni <em style={{ color: 'var(--danger)' }}>*</em></span>
        <input name="metin" required minLength={8} maxLength={200}
          defaultValue={k?.metin} placeholder="31 Ağustos'a kadar peşin alımda %10 indirim" />
      </label>

      <div className="form-izgara" style={{ marginTop: 10 }}>
        <label>
          <span>Başlangıç <em>*</em></span>
          <input name="baslangic" type="date" required defaultValue={k ? gunOku(k.baslangic) : bugun} />
        </label>
        <label>
          <span>Bitiş <em>*</em></span>
          <input name="bitis" type="date" required defaultValue={k ? gunOku(k.bitis) : ''} />
        </label>
        <label>
          <span>Düğme metni</span>
          <input name="cagriAd" maxLength={40} defaultValue={k?.cagriAd ?? ''} placeholder="Projelerı gör" />
        </label>
        <label>
          <span>Düğme adresi</span>
          <input name="cagriYol" maxLength={200} defaultValue={k?.cagriYol ?? ''} placeholder="/arama" />
        </label>
      </div>

      <label className="tiny" style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginTop: 12 }}>
        <input type="checkbox" name="geriSayim" value="evet" defaultChecked={k?.geriSayim} />
        <span>
          <b>Geri sayım göster.</b> Bitişe kalan süre şeritte yazar. Aciliyeti
          olmayan bir duyuruda (yeni bölge, hizmet değişikliği) kapalı bırakın.
        </span>
      </label>

      <p className="tiny muted" style={{ margin: '10px 0 0' }}>
        Bitiş tarihi <b>gün sonuna</b> kadar geçerlidir. Süre dolunca şerit
        kendiliğinden düşer; elle kapatmanız gerekmez.
      </p>

      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {k && (
          <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
            onClick={() => setAcik(false)}>Vazgeç</button>
        )}
      </div>
    </form>
  );
}

/** Aç/kapat ve sil. */
export function KampanyaDurum({ id, aktif }: { id: string; aktif: boolean }) {
  const [bekliyor, basla] = useTransition();
  const [onay, setOnay] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
        onClick={() => basla(() => { void kampanyaDurum(id, !aktif); })}>
        {aktif ? 'Yayından kaldır' : 'Yayına al'}
      </button>

      {!onay ? (
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => setOnay(true)}>
          Sil
        </button>
      ) : (
        <>
          <button className="btn btn-sm" type="button" disabled={bekliyor}
            style={{ background: 'var(--danger)', color: '#fff' }}
            onClick={() => basla(() => { void kampanyaSil(id); })}>
            Silmeyi onayla
          </button>
          <button className="btn btn-quiet btn-sm" type="button" onClick={() => setOnay(false)}>
            Vazgeç
          </button>
        </>
      )}
    </div>
  );
}
