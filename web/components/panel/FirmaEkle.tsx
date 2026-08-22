'use client';

import { useActionState, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { firmaOlustur, type FirmaSonucu } from '@/lib/panel-eylemler';

/* ============================================================
   Geliştirici firma kaydı.

   Proje eklemenin ön koşulu: proje bir firmaya bağlı olmadan
   açılamıyor.

   FİRMA YAYINDA AÇILMIYOR. Kayıt açmak sitede görünmeye hak
   kazandırmıyor; projesi eklenip yayına alındığında firma sayfası da
   açılıyor. Boş bir firma sayfası, arama sonucunda hiçbir şey
   olmayan bir adres demek.

   Panel hesabı İSTEĞE BAĞLI. Bazı firmalar paneli hiç kullanmıyor ve
   talepleri telefonla takip ediyor; onlar için hesap açmak
   kullanılmayan bir kimlik bilgisi üretmek demek. Hesap sonradan
   Kullanıcılar sayfasından da açılabiliyor.
   ============================================================ */

export default function FirmaEkle() {
  const [durum, gonder, bekliyor] = useActionState<FirmaSonucu | null, FormData>(
    firmaOlustur, null,
  );
  const [kopyalandi, setKopyalandi] = useState(false);

  /* React 19 eylem bitince formu SIFIRLIYOR. Hatada eylem girilen
     değerleri geri veriyor; `key` her denemede değiştiği için alanlar
     yeni defaultValue ile baştan kuruluyor ve sıfırlama geri alınıyor.
     Yoksa tek bir hatalı alan yüzünden form baştan doldurulur.
     Onay kutusu denetimli olduğu için sıfırlamadan etkilenmiyor. */
  const d = durum?.degerler;
  const sonDurum = useRef(durum);
  const denemeRef = useRef(0);
  if (sonDurum.current !== durum) { sonDurum.current = durum; denemeRef.current++; }
  const deneme = denemeRef.current;

  const [hesapAc, setHesapAc] = useState(true);

  const stil = (alan: string) =>
    (durum?.alan === alan ? { borderColor: 'var(--danger)' } : undefined);

  async function kopyala(deger: string) {
    try {
      await navigator.clipboard.writeText(deger);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch { /* pano erişimi yoksa kullanıcı elle seçer */ }
  }

  if (durum?.firmaId) {
    return (
      <section className="p-kart">
        <h2 className="h3" style={{ color: 'var(--success)' }}>Firma kaydı açıldı</h2>

        {durum.gecici ? (
          <>
            <p className="muted small" style={{ margin: '10px 0 12px' }}>
              Panel hesabı da açıldı. Geçici parolayı <b>şimdi kaydedin</b> —
              bu ekran bir daha gösterilmeyecek. Hesap açılış e-postası
              firma yetkilisine gönderildi.
            </p>
            <div className="ical-adres">
              <code>{durum.gecici}</code>
              <button type="button" className="btn btn-ghost btn-sm"
                onClick={() => kopyala(durum.gecici!)}>
                <Icon n={kopyalandi ? 'check' : 'share'} s={15} />
                {kopyalandi ? ' Kopyalandı' : ' Kopyala'}
              </button>
            </div>
            <p className="tiny dim" style={{ marginTop: 10 }}>
              Parolayı güvenli bir kanaldan iletin. E-posta ile göndermeyin —
              hesap açılış e-postası zaten gitti.
            </p>
          </>
        ) : (
          <p className="muted small" style={{ margin: '10px 0 12px' }}>
            Panel hesabı açılmadı. Firma paneli kullanmak isterse
            Kullanıcılar sayfasından hesap açabilirsiniz.
          </p>
        )}

        <p className="tiny dim" style={{ marginTop: 12 }}>
          Firma sayfası şu an <b>kapalı</b>. Projesi eklenip yayına
          alındığında firma sayfasını da açabilirsiniz.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary btn-sm" href="/yonetim/projeler/yeni">
            <Icon n="plus" s={15} sw={2.2} /> Bu firmaya proje ekle
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/yonetim/firmalar">
            Firmalar
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={gonder} key={deneme}>
      <fieldset disabled={bekliyor} style={{ border: 0, padding: 0, margin: 0 }}>
        <section className="p-kart">
          <h2 className="h3">Firma bilgileri</h2>
          <div className="ekle-izgara" style={{ marginTop: 14 }}>
            <div className="p-alan">
              <label htmlFor="f-ad">Firma unvanı</label>
              <input id="f-ad" name="ad" required maxLength={80} defaultValue={d?.ad}
                placeholder="Örnek İnşaat" style={stil('ad')} />
              <span className="ipucu">Proje kartlarında ve firma sayfasında görünür.</span>
            </div>

            <div className="p-alan">
              <label htmlFor="f-yil">Kuruluş yılı <span className="dim">(isteğe bağlı)</span></label>
              <input id="f-yil" name="kurulusYili" type="number"
                min={1900} max={new Date().getFullYear()}
                defaultValue={d?.kurulusYili} style={stil('kurulusYili')} />
              <span className="ipucu">Boş bırakılırsa rozet basılmıyor.</span>
            </div>

            <div className="p-alan">
              <label htmlFor="f-teslim">Teslim edilmiş proje sayısı</label>
              <input id="f-teslim" name="tamamlananProje" type="number" min={0} max={500}
                defaultValue={d?.tamamlananProje || 0} style={stil('tamamlananProje')} />
              {/* Alıcının en çok baktığı sayı bu ve firmanın beyanı;
                  uydurma bir rakam sitenin en zararlı yanlış bilgisi. */}
              <span className="ipucu">
                Firmanın beyanı — girmeden önce doğrulayın. Sitede &quot;vaat
                değil geçmiş&quot; olarak sunuluyor.
              </span>
            </div>

            <div className="p-alan">
              <label htmlFor="f-eposta">
                E-posta {hesapAc ? '' : <span className="dim">(isteğe bağlı)</span>}
              </label>
              <input id="f-eposta" name="eposta" type="email" required={hesapAc}
                defaultValue={d?.eposta}
                placeholder="satis@ornek.com" style={stil('eposta')} />
            </div>

            <div className="p-alan">
              <label htmlFor="f-telefon">Telefon <span className="dim">(isteğe bağlı)</span></label>
              <input id="f-telefon" name="telefon" type="tel" defaultValue={d?.telefon}
                placeholder="0212 123 45 67" style={stil('telefon')} />
            </div>

            <div className="p-alan">
              <label htmlFor="f-web">Web sitesi <span className="dim">(isteğe bağlı)</span></label>
              <input id="f-web" name="web" type="url" defaultValue={d?.web}
                placeholder="https://" style={stil('web')} />
            </div>
          </div>

          <div className="p-alan" style={{ marginTop: 14 }}>
            <label htmlFor="f-ozet">Kısa tanıtım <span className="dim">(isteğe bağlı)</span></label>
            <textarea id="f-ozet" name="ozet" rows={3} maxLength={400}
              defaultValue={d?.ozet} style={stil('ozet')}
              placeholder="Hangi bölgelerde, ne tür projeler geliştiriyor?" />
            <span className="ipucu">
              Boş bırakılırsa firma adından bir cümle üretiliyor.
            </span>
          </div>
        </section>

        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">Panel hesabı</h2>
          <label className="ozellik-kutu" style={{ marginTop: 10, maxWidth: 420 }}>
            <input type="checkbox" name="hesapAc" checked={hesapAc}
              onChange={(e) => setHesapAc(e.target.checked)} />
            <span>Firma yetkilisi için panel hesabı da aç</span>
          </label>
          <p className="tiny dim" style={{ marginTop: 10, maxWidth: 560 }}>
            Hesap açılırsa geçici parola üretilir ve firmaya açılış e-postası
            gider. Yetkili panelden projesini, daire tiplerini ve gelen
            talepleri yönetiyor. Paneli kullanmayacak firmalar için hesap
            açmayın — kullanılmayan kimlik bilgisi gereksiz risk.
          </p>
        </section>

        {durum?.hata && (
          <p className="form-hata" role="alert" style={{ marginTop: 16 }}>
            <Icon n="x" s={16} sw={2.4} /> {durum.hata}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" type="submit" disabled={bekliyor}>
            {bekliyor ? 'Kaydediliyor…' : 'Firmayı kaydet'}
          </button>
          <Link className="btn btn-ghost btn-lg" href="/yonetim/firmalar">Vazgeç</Link>
        </div>
      </fieldset>
    </form>
  );
}
