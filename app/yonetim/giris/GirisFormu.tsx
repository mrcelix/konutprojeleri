'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { girisYap } from './eylem';

/**
 * Giriş formu.
 *
 * Sunucu eylemi kullanır; JavaScript kapalıyken de gönderilir. İstemci
 * tarafı yalnızca hata mesajını ve "gönderiliyor" durumunu gösterir —
 * ikisi de olmasa form yine çalışır.
 */

function Dugme() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={pending}>
      {pending ? 'Giriş yapılıyor…' : 'Giriş yap'}
    </button>
  );
}

export function GirisFormu({ don }: { don: string }) {
  const [durum, eylem] = useActionState(girisYap, null as { hata?: string } | null);

  return (
    <form action={eylem} className="yn-giris__form">
      <input type="hidden" name="don" value={don} />

      {durum?.hata && (
        <p className="yn-hata" role="alert">
          {durum.hata}
        </p>
      )}

      <label className="yn-alan">
        <span className="eyebrow">E-posta</span>
        <input
          type="email"
          name="eposta"
          autoComplete="username"
          required
          autoFocus
          inputMode="email"
        />
      </label>

      <label className="yn-alan">
        <span className="eyebrow">Parola</span>
        <input type="password" name="parola" autoComplete="current-password" required />
      </label>

      <Dugme />
    </form>
  );
}
