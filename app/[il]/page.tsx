import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ilSlugCoz } from '@/lib/routing';
import { ilceler, ilOzet, bolgeIcerik } from '@/lib/queries/bolge';
import { para, yuzde } from '@/lib/format';

/**
 * Şehir sayfası — /istanbul-konut-projeleri
 *
 * Bu bir arama sonucu değil, REHBER. Filtre paneli yok; pazar özeti,
 * ilçe ızgarası ve hazır seçkiler var. En yüksek hacimli sayfa tipi.
 */

export const revalidate = 3600; // 1 saat + onay anında etiketle yenilenir

type Params = { params: Promise<{ il: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { il: ilSlug } = await params;
  const il = ilSlugCoz(ilSlug);
  if (!il) return {};

  const ozet = await ilOzet(il);
  if (!ozet) return {};

  const ad = il.charAt(0).toUpperCase() + il.slice(1);
  // Başlıktaki sayı ve fiyat DEĞİŞKENDEN gelir — sabit yazılmaz.
  return {
    title: `${ad} Konut Projeleri — ${ozet.proje_sayisi} Proje`,
    description:
      `${ad}'da ${ozet.proje_sayisi} aktif konut projesi. Ortalama m² fiyatı ` +
      `${ozet.m2_fiyat ? new Intl.NumberFormat('tr-TR').format(ozet.m2_fiyat) : '—'} TL. ` +
      `Fiyat, kat planı ve teslim tarihleriyle.`,
    alternates: { canonical: `/${ilSlug}` },
  };
}

export default async function IlSayfasi({ params }: Params) {
  const { il: ilSlug } = await params;
  const il = ilSlugCoz(ilSlug);
  if (!il) notFound();

  const [ozet, liste, icerik] = await Promise.all([
    ilOzet(il),
    ilceler(il),
    bolgeIcerik(il),
  ]);

  if (!ozet || ozet.proje_sayisi === 0) notFound();

  const ad = il.charAt(0).toUpperCase() + il.slice(1);

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-6)' }}>
      <nav className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>
        <Link href="/">Ana sayfa</Link> › {ad} Konut Projeleri
      </nav>

      <h1 className="kp-h1">{ad} Konut Projeleri</h1>
      {icerik?.metin && <p className="kp-lead">{icerik.metin}</p>}

      <dl
        className="kp-card"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 1,
          background: 'var(--border)',
          marginBlock: 'var(--s-5)',
          overflow: 'hidden',
        }}
      >
        <Ozet baslik="Aktif proje" deger={String(ozet.proje_sayisi)} />
        <Ozet baslik="Toplam daire" deger={new Intl.NumberFormat('tr-TR').format(ozet.daire_sayisi)} />
        <Ozet baslik="Ortalama m²" deger={para(ozet.m2_fiyat) ?? '—'} />
      </dl>

      <h2 className="kp-h2">İlçeye göre</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--s-3)' }}>
        {liste.map((i) => (
          <Link
            key={i.ilce}
            href={`/${il}/${i.ilce}-konut-projeleri`}
            className="kp-card"
            style={{ padding: 'var(--s-4)' }}
          >
            <b style={{ display: 'block', fontSize: 14, letterSpacing: '-0.02em' }}>{i.ilce}</b>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }} className="tabular">
              {i.proje_sayisi} proje
              {i.m2_fiyat ? ` · ${para(i.m2_fiyat)}/m²` : ''}
              {i.yillik_degisim != null ? ` · ${yuzde(i.yillik_degisim, { isaretli: true })}` : ''}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}

function Ozet({ baslik, deger }: { baslik: string; deger: string }) {
  return (
    <div style={{ background: 'var(--surface-card)', padding: 'var(--s-4)' }}>
      <dt className="kp-label">{baslik}</dt>
      <dd className="kp-num" style={{ margin: 0 }}>{deger}</dd>
    </div>
  );
}
