'use client';

import { useActionState } from 'react';
import Icon from '@/components/Icon';
import { girisYap, type GirisSonucu } from '@/lib/panel-eylemler';

export default function GirisFormu() {
  const [durum, gonder, bekliyor] = useActionState<GirisSonucu | null, FormData>(girisYap, null);

  return (
    <form action={gonder} className="p-form">
      <div className="p-alan">
        <label htmlFor="eposta">E-posta</label>
        <input id="eposta" name="eposta" type="email" required autoComplete="username"
          placeholder="ornek@konutprojeleri.com" autoFocus />
      </div>
      <div className="p-alan">
        <label htmlFor="parola">Parola</label>
        <input id="parola" name="parola" type="password" required autoComplete="current-password" />
      </div>

      {durum?.hata && (
        <p className="form-hata" role="alert">
          <Icon n="x" s={16} sw={2.4} /> {durum.hata}
        </p>
      )}

      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={bekliyor}>
        {bekliyor ? 'Kontrol ediliyor…' : 'Giriş yap'}
      </button>
    </form>
  );
}
