import Link from 'next/link';
import type { Metadata } from 'next';
import { butceEslesme, baglayan, tavanFiyat, type ButceDairesi } from '@/lib/queries/butce';
import { DAIRE_TIPLERI } from '@/lib/filtre';
import { para, paraKisa, teslim, alan } from '@/lib/format';

/**
 * /butce — ödeme kapasitesi birincil eksen.
 *
 * Zaman ekseninin (teslim takvimi) ikizi. Kullanıcı fiyat aralığını
 * değil elindeki parayı ve aylık ödeyebileceğini bilir. Bugünkü
 * portallarda bu iki bilgiyi fiyat aralığına çevirme işi kullanıcıya
 * bırakılıyor; çoğu çeviremiyor ve yanlış segmentte geziniyor.
 *
 * Sayfa JavaScript olmadan çalışır: form GET ile kendine gönderir,
 * sonuç sunucuda hesaplanır, adres paylaşılabilir.
 */

export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'Bütçeme Uyan Konut Projeleri',
  description:
    'Peşinatınızı ve aylık ödeyebileceğiniz tutarı girin; firmaların ' +
    'beyan ettiği senetli ödeme planlarına göre bütçenize uyan projeleri ' +
    've daire tiplerini görün.',
  alternates: { canonical: '/butce' },
};

const IL_ADLARI: Record<string, string> = {
  istanbul: 'İstanbul', ankara: 'Ankara', izmir: 'İzmir',
  bursa: 'Bursa', antalya: 'Antalya', kocaeli: 'Kocaeli',
};

const ORNEKLER = [
  { pesinat: 750_000, aylik: 45_000, ad: '750 bin peşinat · aylık 45 bin' },
  { pesinat: 1_500_000, aylik: 80_000, ad: '1,5 milyon peşinat · aylık 80 bin' },
  { pesinat: 3_000_000, aylik: 150_000, ad: '3 milyon peşinat · aylık 150 bin' },
];

