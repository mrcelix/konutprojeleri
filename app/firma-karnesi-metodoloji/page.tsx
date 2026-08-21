import Link from 'next/link';
import type { Metadata } from 'next';
import { SEKTOR } from '@/lib/queries/firma';

/**
 * Firma karnesi metodolojisi.
 *
 * Karnenin hukuki ve itibari dayanağı. Her firma sayfasından buraya
 * bağlantı verilir; sayfa olmadan karne savunulamaz.
 *
 * İki bölüm özellikle önemli: "Karneye girmeyenler" ve "Sürüm geçmişi".
 * Formül değişirse eski notlar geriye dönük yeniden hesaplanır ve kaç
 * firmanın notunun değiştiği burada yazılır — sessiz değişiklik yapılmaz.
 */

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Firma Karnesi Metodolojisi',
  description:
    'Firma karnesi yalnızca doğrulanabilir dört veriden hesaplanır: teslim isabeti, ' +
    'deneyim hacmi, veri şeffaflığı ve talep yanıt süresi. Yorum, kullanıcı puanı ve ' +
    'reklam ilişkisi hesaba girmez.',
  alternates: { canonical: '/firma-karnesi-metodoloji' },
};

const BILESENLER = [
  {
    ad: 'Teslim isabeti', agirlik: 40,
    olcum: 'Satış aşamasında ilan edilen teslim çeyreğinin son ayı ile gerçekleşen teslim arasındaki ay farkının ortalaması',
    kaynak: 'İlan arşivi + teslim kaydı',
  },
  {
    ad: 'Deneyim hacmi', agirlik: 20,
    olcum: 'Tamamlanan proje ve konut sayısı; logaritmik ölçek — 1 ile 30 proje arasındaki fark abartılmaz',
    kaynak: 'İlan arşivi',
  },
  {
    ad: 'Veri şeffaflığı', agirlik: 20,
    olcum: 'Fiyat, stok, kat planı ve şantiye bilgisinin güncelliği — proje sayfalarındaki veri sağlığı skorunun ortalaması',
    kaynak: 'Firma paneli',
  },
  {
    ad: 'Talep yanıt süresi', agirlik: 20,
    olcum: 'Talebin firmaya iletilmesi ile firmanın numarayı açması arasındaki ortalama süre',
    kaynak: 'Firma paneli',
  },
];

const GIRMEYENLER = [
  ['Abonelik paketi ve reklam harcaması',
   'Ücretli pakete geçmek notu değiştirmez; ücretsiz katmandaki bir firma A alabilir.'],
  ['Kullanıcı puanı ve yorumlar',
   'Sakin değerlendirmeleri firma sayfasında ayrı gösterilir, karne hesabına katılmaz.'],
  ['Proje kalitesi ve mimari',
   'Ölçülebilir olmadığı için değerlendirilmez.'],
  ['Mali durum ve kredi notu',
   'Erişimimizde olmayan ve doğrulayamayacağımız veridir.'],
  ['Basına yansıyan uyuşmazlıklar',
   'Haber arşivimizde yer alır, karneye girmez.'],
];

