import Link from 'next/link';
import type { Metadata } from 'next';
import {
  anaSayfaVerisi, BOS_ANASAYFA, vitrinRozeti, ilAdi,
  SEGMENT_ADLARI, TEMA_ADLARI, TEMA_YOLLARI,
  type VitrinProjesi, type TeslimEdilen,
} from '@/lib/queries/anasayfa';
import { SiteBasligi } from '@/components/SiteBasligi';
import { SiteAltBilgi } from '@/components/SiteAltBilgi';
import { MobilCubuk } from '@/components/MobilCubuk';
import { AramaKutusu } from '@/components/anasayfa/AramaKutusu';
import { BolgeGorseli, KartGorseli, HeroGorseli, AdimGorseli } from '@/components/anasayfa/Gorseller';
import { HERO_KARELERI } from '@/lib/gorsel-havuzu';
import { teslim } from '@/lib/format';

/**
 * Ana sayfa.
 *
 * Bölüm sırası tasarım sisteminin omurgası:
 *   hero → kanıt şeridi → iki güven bloğu → süreç → öne çıkanlar →
 *   seçki → neden biz → bölgeler → temalar → teslim takvimi →
 *   teslim edilen projeler → sahip çağrısı
 *
 * SAYFADAKİ HİÇBİR SAYI SABİT DEĞİL. Sayaçlar, bölge ve tema sayıları,
 * teslim takvimi ızgarası, teslim edilen projeler — hepsi veritabanından.
 * Şablona gömülen bir rakam ilk haftadan yalan olur ve sitenin en
 * görünür yerinde durur.
 *
 * Veri gelmezse sayfa çökmez; boş bölüm hiç basılmaz.
 */

export const revalidate = 900;

export const metadata: Metadata = {
  title: 'Satılık Konut, Villa ve Ofis Projeleri',
  description:
    'Türkiye’nin satılık konut, villa ve ofis projeleri tek yerde — fiyat, kat planı, ' +
    'ödeme planı ve teslim tarihiyle. Fiyatlar haftalık teyit edilir.',
  alternates: { canonical: '/' },
};

const bicim = new Intl.NumberFormat('tr-TR');

/** Dört adım — her birinin görsel türü konusuyla eşleşiyor. */
const ADIMLAR = [
  { bas: 'Bütçenizi girin', tur: 'konut' as const,
    aciklama: 'Peşinat ve aylık ödeyebileceğiniz tutarı yazın; sistem hangi projelerin gerçekten uyduğunu hesaplasın.' },
  { bas: 'Kaydı okuyun', tur: 'ic' as const,
    aciklama: 'Fiyat geçmişi, kat planı, ödeme planı ve firmanın teslim karnesi aynı sayfada.' },
  { bas: 'Karşılaştırın', tur: 'villa' as const,
    aciklama: 'Beğendiğiniz projeleri yan yana koyun — m² fiyatı, teslim tarihi ve taksit farkı tabloda.' },
  { bas: 'Firmayla görüşün', tur: 'santiye' as const,
    aciklama: 'Talebiniz doğrudan firmaya gidiyor. Arada komisyoncu yok.' },
];

/* ───────── Proje kartı ───────── */

function ProjeKarti({ p }: { p: VitrinProjesi }) {
  const rozet = vitrinRozeti(p);
  const yol = `/${p.il}/${p.ilce}/${p.slug}`;
  const arsaEtiketi = p.tip === 'rezidans' || p.tip === 'konut' ? 'm² bahçe' : 'm² arsa';

  // Aylık taksit: /butce ve arama ile AYNI formül — kalan bedel / vade.
  const aylik =
    p.min_fiyat != null && p.pesinat_orani != null && p.vade_ay
      ? Math.round((p.min_fiyat - (p.min_fiyat * p.pesinat_orani) / 100) / p.vade_ay)
      : null;

  return (
    <article className="vcard">
      <div className="vcard-media">
        <Link href={yol} className="vcard-ac" aria-label={p.ad}>
          <KartGorseli tip={p.tip} slug={p.slug} ad={p.ad} />
        </Link>
        <div className="vcard-top">
          <div className="vcard-tags">
            {p.santiye_yuzde != null && p.santiye_yuzde >= 60 && (
              <span className="badge badge-solid">%{p.santiye_yuzde} tamamlandı</span>
            )}
            {rozet && <span className="badge badge-gold">{rozet.metin}</span>}
          </div>
        </div>
        {p.teslim_ceyrek && (
          <span className="vcard-hizli">{teslim(p.teslim_ceyrek)} teslim</span>
        )}
      </div>

      <div className="vcard-body">
        <div className="vcard-head">
          <Link href={yol} className="vcard-title">{p.ad}</Link>
        </div>

        <span className="vcard-loc">
          {p.mahalle ? `${p.mahalle}, ` : ''}
          {ilAdi(p.ilce)} · {ilAdi(p.il)}
        </span>

        <div className="vcard-specs">
          {p.odalar && <span>{p.odalar}</span>}
          {p.kapali_m2 != null && <span>{bicim.format(p.kapali_m2)} m²</span>}
          {p.arsa_m2 != null && (
            <span>{bicim.format(p.arsa_m2)} {arsaEtiketi}</span>
          )}
          {p.denize_mesafe_m != null && <span>denize {p.denize_mesafe_m} m</span>}
        </div>

        <Link href={`/firma/${p.firma_slug}`} className="small dim">
          {p.firma_ad}
        </Link>
      </div>

      <div className="vcard-alt">
        <div className="vcard-price">
          <span className="vcard-fiyat-sol">
            {p.min_fiyat != null ? (
              <>
                <b className="sayi">{bicim.format(p.min_fiyat)} ₺</b>
                <span className="per">başlangıç</span>
              </>
            ) : (
              <span className="per">Fiyat için sorunuz</span>
            )}
          </span>
          {aylik != null && (
            <span className="total">
              aylık <b className="sayi">{bicim.format(aylik)} ₺</b>
            </span>
          )}
        </div>
        <Link href={yol} className="btn btn-ghost btn-sm vcard-detay">
          Projeyi incele
        </Link>
      </div>
    </article>
  );
}

