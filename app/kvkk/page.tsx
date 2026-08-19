import type { Metadata } from 'next';
import { KVKK_SURUM, KVKK_METNI } from '@/lib/kvkk';

/**
 * KVKK aydınlatma metni.
 *
 * ⚠ BU METİN TASLAKTIR. Yapısı doğru, içeriği bir avukat tarafından
 * gözden geçirilmelidir. Özellikle yurt dışına aktarım bölümü:
 * Supabase Frankfurt'ta olduğu için ad ve telefon Almanya'da tutuluyor.
 *
 * Metin her değiştiğinde lib/kvkk.ts içindeki KVKK_SURUM artırılır;
 * eski rıza kayıtları hangi sürüme verildiğini gösterir ve dokunulmaz kalır.
 */

export const metadata: Metadata = {
  title: 'Kişisel Verilerin Korunması',
  alternates: { canonical: '/kvkk' },
};

export default function KvkkSayfasi() {
  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-7)', maxWidth: 760 }}>
      <h1 className="kp-h1">Kişisel Verilerin Korunması Aydınlatma Metni</h1>
      <p className="kp-label" style={{ marginBottom: 'var(--s-5)' }}>
        Sürüm {KVKK_SURUM}
      </p>

      <div className="kp-card" style={{ padding: 'var(--s-5)', marginBottom: 'var(--s-4)', background: 'var(--warning-bg)' }}>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--warning)', lineHeight: 1.6 }}>
          <b>Bu metin taslaktır.</b> Yapısı kanunun gerektirdiği başlıkları içerir ancak
          yayına almadan önce bir avukat tarafından gözden geçirilmesi gerekir. Özellikle
          yurt dışına aktarım bölümü ve standart sözleşme hükümlerinin Kuruma bildirimi
          hukuki danışmanlık gerektirir.
        </p>
      </div>

      <Bolum baslik="Veri sorumlusu">
        Konutprojeleri.com, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında
        veri sorumlusudur.
      </Bolum>

      <Bolum baslik="İşlenen veriler ve amacı">
        Site üzerindeki talep formları aracılığıyla <b>ad, soyad ve telefon numarası</b>
        toplanır. Bu bilgiler yalnızca iki amaçla işlenir: talebinizin ilgili proje
        geliştiricisine ulaştırılması ve size dönüş yapılabilmesi. Talebinizle birlikte
        ilettiğiniz bütçe aralığı, ilgilendiğiniz daire tipi ve taşınma zamanı gibi
        bilgiler de aynı amaçla işlenir.
      </Bolum>

      <Bolum baslik="Kimlerle paylaşılır">
        Bilgileriniz yalnızca <b>talebinizi ilettiğiniz firmayla</b> paylaşılır. Üçüncü
        taraflara satılmaz, pazarlama listesi olarak devredilmez. Firma, talebinizi
        yalnızca ilgili proje hakkında sizinle iletişim kurmak için kullanabilir.
      </Bolum>

      <Bolum baslik="Yurt dışına aktarım">
        Verileriniz, hizmet sağlayıcımızın <b>Almanya&apos;da bulunan sunucularında</b>
        saklanır. Bu, Kanun&apos;un 9. maddesi kapsamında yurt dışına veri aktarımı anlamına
        gelir ve <b>açık rızanızla</b> gerçekleştirilir. Formu gönderirken verdiğiniz onay,
        bu aktarımı da kapsar.
        <br /><br />
        Rızanızın hangi metne verildiğini kanıtlayabilmek için onay anındaki metnin sürümü,
        özeti, tarih ve saat bilgisi kaydedilir. Metin sonradan değişse dahi sizin
        onayladığınız sürüm kayıtlarda değişmeden kalır.
      </Bolum>

      <Bolum baslik="Saklama süresi">
        Talebiniz, iletildiği firmayla ilişkiniz sona erdikten sonra en fazla 3 yıl
        saklanır. Bu sürenin sonunda silinir veya anonim hale getirilir.
      </Bolum>

      <Bolum baslik="Haklarınız">
        Kanun&apos;un 11. maddesi uyarınca: verilerinizin işlenip işlenmediğini öğrenme,
        işlenmişse bilgi talep etme, düzeltilmesini veya silinmesini isteme, rızanızı geri
        çekme ve işleme faaliyetine itiraz etme haklarına sahipsiniz.
        <br /><br />
        Rızanızı geri çekmeniz halinde verileriniz silinir; ancak daha önce firmaya
        iletilmiş bir talep varsa, firmanın kendi kayıtlarındaki veriler için doğrudan
        firmaya başvurmanız gerekir.
      </Bolum>

      <Bolum baslik="Başvuru">
        Haklarınızı kullanmak için <b>kvkk@konutprojeleri.com</b> adresine yazabilirsiniz.
        Başvurunuz en geç 30 gün içinde sonuçlandırılır.
      </Bolum>

      <details className="kp-card" style={{ padding: 'var(--s-4)', marginTop: 'var(--s-5)' }}>
        <summary className="kp-label" style={{ cursor: 'pointer' }}>
          Formda gösterilen kısa metin
        </summary>
        <p style={{ marginTop: 'var(--s-3)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
          {KVKK_METNI}
        </p>
      </details>
    </main>
  );
}

function Bolum({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--s-5)' }}>
      <h2 className="kp-h2">{baslik}</h2>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.75, maxWidth: '68ch' }}>
        {children}
      </p>
    </section>
  );
}
