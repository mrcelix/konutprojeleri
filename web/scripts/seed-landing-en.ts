import 'dotenv/config';
import { prisma } from '../lib/db';

/**
 * İngilizce iniş sayfası metinleri.
 *
 * Slug'lar İngilizce arama terimlerine göre seçildi, Türkçenin
 * birebir çevirisi değil. "Güvenlikli site" doğrudan "secure estate"
 * değil — İngilizce arayan kişi "gated community" yazıyor ve arama
 * hacmi orada. "Deprem yönetmeliğine uygun" ise İngilizce karşılığı
 * olmayan yerel bir kavram; "earthquake-resistant" diye aranıyor ve
 * başlık o terimi kullanıyor.
 */
const LANDING_EN: Record<string, { slug: string; baslik: string; aciklama: string }> = {
  guvenlik: {
    slug: 'gated-developments',
    baslik: 'Developments with 24/7 Security',
    aciklama: 'Staffed entrances and round-the-clock security, standard in estate-scale schemes and the first question most buyers ask.',
  },
  kapalisite: {
    slug: 'gated-community-projects',
    baslik: 'Gated Community Projects',
    aciklama: 'Enclosed sites with controlled access, private grounds and traffic kept outside the perimeter.',
  },
  akillEv: {
    slug: 'smart-home-developments',
    baslik: 'Smart Home Developments',
    aciklama: 'Heating, lighting and access controlled from an app or a wall panel, wired in during construction rather than added later.',
  },
  kapaliotopark: {
    slug: 'developments-with-covered-parking',
    baslik: 'Developments with Covered Parking',
    aciklama: 'Underground or covered parking allocated to units — worth confirming whether the right belongs to the flat or to the estate.',
  },
  yuzmehavuzu: {
    slug: 'developments-with-a-pool',
    baslik: 'Developments with a Swimming Pool',
    aciklama: 'Shared outdoor pools within the grounds. One of the largest single items in the monthly service charge.',
  },
  kapalihavuz: {
    slug: 'developments-with-an-indoor-pool',
    baslik: 'Developments with an Indoor Pool',
    aciklama: 'Heated indoor pools usable through the winter, usually alongside a gym and sauna in the same clubhouse.',
  },
  cocukoyun: {
    slug: 'family-friendly-developments',
    baslik: 'Family-Friendly Developments',
    aciklama: 'Playgrounds, car-free internal grounds and landscaping designed with small children in mind.',
  },
  manzara: {
    slug: 'developments-with-a-view',
    baslik: 'Developments with a View',
    aciklama: 'Sea, city or valley outlook. Check the zoning on the parcels in between — a view is only as secure as the plan behind it.',
  },
  denizemesafe: {
    slug: 'developments-near-the-sea',
    baslik: 'Developments Near the Sea',
    aciklama: 'Within walking distance of the shore, typically on redeveloped coastal land.',
  },
  metroyakin: {
    slug: 'developments-near-the-metro',
    baslik: 'Developments Near the Metro',
    aciklama: 'A short walk to a metro station — the strongest single predictor of rental demand in Turkish cities.',
  },
  depremyonetmelik: {
    slug: 'earthquake-resistant-developments',
    baslik: 'Developments Built to the 2018 Seismic Code',
    aciklama: 'Designed under Turkey\'s 2018 seismic building regulation, which tightened the requirements that applied to older stock.',
  },
};

async function main() {
  let sayi = 0;
  for (const [kod, v] of Object.entries(LANDING_EN)) {
    const kayit = await prisma.ozellik.findUnique({ where: { kod }, select: { id: true } });
    if (!kayit) { console.warn(`  ! özellik bulunamadı: ${kod}`); continue; }
    const veri = {
      landingSlug: v.slug, landingBaslik: v.baslik, landingAciklama: v.aciklama,
    };
    await prisma.ozellikCeviri.upsert({
      where: { ozellikId_dil: { ozellikId: kayit.id, dil: 'EN' } },
      create: { ozellikId: kayit.id, dil: 'EN', ...veri },
      update: veri,
    });
    sayi += 1;
  }
  console.log(`${sayi} özelliğin İngilizce iniş metni yüklendi`);

  const eksik = await prisma.ozellik.count({
    where: {
      landingSlug: { not: null },
      ceviri: { none: { dil: 'EN', landingSlug: { not: null } } },
    },
  });
  if (eksik) console.log(`  ! ${eksik} özelliğin İngilizce iniş sayfası yok — üretilmeyecek`);
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
