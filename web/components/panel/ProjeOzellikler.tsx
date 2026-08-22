'use client';

import { useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { projeOzellikGuncelle } from '@/lib/panel-eylemler';
import type { OzellikSecenegi } from './ProjeEkle';

/* ============================================================
   Villa özellikleri.

   Kaydetme TOPLU: her kutuya tıklandığında sunucuya gitmek, yanlış
   tıklamayı anında yayına sokar ve filtre sonuçlarını gereksiz yere
   sarsar. Değişiklik varken kaydet düğmesi açılıyor.

   Özellikler filtre sonuçlarının dayanağı: "ısıtmalı havuz" filtresine
   düşen bir projede kapalı otopark yoksa alıcı bunu satış ofisinde
   sonra öğreniyor. Bu yüzden form yerinde doğrulamayı hatırlatıyor.
   ============================================================ */

export default function ProjeOzellikler({
  projeId, ozellikler, secili,
}: {
  projeId: string;
  ozellikler: OzellikSecenegi[];
  secili: string[];
}) {
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [kayitli, setKayitli] = useState<string[]>(secili);
  const [secim, setSecim] = useState<string[]>(secili);

  const degisti = kayitli.length !== secim.length
    || kayitli.some((k) => !secim.includes(k));

  const degistir = (kod: string) =>
    setSecim((s) => (s.includes(kod) ? s.filter((x) => x !== kod) : [...s, kod]));

  return (
    <section className="p-kart">
      <h2 className="h3">Özellikler</h2>
      <p className="muted small" style={{ margin: '6px 0 12px' }}>
        {secim.length} özellik işaretli. Yalnızca <b>yerinde doğrulananları</b>{' '}
        işaretleyin — filtre sonuçlarının güvenilirliği buna bağlı.
      </p>

      {hata && (
        <p className="form-hata" role="alert" style={{ marginBottom: 12 }}>
          <Icon n="x" s={16} sw={2.4} /> {hata}
        </p>
      )}

      <div className="ozellik-izgara">
        {ozellikler.map((o) => (
          <label key={o.kod} className="ozellik-kutu">
            <input type="checkbox" checked={secim.includes(o.kod)}
              disabled={bekliyor} onChange={() => degistir(o.kod)} />
            <span>{o.ad}</span>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" type="button"
          disabled={bekliyor || !degisti}
          onClick={() => basla(async () => {
            const s = await projeOzellikGuncelle(projeId, secim);
            setHata(s.hata ?? null);
            if (!s.hata) setKayitli(secim);
          })}>
          {bekliyor ? 'Kaydediliyor…' : 'Özellikleri kaydet'}
        </button>
        {degisti && (
          <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
            onClick={() => setSecim(kayitli)}>Değişiklikleri geri al</button>
        )}
        {!degisti && kayitli !== secili && (
          <span className="tiny" style={{ color: 'var(--success)' }}>
            <Icon n="check" s={14} sw={2.4} /> Kaydedildi
          </span>
        )}
      </div>
    </section>
  );
}
