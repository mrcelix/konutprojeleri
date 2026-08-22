'use client';

import { useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { ceviriKaydet } from '@/lib/panel-eylemler';

/* ============================================================
   Tek bir kaydın çevirisi.

   Alanlar dışarıdan geliyor: villa yalnızca özet, özellik ise ad +
   iniş sayfası metinleri istiyor. Bileşene varlık türünü bildirip
   içeride dallanmak, her yeni çevrilebilir alanda bu dosyayı
   değiştirmek demekti.

   Boş bırakılan alan NULL yazılıyor — "çevrilmedi" ile "boş metin"
   aynı şey değil; boş metin sayfayı boş içerikle yayına sokardı.
   ============================================================ */

export interface CeviriAlani {
  ad: string;
  etiket: string;
  satir: number;
  deger: string;
}

export default function CeviriDuzenle(
  { varlik, varlikId, dil, alanlar }:
  { varlik: string; varlikId: string; dil: string; alanlar: CeviriAlani[] },
) {
  const [bekliyor, basla] = useTransition();
  const [taslak, setTaslak] = useState<Record<string, string>>(
    Object.fromEntries(alanlar.map((a) => [a.ad, a.deger])),
  );
  const [durum, setDurum] = useState<'bos' | 'kaydedildi' | string>('bos');

  const degisti = alanlar.some((a) => (taslak[a.ad] ?? '') !== a.deger);

  const kaydet = () => basla(async () => {
    const s = await ceviriKaydet(varlik, varlikId, dil, taslak);
    setDurum(s.hata ?? 'kaydedildi');
  });

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {alanlar.map((a) => (
        <div key={a.ad} className="cev-alan">
          <label htmlFor={`${varlikId}-${a.ad}`}>{a.etiket}</label>
          {a.satir > 1 ? (
            <textarea
              id={`${varlikId}-${a.ad}`} rows={a.satir} disabled={bekliyor}
              value={taslak[a.ad] ?? ''}
              onChange={(e) => { setTaslak({ ...taslak, [a.ad]: e.target.value }); setDurum('bos'); }}
            />
          ) : (
            <input
              id={`${varlikId}-${a.ad}`} disabled={bekliyor}
              value={taslak[a.ad] ?? ''}
              onChange={(e) => { setTaslak({ ...taslak, [a.ad]: e.target.value }); setDurum('bos'); }}
            />
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button className="btn btn-sm" type="button" disabled={bekliyor || !degisti}
          onClick={kaydet}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {durum === 'kaydedildi' && (
          <span className="tiny" style={{ color: 'var(--success)' }}>
            <Icon n="check" s={13} sw={2.4} /> Kaydedildi
          </span>
        )}
        {durum !== 'bos' && durum !== 'kaydedildi' && (
          <span className="tiny" role="alert" style={{ color: 'var(--danger)' }}>{durum}</span>
        )}
      </div>
    </div>
  );
}
