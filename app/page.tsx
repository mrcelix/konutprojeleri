import Link from 'next/link';
import type { Metadata } from 'next';
import {
  anaSayfaVerisi, vitrinRozeti, basHarfler, firmaRengi, ilAdi,
  SEGMENT_ADLARI, TEMA_ADLARI, TEMA_YOLLARI, type VitrinProjesi,
} from '@/lib/queries/anasayfa';
import { SiteBasligi } from '@/components/SiteBasligi';
import { SiteAltBilgi } from '@/components/SiteAltBilgi';
import { AramaKutusu } from '@/components/anasayfa/AramaKutusu';
import { HeroGorseli, BolgeGorseli, KartGorseli } from '@/components/anasayfa/Gorseller';
import { teslim } from '@/lib/format';

/**
 * Ana sayfa.
 *
 * SAYFADAKİ HİÇBİR SAYI SABİT DEĞİL. Proje/firma/il sayaçları, bölge
 * sayıları, tema sayıları ve karne — hepsi veritabanından. Şablona
 * gömülen bir rakam ilk haftadan yalan olur ve sitenin en görünür
 * yerinde durur.
 *
 * Veri gelmezse sayfa çökmez: bölümler boşsa hiç basılmaz. Ana
 * sayfanın 500 vermesi, bir bölümün eksik olmasından çok daha pahalı.
 */

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Satılık Villa ve Konut Projeleri',
  description:
    'Türkiye’nin lüks villa ve konut projeleri tek yerde — arsa alanı, kapalı ' +
    'alan, denize mesafe, teslim tarihi ve ödeme planıyla. Fiyatlar haftalık teyit edilir.',
  alternates: { canonical: '/' },
};

const bicim = new Intl.NumberFormat('tr-TR');

/* ───────────────────────── Proje kartı ───────────────────────── */

