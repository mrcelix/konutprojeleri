import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { KullaniciEkle, KullaniciEylem } from '@/components/panel/KullaniciYonetim';
import { prisma } from '@/lib/db';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YonetimKullanicilar() {
  const b = await yonetimBaglam();

  const [kullanicilar, evSahipleri] = await Promise.all([
    prisma.kullanici.findMany({
      orderBy: [{ rol: 'asc' }, { ad: 'asc' }],
      select: {
        id: true, ad: true, eposta: true, rol: true, aktif: true, sonGiris: true, olusturma: true,
        firma: { select: { ad: true, _count: { select: { projeler: true } } } },
        _count: { select: { oturumlar: true } },
      },
    }),
    prisma.firma.findMany({
      orderBy: { ad: 'asc' },
      select: { id: true, ad: true, kullanici: { select: { id: true } } },
    }),
  ]);

  const secenekler = evSahipleri.map((e) => ({ id: e.id, ad: e.ad, bagliMi: !!e.kullanici }));

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Kullanıcılar"
      aciklama={`${kullanicilar.length} hesap · ${kullanicilar.filter((k) => k.aktif).length} aktif`}
    >
      <div className="p-tablo-kap">
        <table className="p-tablo">
          <thead>
            <tr>
              <th>Kullanıcı</th><th>Rol</th><th>Bağlı firma</th>
              <th>Son giriş</th><th className="sayi">Açık oturum</th><th>Durum</th><th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {kullanicilar.map((k) => (
              <tr key={k.id}>
                <td>
                  <b style={{ fontSize: 13.4 }}>{k.ad}</b>
                  <div className="tiny dim">{k.eposta}</div>
                </td>
                <td>
                  <span className="tiny" style={{ fontWeight: 640 }}>
                    {k.rol === 'ADMIN' ? 'Yönetici' : 'Firma'}
                  </span>
                </td>
                <td className="muted">
                  {k.firma
                    ? <>{k.firma.ad}<div className="tiny dim">{k.firma._count.projeler} villa</div></>
                    : <span className="dim">—</span>}
                </td>
                <td className="tiny muted">{k.sonGiris ? trTarihSaat(k.sonGiris) : 'hiç girmedi'}</td>
                <td className="sayi">{k._count.oturumlar}</td>
                <td>
                  <span className={`durum durum-${k.aktif ? 'YAYINDA' : 'PASIF'}`}>
                    {k.aktif ? 'Aktif' : 'Kapalı'}
                  </span>
                </td>
                <td>
                  <KullaniciEylem id={k.id} aktif={k.aktif} kendisiMi={k.id === b.kullanici.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="kart">
        <div className="kart-bas">
          <div>
            <h2>Yeni hesap</h2>
            <p>Geçici parola üretilir ve bir kez gösterilir; kullanıcıya güvenli kanaldan iletin.</p>
          </div>
        </div>
        <KullaniciEkle evSahipleri={secenekler} />
      </section>

      <section className="kart">
        <div className="kart-bas"><div><h2>Güvenlik notları</h2></div></div>
        <div className="prose" style={{ maxWidth: 'none' }}>
          <ul>
            <li>Parolalar <strong>scrypt</strong> ile saklanır; düz metin hiçbir yerde tutulmaz.</li>
            <li>Oturum çerezi httpOnly; veritabanında çerezin kendisi değil <strong>SHA-256 özeti</strong> saklanır.</li>
            <li>Hesap kapatıldığında o kullanıcının <strong>tüm açık oturumları</strong> anında düşer.</li>
            <li>Parola sıfırlama da mevcut oturumları sonlandırır.</li>
            <li>Giriş denemeleri (başarılı ve başarısız) denetim kaydına yazılır.</li>
          </ul>
          <p className="tiny dim" style={{ marginTop: 10 }}>
            Eksik: iki adımlı doğrulama ve parola sıfırlama e-postası. Bildirim altyapısıyla birlikte eklenecek.
          </p>
        </div>
      </section>
    </PanelKabuk>
  );
}
