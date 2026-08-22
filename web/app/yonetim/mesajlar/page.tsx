import PanelKabuk from '@/components/panel/PanelKabuk';
import MesajPaneli from '@/components/panel/MesajPaneli';
import { konusmalariGetir } from '@/lib/mesaj-veri';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YonetimMesajlar(
  { searchParams }: { searchParams: Promise<{ k?: string }> },
) {
  const b = await yonetimBaglam();
  const { k } = await searchParams;
  const { veri, secili } = await konusmalariGetir(null, k);

  const acik = veri.filter((x) => x.durum === 'ACIK').length;

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Mesajlar"
      aciklama={`Tüm envanter · ${acik} yanıtlanmamış · ${veri.length} konuşma`}
    >
      <MesajPaneli konusmalar={veri} secili={secili} kok="/yonetim" />
    </PanelKabuk>
  );
}
