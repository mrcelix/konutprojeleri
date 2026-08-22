'use client';

import { useActionState, useState } from 'react';
import Icon from './Icon';
import { TL } from '@/lib/bicim';
import { fiyatAlarmiKur, type EylemSonucu } from '@/lib/alarm-eylemler';

const BOS: EylemSonucu = {};

/* ============================================================
   Fiyat alarmı kutusu.

   Proje pahalı bulunduğunda ziyaretçinin tek seçeneği sekmeyi kapatmaktı.
   Alarm, ilgiyi kaybetmeden yakalıyor.

   Hedef fiyat ÖNERİLİYOR (mevcut fiyatın %85'i): boş bırakılmış bir
   sayı alanı "ne yazmalıyım?" sorusu üretiyor ve çoğu kişi vazgeçiyor.
   ============================================================ */
export default function FiyatAlarmi(
  { projeSlug, fiyat }: { projeSlug: string; fiyat: number },
) {
  const [sonuc, gonder, bekliyor] = useActionState(fiyatAlarmiKur, BOS);
  const [acik, setAcik] = useState(false);

  const onerilen = Math.max(1000, Math.round((fiyat * 0.85) / 500) * 500);

  if (sonuc.tamam) {
    return (
      <div className="alarm-kutu alarm-tamam" role="status">
        <span className="teklif-tik"><Icon n="check" s={22} sw={2.6} /></span>
        <div>
          <b>
            {sonuc.zatenOnayli
              ? 'Alarmınız güncellendi.'
              : 'Son bir adım: e-postanızı onaylayın.'}
          </b>
          <span>
            {sonuc.bilgi
              ?? 'Adresinize bir onay bağlantısı gönderdik. Onaylamadan hiçbir e-posta göndermiyoruz.'}
          </span>
        </div>
      </div>
    );
  }

  if (!acik) {
    return (
      <div className="alarm-kutu">
        <div>
          <b>Fiyatı yüksek mi buldunuz?</b>
          <span>Hedef fiyatınızı bırakın, düştüğünde size haber verelim.</span>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setAcik(true)}>
          <Icon n="clock" s={15} /> Fiyat alarmı kur
        </button>
      </div>
    );
  }

  return (
    <form className="alarm-form" action={gonder}>
      <input type="hidden" name="proje" value={projeSlug} />

      <b>Fiyat alarmı</b>
      <p className="tiny muted" style={{ margin: '2px 0 10px' }}>
        Şu anki başlangıç fiyatı <b>{TL(fiyat)}</b>. Hedefinizin altına
        düştüğünde e-posta gönderiyoruz; istediğiniz an tek tıkla
        çıkabilirsiniz.
      </p>

      <div className="form-izgara">
        <label>
          <span>E-posta <em>*</em></span>
          <input name="eposta" type="email" required maxLength={120} autoComplete="email" />
        </label>
        <label>
          <span>Hedef başlangıç fiyatı (₺) <em>*</em></span>
          <input name="hedef" type="number" required min={500} step={500}
            defaultValue={onerilen} />
        </label>
      </div>

      {sonuc.hata && <p className="form-hata" role="alert" style={{ marginTop: 10 }}>{sonuc.hata}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kuruluyor…' : 'Alarmı kur'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={bekliyor}
          onClick={() => setAcik(false)}>Vazgeç</button>
      </div>
    </form>
  );
}
