import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import SayfaDuzenle from '@/components/panel/SayfaDuzenle';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YeniSayfa() {
  const { kullanici, nav, kok } = await yonetimBaglam();

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Yeni sayfa"
      aciklama="Kurumsal metin sayfası oluşturun"
      eylem={
        <Link className="btn btn-ghost btn-sm" href="/yonetim/sayfalar">
          <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
            <Icon n="arrowR" s={15} />
          </span>
          Sayfalar
        </Link>
      }
    >
      <SayfaDuzenle
        sayfa={{
          slug: '', dil: 'TR', baslik: '', h1: '', aciklama: '',
          govde: '', sss: '', ctaMetin: '', ctaYol: '', indexle: true, yayinda: false,
        }}
      />
    </PanelKabuk>
  );
}
