import Link from 'next/link';
import type { Metadata } from 'next';
import { endeksVerisi, donemAdi, type BolgeEndeks } from '@/lib/queries/endeks';
import { CizgiGrafik, Sparkline, type Seri } from '@/components/Grafik';
import { para, yuzde } from '@/lib/format';
import { Pill } from '@/components/ui/Pill';

/**
 * m² Fiyat Endeksi.
 *
 * Firma karnesiyle birlikte sitenin en güçlü ayrıştırıcısı. Veri kaynağı
 * zaten elinizde: fiyat arşivi her güncellemede kendiliğinden birikiyor.
 *
 * Sayfanın güvenilirliği METODOLOJİ KUTUSUNA bağlı — neyin dahil
 * OLMADIĞINI açıkça yazmak zayıflık değil güç. Yazılmazsa ilk ciddi
 * eleştiride endeksin tamamı tartışmaya açılır.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Konut Projeleri m² Fiyat Endeksi',
  description:
    'Türkiye genelinde satışta olan yeni konut projelerinin metrekare satış ' +
    'fiyatlarından hesaplanan endeks. İkinci el konut dahil değildir. ' +
    'İl ve ilçe kırılımıyla, aylık ve yıllık değişim oranlarıyla.',
  alternates: { canonical: '/fiyat-endeksi' },
};

const IL_ADLARI: Record<string, string> = {
  istanbul: 'İstanbul', ankara: 'Ankara', izmir: 'İzmir',
  bursa: 'Bursa', antalya: 'Antalya', kocaeli: 'Kocaeli',
};

const ilAdi = (s: string) => IL_ADLARI[s] ?? s.charAt(0).toUpperCase() + s.slice(1);

export default async function EndeksSayfasi() {
  const veri = await endeksVerisi().catch(() => null);

  if (!veri || veri.turkiye.m2 == null) {
    return (
      <main className="kp-wrap" style={{ paddingBlock: 'var(--s-7)' }}>
        <h1 className="kp-h1">Konut Projeleri m² Fiyat Endeksi</h1>
        <p className="kp-lead">
          Endeks, fiyat arşivi biriktikçe hesaplanır. Seri henüz oluşmadı.
        </p>
      </main>
    );
  }

  const { turkiye, bolgeler, guncelDonem } = veri;
  const donem = donemAdi(guncelDonem);
  const istanbul = bolgeler.find((b) => b.il === 'istanbul');

  const seriler: Seri[] = [
    { ad: 'Türkiye', nokta: turkiye.seri, renk: 'var(--brand)', dolgulu: true },
    ...(istanbul
      ? [{ ad: 'İstanbul', nokta: istanbul.seri, renk: 'var(--success)' } satisfies Seri]
      : []),
  ];

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-5)' }}>
      <JsonLd donem={donem} m2={turkiye.m2} />

      <nav className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>
        <Link href="/">Ana sayfa</Link> › Konut Projeleri m² Fiyat Endeksi
      </nav>

      <h1 className="kp-h1">Konut Projeleri m² Fiyat Endeksi</h1>
      <p className="kp-lead" style={{ marginBottom: 'var(--s-5)' }}>
        Türkiye genelinde satışta olan <b>{turkiye.projeSayisi} yeni konut projesinin</b>{' '}
        metrekare satış fiyatlarından hesaplanır. <b>İkinci el konut dahil değildir.</b>{' '}
        Her hafta pazartesi yeniden hesaplanır; son güncelleme <b>{donem}</b>.
      </p>

      {/* Manşet + metodoloji */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px',
          gap: 'var(--s-4)', marginBottom: 'var(--s-4)', alignItems: 'stretch',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(115deg, var(--tint-blue), var(--tint-lav))',
            borderRadius: 'var(--r-card)', padding: 'var(--s-5)',
          }}
        >
          <p className="kp-label" style={{ marginBottom: 6 }}>Türkiye ortalaması</p>
          <span
            style={{
              fontSize: 42, fontWeight: 800, letterSpacing: '-0.04em',
              lineHeight: 1, display: 'block', color: 'var(--brand-strong)',
            }}
            className="tabular"
          >
            {para(turkiye.m2)}/m²
          </span>
          <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {donem} · {turkiye.projeSayisi} projeden,{' '}
            <b>konut sayısına göre ağırlıklandırılmış</b>
          </p>

          <dl
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--s-3)', margin: 'var(--s-4) 0 0',
            }}
          >
            <Delta ad="Aylık" v={turkiye.aylik} />
            <Delta ad="Yıllık" v={turkiye.yillik} />
            <Delta ad="5 yıllık" v={turkiye.besYillik} />
          </dl>
        </div>

        {/* Metodoloji — sayfanın güvenilirliği buna bağlı */}
        <aside className="kp-card" style={{ padding: 'var(--s-5)' }}>
          <h2 className="kp-h3" style={{ marginBottom: 'var(--s-3)' }}>Nasıl hesaplanır</h2>
          <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 9, fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <li>Yalnızca <b>yeni konut projeleri</b>. İkinci el ilanları, arsa ve ticari birimler dışarıda.</li>
            <li>Fiyatlar firmaların beyan ettiği <b>liste fiyatlarıdır</b>, tapu devir bedelleri değil. Pazarlık payı yansımaz.</li>
            <li>Ortalama, projedeki <b>konut sayısına göre ağırlıklandırılır</b> — 800 daireli proje, 40 dairelikten 20 kat ağırlık taşır.</li>
            <li>Fiyatı <b>90 günden eski</b> projeler hesaba katılmaz.</li>
            <li>Bölge ortalamasından aşırı sapan kayıtlar <b>aykırı değer</b> olarak elenir.</li>
          </ul>
        </aside>
      </div>

      {/* Seri */}
      <section className="kp-card" style={{ padding: 'var(--s-5)', marginBottom: 'var(--s-4)' }}>
        <div className="kp-row" style={{ marginBottom: 'var(--s-4)' }}>
          <h2 className="kp-h2" style={{ margin: 0 }}>Aylık seyir</h2>
          <span className="kp-label" style={{ marginLeft: 'auto' }}>nominal · ₺/m²</span>
        </div>

        <CizgiGrafik seriler={seriler} />

        <div className="kp-row" style={{ gap: 'var(--s-4)', marginTop: 'var(--s-3)', fontSize: 11.5 }}>
          {seriler.map((s) => (
            <span key={s.ad} className="kp-row" style={{ gap: 7 }}>
              <span aria-hidden style={{ width: 16, height: 3, borderRadius: 2, background: s.renk, display: 'block' }} />
              <span style={{ color: 'var(--text-secondary)' }}>
                {s.ad} · {para(s.nokta[s.nokta.length - 1]?.m2 ?? null)}
              </span>
            </span>
          ))}
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
            Nominal değerler — enflasyondan arındırılmamıştır
          </span>
        </div>
      </section>

      {/* Bölge tablosu */}
      <section className="kp-card" style={{ padding: 'var(--s-5)', marginBottom: 'var(--s-4)' }}>
        <div className="kp-row" style={{ marginBottom: 'var(--s-4)' }}>
          <h2 className="kp-h2" style={{ margin: 0 }}>İl endeksleri</h2>
          <span className="kp-label" style={{ marginLeft: 'auto' }}>m² fiyatına göre</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }} className="tabular">
            <thead>
              <tr>
                {['Bölge', 'm² fiyatı', 'Aylık', 'Yıllık', 'Proje', 'Daire', '12 aylık seyir'].map((h) => (
                  <th key={h} className="kp-label" style={{ textAlign: 'left', padding: '0 9px 8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bolgeler.map((b) => (
                <Satir key={b.il} b={b} />
              ))}
            </tbody>
          </table>
        </div>

        <p className="kp-label" style={{ marginTop: 'var(--s-4)', textTransform: 'none', letterSpacing: 0, lineHeight: 1.6 }}>
          En az 5 projesi olmayan bölge için endeks yayınlanmaz — az sayıda projeden
          hesaplanan ortalama tek bir lansmanla savrulur.
        </p>
      </section>

      {/* Sınır uyarısı — zayıflık değil, güç */}
      <section
        style={{
          background: 'var(--warning-bg)', borderRadius: 'var(--r-card)',
          padding: 'var(--s-5)', marginBottom: 'var(--s-4)',
        }}
      >
        <h2 className="kp-h3" style={{ color: 'var(--warning)', marginBottom: 6 }}>
          Endeksin bilinen sınırı
        </h2>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--warning)', lineHeight: 1.7, maxWidth: '78ch' }}>
          Bu endeks firmaların beyan ettiği <b>liste fiyatlarına</b> dayanır, tapu devir
          bedellerine değil. Gerçekleşen satış fiyatı pazarlık payı nedeniyle bunun altında
          olabilir. Endeksi bir <b>eğilim göstergesi</b> olarak okuyun; tek bir dairenin
          değerlemesi yerine geçmez.
        </p>
      </section>

      {/* Rapor */}
      <section
        style={{
          background: 'var(--tint-butter)', borderRadius: 'var(--r-card)',
          padding: 'var(--s-5)', display: 'flex', alignItems: 'center',
          gap: 'var(--s-4)', flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <b style={{ display: 'block', fontSize: 16, letterSpacing: '-0.025em', color: 'var(--tint-butter-ink)', marginBottom: 4 }}>
            {donem} Konut Projeleri Raporu
          </b>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--tint-butter-ink)', lineHeight: 1.6, maxWidth: '58ch' }}>
            Endeksin aylık özeti, yeni lansmanlar, teslim edilen projeler ve bölge analizleri.
            Basın kullanımına açıktır, <b>kaynak gösterilerek</b> alıntılanabilir.
          </p>
        </div>
        <span
          className="kp-btn"
          style={{ background: 'var(--tint-butter-ink)', borderColor: 'var(--tint-butter-ink)', color: '#fff' }}
        >
          Raporu indir · PDF
        </span>
      </section>
    </main>
  );
}

