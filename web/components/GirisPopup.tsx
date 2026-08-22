'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { girisYap, ziyaretciKayit, type GirisSonucu } from '@/lib/panel-eylemler';

/* ============================================================
   Giriş / kayıt penceresi.

   Ayrı bir sayfaya gitmek yerine perde: giriş, ziyaretçinin o an
   yaptığı işin (proje bakmak, talep bırakmak) ortasında
   çıkan bir ara adım. Sayfaya gitmek bağlamı kaybettiriyor ve geri
   dönüşü kullanıcıya bırakıyordu.

   `/giris` sayfası DURUYOR: JavaScript olmadan da giriş yapılabilmeli
   ve parola yöneticileri gerçek bir sayfayı daha iyi tanıyor. Perde
   aynı sunucu eylemlerini çağırıyor, ikinci bir kimlik yolu yok.

   Google düğmesi yalnızca yapılandırma varsa çıkıyor; durumu
   `/api/oturum` söylüyor.
   ============================================================ */

type Sekme = 'giris' | 'kayit';

export default function GirisPopup(
  { acik, kapat, google, baslangic = 'giris' }:
  { acik: boolean; kapat: () => void; google: boolean; baslangic?: Sekme },
) {
  const [sekme, setSekme] = useState<Sekme>(baslangic);
  const [girisDurum, girisGonder, girisBekliyor] =
    useActionState<GirisSonucu | null, FormData>(girisYap, null);
  const [kayitDurum, kayitGonder, kayitBekliyor] =
    useActionState<GirisSonucu | null, FormData>(ziyaretciKayit, null);

  useEffect(() => { if (acik) setSekme(baslangic); }, [acik, baslangic]);

  useEffect(() => {
    if (!acik) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') kapat(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [acik, kapat]);

  if (!acik || typeof document === 'undefined') return null;

  const bekliyor = girisBekliyor || kayitBekliyor;
  const hata = sekme === 'giris' ? girisDurum?.hata : kayitDurum?.hata;

  /* PORTAL zorunlu: pencere başlığın içinde duruyor ve başlıkta
     `backdrop-filter` var. Filtre uygulanan bir öğe, içindeki
     `position: fixed` çocuklar için KAPSAYICI BLOK oluyor — perde
     ekranı değil 1440×64'lük başlığı kaplıyor ve kutunun altı
     kırpılıyordu. */
  return createPortal(
    <div className="modal open giris-perde" role="dialog" aria-modal="true"
      aria-label={sekme === 'giris' ? 'Giriş yap' : 'Kayıt ol'}
      onClick={(e) => { if (e.target === e.currentTarget) kapat(); }}>
      {/* Odak KUTUYA veriliyor, ilk alana değil: `autoFocus` bir
          alanı odaklayınca tarayıcı onu görünür alana kaydırıyor ve
          kaydırılabilir perdede pencerenin başlığı ekranın üstünden
          taşıyordu. */}
      <div className="giris-kutu" tabIndex={-1} ref={(el) => el?.focus()}>
        <button type="button" className="giris-kapat" onClick={kapat} aria-label="Kapat">
          <Icon n="x" s={18} sw={2.4} />
        </button>

        <div className="giris-bas">
          <span className="logo" aria-hidden="true">
            <span className="logo-a">konut</span><span className="logo-b">projeleri</span><span className="dot">.</span>
          </span>
          <h2>{sekme === 'giris' ? 'Tekrar hoş geldiniz' : 'Hesap açın'}</h2>
          <p>
            {sekme === 'giris'
              ? 'Taleplerinizi görmek ve proje yönetimi için giriş yapın.'
              : 'Favorilerinizi ve panolarınızı tek yerde toplayın; firmaysanız panel erişimi sonradan tanımlanır.'}
          </p>
        </div>

        <div className="giris-sekme" role="tablist">
          <button type="button" role="tab" aria-selected={sekme === 'giris'}
            className={sekme === 'giris' ? 'on' : ''} onClick={() => setSekme('giris')}>
            Giriş yap
          </button>
          <button type="button" role="tab" aria-selected={sekme === 'kayit'}
            className={sekme === 'kayit' ? 'on' : ''} onClick={() => setSekme('kayit')}>
            Kayıt ol
          </button>
        </div>

        {google && (
          <>
            {/* Bağlantı, düğme değil: sunucuya GET ile gidiyor ve
                oradan Google'a yönlendiriliyor. Form içinde bir
                düğme olsaydı JavaScript kapalıyken çalışmazdı. */}
            <a className="btn btn-outline btn-block google-dugme"
              href={`/api/giris/google?hedef=${encodeURIComponent(
                typeof window !== 'undefined' ? window.location.pathname : '/',
              )}`}>
              <GoogleLogo />
              {sekme === 'giris' ? 'Google ile giriş yap' : 'Google ile kayıt ol'}
            </a>
            <div className="giris-ayrac"><span>ya da e-posta ile</span></div>
          </>
        )}

        {sekme === 'giris' ? (
          <form action={girisGonder} className="giris-form">
            <label>
              <span>E-posta</span>
              <input name="eposta" type="email" required autoComplete="username"
                placeholder="ornek@eposta.com" />
            </label>
            <label>
              <span>Parola</span>
              <input name="parola" type="password" required autoComplete="current-password" />
            </label>
            {hata && <p className="form-hata" role="alert"><Icon n="x" s={15} sw={2.4} /> {hata}</p>}
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={bekliyor}>
              {girisBekliyor ? 'Kontrol ediliyor…' : 'Giriş yap'}
            </button>
          </form>
        ) : (
          <form action={kayitGonder} className="giris-form">
            <label>
              <span>Ad soyad</span>
              <input name="ad" required minLength={3} maxLength={60} autoComplete="name"
                placeholder="Adınız ve soyadınız" />
            </label>
            <label>
              <span>E-posta</span>
              <input name="eposta" type="email" required autoComplete="username"
                placeholder="ornek@eposta.com" />
            </label>
            <label>
              <span>Parola</span>
              <input name="parola" type="password" required minLength={10}
                autoComplete="new-password" />
              <em>En az 10 karakter.</em>
            </label>
            <label className="onay-kutu">
              <input type="checkbox" name="kosullar" />
              <span>
                <Link href="/gizlilik" target="_blank">Gizlilik politikasını</Link> ve{' '}
                <Link href="/iptal-kosullari" target="_blank">iptal koşullarını</Link> okudum,
                onaylıyorum.
              </span>
            </label>
            {hata && <p className="form-hata" role="alert"><Icon n="x" s={15} sw={2.4} /> {hata}</p>}
            <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={bekliyor}>
              {kayitBekliyor ? 'Hesap açılıyor…' : 'Hesap aç'}
            </button>
          </form>
        )}

        <p className="giris-alt">
          {sekme === 'giris' ? (
            <>Projenizi yayınlamak mı istiyorsunuz?{' '}
              <Link href="/firma-basvuru" onClick={kapat}>Firma başvurusu</Link></>
          ) : (
            <>Hesabınız var mı?{' '}
              <button type="button" onClick={() => setSekme('giris')}>Giriş yapın</button></>
          )}
        </p>
      </div>
    </div>,
    document.body,
  );
}

/* Google'ın marka rehberi kendi logosunu istiyor; ikon setimizdeki
   genel bir simge yerine dört renkli işaret. */
function GoogleLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.5 2.6 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-17z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.8-4.5l-7.8-6.1C1 16.9 0 20.3 0 24s1 7.1 2.6 10.4l7.8-5.7z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.3-4.6 2.1-8.8 2.1-6.3 0-11.7-3.7-13.6-9.1l-7.8 5.7C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
