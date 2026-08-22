import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import { kisiselVeriTopla } from '@/lib/kisisel-veri';
import { veriTalebiDogrula } from '@/lib/panel-eylemler';
import { meta } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = meta({
  baslik: 'Başvuru doğrulama',
  aciklama: 'Kişisel veri başvurusu doğrulama sayfası.',
  yol: '/veri-talebi/dogrula',
  indexle: false,
});

/* ============================================================
   Doğrulama sayfası.

   Bağlantıya tıklamak talebi doğrulanmış sayıyor. Erişim talebinde
   veriler burada ÖZETLENİYOR ama tamamı otomatik dökülmüyor: e-posta
   tarayıcıları bağlantıları açıyor ve tüm kişisel veriyi bir tarayıcı
   isteğine karşılık materyalize etmenin gereği yok. Tam döküm ayrı
   bir indirme adımıyla, aynı jetonla alınıyor.

   Silme talebi burada UYGULANMIYOR: geri alınamaz olduğu için insan
   onayından geçiyor.
   ============================================================ */

export default async function DogrulaSayfasi(
  { searchParams }: { searchParams: Promise<{ jeton?: string }> },
) {
  const { jeton } = await searchParams;
  const talep = await veriTalebiDogrula(jeton ?? '');

  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: 'Kişisel veri başvurusu', yol: '/veri-talebi' },
  ];

  if (!talep) {
    return (
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <Breadcrumbs items={kirintilar} />
        <h1 className="h1" style={{ margin: '22px 0 16px' }}>Bağlantı geçersiz</h1>
        <div className="prose" style={{ maxWidth: '62ch' }}>
          <p>
            Bu doğrulama bağlantısı geçersiz veya süresi dolmuş.
            Bağlantılar 48 saat geçerli.
          </p>
          <p>
            <Link className="btn btn-primary" href="/veri-talebi">
              Yeni başvuru yap
            </Link>
          </p>
        </div>
      </div>
    );
  }

  /* ---------- Silme talebi ---------- */
  if (talep.tip === 'SILME') {
    const sonuclandi = talep.durum === 'TAMAMLANDI' || talep.durum === 'REDDEDILDI';
    return (
      <div className="wrap" style={{ paddingBottom: 60 }}>
        <Breadcrumbs items={kirintilar} />
        <h1 className="h1" style={{ margin: '22px 0 16px' }}>
          {talep.durum === 'TAMAMLANDI' ? 'Verileriniz silindi'
            : talep.durum === 'REDDEDILDI' ? 'Talebiniz sonuçlandı'
              : 'Silme talebiniz doğrulandı'}
        </h1>

        <div className="prose" style={{ maxWidth: '62ch' }}>
          {talep.durum === 'TAMAMLANDI' && (() => {
            /* Mesaj SONUÇTAN üretiliyor: kaç kaydın silindiğini
               söylemek, "işlendi" demekten farklı bir şey — veri sahibi
               talebinin gerçekten karşılığı olduğunu görüyor. */
            const s = talep.sonuc as { talep?: number; konusma?: number } | null;
            const silinenTalep = s?.talep ?? 0;
            const silinenKonusma = s?.konusma ?? 0;
            return (
              <>
                <p>
                  <b>{talep.eposta}</b> adresine bağlı kayıtlarınız
                  silindi: satış talepleriniz, yazışmalarınız, fiyat
                  alarmlarınız ve varsa firma başvurunuz kaldırıldı.
                </p>
                <p>
                  {silinenTalep > 0 || silinenKonusma > 0 ? (
                    <>
                      <b>{silinenTalep} satış talebi</b> ve{' '}
                      <b>{silinenKonusma} yazışma</b> tamamen silindi.{' '}
                    </>
                  ) : null}
                  Gönderim kaydının yalnızca kanal ve tarih alanları
                  duruyor; adres ve gövde temizlendi. Bu kayıt, size
                  istenmeyen posta gönderilmediğinin tek kanıtı olduğu
                  için tümüyle silinmiyor — kalan alanlar tek başına
                  kimseyi işaret etmiyor.
                </p>
              </>
            );
          })()}

          {talep.durum === 'REDDEDILDI' && (
            <>
              <p>Talebiniz şu gerekçeyle sonuçlandırılamadı:</p>
              <blockquote>{talep.not || 'Gerekçe belirtilmemiş.'}</blockquote>
              <p>
                Koşullar değiştiğinde yeniden başvurabilirsiniz.
              </p>
            </>
          )}

          {!sonuclandi && (
            <>
              <p>
                <b>{talep.eposta}</b> adresi için silme talebiniz alındı ve
                incelemeye gönderildi.
              </p>
              <p>
                Silme geri alınamadığı için talep bir yetkili tarafından
                inceleniyor. Sonuç en geç <b>30 gün</b> içinde bu adrese
                bildirilecek (KVKK md. 13).
              </p>
              <p>
                Süren bir satış görüşmeniz varsa talep o görüşme kapanana
                kadar bekletilir; satış ekibinin sizi arayabilmesi için
                bilgilerinize ihtiyaç var.
              </p>
            </>
          )}

          <p style={{ marginTop: 26 }}>
            <Link className="btn btn-ghost" href="/">Ana sayfaya dön</Link>
          </p>
        </div>
      </div>
    );
  }

  /* ---------- Erişim talebi ---------- */
  const rapor = await kisiselVeriTopla(talep.eposta);

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <Breadcrumbs items={kirintilar} />

      <h1 className="h1" style={{ margin: '22px 0 8px' }}>Kişisel verileriniz</h1>
      <p className="muted" style={{ marginBottom: 22 }}>
        {talep.eposta} · {rapor.toplamKayit} kayıt
      </p>

      {rapor.toplamKayit === 0 ? (
        <div className="prose" style={{ maxWidth: '62ch' }}>
          <p>Bu e-posta adresine bağlı hiçbir kaydımız yok.</p>
        </div>
      ) : (
        <>
          <div className="p-tablo-kap" style={{ maxWidth: 780 }}>
            <table className="p-tablo">
              <thead>
                <tr><th>Veri türü</th><th className="sayi">Kayıt</th><th>İşleme amacı</th></tr>
              </thead>
              <tbody>
                {rapor.kalemler.map((k) => (
                  <tr key={k.baslik}>
                    <td><b style={{ fontSize: 13.4 }}>{k.baslik}</b></td>
                    <td className="sayi">{k.kayitlar.length}</td>
                    <td className="tiny muted sarma">{k.amac}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
            <a className="btn btn-primary btn-lg"
              href={`/api/veri-talebi/indir?jeton=${encodeURIComponent(jeton ?? '')}`} download>
              <Icon n="grid" s={16} /> Tümünü indir (JSON)
            </a>
            <Link className="btn btn-ghost btn-lg" href="/veri-talebi">
              Silme talebi oluştur
            </Link>
          </div>
        </>
      )}

      <p className="tiny dim" style={{ marginTop: 20, maxWidth: '62ch' }}>
        Bu sayfa yalnızca doğrulama bağlantısıyla açılıyor ve bağlantı
        48 saat sonra geçersiz oluyor. Bağlantıyı paylaşmayın.
      </p>
    </div>
  );
}
