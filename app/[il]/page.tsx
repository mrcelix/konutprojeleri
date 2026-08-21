import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ilSlugCoz } from '@/lib/routing';
import { ilceler, ilOzet, bolgeIcerik } from '@/lib/queries/bolge';
import { filtreCoz, seciliSayisi } from '@/lib/filtre';
import { AramaSayfasi } from '@/components/arama/AramaSayfasi';
import { para, yuzde } from '@/lib/format';

/**
 * Şehir sayfası — /istanbul-konut-projeleri
 *
 * KANONİK ADRESTE bu bir arama sonucu değil, REHBER: pazar özeti, ilçe
 * ızgarası ve hazır seçkiler. En yüksek hacimli sayfa tipi.
 *
 * Ama bir SÜZGEÇ varsa (ör. /antalya-konut-projeleri?kategori=villa)
 * arama sonucuna dönüşür. Aksi halde segment bağlantıları çıkmaz sokak
 * olurdu: süzgeç sessizce düşer ve kullanıcı neden aradığı şeyi
 * göremediğini anlamaz. Süzgeçli hâl arama motoruna kapalıdır;
 * kanonik adres rehber olarak kalır.
 */

export const revalidate = 3600; // 1 saat + onay anında etiketle yenilenir

type Params = {
  params: Promise<{ il: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { il: ilSlug } = await params;
  const il = ilSlugCoz(ilSlug);
  if (!il) return {};

  const ozet = await ilOzet(il);
  if (!ozet) return {};

  // Süzgeçli hâl indekslenmez: aynı içerik sayısız parametre
  // kombinasyonunda görünürse kanonik sayfa kendi kopyalarıyla yarışır.
  if (suzgecVar(await searchParams)) {
    return { robots: { index: false, follow: true }, alternates: { canonical: `/${ilSlug}` } };
  }

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

/** Rehber mi sonuç mu: adreste süzgeç var mı? */
function suzgecVar(q: Record<string, string | string[] | undefined>): boolean {
  return Object.keys(q).some(
    (k) => k !== 'sayfa' && q[k] !== undefined && q[k] !== ''
  );
}

export default async function IlSayfasi({ params, searchParams }: Params) {
  const { il: ilSlug } = await params;
  const il = ilSlugCoz(ilSlug);
  if (!il) notFound();

  const q = await searchParams;
  const ad0 = il.charAt(0).toUpperCase() + il.slice(1);

  if (suzgecVar(q)) {
    const filtre = filtreCoz({ il }, q);
    const icerik0 = await bolgeIcerik(il).catch(() => null);
    return (
      <AramaSayfasi
        taban={`/${ilSlug}`}
        baslik={`${ad0} Konut Projeleri`}
        filtre={filtre}
        girisMetni={seciliSayisi(filtre) === 0 ? icerik0?.metin ?? null : null}
      />
    );
  }

  const [ozet, liste, icerik] = await Promise.all([
    ilOzet(il),
    ilceler(il),
    bolgeIcerik(il),
  ]);

  if (!ozet || ozet.proje_sayisi === 0) notFound();

  const ad = il.charAt(0).toUpperCase() + il.slice(1);

  return (
    <main className="wrap" style={{ paddingBlock: 'var(--s-6)' }}>
      <nav className="eyebrow" style={{ marginBottom: 'var(--s-3)' }}>
        <Link href="/">Ana sayfa</Link> › {ad} Konut Projeleri
      </nav>

      <h1 className="h1">{ad} Konut Projeleri</h1>
      {icerik?.metin && <p className="prose">{icerik.metin}</p>}

      <dl
        className="kart"
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

      <h2 className="h2">İlçeye göre</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--s-3)' }}>
        {liste.map((i) => (
          <Link
            key={i.ilce}
            href={`/${il}/${i.ilce}-konut-projeleri`}
            className="kart"
            style={{ padding: 'var(--s-4)' }}
          >
            <b style={{ display: 'block', fontSize: 14, letterSpacing: '-0.02em' }}>{i.ilce}</b>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }} className="sayi">
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
      <dt className="eyebrow">{baslik}</dt>
      <dd className="sayi" style={{ margin: 0 }}>{deger}</dd>
    </div>
  );
}
