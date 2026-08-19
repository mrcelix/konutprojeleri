import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Düzeltme talebi.
 *
 * Firma karnesinin hukuki dayanağının bir parçası: yayınladığımız veriye
 * itiraz kanalı açık olmalı ve makul sürede yanıtlanmalı. Firma sayfasından
 * ve proje sayfalarından buraya bağlantı verilir.
 *
 * Karne verisine itiraz eden FİRMALAR için ayrı ve daha resmi bir akış var
 * (firma paneli → itiraz, 5 iş günü sayacıyla). Bu sayfa herkese açık
 * genel düzeltme kanalıdır.
 */

export const metadata: Metadata = {
  title: 'Düzeltme talebi',
  description: 'Sitede hatalı gördüğünüz bilgiyi bildirin.',
  alternates: { canonical: '/duzeltme' },
  robots: { index: false, follow: true },
};

export default function DuzeltmeSayfasi() {
  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-7)', maxWidth: 620 }}>
      <h1 className="kp-h1">Düzeltme talebi</h1>
      <p className="kp-lead" style={{ marginBottom: 'var(--s-5)' }}>
        Sitede hatalı gördüğünüz bir bilgi varsa bildirin. Talepler <b>5 iş günü</b> içinde
        incelenir. Düzeltme yapılırsa <b>düzeltme kaydı sayfada görünür kalır</b> —
        sessiz düzeltme yapılmaz.
      </p>

      <form className="kp-card" style={{ padding: 'var(--s-5)' }} action="/api/duzeltme" method="post">
        <Alan ad="sayfa" etiket="Hatalı bilgiyi gördüğünüz sayfa" tip="url" gerekli
              ipucu="Adres çubuğundaki bağlantıyı yapıştırabilirsiniz" />
        <Alan ad="ad" etiket="Ad Soyad" tip="text" gerekli />
        <Alan ad="eposta" etiket="E-posta" tip="email" gerekli
              ipucu="Sonucu buraya bildiririz" />

        <label className="kp-field" style={{ display: 'block', marginBottom: 8 }}>
          <span className="kp-field__label">Hangi bilgi hatalı? *</span>
          <textarea
            name="aciklama"
            required
            rows={4}
            className="kp-field__value"
            style={{
              border: 0, background: 'transparent', width: '100%', padding: 0,
              font: 'inherit', color: 'inherit', resize: 'vertical',
            }}
          />
        </label>
        <p className="kp-label" style={{ textTransform: 'none', letterSpacing: 0, marginBottom: 'var(--s-4)', lineHeight: 1.55 }}>
          Belgeye dayanan bildirimler daha hızlı sonuçlanır. Belge varsa e-posta ile
          gönderebilirsiniz.
        </p>

        <label style={{ display: 'flex', gap: 8, fontSize: 10.5, color: 'var(--text-muted)', margin: 'var(--s-3) 0', lineHeight: 1.45 }}>
          <input type="checkbox" name="kvkk" required />
          <span>
            Kişisel verilerin işlenmesine ilişkin{' '}
            <Link href="/kvkk" style={{ color: 'var(--brand)', fontWeight: 650 }}>aydınlatma metnini</Link>{' '}
            okudum.
          </span>
        </label>

        <button type="submit" className="kp-btn" style={{ width: '100%' }}>
          Düzeltme talebi gönder
        </button>
      </form>

      <div className="kp-card" style={{ padding: 'var(--s-4)', marginTop: 'var(--s-4)', background: 'var(--tint-butter)' }}>
        <b style={{ display: 'block', fontSize: 12.5, color: 'var(--tint-butter-ink)', marginBottom: 4 }}>
          Firma yetkilisi misiniz?
        </b>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--tint-butter-ink)', lineHeight: 1.5 }}>
          Karne verilerine itiraz için firma panelini kullanın. Panelden yapılan itirazlar
          belge ekiyle birlikte gelir ve ilgili satır inceleme boyunca sayfada
          &ldquo;itiraz edildi&rdquo; olarak görünür.
        </p>
      </div>
    </main>
  );
}

function Alan({
  ad, etiket, tip, gerekli, ipucu,
}: { ad: string; etiket: string; tip: string; gerekli?: boolean; ipucu?: string }) {
  return (
    <>
      <label className="kp-field" style={{ display: 'block', marginBottom: ipucu ? 4 : 8 }}>
        {/* Görünür label — yalnızca placeholder erişilebilirlik ihlali */}
        <span className="kp-field__label">{etiket}{gerekli && ' *'}</span>
        <input
          name={ad}
          type={tip}
          required={gerekli}
          className="kp-field__value"
          style={{ border: 0, background: 'transparent', width: '100%', padding: 0, font: 'inherit', color: 'inherit' }}
        />
      </label>
      {ipucu && (
        <p className="kp-label" style={{ textTransform: 'none', letterSpacing: 0, marginBottom: 10 }}>
          {ipucu}
        </p>
      )}
    </>
  );
}
