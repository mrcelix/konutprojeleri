import Link from 'next/link';
import { sql } from '@/lib/db';

/**
 * Site alt bilgisi — tasarım sisteminin `.footer` bloğu.
 *
 * ÜST BANT bülten + kurum bilgisi, ALT IZGARA dört sütun bağlantı.
 * "Veri" sütunu bilinçli olarak ayrı: endeks, karne ve metodoloji
 * sayfaları bu sitenin ayırt edici varlığı; kurumsal bağlantıların
 * arasına karıştırılırsa görünmez oluyorlar.
 *
 * Bağlantılar YALNIZCA var olan sayfalara.
 */

export async function SiteAltBilgi() {
  // Alt bilgideki tek dinamik parça: en çok projesi olan iller.
  //
  // try/catch, `.catch()` DEĞİL. lib/db.ts bağlantıyı tembel kuruyor ve
  // DATABASE_URL yoksa sql çağrısı EŞZAMANLI fırlatıyor — yani
  // sql`...`.catch(...) zinciri kurulamadan hata atılıyor ve yakalanmıyor.
  // Bu, veritabanısız derlemede ana sayfanın tamamını düşürüyordu.
  let iller: { il: string; n: number }[] = [];
  try {
    iller = await sql<{ il: string; n: number }[]>`
      select il, count(*)::int as n from proje
      where yayinda and durum in ('lansman','satista')
      group by il order by count(*) desc limit 6
    `;
  } catch {
    iller = [];
  }

  const ilAdi = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
  const yil = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-ust">
          <div>
            <Link href="/" className="logo">
              <span className="logo-i" aria-hidden>kp</span>
              <span className="logo-a">
                konut<span className="logo-b">projeleri</span>
              </span>
            </Link>
            <p className="small muted" style={{ marginTop: 10, maxWidth: '38ch' }}>
              Satılık konut, villa ve ofis projelerinin fiyat, kat planı ve
              teslim kaydı. Reklam değil, kayıt.
            </p>
            <div className="footer-rozetler">
              <span className="badge">Fiyat arşivi silinmez</span>
              <span className="badge badge-gold">Teslim karnesi</span>
            </div>
          </div>

          <div className="footer-bulten">
            <h3>Yeni proje çıktığında haberiniz olsun</h3>
            <p>
              Takip ettiğiniz şehirde lansman açıldığında ve fiyat
              değiştiğinde tek e-posta. Haftada birden fazla göndermiyoruz.
            </p>
            <form className="footer-bulten-form" action="/bulten" method="get">
              <input
                type="email" name="eposta" required
                placeholder="ornek@eposta.com" aria-label="E-posta adresiniz"
              />
              <button type="submit" className="btn btn-primary">Kaydol</button>
            </form>
          </div>
        </div>

        <div className="footer-grid">
          <div>
            <h4>Projeler</h4>
            <ul>
              <li><Link href="/ara">Tüm projeler</Link></li>
              <li><Link href="/ara?tip=villa">Satılık villa</Link></li>
              <li><Link href="/ara?tip=ofis">Satılık ofis</Link></li>
              <li><Link href="/butce">Bütçeme göre</Link></li>
              <li><Link href="/karsilastir">Karşılaştırma</Link></li>
            </ul>
          </div>

          <div>
            <h4>Şehirler</h4>
            <ul>
              {iller.map((i) => (
                <li key={i.il}>
                  <Link href={`/${i.il}`}>{ilAdi(i.il)} ({i.n})</Link>
                </li>
              ))}
              {iller.length === 0 && <li><Link href="/ara">Tüm şehirler</Link></li>}
            </ul>
          </div>

          <div>
            <h4>Veri</h4>
            <ul>
              <li><Link href="/fiyat-endeksi">Fiyat endeksi</Link></li>
              <li><Link href="/teslim-takvimi">Teslim takvimi</Link></li>
              <li><Link href="/firmalar">Firma karnesi</Link></li>
              <li><Link href="/firma-karnesi-metodoloji">Karne metodolojisi</Link></li>
            </ul>
          </div>

          <div>
            <h4>Kurumsal</h4>
            <ul>
              <li><Link href="/hakkimizda">Hakkımızda</Link></li>
              <li><Link href="/iletisim">İletişim</Link></li>
              <li><Link href="/duzeltme">Düzeltme bildir</Link></li>
              <li><Link href="/gizlilik">Gizlilik</Link></li>
              <li><Link href="/yonetim/giris">Firma girişi</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bot">
          <span>© {yil} Konutprojeleri.com</span>
          <span className="dim">
            Fiyatlar bilgilendirme amaçlıdır, satış bağlayıcısı değildir.
          </span>
        </div>
      </div>
    </footer>
  );
}
