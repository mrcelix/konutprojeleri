import Link from 'next/link';
import Image from 'next/image';
import type { ProjeDetay as Detay } from '@/lib/queries/proje';
import { taksitHesapla } from '@/lib/queries/proje';
import { para, paraKisa, m2Birim, alan, teslim, tarih, yuzde, yurumeSuresi } from '@/lib/format';
import { Pill, SantiyePill, TazelikPill, StokPill } from '@/components/ui/Pill';
import { OZELLIKLER } from '@/lib/filtre';
import { katPlaniYolu } from '@/lib/routing';
import { SepetDugmesi } from '@/components/karsilastir/SepetDugmesi';

/**
 * Proje detay sayfası — dönüşümün gerçekleştiği yer.
 *
 * Sayfanın omurgası DAİRE TİPİ TABLOSU. Eski sitede tek bir fiyat yoktu;
 * burada her tip için m², fiyat, m² birim, aylık taksit ve kalan stok var.
 *
 * Veri yoksa alan BASILMAZ. NULL, 0, "-" hiçbir koşulda render edilmez.
 */

const POI_ADLARI: Record<string, string> = {
  metro: 'Metro', metrobus: 'Metrobüs', okul: 'Okul',
  hastane: 'Hastane', avm: 'AVM', sahil: 'Sahil',
};

