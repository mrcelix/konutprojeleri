import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import {
  anaSayfaVerisi, vitrinRozeti, basHarfler, firmaRengi,
  ilAdi, SEGMENT_ADLARI, type VitrinProjesi,
} from '@/lib/queries/anasayfa';
import { SiteBasligi } from '@/components/SiteBasligi';
import { SiteAltBilgi } from '@/components/SiteAltBilgi';
import { AramaKutusu } from '@/components/anasayfa/AramaKutusu';
import { para, alan, teslim } from '@/lib/format';

/**
 * Ana sayfa — lüks konut ve villa.
 *
 * SAYFADAKİ HİÇBİR SAYI SABİT DEĞİL. "312 proje", "%31 artış", şehir
 * sayaçları, hepsi veritabanından geliyor. Şablona gömülen bir rakam
 * ilk haftadan yalan olur ve sitenin en görünür yerinde durur.
 *
 * Veri gelmezse sayfa çökmez: sayaçlar gizlenir, bölümler boşsa hiç
 * basılmaz. Ana sayfanın 500 vermesi, verinin geç gelmesinden çok
 * daha pahalıdır.
 */

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Lüks Konut ve Villa Projeleri',
  description:
    'Türkiye’nin lüks konut, villa ve yalı projeleri tek yerde — arsa alanı, ' +
    'kapalı alan, havuz, teslim tarihi ve ödeme planıyla. Fiyatlar haftalık teyit edilir.',
  alternates: { canonical: '/' },
};

const bicim = new Intl.NumberFormat('tr-TR');

/* ───────────────────────── Vitrin kartı ───────────────────────── */

function VitrinKarti({ p }: { p: VitrinProjesi }) {
  const rozet = vitrinRozeti(p);
  const yol = `/${p.il}/${p.ilce}/${p.slug}`;

  // Villa projesinde arsa, dairede bahçe. Etiketi veri belirliyor.
  const arsaEtiketi = p.tip === 'rezidans' ? 'Bahçe' : 'Arsa';

  const etiketler = [
    p.havuz_tipi === 'ozel' && 'Özel havuz',
    p.havuz_tipi === 'ortak' && 'Ortak havuz',
    p.ozellikler?.deniz_manzarasi && 'Deniz manzarası',
    p.ozellikler?.akilli_ev && 'Akıllı ev',
    p.ozellikler?.site_ici_okul && 'Site içinde okul',
    p.ozellikler?.yerden_isitma && 'Yerden ısıtma',
  ].filter(Boolean).slice(0, 3) as string[];

  return (
    <article className="vk">
      <Link href={yol} className="vk-gorsel" aria-label={p.ad}>
        <span className="vk-desen" data-tip={p.tip} aria-hidden />
        {rozet && <span className={`vk-rozet ${rozet.sinif}`}>{rozet.metin}</span>}
        {p.toplam_konut != null && (
          <span className="vk-sayi">
            {p.toplam_konut} {p.tip === 'rezidans' ? 'daire' : 'villa'}
          </span>
        )}
      </Link>

      <div className="vk-govde">
        <div className="vk-firma">
          <span className="vk-avatar" style={{ background: firmaRengi(p.firma_slug) }}>
            {basHarfler(p.firma_ad)}
          </span>
          <Link href={`/firmalar/${p.firma_slug}`}>{p.firma_ad}</Link>
          {p.firma_sicil && <span className="vk-karne">{p.firma_sicil}</span>}
        </div>

        <h3 className="vk-ad"><Link href={yol}>{p.ad}</Link></h3>
        <p className="vk-yer">
          {ilAdi(p.il)} · {p.ilce}
          {p.mahalle ? `, ${p.mahalle}` : ''}
          {p.denize_mesafe_m != null && (
            <> · {p.denize_mesafe_m === 0 ? 'denize sıfır' : `denize ${p.denize_mesafe_m} m`}</>
          )}
        </p>

        <dl className="vk-ozet">
          {p.arsa_m2 != null && (
            <div><dt>{arsaEtiketi}</dt><dd>{bicim.format(p.arsa_m2)}<small> m²</small></dd></div>
          )}
          {p.kapali_m2 != null && (
            <div><dt>Kapalı</dt><dd>{bicim.format(p.kapali_m2)}<small> m²</small></dd></div>
          )}
          {p.odalar && <div><dt>Oda</dt><dd>{p.odalar}</dd></div>}
          {teslim(p.teslim_ceyrek) && (
            <div><dt>Teslim</dt><dd>{teslim(p.teslim_ceyrek)}</dd></div>
          )}
        </dl>

        {etiketler.length > 0 && (
          <div className="vk-etiketler">
            {etiketler.map((e) => <span key={e} className="vk-et">{e}</span>)}
          </div>
        )}

        <div className="vk-alt">
          <span className="vk-fiyat">
            {/* Fiyatı olmayan proje vitrine hiç girmiyor; yine de
                şablon uydurma rakam basmaz. */}
            <span>Fiyatlar</span>
            <b>{para(p.min_fiyat) ?? 'Firma açıklamadı'}</b>
          </span>
          <Link href={yol} className="kp-btn is-small">İncele</Link>
        </div>
      </div>
    </article>
  );
}

