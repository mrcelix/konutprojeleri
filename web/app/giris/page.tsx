import Link from 'next/link';
import { redirect } from 'next/navigation';
import GirisFormu from '@/components/GirisFormu';
import Icon from '@/components/Icon';
import { aktifKullanici } from '@/lib/auth';
import { googleAcikMi } from '@/lib/google';
import { girisHedefi } from '@/lib/rol';
import { meta } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = meta({
  baslik: 'Giriş yap',
  aciklama: 'KonutProjeleri firma ve yönetim paneline giriş.',
  yol: '/giris',
  indexle: false,
});

export default async function GirisSayfasi(
  { searchParams }: { searchParams: Promise<{ google?: string }> },
) {
  const k = await aktifKullanici();
  if (k) redirect(girisHedefi(k.rol));
  const { google: googleHata } = await searchParams;
  const google = googleAcikMi();

  /* Google akışından dönen hatalar KISA ve teknik olmayan: kullanıcı
     "state uyuşmadı" ile ne yapacağını bilemez, yeniden denemesi
     yeterli. Ayrıntı denetim kaydında. */
  const GOOGLE_HATA: Record<string, string> = {
    sinir: 'Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.',
    eksik: 'Google girişi tamamlanamadı, tekrar deneyin.',
    durum: 'Oturum doğrulanamadı, tekrar deneyin.',
    jeton: "Google'dan yanıt alınamadı, tekrar deneyin.",
    dogrulanmamis: 'Google hesabınızın e-postası doğrulanmamış görünüyor.',
    baska: 'Bu e-posta başka bir Google hesabına bağlı.',
    kapali: 'Hesabınız kapatılmış. Destekle iletişime geçin.',
  };

  return (
    <div className="giris-sayfa">
      <div className="giris-kart">
        <Link className="logo" href="/">KonutProjeleri
        </Link>

        <h1 className="h3" style={{ textAlign: 'center', marginBottom: 6 }}>Giriş yap</h1>
        <p className="small muted" style={{ textAlign: 'center', marginBottom: 24 }}>
          Ziyaretçi, firma ve yönetim hesapları aynı kapıdan giriyor.
        </p>

        {googleHata && (
          <p className="form-hata" role="alert" style={{ marginBottom: 12 }}>
            <Icon n="x" s={15} sw={2.4} /> {GOOGLE_HATA[googleHata] ?? 'Google girişi tamamlanamadı.'}
          </p>
        )}

        {google && (
          <>
            <a className="btn btn-outline btn-block google-dugme" href="/api/giris/google">
              Google ile giriş yap
            </a>
            <div className="giris-ayrac"><span>ya da e-posta ile</span></div>
          </>
        )}

        <GirisFormu />

        <p className="tiny dim" style={{ textAlign: 'center', marginTop: 20 }}>
          Hesabınız yok mu?{' '}
          <Link href="/kayit">
            Hesap açın
          </Link>{' '}·{' '}
          <Link href="/ev-sahibi-ol">
            Projenizi yayınlayın
          </Link>
        </p>
      </div>
    </div>
  );
}