export function ProjeDetay({ p }: { p: Detay }) {
  const fiyatli = p.daire_tipleri.filter((d) => d.liste_fiyati != null);
  const minFiyat = fiyatli.length
    ? Math.min(...fiyatli.map((d) => d.liste_fiyati!))
    : null;
  const maxFiyat = fiyatli.length
    ? Math.max(...fiyatli.map((d) => d.liste_fiyati!))
    : null;

  // En çok tercih edilen tip: 2+1 varsa o, yoksa ilki
  const anaTip = p.daire_tipleri.find((d) => d.tip === '2+1') ?? p.daire_tipleri[0];
  const odeme =
    anaTip?.liste_fiyati && p.pesinat_orani && p.vade_ay
      ? taksitHesapla(anaTip.liste_fiyati, p.pesinat_orani, p.vade_ay)
      : null;

  const musait = p.daire_tipleri.reduce((t, d) => t + (d.kalan_adet ?? 0), 0);

  return (
    <main className="wrap" style={{ paddingBlock: 'var(--s-5)' }}>
      <JsonLd p={p} minFiyat={minFiyat} maxFiyat={maxFiyat} musait={musait} />

      <nav className="eyebrow" style={{ marginBottom: 'var(--s-3)' }}>
        <Link href="/">Ana sayfa</Link> ›{' '}
        <Link href={`/${p.il}-konut-projeleri`}>{p.il}</Link> ›{' '}
        <Link href={`/${p.il}/${p.ilce}-konut-projeleri`}>{p.ilce}</Link> › {p.ad}
      </nav>

      {/* Galeri */}
      {p.gorseller.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2.1fr 1fr 1fr',
            gap: 8,
            marginBottom: 'var(--s-4)',
          }}
        >
          {p.gorseller.slice(0, 3).map((g, i) => (
            <div
              key={g.key}
              style={{
                position: 'relative',
                borderRadius: 'var(--r-block)',
                overflow: 'hidden',
                minHeight: i === 0 ? 300 : 146,
                gridRow: i === 0 ? 'span 2' : undefined,
                background: 'var(--surface-sunken)',
              }}
            >
              <Image
                src={g.key}
                alt={g.alt ?? `${p.ad} — ${p.ilce}`}
                fill
                sizes={i === 0 ? '(max-width:767px) 100vw, 55vw' : '25vw'}
                style={{ objectFit: 'cover' }}
                priority={i === 0}
              />
            </div>
          ))}
        </div>
      )}

      <header style={{ marginBottom: 'var(--s-4)' }}>
        <h1 className="h1">{p.ad}</h1>
        <p className="prose">
          {p.il} / {p.ilce}{p.mahalle ? ` / ${p.mahalle}` : ''} ·{' '}
          <Link href={`/firmalar/${p.firma_slug}`} style={{ color: 'var(--brand)', fontWeight: 650 }}>
            {p.firma_ad}
          </Link>
          {p.blok_sayisi && p.toplam_konut ? ` · ${p.blok_sayisi} blok, ${p.toplam_konut} daire` : ''}
        </p>
        <div className="satir" style={{ marginTop: 'var(--s-3)' }}>
          <SantiyePill yuzde={p.santiye_yuzde} />
          {teslim(p.teslim_ceyrek) && <Pill durum="info">{teslim(p.teslim_ceyrek)} teslim</Pill>}
          <StokPill kalan={musait} />
          <TazelikPill teyitTarihi={p.fiyat_teyit_tarihi} />
          {p.firma_sicil && <Pill durum="brand">Firma sicili {p.firma_sicil}</Pill>}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 330px', gap: 'var(--s-4)', alignItems: 'start' }}>
        <div className="izgara">
          {/* Özet şerit */}
          <dl
            className="kart"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 1, background: 'var(--border)', overflow: 'hidden',
            }}
          >
            <Ozet baslik="Teslim" deger={teslim(p.teslim_ceyrek)} />
            <Ozet baslik="Daire sayısı" deger={p.toplam_konut ? String(p.toplam_konut) : null}
                  alt={musait ? `${musait} müsait` : null} />
            <Ozet baslik="Blok / kat"
                  deger={p.blok_sayisi && p.kat_sayisi ? `${p.blok_sayisi} / ${p.kat_sayisi}` : null}
                  alt={p.tavan_yuksekligi ? `${p.tavan_yuksekligi} m tavan` : null} />
            <Ozet baslik="Aidat" deger={para(p.aidat)} />
            <Ozet baslik="Peşinat"
                  deger={p.pesinat_orani ? `%${p.pesinat_orani}` : null}
                  alt={p.vade_ay ? `${p.vade_ay} ay vade` : null} />
          </dl>

          {/* ── Sayfanın omurgası ── */}
          <section className="kart" style={{ padding: 'var(--s-5)' }} id="daireler">
            <h2 className="h2">Daire tipleri ve fiyatları</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }} className="sayi">
                <thead>
                  <tr>
                    {['Tip', 'Net / brüt', 'Başlangıç fiyatı', 'm² birim', 'Aylık taksit', 'Kalan', ''].map((h) => (
                      <th key={h} className="eyebrow" style={{ textAlign: 'left', padding: '0 10px 9px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.daire_tipleri.map((d) => {
                    const t =
                      d.liste_fiyati && p.pesinat_orani && p.vade_ay
                        ? taksitHesapla(d.liste_fiyati, p.pesinat_orani, p.vade_ay)
                        : null;
                    return (
                      <tr key={d.tip} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: 11, fontWeight: 750, fontSize: 14 }}>{d.tip}</td>
                        <td style={{ padding: 11 }}>{alan(d.net_m2, d.brut_m2) ?? '—'}</td>
                        <td style={{ padding: 11, fontWeight: 700, fontSize: 14 }}>
                          {para(d.liste_fiyati) ?? (
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Fiyat isteyin</span>
                          )}
                        </td>
                        <td style={{ padding: 11 }}>{m2Birim(d.liste_fiyati, d.net_m2) ?? '—'}</td>
                        <td style={{ padding: 11 }}>{t ? para(t.senet) : '—'}</td>
                        <td style={{ padding: 11 }}>
                          {d.kalan_adet != null ? (
                            <span className="satir" style={{ gap: 7 }}>
                              <span
                                aria-hidden
                                style={{
                                  width: 46, height: 5, borderRadius: 3,
                                  background: 'var(--border)', position: 'relative', display: 'inline-block',
                                }}
                              >
                                <span style={{
                                  position: 'absolute', inset: 0,
                                  width: `${Math.min(100, ((d.kalan_adet ?? 0) / (d.toplam_adet || 1)) * 100)}%`,
                                  background: (d.kalan_adet ?? 0) <= 5 ? 'var(--warning)' : 'var(--success)',
                                  borderRadius: 3,
                                }} />
                              </span>
                              {d.kalan_adet}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: 11 }}>
                          {d.kat_plani_key && (
                            <Link href={katPlaniYolu(p, d.tip)} style={{ color: 'var(--brand)', fontWeight: 650 }}>
                              Kat planı
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {p.pesinat_orani && p.vade_ay && (
              <p className="eyebrow" style={{ marginTop: 'var(--s-3)', textTransform: 'none', letterSpacing: 0 }}>
                Aylık taksit %{p.pesinat_orani} peşinat ve {p.vade_ay} ay firma senedine göre hesaplanmıştır
                {p.fiyat_teyit_tarihi ? ` · fiyatlar ${tarih(p.fiyat_teyit_tarihi)} tarihinde firma tarafından güncellendi` : ''}
              </p>
            )}
          </section>

          {/* Ödeme senaryoları */}
          {odeme && anaTip && (
            <section className="kart" style={{ padding: 'var(--s-5)' }} id="odeme">
              <h2 className="h2">Ödeme planı · {anaTip.tip}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 'var(--s-3)' }}>
                <Senaryo
                  baslik="Firma senedi"
                  rozet="Faizsiz"
                  tutar={para(odeme.senet)}
                  birim="/ay"
                  not={`${p.vade_ay} eşit taksit · toplam ${paraKisa(odeme.senetToplam)}`}
                  vurgulu
                />
                <Senaryo
                  baslik="Banka kredisi"
                  tutar={para(odeme.kredi)}
                  birim="/ay"
                  not={`%${(odeme.bankaAylikFaiz * 100).toFixed(2)} aylık faiz varsayımıyla · toplam ${paraKisa(odeme.krediToplam)}`}
                />
                <Senaryo
                  baslik="Peşinat"
                  tutar={para(odeme.pesinat)}
                  not={`Kalan ${paraKisa(odeme.kalan)} vadeye yayılır`}
                />
              </div>
            </section>
          )}

          {/* Konum ve çevre */}
          {p.cevre.length > 0 && (
            <section className="kart" style={{ padding: 'var(--s-5)' }} id="konum">
              <h2 className="h2">Konum ve çevre</h2>
              <dl style={{ display: 'grid', gap: 0, margin: 0 }}>
                {p.cevre.map((c) => (
                  <div
                    key={`${c.tip}-${c.ad}`}
                    className="satir"
                    style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}
                  >
                    <dt style={{ color: 'var(--text-muted)', minWidth: 74 }}>{POI_ADLARI[c.tip] ?? c.tip}</dt>
                    <dd style={{ margin: 0 }}>{c.ad}</dd>
                    <dd style={{ margin: '0 0 0 auto', fontWeight: 750 }} className="sayi">
                      {c.tip === 'metro' || c.tip === 'metrobus'
                        ? yurumeSuresi(c.metre)
                        : c.metre >= 1000 ? `${(c.metre / 1000).toFixed(1)} km` : `${c.metre} m`}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Özellikler */}
          {Object.keys(p.ozellikler ?? {}).length > 0 && (
            <section className="kart" style={{ padding: 'var(--s-5)' }}>
              <h2 className="h2">Proje özellikleri</h2>
              <p className="eyebrow" style={{ marginBottom: 'var(--s-3)' }}>Firmanın beyanına dayanır</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '4px 18px' }}>
                {Object.entries(OZELLIKLER).map(([anahtar, ad]) => {
                  const var_ = p.ozellikler?.[anahtar] === true;
                  return (
                    <span
                      key={anahtar}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                        color: var_ ? 'var(--text-secondary)' : 'var(--text-muted)',
                        opacity: var_ ? 1 : 0.6,
                      }}
                    >
                      <span aria-hidden style={{
                        width: 14, height: 14, borderRadius: 5, display: 'grid', placeItems: 'center',
                        fontSize: 8, fontWeight: 800,
                        background: var_ ? 'var(--success-bg)' : 'var(--border)',
                        color: var_ ? 'var(--success)' : 'var(--text-muted)',
                      }}>{var_ ? '✓' : '×'}</span>
                      {ad}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {p.aciklama && (
            <section className="kart" style={{ padding: 'var(--s-5)' }}>
              <h2 className="h2">Proje hakkında</h2>
              <p className="prose">{p.aciklama}</p>
            </section>
          )}

          {/* Firma karnesi özeti */}
          <section className="kart" style={{ padding: 'var(--s-5)' }} id="firma">
            <h2 className="h2">Firma</h2>
            <div className="satir" style={{ gap: 'var(--s-4)' }}>
              <div>
                <Link href={`/firmalar/${p.firma_slug}`} style={{ fontSize: 16, fontWeight: 750 }}>
                  {p.firma_ad}
                </Link>
                <p className="prose" style={{ marginTop: 4 }}>
                  {p.firma_tamamlanan ? `${p.firma_tamamlanan} tamamlanmış proje` : 'Yeni firma'}
                  {p.firma_ort_gecikme != null && (
                    <> · ortalama teslim gecikmesi <b>{p.firma_ort_gecikme.toFixed(1)} ay</b>
                    <span style={{ color: 'var(--text-muted)' }}> (sektör 2,7 ay)</span></>
                  )}
                </p>
              </div>
              {p.firma_sicil && (
                <span style={{ marginLeft: 'auto' }}><Pill durum="success">Sicil {p.firma_sicil}</Pill></span>
              )}
            </div>
          </section>

          {/* Benzer projeler */}
          {p.benzer.length > 0 && (
            <section className="kart" style={{ padding: 'var(--s-5)' }}>
              <h2 className="h2">Benzer projeler</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 'var(--s-3)' }}>
                {p.benzer.map((b) => (
                  <Link key={b.slug} href={`/${b.il}/${b.ilce}/${b.slug}`} style={{ display: 'block' }}>
                    <b style={{ display: 'block', fontSize: 13.5, letterSpacing: '-0.02em' }}>{b.ad}</b>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {b.ilce} · {teslim(b.teslim_ceyrek) ?? '—'}
                    </span>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 800, marginTop: 4 }} className="sayi">
                      {paraKisa(b.min_fiyat) ?? 'Fiyat isteyin'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Sabit yan sütun: fiyat + tek talep formu ── */}
        <aside className="izgara" style={{ position: 'sticky', top: 16 }}>
          <div className="kart" style={{ padding: 'var(--s-5)' }}>
            {anaTip && minFiyat ? (
              <>
                <span className="eyebrow">{anaTip.tip} fiyatları</span>
                <span className="sayi" style={{ display: 'block', fontSize: 25 }}>
                  {para(anaTip.liste_fiyati ?? minFiyat)}
                </span>
                <p className="prose" style={{ fontSize: 11.5, marginTop: 3 }}>
                  Projede {paraKisa(minFiyat)} – {paraKisa(maxFiyat)}
                  {anaTip.net_m2 && anaTip.liste_fiyati
                    ? ` · ${m2Birim(anaTip.liste_fiyati, anaTip.net_m2)}` : ''}
                </p>
                {odeme && (
                  <div style={{ background: 'var(--brand-soft)', borderRadius: 'var(--r-block)', padding: 'var(--s-3)', marginTop: 'var(--s-3)' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--brand-strong)', display: 'block' }}>
                      %{p.pesinat_orani} peşinat, {p.vade_ay} ay firma senedi
                    </span>
                    <b className="sayi" style={{ fontSize: 17, color: 'var(--brand-strong)' }}>
                      {para(odeme.senet)} / ay
                    </b>
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="eyebrow">Fiyat</span>
                <p className="prose" style={{ fontSize: 12 }}>Firma henüz açıklamadı.</p>
              </>
            )}

            {p.fiyat_teyit_tarihi && (
              <p className="eyebrow" style={{ marginTop: 'var(--s-3)', textTransform: 'none', letterSpacing: 0 }}>
                Fiyatlar {tarih(p.fiyat_teyit_tarihi)} tarihinde firma tarafından güncellendi
              </p>
            )}
          </div>

          {/* Sayfa boyunca TEK form. Formu tekrarlamak güveni düşürür. */}
          <form className="kart" style={{ padding: 'var(--s-5)' }} action="/api/talep" method="post">
            <h2 className="h3" style={{ marginBottom: 4 }}>Fiyat listesi ve ödeme planı isteyin</h2>
            <p className="prose" style={{ fontSize: 11.5, marginBottom: 'var(--s-3)' }}>
              Talebiniz doğrudan projenin satış ekibine iletilir. Aracı yoktur, komisyon alınmaz.
            </p>
            <input type="hidden" name="proje_id" value={p.id} />
            <Alan ad="ad" etiket="Ad Soyad" tip="text" gerekli />
            <Alan ad="telefon" etiket="Telefon" tip="tel" gerekli />
            <label style={{ display: 'flex', gap: 8, fontSize: 10.5, color: 'var(--text-muted)', margin: 'var(--s-3) 0', lineHeight: 1.45 }}>
              <input type="checkbox" name="kvkk" required />
              <span>
                Kişisel verilerin işlenmesine ve yurt dışına aktarımına ilişkin{' '}
                <Link href="/kvkk" style={{ color: 'var(--brand)', fontWeight: 650 }}>aydınlatma metnini</Link>{' '}
                okudum, iletişim kurulmasına izin veriyorum.
              </span>
            </label>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Fiyat listesini gönder
            </button>
          </form>

          {/* Karşılaştırmaya ekle. Sepet DURUMU okunmaz: çerez okumak bu
              sayfayı dinamikleştirir ve proje detayı statik kalmalı. */}
          <div className="kart" style={{ padding: 'var(--s-4)' }}>
            <h3 className="eyebrow" style={{ marginBottom: 'var(--s-2)' }}>Karşılaştırma</h3>
            <SepetDugmesi slug={p.slug} don={`/${p.il}/${p.ilce}/${p.slug}`} />
            <p className="prose" style={{ fontSize: 11, marginTop: 'var(--s-2)' }}>
              Dört projeye kadar yan yana koyabilirsiniz.
            </p>
          </div>

          <div className="kart" style={{ padding: 'var(--s-4)' }}>
            <h3 className="eyebrow" style={{ marginBottom: 'var(--s-2)' }}>Bu projeye ilgi</h3>
            {/* Gerçek rakam. "Şu anda 1 kişi inceliyor" gibi uydurma aciliyet yok. */}
            <p className="prose" style={{ fontSize: 11.5 }}>
              Son 7 günde <b className="sayi">{p.goruntulenme.toLocaleString('tr-TR')}</b> görüntüleme
              {musait > 0 && <> · <b>{musait}</b> daire müsait</>}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Ozet({ baslik, deger, alt }: { baslik: string; deger: string | null; alt?: string | null }) {
  if (!deger) return null; // veri yoksa alan basılmaz
  return (
    <div style={{ background: 'var(--surface-card)', padding: 'var(--s-4)' }}>
      <dt className="eyebrow">{baslik}</dt>
      <dd style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em' }} className="sayi">
        {deger}
        {alt && <small style={{ display: 'block', fontSize: 10.5, fontWeight: 400, color: 'var(--text-muted)', letterSpacing: 0 }}>{alt}</small>}
      </dd>
    </div>
  );
}

function Senaryo({
  baslik, rozet, tutar, birim, not, vurgulu,
}: { baslik: string; rozet?: string; tutar: string | null; birim?: string; not: string; vurgulu?: boolean }) {
  if (!tutar) return null;
  return (
    <div style={{
      border: `1.5px solid ${vurgulu ? 'var(--success-bg)' : 'var(--border)'}`,
      borderRadius: 'var(--r-block)', padding: 'var(--s-4)',
      background: vurgulu ? 'color-mix(in srgb, var(--success-bg) 30%, transparent)' : 'transparent',
    }}>
      <div className="satir" style={{ gap: 6, marginBottom: 4 }}>
        <b style={{ fontSize: 13 }}>{baslik}</b>
        {rozet && <Pill durum="success">{rozet}</Pill>}
      </div>
      <span className="sayi sayi" style={{ fontSize: 19 }}>{tutar}</span>
      {birim && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{birim}</span>}
      <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>{not}</p>
    </div>
  );
}

function Alan({ ad, etiket, tip, gerekli }: { ad: string; etiket: string; tip: string; gerekli?: boolean }) {
  return (
    <label className="alan" style={{ display: 'block', marginBottom: 8 }}>
      {/* Görünür label — yalnızca placeholder erişilebilirlik ihlali */}
      <span className="kp-field__label">{etiket}{gerekli && ' *'}</span>
      <input
        name={ad}
        type={tip}
        required={gerekli}
        className="kp-field__value"
        style={{ border: 0, background: 'transparent', width: '100%', padding: 0, font: 'inherit', color: 'inherit' }}
      />
    </label>
  );
}

/**
 * Yapısal veri.
 * Fiyatı olmayan projede offers bloğu HİÇ BASILMAZ —
 * yanlış yapılandırılmış fiyat, hiç fiyat olmamasından zararlıdır.
 */
function JsonLd({
  p, minFiyat, maxFiyat, musait,
}: { p: Detay; minFiyat: number | null; maxFiyat: number | null; musait: number }) {
  const veri: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ApartmentComplex',
    name: p.ad,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/${p.il}/${p.ilce}/${p.slug}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: p.mahalle ?? undefined,
      addressLocality: p.ilce,
      addressRegion: p.il,
      addressCountry: 'TR',
    },
    numberOfAccommodationUnits: p.toplam_konut ?? undefined,
    numberOfAvailableAccommodationUnits: musait || undefined,
    dateModified: p.fiyat_teyit_tarihi ?? undefined,
    containsPlace: p.daire_tipleri
      .filter((d) => d.liste_fiyati != null)
      .map((d) => ({
        '@type': 'Apartment',
        name: d.tip,
        numberOfRooms: Number(d.tip.split('+')[0]) + Number(d.tip.split('+')[1] ?? 0),
        floorSize: d.net_m2 ? { '@type': 'QuantitativeValue', value: d.net_m2, unitCode: 'MTK' } : undefined,
        offers: {
          '@type': 'Offer',
          price: d.liste_fiyati,
          priceCurrency: 'TRY',
          availability: (d.kalan_adet ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
        },
      })),
  };

  if (minFiyat && maxFiyat) {
    veri.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'TRY',
      lowPrice: minFiyat,
      highPrice: maxFiyat,
      offerCount: musait || undefined,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(veri) }}
    />
  );
}
