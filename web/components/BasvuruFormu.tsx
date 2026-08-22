'use client';

import { useActionState, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { firmaBasvurusu } from '@/lib/panel-eylemler';
import type { BasvuruSonucu } from '@/lib/basvuru-tipler';

/* ============================================================
   Geliştirici firma başvuru formu.

   ALAN SAYISI KASITLI OLARAK AZ. Bu bir proje kayıt formu değil, bir
   tanışma: listeleme kararı telefonda ve şantiye ziyaretiyle
   veriliyor. Daire tipini, kat planını, fiyat listesini burada sormak
   formu terk ettirir; onlar zaten süreç ilerleyince panelden
   giriliyor.

   Telefon ZORUNLU: ekip şantiye ziyareti için randevulaşıyor,
   e-posta trafiği bu işi yürütmüyor.
   ============================================================ */

export default function BasvuruFormu() {
  const [durum, gonder, bekliyor] = useActionState<BasvuruSonucu | null, FormData>(
    firmaBasvurusu, null,
  );

  /* React 19 eylem bitince formu sıfırlıyor; hatada girilenler geri
     veriliyor ve `key` ile alanlar yeniden kuruluyor. */
  const d = durum?.degerler;
  const sonDurum = useRef(durum);
  const denemeRef = useRef(0);
  if (sonDurum.current !== durum) { sonDurum.current = durum; denemeRef.current++; }

  const [mesaj, setMesaj] = useState(d?.mesaj ?? '');

  const stil = (alan: string) =>
    (durum?.alan === alan ? { borderColor: 'var(--danger)' } : undefined);

  if (durum?.tamam) {
    return (
      <section className="kart" style={{ padding: '24px 26px' }}>
        <h2 className="h3" style={{ color: 'var(--success)' }}>Başvurunuz alındı</h2>
        <p className="muted" style={{ margin: '12px 0 0', maxWidth: '58ch' }}>
          Ekibimiz <b>2 iş günü içinde</b> telefonla dönüş yapacak.
          Görüşmede projenin konumunu, aşamasını ve daire tiplerini
          konuşuyoruz; ardından şantiye ziyareti için randevulaşıyoruz.
        </p>
        <p className="small muted" style={{ marginTop: 12, maxWidth: '58ch' }}>
          Şantiye görsellerini biz çekiyoruz — hazırlamanıza gerek yok.
          Ruhsat ve tapu belgelerini ziyarette görmek istiyoruz.
        </p>
        <p style={{ marginTop: 20 }}>
          <Link className="btn btn-ghost" href="/">Ana sayfaya dön</Link>
        </p>
      </section>
    );
  }

  return (
    <form action={gonder} key={denemeRef.current} className="kart" style={{ padding: '24px 26px' }}>
      <fieldset disabled={bekliyor} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="basvuru-izgara">
          <div className="p-alan">
            <label htmlFor="b-firma">Firma unvanı</label>
            <input id="b-firma" name="firmaAd" required maxLength={80} autoComplete="organization"
              defaultValue={d?.firmaAd} placeholder="Örnek İnşaat A.Ş." style={stil('firmaAd')} />
            <span className="ipucu">Proje kartlarında görünecek ad.</span>
          </div>

          <div className="p-alan">
            <label htmlFor="b-ad">Yetkili ad soyad</label>
            <input id="b-ad" name="ad" required maxLength={80} autoComplete="name"
              defaultValue={d?.ad} placeholder="Deniz Aydın" style={stil('ad')} />
          </div>

          <div className="p-alan">
            <label htmlFor="b-telefon">Telefon</label>
            <input id="b-telefon" name="telefon" type="tel" required autoComplete="tel"
              defaultValue={d?.telefon} placeholder="0532 123 45 67" style={stil('telefon')} />
            <span className="ipucu">Ekibimiz buradan arayacak.</span>
          </div>

          <div className="p-alan">
            <label htmlFor="b-eposta">E-posta</label>
            <input id="b-eposta" name="eposta" type="email" required autoComplete="email"
              defaultValue={d?.eposta} placeholder="satis@ornek.com" style={stil('eposta')} />
          </div>

          <div className="p-alan">
            <label htmlFor="b-bolge">Projeniz nerede?</label>
            <input id="b-bolge" name="bolge" required maxLength={80}
              defaultValue={d?.bolge} placeholder="Ataşehir, Barbaros" style={stil('bolge')} />
            <span className="ipucu">İlçe ve mahalle yeterli.</span>
          </div>

          <div className="p-alan">
            <label htmlFor="b-sayi">Kaç projeniz var?</label>
            <input id="b-sayi" name="projeSayisi" type="number" min={1} max={200}
              defaultValue={d?.projeSayisi || 1} style={stil('projeSayisi')} />
            <span className="ipucu">Şu an satışta ya da yakında satışa çıkacak olanlar.</span>
          </div>
        </div>

        <div className="p-alan" style={{ marginTop: 16 }}>
          {/* PROJENİN AŞAMASI serbest metinde soruluyor. Başvuru
              modelinde bunu tutan bir alan yok ve şemaya dokunmadan
              çözülüyor. Sormadan bırakmak, lansman öncesi bir projeyle
              teslim edilmiş bir projeyi aynı telefon görüşmesine
              sokmak demekti — ikisinin süreci baştan sona farklı. */}
          <label htmlFor="b-mesaj">
            Projeniz hangi aşamada? <span className="dim">(kısaca yazın)</span>
          </label>
          <textarea id="b-mesaj" name="mesaj" rows={4} maxLength={1000}
            value={mesaj} onChange={(e) => setMesaj(e.target.value)}
            placeholder="Ruhsat alındı mı, inşaat başladı mı, satış ne zaman açılıyor? Teslim için öngörülen tarih varsa yazın."
            style={stil('mesaj')} />
          <span className="ipucu">{mesaj.length}/1000</span>
        </div>

        {durum?.hata && (
          <p className="form-hata" role="alert" style={{ marginTop: 16 }}>
            <Icon n="x" s={16} sw={2.4} /> {durum.hata}
          </p>
        )}

        <button className="btn btn-primary btn-lg" type="submit"
          style={{ marginTop: 20 }} disabled={bekliyor}>
          {bekliyor ? 'Gönderiliyor…' : 'Başvuruyu gönder'}
        </button>

        <p className="tiny dim" style={{ marginTop: 14, maxWidth: '62ch' }}>
          Başvurunuz sizinle iletişime geçmek için işleniyor.
          Verilerinizin nasıl işlendiğini{' '}
          <Link href="/gizlilik">gizlilik politikasında</Link> bulabilir,
          silinmesini <Link href="/veri-talebi">buradan</Link> talep
          edebilirsiniz.
        </p>
      </fieldset>
    </form>
  );
}
