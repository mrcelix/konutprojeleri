import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { KampanyaDurum, KampanyaFormu } from '@/components/panel/KampanyaEylem';
import { kampanyaListesi } from '@/lib/kampanya';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YonetimKampanyalar() {
  const { kullanici, nav, kok } = await yonetimBaglam();
  const liste = await kampanyaListesi();
  const simdi = new Date();

  const yayinda = liste.filter((k) => k.aktif && k.baslangic <= simdi && k.bitis > simdi);

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Kampanya şeridi"
      aciklama={yayinda.length
        ? `${yayinda.length} kampanya yayında`
        : 'Şu an yayında kampanya yok'}
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Şerit sayfanın en üstünde, başlığın üzerinde çıkar ve ziyaretçi
          kapatabilir. Kapatma <b>kampanya bazında</b> hatırlanır — bir sonraki
          kampanya yeniden görünür. Aynı anda birden fazla kampanya yayında
          olabilir; site <b>en son başlayanı</b> gösterir. Bitiş tarihi geçince
          şerit kendiliğinden düşer.
        </p>
      </div>

      <section className="kart" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 12px' }}>Yeni kampanya</h2>
        <KampanyaFormu />
      </section>

      <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 10px' }}>Kampanyalar</h2>

      {liste.length === 0 ? (
        <div className="p-bos">
          <Icon n="spark" s={26} />
          <p>Henüz kampanya oluşturulmadı.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {liste.map((k) => {
            const suresiDoldu = k.bitis <= simdi;
            const baslamadi = k.baslangic > simdi;
            const durumAdi = !k.aktif ? 'Kapalı'
              : suresiDoldu ? 'Süresi doldu'
                : baslamadi ? 'Beklemede' : 'Yayında';
            return (
              <article className="kart" key={k.id}>
                <div className="teklif-satir-bas">
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: 'var(--t-sm)' }}>{k.metin}</b>
                    <div className="tiny dim" style={{ marginTop: 3 }}>
                      {trTarihSaat(k.baslangic)} → {trTarihSaat(k.bitis)}
                      {k.geriSayim && ' · geri sayımlı'}
                      {k.cagriAd && k.cagriYol && ` · düğme: ${k.cagriAd} → ${k.cagriYol}`}
                    </div>
                  </div>
                  <span className={'badge' + (durumAdi === 'Yayında' ? ' badge-instant' : '')}>
                    {durumAdi}
                  </span>
                </div>

                <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <KampanyaFormu k={{
                    id: k.id, metin: k.metin, cagriAd: k.cagriAd, cagriYol: k.cagriYol,
                    geriSayim: k.geriSayim, aktif: k.aktif,
                    baslangic: k.baslangic.toISOString(), bitis: k.bitis.toISOString(),
                  }} />
                  <KampanyaDurum id={k.id} aktif={k.aktif} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PanelKabuk>
  );
}
