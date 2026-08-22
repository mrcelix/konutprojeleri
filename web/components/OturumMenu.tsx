'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import GirisPopup from './GirisPopup';
import Icon from './Icon';
import { cikisYap } from '@/lib/panel-eylemler';

/* ============================================================
   Başlıktaki oturum düğmesi.

   Oturum YOKKEN "Giriş yap" bağlantısı — sunucudan basılan hâli bu.
   Oturum varken adın baş harfiyle bir düğmeye dönüşüyor ve altında
   Profil / Panel / Çıkış menüsü açılıyor.

   Durum sunucu bileşeninden gelmiyor: çerezi `app/layout.tsx`te
   okumak bütün siteyi dinamik yapardı (238 statik sayfa iptal
   olurdu). Bunun bedeli, oturum varken düğmenin ilk boyamada bir an
   "Giriş yap" görünmesi — yanlış bir şey göstermiyor, yalnızca
   henüz bilmiyor.
   ============================================================ */

interface Oturum { var: boolean; ad?: string; rol?: 'ADMIN' | 'FIRMA' | 'ZIYARETCI'; kok?: string; google?: boolean }

export default function OturumMenu({ dil = 'tr' }: { dil?: string }) {
  const en = dil === 'en';
  const [oturum, setOturum] = useState<Oturum | null>(null);
  const [acik, setAcik] = useState(false);
  const [perde, setPerde] = useState<false | 'giris' | 'kayit'>(false);
  const [bekliyor, basla] = useTransition();
  const kap = useRef<HTMLDivElement>(null);

  /* Başlık kök yerleşimin parçası ve gezinmede YENİDEN BAĞLANMIYOR:
     giriş yapan kullanıcı yönlendirildikten sonra düğme "Giriş yap"
     olarak kalıyordu. Yol değişince durum yeniden soruluyor. */
  const yol = usePathname();

  useEffect(() => {
    let iptal = false;
    fetch('/api/oturum', { cache: 'no-store' })
      .then((y) => (y.ok ? y.json() : { var: false }))
      .then((d: Oturum) => { if (!iptal) setOturum(d); })
      .catch(() => { if (!iptal) setOturum({ var: false }); });
    return () => { iptal = true; };
  }, [yol]);

  useEffect(() => {
    if (!acik) return;
    const disari = (e: MouseEvent) => {
      if (kap.current && !kap.current.contains(e.target as Node)) setAcik(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAcik(false); };
    document.addEventListener('click', disari);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('click', disari);
      document.removeEventListener('keydown', esc);
    };
  }, [acik]);

  if (!oturum?.var) {
    return (
      <>
        <button className="btn btn-outline btn-sm" type="button" onClick={() => setPerde('giris')}>
          {en ? 'Sign in' : 'Giriş yap'}
        </button>
        <GirisPopup acik={perde !== false} kapat={() => setPerde(false)}
          google={oturum?.google ?? false} baslangic={perde === 'kayit' ? 'kayit' : 'giris'} />
      </>
    );
  }

  const ad = oturum.ad ?? '';
  const bas = ad.trim().charAt(0).toUpperCase() || '?';
  const ilkAd = ad.split(' ')[0];
  const kok = oturum.kok ?? '/panel';

  return (
    <div className="oturum-menu" ref={kap}>
      <button type="button" className="btn btn-outline btn-sm oturum-dugme"
        onClick={() => setAcik((a) => !a)} aria-expanded={acik} aria-haspopup="menu">
        <span className="oturum-bas" aria-hidden="true">{bas}</span>
        <span className="oturum-ad">{ilkAd}</span>
        <Icon n={acik ? 'chevU' : 'chevD'} s={14} sw={2.4} />
      </button>

      {acik && (
        <div className="oturum-liste" role="menu">
          <div className="oturum-baslik">
            <b>{ad}</b>
            <span>{oturum.rol === 'ADMIN' ? (en ? 'Administrator' : 'Yönetici')
              : oturum.rol === 'ZIYARETCI' ? (en ? 'Visitor' : 'Ziyaretçi')
                : (en ? 'Host' : 'Villa sahibi')}</span>
          </div>

          <Link className="oturum-oge" role="menuitem" href="/panel/profil" onClick={() => setAcik(false)}>
            <Icon n="users" s={16} /> {en ? 'Profile' : 'Profil'}
          </Link>
          <Link className="oturum-oge" role="menuitem" href={kok} onClick={() => setAcik(false)}>
            <Icon n="grid" s={16} /> {en ? 'Dashboard'
              : oturum.rol === 'ADMIN' ? 'Yönetim paneli'
                : oturum.rol === 'ZIYARETCI' ? 'Hesabım' : 'Panelim'}
          </Link>
          <Link className="oturum-oge" role="menuitem" href="/panel/guvenlik" onClick={() => setAcik(false)}>
            <Icon n="shield" s={16} /> {en ? 'Security' : 'Güvenlik'}
          </Link>

          {/* Çıkış sunucu eyleminde: çerez httpOnly, istemciden
              silinemiyor ve oturum satırı da veritabanından
              düşürülmeli. */}
          <button type="button" className="oturum-oge oturum-cikis" role="menuitem"
            disabled={bekliyor} onClick={() => basla(() => { void cikisYap(); })}>
            <Icon n="key" s={16} /> {bekliyor ? (en ? 'Signing out…' : 'Çıkılıyor…') : (en ? 'Sign out' : 'Çıkış yap')}
          </button>
        </div>
      )}
    </div>
  );
}
