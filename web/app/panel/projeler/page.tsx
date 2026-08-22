import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import ProjeDuzenle from '@/components/panel/ProjeDuzenle';
import DaireTipYonetim from '@/components/panel/DaireTipYonetim';
import { prisma } from '@/lib/db';
import { DURUM_ADI, TIP_ADI, TLkisa, teslimCeyrek } from '@/lib/bicim';
import { firmaBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

const isoGun = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function PanelProjeler(
  { searchParams }: { searchParams: Promise<{ v?: string }> },
) {
  const b = await firmaBaglam();
  const { v } = await searchParams;

  const projeler = await prisma.proje.findMany({
    where: b.projeIdler ? { id: { in: b.projeIdler } } : {},
    orderBy: { ad: 'asc' },
    select: {
      id: true, slug: true, ad: true, tip: true, durum: true, yayinda: true,
      fiyatMin: true, fiyatMax: true, pesinatOrani: true, taksitAyi: true,
      krediyeUygun: true, takas: true, aidat: true, tapuDurumu: true,
      ilerlemeYuzde: true, baslangicTarihi: true, teslimTarihi: true,
      ozet: true, sec: true, oneCikan: true,
      bolge: { select: { ad: true } },
      medya: { select: { url: true, alt: true }, orderBy: { sira: 'asc' }, take: 1 },
      daireTipleri: {
        orderBy: { sira: 'asc' },
        select: {
          id: true, ad: true, odaSayisi: true, banyo: true, brutM2: true, netM2: true,
          nitelik: true, fiyatMin: true, fiyatMax: true, adet: true, kalanAdet: true,
          katPlaniUrl: true, katPlaniAlt: true, sira: true, yayinda: true,
        },
      },
      _count: { select: { talepler: true, konusmalar: true } },
    },
  });

  if (!projeler.length) {
    return (
      <PanelKabuk kullanici={b.kullanici} nav={b.nav} kok={b.kok} baslik="Projelerim">
        <div className="kart p-bos">
          <Icon n="building" s={30} />
          <p>Hesabınıza bağlı proje yok.</p>
          <Link className="btn btn-ghost btn-sm" href="/firma-basvuru" style={{ marginTop: 12 }}>
            Proje ekleme süreci
          </Link>
        </div>
      </PanelKabuk>
    );
  }

  const secili = v ? projeler.find((x) => x.slug === v) : null;

  /* ---------- Düzenleme görünümü ---------- */
  if (secili) {
    return (
      <PanelKabuk
        kullanici={b.kullanici} nav={b.nav} kok={b.kok}
        baslik={secili.ad}
        aciklama={`${secili.bolge.ad} · ${DURUM_ADI[secili.durum]} · ${secili._count.talepler} talep`}
        eylem={(
          <>
            <Link className="btn btn-ghost btn-sm" href="/panel/projeler">
              <Icon n="chevL" s={15} /> Listeye dön
            </Link>
            <Link className="btn btn-ghost btn-sm" href={`/proje/${secili.slug}`} target="_blank">
              <Icon n="arrowR" s={15} /> Sayfayı gör
            </Link>
          </>
        )}
      >
        <ProjeDuzenle proje={{
          id: secili.id,
          ad: secili.ad,
          fiyatMin: secili.fiyatMin,
          fiyatMax: secili.fiyatMax,
          pesinatOrani: secili.pesinatOrani,
          taksitAyi: secili.taksitAyi,
          krediyeUygun: secili.krediyeUygun,
          takas: secili.takas,
          aidat: secili.aidat,
          tapuDurumu: secili.tapuDurumu,
          durum: secili.durum,
          ilerlemeYuzde: secili.ilerlemeYuzde,
          baslangicTarihi: isoGun(secili.baslangicTarihi),
          teslimTarihi: isoGun(secili.teslimTarihi),
          ozet: secili.ozet,
          sec: secili.sec,
          oneCikan: secili.oneCikan,
          yayinda: secili.yayinda,
        }} />

        {/* Daire tipleri AYNI SAYFADA: ayrı bir ekrana taşımak, fiyat
            güncelleyen kişiyi iki yer arasında gezdiriyordu — ikisi de
            aynı işin parçası. */}
        <DaireTipYonetim projeId={secili.id} tipler={secili.daireTipleri} />
      </PanelKabuk>
    );
  }

  /* ---------- Liste görünümü ---------- */
  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Projelerim"
      aciklama={`${projeler.length} proje · ${projeler.filter((x) => x.yayinda).length} tanesi yayında`}
    >
      <div className="p-tablo-kap">
        <table className="p-tablo">
          <thead>
            <tr>
              <th>Proje</th><th>Bölge</th><th className="sayi">Fiyat</th>
              <th className="sayi">Tip</th><th className="sayi">Talep</th>
              <th>Teslim</th><th>Durum</th><th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {projeler.map((x) => (
              <tr key={x.id}>
                <td>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {x.medya[0] && (
                      <Image src={x.medya[0].url} alt={x.medya[0].alt} width={64} height={48}
                        style={{ borderRadius: 6, objectFit: 'cover', flex: 'none' }} />
                    )}
                    <div>
                      <b style={{ fontSize: 13.6 }}>{x.ad}</b>
                      <div className="tiny dim">{TIP_ADI[x.tip]} · {DURUM_ADI[x.durum]}</div>
                    </div>
                  </div>
                </td>
                <td className="muted">{x.bolge.ad}</td>
                <td className="sayi">
                  <b>{TLkisa(x.fiyatMin)}</b>
                  <div className="tiny dim">
                    {x.fiyatMax && x.fiyatMax > x.fiyatMin ? `– ${TLkisa(x.fiyatMax)}` : 'başlangıç'}
                  </div>
                </td>
                <td className="sayi">
                  {x.daireTipleri.length === 0
                    ? <span className="durum durum-PASIF">yok</span>
                    : x.daireTipleri.length}
                </td>
                <td className="sayi">{x._count.talepler}</td>
                <td className="tiny">
                  {teslimCeyrek(isoGun(x.teslimTarihi) ?? undefined)}
                  {x.ilerlemeYuzde > 0 && <div className="dim">%{x.ilerlemeYuzde}</div>}
                </td>
                <td>
                  <span className={`durum durum-${x.yayinda ? 'YAYINDA' : 'PASIF'}`}>
                    {x.yayinda ? 'Yayında' : 'Pasif'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link className="btn btn-ghost btn-sm" href={`/panel/projeler?v=${x.slug}`}>
                      <Icon n="sliders" s={14} /> Düzenle
                    </Link>
                    <Link className="btn btn-quiet btn-sm" href={`/panel/talepler?proje=${x.slug}`}>
                      <Icon n="phone" s={14} /> Talepler
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="kart">
        <div className="kart-bas">
          <div>
            <h2>Görsel ve olanak değişiklikleri</h2>
            <p>
              Görseller ve olanak listesi ekibimizce yerinde doğrulandığı için
              panelden değiştirilmiyor.
            </p>
          </div>
          <Link className="btn btn-ghost btn-sm" href="/iletisim">
            <Icon n="share" s={15} /> Değişiklik talebi
          </Link>
        </div>
        <p className="small muted">
          Yeni görsel, kat planı veya olanak güncellemesi için destek ekibine
          yazın; ekip projeyi yerinde inceleyip değişikliği uygular. Bu,
          ilanların gerçeği yansıtma güvencesinin bir parçası.
        </p>
      </section>
    </PanelKabuk>
  );
}
