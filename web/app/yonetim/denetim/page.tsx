import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { prisma } from '@/lib/db';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

const EYLEM_ADI: Record<string, string> = {
  'giris.basarili': 'Giriş yaptı',
  'giris.basarisiz': 'Başarısız giriş denemesi',
  'proje.guncelle': 'Proje güncelledi',
  'talep.durum': 'Talep durumunu değiştirdi',
  'talep.atandi': 'Talebi üstlendi',
  'musaitlik.blokla': 'Tarih kapattı',
  'musaitlik.kaldir': 'Tarih açtı',
  'fiyat.kural': 'Fiyat kuralı ekledi',
  'fiyat.kuralSil': 'Fiyat kuralı sildi',
  'mesaj.yanit': 'Mesaj yanıtladı',
  'kullanici.olustur': 'Kullanıcı oluşturdu',
  'kullanici.kapat': 'Kullanıcı hesabı kapattı',
  'kullanici.ac': 'Kullanıcı hesabı açtı',
  'kullanici.parolaSifirla': 'Parola sıfırladı',
  'yorum.gizle': 'Yorum gizledi',
  'yorum.yayinla': 'Yorum yayınladı',
  'bolge.guncelle': 'Bölge güncelledi',
};

export default async function YonetimDenetim() {
  const b = await yonetimBaglam();

  const kayitlar = await prisma.denetimKaydi.findMany({
    orderBy: { olusturma: 'desc' }, take: 200,
    select: {
      id: true, eylem: true, varlik: true, varlikId: true, detay: true, ip: true, olusturma: true,
      kullanici: { select: { ad: true, eposta: true, rol: true } },
    },
  });

  const basarisizGiris = kayitlar.filter((k) => k.eylem === 'giris.basarisiz').length;

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Denetim kaydı"
      aciklama={`Son ${kayitlar.length} işlem${basarisizGiris ? ` · ${basarisizGiris} başarısız giriş denemesi` : ''}`}
    >
      {kayitlar.length ? (
        <div className="p-tablo-kap">
          <table className="p-tablo">
            <thead>
              <tr><th>Zaman</th><th>Kullanıcı</th><th>İşlem</th><th>Varlık</th><th>Detay</th><th>IP</th></tr>
            </thead>
            <tbody>
              {kayitlar.map((k) => (
                <tr key={k.id}>
                  <td className="tiny muted">{trTarihSaat(k.olusturma)}</td>
                  <td>
                    {k.kullanici
                      ? <>
                        <b style={{ fontSize: 13.2 }}>{k.kullanici.ad}</b>
                        <div className="tiny dim">{k.kullanici.rol === 'ADMIN' ? 'Yönetici' : 'Firma'}</div>
                      </>
                      : <span className="dim">bilinmiyor</span>}
                  </td>
                  <td>
                    <span style={k.eylem === 'giris.basarisiz' ? { color: 'var(--danger)', fontWeight: 620 } : undefined}>
                      {EYLEM_ADI[k.eylem] ?? k.eylem}
                    </span>
                  </td>
                  <td className="tiny muted">{k.varlik}</td>
                  <td className="sarma tiny dim" style={{ maxWidth: 320 }}>
                    {k.detay ? JSON.stringify(k.detay) : '—'}
                  </td>
                  <td className="tiny dim">{k.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="kart p-bos"><Icon n="shield" s={30} /><p>Henüz denetim kaydı yok.</p></div>
      )}

      <section className="kart">
        <div className="kart-bas"><div><h2>Denetim kaydı ne işe yarar?</h2></div></div>
        <div className="prose" style={{ maxWidth: 'none' }}>
          <ul>
            <li><strong>Uyuşmazlık çözümü:</strong> &quot;fiyatı ben değiştirmedim&quot; tartışmasında kim, ne zaman, neyi değiştirdi görülür.</li>
            <li><strong>Güvenlik:</strong> başarısız giriş denemelerinin yoğunlaşması saldırı işareti olabilir.</li>
            <li><strong>Sorumluluk:</strong> proje silme ve talep durumu değiştirme gibi hassas işlemler iz bırakır.</li>
          </ul>
          <p className="tiny dim" style={{ marginTop: 10 }}>
            Kayıtlar silinemez. Üretimde saklama süresi ve arşivleme politikası tanımlanmalı (KVKK).
          </p>
        </div>
      </section>
    </PanelKabuk>
  );
}
