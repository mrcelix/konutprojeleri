'use client';

import { useState } from 'react';
import Icon from './Icon';
import {
  KONTROL_GRUPLARI, kontrolMaddesi, kontrolOzeti, type KontrolSonuc,
} from '@/lib/kontrol-kayit';

/* ============================================================
   KonutProjeleri kontrol raporu — villa sayfasındaki güven bloğu.

   "Her villa yerinde görüldü" cümlesi güven şeridinde bir vaatti:
   arkasında tarih, kim gezdi ve neye bakıldığı yoktu. Blok o vaadi
   kanıta çeviriyor — ziyaret tarihi, kontrolü yapan, kaç maddede
   geçildiği ve maddelerin tamamı.

   SORUNLU MADDELER GİZLENMİYOR. Bir raporun tamamı yeşilse kimse
   inanmıyor; "son 300 metre stabilize yol" gibi bir not, geri kalan
   yirmi maddeyi inandırıcı yapan şeyin ta kendisi.
   ============================================================ */

export default function KontrolBlok(
  { ziyaret, kontrolEden, ozet, sonuclar }:
  { ziyaret: string; kontrolEden: string; ozet: string | null; sonuclar: KontrolSonuc[] },
) {
  const [acik, setAcik] = useState(false);
  const o = kontrolOzeti(sonuclar);
  const sorunlular = sonuclar.filter((s) => s.durum === 'kalmadi');

  return (
    <section className="kontrol-blok" id="kontrol">
      <div className="kontrol-ust">
        <span className="kontrol-mühür" aria-hidden="true"><Icon n="shield" s={22} sw={2} /></span>
        <div style={{ minWidth: 0 }}>
          <h2 className="h3">KonutProjeleri kontrol raporu</h2>
          <p className="kontrol-kunye">
            <b>{ziyaret}</b> tarihinde <b>{kontrolEden}</b> yerinde gezdi ·
            {' '}{o.bakilan} maddenin <b>{o.gecen}</b> tanesi geçti
            {o.kalan > 0 && <> · <span className="kontrol-sorun">{o.kalan} not düşüldü</span></>}
          </p>
        </div>
      </div>

      {ozet && <p className="kontrol-ozet">{ozet}</p>}

      {/* Sorunlu maddeler AÇILMADAN görünüyor: raporun en değerli
          satırları bunlar ve kapalı bir listenin arkasında saklamak,
          saklamak niyetiyle aynı şeye benziyor. */}
      {sorunlular.length > 0 && (
        <ul className="kontrol-sorunlar">
          {sorunlular.map((s) => (
            <li key={s.kod}>
              <Icon n="spark" s={14} />
              <span>
                <b>{kontrolMaddesi(s.kod)?.ad}</b>
                {s.not && <> — {s.not}</>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="kontrol-ac" onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}>
        {acik ? 'Listeyi kapat' : `${o.bakilan} maddenin tamamını gör`}
        <Icon n={acik ? 'chevU' : 'chevD'} s={15} sw={2.4} />
      </button>

      {acik && (
        <div className="kontrol-liste">
          {KONTROL_GRUPLARI.map((grup) => {
            const satirlar = sonuclar.filter((s) => kontrolMaddesi(s.kod)?.grup === grup);
            if (satirlar.length === 0) return null;
            return (
              <div className="kontrol-liste-grup" key={grup}>
                <h3>{grup}</h3>
                <ul>
                  {satirlar.map((s) => (
                    <li key={s.kod} className={'kontrol-oge k-' + s.durum}>
                      <Icon n={s.durum === 'gecti' ? 'check' : s.durum === 'kalmadi' ? 'spark' : 'minus'}
                        s={14} sw={2.6} />
                      <span>
                        {kontrolMaddesi(s.kod)?.ad}
                        {s.not && <small>{s.not}</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
