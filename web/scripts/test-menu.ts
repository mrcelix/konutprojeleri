import 'dotenv/config';
import { prisma } from '../lib/db';
import { menuDenetle, menuKur, menuOku } from '../lib/menu-kayit';

/**
 * Faz 63 menü testleri.
 *   node --conditions=react-server --import tsx scripts/test-menu.ts
 *
 * Asıl sınanan, ağacın menüye çevrilmesi: sütunu olmayan mega öge
 * boş panel açardı, yolu olmayan düz bağlantı tıklanamaz olurdu.
 * İkisi de sessizce kırılan hatalar — menüde görünür ama işe yaramaz.
 *
 * `menuKur` saf: girdisi satır listesi, çıktısı menü yapısı.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'ZZF63';

async function temizle() {
  await prisma.menuOgesi.deleteMany({ where: { ad: { startsWith: ONEK } } });
}

type Satir = Awaited<ReturnType<typeof menuOku>>[number];
let sayac = 0;
const satir = (o: Partial<Satir> & { ad: string }): Satir => ({
  id: `s${sayac++}`, ad: o.ad, yol: o.yol ?? null, ikon: o.ikon ?? null, not: o.not ?? null,
  sira: o.sira ?? 0, mega: o.mega ?? false, yeniSekme: o.yeniSekme ?? false,
  aktif: true, ustId: o.ustId ?? null,
  tanitimBaslik: o.tanitimBaslik ?? null, tanitimMetin: o.tanitimMetin ?? null,
  tanitimDugme: o.tanitimDugme ?? null, tanitimYol: o.tanitimYol ?? null,
  seritBaslik: o.seritBaslik ?? null,
});

async function main() {
  await temizle();

  console.log('\n=== 1. Dogrulama ===');
  bekle('geçerli düz bağlantı', menuDenetle({ ad: 'Rehber', yol: '/rehber' }) === null);
  bekle('kısa ad reddediliyor', menuDenetle({ ad: 'A', yol: '/x' }) !== null);
  bekle('uzun ad reddediliyor', menuDenetle({ ad: 'x'.repeat(61), yol: '/x' }) !== null);
  bekle('göreli olmayan adres reddediliyor', menuDenetle({ ad: 'Test', yol: 'rehber' }) !== null);
  bekle('tam https adres kabul', menuDenetle({ ad: 'Test', yol: 'https://x.test' }) === null);
  /* Üst düzeyde ne mega ne adres varsa tıklanamayan ölü bir başlık olur. */
  bekle('adressiz üst düzey reddediliyor', menuDenetle({ ad: 'Ölü başlık' }) !== null);
  bekle('mega ise adres zorunlu değil', menuDenetle({ ad: 'Kategoriler', mega: true }) === null);
  bekle('alt ögede adres zorunlu değil', menuDenetle({ ad: 'Sütun', ustId: 'x' }) === null);

  console.log('\n=== 2. Duz baglantilar ===');
  const y1 = menuKur([
    satir({ ad: 'Keşfet', yol: '/', sira: 0 }),
    satir({ ad: 'Rehber', yol: '/rehber', sira: 1 }),
  ]);
  bekle('iki düz bağlantı', y1.duz.length === 2, `${y1.duz.length}`);
  bekle('mega yok', y1.mega.length === 0);
  bekle('sıra korunuyor', y1.duz[0].ad === 'Keşfet');

  /* Yolu olmayan düz bağlantı tıklanamaz bir menü ögesi olurdu. */
  const y2 = menuKur([satir({ ad: 'Yolsuz' })]);
  bekle('yolsuz düz bağlantı elenmiş', y2.duz.length === 0 && y2.mega.length === 0);

  console.log('\n=== 3. Mega panel ===');
  const ust = satir({ ad: 'Proje kategorileri', yol: '/arama', mega: true, seritBaslik: 'Popüler' });
  const sutun = satir({ ad: 'Popüler kategoriler', ustId: ust.id });
  const y3 = menuKur([
    ust, sutun,
    satir({ ad: 'Balayı', yol: '/a', ikon: 'heart', ustId: sutun.id, sira: 0 }),
    satir({ ad: 'Korunaklı', yol: '/b', ustId: sutun.id, sira: 1, not: '12 villa' }),
  ]);
  bekle('mega öge kuruldu', y3.mega.length === 1, `${y3.mega.length}`);
  bekle('düz listede yok', y3.duz.length === 0);
  bekle('sütun kuruldu', y3.mega[0].sutunlar.length === 1);
  bekle('bağlantılar kuruldu', y3.mega[0].sutunlar[0].baglantilar.length === 2);
  bekle('ikon taşındı', y3.mega[0].sutunlar[0].baglantilar[0].ikon === 'heart');
  /* İkonsuz bağlantı ikonsuz basılamaz; varsayılana düşüyor. */
  bekle('ikonsuz bağlantıya varsayılan ikon',
    y3.mega[0].sutunlar[0].baglantilar[1].ikon === 'pin',
    y3.mega[0].sutunlar[0].baglantilar[1].ikon);
  bekle('not taşındı', y3.mega[0].sutunlar[0].baglantilar[1].not === '12 villa');
  bekle('şerit başlığı taşındı', y3.mega[0].populerBaslik === 'Popüler');
  /* Kısayol şeridi ayrı girilmiyor: sütunların ilk bağlantılarından. */
  bekle('kısayol şeridi türetildi', y3.mega[0].populer.length === 2, `${y3.mega[0].populer.length}`);

  console.log('\n=== 4. Bozuk yapilar ===');
  /* Sütunu olmayan mega öge boş panel açardı. */
  const y4 = menuKur([satir({ ad: 'Boş mega', yol: '/x', mega: true })]);
  bekle('sütunsuz mega düz bağlantıya düşüyor',
    y4.mega.length === 0 && y4.duz.length === 1, `${y4.mega.length}/${y4.duz.length}`);

  const bosUst = satir({ ad: 'Mega', yol: '/y', mega: true });
  const bosSutun = satir({ ad: 'Boş sütun', ustId: bosUst.id });
  const y5 = menuKur([bosUst, bosSutun]);
  bekle('bağlantısız sütun eleniyor', y5.mega.length === 0 && y5.duz.length === 1);

  const y6 = menuKur([]);
  bekle('boş girdi boş yapı', y6.duz.length === 0 && y6.mega.length === 0);

  console.log('\n=== 5. Veritabani okumasi ===');
  const dbUst = await prisma.menuOgesi.create({
    data: { konum: 'BASLIK', ad: `${ONEK} Kategoriler`, yol: '/arama', mega: true, sira: 0 },
    select: { id: true },
  });
  const dbSutun = await prisma.menuOgesi.create({
    data: { konum: 'BASLIK', ad: `${ONEK} Sütun`, ustId: dbUst.id, sira: 0 },
    select: { id: true },
  });
  await prisma.menuOgesi.create({
    data: { konum: 'BASLIK', ad: `${ONEK} Bağlantı`, yol: '/test', ustId: dbSutun.id, sira: 0 },
  });

  const okunan = await menuOku('BASLIK', 'TR');
  const bizimkiler = okunan.filter((o) => o.ad.startsWith(ONEK));
  bekle('üç satır okundu', bizimkiler.length === 3, `${bizimkiler.length}`);
  const kurulan = menuKur(bizimkiler);
  bekle('veritabanından mega kuruldu', kurulan.mega.length === 1);

  /* Pasif öge okumaya HİÇ girmemeli: gizlenen bağlantı menüde
     görünmemeli. */
  await prisma.menuOgesi.updateMany({
    where: { ad: `${ONEK} Bağlantı` }, data: { aktif: false },
  });
  const gizliSonrasi = (await menuOku('BASLIK', 'TR')).filter((o) => o.ad.startsWith(ONEK));
  bekle('pasif öge okunmuyor', gizliSonrasi.length === 2, `${gizliSonrasi.length}`);
  bekle('bağlantısı kalmayan mega düz bağlantıya düşüyor',
    menuKur(gizliSonrasi).mega.length === 0);

  /* Üst silinince altlar da gitmeli: sahipsiz sütun menüde görünmez
     ama tabloda birikirdi. */
  await prisma.menuOgesi.delete({ where: { id: dbUst.id } });
  bekle('üst silinince altlar da silindi',
    (await prisma.menuOgesi.count({ where: { ad: { startsWith: ONEK } } })) === 0);

  console.log('\n=== 6. Temizlik ===');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.menuOgesi.count({ where: { ad: { startsWith: ONEK } } })) === 0);

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
