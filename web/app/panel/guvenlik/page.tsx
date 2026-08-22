import IkinciAsama from '@/components/panel/IkinciAsama';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { hesapBaglam } from '@/lib/panel-baglam';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function GuvenlikSayfasi() {
  const { kullanici, nav, kok } = await hesapBaglam();

  const k = await prisma.kullanici.findUnique({
    where: { id: kullanici.id },
    select: { totpAktif: true, yedekKodlar: true, sonGiris: true },
  });

  const oturumlar = await prisma.oturum.findMany({
    where: { kullaniciId: kullanici.id, sonKullanma: { gt: new Date() }, dogrulamaBekliyor: false },
    orderBy: { olusturma: 'desc' },
    take: 10,
  });

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Güvenlik"
      aciklama="Hesabınızın korunması ve açık oturumlar"
    >
      <IkinciAsama aktif={k?.totpAktif ?? false} kalanYedek={k?.yedekKodlar.length ?? 0} />

      <section className="p-kart" style={{ marginTop: 16 }}>
        <h3 className="h3">Açık oturumlar</h3>
        <p className="muted small" style={{ margin: '6px 0 12px' }}>
          Tanımadığınız bir oturum görürseniz parolanızı hemen değiştirin —
          parola değişikliği tüm oturumları düşürür.
        </p>
        <div className="tablo-sar">
          <table className="p-tablo">
            <thead>
              <tr><th>Başlangıç</th><th>IP</th><th>Tarayıcı</th><th>Bitiş</th></tr>
            </thead>
            <tbody>
              {oturumlar.map((o) => (
                <tr key={o.id}>
                  <td>{o.olusturma.toLocaleString('tr-TR')}</td>
                  <td>{o.ip ?? '—'}</td>
                  <td className="dim tiny" style={{ maxWidth: 320 }}>{o.tarayici ?? '—'}</td>
                  <td>{o.sonKullanma.toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
              {oturumlar.length === 0 && (
                <tr><td colSpan={4} className="dim">Açık oturum yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PanelKabuk>
  );
}