type Arama = Record<string, string | string[] | undefined>;
const tek = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Girilen metni sayıya çevirir: '1.500.000', '1500000 TL', '1 500 000' hepsi olur. */
function tutar(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const temiz = v.replace(/[^\d]/g, '');
  if (!temiz) return undefined;
  const n = Number(temiz);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function DaireKarti({ d, vurgu }: { d: ButceDairesi; vurgu?: boolean }) {
  return (
    <li className={`bt-kart${vurgu ? ' is-yakin' : ''}`}>
      <Link href={`/${d.il}/${d.ilce}/${d.slug}`} className="bt-kart__ad">
        <b>{d.ad}</b>
        <span>{d.firma_ad} · {d.ilce}</span>
      </Link>

      <div className="bt-kart__tip">
        <b>{d.tip}</b>
        {alan(d.net_m2) && <span>{alan(d.net_m2)}</span>}
      </div>

      <dl className="bt-kart__odeme">
        <div>
          <dt>Peşinat</dt>
          <dd>{para(d.gereken_pesinat)}</dd>
        </div>
        <div>
          <dt>Aylık × {d.vade_ay} ay</dt>
          <dd>{para(d.aylik_senet)}</dd>
        </div>
        <div>
          <dt>Liste fiyatı</dt>
          <dd className="bt-sonuc">{para(d.liste_fiyati)}</dd>
        </div>
      </dl>

      <div className="bt-kart__etiket">
        {d.faizsiz && <span className="kp-pill is-success">Faizsiz</span>}
        {teslim(d.teslim_ceyrek) && (
          <span className="kp-pill">{teslim(d.teslim_ceyrek)} teslim</span>
        )}
        {d.santiye_yuzde != null && (
          <span className="kp-pill">%{d.santiye_yuzde} tamamlandı</span>
        )}
      </div>
    </li>
  );
}

export default async function ButceSayfasi({
  searchParams,
}: {
  searchParams: Promise<Arama>;
}) {
  const q = await searchParams;
  const pesinat = tutar(tek(q.pesinat));
  const aylik = tutar(tek(q.aylik));
  const il = tek(q.il);
  const tipHam = tek(q.tip);
  const tip = tipHam && DAIRE_TIPLERI.includes(tipHam) ? tipHam : undefined;

  const girdiVar = pesinat != null && aylik != null;
  const sonuc = girdiVar
    ? await butceEslesme({ pesinat, aylik, il, tip }).catch(() => null)
    : null;

  const kisit = sonuc ? baglayan(sonuc) : null;
  const tavan = girdiVar ? tavanFiyat({ pesinat, aylik }) : null;

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-5)' }}>
      <header style={{ maxWidth: 640, marginBottom: 'var(--s-4)' }}>
        <h1 className="kp-h1">Bütçeme ne uyar</h1>
        <p className="kp-lead">
          Fiyat aralığı değil, elinizdeki parayı ve aylık ödeyebileceğinizi
          girin. Firmaların beyan ettiği senetli ödeme planlarına göre hangi
          projelerin hangi daire tiplerinin bütçenize girdiğini hesaplayalım.
        </p>
      </header>

      {/* ── Girdi formu · JavaScript gerekmez ── */}
      <form method="get" action="/butce" className="bt-form">
        <label className="bt-alan">
          <span className="kp-label">Peşinat olarak ayırabileceğiniz</span>
          <div className="bt-girdi">
            <input
              type="text" name="pesinat" inputMode="numeric"
              defaultValue={pesinat ? pesinat.toLocaleString('tr-TR') : ''}
              placeholder="1.500.000" autoComplete="off"
            />
            <i>₺</i>
          </div>
        </label>

        <label className="bt-alan">
          <span className="kp-label">Aylık ödeyebileceğiniz</span>
          <div className="bt-girdi">
            <input
              type="text" name="aylik" inputMode="numeric"
              defaultValue={aylik ? aylik.toLocaleString('tr-TR') : ''}
              placeholder="80.000" autoComplete="off"
            />
            <i>₺</i>
          </div>
        </label>

        <label className="bt-alan bt-alan--dar">
          <span className="kp-label">Şehir</span>
          <select name="il" defaultValue={il ?? ''}>
            <option value="">Farketmez</option>
            {Object.entries(IL_ADLARI).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>

        <label className="bt-alan bt-alan--dar">
          <span className="kp-label">Daire tipi</span>
          <select name="tip" defaultValue={tip ?? ''}>
            <option value="">Farketmez</option>
            {DAIRE_TIPLERI.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <button type="submit" className="kp-btn bt-gonder">
          Hesapla
        </button>
      </form>

      {!girdiVar && (
        <div className="bt-ornekler">
          <span className="kp-label">Örnek bütçelerle deneyin</span>
          {ORNEKLER.map((o) => (
            <Link
              key={o.ad}
              href={`/butce?pesinat=${o.pesinat}&aylik=${o.aylik}`}
              className="kp-chip"
            >
              {o.ad}
            </Link>
          ))}
        </div>
      )}

      {/* ── Sonuç ── */}
      {girdiVar && sonuc && (
        <section style={{ marginTop: 'var(--s-5)' }}>
          {sonuc.projeSayisi > 0 ? (
            <>
              <h2 className="kp-h2" style={{ marginBottom: 4 }}>
                {sonuc.projeSayisi} projede {sonuc.daireSayisi} daire tipi
                bütçenize uyuyor
              </h2>
              <p className="tk-ozet">
                {para(pesinat)} peşinat · aylık {para(aylik)}
                {il && ` · ${IL_ADLARI[il] ?? il}`}
                {tip && ` · ${tip}`}
                {sonuc.enYuksekFiyat != null && (
                  <>
                    {' '}· ulaşabildiğiniz en yüksek liste fiyatı{' '}
                    <b>{para(sonuc.enYuksekFiyat)}</b>
                  </>
                )}
              </p>

              {sonuc.esik10 > sonuc.projeSayisi && (
                <div className="tk-okuma" style={{ marginBottom: 'var(--s-4)' }}>
                  Bütçenizi <b>%10</b> artırırsanız{' '}
                  <b>{sonuc.esik10 - sonuc.projeSayisi} proje daha</b> açılıyor;
                  %25 artırırsanız {sonuc.esik25 - sonuc.projeSayisi} proje daha.
                  Eşiğin hemen üstündeki seçenekleri görmek pazarlıkta işinize
                  yarayabilir.
                </div>
              )}

              <ul className="bt-liste">
                {sonuc.uyanlar.map((d) => (
                  <DaireKarti key={`${d.id}-${d.tip}`} d={d} />
                ))}
              </ul>

              {sonuc.projeSayisi > sonuc.uyanlar.length && (
                <p className="kp-body" style={{ marginTop: 'var(--s-3)' }}>
                  En uygun {sonuc.uyanlar.length} proje gösteriliyor.
                  Daralmak için şehir ya da daire tipi seçin.
                </p>
              )}
            </>
          ) : (
            <div className="kp-card kp-empty">
              <p className="kp-empty__title">
                Bu bütçeyle eşleşen bir ödeme planı bulunamadı
              </p>
              <p className="kp-empty__text">
                {kisit === 'aylik' && (
                  <>
                    Peşinatınız <b>{sonuc.pesinatUyan} projeye</b> yetiyor ama
                    aylık ödeme kapasiteniz yalnızca {sonuc.aylikUyan} projeye
                    yetişiyor. Bağlayan kısıt aylık ödeme — peşinatı artırmak
                    burada daha çok işe yarar, çünkü kalan bedel düşer.
                  </>
                )}
                {kisit === 'pesinat' && (
                  <>
                    Aylık ödeme kapasiteniz <b>{sonuc.aylikUyan} projeye</b>
                    {' '}yetiyor ama peşinat yalnızca {sonuc.pesinatUyan} projeye
                    yetişiyor. Bağlayan kısıt peşinat — daha uzun vadeli değil,
                    daha düşük peşinat oranlı projelere bakmak gerekir.
                  </>
                )}
                {kisit === 'ikisi' && (
                  <>
                    Hem peşinat hem aylık ödeme, mevcut planların altında
                    kalıyor. Şehir ya da daire tipi kısıtını kaldırmayı deneyin.
                  </>
                )}
              </p>
              {sonuc.esik25 > 0 && (
                <p className="kp-empty__text">
                  Bütçeyi %25 artırdığınızda {sonuc.esik25} proje açılıyor.
                </p>
              )}
              <Link href="/butce" className="kp-empty__option is-primary">
                Bütçeyi değiştir
              </Link>
            </div>
          )}

          {/* Az farkla kaçanlar */}
          {sonuc.yakinlar.length > 0 && (
            <section style={{ marginTop: 'var(--s-6)' }}>
              <h2 className="kp-h3">Az farkla kaçanlar</h2>
              <p className="kp-body" style={{ maxWidth: '68ch', marginBottom: 'var(--s-3)' }}>
                Bütçenizin en fazla %30 üstünde kalan planlar. Gizlemek yerine
                gösteriyoruz — eşiğin nerede olduğunu görmek, pazarlık payını
                bilmeye yarar.
              </p>
              <ul className="bt-liste">
                {sonuc.yakinlar.map((d) => (
                  <DaireKarti key={`y-${d.id}-${d.tip}`} d={d} vurgu />
                ))}
              </ul>
            </section>
          )}

          {sonuc.plansiz > 0 && (
            <p className="kp-body" style={{ marginTop: 'var(--s-4)' }}>
              <b>{sonuc.plansiz} proje</b> ödeme planını bildirmediği için bu
              hesaba giremedi. Listede görünmemeleri bütçenize uymadıkları
              anlamına gelmez.
            </p>
          )}
        </section>
      )}

      {/* ── Yöntem ve uyarı ── */}
      <section className="kp-card" style={{ marginTop: 'var(--s-6)', maxWidth: 760 }}>
        <h2 className="kp-h3">Bu hesap neyi gösterir, neyi göstermez</h2>
        <p className="kp-body">
          Hesap, firmanın kendi <b>senetli ödeme planına</b> dayanır: peşinat
          oranı ve vade firmanın beyanıdır. Aylık tutar, kalan bedelin vadeye
          bölünmesiyle bulunur; faiz eklenmez. Banka kredisiyle karşılaştırma
          proje detay sayfasındaki hesaplayıcıda yapılır.
        </p>
        <p className="kp-body">
          Fiyatlar liste fiyatıdır; tapu harcı, KDV farkı, aidat, demirbaş ve
          teslim sonrası masraflar dahil değildir. Bu sayfa yatırım tavsiyesi
          değildir ve kredi teklifi anlamına gelmez.
          {tavan != null && (
            <>
              {' '}Girdiğiniz bütçenin kaba üst sınırı — %30 peşinat ve 36 ay
              vade varsayımıyla — yaklaşık <b>{paraKisa(tavan)}</b>; gerçek
              sınır her projenin kendi planına göre değişir.
            </>
          )}
        </p>
      </section>
    </main>
  );
}