function ProjeKarti({ p }: { p: VitrinProjesi }) {
  const rozet = vitrinRozeti(p);
  const yol = `/${p.il}/${p.ilce}/${p.slug}`;
  const arsaEtiketi = p.tip === 'rezidans' ? 'm² bahçe' : 'm² arsa';

  const etiketler = [
    p.havuz_tipi === 'ozel' && { ad: 'Özel havuz', vurgu: true },
    p.ozellikler?.deniz_manzarasi && { ad: 'Deniz manzarası', vurgu: false },
    p.faizsiz && p.vade_ay && { ad: `${p.vade_ay} ay faizsiz`, vurgu: false },
    p.ozellikler?.site_ici_okul && { ad: 'Site içinde okul', vurgu: false },
    teslim(p.teslim_ceyrek) && { ad: `${teslim(p.teslim_ceyrek)} teslim`, vurgu: false },
  ].filter(Boolean).slice(0, 3) as { ad: string; vurgu: boolean }[];

  return (
    <article className="pk">
      <Link href={yol} className="pk-gorsel" aria-label={p.ad}>
        <KartGorseli tip={p.tip} />
        {rozet && <span className={`pk-rozet ${rozet.sinif}`}>{rozet.metin}</span>}
        <span className="pk-kalp" aria-hidden>♡</span>
      </Link>

      <div className="pk-govde">
        <div className="pk-firma">
          <span className="pk-av" style={{ background: firmaRengi(p.firma_slug) }}>
            {basHarfler(p.firma_ad)}
          </span>
          <Link href={`/firmalar/${p.firma_slug}`}>{p.firma_ad}</Link>
          {p.firma_sicil && <span className="pk-karne">{p.firma_sicil}</span>}
        </div>

        <h3 className="pk-ad"><Link href={yol}>{p.ad}</Link></h3>

        <p className="pk-yer">
          <i aria-hidden>◉</i>
          {p.ilce}{p.mahalle ? `, ${p.mahalle}` : ''}
          {p.denize_mesafe_m != null && (
            <> · {p.denize_mesafe_m === 0 ? 'denize sıfır' : `denize ${bicim.format(p.denize_mesafe_m)} m`}</>
          )}
        </p>

        <div className="pk-ozet">
          {p.odalar && <span className="pk-oz"><b>{p.odalar}</b></span>}
          {p.kapali_m2 != null && (
            <span className="pk-oz"><b>{bicim.format(p.kapali_m2)}</b><span>m² kapalı</span></span>
          )}
          {p.arsa_m2 != null && (
            <span className="pk-oz"><b>{bicim.format(p.arsa_m2)}</b><span>{arsaEtiketi}</span></span>
          )}
        </div>

        {etiketler.length > 0 && (
          <div className="pk-etiketler">
            {etiketler.map((e) => (
              <span key={e.ad} className={`pk-et${e.vurgu ? ' is-vurgu' : ''}`}>{e.ad}</span>
            ))}
          </div>
        )}

        <div className="pk-alt">
          <span className="pk-fiyat">
            <span>Fiyatlar</span>
            <b className="tabular">
              {p.min_fiyat != null
                ? <>{bicim.format(p.min_fiyat)} <small>₺’den</small></>
                : 'Firma açıklamadı'}
            </b>
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
  const G = 520, Y = 96;
  const d = nokta.map((n) => n.m2);
  const enAz = Math.min(...d), enCok = Math.max(...d);
  const aralik = enCok - enAz || 1;
  const x = (i: number) => (i / (nokta.length - 1)) * G;
  const y = (v: number) => Y - 10 - ((v - enAz) / aralik) * (Y - 24);
  const yol = nokta.map((n, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(n.m2).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${G} ${Y}`} preserveAspectRatio="none" className="ky-grafik" aria-hidden>
      <path d={`${yol} L ${G} ${Y} L 0 ${Y} Z`} fill="var(--brand)" opacity="0.1" />
      <path d={yol} stroke="var(--brand)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx={x(nokta.length - 1)} cy={y(d[d.length - 1]!)} r="4" fill="var(--brand)" />
    </svg>
  );
}

/* ───────────────────────── Sayfa ───────────────────────── */

const GUVEN = [
  {
    ad: 'Doğrulanmış firma',
    metin: 'Vergi numarası ve sicil kaydı kontrol edilir',
    yol: 'M10 2 L17 5 v6 c0 4 -3 6 -7 7 c-4 -1 -7 -3 -7 -7 V5Z M7 10l2 2 4-4',
  },
  {
    ad: 'Fiyatlar haftalık teyitli',
    metin: '90 günü geçen fiyat listede işaretlenir',
    yol: 'M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15Z M10 5.5V10l3 2',
  },
  {
    ad: 'Aracısız iletişim',
    metin: 'Talebiniz doğrudan müteahhide gider',
    yol: 'M3 6h14v9H3Z M3 6l7 5 7-5',
  },
  {
    ad: 'Teslim karnesi',
    metin: 'Firmanın geçmiş teslim gecikmesi açık',
    yol: 'M3 16V8M8 16V4M13 16v-6M18 16v-9',
  },
];

const ADIMLAR = [
  {
    b: 'Projeleri karşılaştırın',
    p: 'Arsa, kapalı alan, m² fiyatı, aidat ve teslim tarihi yan yana. Dört projeye kadar.',
  },
  {
    b: 'Fiyat listesi isteyin',
    p: 'Tek form. Numaranız yalnızca seçtiğiniz projenin firmasına gider.',
  },
  {
    b: 'Yerinde gezin',
    p: 'Firmanın ortalama yanıt süresi karnesinde yazılıdır; geç dönen orada görünür.',
  },
  {
    b: 'Sözleşmeyi imzalayın',
    p: 'Ödeme planı ve teslim tarihi ilanda ne yazıyorsa sözleşmede de o olmalı.',
  },
];

export default async function AnaSayfa() {
  const v = await anaSayfaVerisi().catch(() => null);

  const segmentler = (v?.segmentler ?? []).filter((s) =>
    ['villa', 'mustakil', 'yali', 'rezidans', 'konut'].includes(s.tip)
  );

  // Bölge kartları: sahil bölgeleri önce, boşluk kalırsa şehirler.
  const bolgeler = [
    ...(v?.sahiller ?? []).map((b) => ({
      ad: b.ad, n: b.n, yol: `/ara?bolge=${b.slug}`, tur: 'sahil' as const,
    })),
    ...(v?.sehirler ?? []).map((s) => ({
      ad: ilAdi(s.il), n: s.n, yol: `/${s.il}-konut-projeleri`, tur: 'sehir' as const,
    })),
  ].slice(0, 6);

  return (
    <>
      <SiteBasligi aktif="/" />

      {/* ── Hero ── */}
      <section className="hr">
        <div className="hr-gorsel">
          <HeroGorseli />
          <span className="hr-perde" aria-hidden />
          <div className="hr-ic">
            {v?.buHafta ? (
              <span className="hr-etiket">✦ Bu hafta {v.buHafta} yeni proje eklendi</span>
            ) : null}
            <h1 className="hr-h1">
              Hayalinizdeki villa <em>satılık</em>, kiralık değil.
            </h1>
            <p className="hr-alt">
              Türkiye’nin lüks villa ve konut projeleri tek yerde — arsa alanı,
              kapalı alan, denize mesafe, teslim tarihi ve ödeme planıyla.
            </p>
          </div>
        </div>

        <div className="kp-wrap">
          <AramaKutusu
            iller={(v?.sehirler ?? []).map((s) => ({ deger: s.il, ad: ilAdi(s.il), n: s.n }))}
            segmentler={segmentler.map((s) => ({
              deger: s.tip, ad: SEGMENT_ADLARI[s.tip] ?? s.tip,
            }))}
          />
        </div>
      </section>

      {/* ── Güven şeridi ── */}
      <section className="kp-wrap gv">
        {GUVEN.map((g) => (
          <div key={g.ad} className="gv-oge">
            <span className="gv-ikon" aria-hidden>
              <svg width="17" height="17" viewBox="0 0 20 20" fill="none"
                stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d={g.yol} />
              </svg>
            </span>
            <span>
              <b>{g.ad}</b>
              <span>{g.metin}</span>
            </span>
          </div>
        ))}
      </section>

      {/* ── Bölgeler ── */}
      {bolgeler.length > 0 && (
        <section className="kp-wrap bl-bolum">
          <header className="bs">
            <div>
              <h2 className="bs-h2">Popüler bölgeler</h2>
              <p className="bs-alt">Projelerin yoğunlaştığı sahil ve doğa bölgeleri</p>
            </div>
          </header>
          <div className="bl">
            {bolgeler.map((b, i) => (
              <Link key={b.ad} href={b.yol} className="bl-kart">
                <BolgeGorseli sira={i} tur={b.tur} />
                <span className="bl-perde" aria-hidden />
                <span className="bl-yazi">
                  <b>{b.ad}</b>
                  <span>{b.n} proje</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Adımlar ── */}
      <section className="kp-wrap bl-bolum">
        <header className="bs">
          <div>
            <h2 className="bs-h2">Dört adımda ev sahibi olun</h2>
            <p className="bs-alt">
              Aracı yok, komisyon yok. Talebiniz doğrudan projenin müteahhidine gider.
            </p>
          </div>
        </header>
        <div className="ad">
          {ADIMLAR.map((a, i) => (
            <div key={a.b} className="ad-oge">
              <span className="ad-no">{i + 1}</span>
              <b>{a.b}</b>
              <p>{a.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Öne çıkanlar ── */}
      {v && v.vitrin.length > 0 && (
        <section className="kp-wrap bl-bolum">
          <header className="bs">
            <div>
              <h2 className="bs-h2">Öne çıkan projeler</h2>
              <p className="bs-alt">Fiyatı son 30 günde teyit edilmiş, teslim tarihi belli projeler</p>
            </div>
            <Link href="/ara" className="bs-tumu">
              {bicim.format(v.toplamProje)} projenin tümü →
            </Link>
          </header>
          <div className="pk-liste">
            {v.vitrin.map((p) => <ProjeKarti key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ── Temalar ── */}
      {v && v.temalar.length > 0 && (
        <section className="kp-wrap bl-bolum">
          <header className="bs">
            <div>
              <h2 className="bs-h2">Aradığınıza göre</h2>
              <p className="bs-alt">Kaydırmadan doğrudan süzgece gidin</p>
            </div>
          </header>
          <div className="tm">
            {v.temalar.map((t) => (
              <Link key={t.anahtar} href={TEMA_YOLLARI[t.anahtar] ?? '/ara'} className="tm-oge">
                <span className="tm-ikon" data-tema={t.anahtar} aria-hidden />
                <span>
                  <b>{TEMA_ADLARI[t.anahtar] ?? t.anahtar}</b>
                  <span>{t.n} proje</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Karne ── */}
      {v && v.karne.length > 0 && (
        <section className="kp-wrap bl-bolum">
          <div className="ky">
            <div>
              <p className="ky-etiket">Bizde olan, başkasında olmayan</p>
              <h2 className="ky-h2">Firma söz verdiği tarihte teslim ediyor mu?</h2>
              <p className="bs-alt">
                Her firmanın geçmiş projelerindeki gerçek teslim gecikmesini
                hesaplıyoruz. Sektör ortalaması <b>2,7 ay</b>. İki tamamlanmış
                projeden azı olan firmaya not verilmez.
              </p>

              {v.endeks.length > 2 && (
                <div className="ky-endeks">
                  <p className="ky-endeks__bas">
                    m² fiyat endeksi
                    {v.endeksYillik != null && (
                      <b>
                        {v.endeksYillik >= 0 ? '▲' : '▼'} %
                        {Math.abs(v.endeksYillik).toFixed(1).replace('.', ',')}
                        <span> son 12 ay</span>
                      </b>
                    )}
                  </p>
                  <EndeksCizgisi nokta={v.endeks} />
                </div>
              )}

              <Link href="/firma-karnesi-metodoloji" className="kp-btn is-ghost is-small">
                Karne metodolojisi
              </Link>
            </div>

            <div className="ky-tablo">
              {v.karne.map((k) => (
                <Link key={k.slug} href={`/firmalar/${k.slug}`} className="ky-satir">
                  <b>
                    {k.ad}
                    <small>{k.tamamlanan} tamamlanan proje</small>
                  </b>
                  <span className={`ky-not${k.sicil?.startsWith('A') ? '' : ' is-dus'}`}>
                    {k.sicil}
                  </span>
                  <span className="ky-sure tabular">
                    {k.ort_gecikme != null
                      ? `${k.ort_gecikme.toFixed(1).replace('.', ',')} ay`
                      : '—'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="kp-wrap bl-bolum">
        <div className="ct">
          <div>
            <h2>Villa projeniz mi var?</h2>
            <p>
              Projenizi yayınlayın, talepler doğrudan size gelsin. Fiyat ve teslim
              bilgisi güncel tutuldukça listede üst sıralarda kalır.
            </p>
          </div>
          <Link href="/yonetim/giris" className="kp-btn">Projemi ekle</Link>
        </div>
      </section>

      <SiteAltBilgi />
    </>
  );
}
