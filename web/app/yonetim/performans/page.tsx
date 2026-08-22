import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { cihazKirilimi, cwvOzet, enYavasSayfalar, ESIKLER } from '@/lib/olcum';
import { sinirOzeti } from '@/lib/hiz-sinir';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

const RENK: Record<string, string> = {
  good: 'var(--success)',
  'needs-improvement': 'var(--gold)',
  poor: 'var(--danger)',
};
const DERECE_AD: Record<string, string> = {
  good: 'İyi', 'needs-improvement': 'Geliştirilebilir', poor: 'Zayıf',
};

const bicim = (metrik: string, v: number) =>
  (metrik === 'CLS' ? v.toFixed(3) : `${v} ms`);

export default async function YonetimPerformans() {
  const { kullanici, nav, kok } = await yonetimBaglam();

  const [ozet, kirilim, yavaslar, sinir] = await Promise.all([
    cwvOzet(28),
    cihazKirilimi(28),
    enYavasSayfalar('LCP', 28),
    sinirOzeti(20),
  ]);

  const olcumVar = ozet.some((o) => o.orneklem > 0);

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Performans ve güvenlik"
      aciklama="Gerçek kullanıcı ölçümleri (son 28 gün) ve hız sınırı durumu"
    >
      {!olcumVar && (
        <p className="uyari-bandi" role="note">
          <Icon n="clock" s={17} />
          <span>
            Henüz ölçüm yok. Veriler gerçek ziyaretlerden toplanıyor ve her
            ziyaretin %20&apos;si örnekleniyor — yayına aldıktan sonra birkaç
            saat içinde dolmaya başlar.
          </span>
        </p>
      )}

      <section className="kart">
        <div className="kart-bas">
          <div>
            <h2>Core Web Vitals</h2>
            <p className="muted small">
              Google sıralamada ortalamayı değil <b>75. yüzdelik dilimi</b>{' '}
              kullanıyor; burada gösterilen değer de p75.
            </p>
          </div>
        </div>

        <div className="kpi-izgara">
          {['LCP', 'INP', 'CLS'].map((m) => {
            const o = ozet.find((x) => x.metrik === m);
            const e = ESIKLER[m];
            return (
              <div key={m} className="kpi-kart">
                <span className="kpi-etiket">{m}</span>
                <b className="kpi-deger" style={{ color: o ? RENK[o.derece] : undefined }}>
                  {o ? bicim(m, o.p75) : '—'}
                </b>
                <span className="kpi-alt">
                  {o
                    ? `${DERECE_AD[o.derece]} · ${o.orneklem} ölçüm · %${o.iyiOran} iyi`
                    : `hedef ≤ ${bicim(m, e.iyi)}`}
                </span>
              </div>
            );
          })}
        </div>

        <div className="tablo-sar" style={{ marginTop: 16 }}>
          <table className="p-tablo">
            <thead>
              <tr>
                <th>Metrik</th><th>p75</th><th>Hedef</th>
                <th>Örneklem</th><th>İyi oranı</th><th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {ozet.map((o) => (
                <tr key={o.metrik}>
                  <td><b>{o.metrik}</b></td>
                  <td>{bicim(o.metrik, o.p75)}</td>
                  <td className="dim">≤ {bicim(o.metrik, ESIKLER[o.metrik]?.iyi ?? 0)}</td>
                  <td>{o.orneklem}</td>
                  <td>%{o.iyiOran}</td>
                  <td>
                    <span className="badge" style={{ color: RENK[o.derece] }}>
                      {DERECE_AD[o.derece]}
                    </span>
                  </td>
                </tr>
              ))}
              {ozet.length === 0 && <tr><td colSpan={6} className="p-tablo-bos">Ölçüm yok.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="kart" style={{ marginTop: 16 }}>
        <div className="kart-bas">
          <div>
            <h2>Cihaz kırılımı</h2>
            <p className="muted small">
              Mobil neredeyse her zaman daha yavaş; Google da sıralamada
              mobil veriyi kullanıyor.
            </p>
          </div>
        </div>
        <div className="tablo-sar">
          <table className="p-tablo">
            <thead><tr><th>Metrik</th><th>Mobil</th><th>Masaüstü</th><th>Fark</th></tr></thead>
            <tbody>
              {['LCP', 'INP', 'CLS'].map((m) => {
                const mo = kirilim.mobil.find((x) => x.metrik === m);
                const ma = kirilim.masaustu.find((x) => x.metrik === m);
                const fark = mo && ma ? mo.p75 - ma.p75 : null;
                return (
                  <tr key={m}>
                    <td><b>{m}</b></td>
                    <td style={{ color: mo ? RENK[mo.derece] : undefined }}>
                      {mo ? bicim(m, mo.p75) : '—'}
                    </td>
                    <td style={{ color: ma ? RENK[ma.derece] : undefined }}>
                      {ma ? bicim(m, ma.p75) : '—'}
                    </td>
                    <td className="dim">
                      {fark === null ? '—' : `${fark > 0 ? '+' : ''}${bicim(m, fark)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="kart" style={{ marginTop: 16 }}>
        <div className="kart-bas">
          <div>
            <h2>En yavaş sayfalar (LCP)</h2>
            <p className="muted small">
              En az 5 ölçümü olan sayfalar. Aynı şablonun birden çok yolu
              yavaşsa sorun şablondadır.
            </p>
          </div>
        </div>
        <div className="tablo-sar">
          <table className="p-tablo">
            <thead><tr><th>Yol</th><th>LCP p75</th><th>Örneklem</th></tr></thead>
            <tbody>
              {yavaslar.map((y) => (
                <tr key={y.yol}>
                  <td style={{ maxWidth: 380, overflowWrap: 'anywhere' }}>{y.yol}</td>
                  <td style={{ color: RENK[y.derece] }}>{y.p75} ms</td>
                  <td>{y.orneklem}</td>
                </tr>
              ))}
              {yavaslar.length === 0 && (
                <tr><td colSpan={3} className="p-tablo-bos">Yeterli ölçüm yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="kart" style={{ marginTop: 16 }}>
        <div className="kart-bas">
          <div>
            <h2>Hız sınırı</h2>
            <p className="muted small">
              Şu an <b>{sinir.aktifEngel}</b> aktif engel var. Sayaçlar
              veritabanında tutuluyor — sunucusuz ortamda bellek sayacı
              işe yaramıyor.
            </p>
          </div>
        </div>
        <div className="tablo-sar">
          <table className="p-tablo">
            <thead><tr><th>Anahtar</th><th>Deneme</th><th>Engel bitişi</th></tr></thead>
            <tbody>
              {sinir.sonEngeller.map((e) => {
                const aktif = e.engelBitis !== null && e.engelBitis > new Date();
                return (
                  <tr key={e.anahtar}>
                    <td style={{ maxWidth: 340, overflowWrap: 'anywhere' }}>
                      <code className="tiny">{e.anahtar}</code>
                    </td>
                    <td>{e.sayac}</td>
                    <td style={{ color: aktif ? 'var(--danger)' : undefined }}>
                      {e.engelBitis?.toLocaleString('tr-TR') ?? '—'}
                      {aktif && <div className="tiny">aktif</div>}
                    </td>
                  </tr>
                );
              })}
              {sinir.sonEngeller.length === 0 && (
                <tr><td colSpan={3} className="p-tablo-bos">Hiç engel oluşmamış.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PanelKabuk>
  );
}
