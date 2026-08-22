import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { KpiKart } from '@/components/panel/Grafik';
import { bildirimOzeti, epostaSaglayici } from '@/lib/bildirim';
import { prisma } from '@/lib/db';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

const TIP_ADI: Record<string, string> = {
  TALEP_ALINDI: 'Talep alındı (ziyaretçi)',
  TALEP_EKIP: 'Yeni talep (satış ekibi)',
  RANDEVU_TEYIT: 'Randevu teyidi (ziyaretçi)',
  KATALOG_GONDERILDI: 'Katalog gönderildi (ziyaretçi)',
  BAKIYE_HATIRLATMA: 'Bakiye hatırlatma',
  GIRIS_HATIRLATMA: 'Giriş hatırlatma',
  YENI_SORU: 'Yeni soru (firma)',
  SORU_YANITLANDI: 'Soru yanıtlandı (ziyaretçi)',
  HESAP_OLUSTURULDU: 'Hesap oluşturuldu',
  PAROLA_SIFIRLANDI: 'Parola sıfırlandı',
  YORUM_DAVETI: 'Yorum daveti',
};

const DURUMLAR = ['HEPSI', 'KUYRUKTA', 'GONDERILDI', 'BASARISIZ', 'IPTAL'] as const;

export default async function YonetimBildirimler(
  { searchParams }: { searchParams: Promise<{ durum?: string }> },
) {
  const b = await yonetimBaglam();
  const { durum } = await searchParams;
  const secili = DURUMLAR.includes((durum ?? 'HEPSI') as typeof DURUMLAR[number]) ? (durum ?? 'HEPSI') : 'HEPSI';

  const [ozet, kayitlar, planli] = await Promise.all([
    bildirimOzeti(),
    prisma.bildirim.findMany({
      where: secili !== 'HEPSI' ? { durum: secili as 'GONDERILDI' } : {},
      orderBy: { olusturma: 'desc' }, take: 120,
      select: {
        id: true, tip: true, durum: true, alici: true, aliciAd: true, konu: true,
        saglayici: true, hataMesaji: true, denemeSayisi: true,
        planlanan: true, gonderim: true, olusturma: true,
        talep: { select: { kod: true } },
      },
    }),
    prisma.bildirim.count({ where: { durum: 'KUYRUKTA', planlanan: { gt: new Date() } } }),
  ]);

  const saglayici = epostaSaglayici();

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Bildirimler"
      aciklama={`Sağlayıcı: ${saglayici.ad}${saglayici.gercek ? '' : ' — gönderim yapılmıyor'}`}
    >
      {!ozet.gercek && (
        <p className="uyari-bandi" role="note">
          <Icon n="shield" s={17} />
          <span>
            <b>E-posta gönderimi kapalı.</b> Bildirimler <code>.postakutusu/</code> klasörüne
            HTML dosyası olarak yazılıyor; tarayıcıda açıp şablonları inceleyebilirsiniz.
            Gerçek gönderim için <code>EPOSTA_SAGLAYICI=resend</code> veya <code>smtp</code> ayarlayın.
          </span>
        </p>
      )}

      <div className="kpi-izgara">
        <KpiKart baslik="Gönderildi" deger={String(ozet.gonderildi)} alt="toplam" />
        <KpiKart baslik="Kuyrukta" deger={String(ozet.kuyrukta)} alt={`${planli} tanesi ileri tarihli`} />
        <KpiKart baslik="Başarısız" deger={String(ozet.basarisiz)}
          alt={ozet.sonHata ? `son: ${ozet.sonHata.hataMesaji?.slice(0, 40)}` : '3 deneme sonrası'} />
        <KpiKart baslik="Sağlayıcı" deger={saglayici.ad} alt={saglayici.gercek ? 'gerçek gönderim' : 'dosyaya yazıyor'} />
      </div>

      {ozet.kuyrukta > 0 && (
        <section className="kart" style={{ borderColor: 'var(--gold)' }}>
          <div className="kart-bas">
            <div>
              <h2>Kuyrukta bekleyen {ozet.kuyrukta} bildirim</h2>
              <p>
                Zamanlanmış iş bunları gönderiyor. Elle çalıştırmak için:{' '}
                <code>npm run isler -- bildirimler</code>
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="chips">
        {DURUMLAR.map((d) => (
          <Link key={d} href={`/yonetim/bildirimler?durum=${d}`}
            className={'chip' + (secili === d ? ' on' : '')}>
            {d === 'HEPSI' ? 'Tümü' : d}
          </Link>
        ))}
      </div>

      {kayitlar.length ? (
        <div className="p-tablo-kap">
          <table className="p-tablo">
            <thead>
              <tr>
                <th>Tip</th><th>Alıcı</th><th>Konu</th><th>Durum</th>
                <th>Planlanan</th><th>Gönderim</th>
              </tr>
            </thead>
            <tbody>
              {kayitlar.map((k) => (
                <tr key={k.id}>
                  <td>
                    <b style={{ fontSize: 13.2 }}>{TIP_ADI[k.tip] ?? k.tip}</b>
                    {k.talep && <div className="tiny dim">{k.talep.kod}</div>}
                  </td>
                  <td className="sarma">
                    {k.aliciAd}
                    <div className="tiny dim">{k.alici}</div>
                  </td>
                  <td className="sarma" style={{ maxWidth: 300 }}>{k.konu}</td>
                  <td>
                    <span className={`durum durum-${k.durum === 'GONDERILDI' ? 'BASARILI' : k.durum}`}>
                      {k.durum}
                    </span>
                    {k.hataMesaji && (
                      <div className="tiny dim" style={{ maxWidth: 220 }}>
                        {k.hataMesaji} ({k.denemeSayisi} deneme)
                      </div>
                    )}
                  </td>
                  <td className="tiny muted">{trTarihSaat(k.planlanan)}</td>
                  <td className="tiny muted">{k.gonderim ? trTarihSaat(k.gonderim) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="kart p-bos"><Icon n="share" s={30} /><p>Bu filtreyle bildirim yok.</p></div>
      )}

      <section className="kart">
        <div className="kart-bas"><div><h2>Hangi bildirim ne zaman gider?</h2></div></div>
        <div className="table-wrap">
          <table className="info-table">
            <thead><tr><th scope="col">Bildirim</th><th scope="col">Tetikleyici</th></tr></thead>
            <tbody>
              <tr><th scope="row">Talep alındı</th><td>Form gönderilir gönderilmez — talep sahibine (adres verdiyse)</td></tr>
              <tr><th scope="row">Yeni talep</th><td>Aynı anda satış ekibine — telefon gövdede</td></tr>
              <tr><th scope="row">Randevu teyidi</th><td>Randevu işaretlenince; adres yoksa SMS'e düşüyor</td></tr>
              <tr><th scope="row">Bakiye hatırlatma</th><td>Bakiye tahsil tarihinden 3 gün önce</td></tr>
              <tr><th scope="row">Soru yanıtlandı</th><td>Firma ya da ekip yanıt yazınca — soranın dilinde</td></tr>
              <tr><th scope="row">Yeni soru / yanıt</th><td>Mesaj gönderildiğinde karşı tarafa</td></tr>
              <tr><th scope="row">Yorum daveti</th><td>Çıkıştan 1 gün sonra</td></tr>
              <tr><th scope="row">Hesap / parola</th><td>Yönetici hesap açtığında veya parola sıfırladığında</td></tr>
            </tbody>
          </table>
        </div>
        <p className="tiny dim" style={{ marginTop: 14 }}>
          Aynı talep için aynı tip bildirim iki kez kuyruğa giremez — veritabanı engelliyor.
        </p>
      </section>
    </PanelKabuk>
  );
}
