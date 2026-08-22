import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { KategoriEkle, KategoriSatirEylem } from '@/components/panel/KategoriEylem';
import { prisma } from '@/lib/db';
import { yonetimBaglam } from '@/lib/panel-baglam';
import type { IkonAdi } from '@/lib/types';

export const dynamic = 'force-dynamic';

/* ============================================================
   Kategoriler (özellikler).

   Tek bir tablo üç yeri birden besliyor: arama filtreleri, proje
   kartındaki etiketler ve `/projeler/<bölge>/<kategori>` iniş
   sayfaları. Panelden yönetilmiyordu — yeni bir kategori açmak kod
   değişikliği ve dağıtım gerektiriyordu.

   Sıra burada gerçek bir ayar: filtre listesinin, ana sayfadaki tema
   ızgarasının ve iniş sayfası bağlantılarının dizilişi bu alandan
   geliyor.
   ============================================================ */
export default async function KategorilerSayfasi() {
  const b = await yonetimBaglam();
  const satirlar = await prisma.ozellik.findMany({
    orderBy: { sira: 'asc' },
    select: {
      id: true, kod: true, ad: true, ikon: true, sira: true,
      landingSlug: true, landingBaslik: true, landingAciklama: true,
      _count: { select: { projeler: true } },
    },
  });

  const inisSayisi = satirlar.filter((s) => s.landingSlug).length;
  const bolgeSayisi = await prisma.bolge.count({ where: { yayinda: true } });

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Kategoriler"
      aciklama={`${satirlar.length} kategori · ${inisSayisi} tanesi iniş sayfası üretiyor`}
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Kategoriler arama filtrelerini, proje kartındaki etiketleri ve
          <b> iniş sayfalarını</b> birden besliyor. İniş sayfası açık olan her
          kategori, sonuç veren her bölgede bir sayfa üretiyor — şu an
          <b> {inisSayisi} × {bolgeSayisi}</b> kombinasyona kadar. Sıra;
          filtre listesinin ve ana sayfadaki tema ızgarasının dizilişi.
        </p>
      </div>

      <div style={{ marginBottom: 18 }}><KategoriEkle /></div>

      <div className="p-tablo-kap">
        <table className="p-tablo">
          <thead>
            <tr>
              <th style={{ width: 46 }}>Sıra</th>
              <th>Kategori</th>
              <th>Kod</th>
              <th>İniş sayfası</th>
              <th className="sayi">Villa</th>
              <th style={{ width: 300 }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 && (
              <tr><td colSpan={6} className="p-tablo-bos">Henüz kategori yok.</td></tr>
            )}
            {satirlar.map((s, i) => (
              <tr key={s.id}>
                <td className="dim tiny">{i + 1}</td>
                <td>
                  <span className="kategori-ad">
                    <i><Icon n={s.ikon as IkonAdi} s={16} /></i>
                    <b>{s.ad}</b>
                  </span>
                </td>
                <td><code className="tiny">{s.kod}</code></td>
                <td>
                  {s.landingSlug
                    ? (
                      <a href={`/villa-kiralama/kas/${s.landingSlug}`} target="_blank" rel="noreferrer"
                        className="tiny">
                        /{s.landingSlug}
                      </a>
                    )
                    : <span className="tiny dim">—</span>}
                </td>
                <td className="sayi">{s._count.projeler}</td>
                <td><KategoriSatirEylem satir={{
                  id: s.id, kod: s.kod, ad: s.ad, ikon: s.ikon,
                  landingSlug: s.landingSlug, landingBaslik: s.landingBaslik,
                  landingAciklama: s.landingAciklama, projeSayisi: s._count.projeler,
                }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="tiny dim" style={{ marginTop: 14 }}>
        <Icon n="shield" s={13} /> Kod sonradan değiştirilemiyor: projelera bağlı ve
        iniş sayfası adresleri ondan üretiliyor. Villaya bağlı bir kategori silinemiyor —
        silmek o projelerın etiketlerini sessizce yok ederdi.
      </p>
    </PanelKabuk>
  );
}
