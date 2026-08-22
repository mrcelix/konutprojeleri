import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import ProjeGorseller from '@/components/panel/ProjeGorseller';
import ProjeKimlik from '@/components/panel/ProjeKimlik';
import KontrolRaporuFormu from '@/components/panel/KontrolRaporu';
import ProjeOzellikler from '@/components/panel/ProjeOzellikler';
import YayinDugmesi from '@/components/panel/YayinDugmesi';
import { prisma } from '@/lib/db';
import { depoEksigi } from '@/lib/depo';
import { sonuclariAyikla } from '@/lib/kontrol-kayit';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YonetimProjeDuzenle(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { kullanici, nav, kok } = await yonetimBaglam();

  const [proje, bolgeler, firmalar, ozellikler] = await Promise.all([
    prisma.proje.findUnique({
      where: { id },
      select: {
        id: true, slug: true, ad: true, bolgeId: true, firmaId: true,
        mahalle: true, adres: true, lat: true, lng: true, yayinda: true,
        tip: true, durum: true,
        medya: {
          select: { id: true, url: true, alt: true, sira: true, tip: true, altOtomatik: true },
          orderBy: { sira: 'asc' },
        },
        ozellikler: { select: { ozellik: { select: { kod: true } } } },
        eskiSluglar: { select: { slug: true }, orderBy: { olusturma: 'desc' } },
        kontrol: {
          select: {
            ziyaret: true, kontrolEden: true, ozet: true, yayinda: true, sonuclar: true,
          },
        },
        _count: { select: { talepler: true, daireTipleri: true } },
      },
    }),
    prisma.bolge.findMany({ orderBy: { sira: 'asc' }, select: { id: true, ad: true, il: true } }),
    prisma.firma.findMany({
      orderBy: { ad: 'asc' },
      select: { id: true, ad: true, _count: { select: { projeler: true } } },
    }),
    prisma.ozellik.findMany({ orderBy: { sira: 'asc' }, select: { kod: true, ad: true } }),
  ]);

  if (!proje) notFound();

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik={proje.ad}
      aciklama={`/proje/${proje.slug} · ${proje.medya.length} görsel · `
        + `${proje._count.daireTipleri} daire tipi · ${proje._count.talepler} talep`}
      eylem={(
        <>
          <YayinDugmesi projeId={proje.id} yayinda={proje.yayinda} projeAd={proje.ad} />
          <Link className="btn btn-quiet btn-sm" href={`/proje/${proje.slug}`} target="_blank">
            Sayfayı gör <Icon n="arrowR" s={14} />
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/yonetim/projeler">
            <Icon n="chevL" s={15} /> Projeler
          </Link>
        </>
      )}
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Fiyat, ödeme koşulları, teslim tarihi ve daire tipleri{' '}
          <Link href={`/panel/projeler?v=${proje.slug}`}>firma panelinden</Link>{' '}
          düzenleniyor — firma da oradan değiştirebiliyor. Bu sayfadaki
          alanlar yalnızca yönetime açık: kimlik, konum, görseller,
          özellikler ve yerinde inceleme raporu.
        </p>
      </div>

      <ProjeKimlik
        proje={{
          id: proje.id, ad: proje.ad, slug: proje.slug,
          bolgeId: proje.bolgeId, firmaId: proje.firmaId,
          mahalle: proje.mahalle, adres: proje.adres,
          lat: proje.lat, lng: proje.lng, tip: proje.tip, yayinda: proje.yayinda,
        }}
        bolgeler={bolgeler.map((b) => ({ id: b.id, ad: b.ad, alt: b.il }))}
        firmalar={firmalar.map((e) => ({
          id: e.id, ad: e.ad, alt: `${e._count.projeler} proje`,
        }))}
      />

      {proje.eskiSluglar.length > 0 && (
        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">Eski adresler</h2>
          <p className="muted small" style={{ margin: '6px 0 10px' }}>
            Bu adresler kalıcı olarak (308) <code>/proje/{proje.slug}</code>{' '}
            adresine yönlendiriliyor. Kayıt silinmiyor: bir kez yayınlanmış
            adres ömür boyu çözülebilmeli.
          </p>
          <ul className="tiny muted" style={{ paddingLeft: 18 }}>
            {proje.eskiSluglar.map((s) => <li key={s.slug}><code>/proje/{s.slug}</code></li>)}
          </ul>
        </section>
      )}

      <div style={{ marginTop: 16 }}>
        <ProjeGorseller projeId={proje.id} fotograflar={proje.medya} depoEksik={depoEksigi()} />
      </div>

      <div style={{ marginTop: 16 }}>
        {/* KONTROL RAPORU: ekibin şantiyede gördüğü şeyin kaydı.
          "Her proje yerinde incelendi" cümlesi güven şeridinde bir
          vaatti; rapor onu tarihli ve maddeli bir kanıta çeviriyor. */}
      <section className="p-kart" style={{ marginTop: 16 }}>
        <h2 className="p-kart-bas">Yerinde inceleme raporu</h2>
        <KontrolRaporuFormu
          projeId={proje.id}
          rapor={proje.kontrol ? {
            ziyaret: proje.kontrol.ziyaret.toISOString().slice(0, 10),
            kontrolEden: proje.kontrol.kontrolEden,
            ozet: proje.kontrol.ozet ?? '',
            yayinda: proje.kontrol.yayinda,
            sonuclar: sonuclariAyikla(proje.kontrol.sonuclar),
          } : null}
        />
      </section>

      <ProjeOzellikler
          projeId={proje.id}
          ozellikler={ozellikler}
          secili={proje.ozellikler.map((o) => o.ozellik.kod)}
        />
      </div>
    </PanelKabuk>
  );
}