export default function MetodolojiSayfasi() {
  return (
    <main className="wrap" style={{ paddingBlock: 'var(--s-5)', maxWidth: 860 }}>
      <nav className="eyebrow" style={{ marginBottom: 'var(--s-3)' }}>
        <Link href="/">Ana sayfa</Link> › <Link href="/firmalar">Firmalar</Link> › Metodoloji
      </nav>

      <h1 className="h1">Firma Karnesi Metodolojisi</h1>
      <p className="prose" style={{ marginBottom: 'var(--s-5)' }}>
        Firma karnesi, yalnızca <b>doğrulanabilir dört veriden</b> hesaplanır. Yorum, editör
        kanaati, kullanıcı puanı veya reklam ilişkisi karneye girmez.
        Sürüm <b>1.0</b> · yürürlük tarihi 1 Eylül 2026.
      </p>

      {/* Bileşenler */}
      <section className="kart" style={{ padding: 'var(--s-5)', marginBottom: 'var(--s-4)' }}>
        <h2 className="h2">Bileşenler ve ağırlıklar</h2>
        <p className="eyebrow" style={{ marginBottom: 'var(--s-4)' }}>toplam 100 puan</p>

        <div style={{ display: 'grid', gap: 'var(--s-3)', marginBottom: 'var(--s-5)' }}>
          {BILESENLER.map((b) => (
            <div key={b.ad} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 44px', gap: 'var(--s-3)', alignItems: 'center', fontSize: 12.5 }}>
              <span style={{ fontWeight: 650 }}>{b.ad}</span>
              <span style={{ height: 22, background: 'var(--surface-sunken)', borderRadius: 7, position: 'relative' }}>
                <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${(b.agirlik / 40) * 100}%`, background: 'var(--brand)', borderRadius: 7 }} />
              </span>
              <b style={{ textAlign: 'right' }} className="sayi">{b.agirlik}</b>
            </div>
          ))}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr>
                {['Bileşen', 'Nasıl ölçülür', 'Veri kaynağı'].map((h) => (
                  <th key={h} className="eyebrow" style={{ textAlign: 'left', padding: '0 9px 8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BILESENLER.map((b) => (
                <tr key={b.ad} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 9, fontWeight: 650, whiteSpace: 'nowrap' }}>{b.ad}</td>
                  <td style={{ padding: 9, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{b.olcum}</td>
                  <td style={{ padding: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{b.kaynak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Eşikler ve itiraz */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'var(--s-4)', marginBottom: 'var(--s-4)' }}>
        <section className="kart" style={{ padding: 'var(--s-5)' }}>
          <h2 className="h2">Eşikler</h2>
          <dl style={{ margin: 0, display: 'grid', gap: 0, fontSize: 12.5 }}>
            <Esik ad="Not verilebilmesi için" deger="2+ tamamlanmış proje" />
            <Esik ad="Altındaki firmalar" deger="“Yeni firma”" />
            <Esik ad="10 yıldan eski projeler" deger="Ağırlık %50" />
            <Esik ad="2020–21 dönemi" deger="Ayrı işaretli" />
            <Esik ad="Sektör ortalaması" deger={`${SEKTOR.ortGecikme} ay gecikme`} />
          </dl>
          <p className="eyebrow" style={{ marginTop: 'var(--s-3)', textTransform: 'none', letterSpacing: 0, lineHeight: 1.55 }}>
            Yetersiz veriyle not vermek, düşük not vermekten daha yanıltıcıdır.
          </p>
        </section>

        <section className="kart" style={{ padding: 'var(--s-5)' }}>
          <h2 className="h2">İtiraz süreci</h2>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--text-secondary)', display: 'grid', gap: 8, lineHeight: 1.55 }}>
            <li>Firma panelden ilgili veri satırına itiraz eder, belge ekler.</li>
            <li>Satır sayfada <b>“itiraz edildi”</b> olarak görünür.</li>
            <li>İtiraz <b>5 iş günü</b> içinde sonuçlandırılır.</li>
            <li>Düzeltme yapılırsa <b>düzeltme kaydı sayfada kalır</b> — sessiz düzeltme yapılmaz.</li>
          </ol>
        </section>
      </div>

      {/* Karneye girmeyenler */}
      <section className="kart" style={{ padding: 'var(--s-5)', marginBottom: 'var(--s-4)' }}>
        <h2 className="h2">Karneye girmeyenler</h2>
        <p className="eyebrow" style={{ marginBottom: 'var(--s-4)' }}>bilinçli olarak dışarıda tuttuklarımız</p>
        <div style={{ display: 'grid', gap: 10 }}>
          {GIRMEYENLER.map(([ad, aciklama]) => (
            <div key={ad} style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 10, fontSize: 12.5, lineHeight: 1.6 }}>
              <span aria-hidden style={{ color: 'var(--danger)', fontWeight: 800 }}>×</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                <b style={{ color: 'var(--text-primary)' }}>{ad}.</b> {aciklama}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Sürüm geçmişi */}
      <section className="kart" style={{ padding: 'var(--s-5)' }}>
        <h2 className="h2">Metodoloji sürüm geçmişi</h2>
        <p className="eyebrow" style={{ marginBottom: 'var(--s-3)' }}>formül değişirse burada duyurulur</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }} className="sayi">
          <thead>
            <tr>
              {['Sürüm', 'Tarih', 'Değişiklik', 'Etkilenen firma'].map((h) => (
                <th key={h} className="eyebrow" style={{ textAlign: 'left', padding: '0 9px 8px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: 9, fontWeight: 700 }}>1.0</td>
              <td style={{ padding: 9 }}>01.09.2026</td>
              <td style={{ padding: 9, color: 'var(--text-secondary)' }}>İlk yayın</td>
              <td style={{ padding: 9, color: 'var(--text-muted)' }}>—</td>
            </tr>
          </tbody>
        </table>
        <p className="eyebrow" style={{ marginTop: 'var(--s-4)', textTransform: 'none', letterSpacing: 0, lineHeight: 1.6 }}>
          Formül değiştiğinde eski notlar geriye dönük olarak yeniden hesaplanır ve bu tabloda
          kaç firmanın notunun değiştiği yazılır. <b>Sessiz formül değişikliği yapılmaz.</b>
        </p>
      </section>
    </main>
  );
}

function Esik({ ad, deger }: { ad: string; deger: string }) {
  return (
    <div className="satir" style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
      <dt style={{ color: 'var(--text-secondary)' }}>{ad}</dt>
      <dd style={{ margin: '0 0 0 auto', fontWeight: 700 }}>{deger}</dd>
    </div>
  );
}
