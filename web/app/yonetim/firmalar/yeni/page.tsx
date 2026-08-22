import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import FirmaEkle from '@/components/panel/FirmaEkle';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YeniFirma() {
  const { kullanici, nav, kok } = await yonetimBaglam();

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Yeni firma"
      aciklama="Proje açmadan önce firma kaydı gerekiyor"
      eylem={
        <Link className="btn btn-ghost btn-sm" href="/yonetim/firmalar">
          <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
            <Icon n="arrowR" s={15} />
          </span>
          Ev sahipleri
        </Link>
      }
    >
      <FirmaEkle />
    </PanelKabuk>
  );
}
