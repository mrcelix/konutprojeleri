'use client';

import { useActionState, useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import {
  kullaniciAktiflik, kullaniciOlustur, parolaSifirla, type KullaniciSonucu,
} from '@/lib/panel-eylemler';

export interface FirmaSecenek { id: string; ad: string; bagliMi: boolean }

export function KullaniciEkle({ evSahipleri }: { evSahipleri: FirmaSecenek[] }) {
  const [durum, gonder, bekliyor] = useActionState<KullaniciSonucu | null, FormData>(kullaniciOlustur, null);
  const [rol, setRol] = useState<'FIRMA' | 'ADMIN'>('FIRMA');
  const bos = evSahipleri.filter((e) => !e.bagliMi);

  return (
    <form action={gonder} className="p-form">
      <div className="p-satir">
        <div className="p-alan">
          <label htmlFor="k-ad">Ad soyad</label>
          <input id="k-ad" name="ad" required minLength={3} placeholder="Deniz Aksoy" />
        </div>
        <div className="p-alan">
          <label htmlFor="k-eposta">E-posta</label>
          <input id="k-eposta" name="eposta" type="email" required placeholder="deniz@ornek.com" />
        </div>
        <div className="p-alan">
          <label htmlFor="k-rol">Rol</label>
          <select id="k-rol" name="rol" value={rol} onChange={(e) => setRol(e.target.value as typeof rol)}>
            <option value="FIRMA">Firma</option>
            <option value="ADMIN">Yönetici</option>
          </select>
        </div>
        {rol === 'FIRMA' && (
          <div className="p-alan">
            <label htmlFor="k-es">Firma kaydı</label>
            <select id="k-es" name="firmaId" required>
              <option value="">Seçin…</option>
              {bos.map((e) => <option key={e.id} value={e.id}>{e.ad}</option>)}
            </select>
            <span className="ipucu">{bos.length} firmanın panel hesabı yok.</span>
          </div>
        )}
      </div>

      {durum?.hata && <p className="form-hata" role="alert"><Icon n="x" s={16} sw={2.4} /> {durum.hata}</p>}
      {durum?.tamam && durum.gecici && (
        <p className="form-basarili" role="status">
          <Icon n="check" s={16} sw={2.4} />
          <span>
            Hesap oluşturuldu. Geçici parola: <b style={{ fontFamily: 'ui-monospace, monospace' }}>{durum.gecici}</b>
            <br />
            <span className="tiny">Bu parolayı kullanıcıya güvenli bir kanaldan iletin; sayfayı yenilerseniz kaybolur.</span>
          </span>
        </p>
      )}

      <div>
        <button className="btn btn-primary" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Oluşturuluyor…' : 'Hesap oluştur'}
        </button>
      </div>
    </form>
  );
}

export function KullaniciEylem({ id, aktif, kendisiMi }: { id: string; aktif: boolean; kendisiMi: boolean }) {
  const [bekliyor, basla] = useTransition();
  const [gecici, setGecici] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  if (kendisiMi) return <span className="dim tiny">kendi hesabınız</span>;

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" className="btn btn-ghost btn-sm" disabled={bekliyor}
        onClick={() => basla(async () => {
          const s = await kullaniciAktiflik(id, !aktif);
          if (s && 'hata' in s && s.hata) setHata(s.hata);
        })}>
        {aktif ? 'Kapat' : 'Aç'}
      </button>
      <button type="button" className="btn btn-quiet btn-sm" disabled={bekliyor}
        onClick={() => basla(async () => {
          const s = await parolaSifirla(id) as { gecici?: string; hata?: string };
          if (s.gecici) setGecici(s.gecici);
          if (s.hata) setHata(s.hata);
        })}>
        Parola sıfırla
      </button>
      {gecici && (
        <span className="tiny" style={{ color: 'var(--success)', fontFamily: 'ui-monospace, monospace' }}>
          {gecici}
        </span>
      )}
      {hata && <span className="tiny" style={{ color: 'var(--danger)' }}>{hata}</span>}
    </div>
  );
}
