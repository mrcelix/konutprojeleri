import Link from 'next/link';
import { panelGerekli, yonetici } from '@/lib/yetki';
import { isKuyrugu, durumSayimlari, DURUM_ADLARI } from '@/lib/queries/yonetim';

/**
 * /yonetim — kontrol paneli.
 *
 * Grafik değil KUYRUK. Gösterge tablosuna bakılır ve unutulur; yapılacak
 * işler listesi bitirilir. Her satır tek tıkla o işi yapabileceğiniz
 * yere gider — sayıyı gösterip kullanıcıyı aramaya bırakmak, işi
 * yapılmamış saymaktır.
 *
 * Sıra ÖNEM sırasıdır, sayı büyüklüğü değil: açılmamış talep firma
 * karnesine işlediği için her zaman üstte.
 */

export const dynamic = 'force-dynamic';

export default async function KontrolPaneli() {
  const k = await panelGerekli();
  const admin = yonetici(k);
  const kapsam = admin ? null : k.firma_id;

  const [kuyruk, durumlar] = await Promise.all([
    isKuyrugu(kapsam),
    durumSayimlari(kapsam),
  ]);

  const isler = [
    {
      n: kuyruk.acilmamisTalep,
      ad: '24 saattir açılmamış talep',
      neden: 'Yanıt süresi firma karnesine işliyor.',
      yol: '/yonetim/talepler?durum=yeni',
      agir: true,
    },
    {
      n: admin ? kuyruk.onayBekleyen : 0,
      ad: 'onay bekleyen değişiklik',
      neden: 'Onaylanana kadar sitede eski değer görünüyor.',
      yol: '/yonetim/onay',
      agir: true,
    },
    {
      n: kuyruk.bayatFiyat,
      ad: 'fiyatı 90 günden eski proje',
      neden: 'Listede "teyit edilmedi" rozetiyle görünüyorlar.',
      yol: '/yonetim/projeler?sorun=bayat',
    },
    {
      n: kuyruk.gecikmisTeslim,
      ad: 'teslim tarihi geçmiş, hâlâ satışta',
      neden: 'Takvimde ayrı bölümde gecikme olarak listeleniyor.',
      yol: '/yonetim/projeler?sorun=geciken',
    },
    {
      n: kuyruk.gorselsiz,
      ad: 'görseli olmayan proje',
      neden: 'Görselsiz kart listede belirgin biçimde geri planda kalıyor.',
      yol: '/yonetim/projeler?sorun=gorselsiz',
    },
    {
      n: kuyruk.koordinatsiz,
      ad: 'koordinatı girilmemiş proje',
      neden: 'Harita görünümünde hiç çıkmıyorlar.',
      yol: '/yonetim/projeler?sorun=koordinatsiz',
    },
  ].filter((i) => i.n > 0);

  const toplamIs = isler.reduce((t, i) => t + i.n, 0);

  return (
    <main className="yn-sayfa">
      <header className="yn-baslik">
        <div>
          <h1 className="kp-h2">Bugün yapılacaklar</h1>
          <p className="kp-lead" style={{ fontSize: 13 }}>
            {toplamIs > 0
              ? `${toplamIs} iş bekliyor. Sıra önem sırasıdır.`
              : 'Bekleyen iş yok. Kuyruk temiz.'}
          </p>
        </div>
      </header>

      {isler.length === 0 ? (
        <div className="kp-card kp-empty">
          <p className="kp-empty__title">Kuyruk temiz</p>
          <p className="kp-empty__text">
            Açılmamış talep, onay bekleyen değişiklik, eksik görsel ya da
            bayat fiyat yok. Yeni proje eklemek için Projeler sekmesine geçin.
          </p>
        </div>
      ) : (
        <ul className="yn-kuyruk">
          {isler.map((i) => (
            <li key={i.ad} className={i.agir ? 'is-agir' : undefined}>
              <Link href={i.yol}>
                <b className="tabular">{i.n}</b>
                <span>
                  <strong>{i.ad}</strong>
                  <em>{i.neden}</em>
                </span>
                <i aria-hidden>→</i>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section style={{ marginTop: 'var(--s-6)' }}>
        <h2 className="kp-h3">Proje dağılımı</h2>
        <div className="yn-sayimlar">
          {durumlar.map((d) => (
            <Link
              key={d.durum}
              href={`/yonetim/projeler?durum=${d.durum}`}
              className="yn-sayim"
            >
              <b className="tabular">{d.n}</b>
              <span>{DURUM_ADLARI[d.durum] ?? d.durum}</span>
            </Link>
          ))}
          {durumlar.length === 0 && (
            <p className="kp-lead" style={{ fontSize: 13 }}>Henüz proje yok.</p>
          )}
        </div>
      </section>

      {!admin && (
        <p className="yn-not">
          Firma hesabıyla giriş yaptınız; yalnızca kendi projeleriniz ve
          talepleriniz görünür. Yayın durumunu değiştiren düzenlemeler
          site yönetiminin onayından geçer.
        </p>
      )}
    </main>
  );
}
