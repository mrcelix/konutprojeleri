'use client';

import { useActionState } from 'react';
import Icon from '@/components/Icon';
import { parolaDegistir, profilKaydet } from '@/lib/panel-eylemler';

/* ============================================================
   Kendi hesabı: ad ve parola.

   İki AYRI form: adını düzeltmek için parola sormak gereksiz,
   parola değiştirmek için mevcut parolayı sormak zorunlu. Tek formda
   birleştirilseydi ya ad değişikliği parola isterdi ya da parola
   değişikliği mevcut parolayı sormadan geçerdi.
   ============================================================ */

type Sonuc = { hata?: string; tamam?: boolean } | null;

function Bildirim({ durum, basarili }: { durum: Sonuc; basarili: string }) {
  if (durum?.hata) return <p className="form-hata" role="alert">{durum.hata}</p>;
  if (durum?.tamam) {
    return (
      <p className="tiny" style={{ color: 'var(--success)', margin: '0 0 10px' }} role="status">
        <Icon n="check" s={14} sw={2.4} /> {basarili}
      </p>
    );
  }
  return null;
}

export function AdFormu({ ad, eposta, rol }: { ad: string; eposta: string; rol: string }) {
  const [durum, gonder, bekliyor] = useActionState<Sonuc, FormData>(profilKaydet, null);

  return (
    <form action={gonder} className="p-form">
      <Bildirim durum={durum} basarili="Profiliniz güncellendi." />
      <div className="form-izgara">
        <label>
          <span>Ad soyad <em>*</em></span>
          <input name="ad" required minLength={3} maxLength={60} defaultValue={ad} />
        </label>
        <label>
          <span>E-posta</span>
          <input value={eposta} disabled readOnly />
          {/* Giriş kimliği bu adres; doğrulama akışı (yeni adrese onay
              bağlantısı) yazılmadan değiştirilirse hesap erişilemez
              hâle gelebilir. */}
          <span className="tiny dim">Giriş adresiniz — değiştirmek için yöneticinize başvurun.</span>
        </label>
        <label>
          <span>Rol</span>
          <input value={rol === 'ADMIN' ? 'Yönetici' : 'Villa sahibi'} disabled readOnly />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}

export function ParolaFormu() {
  const [durum, gonder, bekliyor] = useActionState<Sonuc, FormData>(parolaDegistir, null);

  return (
    <form action={gonder} className="p-form">
      <Bildirim durum={durum} basarili="Parolanız değiştirildi. Diğer oturumlarınız kapatıldı." />
      <div className="form-izgara">
        <label>
          <span>Mevcut parola <em>*</em></span>
          <input name="mevcut" type="password" required autoComplete="current-password" />
        </label>
        <label>
          <span>Yeni parola <em>*</em></span>
          <input name="yeni" type="password" required minLength={10} autoComplete="new-password" />
          <span className="tiny dim">En az 10 karakter.</span>
        </label>
        <label>
          <span>Yeni parola (tekrar) <em>*</em></span>
          <input name="tekrar" type="password" required minLength={10} autoComplete="new-password" />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Değiştiriliyor…' : 'Parolayı değiştir'}
        </button>
      </div>
      <p className="tiny dim" style={{ marginTop: 10 }}>
        <Icon n="shield" s={13} /> Parola değişince bu oturum dışındaki tüm oturumlar kapanır.
      </p>
    </form>
  );
}
