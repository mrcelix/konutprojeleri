import Link from 'next/link';
import { redirect } from 'next/navigation';
import Icon from '@/components/Icon';
import KayitFormu from '@/components/KayitFormu';
import { aktifKullanici } from '@/lib/auth';
import { googleAcikMi } from '@/lib/google';
import { girisHedefi } from '@/lib/rol';
import { meta } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = meta({
  baslik: 'Hesap açın',
  aciklama: 'Favorilerinizi ve karşılaştırma panolarınızı tek yerde toplayın. Hesap açmak ücretsiz.',
  yol: '/kayit',
  indexle: false,
});

/* ============================================================
   Kayıt sayfası.

   Başlıktaki pencere JavaScript'e bağlı; bu sayfa onun sunucu
   tarafındaki karşılığı. Aynı sunucu eylemini çağırıyor —
   ikinci bir kayıt yolu yok.
   ============================================================ */
export default async function KayitSayfasi() {
  const k = await aktifKullanici();
  if (k) redirect(girisHedefi(k.rol));
  const google = googleAcikMi();

  return (
    <div className="giris-sayfa">
      <div className="giris-kart">
        <Link className="logo" href="/">
          <span className="logo-a">konut</span><span className="logo-b">projeleri</span><span className="dot">.</span>
        </Link>

        <h1 className="h3" style={{ textAlign: 'center', marginBottom: 6 }}>Hesap açın</h1>
        <p className="small muted" style={{ textAlign: 'center', marginBottom: 24 }}>
          Favorilerinizi ve panolarınızı tek yerde toplayın. Firmaysanız panel erişimi
          sonradan tanımlanır.
        </p>

        {google && (
          <>
            <a className="btn btn-outline btn-block google-dugme" href="/api/giris/google">
              Google ile kayıt ol
            </a>
            <div className="giris-ayrac"><span>ya da e-posta ile</span></div>
          </>
        )}

        <KayitFormu />

        <p className="tiny dim" style={{ textAlign: 'center', marginTop: 20 }}>
          Hesabınız var mı?{' '}
          <Link href="/giris">
            Giriş yapın
          </Link>
        </p>

        <p className="tiny dim" style={{ textAlign: 'center', marginTop: 10 }}>
          <Icon n="shield" s={13} /> Hesap açmadan da talep bırakabilir,
          kodunuzla sorgulayabilirsiniz.
        </p>
      </div>
    </div>
  );
}
