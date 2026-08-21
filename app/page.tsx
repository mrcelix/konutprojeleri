import Link from 'next/link';
import type { Metadata } from 'next';
import {
  anaSayfaVerisi, vitrinRozeti, basHarfler, firmaRengi, ilAdi,
  SEGMENT_ADLARI, TEMA_ADLARI, TEMA_YOLLARI,
  type VitrinProjesi, type TeslimEdilen,
} from '@/lib/queries/anasayfa';
import { SiteBasligi } from '@/components/SiteBasligi';
import { SiteAltBilgi } from '@/components/SiteAltBilgi';
import { MobilCubuk } from '@/components/MobilCubuk';
import { AramaKutusu } from '@/components/anasayfa/AramaKutusu';
import { BolgeGorseli, KartGorseli, ArsivGorseli, KarneGorseli } from '@/components/anasayfa/Gorseller';
import { teslim } from '@/lib/format';

/**
 * Ana sayfa.
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
    <article className="pk">
      <Link href={yol} className="pk-gorsel" aria-label={p.ad}>
        <KartGorseli tip={p.tip} />
        <span className="pk-rozetler">
          {p.santiye_yuzde != null && p.santiye_yuzde >= 60 && (
            <span className="pk-rozet r-gok">%{p.santiye_yuzde} tamamlandı</span>
          )}
          {rozet && <span className={`pk-rozet ${rozet.sinif}`}>{rozet.metin}</span>}
        </span>
        <span className="pk-kalp" aria-hidden>♡</span>
      </Link>

      <div className="pk-govde">
        <span className="pk-tip">{SEGMENT_ADLARI[p.tip] ?? p.tip}</span>
        <h3 className="pk-ad"><Link href={yol}>{p.ad}</Link></h3>

        <p className="pk-yer">
          <i aria-hidden>◉</i>
          {ilAdi(p.il)} · {p.ilce}
          {p.denize_mesafe_m != null && (
            <> · {p.denize_mesafe_m === 0 ? 'denize sıfır' : `denize ${bicim.format(p.denize_mesafe_m)} m`}</>
          )}
        </p>

        <div className="pk-ozet">
          {p.odalar && <span className="pk-oz"><b>{p.odalar}</b></span>}
          {p.kapali_m2 != null && (
            <span className="pk-oz"><b>{bicim.format(p.kapali_m2)}</b><span>m²</span></span>
          )}
          {p.arsa_m2 != null && (
            <span className="pk-oz"><b>{bicim.format(p.arsa_m2)}</b><span>{arsaEtiketi}</span></span>
          )}
          {teslim(p.teslim_ceyrek) && (
            <span className="pk-oz"><b>{teslim(p.teslim_ceyrek)}</b></span>
          )}
        </div>

        <div className="pk-alt">
          <div className="pk-fiyat">
            {p.min_fiyat != null ? (
              <><b>{bicim.format(p.min_fiyat)}</b><small>₺’den</small></>
            ) : (
              <b style={{ fontSize: 16 }}>Firma açıklamadı</b>
            )}
          </div>
          <p className="pk-taksit">
            {p.pesinat_orani != null && p.vade_ay ? (
              <>
                %{Math.round(p.pesinat_orani)} peşinat · {p.vade_ay} ay
                {p.faizsiz ? ' faizsiz' : ''}
                {aylik != null && <> · aylık {bicim.format(aylik)} ₺’den</>}
              </>
            ) : (
              'Ödeme planı bildirilmedi'
            )}
          </p>
          <div className="pk-link">
            <span className="pk-firma">
              <span className="pk-av" style={{ background: firmaRengi(p.firma_slug) }}>
                {basHarfler(p.firma_ad)}
              </span>
              <Link href={`/firmalar/${p.firma_slug}`}>{p.firma_ad}</Link>
            </span>
            <Link href={yol} className="pk-devam">Detaylı bilgi →</Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ───────── Teslim edilen proje ───────── */

