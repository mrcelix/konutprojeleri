import IkinciAsama from '@/components/panel/IkinciAsama';
import PanelKabuk from '@/components/panel/PanelKabuk';
import EngelYonetim from '@/components/panel/EngelYonetim';
import { engelOzeti } from '@/lib/bildirim/engel';
import { prisma } from '@/lib/db';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

const SEBEP_AD: Record<string, string> = {
  KALICI_HATA: 'Kalıcı hata',
  SIKAYET: 'Spam şikâyeti',
  ABONELIKTEN_CIKMA: 'Listeden çıktı',
  ELLE: 'Elle eklendi',
};

export default async function YonetimGuvenlik() {
  const { kullanici, nav, kok } = await yonetimBaglam();

  const [ben, engel, iki, toplamKullanici] = await Promise.all([
    prisma.kullanici.findUnique({
      where: { id: kullanici.id },
      select: { totpAktif: true, yedekKodlar: true },
    }),
    engelOzeti(60),
    prisma.kullanici.count({ where: { totpAktif: true, aktif: true } }),
    prisma.kullanici.count({ where: { aktif: true } }),
  ]);

  const sonBasarisiz = await prisma.denetimKaydi.findMany({
    where: { eylem: { in: ['giris.basarisiz', 'giris.ikinci_asama_basarisiz'] } },
    orderBy: { olusturma: 'desc' },
    take: 12,
  });

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Güvenlik"
      aciklama="Kendi hesabınız, gönderim engelleri ve başarısız giriş denemeleri"
    >
      <div className="kpi-izgara">
        <div className="kpi-kart">
          <span className="kpi-etiket">2FA açık hesap</span>
          <b className="kpi-deger">{iki} / {toplamKullanici}</b>
          {iki < toplamKullanici && (
            <span className="kpi-alt" style={{ color: 'var(--danger)' }}>
              {toplamKullanici - iki} hesap korumasız
            </span>
          )}
        </div>
        <div className="kpi-kart">
          <span className="kpi-etiket">Engelli adres</span>
          <b className="kpi-deger">{engel.toplam}</b>
        </div>
        <div className="kpi-kart">
          <span className="kpi-etiket">Şikâyet</span>
          <b className="kpi-deger">
            {engel.kirilim.filter((k) => k.sebep === 'SIKAYET').reduce((t, k) => t + k._count, 0)}
          </b>
          <span className="kpi-alt">alan adı itibarını etkiler</span>
        </div>
        <div className="kpi-kart">
          <span className="kpi-etiket">Başarısız giriş</span>
          <b className="kpi-deger">{sonBasarisiz.length}</b>
          <span className="kpi-alt">son kayıtlar</span>
        </div>
      </div>

      <IkinciAsama aktif={ben?.totpAktif ?? false} kalanYedek={ben?.yedekKodlar.length ?? 0} />

      <section className="p-kart" style={{ marginTop: 16 }}>
        <h3 className="h3">Gönderim engelleri</h3>
        <p className="muted small" style={{ margin: '6px 0 12px' }}>
          Bu adreslere bildirim gönderilmiyor. Ölü adreslere ısrarla göndermek
          sağlayıcı nezdinde bounce oranı olarak birikir ve belli bir eşiğin
          üstünde hesap askıya alınır. Engeli yalnızca adresin düzeldiğinden
          eminseniz kaldırın.
        </p>
        <EngelYonetim kayitlar={engel.sonKayitlar.map((e) => ({
          id: e.id, kanal: e.kanal, adres: e.adres,
          sebep: SEBEP_AD[e.sebep] ?? e.sebep, sebepKod: e.sebep,
          detay: e.detay, kaynak: e.kaynak,
          tarih: e.olusturma.toLocaleDateString('tr-TR'),
        }))} />
      </section>

      <section className="p-kart" style={{ marginTop: 16 }}>
        <h3 className="h3">Son başarısız giriş denemeleri</h3>
        <div className="tablo-sar">
          <table className="p-tablo">
            <thead><tr><th>Tarih</th><th>Olay</th><th>IP</th><th>Detay</th></tr></thead>
            <tbody>
              {sonBasarisiz.map((d) => (
                <tr key={d.id}>
                  <td>{d.olusturma.toLocaleString('tr-TR')}</td>
                  <td>{d.eylem === 'giris.basarisiz' ? 'Parola hatalı' : 'İkinci aşama hatalı'}</td>
                  <td>{d.ip ?? '—'}</td>
                  <td className="dim tiny">{d.detay ? JSON.stringify(d.detay) : '—'}</td>
                </tr>
              ))}
              {sonBasarisiz.length === 0 && (
                <tr><td colSpan={4} className="p-tablo-bos">Kayıt yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PanelKabuk>
  );
}
