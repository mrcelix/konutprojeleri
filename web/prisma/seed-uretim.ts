import 'dotenv/config';
import { OZELLIKLER, BOLGELER } from './seed-data';
import { prisma } from '../lib/db';
import { parolaHashle } from '../lib/auth';
import type { OzellikKey } from '../lib/types';

/* ============================================================
   ÜRETİM tohumlaması.

   `prisma/seed.ts` DEMO verisi kuruyor: projeler, firmalar, talepler
   ve panel hesapları — hepsi ORTAK ve KODDA YAZILI bir parolayla
   (`konutprojeleri2026`). Üretimde çalıştırmak, herkese açık bir alan
   adında parolası bilinen yönetici hesabı bırakmak demek.

   Bu betik yalnızca sitenin ÇALIŞMASI için gereken referans veriyi
   kuruyor:

     · Özellikler   — arama filtreleri ve iniş sayfaları bunlara bağlı
     · Bölgeler     — bölge sayfaları, arama, alt bilgi
     · Bir yönetici hesabı — parola ORTAM DEĞİŞKENİNDEN

   KURMADIKLARI: proje, firma, daire tipi, talep, konuşma.
   Bunlar gerçek envanter; panelden girilecek.

   Kurumsal sayfalar ayrı: `scripts/icerik-tohum.ts`.

   IDEMPOTENT: var olan kaydın üzerine yazmıyor, ikinci çalıştırma
   yalnızca eksikleri tamamlıyor. Dağıtım betiğinden güvenle
   çağrılabilir.

   Çalıştırma:
     YONETICI_EPOSTA=... YONETICI_PAROLA=... npm run db:seed-uretim
   ============================================================ */


async function main() {
  console.log('Üretim tohumlaması başlıyor…\n');

  /* ---------------- Özellikler ---------------- */
  let ozellikYeni = 0;
  let sira = 0;
  for (const [kod, o] of Object.entries(OZELLIKLER) as [OzellikKey, (typeof OZELLIKLER)[OzellikKey]][]) {
    const mevcut = await prisma.ozellik.findUnique({ where: { kod }, select: { id: true } });
    if (!mevcut) {
      await prisma.ozellik.create({
        data: {
          kod, ad: o.ad, ikon: o.ikon,
          landingSlug: o.landing?.slug ?? null,
          landingBaslik: o.landing?.baslik ?? null,
          landingAciklama: o.landing?.aciklama ?? null,
          sira,
        },
      });
      ozellikYeni++;
    }
    sira++;
  }
  console.log(`  özellik      ${ozellikYeni} yeni · ${await prisma.ozellik.count()} toplam`);

  /* ---------------- Bölgeler ---------------- */
  let bolgeYeni = 0;
  for (const [i, b] of BOLGELER.entries()) {
    const mevcut = await prisma.bolge.findUnique({ where: { slug: b.slug }, select: { id: true } });
    if (mevcut) continue;
    const { sss, ...icerikGerisi } = b.icerik;
    await prisma.bolge.create({
      data: {
        slug: b.slug, ad: b.ad, il: b.il, lat: b.lat, lng: b.lng,
        // `adet` fikstürden geliyor ama gerçek proje sayısı envanterden
        // doğacak; sıfırlanıyor ki olmayan proje vaadi verilmesin
        adet: 0,
        img: b.img, ozet: b.ozet, icerik: icerikGerisi, sira: i,
        sss: { create: sss.map((f, k) => ({ soru: f.s, cevap: f.c, sira: k })) },
      },
    });
    bolgeYeni++;
  }
  console.log(`  bölge        ${bolgeYeni} yeni · ${await prisma.bolge.count()} toplam`);

  /* ---------------- Yönetici hesabı ---------------- */
  const eposta = process.env.YONETICI_EPOSTA?.trim().toLowerCase();
  const parola = process.env.YONETICI_PAROLA;

  if (!eposta || !parola) {
    console.log('\n  yönetici     ATLANDI — YONETICI_EPOSTA ve YONETICI_PAROLA tanımlı değil');
    console.log('               Parola KODA YAZILMIYOR; ortam değişkeniyle verilmeli.');
  } else if (parola.length < 12) {
    // Yönetici hesabı tüm envantere ve kişisel veriye erişiyor
    console.log('\n  yönetici     ATLANDI — parola en az 12 karakter olmalı');
  } else if (await prisma.kullanici.findUnique({ where: { eposta }, select: { id: true } })) {
    console.log(`\n  yönetici     zaten var (${eposta}) — parolaya DOKUNULMADI`);
  } else {
    await prisma.kullanici.create({
      data: { ad: 'Yönetim', eposta, rol: 'ADMIN', parolaHash: await parolaHashle(parola) },
    });
    console.log(`\n  yönetici     oluşturuldu: ${eposta}`);
  }

  const sayim = {
    ozellik: await prisma.ozellik.count(),
    bolge: await prisma.bolge.count(),
    proje: await prisma.proje.count(),
    firma: await prisma.firma.count(),
    kullanici: await prisma.kullanici.count(),
    sayfa: await prisma.sayfa.count(),
  };
  console.log('\nDurum:', sayim);

  if (!sayim.sayfa) {
    console.log('\n  ⚠ Kurumsal sayfa yok. Ayrıca çalıştırın:');
    console.log('    node --conditions=react-server --import tsx scripts/icerik-tohum.ts');
  }
  if (!sayim.proje) {
    console.log('  ⚠ Envanter boş. Proje eklemek için önce firma kaydı açın:');
    console.log('    /yonetim/firmalar/yeni → /yonetim/projeler/yeni');
    console.log('    Toplu aktarma: /yonetim/projeler/ice-aktar');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