function TeslimKarti({ t }: { t: TeslimEdilen }) {
  const gecikti = t.gecikme_ay > 0;
  return (
    <div className="te-kart">
      <div className="te-ust">
        <span className={`te-rozet${gecikti ? ' is-gec' : ''}`}>
          {gecikti ? `${t.gecikme_ay} ay gecikti` : 'Zamanında teslim'}
        </span>
        <span className="te-tarih">{teslim(t.gerceklesen)}</span>
      </div>
      <h3>{t.ad}</h3>
      <p className="te-yer">
        {ilAdi(t.il)} · {t.ilce}
        {t.konut != null && ` · ${bicim.format(t.konut)} birim`}
      </p>
      <div className="te-satir"><span>Söz verilen</span><b>{teslim(t.ilan_edilen)}</b></div>
      <div className="te-satir"><span>Gerçekleşen</span><b>{teslim(t.gerceklesen)}</b></div>
      <div className="te-satir">
        <span>Gecikme</span>
        <b>{gecikti ? `${t.gecikme_ay} ay` : 'yok'}</b>
      </div>
      <Link href={`/firmalar/${t.firma_slug}`} className="te-firma">
        <span className="pk-av" style={{ background: firmaRengi(t.firma_slug) }}>
          {basHarfler(t.firma_ad)}
        </span>
        {t.firma_ad}
        {t.sicil && (
          <span className={`karne${t.sicil.startsWith('A') ? '' : ' is-dus'}`}>{t.sicil}</span>
        )}
      </Link>
    </div>
  );
}

/* ───────── Sabit metinler ───────── */

const GUVEN = [
  { ad: 'Her proje doğrulanır', d: 'M7 10l2 2 4-4', c: true },
  { ad: 'KDV ve tapu harcı ayrı belirtilir', d: 'M4 16V7h12v9Z M8 7V4h4v3' },
  { ad: 'Teslim karnesi açık', d: 'M3 16V8M8 16V4M13 16v-6M18 16v-9' },
  { ad: 'Fiyatlar haftalık teyitli', d: 'M10 5.5V10l3 2', c: true },
  { ad: 'Aracısız iletişim', d: 'M3 6h14v9H3Z M3 6l7 5 7-5' },
];

const ADIMLAR = [
  { b: 'Projeni seç', p: 'Konum, tip, bütçe ve teslim tarihine göre süz. Dört projeye kadar yan yana karşılaştır.' },
  { b: 'Ödeme planını gör', p: 'Peşinat, vade ve aylık taksit her daire tipi için ayrı. Banka kredisiyle karşılaştır.' },
  { b: 'Fiyat listesi iste', p: 'Tek form. Numaran yalnızca seçtiğin projenin firmasına gider, havuza atılmaz.' },
  { b: 'Yerinde gez', p: 'Firmanın ortalama yanıt süresi karnesinde yazılı. Geç dönen firma orada görünür.' },
];

const NEDEN = [
  { b: 'Her proje doğrulanır', p: 'Firmanın vergi numarası ve sicil kaydı kontrol edilir; ruhsat durumu projede yazılıdır.',
    d: 'M10 2 L17 5v6c0 4-3 6-7 7-4-1-7-3-7-7V5Z M7 10l2 2 4-4' },
  { b: 'Fiyat geçmişi açık', p: 'Her fiyat değişikliği arşive kalıcı olarak yazılır. Geriye dönük düzeltme mümkün değildir.',
    d: 'M3 16V8M8 16V4M13 16v-6M18 16v-9' },
  { b: 'Teslim karnesi', p: 'Söz verilen ve gerçekleşen teslim tarihleri karşılaştırılır; ortalama gecikme yazılıdır.',
    d: 'M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15Z M10 5.5V10l3 2' },
  { b: 'Aracı yok', p: 'Talebiniz doğrudan müteahhide gider. Numaranız havuza atılmaz, üçüncü tarafa satılmaz.',
    d: 'M3 6h14v9H3Z M3 6l7 5 7-5' },
];

