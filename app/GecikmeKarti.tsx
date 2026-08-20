import { connection } from 'next/server';
import { gecikmeOlc } from '@/lib/db';

/**
 * Bölge doğrulama rozeti.
 *
 * AYRI BİR BİLEŞEN VE DİNAMİK OLMAK ZORUNDA. Ana sayfa ISR ile
 * önbellekleniyor, yani derleme anında üretiliyor. Ölçüm orada
 * yapılırsa Vercel'in DERLEME MAKİNESİNDEN Supabase'e olan gecikme
 * ölçülür — o makine fra1'de değildir ve sonuç ~100 ms çıkar.
 * Çalışma anı gecikmesiyle hiçbir ilgisi yoktur.
 *
 * connection() bu bileşeni istek anına bağlar; sayfanın geri kalanı
 * statik kalır, yalnızca bu kart her istekte yeniden hesaplanır.
 */

export async function GecikmeKarti() {
  // İstek anına bağlanır: derleme anında değil, kullanıcı istediğinde ölç.
  await connection();

  let gecikme: Awaited<ReturnType<typeof gecikmeOlc>> | null = null;
  let hata: string | null = null;
  try {
    gecikme = await gecikmeOlc();
  } catch (e) {
    hata = e instanceof Error ? e.message : 'bilinmeyen hata';
  }

  if (hata) {
    return (
      <p className="kp-lead">
        <span className="kp-pill is-danger">Bağlantı yok</span> <code>{hata}</code>
        <br />
        <code>.env.example</code> dosyasını <code>.env.local</code> olarak kopyalayıp
        Supabase bilgilerini girin.
      </p>
    );
  }

  const saglikli = gecikme != null && gecikme.ortanca < 5;

  return (
    <p className="kp-lead">
      <span className={`kp-pill ${saglikli ? 'is-success' : 'is-danger'}`}>
        {gecikme?.ortanca} ms
      </span>{' '}
      {saglikli
        ? 'Bölge eşleşmesi doğru. Geliştirmeye devam edilebilir.'
        : 'Beklenen değer 5 ms altı. Vercel bölgesi fra1 ve Supabase bölgesi eu-central-1 mi, kontrol edin.'}
      <br />
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        Ortanca gidiş-dönüş {gecikme?.ortanca} ms · ilk sorgu {gecikme?.ilk} ms
        (bağlantı kurulumu dahil; soğuk başlatmada bir kez ödenir, bölge
        hakkında bilgi vermez).
      </span>
    </p>
  );
}
