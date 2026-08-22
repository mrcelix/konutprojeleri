import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import BolgeDuzenle from '@/components/panel/BolgeDuzenle';
import BolgeEkle from '@/components/panel/BolgeEkle';
import SilmeOnay from '@/components/panel/SilmeOnay';
import SiraTasi from '@/components/panel/SiraTasi';
import { prisma } from '@/lib/db';
import { TL } from '@/lib/bicim';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YonetimBolgeler(
  { searchParams }: { searchParams: Promise<{ b?: string }> },
) {
  const b = await yonetimBaglam();
  const { b: seciliSlug } = await searchParams;

  const [bolgeler, ozellikler] = await Promise.all([
    prisma.bolge.findMany({
      orderBy: { sira: 'asc' },
      select: {
        id: true, slug: true, ad: true, il: true, ozet: true, adet: true, yayinda: true,
        _count: { select: { projeler: true, sss: true } },
        projeler: { select: { fiyatMin: true, yayinda: true } },
        /* SSS satırları düzenleme formuna metin olarak gidiyor. */
        sss: { orderBy: { sira: 'asc' }, select: { soru: true, cevap: true } },
      },
    }),
    prisma.ozellik.findMany({
      orderBy: { sira: 'asc' },
      select: {
        kod: true, ad: true, landingSlug: true, landingBaslik: true,
        _count: { select: { projeler: true } },
      },
    }),
  ]);

  const secili = bolgeler.find((x) => x.slug === seciliSlug) ?? null;
  const inisSayfasi = ozellikler.filter((o) => o.landingSlug);

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Bölgeler & içerik"
      aciklama={`${bolgeler.length} bölge · ${inisSayfasi.length} proje tipi iniş sayfası`}
    >
      <section className="kart" style={{ marginBottom: 16 }}>
        <BolgeEkle />
      </section>

      <div className="p-tablo-kap">
        <table className="p-tablo">
          <thead>
            <tr>
              <th>Bölge</th><th>İl</th>
              <th className="sayi">Proje</th><th className="sayi">Yayında</th>
              <th className="sayi">En düşük</th><th className="sayi">SSS</th>
              <th>Durum</th><th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {bolgeler.map((x) => {
              const yayindaProje = x.projeler.filter((v) => v.yayinda);
              const enDusuk = yayindaProje.length ? Math.min(...yayindaProje.map((v) => v.fiyatMin)) : 0;
              return (
                <tr key={x.id}>
                  <td>
                    <b style={{ fontSize: 13.4 }}>{x.ad}</b>
                    <div className="tiny dim">/proje-kiralama/{x.slug}</div>
                  </td>
                  <td className="muted">{x.il}</td>
                  <td className="sayi">{x._count.projeler}</td>
                  <td className="sayi">{yayindaProje.length}</td>
                  <td className="sayi">{enDusuk ? TL(enDusuk) : '—'}</td>
                  <td className="sayi">{x._count.sss}</td>
                  <td>
                    <span className={`durum durum-${x.yayinda ? 'YAYINDA' : 'PASIF'}`}>
                      {x.yayinda ? 'Yayında' : 'Pasif'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {/* Sıra; ana sayfadaki bölge ızgarasının, altbilgi
                          bağlantılarının ve /bolgeler hub'ının dizilişi. */}
                      <SiraTasi id={x.id} />
                      <Link className="btn btn-ghost btn-sm" href={`/yonetim/bolgeler?b=${x.slug}`}>
                        <Icon n="sliders" s={14} /> Düzenle
                      </Link>
                      <Link className="btn btn-quiet btn-sm" href={`/proje-kiralama/${x.slug}`} target="_blank">
                        <Icon n="arrowR" s={14} />
                      </Link>
                    </div>
                    {/* Silme ayrı satırda: aynı hizada duran bir "Sil",
                        "Düzenle"ye giderken yanlışlıkla tıklanıyor. */}
                    <div style={{ marginTop: 6 }}>
                      <SilmeOnay tur="bolge" id={x.id} ad={x.ad} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {secili && (
        <section className="kart">
          <div className="kart-bas">
            <div>
              <h2>{secili.ad} içeriği</h2>
              <p>Giriş paragrafları, mevkiler ve SSS gibi uzun içerik kod tarafında tutuluyor; buradan özet ve yayın durumu düzenlenir.</p>
            </div>
            <Link className="btn btn-ghost btn-sm" href="/yonetim/bolgeler">Kapat</Link>
          </div>
          <BolgeDuzenle
            bolge={{
              ...secili,
              sss: secili.sss.map((x) => `${x.soru} | ${x.cevap}`).join('\n'),
            }}
          />
        </section>
      )}

      <section className="kart">
        <div className="kart-bas">
          <div>
            <h2>Proje tipleri (SEO iniş sayfaları)</h2>
            <p>Her tip, sonucu olan her bölge için ayrı bir iniş sayfası üretir.</p>
          </div>
        </div>
        <div className="p-tablo-kap" style={{ border: 0 }}>
          <table className="p-tablo">
            <thead>
              <tr><th>Özellik</th><th>İniş başlığı</th><th>Slug</th><th className="sayi">Proje</th></tr>
            </thead>
            <tbody>
              {inisSayfasi.map((o) => (
                <tr key={o.kod}>
                  <td><b style={{ fontSize: 13.4 }}>{o.ad}</b><div className="tiny dim">{o.kod}</div></td>
                  <td className="muted">{o.landingBaslik}</td>
                  <td className="tiny dim">/{o.landingSlug}</td>
                  <td className="sayi">{o._count.projeler}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="tiny dim" style={{ marginTop: 14 }}>
          Filtre olarak kullanılan ama iniş sayfası olmayan {ozellikler.length - inisSayfasi.length} özellik daha var
          (Wi-Fi, klima, barbekü gibi).
        </p>
      </section>
    </PanelKabuk>
  );
}
