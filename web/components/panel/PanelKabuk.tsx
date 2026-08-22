import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelNav from './PanelNav';
import KomutPaleti from './KomutPaleti';
import CikisButonu from './CikisButonu';
import type { AktifKullanici } from '@/lib/auth';
import type { IkonAdi } from '@/lib/types';

export interface NavOge {
  yol: string;
  ad: string;
  ikon: IkonAdi;
  rozet?: number;
  /** Kenar çubuğunda hangi başlık altında duracağı */
  grup?: string;
}

/**
 * Admin ve firma panellerinin ortak kabuğu.
 * Sol kenar çubuğu + üst bar; içerik `children` olarak gelir.
 */
export default function PanelKabuk({
  kullanici, nav, baslik, aciklama, eylem, children, kok,
}: {
  kullanici: AktifKullanici;
  nav: NavOge[];
  baslik: string;
  aciklama?: string;
  eylem?: React.ReactNode;
  children: React.ReactNode;
  kok: string;
}) {
  const adminMi = kok === '/yonetim';
  /* Kabuk etiketi KÖKTEN geliyor: ziyaretçi hesabında "Firma
     paneli" yazıyordu ve kullanıcıya sahip olmadığı bir rolü
     söylüyordu. */
  const kabukAdi = adminMi ? 'Yönetim' : kok === '/hesap' ? 'Hesabım' : 'Firma paneli';

  return (
    <div className="panel">
      <aside className="panel-yan">
        <Link className="panel-logo" href="/">
          <span>
            KonutProjeleri
            <small>{kabukAdi}</small>
          </span>
        </Link>

        <PanelNav nav={nav} />

        <div className="panel-kullanici">
          <div className="avatar" aria-hidden="true">{kullanici.ad.slice(0, 1)}</div>
          <div style={{ minWidth: 0 }}>
            <b>{kullanici.ad}</b>
            <span title={kullanici.eposta}>{kullanici.eposta}</span>
          </div>
          <CikisButonu />
        </div>
      </aside>

      {/* `#icerik`: kök düzendeki "İçeriğe geç" bağlantısının hedefi.
          Panel kendi <main>'ini bastığı için kök düzen panelde
          sarmalayıcı bir <main> koymuyor — iç içe iki <main> geçersiz
          HTML'di ve ekran okuyucuda ana bölge belirsiz kalıyordu. */}
      <main className="panel-icerik" id="icerik">
        <header className="panel-bas">
          <div>
            <h1>{baslik}</h1>
            {aciklama && <p className="muted small">{aciklama}</p>}
          </div>
          <div className="panel-bas-eylem">
            {eylem}
            {adminMi && kullanici.rol === 'ADMIN' && (
              <Link className="btn btn-ghost btn-sm" href="/panel">
                <Icon n="home" s={15} /> Firma görünümü
              </Link>
            )}
            {!adminMi && kullanici.rol === 'ADMIN' && (
              <Link className="btn btn-ghost btn-sm" href="/yonetim">
                <Icon n="sliders" s={15} /> Yönetim
              </Link>
            )}
            <Link className="btn btn-ghost btn-sm" href="/" target="_blank">
              <Icon n="arrowR" s={15} /> Siteyi gör
            </Link>
          </div>
        </header>

        <div className="panel-govde">{children}</div>
      </main>

      {/* Ctrl/⌘+K ile her yerden sayfa arama */}
      <KomutPaleti nav={nav} kok={kok} />
    </div>
  );
}
