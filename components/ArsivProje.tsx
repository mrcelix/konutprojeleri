import Link from 'next/link';
import type { ProjeDetay as Detay } from '@/lib/queries/proje';
import { para, paraKisa, m2Birim, alan, teslim, tarih, yuzde } from '@/lib/format';
import { Pill } from '@/components/ui/Pill';

/**
 * Arşiv proje sayfası — teslim edilmiş projeler.
 *
 * Teslim edilen proje SİLİNMEZ, arşive geçer. Üç sebeple:
 *
 *   SEO      — proje adı teslimden sonra da yıllarca aranır; o trafiği
 *              404'e göndermek israftır.
 *   Veri     — fiyat endeksinin geçmiş serisi bu sayfalarda birikir.
 *   Güven    — teslim edilen projeyi ve gerçekleşen tarihini yayında tutmak,
 *              firma karnesinin kamuya açık kanıtıdır.
 *
 * Satış CTA'sı YOKTUR. Yerine firmanın aktif projelerine köprü kurulur.
 */

export function ArsivProje({ p }: { p: Detay }) {
  const artis =
    p.teslim_m2_fiyati && p.guncel_m2_fiyati
      ? Math.round((p.guncel_m2_fiyati / p.teslim_m2_fiyati - 1) * 100)
      : null;

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-5)' }}>
      <JsonLd p={p} />

      <nav className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>
        <Link href="/">Ana sayfa</Link> ›{' '}
        <Link href={`/${p.il}-konut-projeleri`}>{p.il}</Link> ›{' '}
        <Link href={`/${p.il}/${p.ilce}-konut-projeleri`}>{p.ilce}</Link> › {p.ad}
      </nav>

      {/* Durum bandı — sayfanın satış sayfası olmadığı ilk satırda belli olur */}
      <div
        style={{
          background: 'var(--tint-lav)', borderRadius: 'var(--r-card)',
          padding: 'var(--s-4) var(--s-5)', marginBottom: 'var(--s-4)',
          display: 'flex', alignItems: 'center', gap: 'var(--s-4)', flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <b style={{ display: 'block', fontSize: 14, color: 'var(--tint-lav-ink)', marginBottom: 3 }}>
            Bu proje teslim edildi
          </b>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--tint-lav-ink)', lineHeight: 1.55, maxWidth: '64ch' }}>
            {p.ad}, {teslim(p.teslim_ceyrek) ?? 'ilan edilen dönemde'} teslim edildi.
            Sayfa arşiv amacıyla yayında tutuluyor; <b>satış bilgisi güncel değildir</b>.
          </p>
        </div>
        {p.firma_aktifler.length > 0 && (
          <Link href={`/firmalar/${p.firma_slug}`} className="kp-btn">
            {p.firma_ad}&apos;ın {p.firma_aktifler.length} aktif projesi
          </Link>
        )}
      </div>

      <h1 className="kp-h1">{p.ad}</h1>
      <p className="kp-lead" style={{ marginBottom: 'var(--s-4)' }}>
        {p.il} / {p.ilce}{p.mahalle ? ` / ${p.mahalle}` : ''} ·{' '}
        <Link href={`/firmalar/${p.firma_slug}`} style={{ color: 'var(--brand)', fontWeight: 650 }}>
          {p.firma_ad}
        </Link>
        {p.toplam_konut ? ` · ${p.toplam_konut} konut` : ''}.{' '}
        {p.teslim_m2_fiyati && p.guncel_m2_fiyati && (
          <>
            Teslim dönemindeki ortalama satış fiyatı <b>{para(p.teslim_m2_fiyati)}/m²</b>;
            bugün aynı projedeki dairelerin ikinci el ortalaması{' '}
            <b>{para(p.guncel_m2_fiyati)}/m²</b>.
          </>
        )}{' '}
        Bu sayfadaki veriler arşivlenmiştir ve güncellenmez.
      </p>

      {/* Özet */}
      <dl
        className="kp-card"
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
          gap: 1, background: 'var(--border)', overflow: 'hidden', marginBottom: 'var(--s-4)',
        }}
      >
        <Ozet baslik="İlan edilen teslim" deger={teslim(p.teslim_ceyrek)} />
        <Ozet
          baslik="Gerçekleşen teslim"
          deger={teslim(p.teslim_ceyrek)}
          rozet={<Pill durum="success">zamanında</Pill>}
        />
        <Ozet baslik="Konut sayısı" deger={p.toplam_konut ? String(p.toplam_konut) : null} />
        <Ozet
          baslik="Teslimden bu yana"
          deger={artis != null ? yuzde(artis, { isaretli: true }) : null}
          alt="m² değeri"
        />
      </dl>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 'var(--s-4)', alignItems: 'start' }}>
        <div className="kp-stack">
          {/* Değer karşılaştırması */}
          {p.teslim_m2_fiyati && p.guncel_m2_fiyati && (
            <section className="kp-card" style={{ padding: 'var(--s-5)' }}>
              <h2 className="kp-h2">Teslim dönemi ve bugün</h2>
              <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
                <Cubuk
                  ad="Teslim dönemi m² fiyatı"
                  deger={p.teslim_m2_fiyati}
                  enBuyuk={p.guncel_m2_fiyati}
                  renk="var(--tint-lav)"
                />
                <Cubuk
                  ad="Bugünkü ikinci el m² fiyatı"
                  deger={p.guncel_m2_fiyati}
                  enBuyuk={p.guncel_m2_fiyati}
                  renk="var(--success-bg)"
                />
              </div>
              <p className="kp-label" style={{ marginTop: 'var(--s-3)', textTransform: 'none', letterSpacing: 0, lineHeight: 1.6 }}>
                Teslim dönemi fiyatı projenin satış aşamasındaki liste fiyatıdır. Bugünkü
                rakam aynı projedeki ikinci el ilan ortalamasıdır; <b>farklı bir veri
                kaynağıdır</b> ve doğrudan karşılaştırılamaz.
              </p>
            </section>
          )}

          {/* Teslim dönemi daire tipleri */}
          {p.daire_tipleri.length > 0 && (
            <section className="kp-card" style={{ padding: 'var(--s-5)' }}>
              <h2 className="kp-h2">Teslim dönemi daire tipleri</h2>
              <p className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>
                arşiv verisi — güncel satış değildir
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }} className="tabular">
                  <thead>
                    <tr>
                      {['Tip', 'Net / brüt', 'Teslim dönemi fiyatı', 'Teslim m²', 'Bugünkü m²'].map((h) => (
                        <th key={h} className="kp-label" style={{ textAlign: 'left', padding: '0 9px 8px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {p.daire_tipleri.map((d) => (
                      <tr key={d.tip} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: 9, fontWeight: 750 }}>{d.tip}</td>
                        <td style={{ padding: 9 }}>{alan(d.net_m2, d.brut_m2) ?? '—'}</td>
                        <td style={{ padding: 9 }}>{para(d.liste_fiyati) ?? '—'}</td>
                        <td style={{ padding: 9 }}>{m2Birim(d.liste_fiyati, d.net_m2) ?? '—'}</td>
                        <td style={{ padding: 9, fontWeight: 700 }}>{para(p.guncel_m2_fiyati) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {p.aciklama && (
            <section className="kp-card" style={{ padding: 'var(--s-5)' }}>
              <h2 className="kp-h2">Proje hakkında</h2>
              <p className="kp-lead">{p.aciklama}</p>
            </section>
          )}
        </div>

        <aside className="kp-stack" style={{ position: 'sticky', top: 16 }}>
          {/* Karneye katkı — arşivin firma sayfasıyla bağı */}
          <div className="kp-card" style={{ padding: 'var(--s-4)' }}>
            <h2 className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>Firma karnesine etkisi</h2>
            <div className="kp-row" style={{ padding: '5px 0', fontSize: 11.5 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Teslim isabeti</span>
              <span style={{ marginLeft: 'auto' }}><Pill durum="success">Zamanında</Pill></span>
            </div>
            {p.firma_sicil && (
              <div className="kp-row" style={{ padding: '5px 0', fontSize: 11.5 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Firma sicili</span>
                <b style={{ marginLeft: 'auto' }}>{p.firma_sicil}</b>
              </div>
            )}
            <p className="kp-label" style={{ marginTop: 'var(--s-3)', textTransform: 'none', letterSpacing: 0, lineHeight: 1.55 }}>
              Bu proje{' '}
              <Link href={`/firmalar/${p.firma_slug}`} style={{ color: 'var(--brand)', fontWeight: 650 }}>
                {p.firma_ad} karnesinde
              </Link>{' '}
              teslim isabeti bileşenine giriyor.
            </p>
          </div>

          {/* Satış CTA'sı yok — aktif projelere köprü var */}
          {p.firma_aktifler.length > 0 && (
            <div className="kp-card" style={{ padding: 'var(--s-4)' }}>
              <h2 className="kp-label" style={{ marginBottom: 'var(--s-2)' }}>
                Aynı firmadan satıştakiler
              </h2>
              {p.firma_aktifler.map((a) => (
                <Link
                  key={a.slug}
                  href={`/${a.il}/${a.ilce}/${a.slug}`}
                  style={{ display: 'block', padding: '7px 0', borderBottom: '1px dashed var(--border)' }}
                >
                  <b style={{ fontSize: 12.5, display: 'block' }}>{a.ad}</b>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }} className="tabular">
                    {a.ilce} · {teslim(a.teslim_ceyrek) ?? '—'} ·{' '}
                    {paraKisa(a.min_fiyat) ?? 'Fiyat isteyin'}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <p className="kp-label" style={{ textTransform: 'none', letterSpacing: 0, lineHeight: 1.55, padding: '0 4px' }}>
            Arşiv kaydı{p.teslim_tarihi ? ` · teslim ${tarih(p.teslim_tarihi)}` : ''}.
            Fiyat geçmişi korunur ve m² fiyat endeksinin geçmiş serisini besler.
          </p>
        </aside>
      </div>
    </main>
  );
}

function Ozet({
  baslik, deger, alt, rozet,
}: { baslik: string; deger: string | null; alt?: string; rozet?: React.ReactNode }) {
  if (!deger) return null;
  return (
    <div style={{ background: 'var(--surface-card)', padding: 'var(--s-4)' }}>
      <dt className="kp-label">{baslik}</dt>
      <dd style={{ margin: 0 }}>
        <span className="kp-row" style={{ gap: 7, alignItems: 'baseline' }}>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em' }} className="tabular">
            {deger}
          </span>
          {rozet}
        </span>
        {alt && (
          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>
            {alt}
          </small>
        )}
      </dd>
    </div>
  );
}

function Cubuk({ ad, deger, enBuyuk, renk }: { ad: string; deger: number; enBuyuk: number; renk: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr 110px', gap: 'var(--s-3)', alignItems: 'center', fontSize: 12 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{ad}</span>
      <span style={{ height: 24, background: 'var(--surface-sunken)', borderRadius: 7, position: 'relative' }}>
        <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${(deger / enBuyuk) * 100}%`, background: renk, borderRadius: 7 }} />
      </span>
      <b style={{ textAlign: 'right' }} className="tabular">{para(deger)}</b>
    </div>
  );
}

/**
 * Arşiv projesinde offers BASILMAZ — proje satışta değil.
 * Yanlış yapılandırılmış fiyat, hiç fiyat olmamasından zararlıdır.
 */
function JsonLd({ p }: { p: Detay }) {
  const veri = {
    '@context': 'https://schema.org',
    '@type': 'ApartmentComplex',
    name: p.ad,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/${p.il}/${p.ilce}/${p.slug}`,
    numberOfAccommodationUnits: p.toplam_konut ?? undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: p.ilce,
      addressRegion: p.il,
      addressCountry: 'TR',
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(veri) }} />;
}
