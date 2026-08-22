import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { AdFormu, ParolaFormu } from '@/components/panel/ProfilFormu';
import { prisma } from '@/lib/db';
import { hesapBaglam, trTarihSaat } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

/* ============================================================
   Profil — kullanıcının kendi hesabı.

   Ad ve parola şimdiye kadar yalnızca YÖNETİCİDE değiştirilebiliyordu:
   firma adını düzelttirmek ya da parolasını yenilemek için destek
   istemek zorundaydı, yönetici de geçici parola üretip güvensiz bir
   kanaldan iletiyordu.

   Yönetici de aynı sayfayı kullanıyor; hesap ayarları role göre
   değişmiyor, yalnızca içinde durduğu panel kabuğu değişiyor.
   ============================================================ */
export default async function ProfilSayfasi() {
  /* Kenar menü ROLE GÖRE: hesap sayfası üç rolde de aynı ama içinde
     durduğu panel değil — yönetici profilini açtığında "Firma
     paneli" menüsü çıkıyordu. */
  const { kullanici, nav, kok } = await hesapBaglam();

  const k = await prisma.kullanici.findUnique({
    where: { id: kullanici.id },
    select: { ad: true, eposta: true, rol: true, sonGiris: true, olusturma: true, totpAktif: true },
  });
  if (!k) return null;

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Profil"
      aciklama="Hesap bilgileriniz ve parolanız"
    >
      <section className="p-kart">
        <h3 className="h3">Hesap bilgileri</h3>
        <AdFormu ad={k.ad} eposta={k.eposta} rol={k.rol} />
      </section>

      <section className="p-kart" style={{ marginTop: 16 }}>
        <h3 className="h3">Parola</h3>
        <ParolaFormu />
      </section>

      <section className="p-kart" style={{ marginTop: 16 }}>
        <h3 className="h3">Hesap durumu</h3>
        <div className="tablo-sar">
          <table className="p-tablo">
            <tbody>
              <tr><th scope="row">Son giriş</th><td>{k.sonGiris ? trTarihSaat(k.sonGiris) : '—'}</td></tr>
              <tr><th scope="row">Hesap açılışı</th><td>{trTarihSaat(k.olusturma)}</td></tr>
              <tr>
                <th scope="row">İki aşamalı doğrulama</th>
                <td>
                  {k.totpAktif
                    ? <span className="badge badge-instant"><Icon n="check" s={12} sw={2.4} /> Açık</span>
                    : <span className="tiny dim">Kapalı — Güvenlik sayfasından açabilirsiniz</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </PanelKabuk>
  );
}