export default async function AnaSayfa() {
  const v = await anaSayfaVerisi().catch(() => null);

  const segmentler = (v?.segmentler ?? []).filter((s) =>
    ['konut', 'villa', 'mustakil', 'yali', 'rezidans', 'ofis'].includes(s.tip)
  );

  const bolgeler = [
    ...(v?.sahiller ?? []).map((b) => ({
      ad: b.ad, n: b.n, yol: `/ara?bolge=${b.slug}`, tur: 'sahil' as const,
    })),
    ...(v?.sehirler ?? []).map((s) => ({
      ad: ilAdi(s.il), n: s.n, yol: `/${s.il}-konut-projeleri`, tur: 'sehir' as const,
    })),
  ].slice(0, 8);

  // Sahil bölgesi olanlar villa, olmayanlar konut ağırlıklı — vitrin
  // ikiye bölünüyor ki her iki kitle de ilk ekranda kendini bulsun.
  const yakinda = (v?.vitrin ?? []).slice(0, 3);
  const secki = (v?.vitrin ?? []).slice(3, 7);

  return (
    <>
      <SiteBasligi aktif="/" />

      {/* ── Hero ── */}
      <section className="hr">
        <div className="vh-sar hr-ic">
          {v?.buHafta ? (
            <span className="hr-etiket">✦ Bu hafta {v.buHafta} yeni proje eklendi</span>
          ) : null}
          <h1 className="hr-h1">
            Satılık konut, villa ve ofis projeleri <em>tek yerde</em>
          </h1>
          <p className="hr-alt">
            Fiyat, kat planı, ödeme planı ve teslim tarihiyle. Telefon etmeden
            önce her şeyi görün.
          </p>
        </div>
      </section>

      <div className="vh-sar">
        <AramaKutusu
          iller={(v?.sehirler ?? []).map((s) => ({ deger: s.il, ad: ilAdi(s.il), n: s.n }))}
          segmentler={segmentler.map((s) => ({
            deger: s.tip, ad: SEGMENT_ADLARI[s.tip] ?? s.tip,
          }))}
          toplam={v?.toplamProje ?? 0}
          bolgeSayisi={v?.toplamIl ?? 0}
        />
      </div>

      {/* ── Güven şeridi ── */}
      <div className="gv" style={{ marginTop: 26 }}>
        <div className="gv-ic">
          {GUVEN.map((g) => (
            <span key={g.ad} className="gv-oge">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none"
                stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
                {g.c && <circle cx="10" cy="10" r="7.5" />}
                <path d={g.d} />
              </svg>
              {g.ad}
            </span>
          ))}
        </div>
      </div>

      {/* ── Nasıl çalışır ── */}
      <section className="bl-bolum">
        <header className="bs">
          <div>
            <h2 className="bs-h2">Nasıl çalışır</h2>
            <p className="bs-alt">Dört adım, komisyon yok</p>
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

      {/* ── İki güven bloğu ── */}
      <section className="bl-gri">
        <div className="vh-sar">
          <div className="ik">
            <div className="ik-kart">
              <span className="ik-gorsel"><ArsivGorseli /></span>
              <div>
                <h3>Fiyat arşivi silinmez</h3>
                <p>
                  Bir projenin fiyatı her değiştiğinde arşive kalıcı bir satır
                  düşer; geriye dönüp değiştirilemez. Bugünkü fiyatın altı ay
                  önce ne olduğunu görebilirsiniz.
                </p>
                <Link href="/fiyat-endeksi" className="kp-btn is-ghost is-small">
                  Fiyat endeksini görün
                </Link>
              </div>
            </div>

            <div className="ik-kart">
              <span className="ik-gorsel"><KarneGorseli /></span>
              <div>
                <h3>Teslim tarihini biz takip ediyoruz</h3>
                <p>
                  Söz verilen tarih ile gerçekleşen teslim kaydedilir. Ortalama
                  gecikme her firmanın karnesinde yazılı; sektör ortalaması 2,7 ay.
                </p>
                <Link href="/firmalar" className="kp-btn is-ghost is-small">
                  Firma karnelerini inceleyin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Yakında teslim ── */}
      {yakinda.length > 0 && (
        <section className="bl-bolum">
          <header className="bs">
            <div>
              <h2 className="bs-h2">Öne çıkan projeler</h2>
              <p className="bs-alt">Fiyatı son 30 günde teyit edilmiş, teslim tarihi belli projeler</p>
            </div>
            <Link href="/ara" className="bs-tumu">
              {bicim.format(v?.toplamProje ?? 0)} projenin tümü →
            </Link>
          </header>
          <div className="pk-liste u3">
            {yakinda.map((p) => <ProjeKarti key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ── Seçki ── */}
      {secki.length > 0 && (
        <section className="bl-gri">
          <div className="vh-sar">
            <header className="bs">
              <div>
                <h2 className="bs-h2">Bu haftanın seçkisi</h2>
                <p className="bs-alt">Konut, villa ve ofis projelerinden</p>
              </div>
              <Link href="/ara?tip=villa" className="bs-tumu">Villa projeleri →</Link>
            </header>
            <div className="pk-liste u4">
              {secki.map((p) => <ProjeKarti key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── Neden biz ── */}
      <section className="bl-bolum">
        <header className="bs">
          <div><h2 className="bs-h2">Neden konutprojeleri?</h2></div>
        </header>
        <div className="nd">
          {NEDEN.map((n) => (
            <div key={n.b} className="nd-oge">
              <span className="nd-ikon" aria-hidden>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d={n.d} />
                </svg>
              </span>
              <b>{n.b}</b>
              <p>{n.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bölgeler ── */}
      {bolgeler.length > 0 && (
        <section className="bl-gri">
          <div className="vh-sar">
            <header className="bs">
              <div>
                <h2 className="bs-h2">Bölge keşfi</h2>
                <p className="bs-alt">Nereye taşınmak istersiniz?</p>
              </div>
              <Link href="/ara" className="bs-tumu">Tüm bölgeler →</Link>
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
          </div>
        </section>
      )}

      {/* ── Temalar ── */}
      {v && v.temalar.length > 0 && (
        <section className="bl-bolum">
          <header className="bs">
            <div>
              <h2 className="bs-h2">Proje temaları</h2>
              <p className="bs-alt">Aradığınıza göre doğrudan süzgece gidin</p>
            </div>
          </header>
          <div className="tm">
            {v.temalar.map((t) => (
              <Link key={t.anahtar} href={TEMA_YOLLARI[t.anahtar] ?? '/ara'} className="tm-oge">
                {TEMA_ADLARI[t.anahtar] ?? t.anahtar}
                <em>{t.n}</em>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Teslim takvimi ── */}
      {v && v.takvim.length > 0 && (
        <section className="bl-gri">
          <div className="vh-sar">
            <header className="bs">
              <div>
                <h2 className="bs-h2">Ne zaman taşınmak istersiniz?</h2>
                <p className="bs-alt">Teslim çeyreğine göre satıştaki projeler</p>
              </div>
              <Link href="/teslim-takvimi" className="bs-tumu">Teslim takvimi →</Link>
            </header>
            <div className="tk">
              {v.takvim.map((y) => (
                <div key={y.yil} className="tk-yil">
                  <b>{y.yil}</b>
                  {y.ceyrekler.map((c) => (
                    <Link key={c.c} href={`/teslim-takvimi`}>
                      {c.c}. çeyrek <em>{c.n}</em>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Teslim edilenler ── */}
      {v && v.teslimler.length > 0 && (
        <section className="bl-bolum">
          <header className="bs">
            <div>
              <h2 className="bs-h2">Teslim edilen projeler</h2>
              <p className="bs-alt">Söz verilen tarih ile gerçekleşen teslim yan yana</p>
            </div>
            <Link href="/firmalar" className="bs-tumu">Firma karneleri →</Link>
          </header>
          <div className="te">
            {v.teslimler.map((t) => <TeslimKarti key={`${t.firma_slug}-${t.ad}`} t={t} />)}
          </div>
        </section>
      )}

      {/* ── Sahip bandı ── */}
      <section className="bl-bolum">
        <div className="ct">
          <div>
            <h2>Projeniz mi var?</h2>
            <p>
              Projenizi yayınlayın, talepler doğrudan size gelsin. Fiyat ve teslim
              bilgisi güncel tutuldukça listede üst sıralarda kalır; karneniz de
              zamanında teslim ettikçe yükselir.
            </p>
          </div>
          <Link href="/yonetim/giris" className="kp-btn is-eylem">Projemi ekle</Link>
        </div>
      </section>

      <SiteAltBilgi />
      <MobilCubuk />
    </>
  );
}
