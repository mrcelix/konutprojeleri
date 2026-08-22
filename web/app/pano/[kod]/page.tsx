import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import PanoBaslik from '@/components/PanoBaslik';
import PanoKart from '@/components/PanoKart';
import { panoGetir } from '@/lib/pano';
import { panoNotYaz } from '@/lib/pano-eylemler';
import { meta } from '@/lib/seo';

/* ============================================================
   Seyahat panosu.

   Konut kararı tek kişilik bir iş değil: eş, aile ve "anlayan
   tanıdık" bakıyor ve karar WhatsApp'ta dağılıyordu — kimin hangi
   projeyi beğendiği kayboluyor, konuşulan proje tükendiğinde kimse
   fark etmiyordu.

   Pano bir bağlantı arkasında duruyor. Açan herkes GİRİŞ YAPMADAN
   oy verebiliyor ve not bırakabiliyor; kartlarda panonun tarihleri
   için toplam tutar ve doluluk canlı görünüyor.

   Sayfa indekslenmiyor: pano kişisel bir seçki, arama sonucunda
   çıkmasının kimseye faydası yok.
   ============================================================ */

export const dynamic = 'force-dynamic';

export const metadata = meta({
  baslik: 'Seyahat panosu',
  aciklama: 'Beğendiğiniz projeleri bir panoda toplayın, ailenizle birlikte oylayın.',
  yol: '/pano',
  indexle: false,
});

export default async function PanoSayfa({ params }: { params: Promise<{ kod: string }> }) {
  const { kod } = await params;
  const pano = await panoGetir(kod);
  if (!pano) notFound();

  /* Hâlâ alınabilir projeler: tükenmiş ve teslim edilmiş olanlar
     için talep göndermek satış ekibini de arayan kişiyi de boşa
     çıkarıyor. */
  const alinabilir = pano.ogeler.filter((o) => !o.alinamaz);

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <PanoBaslik
        kod={pano.kod} ad={pano.ad}
        butceMin={pano.butceMin} butceMax={pano.butceMax}
        sahipMi={pano.sahipMi} ogeSayisi={pano.ogeler.length}
      />

      {pano.ogeler.length === 0 ? (
        <div className="empty" style={{ marginTop: 18 }}>
          <h2 className="h3">Pano henüz boş</h2>
          <p className="muted" style={{ margin: '8px 0 18px' }}>
            Proje sayfalarındaki <b>Panoya ekle</b> düğmesiyle beğendiklerinizi
            buraya toplayın, sonra bağlantıyı paylaşın.
          </p>
          <Link className="btn btn-primary" href="/arama">Projelere göz at</Link>
        </div>
      ) : (
        <>
          {/* Oylama bilgisi: panoyu ilk kez açan kişi ne yapacağını
              düğmelere bakarak anlamak zorunda kalmasın. */}
          <p className="pano-bilgi">
            <Icon n="spark" s={15} /> Beğendiklerinizi işaretleyin, not bırakın —
            giriş gerekmiyor. Kartlar en çok beğenilenden sıralanıyor.
          </p>

          <div className="pano-izgara">
            {pano.ogeler.map((o) => (
              <PanoKart key={o.id} kod={pano.kod} oge={o} sahipMi={pano.sahipMi} />
            ))}
          </div>

          <section className="pano-alt">
            <div className="pano-alt-kart">
              <h2 className="h3">Panonun notları</h2>
              {pano.notlar.length === 0 ? (
                <p className="muted small">Henüz not yok. İlk notu siz bırakın.</p>
              ) : (
                <ul className="pano-notlar genel">
                  {pano.notlar.map((n) => (
                    <li key={n.id}><b>{n.ad}:</b> {n.metin}</li>
                  ))}
                </ul>
              )}
              {/* Sunucu eylemi doğrudan bağlanamıyor: `action` void
                  bekliyor, eylem sonuç nesnesi döndürüyor. Sarmalayıcı
                  sonucu yutuyor — sayfa zaten `revalidatePath` ile
                  tazeleniyor ve not listede beliriyor. */}
              <form className="pano-not-form" action={async (f) => { 'use server'; await panoNotYaz(f); }}>
                <input type="hidden" name="kod" value={pano.kod} />
                <input type="text" name="ad" placeholder="Adınız" maxLength={40} aria-label="Adınız" />
                <input type="text" name="metin" placeholder="Bence teslim tarihi bize uymaz…"
                  maxLength={400} required aria-label="Not" />
                <button className="btn btn-primary btn-sm" type="submit">Not bırak</button>
              </form>
            </div>

            {/* TEK FORMDA TOPLU TALEP YOK. Her projenin satış ekibi
                ayrı bir firma; tek forma toplamak, numarayı beş ayrı
                firmaya birden dağıtmak olurdu ve ziyaretçi bunu
                istemediği hâlde onaylamış sayılırdı. Bunun yerine
                kartlardan tek tek gidiliyor. */}
            <div className="pano-alt-kart pano-teklif">
              <h2 className="h3">Sırada ne var?</h2>
              <p className="muted small">
                {alinabilir.length > 0
                  ? `Panoda hâlâ alınabilir ${alinabilir.length} proje var. `
                    + 'Her projenin kartından o projenin satış ekibine talep '
                    + 'gönderebilirsiniz — bilgileriniz yalnızca seçtiğiniz '
                    + 'projenin firmasına iletiliyor.'
                  : 'Panodaki projelerin hepsi tükenmiş ya da teslim edilmiş '
                    + 'görünüyor. Aramaya dönüp yeni projeler ekleyebilirsiniz.'}
              </p>
              <Link className="btn btn-cta btn-block" href="/arama">
                Proje ara <Icon n="arrowR" s={16} />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
