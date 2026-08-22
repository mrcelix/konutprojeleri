import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import FirmaDuzenle from '@/components/panel/FirmaDuzenle';
import { prisma } from '@/lib/db';
import { yonetimBaglam } from '@/lib/panel-baglam';
import { DURUM_ADI } from '@/lib/bicim';

export const dynamic = 'force-dynamic';

export default async function FirmaDetay({ params }: { params: Promise<{ id: string }> }) {
  const { kullanici, nav, kok } = await yonetimBaglam();
  const { id } = await params;

  const e = await prisma.firma.findUnique({
    where: { id },
    select: {
      id: true, ad: true, ozet: true, telefon: true, eposta: true, web: true,
      kurulusYili: true, tamamlananProje: true, yayinda: true,
      projeler: {
        orderBy: { ad: 'asc' },
        select: { id: true, slug: true, ad: true, yayinda: true, durum: true },
      },
      kullanici: { select: { id: true, eposta: true, aktif: true } },
    },
  });
  if (!e) notFound();

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik={e.ad}
      aciklama={[e.kurulusYili && `${e.kurulusYili}’den beri`, `${e.projeler.length} proje`, e.tamamlananProje > 0 && `${e.tamamlananProje} teslim`].filter(Boolean).join(' · ')}
      eylem={
        <Link className="btn btn-ghost btn-sm" href="/yonetim/firmalar">
          <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
            <Icon n="arrowR" s={15} />
          </span>
          Firmalar
        </Link>
      }
    >
      <FirmaDuzenle e={e} />

      <section className="kart" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 10px' }}>Projeleri</h2>
        {e.projeler.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            Bu firmaya bağlı proje yok.{' '}
            <Link href="/yonetim/projeler/yeni">Proje ekleyin</Link>.
          </p>
        ) : (
          <div className="p-tablo-kap">
            <table className="p-tablo">
              <thead><tr><th>Proje</th><th>Aşama</th><th>Durum</th><th>İşlem</th></tr></thead>
              <tbody>
                {e.projeler.map((v) => (
                  <tr key={v.id}>
                    <td>{v.ad}</td>
                    <td className="muted">{DURUM_ADI[v.durum]}</td>
                    <td>
                      <span className={'badge' + (v.yayinda ? ' badge-instant' : '')}>
                        {v.yayinda ? 'Yayında' : 'Yayın dışı'}
                      </span>
                    </td>
                    <td><Link href={`/yonetim/projeler/${v.id}`}>Düzenle</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="kart" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 10px' }}>Panel hesabı</h2>
        {!e.kullanici ? (
          <p className="small muted" style={{ margin: 0 }}>
            Bu firmanın panel hesabı yok. Bazı firmalar paneli hiç
            kullanmıyor; gerekirse{' '}
            <Link href="/yonetim/kullanicilar">Kullanıcılar</Link> sayfasından açın.
          </p>
        ) : (
          <p className="small" style={{ margin: 0 }}>
            {e.kullanici.eposta} — {e.kullanici.aktif ? 'aktif' : 'kapalı'}{' '}
            <Link href="/yonetim/kullanicilar">Kullanıcılar sayfasında yönetin</Link>.
          </p>
        )}
      </section>
    </PanelKabuk>
  );
}
