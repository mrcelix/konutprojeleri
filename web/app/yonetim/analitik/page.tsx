import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import {
  botTrafigi, cihazDagilimi, enCokGezilen, enCokTiklanan, gunlukTrafik,
  kanalDagilimi, kaynakDagilimi, motorDagilimi, olayDagilimi,
  saatDagilimi, sayfaTipiDagilimi, trafikOzeti, ulkeDagilimi,
} from '@/lib/analitik-trafik';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

const ARALIKLAR = [7, 30, 90, 365] as const;
const sayi = (n: number) => n.toLocaleString('tr-TR');

/* ============================================================
   Trafik analitiği.

   Bot trafiği HER YERDE ayrı: arama motoru robotları insan
   ziyaretçilerle toplandığında "bugün 400 ziyaretçi" gibi gerçek
   olmayan bir sayı çıkıyor. Ama silinmiyor da — Googlebot'un
   uğramadığı sayfa dizine girmiyor ve taranma sıklığı SEO'nun en
   doğrudan göstergesi.

   Rapor KİMLİKSİZ veriden üretiliyor: çerez yok, IP saklanmıyor,
   ziyaretçi özeti her gece dönen bir tuzla üretiliyor (lib/iz.ts).
   Bunun bedeli, kişi bazlı huni analizinin yapılamaması.
   ============================================================ */
