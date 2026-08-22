'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useApp } from './AppState';
import DilSecici from './DilSecici';
import Icon from './Icon';
import BaslikArama from './BaslikArama';
import type { Oneri } from './SearchBar';
import OturumMenu from './OturumMenu';
import MegaMenu, { type MegaTanim } from './MegaMenu';
import type { DuzBaglanti } from '@/lib/menu-kayit';
import { sozluk, type Dil, type RotaDili } from '@/lib/i18n';

const NAV: Record<RotaDili, { yol: string; ad: string }[]> = {
  /* Türkçe menüde "Proje kategorileri" ve "Bölgeler" mega panele
     taşındı; burada yalnızca panelsiz bağlantılar duruyor. */
  tr: [
    /* Rehber ve İletişim başlıktan çıktı, altbilgide duruyor:
       başlık satırı talep formuna giden yolun kendisi. */
    { yol: '/arama', ad: 'Projeler' },
    { yol: '/firmalar', ad: 'Firmalar' },
  ],
  en: [
    { yol: '/en', ad: 'Discover' },
    { yol: '/en/search', ad: 'Developments' },
    { yol: '/en/regions', ad: 'Regions' },
    { yol: '/firma-basvuru', ad: 'List your development' },
  ],
  /* Rota ağacı açılmadan kullanılmıyor (bkz. ROTA_AGACI); yol adları
     lib/i18n.ts'teki eşlemeyle aynı olmalı. */
  ru: [
    { yol: '/ru', ad: 'Обзор' },
    { yol: '/ru/poisk', ad: 'Виллы' },
    { yol: '/ru/regiony', ad: 'Регионы' },
    { yol: '/ev-sahibi-ol', ad: 'Разместить виллу' },
  ],
};

export interface MiniArama { yer: string; tarih: string; kisi: string; yol: string }

