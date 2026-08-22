import 'dotenv/config';
import type { Prisma } from '../lib/generated/prisma';
import { prisma } from '../lib/db';
import {
  VARSAYILAN_SAYFALAR as SAYFALAR,
  VARSAYILAN_SAYFALAR_EN as SAYFALAR_EN,
  type VarsayilanSayfa,
} from '../lib/icerik-varsayilan';

/**
 * Kurumsal sayfaları koda gömülü hâlden veritabanına taşır.
 *   node --conditions=react-server --import tsx scripts/icerik-tohum.ts
 *
 * Faz 20'de `app/[sayfa]/page.tsx` içindeki sabit `SAYFALAR` kaydı
 * `sayfa` tablosuna geçti. İçeriğin kendisi artık
 * `lib/icerik-varsayilan.ts` içinde: okuma katmanı da aynı kaydı
 * kullanıyor, böylece tohumlanmamış bir veritabanında sayfalar 404
 * yerine koda gömülü hâliyle çıkıyor. Bu betik onları tabloya
 * yazarak PANELDEN DÜZENLENEBİLİR hâle getiriyor.
 *
 * Var olan kayıtların ÜZERİNE YAZMIYOR. Panelden düzenlenmiş bir
 * sayfa, betik ikinci kez çalıştırılınca eski hâline dönmemeli.
 * Sıfırlamak için: `--zorla`.
 *
 * `--zorla` TEK BAŞINA BÜTÜN sayfaları koda gömülü hâline döndürüyor.
 * Tek bir sayfayı tazelemek için `--sayfa=slug` ile birlikte kullanın:
 *
 *   npm run icerik-tohum -- --zorla --sayfa=firma-rehberi
 *
 * Bu ayrım şart oldu: yayındaki `/firma-rehberi` metnini tazelemek için
 * `--zorla` çalıştırmak, panelden elle düzenlenmiş bütün kurumsal
 * sayfaları da koda gömülü hâline geri alıyordu.
 */

async function tohumla(
  kayit: Record<string, VarsayilanSayfa>,
  dil: 'TR' | 'EN',
  zorla: boolean,
  yalnizca: string | null,
) {
  let yeni = 0, atlanan = 0, guncel = 0;
  for (const [slug, s] of Object.entries(kayit)) {
    if (yalnizca && slug !== yalnizca) continue;
    const varOlan = await prisma.sayfa.findUnique({ where: { slug_dil: { slug, dil } } });
    /* JSON sütunları: Prisma `InputJsonValue` bekliyor, bizim
       tiplerimiz dizi. Yapı birebir aynı, yalnızca imza çevriliyor. */
    const veri = {
      baslik: s.baslik, h1: s.h1, aciklama: s.aciklama,
      govde: s.govde as unknown as Prisma.InputJsonValue,
      sss: (s.sss ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
      indexle: s.indexle ?? true, yayinda: true,
      /* CTA alanlari HIC tohumlanmiyordu: varsayilana dugme eklense
         bile tabloya gecmiyor, sayfa site geneli dugmeye dusuyordu —
         `/firma-rehberi` sonunda firmayi "konut projesi bolgelerine
         goz atin" diye kiralik ilanlara yolluyordu. `null` da
         yaziliyor ki varsayilandan kaldirilan bir dugme kayitta
         kalmasin. */
      ctaMetin: s.ctaMetin ?? null,
      ctaYol: s.ctaYol ?? null,
    };
    if (!varOlan) {
      await prisma.sayfa.create({ data: { slug, dil, ...veri } });
      yeni++;
    } else if (zorla) {
      await prisma.sayfa.update({ where: { id: varOlan.id }, data: veri });
      guncel++;
    } else {
      atlanan++;
    }
  }
  console.log(`  ${dil}: ${yeni} yeni, ${guncel} güncellendi, ${atlanan} atlandı`);
}

async function main() {
  const zorla = process.argv.includes('--zorla');
  const sayfaArg = process.argv.find((a) => a.startsWith('--sayfa='));
  const yalnizca = sayfaArg ? sayfaArg.slice('--sayfa='.length) : null;

  if (yalnizca) {
    if (!(yalnizca in SAYFALAR) && !(yalnizca in SAYFALAR_EN)) {
      console.error(`Bilinmeyen sayfa: ${yalnizca}`);
      process.exit(1);
    }
    console.log(`\nYalnızca "${yalnizca}" işleniyor.`);
  }
  if (zorla) {
    const kapsam = yalnizca ? 'bu sayfanın' : 'var olan sayfaların';
    console.log(`\n⚠ --zorla: ${kapsam} üzerine yazılıyor\n`);
  }

  console.log('Kurumsal sayfalar tohumlanıyor...');
  await tohumla(SAYFALAR, 'TR', zorla, yalnizca);
  await tohumla(SAYFALAR_EN, 'EN', zorla, yalnizca);

  const t = await prisma.sayfa.count();
  console.log(`\nToplam ${t} sayfa kaydı.`);

  /* Okuma katmanı `unstable_cache` ile etiketli (`ICERIK_ETIKET`).
     Bu betik istek bağlamı dışında çalıştığı için `revalidateTag`
     çağıramıyor: ayakta duran bir sunucu, tazelenene kadar eski metni
     sunmaya devam ediyor. Vercel'de sorun değil — tohumlama
     `next build`ten önce çalışıyor — ama elle çalıştırıldığında
     hatırlatmak gerekiyor. */
  if (zorla) {
    console.log('Ayakta duran sunucu eski metni sunmaya devam eder:');
    console.log('yeniden dağıtın ya da panelden sayfayı bir kez kaydedin.');
  }
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