/* ── parçalar ── */

function Delta({ ad, v }: { ad: string; v: number | null }) {
  // Kıyas noktası yoksa uydurma değer gösterilmez
  if (v == null) {
    return (
      <div style={{ background: 'rgba(255,255,255,.55)', borderRadius: 'var(--r-block)', padding: 'var(--s-3)' }}>
        <dt className="kp-label">{ad}</dt>
        <dd style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Yeterli veri yok</dd>
      </div>
    );
  }
  return (
    <div style={{ background: 'rgba(255,255,255,.55)', borderRadius: 'var(--r-block)', padding: 'var(--s-3)' }}>
      <dt className="kp-label">{ad}</dt>
      <dd
        style={{
          margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em',
          color: v >= 0 ? 'var(--success)' : 'var(--danger)',
        }}
        className="tabular"
      >
        {yuzde(v, { isaretli: true, basamak: 1 })}
      </dd>
    </div>
  );
}

function Satir({ b }: { b: BolgeEndeks }) {
  const artiyor = (b.yillik ?? 0) >= 0;
  return (
    <tr style={{ borderTop: '1px solid var(--border)' }}>
      <td style={{ padding: 9, fontWeight: 700, color: 'var(--text-primary)' }}>
        <Link href={`/${b.il}-konut-projeleri`}>{ilAdi(b.il)}</Link>
      </td>
      <td style={{ padding: 9, fontWeight: 700 }}>{para(b.m2)}</td>
      <td style={{ padding: 9 }}>
        {b.aylik == null ? '—' : (
          <Pill durum={b.aylik >= 0 ? 'success' : 'danger'}>
            {yuzde(b.aylik, { isaretli: true, basamak: 1 })}
          </Pill>
        )}
      </td>
      <td style={{ padding: 9 }}>
        {b.yillik == null ? '—' : (
          <Pill durum={b.yillik >= 0 ? 'success' : 'danger'}>
            {yuzde(b.yillik, { isaretli: true, basamak: 1 })}
          </Pill>
        )}
      </td>
      <td style={{ padding: 9 }}>{b.projeSayisi}</td>
      <td style={{ padding: 9 }}>{b.daireSayisi.toLocaleString('tr-TR')}</td>
      <td style={{ padding: 9 }}>
        <Sparkline nokta={b.seri} renk={artiyor ? 'var(--success)' : 'var(--danger)'} />
      </td>
    </tr>
  );
}

/**
 * Dataset şeması — endeks bir veri kümesidir, ürün değil.
 * Fiyatı Offer olarak işaretlemek yanlış olurdu: satılan bir şey yok.
 */
function JsonLd({ donem, m2 }: { donem: string | null; m2: number | null }) {
  const veri = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Konut Projeleri m² Fiyat Endeksi',
    description:
      'Türkiye genelinde satışta olan yeni konut projelerinin metrekare liste ' +
      'satış fiyatlarından hesaplanan aylık endeks. İkinci el konut dahil değildir.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/fiyat-endeksi`,
    temporalCoverage: donem ?? undefined,
    spatialCoverage: { '@type': 'Place', name: 'Türkiye' },
    variableMeasured: {
      '@type': 'PropertyValue',
      name: 'Ortalama m² satış fiyatı',
      value: m2 ?? undefined,
      unitText: 'TRY/m²',
    },
    creator: { '@type': 'Organization', name: 'Konutprojeleri.com' },
    isAccessibleForFree: true,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(veri) }} />;
}
