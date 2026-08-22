'use client';

import { useActionState } from 'react';
import Icon from '@/components/Icon';
import { veriTalebiOlustur, type VeriTalebiSonucu } from '@/lib/panel-eylemler';

/* ============================================================
   KVKK veri sahibi başvuru formu.

   Ziyaretçinin hesabı yok; talebin sahibi olduğu ancak e-posta
   erişimiyle kanıtlanıyor. Form bunu peşinen söylüyor ki kullanıcı
   posta kutusunu kontrol etmesi gerektiğini bilsin.

   Başarı mesajı adresin kayıtlı olup olmadığını SÖYLEMİYOR: farklı
   yanıt vermek, bir adresin sistemde bulunup bulunmadığını sorgulama
   aracına dönüşürdü.
   ============================================================ */

export default function VeriTalebiFormu() {
  const [durum, gonder, bekliyor] = useActionState<VeriTalebiSonucu | null, FormData>(
    veriTalebiOlustur, null,
  );

  if (durum?.tamam) {
    return (
      <div className="kart" style={{ padding: '22px 24px' }}>
        <h2 className="h3" style={{ color: 'var(--success)' }}>Başvurunuz alındı</h2>
        <p className="muted" style={{ margin: '10px 0 0', maxWidth: '58ch' }}>
          <b>{durum.eposta}</b> adresi kayıtlıysa doğrulama bağlantısı
          içeren bir e-posta gönderildi. Bağlantı <b>48 saat</b> geçerli.
        </p>
        <p className="small muted" style={{ marginTop: 12, maxWidth: '58ch' }}>
          Bağlantıya tıklamadan başvurunuz işleme alınmaz. E-posta
          gelmediyse istenmeyen klasörünü kontrol edin.
        </p>
      </div>
    );
  }

  return (
    <form action={gonder} className="kart" style={{ padding: '22px 24px' }}>
      <fieldset disabled={bekliyor} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="p-alan">
          <label htmlFor="vt-eposta">E-posta adresiniz</label>
          <input id="vt-eposta" name="eposta" type="email" required
            autoComplete="email" placeholder="ornek@eposta.com" />
          <span className="ipucu">
            Talep formunu doldururken kullandığınız adres.
          </span>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: '18px 0 0' }}>
          <legend className="h3" style={{ fontSize: 14, marginBottom: 8 }}>
            Talebiniz
          </legend>

          <label className="ozellik-kutu" style={{ maxWidth: 620, alignItems: 'flex-start' }}>
            <input type="radio" name="tip" value="ERISIM" defaultChecked />
            <span>
              <b>Verilerimi göster</b>
              <span className="tiny dim" style={{ display: 'block', marginTop: 3 }}>
                Hakkınızda tuttuğumuz tüm kayıtları görüntüleyin ve indirin.
                Doğrulamadan hemen sonra hazır olur.
              </span>
            </span>
          </label>

          <label className="ozellik-kutu"
            style={{ maxWidth: 620, alignItems: 'flex-start', marginTop: 8 }}>
            <input type="radio" name="tip" value="SILME" />
            <span>
              <b>Verilerimi sil</b>
              <span className="tiny dim" style={{ display: 'block', marginTop: 3 }}>
                Talep kayıtlarınız, yazışmalarınız ve fiyat alarmlarınız
                tamamen silinir. Bu sitede para hareketi olmadığı için
                saklanması zorunlu ticari belge de yok; anonimleştirme
                değil <b>gerçek silme</b> uygulanıyor. Yalnızca gönderim
                kaydının kanal ve tarih alanları kalır — adres ve gövde
                oradan da temizlenir.
              </span>
            </span>
          </label>
        </fieldset>

        {durum?.hata && (
          <p className="form-hata" role="alert" style={{ marginTop: 16 }}>
            <Icon n="x" s={16} sw={2.4} /> {durum.hata}
          </p>
        )}

        <button className="btn btn-primary btn-lg" type="submit"
          style={{ marginTop: 20 }} disabled={bekliyor}>
          {bekliyor ? 'Gönderiliyor…' : 'Doğrulama bağlantısı gönder'}
        </button>

        <p className="tiny dim" style={{ marginTop: 14, maxWidth: '62ch' }}>
          Başvurunuz en geç <b>30 gün</b> içinde sonuçlandırılır
          (KVKK md. 13). Silme talepleri geri alınamadığı için
          doğrulamadan sonra ayrıca incelenir.
        </p>
      </fieldset>
    </form>
  );
}
