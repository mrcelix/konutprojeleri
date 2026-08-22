'use client';

import { useActionState } from 'react';
import Icon from './Icon';
import { soruGonder, type MesajSonucu } from '@/lib/panel-eylemler';

/** Proje sayfasından satış ekibine soru — oturum gerektirmez. */
export default function SoruFormu({ projeSlug, firmaAd }: {
  projeSlug: string; firmaAd: string;
}) {
  const [durum, gonder, bekliyor] = useActionState<MesajSonucu | null, FormData>(soruGonder, null);

  if (durum?.tamam) {
    return (
      <p className="form-basarili" role="status">
        <Icon n="check" s={16} sw={2.4} />
        Sorunuz {firmaAd} satış ekibine iletildi. Cevap e-posta adresinize gelecek.
      </p>
    );
  }

  return (
    <form action={gonder} className="rez-form">
      <input type="hidden" name="projeSlug" value={projeSlug} />
      <fieldset disabled={bekliyor}>
        <div className="alan-satir">
          <div className="alan">
            <label htmlFor="soru-ad">Adınız</label>
            <input id="soru-ad" name="ad" required minLength={3} autoComplete="name" placeholder="Ad soyad" />
          </div>
          <div className="alan">
            <label htmlFor="soru-eposta">E-posta</label>
            <input id="soru-eposta" name="eposta" type="email" required autoComplete="email"
              placeholder="ornek@eposta.com" />
          </div>
        </div>

        <div className="alan">
          <label htmlFor="soru-metin">Sorunuz</label>
          <textarea id="soru-metin" name="metin" rows={3} required minLength={10} maxLength={2000}
            placeholder="Havuz ısıtması hangi aylarda açık? Sahile yürüyüş ne kadar sürüyor?" />
        </div>

        {durum?.hata && (
          <p className="form-hata" role="alert"><Icon n="x" s={16} sw={2.4} /> {durum.hata}</p>
        )}

        <button className="btn btn-ghost" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Gönderiliyor…' : 'Soruyu gönder'}
        </button>
        <p className="tiny dim" style={{ marginTop: 10 }}>
          Yanıt e-posta adresinize gelecek; numaranızı bırakmak isterseniz
          sayfadaki talep formunu kullanın.
        </p>
      </fieldset>
    </form>
  );
}
