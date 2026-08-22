'use client';

import { useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import {
  bolgeSil, bolgeSilmeOnBakis, firmaSil, firmaSilmeOnBakis, projeSil, projeSilmeOnBakis,
} from '@/lib/panel-eylemler';

interface Rapor {
  izin: boolean;
  engel?: string;
  gidecek: { ad: string; adet: number }[];
}

/* ============================================================
   Silme onayı.

   İki adım: önce SİLİNECEKLER SAYILIYOR, sonra onay isteniyor.
   Tek adımda silinseydi yönetici "bu projeyi sil" derken daire
   tiplerini ve ziyaretçi yazışmalarını da sildiğini bilmezdi —
   şema onları `Cascade` ile götürüyor ve hata vermiyor.

   Projeda ayrıca yazılı onay var: bölge silmek geri alınabilir bir
   hata (yeniden açılır), proje silmek değil.
   ============================================================ */
export default function SilmeOnay(
  { tur, id, ad }: { tur: 'proje' | 'firma' | 'bolge'; id: string; ad: string },
) {
  const [bekliyor, basla] = useTransition();
  const [rapor, setRapor] = useState<Rapor | null>(null);
  const [onay, setOnay] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [silindi, setSilindi] = useState(false);

  if (silindi) {
    return (
      <p className="tiny" style={{ color: 'var(--success)', margin: 0 }}>
        <Icon n="check" s={14} sw={2.4} /> Silindi.
      </p>
    );
  }

  if (!rapor) {
    return (
      <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
        onClick={() => basla(async () => {
          setRapor(tur === 'proje' ? await projeSilmeOnBakis(id)
            : tur === 'firma' ? await firmaSilmeOnBakis(id)
              : await bolgeSilmeOnBakis(id));
        })}>
        {bekliyor ? 'Kontrol ediliyor…' : 'Sil'}
      </button>
    );
  }

  return (
    <div className="silme-onay">
      <p className="tiny" style={{ margin: 0 }}>
        <b>{ad}</b> siliniyor.
      </p>

      {rapor.engel && (
        <p className="form-hata" role="alert" style={{ marginTop: 8 }}>{rapor.engel}</p>
      )}

      {rapor.gidecek.length > 0 && (
        <div className="silme-liste">
          <b className="tiny">Bu kayıtlar da etkilenecek:</b>
          <ul className="tiny">
            {rapor.gidecek.map((g) => (
              <li key={g.ad}>{g.adet} {g.ad}</li>
            ))}
          </ul>
        </div>
      )}

      {rapor.izin && rapor.gidecek.length === 0 && (
        <p className="tiny muted" style={{ margin: '8px 0 0' }}>
          Bağlı başka kayıt yok.
        </p>
      )}

      {hata && <p className="form-hata" role="alert" style={{ marginTop: 8 }}>{hata}</p>}

      {rapor.izin && tur !== 'bolge' && (
        <label className="tiny" style={{ display: 'block', marginTop: 10 }}>
          Onaylamak için <b>SİL</b> yazın
          <input value={onay} onChange={(e) => setOnay(e.target.value)} autoComplete="off"
            style={{ maxWidth: 140, marginTop: 4 }} />
        </label>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {rapor.izin && (
          <button className="btn btn-sm" type="button" disabled={bekliyor}
            style={{ background: 'var(--danger)', color: '#fff' }}
            onClick={() => basla(async () => {
              const r = tur === 'proje' ? await projeSil(id, onay)
                : tur === 'firma' ? await firmaSil(id, onay)
                  : await bolgeSil(id);
              if (r.hata) setHata(r.hata); else setSilindi(true);
            })}>
            {bekliyor ? 'Siliniyor…' : 'Kalıcı olarak sil'}
          </button>
        )}
        <button className="btn btn-quiet btn-sm" type="button"
          onClick={() => { setRapor(null); setHata(null); setOnay(''); }}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}
