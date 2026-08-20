import Link from 'next/link';
import { sql } from '@/lib/db';

/**
 * Site alt bilgisi.
 *
 * "Veri" sütunu bilinçli olarak ayrı: endeks, karne ve metodoloji
 * sayfaları bu sitenin ayırt edici varlığı. Kurumsal bağlantıların
 * arasına karıştırılırsa görünmez olurlar.
 *
 * Bağlantılar YALNIZCA var olan sayfalara. Yazılmamış sayfaya
 * bağlantı vermek 404 üretmekten başka bir şey yapmaz.
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

  return (
    <footer className="sa">
      <div className="kp-wrap sa-ic">
        <div>
          <Link href="/" className="sb-logo">
            konut<span>projeleri</span>
            <i>lüks konut &amp; villa</i>
          </Link>
          <p className="sa-kunye">
            Türkiye’nin lüks konut, villa ve yalı projeleri. Fiyatlar firmaların
            beyanıdır; her projede teyit tarihi yazılıdır.
          </p>
        </div>

        <div>
          <h2 className="sa-bas">Keşfet</h2>
          <ul className="sa-liste">
            <li><Link href="/ara?tip=villa">Villa projeleri</Link></li>
            <li><Link href="/ara?tip=mustakil">Müstakil ev</Link></li>
            <li><Link href="/ara?tip=yali">Yalı &amp; sahil</Link></li>
            <li><Link href="/ara?tip=rezidans">Lüks rezidans</Link></li>
            <li><Link href="/teslim-takvimi">Teslim takvimi</Link></li>
            <li><Link href="/butce">Bütçeme uyanlar</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="sa-bas">Veri</h2>
          <ul className="sa-liste">
            <li><Link href="/fiyat-endeksi">m² fiyat endeksi</Link></li>
            <li><Link href="/firmalar">Firma karneleri</Link></li>
            <li><Link href="/firma-karnesi-metodoloji">Karne metodolojisi</Link></li>
            <li><Link href="/duzeltme">Düzeltme bildir</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="sa-bas">Şehirler</h2>
          <ul className="sa-liste">
            {iller.map((i) => (
              <li key={i.il}>
                <Link href={`/${i.il}-konut-projeleri`}>
                  {ilAdi(i.il)} <em>{i.n}</em>
                </Link>
              </li>
            ))}
            {iller.length === 0 && <li>—</li>}
          </ul>
        </div>

        <div>
          <h2 className="sa-bas">Kurumsal</h2>
          <ul className="sa-liste">
            <li><Link href="/yonetim/giris">Firma girişi</Link></li>
            <li><Link href="/kvkk">KVKK aydınlatma</Link></li>
          </ul>
        </div>
      </div>

      <div className="kp-wrap sa-alt">
        <span>© {new Date().getFullYear()} Konutprojeleri.com</span>
        <span>
          Fiyatlar ve teslim tarihleri firmaların beyanıdır, taahhüt niteliği
          taşımaz.
        </span>
      </div>
    </footer>
  );
}
