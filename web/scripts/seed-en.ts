import 'dotenv/config';
import { prisma } from '../lib/db';
import { BOLGELER_EN, OZELLIK_EN, PROJE_OZET_EN } from '../prisma/seed-en';

/**
 * İngilizce içeriği yükler. Idempotent — istediğiniz kadar çalıştırın.
 *   npm run db:seed-en
 *
 * Faz 33'ten beri içerik `*_ceviri` tablolarına yazılıyor; eskiden
 * ana tablodaki `*En` sütunlarına yazıyordu.
 */
async function main() {
  let bolge = 0, proje = 0, ozellik = 0;

  for (const b of BOLGELER_EN) {
    const kayit = await prisma.bolge.findUnique({ where: { slug: b.slug }, select: { id: true } });
    if (!kayit) { console.warn(`  ! bölge bulunamadı: ${b.slug}`); continue; }
    await prisma.bolgeCeviri.upsert({
      where: { bolgeId_dil: { bolgeId: kayit.id, dil: 'EN' } },
      create: { bolgeId: kayit.id, dil: 'EN', ozet: b.ozet, icerik: b.icerik },
      update: { ozet: b.ozet, icerik: b.icerik },
    });
    bolge += 1;
  }

  for (const [slug, ozet] of Object.entries(PROJE_OZET_EN)) {
    const kayit = await prisma.proje.findUnique({ where: { slug }, select: { id: true } });
    if (!kayit) continue;
    await prisma.projeCeviri.upsert({
      where: { projeId_dil: { projeId: kayit.id, dil: 'EN' } },
      create: { projeId: kayit.id, dil: 'EN', ozet },
      update: { ozet },
    });
    proje += 1;
  }

  for (const [kod, ad] of Object.entries(OZELLIK_EN)) {
    const kayit = await prisma.ozellik.findUnique({ where: { kod }, select: { id: true } });
    if (!kayit) continue;
    await prisma.ozellikCeviri.upsert({
      where: { ozellikId_dil: { ozellikId: kayit.id, dil: 'EN' } },
      create: { ozellikId: kayit.id, dil: 'EN', ad },
      update: { ad },
    });
    ozellik += 1;
  }

  console.log(`İngilizce içerik: ${bolge} bölge, ${proje} proje, ${ozellik} özellik güncellendi`);

  const eksikProje = await prisma.proje.count({
    where: { yayinda: true, ceviri: { none: { dil: 'EN', ozet: { not: null } } } },
  });
  const eksikBolge = await prisma.bolge.count({
    where: { yayinda: true, ceviri: { none: { dil: 'EN', ozet: { not: null } } } },
  });
  if (eksikProje || eksikBolge) {
    console.log(`  ! çevirisi olmayan: ${eksikBolge} bölge, ${eksikProje} proje`);
    console.log('    Bunlar İngilizce sürümde listelenmiyor ve hreflang almıyor.');
  }
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
