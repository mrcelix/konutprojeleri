'use client';

import { useActionState, useRef } from 'react';
import Icon from '@/components/Icon';
import { firmaGuncelle, type FirmaSonucu } from '@/lib/panel-eylemler';

/* ============================================================
   Geliştirici firma düzenleme.

   TAMAMLANAN PROJE SAYISI firmanın BEYANI. Sitede "vaat değil geçmiş"
   diye sunuluyor ve alıcının en çok baktığı sayı bu — bu yüzden
   formda uyarısıyla birlikte duruyor. Otomatik saymıyoruz: sitedeki
   projeler firmanın tüm geçmişi değil, yalnızca burada listelediği
   kısmı.

   YAYINDA anahtarı ayrı: firma kaydı açılmakla sitede görünmeye hak
   kazanmıyor; projesi eklenip yayına alındığında firma sayfası da
   açılıyor.
   ============================================================ */

export interface FirmaVeri {
  id: string;
  ad: string;
  ozet: string;
  telefon: string | null;
  eposta: string | null;
  web: string | null;
  kurulusYili: number | null;
  tamamlananProje: number;
  yayinda: boolean;
}

export default function FirmaDuzenle({ e }: { e: FirmaVeri }) {
  const [durum, gonder, bekliyor] = useActionState<FirmaSonucu | null, FormData>(
    firmaGuncelle, null,
  );

  /* React 19 eylem bitince formu sıfırlıyor; `key` her denemede
     değiştiği için alanlar yeniden kuruluyor ve girilen değerler
     kaybolmuyor. (FirmaEkle'deki ile aynı sebep.) */
  const sonDurum = useRef(durum);
  const denemeRef = useRef(0);
  if (sonDurum.current !== durum) { sonDurum.current = durum; denemeRef.current++; }
  const deneme = denemeRef.current;
  const d = durum?.degerler;

  const stil = (alan: string) =>
    (durum?.alan === alan ? { borderColor: 'var(--danger)' } : undefined);

  return (
    <form action={gonder} className="p-form" key={deneme}>
      <input type="hidden" name="firmaId" value={e.id} />

      {durum?.hata && <p className="form-hata" role="alert">{durum.hata}</p>}
      {durum?.firmaId && !durum.hata && (
        <p className="tiny" style={{ color: 'var(--success)', margin: '0 0 10px' }}>
          <Icon n="check" s={14} sw={2.4} /> Kaydedildi.
        </p>
      )}

      <div className="form-izgara">
        <label>
          <span>Firma unvanı <em>*</em></span>
          <input name="ad" required minLength={3} maxLength={80}
            defaultValue={d?.ad ?? e.ad} style={stil('ad')} />
        </label>
        <label>
          <span>Telefon</span>
          <input name="telefon" type="tel" maxLength={30}
            defaultValue={d?.telefon ?? e.telefon ?? ''} style={stil('telefon')}
            placeholder="+90 5xx xxx xx xx" />
        </label>
        <label>
          <span>E-posta</span>
          <input name="eposta" type="email" maxLength={120}
            defaultValue={d?.eposta ?? e.eposta ?? ''} style={stil('eposta')} />
        </label>
        <label>
          <span>Web sitesi</span>
          <input name="web" type="url" maxLength={200}
            defaultValue={d?.web ?? e.web ?? ''} style={stil('web')}
            placeholder="https://" />
        </label>
        <label>
          <span>Kuruluş yılı</span>
          <input name="kurulusYili" type="number" min={1900} max={new Date().getFullYear()}
            defaultValue={d?.kurulusYili ?? e.kurulusYili ?? ''} style={stil('kurulusYili')} />
        </label>
        <label>
          <span>Teslim edilmiş proje</span>
          <input name="tamamlananProje" type="number" min={0} max={500}
            defaultValue={d?.tamamlananProje ?? e.tamamlananProje}
            style={stil('tamamlananProje')} />
        </label>
      </div>

      <label style={{ display: 'block', marginTop: 12 }}>
        <span>Kısa tanıtım</span>
        <textarea name="ozet" rows={3} maxLength={400}
          defaultValue={d?.ozet ?? e.ozet} style={stil('ozet')} />
      </label>

      <label className="onay-satir" style={{ marginTop: 12 }}>
        <input type="checkbox" name="yayinda" defaultChecked={e.yayinda} />
        <span>Firma sayfası yayında</span>
      </label>

      <p className="tiny muted" style={{ margin: '10px 0 0' }}>
        Teslim edilmiş proje sayısı sitede &quot;vaat değil geçmiş&quot; olarak
        sunuluyor ve alıcının en çok baktığı sayı. Firmanın beyanına
        dayanıyor; girmeden önce doğrulayın.
      </p>

      <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}
        style={{ marginTop: 12 }}>
        {bekliyor ? 'Kaydediliyor…' : <><Icon n="check" s={14} sw={2.2} /> Kaydet</>}
      </button>
    </form>
  );
}