export default function Header(
  { mini, dil = 'tr', diller, mega, duz, guven, oneriler }:
  {
    mini?: MiniArama; dil?: RotaDili; diller?: Dil[];
    /** Perdedeki arama kutusunun önerileri */
    oneriler?: Oneri[];
    mega?: MegaTanim[];
    /** Panelden yönetilen düz bağlantılar; verilmezse koddaki NAV kullanılıyor */
    duz?: DuzBaglanti[];
    /** Güven şeridi maddeleri — metin kaydından; boşsa şerit basılmıyor */
    guven?: string[];
  },
) {
  const s = sozluk(dil);
  /* Panelden gelen liste öncelikli; boşsa koddaki varsayılan. */
  const NAVI = duz && duz.length > 0
    ? duz.map((d) => ({ yol: d.yol, ad: d.ad }))
    : NAV[dil];
  const { favoriler, karsilastir, tema, toggleTema, bildir } = useApp();
  const [stuck, setStuck] = useState(false);
  const yol = usePathname();

  useEffect(() => {
    const f = () => setStuck(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  /* Güven şeridi maddeleri PANELDEN geliyor (metin kaydı). Kodda
     sabitken "7/24 destek" gibi bir vaadi geri almak dağıtım
     bekliyordu. Boş gelirse şerit hiç basılmıyor. */
  const GUVEN = guven ?? [];

  return (
    <>
      {/* Kat 1 */}
      <div className="utilbar">
        <div className="utilbar-inner">
          <div className="utilbar-left">
            <Link href="/nasil-calisir">{dil === 'en' ? 'How it works' : 'Nasıl çalışır'}</Link>
            <span className="utilbar-sep" />
            <Link href="/yerinde-inceleme">{dil === 'en' ? 'Site inspection' : 'Yerinde inceleme'}</Link>
            <span className="utilbar-sep" />
            <Link href="/sikca-sorulanlar">{dil === 'en' ? 'FAQ' : 'Sıkça sorulanlar'}</Link>
            <span className="utilbar-sep" />
            <Link href="/firma-basvuru">{dil === 'en' ? 'For developers' : 'Firmalar için'}</Link>
          </div>

          {/* Güven şeridi ÜST ÇUBUĞA taşındı. Başlığın altında kendi
              katını kaplıyordu: üç kat üst üste (yardımcı bağlantılar,
              başlık, şerit) 130 px'i sayfanın en değerli yerinden
              alıyor ve hero'yu aşağı itiyordu. Burada zaten var olan
              boşluğu dolduruyor. */}
          {GUVEN.length > 0 && (
          <div className="trustbar trust-shine" aria-hidden="true">
            <div className="trustbar-track">
              {[...GUVEN, ...GUVEN].map((g, i) => (
                <span className="trust-item" key={`${g}-${i}`}>
                  <Icon n="check" s={12} sw={2.6} />{g}
                </span>
              ))}
            </div>
          </div>
          )}

          <div className="utilbar-right">
            <DilSecici dil={dil} diller={diller} />
            <button
              type="button" className="icon-btn" onClick={toggleTema}
              style={{ width: 28, height: 28 }}
              aria-label={tema === 'dark'
                ? (dil === 'en' ? 'Switch to light theme' : 'Açık temaya geç')
                : (dil === 'en' ? 'Switch to dark theme' : 'Koyu temaya geç')}
            >
              <Icon n={tema === 'dark' ? 'sun' : 'moon'} s={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Kat 2 */}
      <header className={'site-header' + (stuck ? ' is-stuck' : '')}>
        <div className="header-inner">
          <Link className="logo" href={dil === 'en' ? '/en' : '/'} aria-label={dil === 'en' ? 'KonutProjeleri home' : 'KonutProjeleri ana sayfa'}>
            {/* Harfler tek renk düz metindi; marka adı başlıkta
                gezinme bağlantılarından ayrışmıyordu. İlk hece marka
                mavisi, ikincisi mürekkep — nokta zaten vurgu renginde. */}
            <span className="logo-a">konut</span><span className="logo-b">projeleri</span><span className="dot">.</span>
          </Link>

          {mega && mega.length > 0 ? (
            <nav className="nav" aria-label="Ana menü">
              {NAVI.slice(0, 2).map((n) => (
                <Link key={n.yol} href={n.yol} className={yol === n.yol ? 'active' : ''}>{n.ad}</Link>
              ))}
              <MegaMenu menuler={mega} aktifYol={yol} />
              {NAVI.slice(2).map((n) => (
                <Link key={n.yol} href={n.yol} className={yol === n.yol ? 'active' : ''}>{n.ad}</Link>
              ))}
            </nav>
          ) : (
            <nav className="nav" aria-label={dil === 'en' ? 'Main menu' : 'Ana menü'}>
              {NAVI.map((n) => (
                <Link key={n.yol} href={n.yol} className={yol === n.yol ? 'active' : ''}>{n.ad}</Link>
              ))}
            </nav>
          )}

          {/* Arama alanı artık sayfa değiştirmiyor: yerinde gelişmiş
              bir perde açıyor ve sağında sesli arama var. */}
          <BaslikArama
            oneriler={oneriler ?? []}
            yer={mini ? `${mini.yer} · ${mini.tarih} · ${mini.kisi}` : s.projeAra}
            mega={mega}
          />

          <div className="header-icons">
            {/* Karşılaştırma listesi favorinin SOLUNDA: ikisi de
                "biriktirdiklerim" kutusu ve yan yana durmaları
                aranırken tek yere bakmayı yetiriyor. Sayaç yalnızca
                dolu olduğunda görünüyor — boş rozet bilgi taşımıyor. */}
            <button
              type="button" className="icon-btn ikon-sayac"
              onClick={() => bildir(dil === 'en'
                ? `Compare: ${karsilastir.length} developments`
                : `Karşılaştırma: ${karsilastir.length} proje`)}
              aria-label={dil === 'en' ? 'Compare developments' : 'Karşılaştırma listesi'}
            >
              <Icon n="scale" s={17} />
              {karsilastir.length > 0 && <em>{karsilastir.length}</em>}
            </button>
            {/* Kalp artık SAYFAYA gidiyor: önceden yalnızca "3 proje"
                diyen bir bildirim çıkıyor, hangileri olduğu
                söylenmiyordu. */}
            <Link
              className="icon-btn ikon-sayac" href="/favoriler"
              aria-label={dil === 'en' ? 'Saved developments' : 'Favoriler'}
            >
              <Icon n="heart" s={17} />
              {favoriler.length > 0 && <em>{favoriler.length}</em>}
            </Link>
          </div>

          {/* Karşılaştırma panosu başlıktan KALDIRILDI. Yolu duruyor:
              `/pano` sayfası, mobil alt çubuktaki sekmesi ve proje
              kartındaki "Panoya ekle" düğmesi çalışmaya devam
              ediyor — yalnızca üst çubuktaki bağlantı yok. */}
          {/* Oturum varken düğme Profil / Panel / Çıkış menüsüne
              dönüşüyor; durumu istemci `/api/oturum`dan okuyor —
              çerezi burada okumak bütün sayfaları dinamikleştirirdi. */}
          <OturumMenu dil={dil} />
          <Link className="btn btn-cta btn-shine btn-sm" href="/firma-basvuru">{s.firmaOl}</Link>
        </div>
      </header>
    </>
  );
}
