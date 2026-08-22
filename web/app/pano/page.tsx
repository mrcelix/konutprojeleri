import Link from 'next/link';
import { redirect } from 'next/navigation';
import Icon from '@/components/Icon';
import { TLkisa } from '@/lib/bicim';
import { panolarim } from '@/lib/pano';
import { panoOlustur } from '@/lib/pano-eylemler';
import { meta } from '@/lib/seo';

/* ============================================================
   Panolarım + yeni pano.

   Pano anonim kimliğe (çereze) bağlı: giriş yapmadan kurulan bir
   panonun sahibi, aynı tarayıcıdan geldiğinde onu burada buluyor.
   Bağlantıyı kaybetmemenin tek yolu bu — hesap zorunlu olsaydı
   paylaşımın önüne bir kayıt ekranı koymuş olurduk.
   ============================================================ */

export const dynamic = 'force-dynamic';

export const metadata = meta({
  baslik: 'Karşılaştırma panolarım',
  aciklama: 'Beğendiğiniz projeleri tek panoda toplayın, bağlantısını paylaşın, '
    + 'ailenizle birlikte oylayın. Hesap açmadan çalışıyor.',
  yol: '/pano',
  indexle: false,
});

async function yeniPano(form: FormData) {
  'use server';
  const s = await panoOlustur(form);
  if (s.kod) redirect(`/pano/${s.kod}`);
}

const trGun = (d: Date) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

export default async function PanolarimSayfa() {
  const liste = await panolarim();

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <header className="section-head" style={{ marginTop: 22 }}>
        <div>
          <h1 className="h1">Seyahat panoları</h1>
          <p>
            Beğendiğiniz projeleri bir panoda toplayın, bağlantısını paylaşın;
            arkadaşlarınız <b>giriş yapmadan</b> oy versin ve not bıraksın.
          </p>
        </div>
      </header>

      <form className="pano-yeni" action={yeniPano}>
        <label>
          <span>Pano adı</span>
          <input type="text" name="ad" placeholder="Ağustos — kalabalık grup" maxLength={60} required />
        </label>
        <label>
          <span>Giriş</span>
          <input type="date" name="giris" />
        </label>
        <label>
          <span>Çıkış</span>
          <input type="date" name="cikis" />
        </label>
        <label>
          <span>Kişi</span>
          <input type="number" name="kisi" min={0} max={30} placeholder="8" />
        </label>
        <button className="btn btn-primary" type="submit">
          <Icon n="plus" s={16} sw={2.4} /> Pano oluştur
        </button>
      </form>

      {liste.length === 0 ? (
        <div className="empty" style={{ marginTop: 18 }}>
          <h2 className="h3">Henüz panonuz yok</h2>
          <p className="muted" style={{ margin: '8px 0 18px' }}>
            Yukarıdan bir pano açın; sonra proje sayfalarındaki
            <b> Panoya ekle</b> düğmesiyle doldurun.
          </p>
          <Link className="btn btn-primary" href="/arama">Projelere göz at</Link>
        </div>
      ) : (
        <div className="pano-liste">
          {liste.map((p) => (
            <Link className="pano-satir" key={p.kod} href={`/pano/${p.kod}`}>
              <span className="pano-satir-ad">
                <b>{p.ad}</b>
                <small>
                  {p._count.ogeler} proje
                  {p.butceMax && <> · {TLkisa(p.butceMax)}’ye kadar</>}
                </small>
              </span>
              <Icon n="chevR" s={16} sw={2.2} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
