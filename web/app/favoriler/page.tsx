import FavoriListesi from '@/components/FavoriListesi';
import { getProjeler } from '@/lib/queries';
import { meta } from '@/lib/seo';

/* ============================================================
   Favorilerim.

   Başlıktaki kalp önceden yalnızca "Favorileriniz: 3 proje" diyen
   bir bildirim gösteriyordu: sayıyı söyleyip hangileri olduğunu
   söylemiyordu. Sayfa, işaretlenen projeleri arama sonuçlarıyla
   aynı kartlarda listeliyor.

   Kimlikler tarayıcıda tutulduğu için liste istemcide kuruluyor
   (`FavoriListesi`); sunucu yalnızca yayındaki projeleri veriyor.
   Arama motoruna kapalı: her ziyaretçide farklı bir içerik.

   SATILIK İLANLAR DA GELİYOR. Sayfa yalnızca kiralık envanteri
   okuyordu; satılık ilanın detay sayfasında da "Kaydet" düğmesi var
   ve işaretlenen ilan burada hiç görünmüyordu — kalp doluyor, liste
   boş kalıyordu. Sessiz kayıp, en kötü hata türü: kullanıcı bir şey
   yaptığını sanıyor.
   ============================================================ */

export const metadata = meta({
  baslik: 'Favorilerim',
  aciklama: 'Beğenip kaydettiğiniz projeler.',
  yol: '/favoriler',
  indexle: false,
});

export default async function FavorilerSayfasi() {
  const projeler = await getProjeler();

  return (
    <section className="section">
      <div className="wrap">
        <h1 className="h2">Favorilerim</h1>
        <p className="muted" style={{ marginTop: 6, marginBottom: 20 }}>
          Kalbe dokunduğunuz projeler burada birikiyor.
        </p>
        <FavoriListesi projeler={projeler} />
      </div>
    </section>
  );
}
