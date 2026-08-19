import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { firmaKarnesi, firmalar, SEKTOR, type FirmaKarne, type TeslimKaydi } from '@/lib/queries/firma';
import { para, paraKisa, yuzde, teslim } from '@/lib/format';
import { Pill, SantiyePill } from '@/components/ui/Pill';

/**
 * Firma karnesi — /firmalar/esat-insaat
 *
 * Sitenin asıl ayrıştırıcısı: "bu müteahhit teslimlerini geciktiriyor mu"
 * sorusuna cevap veren tek yer. Veri zaten envanterde — ilan arşivindeki
 * teslim tarihleri. Rakiplerin kopyalaması için yıllarca veri biriktirmesi
 * gerekir.
 *
 * KARNE YORUM İÇERMEZ. Yalnızca doğrulanabilir dört veri: teslim isabeti,
 * deneyim hacmi, veri şeffaflığı, yanıt süresi. Editör kanaati girmez —
 * girerse savunulamaz.
 *
 * Not para ile değişmez: abonelik paketi ve öne çıkarma satın almak
 * karneyi etkilemez. Bu kural sayfada yazılı durur.
 */

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ slug: string }> };

/**
 * Firma sayfaları önceden üretilir. Marka aramaları ("esat inşaat güvenilir mi")
 * yüksek dönüşümlü trafiktir; ilk ziyaretçiyi soğuk sayfaya düşürmemek gerekir.
 */
