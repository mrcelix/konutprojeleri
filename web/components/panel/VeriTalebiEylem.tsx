'use client';

import { useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { veriTalebiUygula } from '@/lib/panel-eylemler';

/* ============================================================
   Silme talebini sonuçlandırma.

   Onay GERİ ALINAMAZ, bu yüzden iki adımlı ve engeller ekranda
   önceden yazılı. Ret gerekçesi zorunlu: KVKK md. 13/3 gerekçe
   bildirmeyi şart koşuyor, boş bırakılabilseydi boş bırakılırdı.
   ============================================================ */

export default function VeriTalebiEylem(
  { id, engelVar }: { id: string; engelVar: boolean },
) {
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [acik, setAcik] = useState<'onayla' | 'reddet' | null>(null);
  const [not, setNot] = useState('');

  const calistir = (karar: 'onayla' | 'reddet') =>
    basla(async () => {
      const s = await veriTalebiUygula(id, karar, not);
      setHata(s.hata ?? null);
      if (!s.hata) setAcik(null);
    });

  if (acik) {
    const reddet = acik === 'reddet';
    return (
      <div className="vt-karar">
        <label htmlFor={`not-${id}`} className="tiny">
          {reddet ? 'Ret gerekçesi (veri sahibine bildirilecek)' : 'Not (isteğe bağlı)'}
        </label>
        <textarea id={`not-${id}`} rows={2} value={not} disabled={bekliyor}
          onChange={(e) => setNot(e.target.value)}
          placeholder={reddet
            ? 'Örn. 12.09.2026 tarihli talebiniz hâlâ açık olduğu için…'
            : ''} />

        {!reddet && (
          <p className="tiny" style={{ color: 'var(--danger)', margin: '6px 0 0' }}>
            Bu işlem geri alınamaz. Kişisel alanlar kalıcı olarak
            anonimleştirilecek.
          </p>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-sm" type="button" disabled={bekliyor}
            style={reddet ? undefined : { background: 'var(--danger)', color: '#fff' }}
            onClick={() => calistir(acik)}>
            {bekliyor ? 'İşleniyor…' : reddet ? 'Reddet ve bildir' : 'Evet, anonimleştir'}
          </button>
          <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
            onClick={() => { setAcik(null); setHata(null); }}>Vazgeç</button>
        </div>

        {hata && (
          <p className="tiny" role="alert" style={{ color: 'var(--danger)', marginTop: 6 }}>
            {hata}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button className="btn btn-ghost btn-sm" type="button"
        disabled={bekliyor || engelVar}
        title={engelVar ? 'Engeller giderilmeden onaylanamaz' : undefined}
        onClick={() => setAcik('onayla')}>
        <Icon n="check" s={14} sw={2.2} /> Onayla
      </button>
      <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
        onClick={() => setAcik('reddet')}>Reddet</button>
      {hata && (
        <span className="tiny" role="alert" style={{ color: 'var(--danger)' }}>{hata}</span>
      )}
    </div>
  );
}