/* ───────── Teslim edilen proje ───────── */

function TeslimKarti({ t }: { t: TeslimEdilen }) {
  const gecikti = t.gecikme_ay > 0;
  return (
    <li className="trust">
      <div style={{ minWidth: 0 }}>
        <b>{t.ad}</b>
        <span>
          {ilAdi(t.ilce)}, {ilAdi(t.il)}
          {t.konut != null && ` · ${bicim.format(t.konut)} konut`}
        </span>
        <p className="tiny dim" style={{ marginTop: 6 }}>
          Söz verilen {teslim(t.ilan_edilen)} · gerçekleşen {teslim(t.gerceklesen)}
        </p>
        <span
          className={`durum ${gecikti ? 'durum-IPTAL' : 'durum-YAYINDA'}`}
          style={{ marginTop: 8 }}
        >
          {gecikti ? `${t.gecikme_ay} ay gecikti` : 'Zamanında teslim'}
        </span>
      </div>
    </li>
  );
}

/* ───────── Sayfa ───────── */

export default async function AnaSayfa() {
  // Veritabanı ulaşılamazsa sayfa ÇÖKMÜYOR: boş kümeyle çiziliyor ve
  // veri isteyen bölümler hiç basılmıyor. Hero, süreç ve güven
  // blokları veriye bağlı değil, ayakta kalıyorlar.
  const v = await anaSayfaVerisi().catch(() => BOS_ANASAYFA);

  const bolgeler = [
    ...v.sahiller.map((s) => ({
      ad: s.ad, alt: `${ilAdi(s.il)} · ${s.n} proje`, yol: `/sahil/${s.slug}`,
      tur: 'sahil' as const,
    })),
    ...v.sehirler.map((s) => ({
      ad: ilAdi(s.il), alt: `${s.n} proje`, yol: `/${s.il}`, tur: 'sehir' as const,
    })),
  ].slice(0, 8);

  return (
    <>
      <SiteBasligi />

      {/* ═══ HERO ═══
          Fotoğraf katmanı `.hero-foto`; gerçek görsel R2'ye bağlanınca
          buradaki yer tutucu sahnenin yerini alıyor, yapı değişmiyor. */}
      <section className="hero">
        <div className="hero-canvas">
          <div className="hero-foto">
            <HeroGorseli src={HERO_KARELERI[0]} />
          </div>

          <div className="hero-body">
            <h1 className="h1">Satılık konut, villa ve ofis projeleri</h1>
            <p className="hero-sub">
              Fiyatı, kat planı ve teslim tarihi kayıtlı. Reklam değil.
            </p>

            <div className="arama-kume">
              <AramaKutusu
                iller={v.sehirler.map((s) => ({ deger: s.il, ad: ilAdi(s.il), n: s.n }))}
                segmentler={v.segmentler.map((s) => ({
                  deger: s.tip, ad: SEGMENT_ADLARI[s.tip] ?? s.tip, n: s.n,
                }))}
                toplam={v.toplamProje}
                bolgeSayisi={v.toplamIl}
              />
            </div>

            <div className="hero-hizli">
              {v.segmentler.slice(0, 4).map((s) => (
                <Link key={s.tip} href={`/ara?tip=${s.tip}`} className="hero-cip">
                  {SEGMENT_ADLARI[s.tip] ?? s.tip} ({s.n})
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ KANIT ŞERİDİ ═══ */}
      <section className="kanit-serit">
        <div className="wrap">
          <div className="kanit-izgara">
            <div className="kanit-kutu">
              <b className="sayi">{bicim.format(v.toplamProje)}</b>
              <span>doğrulanmış proje</span>
            </div>
            <div className="kanit-kutu">
              <b className="sayi">{bicim.format(v.toplamFirma)}</b>
              <span>sicili teyitli firma</span>
            </div>
            <div className="kanit-kutu">
              <b className="sayi">{bicim.format(v.toplamIl)}</b>
              <span>şehir</span>
            </div>
            <div className="kanit-kutu">
              <b className="sayi">{bicim.format(v.buHafta)}</b>
              <span>bu hafta fiyatı teyit edildi</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ İKİ GÜVEN BLOĞU ═══ */}
      <section className="wrap section">
        <div className="iki-kolon">
          <div className="kart">
            <span className="eyebrow">Fiyat arşivi</span>
            <h2 className="h2">Eski fiyat silinmez</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Bir projenin fiyatı değiştiğinde eskisi kaybolmuyor; tarih
              damgasıyla arşivde kalıyor. Zam grafiğini biz çizmiyoruz —
              kaydın kendisi çiziyor.
              {v.endeksYillik != null && (
                <>
                  {' '}Son on iki ayda ortalama m² fiyatı{' '}
                  <b>%{v.endeksYillik.toFixed(1)}</b> değişti.
                </>
              )}
            </p>
            <Link href="/fiyat-endeksi" className="link-more" style={{ marginTop: 12 }}>
              Fiyat endeksini gör →
            </Link>
          </div>

          <div className="kart">
            <span className="eyebrow">Teslim karnesi</span>
            <h2 className="h2">Söz verilen tarihi biz tutuyoruz</h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Her firmanın ilan ettiği teslim tarihi kaydediliyor,
              gerçekleşen tarihle karşılaştırılıyor. Karne firmanın
              beyanı değil, geçmişinin toplamı.
            </p>
            <Link href="/firmalar" className="link-more" style={{ marginTop: 12 }}>
              Firma karnelerini gör →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ SÜREÇ ═══ */}
      <section className="section-cokuk" id="nasil">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Nasıl çalışır</span>
              <h2>Aramadan <em>anahtar teslime</em> dört adım</h2>
              <p>
                Aracı değiliz, portal da değiliz. Kaydı tutuyoruz ve sizi
                doğrudan projenin sahibiyle buluşturuyoruz.
              </p>
            </div>
          </div>

          <ol className="surec">
            {ADIMLAR.map(({ bas, aciklama, tur }, i) => (
              <li className="surec-adim" key={bas}>
                <div className="surec-foto">
                  {/* Görsel adımın KONUSUNU gösteriyor: bütçe adımında
                      konut cephesi, kayıt adımında iç mekân, teslim
                      adımında şantiye. Dört adımda aynı manzarayı
                      dönüşümlü basmak süsleme olurdu. */}
                  <AdimGorseli tur={tur} anahtar={bas} />
                  <span className="surec-no">{i + 1}</span>
                </div>
                <h3 className="h3" style={{ marginTop: 12 }}>{bas}</h3>
                <p>{aciklama}</p>
              </li>
            ))}
          </ol>

          <div className="surec-garanti">
            <span>Fiyatlar haftalık teyitli</span>
            <span>Firma sicili doğrulanıyor</span>
            <span>Düzeltme bildirimi herkese açık</span>
          </div>
        </div>
      </section>

      {/* ═══ ÖNE ÇIKAN PROJELER ═══ */}
      {v.vitrin.length > 0 && (
        <section className="wrap section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Vitrin</span>
              <h2>Öne çıkan <em>projeler</em></h2>
              <p>Fiyatı bu hafta teyit edilmiş, kat planı ve ödeme planı yüklü projeler.</p>
            </div>
            <Link href="/ara" className="link-more">Tüm projeler →</Link>
          </div>

          <div className="grid-villas">
            {v.vitrin.slice(0, 3).map((p) => <ProjeKarti key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ═══ HAFTANIN SEÇKİSİ ═══ */}
      {v.vitrin.length > 3 && (
        <section className="section-cokuk">
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="eyebrow">Bu hafta</span>
                <h2>Yeni <em>eklenenler</em></h2>
                <p>Son yedi günde lansmanı açılan ya da fiyatı güncellenen projeler.</p>
              </div>
              <Link href="/ara?sirala=yeni" className="link-more">Hepsini gör →</Link>
            </div>
            <div className="grid-villas">
              {v.vitrin.slice(3, 6).map((p) => <ProjeKarti key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══ NEDEN BİZ ═══ */}
      <section className="wrap section">
        <p className="neden-serit">Bir projeyi öne çıkarmak için para almıyoruz.</p>
        <div className="guven-grid">
          {[
            ['Fiyat geçmişi açık', 'Zam da indirim de kayıtta kalıyor; ekran görüntüsü almanıza gerek yok.'],
            ['Teslim sözü takipte', 'İlan edilen tarih ve gerçekleşen tarih yan yana duruyor.'],
            ['Sicil doğrulanıyor', 'Firma unvanı ve ticaret sicil numarası kontrol edilmeden yayına girmiyor.'],
            ['Düzeltme herkese açık', 'Yanlış gördüğünüz bilgiyi bildirin; düzeltme kaydı da görünür kalıyor.'],
          ].map(([bas, alt]) => (
            <div className="trust" key={bas}>
              <div>
                <b>{bas}</b>
                <span>{alt}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ BÖLGELER ═══ */}
      {bolgeler.length > 0 && (
        <section className="wrap section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Nerede arıyorsunuz</span>
              <h2>Bölge <em>keşfi</em></h2>
            </div>
            <Link href="/ara" className="link-more">Tüm bölgeler →</Link>
          </div>

          <div className="regions">
            {bolgeler.map((b) => (
              <Link href={b.yol} className="region" key={b.yol}>
                <BolgeGorseli tur={b.tur} anahtar={b.yol} ad={b.ad} />
                <span className="region-txt">
                  <b>{b.ad}</b>
                  <span>{b.alt}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ TEMALAR ═══ */}
      {v.temalar.length > 0 && (
        <section className="wrap section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Ne aradığınızı biliyorsanız</span>
              <h2>Proje <em>temaları</em></h2>
            </div>
          </div>
          <div className="tema-grid">
            {v.temalar.slice(0, 6).map((t) => (
              <Link
                href={TEMA_YOLLARI[t.anahtar] ?? `/ara?tema=${t.anahtar}`}
                className="tema"
                key={t.anahtar}
              >
                <b>{TEMA_ADLARI[t.anahtar] ?? t.anahtar}</b>
                <span className="sayi">{t.n}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ TESLİM TAKVİMİ ═══ */}
      {v.takvim.length > 0 && (
        <section className="section-cokuk">
          <div className="wrap">
            <div className="section-head">
              <div>
                <span className="eyebrow">Ne zaman taşınmak istiyorsunuz</span>
                <h2>Teslim <em>takvimi</em></h2>
                <p>
                  Hangi dönemde kaç projenin teslim edileceği. Çeyreğe
                  tıklayın, o dönemde teslim edilecek projeleri görün.
                </p>
              </div>
              <Link href="/teslim-takvimi" className="link-more">Takvimi aç →</Link>
            </div>

            <div className="izgara">
              {v.takvim.map((y) => (
                <div className="satir" key={y.yil}>
                  <b className="sayi" style={{ flex: 'none', width: 56 }}>{y.yil}</b>
                  <div className="chips">
                    {y.ceyrekler.map((c) => (
                      <Link
                        href={`/teslim-takvimi?ceyrek=${y.yil}Q${c.c}`}
                        className="chip"
                        key={c.c}
                      >
                        {c.c}. çeyrek
                        <span className="chip-sayi sayi">{c.n}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ TESLİM EDİLEN PROJELER ═══
          Kiralama sitesindeki misafir yorumlarının karşılığı. Satışta
          alıcı yılda bir kez alır, yorum birikmez; yerine söz verilen
          ve gerçekleşen teslim yan yana konuyor. İyi örnekle kötü örnek
          BİRLİKTE geliyor — yalnızca zamanında teslim edilenleri
          göstermek reklam olurdu, kanıt değil. */}
      {v.teslimler.length > 0 && (
        <section className="wrap section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Sözün tutulduğu yer</span>
              <h2>Teslim edilen <em>projeler</em></h2>
              <p>
                Söz verilen tarih ve gerçekleşen tarih yan yana. Geciken
                proje de burada — kayıt seçmeli olmuyor.
              </p>
            </div>
            <Link href="/firmalar" className="link-more">Firma karneleri →</Link>
          </div>

          <ul className="guven-grid">
            {v.teslimler.slice(0, 4).map((t) => (
              <TeslimKarti key={`${t.firma_slug}-${t.ad}`} t={t} />
            ))}
          </ul>
        </section>
      )}

      {/* ═══ SAHİP ÇAĞRISI ═══ */}
      <section className="wrap section">
        <div className="cta-serit">
          <div>
            <h2 className="h2">Projeniz mi var?</h2>
            <p>
              Kaydınızı siz giriyorsunuz, biz doğruluyoruz. Öne çıkarma
              satmıyoruz — sıralamayı fiyat, teslim ve kayıt bütünlüğü
              belirliyor.
            </p>
          </div>
          <Link href="/yonetim/giris" className="btn btn-accent btn-lg">
            Projemi ekle
          </Link>
        </div>
      </section>

      <SiteAltBilgi />
      <MobilCubuk />
    </>
  );
}
