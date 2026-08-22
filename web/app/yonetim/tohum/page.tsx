import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { TohumEkle, TohumSil } from '@/components/panel/TohumEylem';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';
import { acikKayitSayisi, partiListesi, TOHUM_TURLERI } from '@/lib/tohum';

export const dynamic = 'force-dynamic';

const TUR_ADI: Record<string, string> = {
  ORNEK_VILLA: 'Örnek projeler',
  DEMO_VILLA: 'Üretilmiş demo projeler',
  TALEP_GECMISI: 'Satış talebi geçmişi',
  DEGERLENDIRME: 'Değerlendirmeler',
};

export default async function YonetimTohum() {
  const b = await yonetimBaglam();
  const partiler = await partiListesi();
  const acik = partiler.filter((p) => p.kalanKayit > 0);
  const toplamKayit = acik.reduce((t, p) => t + p.kalanKayit, 0);

  /* "Yenile" düğmesi yalnızca geri alınacak bir şey varsa gösteriliyor.
     Sayı PROJE sayısı, defterdeki toplam kayıt değil: toplam firma
     satırını da kapsıyor ve "17 villa bas" gibi bir varsayılan
     üretiyordu. */
  const acikDemoVilla = await acikKayitSayisi('DEMO_PROJE', 'Villa');

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Demo veri"
      aciklama={acik.length
        ? `${acik.length} parti açık · ${toplamKayit} kayıt geri alınabilir`
        : 'Sitede geri alınmamış demo veri yok'}
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Buradaki tohumlama <b>hiçbir şeyi silmez</b> — yalnızca ekler ve
          ne eklediğini deftere yazar. Geri alma da yalnızca o deftere
          bakar: gerçek kayıtlar defterde olmadığı için silinemez.
          Komut satırındaki <code>npm run db:seed</code> ise 16 tabloyu
          boşaltıp baştan yazıyor; <b>canlıda çalıştırmayın</b>.
        </p>
      </div>

      <div className="tohum-izgara" style={{ marginBottom: 24 }}>
        {TOHUM_TURLERI.map((t) => (
          <TohumEkle key={t.tur} tur={t.tur} ad={t.ad} aciklama={t.aciklama}
            yayindaSecimi={t.tur === 'ORNEK_PROJE' || t.tur === 'DEMO_PROJE'}
            adetSecimi={t.tur === 'DEMO_PROJE'}
            acikKayit={t.tur === 'DEMO_PROJE' ? acikDemoVilla : 0} />
        ))}
      </div>

      <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 10px' }}>Partiler</h2>

      {partiler.length === 0 ? (
        <div className="kart p-bos">
          <Icon n="grid" s={30} />
          <p>Henüz tohumlama yapılmadı.</p>
        </div>
      ) : (
        <div className="p-tablo-kap">
          <table className="p-tablo">
            <thead>
              <tr>
                <th>Parti</th><th>İçerik</th><th>Ekleyen</th>
                <th>Durum</th><th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {partiler.map((p) => {
                const ozet = (p.ozet ?? {}) as Record<string, number>;
                return (
                  <tr key={p.id}>
                    <td>
                      <b style={{ fontSize: 13 }}>{TUR_ADI[p.tur] ?? p.tur}</b>
                      <div className="tiny dim">{p.etiket}</div>
                      <div className="tiny dim">{trTarihSaat(p.olusturma)}</div>
                    </td>
                    <td className="tiny">
                      {Object.entries(ozet).length
                        ? Object.entries(ozet).map(([m, n]) => (
                          <div key={m}>{n} {m}</div>
                        ))
                        : <span className="dim">—</span>}
                    </td>
                    <td className="tiny dim">{p.olusturan?.ad ?? 'komut satırı'}</td>
                    <td>
                      {p.silinme ? (
                        <>
                          <span className="durum durum-IPTAL">Geri alındı</span>
                          <div className="tiny dim">{trTarihSaat(p.silinme)}</div>
                        </>
                      ) : p.kalanKayit === 0 ? (
                        <span className="durum durum-IPTAL">Kayıt kalmadı</span>
                      ) : (
                        <>
                          <span className="durum durum-YAYINDA">Açık</span>
                          <div className="tiny dim">{p.kalanKayit} kayıt</div>
                        </>
                      )}
                    </td>
                    <td>
                      {p.kalanKayit > 0
                        ? <TohumSil partiId={p.id} etiket={TUR_ADI[p.tur] ?? p.tur} />
                        : <span className="tiny dim">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PanelKabuk>
  );
}
