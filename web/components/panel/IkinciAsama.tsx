'use client';

import { useActionState, useState } from 'react';
import Icon from '@/components/Icon';
import { ikinciAsamaAc, ikinciAsamaHazirla, ikinciAsamaKapat } from '@/lib/panel-eylemler';

/* ============================================================
   İki adımlı doğrulama kurulum arayüzü.

   Akış bilinçli olarak üç adımlı:
     1. Gizli anahtar üret + QR göster
     2. Kullanıcı ilk kodu doğru girsin  ← ancak burada AÇILIR
     3. Yedek kodları göster (bir kez)

   2. adım olmadan açmak, kullanıcının telefonuna yanlış kaydettiği
   bir anahtarla kendi hesabını kilitlemesi demek.
   ============================================================ */

interface Kurulum { gizli: string; uri: string; okunakli: string; qr: string }

export default function IkinciAsama({ aktif, kalanYedek }: { aktif: boolean; kalanYedek: number }) {
  const [kurulum, setKurulum] = useState<Kurulum | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [acDurum, acGonder, acBekliyor] = useActionState(ikinciAsamaAc, null);
  const [kapatDurum, kapatGonder, kapatBekliyor] = useActionState(ikinciAsamaKapat, null);
  const [kapatAcik, setKapatAcik] = useState(false);

  async function baslat() {
    setYukleniyor(true);
    try {
      const h = await ikinciAsamaHazirla();
      const qr = await fetch(`/api/totp-qr?u=${encodeURIComponent(h.uri)}`).then((r) => r.text());
      setKurulum({ ...h, qr });
    } finally {
      setYukleniyor(false);
    }
  }

  /* ---- Yedek kodlar üretildi: bir kez gösterilir ---- */
  if (acDurum?.yedekler) {
    return (
      <div className="p-kart">
        <h2 className="h3" style={{ color: 'var(--success)' }}>
          <Icon n="check" s={18} sw={2.4} /> İki adımlı doğrulama açıldı
        </h2>
        <p className="muted small" style={{ margin: '10px 0 16px' }}>
          Aşağıdaki yedek kodları <b>şimdi kaydedin</b>. Bu ekran bir daha gösterilmeyecek.
          Telefonunuza erişemediğinizde her kod bir kez kullanılabilir.
        </p>
        <ul className="yedek-kodlar">
          {acDurum.yedekler.map((y) => <li key={y}><code>{y}</code></li>)}
        </ul>
        <p className="tiny dim" style={{ marginTop: 14 }}>
          Kodları parola yöneticinize kaydedin. E-posta ile kendinize göndermeyin —
          e-posta hesabınız ele geçerse ikinci adımın anlamı kalmaz.
        </p>
      </div>
    );
  }

  /* ---- 2FA açık ---- */
  if (aktif) {
    return (
      <div className="p-kart">
        <h2 className="h3" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--success)', display: 'inline-flex' }}>
            <Icon n="check" s={18} sw={2.4} />
          </span>
          İki adımlı doğrulama açık
        </h2>
        <p className="muted small" style={{ margin: '8px 0 14px' }}>
          Girişte parolanızın ardından doğrulayıcı uygulamanızdaki kod isteniyor.
          Kalan yedek kod: <b>{kalanYedek}</b>
          {kalanYedek <= 2 && (
            <span style={{ color: 'var(--danger)' }}> — azaldı, kapatıp yeniden açarak yenileyin.</span>
          )}
        </p>

        {!kapatAcik ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setKapatAcik(true)}>
            İki adımlı doğrulamayı kapat
          </button>
        ) : (
          <form action={kapatGonder} className="p-form" style={{ maxWidth: 320 }}>
            <div className="p-alan">
              <label htmlFor="parola-kapat">Parolanız</label>
              <input id="parola-kapat" name="parola" type="password" required autoComplete="current-password" />
            </div>
            {kapatDurum?.hata && <p className="form-hata" role="alert">{kapatDurum.hata}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" type="submit" disabled={kapatBekliyor}>
                {kapatBekliyor ? 'Kapatılıyor…' : 'Onayla ve kapat'}
              </button>
              <button className="btn btn-quiet btn-sm" type="button" onClick={() => setKapatAcik(false)}>
                Vazgeç
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  /* ---- Kurulum ---- */
  return (
    <div className="p-kart">
      <h2 className="h3">İki adımlı doğrulama</h2>
      <p className="muted small" style={{ margin: '8px 0 16px' }}>
        Parolanız ele geçse bile hesabınıza girilemez. Google Authenticator,
        Authy, 1Password veya Microsoft Authenticator kullanabilirsiniz.
      </p>

      {!kurulum ? (
        <button className="btn btn-primary btn-sm" onClick={baslat} disabled={yukleniyor}>
          {yukleniyor ? 'Hazırlanıyor…' : 'Kurulumu başlat'}
        </button>
      ) : (
        <div className="totp-kurulum">
          <div
            className="totp-qr"
            // Sunucuda üretilen SVG — istemciye QR kütüphanesi gitmiyor
            dangerouslySetInnerHTML={{ __html: kurulum.qr }}
          />
          <div style={{ minWidth: 0 }}>
            <p className="small"><b>1.</b> Uygulamanızla QR kodunu okutun.</p>
            <p className="small" style={{ marginTop: 6 }}>
              Okutamıyorsanız anahtarı elle girin:
            </p>
            <code className="totp-gizli">{kurulum.okunakli}</code>

            <form action={acGonder} className="p-form" style={{ marginTop: 14, maxWidth: 260 }}>
              <div className="p-alan">
                <label htmlFor="kod-ac"><b>2.</b> Uygulamadaki 6 haneli kod</label>
                <input
                  id="kod-ac" name="kod" required inputMode="numeric" maxLength={6}
                  placeholder="123456" autoComplete="off"
                  style={{ letterSpacing: '.18em', textAlign: 'center' }}
                />
              </div>
              {acDurum?.hata && <p className="form-hata" role="alert">{acDurum.hata}</p>}
              <button className="btn btn-primary btn-sm" type="submit" disabled={acBekliyor}>
                {acBekliyor ? 'Doğrulanıyor…' : 'Doğrula ve aç'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
