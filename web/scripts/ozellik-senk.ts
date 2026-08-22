import 'dotenv/config';
import { OZELLIKLER, PROJELER } from '../prisma/seed-data';
import { prisma } from '../lib/db';
import type { OzellikKey } from '../lib/types';

/**
 * Özellik taksonomisini koda göre eşitler.
 *   node --conditions=react-server --import tsx scripts/ozellik-senk.ts
 *
 * Tohumlama yalnızca BOŞ veritabanına yazıyor; taksonomiye sonradan
 * eklenen bir kod (kapalı havuz, akıllı ev, deprem yönetmeliği gibi)
 * mevcut kuruluma hiç ulaşmıyordu.
 *
 * İki yönlü değil, TEK yönlü: kod → veritabanı. Eksik olan ekleniyor,
 * fazlası silinmiyor — panelden elle eklenen bir özelliği betiğin
 * götürmesi, kaybı sessiz kılardı.
 */

async function main() {
  console.log('\n▸ Özellik kayıtları');
  let yeniOzellik = 0;
  let sira = 0;
  for (const [kod, o] of Object.entries(OZELLIKLER) as [OzellikKey, (typeof OZELLIKLER)[OzellikKey]][]) {
    const mevcut = await prisma.ozellik.findUnique({
      where: { kod }, select: { id: true, landingSlug: true },
    });
    if (mevcut) {
      /* Var olan koda SONRADAN iniş sayfası tanımlanmış olabilir
         Yalnızca boş olan dolduruluyor; dolu bir
         slug'ı değiştirmek yayındaki bir URL'yi kırardı. */
      if (!mevcut.landingSlug && o.landing) {
        await prisma.ozellik.update({
          where: { id: mevcut.id },
          data: {
            landingSlug: o.landing.slug,
            landingBaslik: o.landing.baslik,
            landingAciklama: o.landing.aciklama,
          },
        });
        console.log(`  ~ ${kod} — iniş sayfası eklendi (${o.landing.slug})`);
        yeniOzellik++;
      }
      sira++;
      continue;
    }
    await prisma.ozellik.create({
      data: {
        kod, ad: o.ad, ikon: o.ikon,
        landingSlug: o.landing?.slug ?? null,
        landingBaslik: o.landing?.baslik ?? null,
        landingAciklama: o.landing?.aciklama ?? null,
        sira,
      },
    });
    console.log(`  + ${kod} — ${o.ad}${o.landing ? ` (iniş: ${o.landing.slug})` : ''}`);
    yeniOzellik++;
    sira++;
  }
  if (yeniOzellik === 0) console.log('  değişiklik yok');

  console.log('\n▸ Proje bağları');
  const ozellikId = new Map(
    (await prisma.ozellik.findMany({ select: { id: true, kod: true } })).map((o) => [o.kod, o.id]),
  );
  let yeniBag = 0;
  for (const v of PROJELER) {
    const proje = await prisma.proje.findUnique({
      where: { slug: v.slug },
      select: { id: true, ozellikler: { select: { ozellik: { select: { kod: true } } } } },
    });
    if (!proje) continue;
    const varOlan = new Set(proje.ozellikler.map((x) => x.ozellik.kod));
    const eksik = v.ozellik.filter((k) => !varOlan.has(k) && ozellikId.has(k));
    if (eksik.length === 0) continue;
    await prisma.projeOzellik.createMany({
      data: eksik.map((k) => ({ projeId: proje.id, ozellikId: ozellikId.get(k)! })),
      skipDuplicates: true,
    });
    console.log(`  ${v.ad}: +${eksik.join(', +')}`);
    yeniBag += eksik.length;
  }
  if (yeniBag === 0) console.log('  değişiklik yok');

  console.log(`\n✓ ${yeniOzellik} özellik, ${yeniBag} bağ eklendi\n`);
}

main()
  .then(async () => { await prisma.$disconnect(); process.exit(0); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
