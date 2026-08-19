import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { slugCoz } from '@/lib/routing';
import { projeDetayGetir, populerProjeYollari } from '@/lib/queries/proje';
import { para, m2Birim, alan, teslim, tarih } from '@/lib/format';
import { Pill, SantiyePill, TazelikPill } from '@/components/ui/Pill';

/**
 * Üç sayfa tipi tek segmentte:
 *   /istanbul/kadikoy/benesta-benleo-acibadem   → proje detay  (ISR)
 *   /istanbul/kadikoy/2-1-konut-projeleri       → daire tipi listesi
 *   /istanbul/kadikoy/fikirtepe-konut-projeleri → mahalle listesi
 *
 * Ayrım lib/routing.ts içinde kalıpla yapılır.
 */

export const revalidate = 3600;
export const dynamicParams = true;

type Params = { params: Promise<{ il: string; ilce: string; slug: string }> };

/** En çok görüntülenen projeler önceden üretilir; kalanı ilk istekte. */
export async function generateStaticParams() {
  try {
    return await populerProjeYollari(200);
  } catch {
    return []; // veritabanı yoksa derleme kırılmaz
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { il, ilce, slug } = await params;
  const cozum = slugCoz(slug);
  if (cozum.tip !== 'proje') return {};

  const p = await projeDetayGetir(il, ilce, slug);
  if (!p) return {};

  const min = p.daire_tipleri
    .map((d) => d.liste_fiyati)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)[0];

  const tipler = p.daire_tipleri.map((d) => d.tip);
  const aralik = tipler.length ? `${tipler[0]}–${tipler[tipler.length - 1]}` : '';
  const yil = new Date().getFullYear();

  return {
    // {Proje} Fiyatları {Yıl} — {TipAralığı}, {MinFiyat}'den
    title: `${p.ad} Fiyatları ${yil} — ${aralik}${min ? `, ${para(min)}'den` : ''}`,
    description:
      `${p.ilce} ${p.mahalle ?? ''} ${p.ad}: ${p.toplam_konut ?? '—'} konut, ` +
      `${teslim(p.teslim_ceyrek) ?? 'teslim tarihi açıklanmadı'}. ` +
      (min ? `Fiyatlar ${para(min)}'den başlıyor. ` : '') +
      (p.fiyat_teyit_tarihi ? `${tarih(p.fiyat_teyit_tarihi)} güncel.` : ''),
    alternates: { canonical: `/${il}/${ilce}/${slug}` },
  };
}

export default async function Sayfa({ params }: Params) {
  const { il, ilce, slug } = await params;
  const cozum = slugCoz(slug);

  if (cozum.tip !== 'proje') {
    // TODO: liste şablonu — arama sayfasının filtreli hali
    return (
      <main className="kp-wrap" style={{ paddingBlock: 'var(--s-6)' }}>
        <h1 className="kp-h1">
          {ilce} {cozum.tip === 'daire-tipi' ? cozum.daireTipi : ''} Konut Projeleri
        </h1>
        <p className="kp-lead">Liste şablonu henüz kurulmadı — aşama 3.</p>
      </main>
    );
  }

  const p = await projeDetayGetir(il, ilce, slug);
  if (!p) notFound();

  const minFiyat = p.daire_tipleri
    .map((d) => d.liste_fiyati)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b)[0];

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-6)' }}>
      <nav className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>
        {p.il} › {p.ilce} {p.mahalle ? `› ${p.mahalle}` : ''} › {p.ad}
      </nav>

      <h1 className="kp-h1">{p.ad}</h1>
      <p className="kp-lead" style={{ marginBottom: 'var(--s-4)' }}>
        {p.il} / {p.ilce} {p.mahalle ? `/ ${p.mahalle}` : ''} · {p.firma_ad}
        {p.toplam_konut ? ` · ${p.toplam_konut} daire` : ''}
      </p>

      <div className="kp-row" style={{ marginBottom: 'var(--s-5)' }}>
        <SantiyePill yuzde={p.santiye_yuzde} />
        {teslim(p.teslim_ceyrek) && <Pill durum="info">{teslim(p.teslim_ceyrek)}</Pill>}
        <TazelikPill teyitTarihi={p.fiyat_teyit_tarihi} />
      </div>

      {/* Sayfanın omurgası: daire tipi tablosu */}
      <section className="kp-card" style={{ padding: 'var(--s-5)', marginBottom: 'var(--s-4)' }}>
        <h2 className="kp-h2">Daire tipleri ve fiyatları</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }} className="tabular">
            <thead>
              <tr>
                {['Tip', 'Net / brüt m²', 'Başlangıç fiyatı', 'm² birim', 'Kalan'].map((h) => (
                  <th key={h} className="kp-label" style={{ textAlign: 'left', padding: '0 10px 9px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.daire_tipleri.map((d) => (
                <tr key={d.tip} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 11, fontWeight: 750 }}>{d.tip}</td>
                  <td style={{ padding: 11 }}>{alan(d.net_m2, d.brut_m2) ?? '—'}</td>
                  {/* Fiyatı olmayan tip listeden düşmez, farklı görünür */}
                  <td style={{ padding: 11, fontWeight: 700 }}>
                    {para(d.liste_fiyati) ?? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Fiyat isteyin</span>}
                  </td>
                  <td style={{ padding: 11 }}>{m2Birim(d.liste_fiyati, d.net_m2) ?? '—'}</td>
                  <td style={{ padding: 11 }}>{d.kalan_adet ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {p.aciklama && (
        <section className="kp-card" style={{ padding: 'var(--s-5)' }}>
          <h2 className="kp-h2">Proje hakkında</h2>
          <p className="kp-lead">{p.aciklama}</p>
        </section>
      )}

      {/* TODO aşama 4: kat planı, ödeme planı, konum, şantiye, firma karnesi, SSS */}
      <p className="kp-label" style={{ marginTop: 'var(--s-5)' }}>
        Fiyatlar {tarih(p.fiyat_teyit_tarihi) ?? '—'} tarihinde firma tarafından güncellendi
        {minFiyat ? ` · projede en düşük ${para(minFiyat)}` : ''}
      </p>
    </main>
  );
}