export default async function AnalitikSayfasi(
  { searchParams }: { searchParams: Promise<{ gun?: string }> },
) {
  const b = await yonetimBaglam();
  const { gun: gunHam } = await searchParams;
  const gun = ARALIKLAR.includes(Number(gunHam) as 7) ? Number(gunHam) : 30;

  const [
    ozet, seri, kanal, cihaz, tip, ulke, kaynak, yollar, motor, bot, olay, projeTik, saat,
  ] = await Promise.all([
    trafikOzeti(gun), gunlukTrafik(gun), kanalDagilimi(gun), cihazDagilimi(gun),
    sayfaTipiDagilimi(gun), ulkeDagilimi(gun), kaynakDagilimi(gun), enCokGezilen(gun),
    motorDagilimi(gun), botTrafigi(gun), olayDagilimi(gun), enCokTiklanan('proje-ac', gun),
    saatDagilimi(gun),
  ]);

  const enYuksek = Math.max(1, ...seri.map((s) => Math.max(s.ziyaret, s.bot)));
  const saatEnCok = Math.max(1, ...saat.map((s) => s.sayi));

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Trafik analitiği"
      aciklama={`Son ${gun} gün · çerezsiz, IP saklanmadan ölçülüyor`}
    >
      <div className="an-aralik">
        {ARALIKLAR.map((a) => (
          <a key={a} href={`/yonetim/analitik?gun=${a}`}
            className={'arama-cip' + (a === gun ? ' on' : '')}>
            {a === 365 ? '1 yıl' : `${a} gün`}
          </a>
        ))}
      </div>

      {ozet.ziyaret === 0 && ozet.botZiyaret === 0 && (
        <div className="kart" style={{ padding: '16px 18px', marginBottom: 18 }}>
          <p className="small muted" style={{ margin: 0 }}>
            Bu aralıkta henüz kayıt yok. Ölçüm siteye gelen her sayfa isteğinde
            çalışıyor; ilk ziyaretlerden sonra tablolar dolmaya başlar.
          </p>
        </div>
      )}

      {/* ---------------- Künye ---------------- */}
      <div className="an-kpi">
        {[
          ['Ziyaret', sayi(ozet.ziyaret), 'Sayfa görüntüleme (bot hariç)'],
          ['Tekil ziyaretçi', sayi(ozet.tekil), 'Gün içinde ayrı tarayıcı'],
          ['Oturum', sayi(ozet.oturum), '30 dakikalık pencere'],
          ['Sayfa / oturum', String(ozet.sayfaOturum), 'Gezinme derinliği'],
          ['Hemen çıkma', `%${ozet.hemenCikma}`, 'Tek sayfalık oturumlar'],
          ['Etkileşim', sayi(ozet.olay), 'Tıklama ve filtre'],
          ['Bot ziyareti', sayi(ozet.botZiyaret), 'Arama motoru robotları'],
        ].map(([ad, deger, alt]) => (
          <div className="an-kart" key={ad}>
            <span className="an-ad">{ad}</span>
            <b className="an-deger">{deger}</b>
            <span className="an-alt">{alt}</span>
          </div>
        ))}
      </div>

      {/* ---------------- Günlük seri ---------------- */}
      <section className="kart an-blok">
        <h2>Günlük trafik</h2>
        <p className="small muted">
          Koyu sütun insan ziyaretleri, açık sütun arama motoru robotları.
        </p>
        <div className="an-seri" role="img"
          aria-label={`Son ${gun} günün günlük ziyaret grafiği`}>
          {seri.map((s) => (
            <span key={s.gun} className="an-sutun" title={`${s.gun}: ${s.ziyaret} ziyaret · ${s.bot} bot`}>
              <i className="an-bot" style={{ height: `${(s.bot / enYuksek) * 100}%` }} />
              <i className="an-insan" style={{ height: `${(s.ziyaret / enYuksek) * 100}%` }} />
            </span>
          ))}
        </div>
        <div className="an-seri-alt">
          <span>{seri[0]?.gun}</span>
          <span>{seri[seri.length - 1]?.gun}</span>
        </div>
      </section>

      <div className="an-izgara">
        <Dilimler baslik="Trafik kanalı" veri={kanal}
          not="Organik: arama motorundan. Doğrudan: adres çubuğu ya da yer imi." />
        <Dilimler baslik="Sayfa tipi" veri={tip} />
        <Dilimler baslik="Cihaz" veri={cihaz} />
        <Dilimler baslik="Ülke" veri={ulke} not="Vercel'in coğrafi başlığından; IP saklanmıyor." />
      </div>

      {/* ---------------- Arama motorları ---------------- */}
      <div className="an-izgara">
        <section className="kart an-blok">
          <h2>Arama motoru trafiği</h2>
          <p className="small muted">Organik ziyaretlerin motor dağılımı — gerçek kullanıcılar.</p>
          {motor.length === 0
            ? <p className="tiny dim">Bu aralıkta organik ziyaret yok.</p>
            : (
              <table className="p-tablo">
                <thead><tr><th>Motor</th><th style={{ textAlign: 'right' }}>Ziyaret</th></tr></thead>
                <tbody>
                  {motor.map((m) => (
                    <tr key={m.motor}>
                      <td><b>{m.motor}</b></td>
                      <td style={{ textAlign: 'right' }}>{sayi(m.ziyaret)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </section>

        <section className="kart an-blok">
          <h2>Robot taramaları</h2>
          <p className="small muted">
            Googlebot'un uğramadığı sayfa dizine girmiyor; taranma sıklığı SEO göstergesi.
          </p>
          {bot.length === 0
            ? <p className="tiny dim">Bu aralıkta robot ziyareti yok.</p>
            : (
              <table className="p-tablo">
                <thead>
                  <tr><th>Robot</th><th style={{ textAlign: 'right' }}>Tarama</th><th>Son</th></tr>
                </thead>
                <tbody>
                  {bot.map((x) => (
                    <tr key={x.botAdi}>
                      <td><b>{x.botAdi}</b></td>
                      <td style={{ textAlign: 'right' }}>{sayi(x.ziyaret)}</td>
                      <td className="tiny dim">
                        {x.sonGoruldu ? new Date(x.sonGoruldu).toLocaleDateString('tr-TR') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </section>
      </div>

      {/* ---------------- Sayfalar ---------------- */}
      <section className="kart an-blok">
        <h2>En çok gezilen sayfalar</h2>
        <div className="p-tablo-kap">
          <table className="p-tablo">
            <thead>
              <tr>
                <th>Yol</th>
                <th style={{ textAlign: 'right' }}>Ziyaret</th>
                <th style={{ textAlign: 'right' }}>Tekil</th>
              </tr>
            </thead>
            <tbody>
              {yollar.length === 0 && <tr><td colSpan={3} className="p-tablo-bos">Kayıt yok.</td></tr>}
              {yollar.map((y) => (
                <tr key={y.yol}>
                  <td><a href={y.yol} target="_blank" rel="noreferrer">{y.yol}</a></td>
                  <td style={{ textAlign: 'right' }}>{sayi(y.ziyaret)}</td>
                  <td style={{ textAlign: 'right' }} className="dim">{sayi(y.tekil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Etkileşim ---------------- */}
      <div className="an-izgara">
        <section className="kart an-blok">
          <h2>Etkileşimler</h2>
          <p className="small muted">
            Sunucuya uğramayan tıklamalar: filtre, hızlı bakış, favori.
          </p>
          {olay.length === 0
            ? <p className="tiny dim">Bu aralıkta etkileşim kaydı yok.</p>
            : (
              <table className="p-tablo">
                <thead>
                  <tr><th>Tür</th><th style={{ textAlign: 'right' }}>Sayı</th><th style={{ textAlign: 'right' }}>Kişi</th></tr>
                </thead>
                <tbody>
                  {olay.map((o) => (
                    <tr key={o.tur}>
                      <td><b>{o.tur}</b></td>
                      <td style={{ textAlign: 'right' }}>{sayi(o.sayi)}</td>
                      <td style={{ textAlign: 'right' }} className="dim">{sayi(o.tekil)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </section>

        <section className="kart an-blok">
          <h2>En çok açılan projeler</h2>
          {projeTik.length === 0
            ? <p className="tiny dim">Henüz proje tıklaması yok.</p>
            : (
              <table className="p-tablo">
                <thead><tr><th>Proje</th><th style={{ textAlign: 'right' }}>Tıklama</th></tr></thead>
                <tbody>
                  {projeTik.map((v) => (
                    <tr key={v.hedef}>
                      <td><a href={`/proje/${v.hedef}`} target="_blank" rel="noreferrer">{v.hedef}</a></td>
                      <td style={{ textAlign: 'right' }}>{sayi(v.sayi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </section>
      </div>

      {/* ---------------- Saat ve kaynak ---------------- */}
      <div className="an-izgara">
        <section className="kart an-blok">
          <h2>Günün saatleri</h2>
          <p className="small muted">Kampanya ve destek saatlerini buna göre seçin.</p>
          <div className="an-saat">
            {saat.map((s) => (
              <span key={s.saat} title={`${s.saat}:00 — ${s.sayi} ziyaret`}>
                <i style={{ height: `${(s.sayi / saatEnCok) * 100}%` }} />
                {s.saat % 6 === 0 && <em>{s.saat}</em>}
              </span>
            ))}
          </div>
        </section>

        <Dilimler baslik="Yönlendiren siteler" veri={kaynak}
          not="Boş satır: doğrudan giriş — adres çubuğu, yer imi ya da uygulama içi bağlantı." />
      </div>

      <p className="tiny dim" style={{ marginTop: 18 }}>
        <Icon n="shield" s={13} /> Çerez kullanılmıyor, IP adresi saklanmıyor.
        Ziyaretçi ayrımı her gece değişen bir tuzla üretilen geri çevrilemez
        özetle yapılıyor; aynı kişi ertesi gün yeni ziyaretçi sayılıyor.
        Ham kayıtlar 400 gün sonra siliniyor.
      </p>
    </PanelKabuk>
  );
}

function Dilimler(
  { baslik, veri, not }: { baslik: string; veri: { ad: string; sayi: number; oran: number }[]; not?: string },
) {
  return (
    <section className="kart an-blok">
      <h2>{baslik}</h2>
      {not && <p className="small muted">{not}</p>}
      {veri.length === 0
        ? <p className="tiny dim">Kayıt yok.</p>
        : (
          <div className="an-dilimler">
            {veri.map((d) => (
              <div className="an-dilim" key={d.ad}>
                <span className="an-dilim-ad">{d.ad}</span>
                <span className="an-dilim-bar"><i style={{ width: `${d.oran}%` }} /></span>
                <span className="an-dilim-sayi">{d.sayi.toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        )}
    </section>
  );
}
