import PanelKabuk from '@/components/panel/PanelKabuk';
import VeriTalebiEylem from '@/components/panel/VeriTalebiEylem';
import Icon from '@/components/Icon';
import { prisma } from '@/lib/db';
import { SAKLAMA, sertEngeller, silmeEngelleri } from '@/lib/kisisel-veri';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

/** KVKK md. 13: başvuruya en geç otuz gün içinde yanıt verilmeli. */
const YANIT_SURESI_GUN = 30;

export default async function YonetimVeriTalepleri() {
  const b = await yonetimBaglam();

  const talepler = await prisma.veriTalebi.findMany({
    orderBy: [{ durum: 'asc' }, { olusturma: 'desc' }],
    take: 200,
    select: {
      id: true, tip: true, durum: true, eposta: true, not: true, sonuc: true,
      olusturma: true, dogrulandi: true, tamamlanma: true,
    },
  });

  /* Bekleyen silme taleplerinin engelleri önden hesaplanıyor:
     yönetici "onayla"ya basınca hata görmek yerine neyin engellediğini
     baştan görmeli. */
  const bekleyenSilme = talepler.filter((t) => t.tip === 'SILME' && t.durum === 'ISLEMDE');
  const engelHaritasi = new Map(
    await Promise.all(bekleyenSilme.map(async (t) =>
      [t.id, await silmeEngelleri(t.eposta)] as const)),
  );

  const simdi = Date.now();
  const gecenGun = (d: Date) => Math.floor((simdi - d.getTime()) / 864e5);
  const acik = talepler.filter((t) => t.durum === 'ISLEMDE');
  const geciken = acik.filter((t) => gecenGun(t.olusturma) > YANIT_SURESI_GUN).length;

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Kişisel veri başvuruları"
      aciklama={`${acik.length} açık başvuru${geciken ? ` · ${geciken} tanesi 30 günü aştı` : ''}`}
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          <b>Erişim</b> talepleri doğrulamayla kendiliğinden karşılanıyor;
          burada yalnızca kayıt olarak görünüyorlar. <b>Silme</b> talepleri
          geri alınamadığı için onaydan geçiyor. KVKK md. 13 otuz günlük
          yanıt süresi tanıyor.
        </p>
      </div>

      {talepler.length === 0 ? (
        <div className="kart p-bos">
          <Icon n="shield" s={30} />
          <p>Henüz kişisel veri başvurusu yok.</p>
        </div>
      ) : (
        <div className="p-tablo-kap">
          <table className="p-tablo">
            <thead>
              <tr>
                <th>Başvuran</th><th>Tür</th><th>Durum</th>
                <th>Süre</th><th>Ayrıntı</th><th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {talepler.map((t) => {
                const engeller = engelHaritasi.get(t.id) ?? [];
                const gun = gecenGun(t.olusturma);
                const gecikti = t.durum === 'ISLEMDE' && gun > YANIT_SURESI_GUN;
                const sonuc = t.sonuc as Record<string, number> | null;

                return (
                  <tr key={t.id}>
                    <td>
                      <b style={{ fontSize: 13.4 }}>{t.eposta}</b>
                      <div className="tiny dim">{trTarihSaat(t.olusturma)}</div>
                    </td>
                    <td className="tiny">
                      {t.tip === 'SILME' ? 'Silme' : 'Erişim'}
                    </td>
                    <td>
                      <span className={`durum durum-${
                        t.durum === 'TAMAMLANDI' ? 'YAYINDA'
                          : t.durum === 'REDDEDILDI' ? 'IPTAL'
                            : t.durum === 'ISLEMDE' ? 'TALEP' : 'KAPALI'}`}>
                        {t.durum === 'DOGRULAMA_BEKLIYOR' ? 'Doğrulanmadı'
                          : t.durum === 'ISLEMDE' ? 'Açık'
                            : t.durum === 'TAMAMLANDI' ? 'Tamamlandı' : 'Reddedildi'}
                      </span>
                    </td>
                    <td className="tiny">
                      {t.durum === 'ISLEMDE' ? (
                        <span style={gecikti ? { color: 'var(--danger)', fontWeight: 640 } : undefined}>
                          {gun}/{YANIT_SURESI_GUN} gün
                        </span>
                      ) : (
                        <span className="dim">
                          {t.tamamlanma ? trTarihSaat(t.tamamlanma) : '—'}
                        </span>
                      )}
                    </td>
                    <td className="tiny sarma">
                      {engeller.map((e) => (
                        <div key={e.sebep}
                          style={e.tur === 'engel' ? { color: 'var(--danger)' } : undefined}
                          className={e.tur === 'engel' ? undefined : 'dim'}>
                          <b>{e.tur === 'engel' ? 'Engel' : 'Kapsam'} · {e.sebep}:</b> {e.ayrinti}
                        </div>
                      ))}
                      {t.not && <div className="dim">{t.not}</div>}
                      {sonuc && (
                        <div className="dim">
                          {sonuc.talep} talep, {sonuc.konusma} yazışma,{' '}
                          {sonuc.alarm} fiyat alarmı silindi;{' '}
                          {sonuc.bildirim} bildirim anonimleştirildi
                        </div>
                      )}
                      {!engeller.length && !t.not && !sonuc && <span className="dim">—</span>}
                    </td>
                    <td>
                      {t.tip === 'SILME' && t.durum === 'ISLEMDE' ? (
                        <VeriTalebiEylem id={t.id} engelVar={sertEngeller(engeller).length > 0} />
                      ) : (
                        <span className="tiny dim">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="p-kart" style={{ marginTop: 16 }}>
        <h2 className="h3">Saklama süreleri</h2>
        <p className="muted small" style={{ margin: '6px 0 12px' }}>
          Süresi dolan veriler <code>imha</code> işiyle her gece otomatik
          siliniyor. Talep kaydı ticari belge üretmediği için
          anonimleştirme değil <b>gerçek silme</b> uygulanıyor; süreler{' '}
          <code>lib/kisisel-veri.ts</code> içinde dayanaklarıyla tanımlı.
        </p>
        <div className="p-tablo-kap">
          <table className="p-tablo">
            <thead><tr><th>Veri</th><th className="sayi">Süre</th><th>İşlem</th></tr></thead>
            <tbody>
              {([
                ['Süresi dolan oturumlar', SAKLAMA.oturum, 'siliniyor'],
                ['Performans ölçümleri', SAKLAMA.olcum, 'siliniyor'],
                ['Gönderilen bildirimler', SAKLAMA.bildirim, 'siliniyor'],
                ['Sonuçsuz yazışmalar', SAKLAMA.konusma, 'siliniyor'],
                ['Denetim kaydındaki IP', SAKLAMA.denetimIp, 'temizleniyor'],
                ['Sonuçlanmış satış talepleri', SAKLAMA.talep, 'siliniyor'],
                ['Sonuçlanmış başvurular', SAKLAMA.veriTalebi, 'siliniyor'],
              ] as const).map(([ad, gun, islem]) => (
                <tr key={ad}>
                  <td>{ad}</td>
                  <td className="sayi">
                    {gun >= 365 ? `${Math.round(gun / 365)} yıl` : `${gun} gün`}
                  </td>
                  <td className="tiny muted">{islem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PanelKabuk>
  );
}
