import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import VeriTalebiFormu from '@/components/VeriTalebiFormu';
import { meta } from '@/lib/seo';
import { site } from '@/lib/site';

/* KVKK md. 11 başvuru sayfası.

   Dinamik: form sunucu eylemi kullanıyor ve sayfa hiçbir şekilde
   önbelleklenmemeli — kişisel veriyle ilgili her yüzey taze olmalı. */
export const dynamic = 'force-dynamic';

export const metadata = meta({
  baslik: 'Kişisel Veri Başvurusu',
  aciklama: `${site.ad} hakkınızda hangi kişisel verileri tuttuğunu öğrenin veya silinmesini talep edin. KVKK md. 11 kapsamındaki başvuru formu.`,
  yol: '/veri-talebi',
  // Başvuru yüzeyi arama sonucunda çıkmasın; gizlilik sayfasından
  // ve alt bilgiden erişiliyor
  indexle: false,
});

export default function VeriTalebiSayfasi() {
  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: 'Kişisel veri başvurusu', yol: '/veri-talebi' },
  ];

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <Breadcrumbs items={kirintilar} />

      <h1 className="h1" style={{ margin: '22px 0 16px' }}>
        Kişisel veri başvurusu
      </h1>

      <div className="prose" style={{ maxWidth: '68ch' }}>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun 11. maddesi
          size, hakkınızda hangi verilerin işlendiğini öğrenme ve
          şartları oluştuğunda silinmesini isteme hakkı veriyor. Bu
          formdan başvurabilirsiniz.
        </p>
        <p>
          Başvurunuzu doğrulamak için e-posta adresinize bir bağlantı
          gönderiyoruz. Hesabınız olmadığı için talebin size ait olduğunu
          başka türlü doğrulayamıyoruz.
        </p>
      </div>

      <div style={{ marginTop: 24, maxWidth: 720 }}>
        <VeriTalebiFormu />
      </div>

      <section className="prose" style={{ maxWidth: '68ch', marginTop: 34 }}>
        <h2>Silme talebinde neler olur?</h2>
        <p>
          Adınız, e-posta adresiniz, telefonunuz ve yazdığınız notlar
          kayıtlardan geri döndürülemez biçimde çıkarılır. Mesajlarınızın
          içeriği silinir, yorumlarınız isimsiz hâle gelir.
        </p>
        <p>
          <b>Burada saklanması zorunlu bir ticari belge yok.</b>{' '}
          Bu site üzerinden alışveriş yapılmıyor; talep yalnızca bir temas
          kaydı ve fatura, sözleşme gibi bir belge üretmiyor. Bu yüzden
          kiralama ya da satış platformlarındaki gibi "on yıl saklanacak"
          bir kayıt grubu yok — kayıtlar anonimleştirilmiyor, siliniyor.
        </p>
        <p>
          <b>Süren bir satış görüşmeniz varsa</b> talep o görüşme
          kapanana kadar bekletilir: satış ekibi sizi aramak üzere ve
          adınıza, telefonunuza ihtiyaç var. Bu durumda size gerekçesiyle
          birlikte bildirim yapılır; dilerseniz önce taleplerinizi
          kapatmamızı isteyebilirsiniz.
        </p>
        <p>
          Formu <b>yalnızca telefon numarası</b> bırakarak doldurduysanız
          o talepler e-posta adresinizden bulunamaz. Numaranızı belirterek
          yeniden başvurun; ekibimiz kaydı numaradan eşleştirir.
        </p>

        <h2>Başka nasıl başvurabilirim?</h2>
        <p>
          Yazılı başvuru için{' '}
          <Link href="/iletisim">iletişim sayfamızdaki</Link> adresi
          kullanabilirsiniz. Hangi yolu seçerseniz seçin başvurunuz en geç
          30 gün içinde sonuçlandırılır.
        </p>
        <p>
          Hangi verileri neden işlediğimiz{' '}
          <Link href="/gizlilik">KVKK ve gizlilik politikasında</Link>{' '}
          ayrıntılı olarak yazılı.
        </p>
      </section>
    </div>
  );
}
