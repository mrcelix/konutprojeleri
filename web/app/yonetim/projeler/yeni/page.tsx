import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import ProjeEkle from '@/components/panel/ProjeEkle';
import { prisma } from '@/lib/db';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YeniProje() {
  const { kullanici, nav, kok } = await yonetimBaglam();

  const [bolgeler, firmalar, ozellikler] = await Promise.all([
    prisma.bolge.findMany({
      orderBy: { sira: 'asc' },
      select: { id: true, ad: true, il: true },
    }),
    prisma.firma.findMany({
      orderBy: { ad: 'asc' },
      select: { id: true, ad: true, _count: { select: { projeler: true } } },
    }),
    prisma.ozellik.findMany({
      orderBy: { sira: 'asc' },
      select: { kod: true, ad: true },
    }),
  ]);

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Yeni proje"
      aciklama="Kayıt taslak olarak açılır — daire tipi girilmeden yayına alınamaz"
      eylem={(
        <Link className="btn btn-ghost btn-sm" href="/yonetim/projeler">
          <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
            <Icon n="arrowR" s={15} />
          </span>
          Projeler
        </Link>
      )}
    >
      {firmalar.length === 0 ? (
        <div className="kart p-bos">
          <Icon n="users" s={30} />
          <p>
            Önce bir firma kaydı gerekiyor. Proje bir geliştirici firmaya
            bağlı olmadan açılamaz.
          </p>
          <Link className="btn btn-primary btn-sm" href="/yonetim/firmalar/yeni">
            <Icon n="plus" s={15} sw={2.2} /> Firma ekle
          </Link>
        </div>
      ) : (
        <ProjeEkle
          bolgeler={bolgeler.map((b) => ({ id: b.id, ad: b.ad, alt: b.il }))}
          firmalar={firmalar.map((e) => ({
            id: e.id, ad: e.ad,
            alt: `${e._count.projeler} proje`,
          }))}
          ozellikler={ozellikler}
        />
      )}
    </PanelKabuk>
  );
}
