import Link from 'next/link';
import Icon from '@/components/Icon';
import { alarmIptal, alarmOnayla } from '@/lib/fiyat-alarmi';
import { meta } from '@/lib/seo';

/* Kişiye özel bağlantı: indekslenmemeli. */
export const metadata = meta({
  baslik: 'Fiyat alarmı',
  aciklama: 'Fiyat alarmı onayı ve aboneliği kaldırma.',
  yol: '/alarm',
  indexle: false,
});

export const dynamic = 'force-dynamic';

export default async function AlarmSayfasi({
  params, searchParams,
}: {
  params: Promise<{ jeton: string }>;
  searchParams: Promise<{ islem?: string }>;
}) {
  const { jeton } = await params;
  const { islem } = await searchParams;

  /* İşlem GET ile yapılıyor: e-posta istemcilerinin çoğu form
     gönderemiyor ve tek tıkla çıkabilmek yasal bir beklenti.
     Yapılabilecek en kötü şey "alarmı iptal etmek" olduğu için
     bağlantının ön yüklenmesi de zarar vermiyor. */
  const iptalMi = islem === 'iptal';
  /* İptal proje dönmüyor (kayıt siliniyor), onay dönüyor; birleşim
     tipinde `projeSlug` isteğe bağlı. */
  const sonuc: { tamam: boolean; hata?: string; bilgi?: string; projeSlug?: string } =
    iptalMi ? await alarmIptal(jeton) : await alarmOnayla(jeton);

  return (
    <div className="wrap">
      <section className="section">
        <div className="teklif-goruntu" style={{ textAlign: 'center' }}>
          <span className="teklif-tik" style={{ margin: '0 auto' }}>
            <Icon n={sonuc.tamam ? 'check' : 'x'} s={26} sw={2.6} />
          </span>

          <h1 className="h2" style={{ margin: 0 }}>
            {!sonuc.tamam
              ? 'Bağlantı geçersiz'
              : iptalMi
                ? 'Fiyat alarmınız kaldırıldı'
                : sonuc.bilgi
                  ? 'Alarmınız zaten etkin'
                  : 'Fiyat alarmınız etkinleşti'}
          </h1>

          <p className="muted" style={{ maxWidth: '52ch', margin: '0 auto' }}>
            {!sonuc.tamam
              ? (sonuc.hata ?? 'Bu bağlantı artık geçerli değil.')
              : iptalMi
                ? 'Bu proje için artık e-posta göndermeyeceğiz. Adresiniz kayıtlarımızdan silindi.'
                : 'Başlangıç fiyatı hedefinizin altına düştüğünde size e-posta göndereceğiz. '
                  + 'Her e-postanın altında tek tıkla çıkma bağlantısı olacak.'}
          </p>

          <div className="teklif-alt">
            {sonuc.projeSlug && (
              <Link className="btn btn-primary" href={`/proje/${sonuc.projeSlug}`}>
                Projeyi görüntüle <Icon n="arrowR" s={15} />
              </Link>
            )}
            <Link className="btn btn-ghost" href="/arama">Projeleri incele</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
