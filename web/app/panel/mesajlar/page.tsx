import PanelKabuk from '@/components/panel/PanelKabuk';
import MesajPaneli from '@/components/panel/MesajPaneli';
import { konusmalariGetir } from '@/lib/mesaj-veri';
import { firmaBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function PanelMesajlar(
  { searchParams }: { searchParams: Promise<{ k?: string }> },
) {
  const b = await firmaBaglam();
  const { k } = await searchParams;
  const { veri, secili } = await konusmalariGetir(b.projeIdler, k);

  const acik = veri.filter((x) => x.durum !== 'KAPALI').length;

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Mesajlar"
      aciklama={`${acik} açık konuşma · ${veri.length} toplam`}
    >
      <MesajPaneli konusmalar={veri} secili={secili} kok="/panel" />
    </PanelKabuk>
  );
}
