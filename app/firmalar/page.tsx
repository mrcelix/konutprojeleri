import Link from 'next/link';
import type { Metadata } from 'next';
import { firmalar, SEKTOR } from '@/lib/queries/firma';
import { yuzde } from '@/lib/format';
import { Pill } from '@/components/ui/Pill';

/**
 * Firmalar dizini — /firmalar
 *
 * 318 firma karnesiyle sıralanabilir halde. Bu sayfa aynı zamanda tüm firma
 * sayfalarına iç link merkezi; "İstanbul müteahhit firmaları" gibi
 * aramaların da karşılığı.
 *
 * Sıralama varsayılan olarak TESLİM GECİKMESİNE göre — sitenin iddiası bu.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Müteahhit Firmalar — Teslim Performansına Göre',
  description:
    'Konut projesi geliştiren firmalar, teslim performansı ve sicil notlarıyla. ' +
    'Karne yalnızca ilan arşivindeki teslim tarihlerinden ve panel verilerinden üretilir.',
  alternates: { canonical: '/firmalar' },
};

export default async function FirmalarSayfasi() {
  // Veritabanı yoksa derleme kırılmaz — sayfa boş durumla üretilir ve
  // ilk yeniden doğrulamada dolar. (CI ve önizleme dağıtımları için.)
  const liste = await firmalar().catch(() => []);

  if (liste.length === 0) {
    return (
      <main className="wrap" style={{ paddingBlock: 'var(--s-7)' }}>
        <h1 className="h1">Müteahhit firmalar</h1>
        <p className="prose">Firma listesi hazırlanıyor.</p>
      </main>
    );
  }

  // Not verilebilenler ile yeni firmalar ayrı gösterilir.
  // Eşik: 2 tamamlanmış proje.
  const notlu = liste.filter((f) => f.tamamlanan >= 2 && f.sicil);
  const yeni = liste.filter((f) => !(f.tamamlanan >= 2 && f.sicil));
  const enIyiler = notlu.slice(0, 3);

  return (
    <main className="wrap" style={{ paddingBlock: 'var(--s-5)' }}>
      <nav className="eyebrow" style={{ marginBottom: 'var(--s-3)' }}>
        <Link href="/">Ana sayfa</Link> › Firmalar
      </nav>

      <h1 className="h1">Müteahhit firmalar</h1>
      <p className="prose" style={{ marginBottom: 'var(--s-5)' }}>
        Aktif projesi olan <b>{liste.length} firma</b> teslim performansına göre
        sıralanabilir. Karne yalnızca ilan arşivindeki teslim tarihlerinden ve panel
        verilerinden üretilir; yorum, kullanıcı puanı veya reklam ilişkisi hesaba girmez.{' '}
        <Link href="/firma-karnesi-metodoloji" style={{ color: 'var(--brand)', fontWeight: 650 }}>
          Metodoloji
        </Link>
      </p>

      {/* En az geciktirenler */}
      {enIyiler.length > 0 && (
        <section style={{ marginBottom: 'var(--s-5)' }}>
          <h2 className="h2">En az geciktiren firmalar</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 'var(--s-3)' }}>
            {enIyiler.map((f) => (
              <Link
                key={f.slug}
                href={`/firmalar/${f.slug}`}
                style={{
                  background: 'linear-gradient(120deg, var(--tint-mint), var(--tint-stone))',
                  borderRadius: 'var(--r-block)', padding: 'var(--s-4)',
                  display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--s-3)',
                  alignItems: 'center',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 40, height: 40, borderRadius: 13, background: 'var(--surface-card)',
                    display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800,
                    color: 'var(--brand)',
                  }}
                >
                  {f.ad.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                </span>
                <span>
                  <b style={{ display: 'block', fontSize: 13.5, letterSpacing: '-0.02em' }}>{f.ad}</b>
                  <span style={{ fontSize: 10.5, color: 'var(--tint-mint-ink)' }} className="sayi">
                    Ort. gecikme <b>{f.ort_gecikme?.toFixed(1)} ay</b> · {f.tamamlanan} proje
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="kart" style={{ padding: 'var(--s-5)' }}>
        <div className="satir" style={{ marginBottom: 'var(--s-4)' }}>
          <h2 className="h2" style={{ margin: 0 }}>Tüm firmalar</h2>
          <span className="eyebrow" style={{ marginLeft: 'auto' }}>
            gecikme az → çok
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }} className="sayi">
            <thead>
              <tr>
                {['Firma', 'Sicil', 'Ort. gecikme', 'Zamanında', 'Tamamlanan', 'Aktif', ''].map((h) => (
                  <th key={h} className="eyebrow" style={{ textAlign: 'left', padding: '0 9px 8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...notlu, ...yeni].map((f) => {
                const notVar = f.tamamlanan >= 2 && f.sicil;
                const iyi = f.ort_gecikme != null && f.ort_gecikme < SEKTOR.ortGecikme;
                return (
                  <tr key={f.slug} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 9 }}>
                      <Link href={`/firmalar/${f.slug}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {f.ad}
                      </Link>
                      <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>
                        {f.kurulus_yili ? `${f.kurulus_yili} · ` : ''}{f.merkez_il ?? ''}
                      </span>
                    </td>
                    <td style={{ padding: 9 }}>
                      {notVar
                        ? <Pill durum="success">{f.sicil}</Pill>
                        : <Pill durum="brand">Yeni firma</Pill>}
                    </td>
                    <td style={{ padding: 9, fontWeight: 700, color: iyi ? 'var(--success)' : undefined }}>
                      {f.ort_gecikme != null ? `${f.ort_gecikme.toFixed(1)} ay` : '—'}
                    </td>
                    <td style={{ padding: 9 }}>
                      {f.zamaninda_orani != null ? yuzde(f.zamaninda_orani * 100) : '—'}
                    </td>
                    <td style={{ padding: 9 }}>{f.tamamlanan}</td>
                    <td style={{ padding: 9 }}>{f.aktif}</td>
                    <td style={{ padding: 9, textAlign: 'right' }}>
                      <Link href={`/firmalar/${f.slug}`} style={{ color: 'var(--brand)', fontWeight: 650 }}>
                        Karne →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="eyebrow" style={{ marginTop: 'var(--s-4)', textTransform: 'none', letterSpacing: 0, lineHeight: 1.6 }}>
          İki tamamlanmış projeden azı olan firmalara not verilmez; &ldquo;Yeni firma&rdquo;
          rozeti gösterilir. Yetersiz veriyle not vermek, düşük not vermekten daha
          yanıltıcıdır. Sektör ortalaması: <b>{SEKTOR.ortGecikme} ay</b> gecikme,
          <b> {yuzde(SEKTOR.zamanindaOrani * 100)}</b> zamanında teslim.
        </p>
      </section>
    </main>
  );
}