export async function generateStaticParams() {
  try {
    return (await firmalar()).map((f) => ({ slug: f.slug }));
  } catch {
    return []; // veritabanı yoksa derleme kırılmaz
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const f = await firmaKarnesi(slug);
  if (!f) return {};

  const notVar = f.tamamlanan >= 2;
  return {
    title:
      `${f.ad} — ${f.tamamlanan + f.aktif_proje} Proje` +
      (notVar && f.sicil ? `, Sicil ${f.sicil}` : '') +
      (notVar && f.ort_gecikme != null
        ? `, Ort. Teslim Gecikmesi ${f.ort_gecikme.toFixed(1)} Ay` : ''),
    description:
      `${f.ad} firma karnesi: ${f.tamamlanan} tamamlanmış, ${f.aktif_proje} aktif proje. ` +
      (notVar && f.ort_gecikme != null
        ? `Ortalama teslim gecikmesi ${f.ort_gecikme.toFixed(1)} ay (sektör ${SEKTOR.ortGecikme}). `
        : '') +
      `Teslim performansı, aktif projeler ve fiyat konumlanması.`,
    alternates: { canonical: `/firmalar/${slug}` },
  };
}

export default async function FirmaSayfasi({ params }: Params) {
  const { slug } = await params;
  const f = await firmaKarnesi(slug);
  if (!f) notFound();

  // Eşik: 2 tamamlanmış projeden azı olan firmaya not verilmez.
  // Yetersiz veriyle not vermek, düşük not vermekten daha yanıltıcıdır.
  const notVar = f.tamamlanan >= 2 && f.sicil != null;

  const teslimliler = f.teslimler.filter((t) => t.gerceklesen && t.gecikme_ay != null);
  const zamaninda = teslimliler.filter((t) => (t.gecikme_ay ?? 0) === 0).length;
  const enUzun = teslimliler.reduce<TeslimKaydi | null>(
    (a, t) => (!a || (t.gecikme_ay ?? 0) > (a.gecikme_ay ?? 0) ? t : a), null
  );

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-5)' }}>
      <JsonLd f={f} />

      <nav className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>
        <Link href="/">Ana sayfa</Link> › <Link href="/firmalar">Firmalar</Link> › {f.ad}
      </nav>

      {/* Hero */}
      <header
        style={{
          background: 'linear-gradient(115deg, var(--tint-blue), var(--tint-lav) 52%, var(--tint-mint))',
          borderRadius: 'var(--r-card)', padding: 'var(--s-5)',
          display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--s-5)',
          alignItems: 'center', marginBottom: 'var(--s-4)',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 74, height: 74, borderRadius: 20, background: 'var(--surface-card)',
            display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 800,
            color: 'var(--brand)',
          }}
        >
          {f.ad.split(' ').slice(0, 2).map((w) => w[0]).join('')}
        </span>

        <div>
          <h1 className="kp-h1" style={{ marginBottom: 4 }}>{f.ad}</h1>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-secondary)' }}>
            {f.kurulus_yili ? `${f.kurulus_yili}'de kuruldu · ` : ''}
            {f.merkez_ilce ? `${f.merkez_ilce} / ` : ''}{f.merkez_il ?? ''} ·{' '}
            {f.tamamlanan} tamamlanmış, {f.aktif_proje} aktif proje
            {f.toplam_konut > 0 && ` · toplam ${f.toplam_konut.toLocaleString('tr-TR')} konut`}
          </p>
          <div className="kp-row" style={{ gap: 6 }}>
            {notVar ? (
              <Pill durum="success">Sicil notu {f.sicil}</Pill>
            ) : (
              <Pill durum="brand">Yeni firma</Pill>
            )}
            {f.dogrulandi && <Pill durum="info">Doğrulanmış firma</Pill>}
            {f.paket !== 'ucretsiz' && <Pill durum="brand">Panelde aktif</Pill>}
            {f.acik_itiraz > 0 && <Pill durum="warning">{f.acik_itiraz} açık itiraz</Pill>}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 6, minWidth: 180 }}>
          <Link href={`/istanbul-konut-projeleri`} className="kp-btn">
            Projelerini gör ({f.aktif_proje})
          </Link>
          <a href="#iletisim" className="kp-btn is-secondary">Firmadan bilgi iste</a>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 310px', gap: 'var(--s-4)', alignItems: 'start' }}>
        <div className="kp-stack">
          {/* ── KARNE ── */}
          <section className="kp-card" style={{ padding: 'var(--s-5)' }} id="karne">
            <div className="kp-row" style={{ marginBottom: 'var(--s-4)' }}>
              <h2 className="kp-h2" style={{ margin: 0 }}>Firma karnesi</h2>
              <span className="kp-label" style={{ marginLeft: 'auto' }}>
                <Link href="/firma-karnesi-metodoloji">Nasıl hesaplanır?</Link>
              </span>
            </div>

            {notVar ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 'var(--s-5)', alignItems: 'center' }}>
                  <div style={{ background: 'var(--success-bg)', borderRadius: 'var(--r-block)', padding: 'var(--s-4)', textAlign: 'center' }}>
                    <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--success)', lineHeight: 1 }}>
                      {f.sicil}
                    </span>
                    <p style={{ margin: '10px 0 0', fontSize: 10.5, color: 'var(--success)', lineHeight: 1.45 }}>
                      Ölçek: A+ · A · B · C · D
                    </p>
                  </div>

                  <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 1, background: 'var(--border)', borderRadius: 'var(--r-block)', overflow: 'hidden', margin: 0 }}>
                    <Metrik
                      baslik="Ortalama teslim gecikmesi"
                      deger={f.ort_gecikme != null ? `${f.ort_gecikme.toFixed(1)} ay` : null}
                      kiyas={`sektör ${SEKTOR.ortGecikme}`}
                      iyi={f.ort_gecikme != null && f.ort_gecikme < SEKTOR.ortGecikme}
                      not={`${teslimliler.length} tamamlanmış projenin ortalaması`}
                    />
                    <Metrik
                      baslik="Zamanında teslim oranı"
                      deger={f.zamaninda_orani != null ? yuzde(f.zamaninda_orani * 100) : null}
                      kiyas={`sektör ${yuzde(SEKTOR.zamanindaOrani * 100)}`}
                      iyi={f.zamaninda_orani != null && f.zamaninda_orani > SEKTOR.zamanindaOrani}
                      not={`${zamaninda} proje ilan edilen çeyrekte teslim edildi`}
                    />
                    <Metrik
                      baslik="En uzun gecikme"
                      deger={enUzun?.gecikme_ay ? `${enUzun.gecikme_ay} ay` : null}
                      not={enUzun?.proje_ad ?? undefined}
                    />
                    <Metrik
                      baslik="Tamamlanan konut"
                      deger={f.toplam_konut ? f.toplam_konut.toLocaleString('tr-TR') : null}
                      not={`${f.tamamlanan} projede`}
                    />
                    <Metrik
                      baslik="Veri güncelliği"
                      deger={f.veri_skoru != null ? yuzde(f.veri_skoru) : null}
                      iyi={(f.veri_skoru ?? 0) >= 75}
                      not="Fiyat ve stok teyit sıklığı"
                    />
                    <Metrik
                      baslik="Müsait daire"
                      deger={f.musait_daire ? String(f.musait_daire) : null}
                      not={`${f.aktif_proje} aktif projede`}
                    />
                  </dl>
                </div>

                <p style={{ marginTop: 'var(--s-4)', background: 'var(--surface-sunken)', borderRadius: 'var(--r-block)', padding: 'var(--s-4)', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <b>Karne nasıl hesaplanır:</b> Not yalnızca doğrulanabilir dört veriden üretilir —
                  ilan edilen teslim çeyreği ile gerçekleşen teslim arasındaki fark, tamamlanan proje
                  sayısı, panelde veri güncelleme sıklığı ve talep yanıt süresi. Yorum, puanlama veya
                  editör kanaati karneye girmez. <b>Abonelik paketi ve reklam harcaması notu
                  değiştirmez.</b> Firma verilere itiraz edebilir; itiraz sonucu bu sayfada görünür.{' '}
                  <Link href="/firma-karnesi-metodoloji" style={{ color: 'var(--brand)', fontWeight: 700 }}>
                    Metodolojinin tamamı
                  </Link>
                </p>
              </>
            ) : (
              <p className="kp-lead">
                Bu firmanın not alabilmesi için en az <b>iki tamamlanmış projesi</b> gerekiyor.
                Şu an {f.tamamlanan} tamamlanmış proje kayıtlı. Yetersiz veriyle not vermek,
                düşük not vermekten daha yanıltıcı olurdu.
              </p>
            )}
          </section>

          {/* ── TESLİM PERFORMANSI ── */}
          {teslimliler.length > 0 && (
            <section className="kp-card" style={{ padding: 'var(--s-5)' }} id="teslim">
              <h2 className="kp-h2">Teslim performansı</h2>
              <p className="kp-label" style={{ marginBottom: 'var(--s-4)' }}>
                İlan edilen teslim ile gerçekleşen teslim farkı
              </p>
              <TeslimGrafigi kayitlar={teslimliler} />
            </section>
          )}

          {/* ── AKTİF PROJELER ── */}
          {f.aktifler.length > 0 && (
            <section className="kp-card" style={{ padding: 'var(--s-5)' }}>
              <h2 className="kp-h2">Aktif projeler</h2>
              <p className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>
                {f.aktif_proje} proje · {f.musait_daire} daire müsait
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 'var(--s-3)' }}>
                {f.aktifler.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/${p.il}/${p.ilce}/${p.slug}`}
                    style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-block)', padding: 'var(--s-4)' }}
                  >
                    <div className="kp-row" style={{ gap: 5, marginBottom: 6 }}>
                      {p.durum === 'lansman'
                        ? <Pill durum="info">Lansman</Pill>
                        : <SantiyePill yuzde={p.santiye_yuzde} />}
                    </div>
                    <b style={{ display: 'block', fontSize: 14, letterSpacing: '-0.02em' }}>{p.ad}</b>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', display: 'block', margin: '2px 0 8px' }}>
                      {p.ilce} · {teslim(p.teslim_ceyrek) ?? 'teslim açıklanmadı'}
                      {p.kalan ? ` · ${p.kalan} müsait` : ''}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.025em' }} className="tabular">
                      {paraKisa(p.min_fiyat) ?? 'Fiyat isteyin'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── TAMAMLANAN PROJELER ── */}
          {f.teslimler.length > 0 && (
            <section className="kp-card" style={{ padding: 'var(--s-5)' }}>
              <h2 className="kp-h2">Tamamlanan projeler</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }} className="tabular">
                  <thead>
                    <tr>
                      {['Proje', 'Konut', 'İlan edilen', 'Gerçekleşen', 'Fark', 'Teslim m²', 'Bugün'].map((h) => (
                        <th key={h} className="kp-label" style={{ textAlign: 'left', padding: '0 9px 8px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {f.teslimler.map((t, i) => (
                      <tr key={`${t.proje_slug ?? t.ilan_edilen}-${i}`} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: 9 }}>
                          {t.proje_slug && t.il && t.ilce ? (
                            <Link href={`/${t.il}/${t.ilce}/${t.proje_slug}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {t.proje_ad}
                            </Link>
                          ) : (
                            <span style={{ fontWeight: 700 }}>{t.proje_ad ?? '—'}</span>
                          )}
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>{t.ilce ?? ''}</span>
                        </td>
                        <td style={{ padding: 9 }}>{t.toplam_konut ?? '—'}</td>
                        <td style={{ padding: 9 }}>{teslim(t.ilan_edilen) ?? t.ilan_edilen}</td>
                        <td style={{ padding: 9 }}>{teslim(t.gerceklesen) ?? '—'}</td>
                        <td style={{ padding: 9 }}><FarkPill ay={t.gecikme_ay} durum={t.durum} /></td>
                        <td style={{ padding: 9 }}>{para(t.teslim_m2_fiyati) ?? '—'}</td>
                        <td style={{ padding: 9, fontWeight: 700 }}>{para(t.guncel_m2_fiyati) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="kp-label" style={{ marginTop: 'var(--s-3)', textTransform: 'none', letterSpacing: 0, lineHeight: 1.55 }}>
                &ldquo;Bugün&rdquo; sütunu o projedeki dairelerin güncel ikinci el m² fiyatını gösterir —
                alıcının yatırım getirisini görebilmesi için. Farklı bir veri kaynağıdır ve teslim
                dönemi fiyatıyla doğrudan karşılaştırılamaz. Her satır bir kaynağa dayanır;
                kaynaksız kayıt karneye dahil edilmez.
              </p>
            </section>
          )}

          {/* ── FİYAT KONUMLANMASI ── */}
          {f.aktifler.some((p) => p.min_m2_birim && p.ilce_m2) && (
            <section className="kp-card" style={{ padding: 'var(--s-5)' }}>
              <h2 className="kp-h2">Fiyat konumlanması</h2>
              <p className="kp-label" style={{ marginBottom: 'var(--s-4)' }}>
                Aktif projeler, bulundukları ilçe ortalamasına göre
              </p>
              <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
                {f.aktifler.filter((p) => p.min_m2_birim && p.ilce_m2).map((p) => {
                  const oran = (p.min_m2_birim! / p.ilce_m2!) * 100;
                  const fark = Math.round(oran - 100);
                  return (
                    <div key={p.slug} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 96px', gap: 'var(--s-3)', alignItems: 'center', fontSize: 11.5 }}>
                      <span style={{ fontWeight: 650 }}>{p.ad}</span>
                      <span style={{ position: 'relative', height: 22, background: 'var(--surface-sunken)', borderRadius: 7 }}>
                        <span style={{
                          position: 'absolute', inset: '0 auto 0 0', borderRadius: 7,
                          width: `${Math.min(100, oran * 0.6)}%`, background: 'var(--brand-soft)',
                        }} />
                        <span style={{
                          position: 'absolute', top: -3, bottom: -3, left: '60%', width: 2,
                          background: 'var(--text-muted)', opacity: 0.55,
                        }} title={`İlçe ortalaması ${para(p.ilce_m2)}`} />
                      </span>
                      <span style={{ textAlign: 'right' }}>
                        <Pill durum={fark <= 0 ? 'success' : 'warning'}>
                          {fark <= 0 ? `%${Math.abs(fark)} altında` : `%${fark} üstünde`}
                        </Pill>
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="kp-label" style={{ marginTop: 'var(--s-3)', textTransform: 'none', letterSpacing: 0, lineHeight: 1.55 }}>
                Ortalamanın altında olmak tek başına ucuzluk göstergesi değildir; konum ilçe
                içinde daha az merkezi olabilir.
              </p>
            </section>
          )}

          {/* ── BÖLGELER ve HAKKINDA ── */}
          {(f.bolgeler.length > 0 || f.hakkinda) && (
            <section className="kp-card" style={{ padding: 'var(--s-5)' }}>
              <h2 className="kp-h2">Faaliyet bölgeleri ve kurumsal bilgiler</h2>
              {f.bolgeler.length > 0 && (
                <div className="kp-row" style={{ gap: 6, marginBottom: 'var(--s-4)' }}>
                  {f.bolgeler.map((b) => (
                    <Link key={b.ilce} href={`/istanbul/${b.ilce}-konut-projeleri`} className="kp-chip">
                      {b.ilce}<span className="kp-chip__count">{b.adet}</span>
                    </Link>
                  ))}
                </div>
              )}
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 1, background: 'var(--border)', borderRadius: 'var(--r-block)', overflow: 'hidden', margin: 0 }}>
                <Kurumsal ad="Kuruluş" deger={f.kurulus_yili ? String(f.kurulus_yili) : null} />
                <Kurumsal ad="Merkez" deger={f.merkez_ilce && f.merkez_il ? `${f.merkez_ilce} / ${f.merkez_il}` : f.merkez_il} />
                <Kurumsal ad="Ortaklıklar" deger={f.ortakliklar?.join(', ') ?? null} />
                <Kurumsal ad="Doğrulama" deger={f.dogrulandi ? 'Vergi no teyitli' : null} />
              </dl>
              {f.hakkinda && <p className="kp-lead" style={{ marginTop: 'var(--s-4)' }}>{f.hakkinda}</p>}
            </section>
          )}
        </div>

        {/* ── YAN SÜTUN ── */}
        <aside className="kp-stack" style={{ position: 'sticky', top: 16 }}>
          <div className="kp-card" style={{ padding: 'var(--s-4)' }}>
            <h2 className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>Özet</h2>
            <Satir ad="Sicil notu" deger={notVar ? f.sicil : 'Yeni firma'} vurgulu={notVar} />
            <Satir ad="Ort. gecikme" deger={f.ort_gecikme != null ? `${f.ort_gecikme.toFixed(1)} ay` : null} />
            <Satir ad="Zamanında teslim" deger={f.zamaninda_orani != null ? yuzde(f.zamaninda_orani * 100) : null} />
            <Satir ad="Aktif proje" deger={String(f.aktif_proje)} />
            <Satir ad="Müsait daire" deger={f.musait_daire ? String(f.musait_daire) : null} />
          </div>

          <form className="kp-card" style={{ padding: 'var(--s-5)' }} id="iletisim" action="/api/talep" method="post">
            <h2 className="kp-h3" style={{ marginBottom: 4 }}>Firmadan bilgi isteyin</h2>
            <p className="kp-lead" style={{ fontSize: 11.5, marginBottom: 'var(--s-3)' }}>
              Talebiniz doğrudan firmanın satış ekibine iletilir. Aracı yoktur.
            </p>
            <input type="hidden" name="firma_slug" value={f.slug} />
            <label className="kp-field" style={{ display: 'block', marginBottom: 8 }}>
              <span className="kp-field__label">Ad Soyad *</span>
              <input name="ad" required className="kp-field__value"
                style={{ border: 0, background: 'transparent', width: '100%', padding: 0, font: 'inherit', color: 'inherit' }} />
            </label>
            <label className="kp-field" style={{ display: 'block', marginBottom: 8 }}>
              <span className="kp-field__label">Telefon *</span>
              <input name="telefon" type="tel" required className="kp-field__value"
                style={{ border: 0, background: 'transparent', width: '100%', padding: 0, font: 'inherit', color: 'inherit' }} />
            </label>
            <label style={{ display: 'flex', gap: 8, fontSize: 10.5, color: 'var(--text-muted)', margin: 'var(--s-3) 0', lineHeight: 1.45 }}>
              <input type="checkbox" name="kvkk" required />
              <span>
                Kişisel verilerin işlenmesine ve yurt dışına aktarımına ilişkin{' '}
                <Link href="/kvkk" style={{ color: 'var(--brand)', fontWeight: 650 }}>aydınlatma metnini</Link>{' '}
                okudum.
              </span>
            </label>
            <button type="submit" className="kp-btn" style={{ width: '100%' }}>Bilgi talebi gönder</button>
          </form>

          {/* B2B kancası — karneyi gören müteahhit panele girmek ister */}
          <div style={{ background: 'var(--tint-butter)', borderRadius: 'var(--r-card)', padding: 'var(--s-4)' }}>
            <b style={{ display: 'block', fontSize: 13, color: 'var(--tint-butter-ink)', marginBottom: 4 }}>
              Bu firma siz misiniz?
            </b>
            <p style={{ margin: '0 0 11px', fontSize: 11.5, color: 'var(--tint-butter-ink)', lineHeight: 1.45 }}>
              Panele girip projelerinizi kendiniz güncelleyin, taleplerinizi görün,
              karne verilerine itiraz edin. İlk proje ücretsiz.
            </p>
            <a href="/panel" className="kp-btn is-small" style={{ width: '100%', background: 'var(--tint-butter-ink)', borderColor: 'var(--tint-butter-ink)', color: '#fff' }}>
              Firma panelini aç
            </a>
          </div>

          <p className="kp-label" style={{ textTransform: 'none', letterSpacing: 0, lineHeight: 1.55, padding: '0 4px' }}>
            Karne verileri konutprojeleri.com ilan arşivinden ve firmanın panel girişlerinden
            üretilir. Hatalı bilgi gördüğünüzü düşünüyorsanız{' '}
            <Link href="/duzeltme" style={{ color: 'var(--brand)', fontWeight: 650 }}>düzeltme talebi</Link>{' '}
            gönderebilirsiniz.
          </p>
        </aside>
      </div>
    </main>
  );
}

