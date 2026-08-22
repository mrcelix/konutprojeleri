import 'dotenv/config';
import { prisma } from '../lib/db';

/**
 * Karşılaştırma panosu.
 *   node --conditions=react-server --import tsx scripts/test-pano.ts
 *
 * Konut alımı tek kişilik bir karar değil: eş, aile ve çoğu zaman bir
 * de "anlayan tanıdık" aynı üç projeye bakıp tartışıyor. Pano o
 * tartışmayı bir bağlantıda topluyor.
 *
 * Sunucu eylemleri buradan ÇAĞRILMIYOR: `cookies()` istek bağlamı
 * istiyor. Sınamalar veri kurallarını doğruluyor — aynı proje iki kez
 * eklenemiyor, bir kişi bir projeye bir oy verebiliyor, bütçe
 * karşılaştırması doğru, pano silinince oylar ve notlar da gidiyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzz-f109';

async function temizle() {
  await prisma.pano.deleteMany({ where: { kod: { startsWith: ONEK } } });
  await prisma.proje.deleteMany({ where: { slug: { startsWith: ONEK } } });
  await prisma.bolge.deleteMany({ where: { slug: { startsWith: ONEK } } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZF109' } } });
}

async function main() {
  await temizle();

  const bolge = await prisma.bolge.create({
    data: {
      slug: `${ONEK}-koy`, ad: 'ZZ Koy', il: 'ZZ', lat: 40.98, lng: 29.12,
      img: 'photo-0', ozet: 'x'.repeat(60),
      icerik: { fiyatlar: [], ulasim: [], yapilacaklar: [], ipuclari: [] },
      adet: 0, yayinda: true,
    },
    select: { id: true },
  });
  const firma = await prisma.firma.create({
    data: {
      slug: `${ONEK}-firma`, ad: 'ZZF109 Firma',
      ozet: 'Pano testleri için açılan geçici firma kaydı.',
    },
    select: { id: true },
  });

  const projeYap = (n: number, fiyatMin: number, durum: 'SATISTA' | 'TUKENDI') =>
    prisma.proje.create({
      data: {
        slug: `${ONEK}-proje-${n}`, ad: `ZZ Proje ${n}`, bolgeId: bolge.id,
        firmaId: firma.id, mahalle: 'ZZ', lat: 40.98, lng: 29.12,
        tip: 'KONUT', durum, fiyatMin, fiyatMax: fiyatMin * 2,
        pesinatOrani: 25, taksitAyi: 24, ilerlemeYuzde: 40,
        ozet: 'x'.repeat(60),
        yayinTarihi: new Date('2026-01-01T00:00:00Z'), yayinda: true,
      },
      select: { id: true, slug: true, fiyatMin: true, durum: true },
    });

  const v1 = await projeYap(1, 4_000_000, 'SATISTA');
  const v2 = await projeYap(2, 9_000_000, 'SATISTA');
  const v3 = await projeYap(3, 5_000_000, 'TUKENDI');

  const pano = await prisma.pano.create({
    data: {
      kod: `${ONEK}-kod`, ad: 'ZZ Pano', sahipKimlik: 'kimlik-a',
      butceMin: 3_000_000, butceMax: 6_000_000,
      ogeler: {
        create: [
          { projeId: v1.id, sira: 0 },
          { projeId: v2.id, sira: 1 },
          { projeId: v3.id, sira: 2 },
        ],
      },
    },
    select: { id: true, ogeler: { select: { id: true, projeId: true }, orderBy: { sira: 'asc' } } },
  });
  bekle('pano üç projeyle açılıyor', pano.ogeler.length === 3);

  /* ---------- Aynı proje iki kez eklenemiyor ---------- */
  let ikinciEkleme = 'eklendi';
  try {
    await prisma.panoOge.create({ data: { panoId: pano.id, projeId: v1.id } });
  } catch { ikinciEkleme = 'engellendi'; }
  bekle('aynı proje panoya iki kez eklenemiyor', ikinciEkleme === 'engellendi');

  /* ---------- Bir kişi bir oy ---------- */
  const oge1 = pano.ogeler[0].id;
  await prisma.panoOy.create({ data: { ogeId: oge1, kimlik: 'kimlik-a', yon: 1 } });
  await prisma.panoOy.upsert({
    where: { ogeId_kimlik: { ogeId: oge1, kimlik: 'kimlik-a' } },
    create: { ogeId: oge1, kimlik: 'kimlik-a', yon: -1 },
    update: { yon: -1 },
  });
  await prisma.panoOy.create({ data: { ogeId: oge1, kimlik: 'kimlik-b', yon: 1 } });

  const oylar = await prisma.panoOy.findMany({
    where: { ogeId: oge1 }, select: { kimlik: true, yon: true },
  });
  bekle('bir kişi bir projeye tek oy veriyor', oylar.length === 2, `${oylar.length} oy`);
  bekle('oy yönü değiştirilebiliyor',
    oylar.find((o) => o.kimlik === 'kimlik-a')?.yon === -1);

  /* ---------- Bütçe karşılaştırması ----------
     Pano bütçesi tek gerçek karşılaştırma ölçütü: aile "6 milyona
     kadar" diyor ve listedeki hangi projenin o bandın dışında
     kaldığını görmek istiyor. Karşılaştırma BAŞLANGIÇ fiyatına
     bakıyor — en küçük tipi bandın içindeyse proje "uygun". */
  const projeler = await prisma.proje.findMany({
    where: { id: { in: pano.ogeler.map((o) => o.projeId) } },
    select: { id: true, fiyatMin: true, durum: true },
  });
  const uygun = (f: number) => f >= 3_000_000 && f <= 6_000_000;
  bekle('bütçedeki proje uygun sayılıyor',
    uygun(projeler.find((p) => p.id === v1.id)!.fiyatMin));
  bekle('bütçe üstü proje uygun sayılmıyor',
    !uygun(projeler.find((p) => p.id === v2.id)!.fiyatMin));

  /* ---------- Alınamayan proje ----------
     Tükenen proje panodan SİLİNMİYOR: karar sürecinde "bu vardı ama
     tükendi" bilgisinin kendisi bir bilgi. İşaretleniyor, atılmıyor. */
  const alinamaz = projeler.filter(
    (p) => p.durum === 'TUKENDI' || p.durum === 'TESLIM_EDILDI');
  bekle('tükenen proje panoda kalıyor ama işaretleniyor',
    alinamaz.length === 1 && alinamaz[0].id === v3.id);

  /* ---------- Notlar ---------- */
  await prisma.panoYorum.create({
    data: { panoId: pano.id, ogeId: oge1, ad: 'Ayşe', metin: 'Aidat yüksek' },
  });
  await prisma.panoYorum.create({
    data: { panoId: pano.id, ad: 'Mehmet', metin: 'Teslim tarihleri hep 2027 sonrası' },
  });
  const projeNotu = await prisma.panoYorum.count({
    where: { panoId: pano.id, ogeId: { not: null } },
  });
  const genelNot = await prisma.panoYorum.count({ where: { panoId: pano.id, ogeId: null } });
  bekle('proje notu ve pano notu ayrı tutuluyor', projeNotu === 1 && genelNot === 1);

  /* ---------- Silme zinciri ---------- */
  await prisma.pano.delete({ where: { id: pano.id } });
  const [kalanOge, kalanOy, kalanNot] = await Promise.all([
    prisma.panoOge.count({ where: { panoId: pano.id } }),
    prisma.panoOy.count({ where: { ogeId: oge1 } }),
    prisma.panoYorum.count({ where: { panoId: pano.id } }),
  ]);
  bekle('pano silinince öğe, oy ve notlar da siliniyor',
    kalanOge === 0 && kalanOy === 0 && kalanNot === 0,
    `${kalanOge}/${kalanOy}/${kalanNot}`);

  /* Panoyu silmek PROJEYİ silmiyor — tersi de aynı yönde çalışıyor:
     proje silinirse öğe cascade ile gidiyor ama pano duruyor. */
  bekle('pano silinince projeler duruyor',
    (await prisma.proje.count({ where: { slug: { startsWith: ONEK } } })) === 3);

  await temizle();
  console.log(`\n  ${gecen} geçti, ${kalan} kaldı`);
  await prisma.$disconnect();
  if (kalan) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await temizle().catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
