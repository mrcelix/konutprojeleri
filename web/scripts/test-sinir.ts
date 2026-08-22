import 'dotenv/config';
import { prisma } from '../lib/db';
import {
  KURALLAR, eskiSinirlariTemizle, sinirKontrol, sinirOzeti, sinirSifirla,
} from '../lib/hiz-sinir';
import { ESIKLER, cwvOzet, enYavasSayfalar, eskiOlcumleriTemizle } from '../lib/olcum';

/**
 * Hız sınırı ve ölçüm testleri.
 *   node --conditions=react-server --import tsx scripts/test-sinir.ts
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const KIMLIK = 'test-sinir-kimlik';

async function main() {
  console.log('\n═══ 1. Kural tanımları ═══');
  /* Sabit sayı yerine korunan DAVRANIŞ sınanıyor: yeni bir kural
     eklemek testi kırmamalı, ama korunması gereken yüzeylerin
     kuralsız kalması kırmalı. */
  const zorunlu = ['girisIp', 'girisHesap', 'ikinciAsama', 'talep', 'talepSorgu',
    'soru', 'arama', 'veriTalebi', 'basvuru', 'alarm'];
  const eksik = zorunlu.filter((k) => !(k in KURALLAR));
  bekle('korunması gereken yüzeylerin hepsinde kural var',
    eksik.length === 0, eksik.length ? `eksik: ${eksik.join(',')}` : `${Object.keys(KURALLAR).length} kural`);
  bekle('hepsinin azami/pencere/engel değeri var',
    Object.values(KURALLAR).every((k) => k.azami > 0 && k.pencereSn > 0 && k.engelSn > 0));
  bekle('2FA kuralı en sıkı deneme sayısına sahip',
    KURALLAR.ikinciAsama.azami <= KURALLAR.girisIp.azami,
    `${KURALLAR.ikinciAsama.azami} ≤ ${KURALLAR.girisIp.azami}`);
  // Hesap ekseni IP'den gevşek olmalı: aksi halde saldırgan kurbanın
  // hesabını kilitleyebilir
  bekle('hesap sınırı IP sınırından gevşek',
    KURALLAR.girisHesap.azami > KURALLAR.girisIp.azami,
    `${KURALLAR.girisHesap.azami} > ${KURALLAR.girisIp.azami}`);

  console.log('\n═══ 2. Sayaç davranışı ═══');
  await sinirSifirla('ikinciAsama', KIMLIK);

  const ilk = await sinirKontrol('ikinciAsama', KIMLIK);
  bekle('ilk deneme izinli', ilk.izin);
  bekle('kalan hak doğru', ilk.kalan === KURALLAR.ikinciAsama.azami - 1, `${ilk.kalan}`);

  // Sınıra kadar dene
  const azami = KURALLAR.ikinciAsama.azami;
  for (let i = 1; i < azami; i++) await sinirKontrol('ikinciAsama', KIMLIK);

  const sonHak = await sinirKontrol('ikinciAsama', KIMLIK);
  bekle('sınır aşılınca reddediliyor', !sonHak.izin, `${azami} denemeden sonra`);
  bekle('açılış zamanı dönüyor', sonHak.acilis instanceof Date);
  bekle('kullanıcıya mesaj veriliyor', (sonHak.mesaj ?? '').includes('dakika'), sonHak.mesaj);

  const engelli = await sinirKontrol('ikinciAsama', KIMLIK);
  bekle('engel sürerken hâlâ reddediyor', !engelli.izin);

  console.log('\n═══ 3. Sıfırlama ═══');
  await sinirSifirla('ikinciAsama', KIMLIK);
  const temiz = await sinirKontrol('ikinciAsama', KIMLIK);
  bekle('sıfırlamadan sonra tekrar izinli', temiz.izin);
  bekle('kalan hak yeniden dolu', temiz.kalan === azami - 1);
  await sinirSifirla('ikinciAsama', KIMLIK);

  console.log('\n═══ 4. Kurallar birbirinden bağımsız ═══');
  await sinirSifirla('soru', KIMLIK);
  await sinirSifirla('girisIp', KIMLIK);
  for (let i = 0; i < KURALLAR.soru.azami + 1; i++) await sinirKontrol('soru', KIMLIK);
  const soruSinir = await sinirKontrol('soru', KIMLIK);
  const girisSinir = await sinirKontrol('girisIp', KIMLIK);
  bekle('soru sınırı doldu', !soruSinir.izin);
  bekle('aynı kimlikte giriş sınırı etkilenmedi', girisSinir.izin);
  await sinirSifirla('soru', KIMLIK);
  await sinirSifirla('girisIp', KIMLIK);

  console.log('\n═══ 5. Kimlikler birbirinden bağımsız ═══');
  const A = `${KIMLIK}-a`, B = `${KIMLIK}-b`;
  await sinirSifirla('soru', A); await sinirSifirla('soru', B);
  for (let i = 0; i < KURALLAR.soru.azami + 1; i++) await sinirKontrol('soru', A);
  bekle('A engellendi', !(await sinirKontrol('soru', A)).izin);
  bekle('B etkilenmedi', (await sinirKontrol('soru', B)).izin);
  await sinirSifirla('soru', A); await sinirSifirla('soru', B);

  console.log('\n═══ 6. Bilinmeyen kimlik ═══');
  // Bağlamsız çağrıları (zamanlanmış iş, seed, test) tek kovada toplamak
  // hepsinin birbirini kilitlemesine yol açıyordu — test takımı bu yüzden
  // düştü. Kimlik belirlenemiyorsa sınırlama uygulanmıyor.
  // Düzeltmeden önceki çalıştırmalardan kalan kayıtlar olabilir
  await prisma.hizSinir.deleteMany({ where: { anahtar: { contains: 'bilinmeyen' } } });
  for (let i = 0; i < KURALLAR.soru.azami + 5; i++) await sinirKontrol('soru', 'bilinmeyen');
  bekle('bilinmeyen kimlik sınırlanmıyor', (await sinirKontrol('soru', 'bilinmeyen')).izin);
  bekle('boş kimlik sınırlanmıyor', (await sinirKontrol('soru', '')).izin);
  const bilinmeyenKayit = await prisma.hizSinir.count({
    where: { anahtar: { contains: 'bilinmeyen' } },
  });
  bekle('bilinmeyen için sayaç kaydı açılmıyor', bilinmeyenKayit === 0);

  console.log('\n═══ 7. Panel özeti ve temizlik ═══');
  const ozet = await sinirOzeti(5);
  bekle('özet sayıları negatif değil', ozet.aktifEngel >= 0);
  bekle('son engeller listesi dizi', Array.isArray(ozet.sonEngeller));

  const silinen = await eskiSinirlariTemizle();
  bekle('eski sayaç temizliği çalışıyor', silinen >= 0, `${silinen} kayıt`);

  console.log('\n═══ 7. Ölçüm eşikleri ═══');
  bekle('beş metrik tanımlı', Object.keys(ESIKLER).length === 5);
  bekle('LCP eşiği Google tanımıyla aynı',
    ESIKLER.LCP.iyi === 2500 && ESIKLER.LCP.orta === 4000);
  bekle('INP eşiği Google tanımıyla aynı',
    ESIKLER.INP.iyi === 200 && ESIKLER.INP.orta === 500);
  bekle('CLS eşiği Google tanımıyla aynı',
    ESIKLER.CLS.iyi === 0.1 && ESIKLER.CLS.orta === 0.25);
  bekle('her eşikte iyi < orta',
    Object.values(ESIKLER).every((e) => e.iyi < e.orta));

  console.log('\n═══ 8. Ölçüm toplama ve p75 ═══');
  await prisma.olcumCWV.deleteMany({ where: { yol: '/test-olcum' } });

  // p75 doğrulaması: 1..100 için 75. yüzdelik ≈ 75
  await prisma.olcumCWV.createMany({
    data: Array.from({ length: 100 }, (_, i) => ({
      yol: '/test-olcum', metrik: 'LCP', deger: i + 1,
      derece: i < 50 ? 'good' : 'poor', cihaz: i % 2 ? 'mobil' : 'masaustu',
    })),
  });

  /* Özet YOLA DARALTILIYOR: site genelinde ölçüm varsa (geliştirme
     sırasında tarayıcı gerçek ölçüm gönderiyor) fikstürün p75'i onlarla
     karışıyordu. */
  const ozetCwv = await cwvOzet(1, undefined, '/test-olcum');
  const lcp = ozetCwv.find((o) => o.metrik === 'LCP');
  bekle('LCP özeti üretiliyor', !!lcp);
  bekle('p75 doğru hesaplanıyor', !!lcp && Math.abs(lcp.p75 - 75) <= 1, `p75 = ${lcp?.p75}`);
  bekle('örneklem sayılıyor', (lcp?.orneklem ?? 0) >= 100, `${lcp?.orneklem}`);
  bekle('iyi oranı hesaplanıyor', (lcp?.iyiOran ?? 0) > 0 && (lcp?.iyiOran ?? 0) <= 100,
    `%${lcp?.iyiOran}`);
  // p75 = 75 ms, eşik 2500 → "good"
  bekle('derece eşiğe göre veriliyor', lcp?.derece === 'good', lcp?.derece);

  /* Koşullu filtrelerin ÜÇ birleşimi de sorguyu bozmadan çalışmalı.
     Bu filtreler bir zamanlar `Prisma.sql` parçası olarak ekleniyordu;
     Next.js paketinde parça tanınmayıp sorguya `$2` olarak giriyor ve
     performans ekranı 500 veriyordu. Üç birleşim de burada geçiyor. */
  const filtreliMobil = await cwvOzet(1, 'mobil', '/test-olcum');
  const filtreliMasa = await cwvOzet(1, 'masaustu', '/test-olcum');
  const filtresiz = await cwvOzet(1);
  bekle('cihaz + yol filtresi birlikte çalışıyor',
    (filtreliMobil.find((o) => o.metrik === 'LCP')?.orneklem ?? 0) === 50,
    `${filtreliMobil.find((o) => o.metrik === 'LCP')?.orneklem} ölçüm`);
  bekle('iki cihazın örneklemi toplamı veriyor',
    (filtreliMobil.find((o) => o.metrik === 'LCP')?.orneklem ?? 0)
    + (filtreliMasa.find((o) => o.metrik === 'LCP')?.orneklem ?? 0) === 100);
  bekle('filtresiz özet de hata vermiyor', Array.isArray(filtresiz));

  const yavas = await enYavasSayfalar('LCP', 1, 5);
  bekle('en yavaş sayfalar listeleniyor', yavas.some((y) => y.yol === '/test-olcum'));
  bekle('az örneklemli sayfalar eleniyor', yavas.every((y) => y.orneklem >= 5));

  console.log('\n═══ 9. Ölçüm saklama ═══');
  // 90 günden eski kayıt yoksa 0 dönmeli, hata vermemeli
  const eskiSilinen = await eskiOlcumleriTemizle(90);
  bekle('eski ölçüm temizliği çalışıyor', eskiSilinen >= 0, `${eskiSilinen} kayıt`);

  const kalanTest = await prisma.olcumCWV.count({ where: { yol: '/test-olcum' } });
  bekle('yeni ölçümler korunuyor', kalanTest === 100, `${kalanTest}`);

  await prisma.olcumCWV.deleteMany({ where: { yol: '/test-olcum' } });
  await prisma.hizSinir.deleteMany({ where: { anahtar: { contains: KIMLIK } } });

  console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
  await prisma.$disconnect();
  process.exit(kalan === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