/* ── parçalar ── */

function Metrik({
  baslik, deger, kiyas, iyi, not,
}: { baslik: string; deger: string | null; kiyas?: string; iyi?: boolean; not?: string }) {
  if (!deger) return null; // veri yoksa alan basılmaz
  return (
    <div style={{ background: 'var(--surface-card)', padding: 'var(--s-4)' }}>
      <dt className="kp-label">{baslik}</dt>
      <dd style={{ margin: 0 }}>
        <span className="kp-row" style={{ gap: 7, alignItems: 'baseline' }}>
          <span className="kp-num tabular" style={{ fontSize: 20 }}>{deger}</span>
          {kiyas && <Pill durum={iyi ? 'success' : 'neutral'}>{kiyas}</Pill>}
        </span>
        {not && (
          <small style={{ display: 'block', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
            {not}
          </small>
        )}
      </dd>
    </div>
  );
}

function Kurumsal({ ad, deger }: { ad: string; deger: string | null }) {
  if (!deger) return null;
  return (
    <div style={{ background: 'var(--surface-card)', padding: 'var(--s-4)' }}>
      <dt className="kp-label">{ad}</dt>
      <dd style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{deger}</dd>
    </div>
  );
}

function Satir({ ad, deger, vurgulu }: { ad: string; deger: string | null; vurgulu?: boolean }) {
  if (!deger) return null;
  return (
    <div className="kp-row" style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)', fontSize: 11.5 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{ad}</span>
      <b
        style={{ marginLeft: 'auto', color: vurgulu ? 'var(--success)' : 'var(--text-primary)' }}
        className="tabular"
      >
        {deger}
      </b>
    </div>
  );
}

function FarkPill({ ay, durum }: { ay: number | null; durum: string }) {
  if (durum === 'itiraz') return <Pill durum="warning">İtiraz edildi</Pill>;
  if (ay == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  if (ay === 0) return <Pill durum="success">Zamanında</Pill>;
  if (ay <= 3) return <Pill durum="warning">+{ay} ay</Pill>;
  return <Pill durum="danger">+{ay} ay</Pill>;
}

/** Teslim gecikmesi çubukları — sektör ortalaması dikey çizgi olarak üstünde. */
function TeslimGrafigi({ kayitlar }: { kayitlar: TeslimKaydi[] }) {
  const enBuyuk = Math.max(6, ...kayitlar.map((k) => k.gecikme_ay ?? 0));
  const sektorOran = (SEKTOR.ortGecikme / enBuyuk) * 100;

  return (
    <div>
      <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
        {kayitlar.map((k, i) => {
          const ay = k.gecikme_ay ?? 0;
          const oran = Math.max(3, (ay / enBuyuk) * 100);
          const renk = ay === 0 ? 'var(--success-bg)' : ay <= 3 ? 'var(--warning-bg)' : 'var(--danger-bg)';
          return (
            <div key={`${k.proje_slug ?? i}`} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 78px', gap: 'var(--s-3)', alignItems: 'center', fontSize: 11.5 }}>
              <span>
                <b style={{ display: 'block', fontSize: 12, letterSpacing: '-0.01em' }}>{k.proje_ad ?? '—'}</b>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {k.ilce ?? ''}{k.toplam_konut ? ` · ${k.toplam_konut} konut` : ''}
                  {k.gerceklesen ? ` · ${k.gerceklesen.slice(0, 4)}` : ''}
                </span>
              </span>

              <span style={{ position: 'relative', height: 20, background: 'var(--surface-sunken)', borderRadius: 6 }}>
                <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${oran}%`, background: renk, borderRadius: 6 }} />
                <span
                  aria-hidden
                  style={{ position: 'absolute', top: -4, bottom: -4, left: `${sektorOran}%`, width: 2, background: 'var(--text-muted)', opacity: 0.5, borderRadius: 2 }}
                />
              </span>

              <span style={{ textAlign: 'right', fontWeight: 750, color: ay === 0 ? 'var(--success)' : ay > 3 ? 'var(--danger)' : 'var(--text-primary)' }}>
                {ay === 0 ? 'Zamanında' : `+${ay} ay`}
              </span>
            </div>
          );
        })}
      </div>
      <p className="kp-label" style={{ marginTop: 'var(--s-3)', textTransform: 'none', letterSpacing: 0, lineHeight: 1.55 }}>
        Dikey çizgi sektör ortalamasını gösterir: <b>{SEKTOR.ortGecikme} ay</b>. Gecikme, projenin
        satış aşamasında ilan edilen teslim çeyreğinin son ayı esas alınarak hesaplanır.
      </p>
    </div>
  );
}

/**
 * Organization şeması.
 *
 * DİKKAT: Sicil notu AggregateRating olarak İŞARETLENMEZ. O bir arama motoru
 * derecelendirmesi değil, bizim yayınladığımız bir ölçüt; yanlış işaretleme
 * manuel işlem riski doğurur. aggregateRating yalnızca tapu doğrulamalı
 * sakin değerlendirmesi olduğunda basılır — şu an yok.
 */
function JsonLd({ f }: { f: FirmaKarne }) {
  const veri = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: f.ad,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/firmalar/${f.slug}`,
    foundingDate: f.kurulus_yili ? String(f.kurulus_yili) : undefined,
    areaServed: f.bolgeler.map((b) => b.ilce),
    address: f.merkez_il
      ? { '@type': 'PostalAddress', addressLocality: f.merkez_ilce ?? undefined, addressRegion: f.merkez_il, addressCountry: 'TR' }
      : undefined,
    makesOffer: f.aktifler.length
      ? {
          '@type': 'OfferCatalog',
          name: 'Aktif projeler',
          itemListElement: f.aktifler.map((p) => ({
            '@type': 'ApartmentComplex',
            name: p.ad,
            url: `${process.env.NEXT_PUBLIC_SITE_URL}/${p.il}/${p.ilce}/${p.slug}`,
          })),
        }
      : undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(veri) }} />;
}
