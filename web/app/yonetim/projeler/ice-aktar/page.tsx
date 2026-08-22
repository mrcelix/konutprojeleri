import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import ProjeIceAktar from '@/components/panel/ProjeIceAktar';
import { prisma } from '@/lib/db';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function ProjeIceAktarSayfasi() {
  const { kullanici, nav, kok } = await yonetimBaglam();

  const [bolgeler, firmalar] = await Promise.all([
    prisma.bolge.findMany({ orderBy: { sira: 'asc' }, select: { ad: true } }),
    prisma.firma.findMany({ orderBy: { ad: 'asc' }, select: { ad: true } }),
  ]);

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Toplu proje aktarma"
      aciklama="Firmadan gelen listeyi envantere aktarın"
      eylem={(
        <Link className="btn btn-ghost btn-sm" href="/yonetim/projeler">
          <Icon n="chevL" s={15} /> Projeler
        </Link>
      )}
    >
      {firmalar.length === 0 ? (
        <div className="kart p-bos">
          <Icon n="users" s={30} />
          <p>
            Önce firma kaydı gerekiyor. Dosyadaki her proje, adıyla
            eşleşen bir geliştirici firmaya bağlanıyor.
          </p>
          <Link className="btn btn-primary btn-sm" href="/yonetim/firmalar/yeni">
            <Icon n="plus" s={15} sw={2.2} /> Firma ekle
          </Link>
        </div>
      ) : (
        <>
          <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
            <p className="small muted" style={{ margin: 0 }}>
              Dosyadaki <b>bölge</b> ve <b>firma</b> sütunları ada göre
              eşleştiriliyor; tanımlı olmayan bir ad satırı hatalı yapıyor.
              Eklenen projeler <b>taslak</b> olarak açılıyor — yayına alma
              yerinde doğrulamadan ve daire tipleri girildikten sonra ayrı
              bir adım.
            </p>
          </div>

          <ProjeIceAktar />

          <section className="p-kart" style={{ marginTop: 16 }}>
            <h2 className="h3">Tanımlı adlar</h2>
            <p className="muted small" style={{ margin: '6px 0 12px' }}>
              Dosyada bu adları birebir kullanın.
            </p>
            <div className="ekle-izgara">
              <div>
                <h3 className="h3" style={{ fontSize: 13.5 }}>Bölgeler</h3>
                <p className="tiny muted" style={{ marginTop: 6 }}>
                  {bolgeler.map((b) => b.ad).join(' · ')}
                </p>
              </div>
              <div>
                <h3 className="h3" style={{ fontSize: 13.5 }}>
                  Firmalar ({firmalar.length})
                </h3>
                <p className="tiny muted" style={{ marginTop: 6 }}>
                  {firmalar.map((e) => e.ad).join(' · ')}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </PanelKabuk>
  );
}
