'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import Icon from '@/components/Icon';
import { ziyaretciKayit, type GirisSonucu } from '@/lib/panel-eylemler';

/* Kayıt sayfasının formu. Penceredeki (GirisPopup) kayıt sekmesiyle
   AYNI sunucu eylemini çağırıyor; kural tek yerde. */
export default function KayitFormu() {
  const [durum, gonder, bekliyor] = useActionState<GirisSonucu | null, FormData>(ziyaretciKayit, null);

  return (
    <form action={gonder} className="giris-form">
      <label>
        <span>Ad soyad</span>
        <input name="ad" required minLength={3} maxLength={60} autoComplete="name"
          placeholder="Adınız ve soyadınız" autoFocus />
      </label>
      <label>
        <span>E-posta</span>
        <input name="eposta" type="email" required autoComplete="username"
          placeholder="ornek@eposta.com" />
      </label>
      <label>
        <span>Parola</span>
        <input name="parola" type="password" required minLength={10} autoComplete="new-password" />
        <em>En az 10 karakter.</em>
      </label>

      <label className="onay-kutu">
        <input type="checkbox" name="kosullar" />
        <span>
          <Link href="/gizlilik" target="_blank">KVKK ve gizlilik politikasını</Link>{' '}
          okudum, onaylıyorum.
        </span>
      </label>

      {durum?.hata && (
        <p className="form-hata" role="alert">
          <Icon n="x" s={15} sw={2.4} /> {durum.hata}
        </p>
      )}

      <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={bekliyor}>
        {bekliyor ? 'Hesap açılıyor…' : 'Hesap aç'}
      </button>
    </form>
  );
}
