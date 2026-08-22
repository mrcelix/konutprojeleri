'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { basvuruKarar } from '@/lib/panel-eylemler';

/* ============================================================
   Başvuru kararı.

   ONAY GERİ ALINAMAZ: firma kaydı açıyor ve o kayıt projeye, panel
   hesabına ve gelen taleplere bağlanabiliyor. Bu yüzden iki adımlı.

   Ret gerekçesi ZORUNLU — başvurana bildirilecek. Boş bırakılabilse
   boş bırakılırdı ve kişi neden reddedildiğini hiç öğrenemezdi.
   ============================================================ */

export default function BasvuruEylem(
  { id, durum }: { id: string; durum: string },
) {
  const [bekliyor, basla] = useTransition();
  const [acik, setAcik] = useState<'onayla' | 'reddet' | 'goruseldi' | null>(null);
  const [not, setNot] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [firmaId, setFirmaId] = useState<string | null>(null);

  if (firmaId) {
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="tiny" style={{ color: 'var(--success)' }}>
          <Icon n="check" s={13} sw={2.4} /> Firma kaydı açıldı
        </span>
        <Link className="btn btn-primary btn-sm" href="/yonetim/projeler/yeni">
          Villa ekle
        </Link>
      </div>
    );
  }

  if (durum === 'ONAYLANDI' || durum === 'REDDEDILDI') {
    return <span className="tiny dim">—</span>;
  }

  const calistir = (karar: 'onayla' | 'reddet' | 'goruseldi') =>
    basla(async () => {
      const s = await basvuruKarar(id, karar, not);
      if (s.hata) { setHata(s.hata); return; }
      setHata(null);
      setAcik(null);
      if (s.firmaId) setFirmaId(s.firmaId);
    });

  if (acik) {
    const reddet = acik === 'reddet';
    const onay = acik === 'onayla';
    return (
      <div className="vt-karar">
        {!onay && (
          <>
            <label htmlFor={`not-${id}`} className="tiny">
              {reddet ? 'Ret gerekçesi (başvurana bildirilecek)' : 'Görüşme notu'}
            </label>
            <textarea id={`not-${id}`} rows={2} value={not} disabled={bekliyor}
              onChange={(e) => setNot(e.target.value)}
              placeholder={reddet
                ? 'Örn. Villa bulunduğu bölgede henüz hizmet vermiyoruz.'
                : 'Örn. 12.08 aradık, eylülde tekrar görüşülecek.'} />
          </>
        )}

        {onay && (
          <p className="tiny" style={{ color: 'var(--danger)', margin: 0 }}>
            Firma kaydı açılacak ve bu geri alınamayacak. Panel hesabı
            ayrıca açılmıyor — gerekirse Kullanıcılar sayfasından verilir.
          </p>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-sm" type="button" disabled={bekliyor}
            style={onay ? { background: 'var(--success)', color: '#fff' } : undefined}
            onClick={() => calistir(acik)}>
            {bekliyor ? 'İşleniyor…'
              : onay ? 'Evet, firma kaydı aç'
                : reddet ? 'Reddet' : 'Kaydet'}
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
      <button className="btn btn-ghost btn-sm" type="button" disabled={bekliyor}
        onClick={() => setAcik('onayla')}>
        <Icon n="check" s={14} sw={2.2} /> Onayla
      </button>
      {durum === 'YENI' && (
        <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
          onClick={() => setAcik('goruseldi')}>Görüşüldü</button>
      )}
      <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
        onClick={() => setAcik('reddet')}>Reddet</button>
      {hata && <span className="tiny" role="alert" style={{ color: 'var(--danger)' }}>{hata}</span>}
    </div>
  );
}