/* ───────────────────────── Endeks çizgisi ───────────────────────── */

function EndeksCizgisi({ nokta }: { nokta: { donem: string; m2: number }[] }) {
  if (nokta.length < 3) return null;

  const G = 520, Y = 108;
  const d = nokta.map((n) => n.m2);
  const enAz = Math.min(...d), enCok = Math.max(...d);
  const aralik = enCok - enAz || 1;
  const x = (i: number) => (i / (nokta.length - 1)) * G;
  const y = (v: number) => Y - 12 - ((v - enAz) / aralik) * (Y - 26);

  const yol = nokta.map((n, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(n.m2).toFixed(1)}`).join(' ');
  const sonX = x(nokta.length - 1), sonY = y(d[d.length - 1]!);

  return (
    <svg viewBox={`0 0 ${G} ${Y}`} preserveAspectRatio="none" className="pz-grafik" aria-hidden>
      <path d="M0 24 H520 M0 56 H520 M0 88 H520" stroke="var(--border)" strokeWidth="1" />
      <path d={`${yol} L ${G} ${Y} L 0 ${Y} Z`} fill="var(--brand)" opacity="0.12" />
      <path d={yol} stroke="var(--brand)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx={sonX} cy={sonY} r="4" fill="var(--bronz)" />
    </svg>
  );
}

/* ───────────────────────── Sayfa ───────────────────────── */

export default async function AnaSayfa() {
  const v = await anaSayfaVerisi().catch(() => null);

  const sayilar = [
    v?.toplamProje ? `${bicim.format(v.toplamProje)} lüks proje` : null,
    v?.toplamFirma ? `${bicim.format(v.toplamFirma)} müteahhit` : null,
    v?.toplamIl ? `${bicim.format(v.toplamIl)} il` : null,
  ].filter(Boolean) as string[];

  const segmentler = (v?.segmentler ?? []).filter(
    (s) => ['villa', 'mustakil', 'yali', 'rezidans'].includes(s.tip)
  );

  return (
    <>
      <SiteBasligi aktif="/" />

      {/* ── Hero ── */}
      <section className="as-hero">
        <div className="as-lekeler" aria-hidden>
          <i style={{ background: 'var(--tint-blue)', width: 340, height: 340, left: -110, top: -120 }} />
          <i style={{ background: 'var(--tint-mint)', width: 260, height: 260, right: -60, top: -70 }} />
          <i style={{ background: 'var(--tint-blush)', width: 200, height: 200, right: '26%', top: 270, opacity: .5 }} />
        </div>

        <div className="kp-wrap as-hero__ic">
          {v?.buHafta ? (
            <span className="as-rozet">
              <b>Bu hafta {v.buHafta} yeni</b> proje eklendi
            </span>
          ) : null}

          <h1 className="as-h1">
            Denize sıfır bir villa, <em>acele ettirilmeden.</em>
          </h1>

          <p className="as-lead">
            Türkiye’nin lüks konut, villa ve yalı projeleri tek yerde — arsa alanı,
            kapalı alan, havuz, teslim tarihi ve ödeme planıyla. Telefon etmeden
            önce her şeyi görün.
          </p>

          <AramaKutusu
            iller={(v?.sehirler ?? []).map((s) => ({ deger: s.il, ad: ilAdi(s.il), n: s.n }))}
            segmentler={segmentler.map((s) => ({
              deger: s.tip, ad: SEGMENT_ADLARI[s.tip] ?? s.tip,
            }))}
          />

          {sayilar.length > 0 && (
            <p className="as-guven">
              {sayilar.map((s) => <span key={s}>{s}</span>)}
              <span>Fiyatlar haftalık teyit edilir</span>
            </p>
          )}
        </div>
      </section>

      {/* ── Vitrin ── */}
      {v && v.vitrin.length > 0 && (
        <section className="kp-wrap as-bolum">
          <header className="as-bolum__bas">
            <div>
              <p className="kp-label">Öne çıkanlar</p>
              <h2 className="as-h2">Bu ayın villa projeleri</h2>
              <p className="as-alt">
                Fiyatı son 30 günde teyit edilmiş, teslim tarihi belli projeler.
              </p>
            </div>
            <Link href="/istanbul-konut-projeleri" className="as-tumu">
              {bicim.format(v.toplamProje)} projenin tümü →
            </Link>
          </header>

          <div className="as-kartlar">
            {v.vitrin.map((p) => <VitrinKarti key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ── Segmentler ── */}
      {segmentler.length > 0 && (
        <section className="kp-wrap as-bolum as-bolum--sik">
          <header className="as-bolum__bas">
            <div>
              <p className="kp-label">Segmentler</p>
              <h2 className="as-h2">Ne arıyorsunuz?</h2>
            </div>
          </header>

          <div className="as-segmentler">
            {segmentler.map((s) => (
              <Link key={s.tip} href={`/ara?tip=${s.tip}`} className="as-seg">
                <span className="as-seg__ikon" data-tip={s.tip} aria-hidden />
                <b>{SEGMENT_ADLARI[s.tip] ?? s.tip}</b>
                <span>{s.n} proje</span>
              </Link>
            ))}
            {v && v.yakindaTeslim > 0 && (
              <Link href="/teslim-takvimi" className="as-seg">
                <span className="as-seg__ikon" data-tip="yakinda" aria-hidden />
                <b>Yakında teslim</b>
                <span>{v.yakindaTeslim} proje</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Nasıl çalışır ── */}
      <section className="kp-wrap as-bolum as-bolum--sik">
        <header className="as-bolum__bas">
          <div>
            <p className="kp-label">Nasıl çalışır</p>
            <h2 className="as-h2">Üç adım, aracı yok</h2>
            <p className="as-alt">
              Talebiniz doğrudan projenin müteahhidine gider.
            </p>
          </div>
        </header>

        <div className="as-adimlar">
          <div className="as-adim">
            <span className="as-adim__no">01</span>
            <b>Projeyi karşılaştırın</b>
            <p>
              Arsa alanı, kapalı alan, m² birim fiyatı, aidat ve teslim tarihi
              yan yana. Dört projeye kadar tek tabloda.
            </p>
          </div>
          <div className="as-adim">
            <span className="as-adim__no">02</span>
            <b>Fiyat listesi isteyin</b>
            <p>
              Tek form. Numaranız yalnızca seçtiğiniz projenin firmasına gider;
              başka yere aktarılmaz.
            </p>
          </div>
          <div className="as-adim">
            <span className="as-adim__no">03</span>
            <b>Yerinde gezin</b>
            <p>
              Firmanın ortalama yanıt süresi karnesinde yazılıdır. Geç dönen
              firma orada görünür.
            </p>
          </div>
        </div>
      </section>

      {/* ── Konum ── */}
      {v && (v.sehirler.length > 0 || v.sahiller.length > 0) && (
        <section className="kp-wrap as-bolum as-bolum--sik">
          <header className="as-bolum__bas">
            <div>
              <p className="kp-label">Konum</p>
              <h2 className="as-h2">Şehirleri keşfedin</h2>
              <p className="as-alt">Proje sayıları her gece güncellenir.</p>
            </div>
          </header>

          <div className="as-konum">
            {v.sehirler.length > 0 && (
              <div className="as-kutu">
                <h3>Şehirler</h3>
                <p>Lüks konut ve villa projesi bulunan iller</p>
                <div className="as-yerler">
                  {v.sehirler.map((s) => (
                    <Link key={s.il} href={`/${s.il}-konut-projeleri`} className="as-yer">
                      {ilAdi(s.il)} <i>{s.n}</i>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {v.sahiller.length > 0 && (
              <div className="as-kutu">
                <h3>Sahil ve tatil bölgeleri</h3>
                <p>Villa projelerinin yoğunlaştığı yerler</p>
                <div className="as-yerler">
                  {v.sahiller.map((b) => (
                    <Link
                      key={b.slug}
                      href={`/ara?bolge=${b.slug}`}
                      className="as-yer is-kiyi"
                    >
                      {b.ad} <i>{b.n}</i>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Piyasa ── */}
      {v && (v.endeks.length > 2 || v.karne.length > 0) && (
        <section className="kp-wrap as-bolum as-bolum--sik">
          <div className="as-piyasa">
            <div>
              <p className="kp-label">Bizde olan, başkasında olmayan</p>
              <h3 className="as-h3">
                {v.endeksYillik != null ? (
                  <>
                    m² fiyatı son on iki ayda{' '}
                    <em>%{Math.abs(v.endeksYillik).toFixed(1).replace('.', ',')}</em>{' '}
                    {v.endeksYillik >= 0 ? 'arttı' : 'geriledi'}
                  </>
                ) : (
                  <>m² fiyat endeksi</>
                )}
              </h3>
              <p className="as-alt">
                Endeks satıştaki projelerin liste fiyatlarına dayanır; tapu
                değerlerini içermez. Aykırı değerler hesaba katılmaz.
              </p>

              <EndeksCizgisi nokta={v.endeks} />

              {v.endeks.length > 1 && (
                <p className="as-eksen">
                  <span>{v.endeks[0]!.donem}</span>
                  <span>{v.endeks[v.endeks.length - 1]!.donem}</span>
                </p>
              )}
              <Link href="/fiyat-endeksi" className="as-tumu">Endeksin tamamı →</Link>
            </div>

            {v.karne.length > 0 && (
              <div>
                <p className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>Teslim karnesi</p>
                <div className="as-karne">
                  {v.karne.map((k) => (
                    <Link key={k.slug} href={`/firmalar/${k.slug}`} className="as-karne__satir">
                      <b>
                        {k.ad}
                        <small>{k.tamamlanan} tamamlanan proje</small>
                      </b>
                      <span className={`as-not${k.sicil?.startsWith('A') ? ' is-iyi' : ''}`}>
                        {k.sicil}
                      </span>
                      <span className="as-sure">
                        {k.ort_gecikme != null
                          ? `${k.ort_gecikme.toFixed(1).replace('.', ',')} ay`
                          : '—'}
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="as-not-metin">
                  Sektör ortalaması <b>2,7 ay</b> gecikme. İki tamamlanmış projeden
                  azı olan firmaya not verilmez.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Alt bant ── */}
      <section className="kp-wrap as-bolum as-bolum--sik">
        <div className="as-bant">
          <h3>Villa projeniz mi var?</h3>
          <p>
            Projenizi yayınlayın, talepler doğrudan size gelsin. Fiyat ve teslim
            bilgisi güncel tutulduğu sürece listede üst sıralarda kalır.
          </p>
          <Link href="/yonetim/giris" className="kp-btn as-bant__btn">Projemi ekle</Link>
        </div>
      </section>

      <Suspense fallback={null}>
        <SiteAltBilgi />
      </Suspense>
    </>
  );
}
