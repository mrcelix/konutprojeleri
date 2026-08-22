import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import BasvuruEylem from '@/components/panel/BasvuruEylem';
import { prisma } from '@/lib/db';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

/** Başvuruya bu süre içinde dönülmesi hedefleniyor (form 2 iş günü diyor). */
const HEDEF_GUN = 2;

export default async function YonetimBasvurular(
  { searchParams }: { searchParams: Promise<{ durum?: string }> },
) {
  const b = await yonetimBaglam();
  const { durum } = await searchParams;

  const suzgec = ['YENI', 'GORUSULDU', 'ONAYLANDI', 'REDDEDILDI'].includes(durum ?? '')
    ? durum as 'YENI' | 'GORUSULDU' | 'ONAYLANDI' | 'REDDEDILDI'
    : undefined;

  const basvurular = await prisma.firmaBasvuru.findMany({
    where: suzgec ? { durum: suzgec } : {},
    // Açık başvurular önce: buraya gelme sebebi onlara dönmek
    orderBy: [{ durum: 'asc' }, { olusturma: 'asc' }],
    take: 200,
    select: {
      id: true, durum: true, ad: true, eposta: true, telefon: true,
      bolge: true, projeSayisi: true, mesaj: true, not: true,
      olusturma: true, sonuclanma: true, firmaId: true,
    },
  });

  const sayim = await prisma.firmaBasvuru.groupBy({
    by: ['durum'], _count: { _all: true },
  });
  const adet = (d: string) => sayim.find((s) => s.durum === d)?._count._all ?? 0;

  const simdi = Date.now();
  const gecenGun = (t: Date) => Math.floor((simdi - t.getTime()) / 864e5);
  const acik = basvurular.filter((x) => x.durum === 'YENI' || x.durum === 'GORUSULDU');
  const geciken = acik.filter((x) => gecenGun(x.olusturma) > HEDEF_GUN).length;

  const bag = (d?: string) => `/yonetim/basvurular${d ? `?durum=${d}` : ''}`;

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Firma başvuruları"
      aciklama={`${adet('YENI')} yeni · ${adet('GORUSULDU')} görüşülüyor${geciken ? ` · ${geciken} tanesi ${HEDEF_GUN} günü aştı` : ''}`}
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Form <b>2 iş günü içinde telefonla dönüş</b> sözü veriyor;
          süreyi aşanlar kırmızı görünüyor. <b>Onay</b> firma kaydı
          açıyor ve geri alınamıyor; panel hesabı ayrıca veriliyor
          (Kullanıcılar sayfası).
        </p>
      </div>

      <div className="chips">
        <Link href={bag()} className={'chip' + (!suzgec ? ' on' : '')}>Tümü</Link>
        {([['YENI', 'Yeni'], ['GORUSULDU', 'Görüşülüyor'],
          ['ONAYLANDI', 'Onaylandı'], ['REDDEDILDI', 'Reddedildi']] as const).map(([k, e]) => (
          <Link key={k} href={bag(k)} className={'chip' + (suzgec === k ? ' on' : '')}>
            {e}{adet(k) ? ` (${adet(k)})` : ''}
          </Link>
        ))}
      </div>

      {basvurular.length === 0 ? (
        <div className="kart p-bos" style={{ marginTop: 16 }}>
          <Icon n="users" s={30} />
          <p>{suzgec ? 'Bu durumda başvuru yok.' : 'Henüz başvuru yok.'}</p>
          <Link className="btn btn-ghost btn-sm" href="/ev-sahibi-basvuru" target="_blank">
            Başvuru formunu gör <Icon n="arrowR" s={14} />
          </Link>
        </div>
      ) : (
        <div className="p-tablo-kap" style={{ marginTop: 16 }}>
          <table className="p-tablo">
            <thead>
              <tr>
                <th>Başvuran</th><th>Proje</th><th>Durum</th>
                <th>Süre</th><th>Not</th><th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {basvurular.map((x) => {
                const gun = gecenGun(x.olusturma);
                const gecikti = (x.durum === 'YENI' || x.durum === 'GORUSULDU') && gun > HEDEF_GUN;
                return (
                  <tr key={x.id}>
                    <td>
                      <b style={{ fontSize: 13 }}>{x.ad}</b>
                      <div className="tiny dim">{x.eposta}</div>
                      <div className="tiny dim">{x.telefon}</div>
                    </td>
                    <td className="tiny">
                      {x.bolge}
                      <div className="dim">{x.projeSayisi} proje</div>
                    </td>
                    <td>
                      <span className={`durum durum-${
                        x.durum === 'ONAYLANDI' ? 'YAYINDA'
                          : x.durum === 'REDDEDILDI' ? 'IPTAL'
                            : x.durum === 'GORUSULDU' ? 'TALEP' : 'BEKLIYOR'}`}>
                        {x.durum === 'YENI' ? 'Yeni'
                          : x.durum === 'GORUSULDU' ? 'Görüşülüyor'
                            : x.durum === 'ONAYLANDI' ? 'Onaylandı' : 'Reddedildi'}
                      </span>
                    </td>
                    <td className="tiny">
                      {x.durum === 'YENI' || x.durum === 'GORUSULDU' ? (
                        <span style={gecikti ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
                          {gun}/{HEDEF_GUN} gün
                        </span>
                      ) : (
                        <span className="dim">
                          {x.sonuclanma ? trTarihSaat(x.sonuclanma) : '—'}
                        </span>
                      )}
                    </td>
                    <td className="tiny sarma">
                      {x.mesaj && <div>{x.mesaj}</div>}
                      {x.not && <div className="dim"><b>Not:</b> {x.not}</div>}
                      {x.firmaId && (
                        <Link className="dim" href="/yonetim/firmalar">Firma kaydına git</Link>
                      )}
                      {!x.mesaj && !x.not && !x.firmaId && <span className="dim">—</span>}
                    </td>
                    <td><BasvuruEylem id={x.id} durum={x.durum} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PanelKabuk>
  );
}
