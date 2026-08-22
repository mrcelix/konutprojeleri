'use client';

import { useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { talepDurum } from '@/lib/panel-eylemler';

/* ============================================================
   Satış talebinin durumu ve ekip notu.

   Liste salt okunur olsaydı iki gün sonra kimin arandığı bilinmeyen
   bir yığına dönerdi. Beş düğme + bir not alanı: aramayı yapan kişi
   tek tıkla işaretliyor.

   İLK DOKUNAN ÜSTLENİYOR: durumu değiştiren kişi talebe atanıyor
   (bkz. `talepDurum`). Ayrı bir "üstlen" düğmesi olsaydı kimse
   kullanmaz, "kim ilgileniyor" sorusu cevapsız kalırdı.

   Not alanı ANCAK BİR DURUM SEÇİLDİKTEN sonra açılıyor: "aradım"
   demeden not yazmak, listeyi yine belirsiz bırakıyordu.
   ============================================================ */

const DURUMLAR = [
  { k: 'ARANDI', ad: 'Arandı', ikon: 'check' },
  { k: 'RANDEVU', ad: 'Randevu', ikon: 'cal' },
  { k: 'SATIS', ad: 'Satış', ikon: 'spark' },
  { k: 'ULASILAMADI', ad: 'Ulaşılamadı', ikon: 'clock' },
  { k: 'ILGILENMIYOR', ad: 'İlgilenmiyor', ikon: 'x' },
] as const;

export default function TalepEylem(
  { id, durum, ekipNotu }: { id: string; durum: string; ekipNotu: string | null },
) {
  const [bekliyor, gecis] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [notAcik, setNotAcik] = useState(false);
  const [not, setNot] = useState(ekipNotu ?? '');

  const yaz = (d: (typeof DURUMLAR)[number]['k'], n?: string) => gecis(async () => {
    const s = await talepDurum(id, d, n);
    setHata(s.hata ?? null);
    if (!s.hata) setNotAcik(false);
  });

  return (
    <div className="arama-eylem">
      <div className="p-islem">
        {DURUMLAR.map((d) => (
          <button
            key={d.k} type="button" disabled={bekliyor}
            className={'btn btn-sm ' + (durum === d.k ? 'btn-primary' : 'btn-ghost')}
            onClick={() => yaz(d.k)}
          >
            <Icon n={d.ikon} s={13} sw={2.4} /> {d.ad}
          </button>
        ))}
        <button type="button" className="btn btn-quiet btn-sm" disabled={bekliyor}
          onClick={() => setNotAcik((a) => !a)}>
          {ekipNotu ? 'Notu düzenle' : 'Not ekle'}
        </button>
      </div>

      {ekipNotu && !notAcik && <p className="arama-not">{ekipNotu}</p>}

      {notAcik && (
        <div className="arama-not-form">
          <label className="sr" htmlFor={`not-${id}`}>Ekip notu</label>
          <textarea
            id={`not-${id}`} rows={2} value={not} maxLength={500}
            placeholder="Aradım, hafta sonu görmeye gelecek."
            onChange={(e) => setNot(e.target.value)}
          />
          <button className="btn btn-primary btn-sm" type="button" disabled={bekliyor}
            onClick={() => yaz(durum === 'YENI' ? 'ARANDI' : (durum as 'ARANDI'), not)}>
            Kaydet
          </button>
        </div>
      )}

      {hata && <p className="form-hata" role="alert">{hata}</p>}
    </div>
  );
}
