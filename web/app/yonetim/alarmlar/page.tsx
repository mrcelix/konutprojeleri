import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { prisma } from '@/lib/db';
import { TL } from '@/lib/bicim';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';

/* ============================================================
   Fiyat alarmları.

   Ziyaretçi proje sayfasında "fiyatı düşünce haber ver" diyor ve
   hedef tutarını bırakıyor. Bu kayıtlar veritabanında birikiyordu
   ama panelde hiç görünmüyordu: hangi projeye talep olduğunu ve
   insanların hangi fiyatı beklediğini kimse göremiyordu.

   Ekran iki soruyu cevaplıyor:
   1. Hangi projede bekleyen var? (talep baskısı)
   2. Ne kadar indirim beklentisi var? (hedef ile güncel fiyat farkı)

   Salt okunur: alarm ziyaretçinin kendi kaydı, panelden silmek ya da
   düzenlemek onun adına karar vermek olurdu. Abonelikten çıkma
   bağlantısı e-postanın içinde.
   ============================================================ */

export const dynamic = 'force-dynamic';

export default async function YonetimAlarmlar() {
  const b = await yonetimBaglam();

  const alarmlar = await prisma.fiyatAlarmi.findMany({
    orderBy: [{ olusturma: 'desc' }],
    take: 500,
    select: {
      id: true, eposta: true, hedef: true, kurulusFiyati: true,
      dogrulandi: true, aktif: true, sonBildirim: true, sonFiyat: true,
      olusturma: true,
      proje: { select: { ad: true, slug: true, fiyatMin: true, durum: true, yayinda: true } },
    },
  });

  /* Proje kırılımı: aynı projeyi kaç kişi takip ediyor ve en yüksek
     hedef ne? Fiyat kararı verirken bakılacak sayı bu.

     TAKİPÇİ ile FİYAT ALARMI ayrı sayılıyor: lansman öncesi projede
     hedef sıfır ("satışa çıkınca haber ver") ve o kayıtları fiyat
     alarmı gibi göstermek, hiç fiyat beklentisi olmayan kişileri
     "şu fiyata düşerse alırım" diyenlerle karıştırıyordu. */
  const projeHarita = new Map<string, {
    ad: string; slug: string; fiyat: number; yayinda: boolean;
    adet: number; dogrulanmis: number; takip: number; enYuksekHedef: number;
  }>();
  for (const a of alarmlar) {
    if (!a.aktif) continue;
    const v = projeHarita.get(a.proje.slug) ?? {
      ad: a.proje.ad, slug: a.proje.slug, fiyat: a.proje.fiyatMin, yayinda: a.proje.yayinda,
      adet: 0, dogrulanmis: 0, takip: 0, enYuksekHedef: 0,
    };
    v.adet += 1;
    if (a.dogrulandi) v.dogrulanmis += 1;
    if (a.hedef === 0) v.takip += 1;
    else v.enYuksekHedef = Math.max(v.enYuksekHedef, a.hedef);
    projeHarita.set(a.proje.slug, v);
  }
  const projeler = [...projeHarita.values()].sort((x, y) => y.adet - x.adet);

  const aktif = alarmlar.filter((a) => a.aktif).length;
  const dogrulanmamis = alarmlar.filter((a) => a.aktif && !a.dogrulandi).length;
  /* HEDEFE ULAŞAN: güncel fiyat hedefin altına inmiş ama bildirim
     gitmemiş kayıtlar. Zamanlanmış iş bunları e-postalıyor; burada
     görünmeleri işin çalışıp çalışmadığını da söylüyor. */
  const hazir = alarmlar.filter(
    (a) => a.aktif && a.dogrulandi && a.hedef > 0
      && a.proje.fiyatMin <= a.hedef && !a.sonBildirim,
  ).length;
  /* Satışa çıkış takibi: lansman öncesi projeye kurulan, hedefi
     olmayan kayıtlar. Proje satışa geçtiğinde bir kez bildiriliyor. */
  const takipci = alarmlar.filter((a) => a.aktif && a.hedef === 0).length;

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Fiyat alarmları"
      aciklama={`${aktif} aktif alarm · ${projeler.length} proje`}
    >
      <div className="p-kpi">
        <div className="p-kpi-kart">
          <span>Aktif alarm</span>
          <b>{aktif}</b>
        </div>
        <div className="p-kpi-kart">
          <span>E-postası doğrulanmamış</span>
          <b>{dogrulanmamis}</b>
        </div>
        <div className="p-kpi-kart">
          <span>Hedefe ulaşmış, bildirimi bekleyen</span>
          <b>{hazir}</b>
        </div>
      </div>

      {alarmlar.length === 0 ? (
        <div className="kart" style={{ padding: '18px 16px', marginTop: 16 }}>
          <p className="muted" style={{ margin: 0 }}>
            Henüz fiyat alarmı kurulmamış. Ziyaretçiler proje sayfasındaki
            fiyat alarmı kutusundan hedef tutarlarını bırakıyor.
          </p>
        </div>
      ) : (
        <>
          <section className="p-kart" style={{ marginTop: 16 }}>
            <h2 className="p-kart-bas">Projeye göre talep</h2>
            <div className="p-tablo-kap">
              <table className="p-tablo">
                <thead>
                  <tr>
                    <th>Proje</th>
                    <th>Bekleyen</th>
                    <th>Güncel fiyat</th>
                    <th>En yüksek hedef</th>
                    <th>Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {projeler.map((v) => {
                    /* Fark POZİTİFSE indirim beklentisi var demek:
                       güncel fiyat, beklenen en yüksek hedefin üstünde. */
                    const fark = v.fiyat - v.enYuksekHedef;
                    return (
                      <tr key={v.slug}>
                        <td>
                          <Link href={`/proje/${v.slug}`} target="_blank">{v.ad}</Link>
                          {!v.yayinda && <span className="tiny muted"> · yayında değil</span>}
                        </td>
                        <td>
                          <b>{v.adet}</b>
                          {v.dogrulanmis < v.adet && (
                            <span className="tiny muted"> ({v.dogrulanmis} doğrulanmış)</span>
                          )}
                        </td>
                        <td>{TL(v.fiyat)}</td>
                        <td>{TL(v.enYuksekHedef)}</td>
                        <td>{fark <= 0 ? 'hedefin altında' : `${TL(fark)} yüksek`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="p-kart" style={{ marginTop: 16 }}>
            <h2 className="p-kart-bas">Son alarmlar</h2>
            <div className="p-tablo-kap">
              <table className="p-tablo">
                <thead>
                  <tr>
                    <th>Kurulma</th>
                    <th>Proje</th>
                    <th>E-posta</th>
                    <th>Hedef</th>
                    <th>Kurulurken</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {alarmlar.slice(0, 200).map((a) => (
                    <tr key={a.id}>
                      <td className="tiny">{trTarihSaat(a.olusturma)}</td>
                      <td>
                        <Link href={`/proje/${a.proje.slug}`} target="_blank">{a.proje.ad}</Link>
                      </td>
                      <td className="tiny">{a.eposta}</td>
                      <td>{TL(a.hedef)}</td>
                      <td className="tiny muted">{TL(a.kurulusFiyati)}</td>
                      <td className="tiny">
                        {!a.aktif ? (
                          <span className="muted">iptal edildi</span>
                        ) : !a.dogrulandi ? (
                          <span>e-posta doğrulanmadı</span>
                        ) : a.sonBildirim ? (
                          <span>
                            <Icon n="check" s={13} sw={2.4} /> {trTarihSaat(a.sonBildirim)}
                            {a.sonFiyat ? ` · ${TL(a.sonFiyat)}` : ''}
                          </span>
                        ) : a.proje.fiyatMin <= a.hedef ? (
                          <span>hedefe ulaştı, bildirim bekliyor</span>
                        ) : (
                          <span className="muted">bekliyor</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PanelKabuk>
  );
}
