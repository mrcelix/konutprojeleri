'use client';

import { useActionState } from 'react';
import Icon from '@/components/Icon';
import { ikinciAsamaDogrula, type DogrulamaSonucu } from '@/lib/panel-eylemler';

export default function DogrulamaFormu() {
  const [durum, gonder, bekliyor] = useActionState<DogrulamaSonucu | null, FormData>(
    ikinciAsamaDogrula, null,
  );

  return (
    <form action={gonder} className="p-form">
      <div className="p-alan">
        <label htmlFor="kod">Doğrulama kodu</label>
        <input
          id="kod" name="kod" required autoFocus
          // one-time-code: iOS ve Android klavyeden kodu otomatik doldurabiliyor
          autoComplete="one-time-code"
          // Yedek kodlar harf içerdiği için numeric değil
          inputMode="text"
          placeholder="123456"
          maxLength={16}
          style={{ letterSpacing: '.18em', fontSize: 18, textAlign: 'center' }}
        />
      </div>

      {durum?.hata && (
        <p className="form-hata" role="alert">
          <Icon n="x" s={16} sw={2.4} /> {durum.hata}
        </p>
      )}

      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={bekliyor}>
        {bekliyor ? 'Doğrulanıyor…' : 'Doğrula'}
      </button>

      <a className="btn btn-quiet btn-sm btn-block" href="/giris" style={{ marginTop: 6 }}>
        Baştan giriş yap
      </a>
    </form>
  );
}
