'use client';

import { useActionState } from 'react';
import Icon from '@/components/Icon';
import { kontrolRaporuKaydet, type IcerikSonucu } from '@/lib/panel-eylemler';
import {
  KONTROL_GRUPLARI, KONTROL_MADDELERI, type KontrolSonuc,
} from '@/lib/kontrol-kayit';

/* ============================================================
   Kontrol raporu formu.

   Her madde üç durumdan biri: geçti · sorunlu · uygulanmaz.
   İŞARETLENMEYEN madde kaydedilmiyor ve sayfada "bakılmadı" olarak
   duruyor — boş bırakılanı sessizce "geçti" saymak, yapılmamış bir
   kontrolü yapılmış göstermek olurdu.

   Not alanı her maddenin altında: "denize 6 dakika yürüyüş" ya da
   "internet 42 Mbps ölçüldü" gibi ölçümler raporun asıl değeri.
   ============================================================ */

const DURUMLAR: { deger: KontrolSonuc['durum']; ad: string }[] = [
  { deger: 'gecti', ad: 'Geçti' },
  { deger: 'kalmadi', ad: 'Sorunlu' },
  { deger: 'uygulanmaz', ad: 'Uygulanmaz' },
];

export default function KontrolRaporuFormu(
  { projeId, rapor }:
  {
    projeId: string;
    rapor: {
      ziyaret: string; kontrolEden: string; ozet: string;
      yayinda: boolean; sonuclar: KontrolSonuc[];
    } | null;
  },
) {
  const [durum, gonder, bekliyor] = useActionState<IcerikSonucu | null, FormData>(
    kontrolRaporuKaydet, null,
  );

  const bul = (kod: string) => rapor?.sonuclar.find((s) => s.kod === kod);

  return (
    <form action={gonder} className="p-form kontrol-formu">
      <input type="hidden" name="projeId" value={projeId} />

      <div className="p-satir">
        <div className="p-alan">
          <label htmlFor="k-ziyaret">Ziyaret tarihi</label>
          <input id="k-ziyaret" name="ziyaret" type="date" required
            defaultValue={rapor?.ziyaret ?? ''} />
          <span className="ipucu">Raporun yaşı güvenin bir parçası; sayfada tarihiyle görünüyor.</span>
        </div>
        <div className="p-alan">
          <label htmlFor="k-kim">Kontrolü yapan</label>
          <input id="k-kim" name="kontrolEden" type="text" required maxLength={60}
            defaultValue={rapor?.kontrolEden ?? ''} placeholder="Ekip üyesinin adı" />
        </div>
        <div className="p-alan" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <label className="p-onay">
            <input type="checkbox" name="yayinda" defaultChecked={rapor?.yayinda ?? true} />
            <span>Villa sayfasında göster</span>
          </label>
        </div>
      </div>

      <div className="p-alan">
        <label htmlFor="k-ozet">Kısa değerlendirme</label>
        <textarea id="k-ozet" name="ozet" rows={3} maxLength={400}
          defaultValue={rapor?.ozet ?? ''}
          placeholder="Havuz ısıtması çalışıyor, denize yürüyüş 6 dakika, son 300 metre stabilize yol." />
        <span className="ipucu">Sayfada maddelerin üstünde görünüyor. En çok sorulan üç şeyi yazın.</span>
      </div>

      {KONTROL_GRUPLARI.map((grup) => (
        <section className="kontrol-grup" key={grup}>
          <h3>{grup}</h3>
          {KONTROL_MADDELERI.filter((m) => m.grup === grup).map((m) => {
            const s = bul(m.kod);
            return (
              <div className="kontrol-satir" key={m.kod}>
                <div className="kontrol-ad">
                  <b>{m.ad}</b>
                  {m.ipucu && <small>{m.ipucu}</small>}
                </div>
                <div className="kontrol-secim" role="group" aria-label={m.ad}>
                  {DURUMLAR.map((d) => (
                    <label key={d.deger} className={'kontrol-cip k-' + d.deger}>
                      <input type="radio" name={`durum-${m.kod}`} value={d.deger}
                        defaultChecked={s?.durum === d.deger} />
                      <span>{d.ad}</span>
                    </label>
                  ))}
                </div>
                <input type="text" name={`not-${m.kod}`} maxLength={200}
                  className="kontrol-not" placeholder="Ölçüm ya da not"
                  defaultValue={s?.not ?? ''} aria-label={`${m.ad} notu`} />
              </div>
            );
          })}
        </section>
      ))}

      {durum?.hata && <p className="form-hata" role="alert"><Icon n="x" s={16} sw={2.4} /> {durum.hata}</p>}
      {durum?.tamam && <p className="form-basarili" role="status"><Icon n="check" s={16} sw={2.4} /> Rapor kaydedildi.</p>}

      <div>
        <button className="btn btn-primary" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Raporu kaydet'}
        </button>
      </div>
    </form>
  );
}
