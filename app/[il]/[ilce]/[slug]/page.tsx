import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { slugCoz } from '@/lib/routing';
import { projeDetayGetir, populerProjeYollari } from '@/lib/queries/proje';
import { filtreCoz } from '@/lib/filtre';
import { ProjeDetay } from '@/components/ProjeDetay';
import { ArsivProje } from '@/components/ArsivProje';
import { AramaSayfasi } from '@/components/arama/AramaSayfasi';
import { HaritaGorunumu } from '@/components/harita/HaritaGorunumu';
import { para, teslim, tarih } from '@/lib/format';

/**
 * Üç sayfa tipi tek segmentte — ayrım lib/routing.ts içinde kalıpla yapılır:
 *
 *   /istanbul/kadikoy/benesta-benleo-acibadem   → proje detay  (ISR, statik)
 *   /istanbul/kadikoy/2-1-konut-projeleri       → arama (dinamik + kenar önbelleği)
 *   /istanbul/kadikoy/fikirtepe-konut-projeleri → arama (mahalle kapsamı)
 */

export const revalidate = 3600;
export const dynamicParams = true;

type Params = {
  params: Promise<{ il: string; ilce: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
  const yol = `/${il}/${ilce}/${slug}`;

  if (cozum.tip !== 'proje') {
    const ad = ilce.charAt(0).toUpperCase() + ilce.slice(1);
    const ek =
      cozum.tip === 'daire-tipi' ? ` ${cozum.daireTipi}`
      : cozum.tip === 'mahalle' ? ` ${cozum.mahalle}`
      : '';
    return { title: `${ad}${ek} Konut Projeleri`, alternates: { canonical: yol } };
  }

  const p = await projeDetayGetir(il, ilce, slug);
  if (!p) return {};

  const fiyatlar = p.daire_tipleri.map((d) => d.liste_fiyati).filter((v): v is number => v != null);
  const min = fiyatlar.length ? Math.min(...fiyatlar) : null;
  const tipler = p.daire_tipleri.map((d) => d.tip);
  const aralik = tipler.length > 1 ? `${tipler[0]}–${tipler[tipler.length - 1]}` : tipler[0] ?? '';

  return {
    // {Proje} Fiyatları {Yıl} — {TipAralığı}, {MinFiyat}'den
    // Yıl ve fiyat DEĞİŞKENDEN gelir; sabit yazılmaz.
    title: `${p.ad} Fiyatları ${new Date().getFullYear()} — ${aralik}${min ? `, ${para(min)}'den` : ''}`,
    description:
      `${p.ilce}${p.mahalle ? ' ' + p.mahalle : ''}'de ${p.toplam_konut ?? ''} konutluk proje. ` +
      (min ? `${aralik} daireler ${para(min)}'den. ` : '') +
      `${teslim(p.teslim_ceyrek) ?? 'Teslim tarihi açıklanmadı'}. ` +
      (p.fiyat_teyit_tarihi ? `${tarih(p.fiyat_teyit_tarihi)} güncel.` : ''),
    alternates: { canonical: yol },
  };
}

export default async function Sayfa({ params, searchParams }: Params) {
  const { il, ilce, slug } = await params;
  const q = await searchParams;
  const cozum = slugCoz(slug);
  const yol = `/${il}/${ilce}/${slug}`;

  // ── Liste / arama ──
  if (cozum.tip !== 'proje') {
    const filtre = filtreCoz(
      {
        il,
        ilce,
        mahalle: cozum.tip === 'mahalle' ? cozum.mahalle : undefined,
        daireTipi: cozum.tip === 'daire-tipi' ? cozum.daireTipi : undefined,
        kategori: cozum.tip === 'kategori' ? cozum.kategori : undefined,
      },
      q
    );

    const ilceAd = ilce.charAt(0).toUpperCase() + ilce.slice(1);
    const baslik =
      cozum.tip === 'daire-tipi' ? `${ilceAd} ${cozum.daireTipi} Konut Projeleri`
      : cozum.tip === 'mahalle' ? `${cozum.mahalle.charAt(0).toUpperCase() + cozum.mahalle.slice(1)} Konut Projeleri`
      : `${ilceAd} ${cozum.kategori.replace(/-/g, ' ')} Projeleri`;

    if (q.gorunum === 'harita') {
      return <HaritaGorunumu taban={yol} baslik={baslik} filtre={filtre} />;
    }

    return <AramaSayfasi taban={yol} baslik={baslik} filtre={filtre} />;
  }

  // ── Proje detay ──
  const p = await projeDetayGetir(il, ilce, slug);
  if (!p) notFound();

  // Teslim edilmiş proje satış sayfası olarak render EDİLMEZ.
  // Arşiv görünümü: satış CTA'sı yok, fiyat geçmişi ve firmanın
  // aktif projelerine köprü var.
  if (p.durum === 'arsiv' || p.durum === 'teslim_edildi') {
    return <ArsivProje p={p} />;
  }

  return <ProjeDetay p={p} />;
}
