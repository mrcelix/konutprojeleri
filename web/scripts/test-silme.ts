import 'dotenv/config';
import { prisma } from '../lib/db';
import { bolgeDenetle, icerikTamamla } from '../lib/bolge-yonet';
import { bolgeSilmeRaporu, firmaSilmeRaporu, projeSilmeRaporu } from '../lib/silme';

/**
 * Silme güvenliği testleri.
 *   node --conditions=react-server --import tsx scripts/test-silme.ts
 *
 * Şemadaki `onDelete` kuralları iki gruba ayrılıyor ve tehlikeli olan
 * ikincisi: `Restrict` veritabanınca reddediliyor, `Cascade` SESSİZCE
 * siliniyor. Projeye Cascade ile bağlı olanlar arasında ziyaretçi
 * yazışmaları, fiyat alarmları ve daire tipleri var.
 *
 * Talep ise `SetNull`: FK hiç engellemiyor, talep kaydı kalıyor ama
 * "bu kişi hangi projeyi sordu" bilgisi buharlaşıyor. Bu yüzden
 * talebi olan proje SİLİNMİYOR — rapor bunu açıkça söylüyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzf68';

async function temizle() {
  const v = await prisma.proje.findMany({ where: { slug: { startsWith: ONEK } }, select: { id: true } });
  for (const x of v) {
    await prisma.talep.deleteMany({ where: { projeId: x.id } });
    await prisma.proje.delete({ where: { id: x.id } });
  }
  await prisma.bolge.deleteMany({ where: { slug: { startsWith: ONEK } } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZF68' } } });
}

async function main() {
  await temizle();

  console.log('\n=== 1. Bolge dogrulama ===');
  const temel = {
    slug: `${ONEK}-test`, ad: 'Test Bölge', il: 'Muğla',
    lat: 36.6, lng: 29.1, img: 'https://x.test/a.jpg',
    ozet: 'Bu bölge testler için açıldı ve özeti kırk karakterden uzun olmak zorunda.',
  };
  bekle('geçerli girdi kabul', bolgeDenetle(temel) === null, bolgeDenetle(temel) ?? '');
  bekle('büyük harfli slug reddediliyor', bolgeDenetle({ ...temel, slug: 'Test' }) !== null);
  bekle('ayrılmış slug reddediliyor', bolgeDenetle({ ...temel, slug: 'arama' }) !== null);
  bekle('kısa özet reddediliyor', bolgeDenetle({ ...temel, ozet: 'kısa' }) !== null);
  bekle('göreli görsel reddediliyor', bolgeDenetle({ ...temel, img: '/a.jpg' }) !== null);
  /* Koordinat harita aramasının temeli; sıfır kalırsa projeler Gine
     Körfezi'nde görünür. */
  bekle('sıfır koordinat reddediliyor', bolgeDenetle({ ...temel, lat: 0, lng: 0 }) !== null);
  bekle('Türkiye dışı enlem reddediliyor', bolgeDenetle({ ...temel, lat: 52 }) !== null);
  bekle('Türkiye dışı boylam reddediliyor', bolgeDenetle({ ...temel, lng: 5 }) !== null);

  console.log('\n=== 2. Icerik iskeleti ===');
  /* Eksik alan herkese açık bir sayfayı düşürmemeli: iniş sayfası
     `icerik.mevkiler.map(...)` diyor. */
  const bos = icerikTamamla(null);
  bekle('boş girdiden tam iskelet', Array.isArray(bos.mevkiler) && bos.mevkiler.length === 0);
  bekle('tüm alanlar dizi',
    [bos.giris, bos.mevkiler, bos.yatirim, bos.ulasim, bos.cevre, bos.ipuclari]
      .every(Array.isArray));
  const kismi = icerikTamamla({ giris: ['a'], mevkiler: 'bozuk' });
  bekle('var olan alan korunuyor', kismi.giris.length === 1);
  bekle('bozuk alan diziye çevriliyor', Array.isArray(kismi.mevkiler) && kismi.mevkiler.length === 0);

  console.log('\n=== 3. Proje silme raporu ===');
  const bolge = await prisma.bolge.create({
    data: { ...temel, icerik: {}, adet: 0, yayinda: false },
    select: { id: true },
  });
  const firma = await prisma.firma.create({
    data: {
      slug: `${ONEK}-firma`, ad: 'ZZF68 Firma',
      ozet: 'Silme testleri için açılan geçici firma kaydı.',
    },
    select: { id: true },
  });
  const proje = await prisma.proje.create({
    data: {
      slug: `${ONEK}-proje`, ad: 'ZZF68 Proje', bolgeId: bolge.id, firmaId: firma.id,
      mahalle: 'Test', lat: 36.6, lng: 29.1,
      tip: 'KONUT', durum: 'SATISTA', fiyatMin: 4_000_000,
      ozet: 'Silme testleri için açılan geçici proje kaydıdır, kırk karakterden uzun.',
      yayinda: false, yayinTarihi: new Date(),
    },
    select: { id: true },
  });

  const bosRapor = await projeSilmeRaporu(proje.id);
  bekle('bağsız proje silinebiliyor', bosRapor.izin, bosRapor.engel ?? '');
  bekle('gidecek kayıt yok', bosRapor.gidecek.length === 0);

  /* Cascade ile bağlı kayıtlar SAYILMALI: yönetici "bu projeyi sil"
     derken daire tiplerini ve yazışmaları da sildiğini bilmiyordu. */
  await prisma.daireTipi.create({
    data: {
      projeId: proje.id, ad: '2+1', odaSayisi: '2+1', banyo: 1,
      brutM2: 95, netM2: 78, fiyatMin: 4_000_000, sira: 0,
    },
  });
  await prisma.konusma.create({
    data: {
      projeId: proje.id, soranAd: 'ZZF68 Ziyaretçi',
      soranEposta: 'zzf68@ornek.test', konu: 'Teslim',
      mesajlar: { create: [{ soranMi: true, metin: 'Teslim ne zaman?' }] },
    },
  });
  const bagli = await projeSilmeRaporu(proje.id);
  bekle('daire tipi gidecek listesinde',
    bagli.gidecek.some((g) => g.ad === 'daire tipi' && g.adet === 1),
    JSON.stringify(bagli.gidecek));
  bekle('mesajlaşma gidecek listesinde',
    bagli.gidecek.some((g) => g.ad === 'mesajlaşma' && g.adet === 1));
  bekle('bağlı kayıt silmeyi durdurmuyor', bagli.izin);

  /* Talep `SetNull`: veritabanı engellemiyor, satır kalıyor ama proje
     bağı kopuyor. Satış ekibinin elindeki "hangi projeyi sordu"
     bilgisini sessizce yok etmek, kaydı silmekten farksız. */
  await prisma.talep.create({
    data: {
      kod: `ZZF68${Date.now().toString(36).toUpperCase().slice(-5)}`,
      projeId: proje.id, ad: 'ZZF68 Alıcı', telefon: '5551112233', kvkkOnay: true,
    },
  });
  const talepli = await projeSilmeRaporu(proje.id);
  bekle('talebi olan proje silinemiyor', !talepli.izin);
  bekle('engel sebebi talebi söylüyor',
    /talep/i.test(talepli.engel ?? ''), talepli.engel ?? '');
  bekle('engelde yayından kaldırma öneriliyor',
    /yayından kaldır/i.test(talepli.engel ?? ''));

  console.log('\n=== 4. Firma silme raporu ===');
  /* Proje `Restrict`: firmayı silmek projeleri sahipsiz bırakamaz. */
  const projeli = await firmaSilmeRaporu(firma.id);
  bekle('projesi olan firma silinemiyor', !projeli.izin);
  bekle('engel sebebi projeyi söylüyor', /proje/i.test(projeli.engel ?? ''),
    projeli.engel ?? '');

  console.log('\n=== 5. Bolge silme raporu ===');
  /* Proje `Restrict`: bölgeyi silmek projeleri sahipsiz bırakamaz. */
  const projeliBolge = await bolgeSilmeRaporu(bolge.id);
  bekle('projeli bölge silinemiyor', !projeliBolge.izin);
  bekle('engel sebebi projeyi söylüyor', /proje/i.test(projeliBolge.engel ?? ''),
    projeliBolge.engel ?? '');

  await prisma.talep.deleteMany({ where: { projeId: proje.id } });
  await prisma.proje.delete({ where: { id: proje.id } });
  const bosBolge = await bolgeSilmeRaporu(bolge.id);
  bekle('projesiz bölge silinebiliyor', bosBolge.izin, bosBolge.engel ?? '');
  bekle('projesiz firma silinebiliyor', (await firmaSilmeRaporu(firma.id)).izin);

  bekle('olmayan proje reddediliyor', !(await projeSilmeRaporu('yok-boyle-proje')).izin);
  bekle('olmayan firma reddediliyor', !(await firmaSilmeRaporu('yok-boyle-firma')).izin);
  bekle('olmayan bölge reddediliyor', !(await bolgeSilmeRaporu('yok-boyle-bolge')).izin);

  console.log('\n=== 6. Temizlik ===');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.bolge.count({ where: { slug: { startsWith: ONEK } } })) === 0);

  console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
  await prisma.$disconnect();
  process.exit(kalan === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await temizle().catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
