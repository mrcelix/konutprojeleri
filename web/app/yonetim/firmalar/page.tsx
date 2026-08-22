import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { prisma } from '@/lib/db';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YonetimFirmalar() {
  const b = await yonetimBaglam();

  const firmalar = await prisma.firma.findMany({
    orderBy: { ad: 'asc' },
    select: {
      id: true, slug: true, ad: true, eposta: true, telefon: true, web: true,
      kurulusYili: true, tamamlananProje: true, yayinda: true,
      kullanici: { select: { id: true, aktif: true } },
      _count: { select: { projeler: true } },
    },
  });

  const yayindaSayilari = await prisma.proje.groupBy({
    by: ['firmaId'],
    where: { yayinda: true },
    _count: { _all: true },
  });
  const yayinda = new Map(yayindaSayilari.map((y) => [y.firmaId, y._count._all]));

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Firmalar"
      aciklama={`${firmalar.length} firma · ${firmalar.filter((e) => e.kullanici).length} panel hesabı`}
      eylem={(
        <Link className="btn btn-primary btn-sm" href="/yonetim/firmalar/yeni">
          <Icon n="plus" s={15} sw={2.2} /> Yeni firma
        </Link>
      )}
    >
      {firmalar.length === 0 ? (
        <div className="kart p-bos">
          <Icon n="users" s={30} />
          <p>Henüz firma kaydı yok. Proje eklemek için önce bir firma açın.</p>
          <Link className="btn btn-primary btn-sm" href="/yonetim/firmalar/yeni">
            Firma ekle
          </Link>
        </div>
      ) : (
        <div className="p-tablo-kap">
          <table className="p-tablo">
            <thead>
              <tr>
                <th>Firma</th><th>İletişim</th>
                <th className="sayi">Proje</th><th className="sayi">Teslim</th>
                <th>Panel hesabı</th><th>Sayfa</th><th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {firmalar.map((e) => (
                <tr key={e.id}>
                  <td>
                    <b style={{ fontSize: 13.4 }}>{e.ad}</b>
                    <div className="tiny dim">
                      {e.kurulusYili ? `${e.kurulusYili}’den beri` : 'kuruluş yılı girilmemiş'}
                    </div>
                  </td>
                  <td className="tiny muted">
                    {e.eposta ?? <span className="dim">e-posta yok</span>}
                    <div className="dim">{e.telefon ?? 'telefon yok'}</div>
                  </td>
                  <td className="sayi">
                    {e._count.projeler}
                    <div className="tiny dim">{yayinda.get(e.id) ?? 0} yayında</div>
                  </td>
                  {/* TESLİM ETTİĞİ proje sayısı firmanın BEYANI ve sitede
                      alıcının en çok baktığı sayı. Sıfırsa kart bu satırı
                      hiç basmıyor; listede eksik olduğu görünsün diye
                      burada uyarı olarak duruyor. */}
                  <td className="sayi">
                    {e.tamamlananProje > 0
                      ? e.tamamlananProje
                      : <span className="tiny dim">girilmemiş</span>}
                  </td>
                  <td>
                    {e.kullanici ? (
                      <span className={`durum durum-${e.kullanici.aktif ? 'YAYINDA' : 'PASIF'}`}>
                        {e.kullanici.aktif ? 'Aktif' : 'Kapalı'}
                      </span>
                    ) : <span className="tiny dim">yok</span>}
                  </td>
                  <td>
                    <span className={`durum durum-${e.yayinda ? 'YAYINDA' : 'PASIF'}`}>
                      {e.yayinda ? 'Yayında' : 'Kapalı'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Link className="btn btn-primary btn-sm" href={`/yonetim/firmalar/${e.id}`}>
                        Düzenle
                      </Link>
                      <Link className="btn btn-ghost btn-sm"
                        href={`/yonetim/projeler?firma=${e.id}`}>
                        Projeleri
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelKabuk>
  );
}
