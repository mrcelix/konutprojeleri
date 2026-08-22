import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchClient, { type FiltreSecenegi } from '@/components/SearchClient';
import { prisma } from '@/lib/db';
import { metinler } from '@/lib/icerik';
import { site } from '@/lib/site';
import type { IkonAdi, OzellikKey } from '@/lib/types';

/* Faceted arama indekslenmiyor — Türkçesiyle aynı gerekçe (indeks
   kirliliği). hreflang yine de basılıyor: iki dilin arama yüzeyi
   birbirinin gerçek karşılığı ve dil değiştirici bunu kullanıyor. */
export async function generateMetadata(): Promise<Metadata> {
  const m = await metinler('en');
  return {
    title: m('int.meta.arama.baslik'),
    description: m('int.meta.arama.aciklama'),
    robots: { index: false, follow: true },
    alternates: {
      canonical: `${site.url}/en/search`,
      languages: {
        'tr-TR': `${site.url}/arama`,
        'en-GB': `${site.url}/en/search`,
        'x-default': `${site.url}/arama`,
      },
    },
  };
}

export const revalidate = 3600;

export default async function EnSearch() {
  // Filtre taksonomisi İngilizce adlarıyla. Çevirisi olmayan özellik
  // listelenmiyor — yarı Türkçe bir filtre çubuğu kaliteyi düşürür.
  const ozellikler = await prisma.ozellik.findMany({
    where: { landingSlug: { not: null }, ceviri: { some: { dil: 'EN', ad: { not: null } } } },
    orderBy: { sira: 'asc' },
    select: { kod: true, ikon: true, ceviri: { where: { dil: 'EN' }, select: { ad: true } } },
  });

  const filtreler: FiltreSecenegi[] = ozellikler.map((o) => ({
    k: o.kod as OzellikKey,
    i: o.ikon as IkonAdi,
    t: o.ceviri[0]!.ad!,
  }));

  return (
    <Suspense fallback={
      <div className="wrap" style={{ padding: '60px 0' }}><p className="muted">Loading developments…</p></div>
    }>
      <SearchClient filtreler={filtreler} baslik="Search developments" />
    </Suspense>
  );
}
