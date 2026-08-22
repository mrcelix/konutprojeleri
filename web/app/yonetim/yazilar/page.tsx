import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import YaziDuzenle, { YaziEylem } from '@/components/panel/YaziDuzenle';
import { prisma } from '@/lib/db';
import { govdeMetne } from '@/lib/icerik';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';
import { yaziListesi } from '@/lib/yazi';
import type { GovdeBlogu } from '@/lib/icerik-bicim';

export const dynamic = 'force-dynamic';

export default async function YonetimYazilar(
  { searchParams }: { searchParams: Promise<{ id?: string }> },
) {
  const { kullanici, nav, kok } = await yonetimBaglam();
  const { id } = await searchParams;

  const [liste, bolgeler] = await Promise.all([
    yaziListesi(),
    prisma.bolge.findMany({ where: { yayinda: true }, orderBy: { ad: 'asc' }, select: { id: true, ad: true } }),
  ]);

  const duzenlenen = id
    ? await prisma.yazi.findUnique({
      where: { id },
      select: {
        id: true, slug: true, baslik: true, ozet: true, kapak: true,
        yazar: true, bolgeId: true, yayinda: true, govde: true,
      },
    })
    : null;

  const yayinda = liste.filter((y) => y.yayinda).length;

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Rehber yazıları"
      aciklama={`${yayinda} yayında · ${liste.length - yayinda} taslak`}
      eylem={
        duzenlenen
          ? (
            <Link className="btn btn-ghost btn-sm" href="/yonetim/yazilar">
              <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
                <Icon n="arrowR" s={15} />
              </span>
              Liste
            </Link>
          )
          : <Link className="btn btn-ghost btn-sm" href="/rehber">Rehberi gör</Link>
      }
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          İniş sayfaları “Kaş villa kiralama” gibi <b>işlem</b> niyetli aramaları
          karşılıyor. Rehber yazıları “Kaş’ta ne yenir” gibi <b>araştırma</b>
          niyetli aramalar için. Yazıyı bir bölgeye bağlarsanız o bölgenin
          iniş sayfasında da görünür ve yazıdan bölgenin projelerına bağlantı
          verilir.
        </p>
      </div>

      <section className="kart" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 12px' }}>
          {duzenlenen ? `Düzenle: ${duzenlenen.baslik}` : 'Yeni yazı'}
        </h2>
        <YaziDuzenle
          bolgeler={bolgeler}
          y={duzenlenen
            ? {
              id: duzenlenen.id, slug: duzenlenen.slug, baslik: duzenlenen.baslik,
              ozet: duzenlenen.ozet, kapak: duzenlenen.kapak, yazar: duzenlenen.yazar,
              bolgeId: duzenlenen.bolgeId, yayinda: duzenlenen.yayinda,
              govdeMetni: govdeMetne(Array.isArray(duzenlenen.govde) ? duzenlenen.govde as GovdeBlogu[] : []),
            }
            : undefined}
        />
      </section>

      <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 10px' }}>Yazılar</h2>

      {liste.length === 0 ? (
        <div className="p-bos">
          <Icon n="grid" s={26} />
          <p>Henüz yazı yok.</p>
        </div>
      ) : (
        <div className="p-tablo-kap">
          <table className="p-tablo">
            <thead>
              <tr><th>Yazı</th><th>Bölge</th><th>Durum</th><th>İşlem</th></tr>
            </thead>
            <tbody>
              {liste.map((y) => (
                <tr key={y.id}>
                  <td>
                    <b style={{ fontSize: 13 }}>{y.baslik}</b>
                    <div className="tiny dim">/rehber/{y.slug} · {y.okumaDk} dk</div>
                    <div className="tiny dim">{trTarihSaat(y.yayinTarihi)}</div>
                  </td>
                  <td className="tiny">{y.bolge?.ad ?? <span className="dim">—</span>}</td>
                  <td>
                    <span className={'badge' + (y.yayinda ? ' badge-instant' : '')}>
                      {y.yayinda ? 'Yayında' : 'Taslak'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <Link className="btn btn-primary btn-sm" href={`/yonetim/yazilar?id=${y.id}`}>
                        Düzenle
                      </Link>
                      <YaziEylem id={y.id} yayinda={y.yayinda} />
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
