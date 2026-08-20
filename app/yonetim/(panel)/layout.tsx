import Link from 'next/link';
import { panelGerekli, yonetici, ROL_ADLARI } from '@/lib/yetki';
import { cikisYap } from '../giris/eylem';

/**
 * Panel kabuğu.
 *
 * YETKİ KONTROLÜ BURADA. Middleware yalnızca token'ın varlığına bakar;
 * rolü ve hesabın aktifliğini veritabanına soran tek yer panelGerekli().
 * Her sayfada tekrar yazmak yerine yerleşime konuldu — unutulması
 * mümkün olan bir kontrolü unutulamaz hale getirmek.
 */

/**
 * Gezinti.
 *
 * `hazir: false` olanlar henüz yazılmadı ve BAĞLANTI OLARAK
 * GÖSTERİLMEZ. Var olmayan sayfaya bağlantı vermek, kullanıcıya
 * 404 göstermekten başka bir şey yapmaz; sırada olduklarını
 * söylemek daha dürüst.
 */
const BAGLANTILAR = [
  { yol: '/yonetim', ad: 'Kontrol paneli', herkes: true, hazir: true },
  { yol: '/yonetim/projeler', ad: 'Projeler', herkes: true, hazir: true },
  { yol: '/yonetim/talepler', ad: 'Talepler', herkes: true, hazir: false },
  { yol: '/yonetim/onay', ad: 'Onay kuyruğu', herkes: false, hazir: true },
  { yol: '/yonetim/firmalar', ad: 'Firmalar', herkes: false, hazir: false },
  { yol: '/yonetim/icerik', ad: 'İçerik', herkes: false, hazir: false },
];

export default async function PanelYerlesimi({
  children,
}: {
  children: React.ReactNode;
}) {
  const k = await panelGerekli();
  const admin = yonetici(k);
  const baglantilar = BAGLANTILAR.filter((b) => b.herkes || admin);

  return (
    <div className="yn">
      <header className="yn-ust">
        <Link href="/yonetim" className="yn-logo">
          konut<span>projeleri</span>
          <em>panel</em>
        </Link>

        <nav className="yn-nav">
          {baglantilar.map((b) =>
            b.hazir ? (
              <Link key={b.yol} href={b.yol}>{b.ad}</Link>
            ) : (
              <span key={b.yol} className="is-hazirlaniyor" title="Yakında">
                {b.ad}
              </span>
            )
          )}
        </nav>

        <div className="yn-kim">
          <span>
            <b>{k.ad ?? k.eposta}</b>
            <i>{ROL_ADLARI[k.rol]}</i>
          </span>
          <form action={cikisYap}>
            <button type="submit" className="kp-btn is-ghost is-small">Çıkış</button>
          </form>
        </div>
      </header>

      <div className="yn-govde">{children}</div>
    </div>
  );
}
