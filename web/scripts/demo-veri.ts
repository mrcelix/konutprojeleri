import 'dotenv/config';
import { prisma } from '../lib/db';
import { tohumla, turuYenile, type TohumTuru } from '../lib/tohum';

/**
 * Demo veri üretir — panelin bastığı düğmenin komut satırı karşılığı.
 *
 *   npm run db:demo                       → satış talebi geçmişi
 *   npm run db:demo -- ornek              → örnek projeler
 *   npm run db:demo -- demo               → üretilmiş demo projeler (12)
 *   npm run db:demo -- demo 16            → 16 tane
 *   npm run db:demo -- demo 16 --yeniden  → önce eskileri geri al, sonra bas
 *
 * Mantık `lib/tohum.ts` içinde; burada tekrarlanmıyor. Sebebi geri
 * alınabilirlik: komut satırından üretilen veri de tohum defterine
 * yazılıyor ve panelden ("Demo veri" sayfası) geri alınabiliyor.
 * Ayrı bir betik olsaydı ürettiğini kimse geri alamazdı.
 *
 * `--yeniden` aynı türün AÇIK partilerini önce geri alıyor. Üretici
 * düzeltildiğinde (ofis projesinde çocuk oyun alanı çıkıyordu,
 * galeride kopya görsel vardı) eski projeler yerinde durduğu sürece
 * düzeltme görünmüyor; üstüne basmak da `demo-17`, `demo-18`… diye
 * bozuk olanların yanına yenisini ekliyor.
 */

const HARITA: Record<string, TohumTuru> = {
  ornek: 'ORNEK_PROJE',
  demo: 'DEMO_PROJE',
  talep: 'TALEP_GECMISI',
};

async function main() {
  const arg = (process.argv[2] ?? 'talep').toLowerCase();
  const tur = HARITA[arg];
  if (!tur) {
    console.error(`Bilinmeyen tür "${arg}". Seçenekler: ${Object.keys(HARITA).join(', ')}`);
    process.exit(1);
  }
  const adet = Number(process.argv[3]);
  const yeniden = process.argv.includes('--yeniden');

  // Komut satırında yayında açılıyor: geliştirme veritabanında projelerin
  // görünmesi isteniyor. Canlıda panel kullanılmalı, orada varsayılan kapalı.
  const secenek = {
    yayinda: true,
    ...(Number.isFinite(adet) && adet > 0 ? { adet } : {}),
  };

  /* `--yeniden` mantığı `lib/tohum.ts` içinde; panelin "Yenile"
     düğmesiyle aynı fonksiyon. İki ayrı uygulama olsaydı biri
     düzeltilip diğeri unutulurdu. */
  if (yeniden) {
    console.log(`Açık ${tur} partileri geri alınıp yeniden basılıyor…`);
    const y = await turuYenile(tur, null, secenek);
    console.log(`  ↺ ${y.geriAlinanParti} parti · ${y.geriAlinanKayit} kayıt geri alındı`);
    /* Korunan kayıt = üzerine gerçek veri gelmiş demo kayıt (talep
       gelmiş, soru sorulmuş). Sessizce geçilmiyor: kalan proje eski
       üreticiden kalma ve düzeltme onda görünmeyecek. */
    for (const k of y.korunan) console.log(`  ! ${k.model} korundu — ${k.sebep}`);
    if (!y.tamam) {
      console.error(`✗ ${y.hata}`);
      await prisma.$disconnect();
      process.exit(1);
    }
    console.log(`✓ Parti ${y.partiId}`);
    for (const [model, n] of Object.entries(y.sayim ?? {})) console.log(`  ${n} ${model}`);
    y.notlar?.forEach((n) => console.log(`  · ${n}`));
    console.log('\nGeri almak için: yönetim paneli → Demo veri');
    await prisma.$disconnect();
    return;
  }

  console.log(`Tohumlanıyor: ${tur}…`);
  const sonuc = await tohumla(tur, null, secenek);

  if (!sonuc.tamam) {
    console.error(`✗ ${sonuc.hata}`);
    sonuc.notlar?.forEach((n) => console.error(`  · ${n}`));
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`✓ Parti ${sonuc.partiId}`);
  for (const [model, adet] of Object.entries(sonuc.sayim ?? {})) console.log(`  ${adet} ${model}`);
  sonuc.notlar?.forEach((n) => console.log(`  · ${n}`));
  console.log('\nGeri almak için: yönetim paneli → Demo veri');
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
