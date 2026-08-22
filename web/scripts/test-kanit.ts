import 'dotenv/config';
import { prisma } from '../lib/db';
import { kanitOku } from '../lib/kanit';
import { KONTROL_MADDELERI } from '../lib/kontrol-kayit';

/**
 * Ana sayfa kanıt şeridi.
 *   node --conditions=react-server --import tsx scripts/test-kanit.ts
 *
 * En kritik kural: ŞERİT ORAN GÖSTERİYOR, "hepsi" demiyor. Raporsuz
 * ya da yayından kaldırılmış proje varsa sayı ona göre düşmeli —
 * abartılmış bir oran, fark edildiğinde sayfadaki bütün rakamları
 * şüpheli hâle getiriyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzz-f116';

async function temizle() {
  await prisma.kontrolRaporu.deleteMany({ where: { proje: { slug: { startsWith: ONEK } } } });
  await prisma.proje.deleteMany({ where: { slug: { startsWith: ONEK } } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZZ F116' } } });
  await prisma.bolge.deleteMany({ where: { slug: { startsWith: ONEK } } });
}

async function main() {
  await temizle();
  const once = await kanitOku();

  const bolge = await prisma.bolge.create({
    data: {
      slug: `${ONEK}-koy`, ad: 'ZZZ F116', il: 'ZZ', lat: 36.2, lng: 29.6,
      img: 'photo-0', ozet: 'x'.repeat(60),
      icerik: { fiyatlar: [], ulasim: [], yapilacaklar: [], ipuclari: [] },
      adet: 0, yayinda: true,
    },
  });
  const firma = await prisma.firma.create({
    data: {
      slug: `${ONEK}-firma`, ad: 'ZZZ F116 Firma',
      ozet: 'Kanıt şeridi testleri için açılan geçici firma kaydı.',
    },
  });
  const projeYap = (n: number, yayinda: boolean) => prisma.proje.create({
    data: {
      slug: `${ONEK}-proje-${n}`, ad: `ZZZ F116 ${n}`, bolgeId: bolge.id,
      firmaId: firma.id, mahalle: 'ZZ', lat: 40.98, lng: 29.12,
      tip: 'KONUT', durum: 'SATISTA', fiyatMin: 4_000_000,
      ozet: 'x'.repeat(60), yayinTarihi: new Date('2026-01-01T00:00:00Z'), yayinda,
    },
    select: { id: true },
  });

  const v1 = await projeYap(1, true);
  const v2 = await projeYap(2, true);
  const v3 = await projeYap(3, false);

  const uc = await kanitOku();
  bekle('yayındaki proje sayılıyor, taslak sayılmıyor',
    uc.proje === once.proje + 2, `${once.proje} → ${uc.proje}`);
  bekle('rapor yokken kontrollü sayısı artmıyor', uc.kontrollu === once.kontrollu);

  const raporYap = (projeId: string, yayinda: boolean, gun: string) =>
    prisma.kontrolRaporu.create({
      data: {
        projeId, ziyaret: new Date(gun), kontrolEden: 'ZZZ F116 Denetim',
        sonuclar: KONTROL_MADDELERI.map((m) => ({ kod: m.kod, durum: 'gecti' })),
        yayinda,
      },
    });

  await raporYap(v1.id, true, '2026-03-10T00:00:00Z');
  const bir = await kanitOku();
  bekle('yayınlanmış rapor sayılıyor', bir.kontrollu === once.kontrollu + 1);

  /* Taslak rapor sayılmamalı: proje sayfasında da görünmüyor. */
  await raporYap(v2.id, false, '2026-04-10T00:00:00Z');
  const iki = await kanitOku();
  bekle('taslak rapor sayılmıyor', iki.kontrollu === once.kontrollu + 1,
    `${iki.kontrollu}`);

  /* Yayından kaldırılmış projenin raporu da sayılmamalı — oran
     yayındaki projeler üzerinden. */
  await raporYap(v3.id, true, '2026-05-10T00:00:00Z');
  const uc2 = await kanitOku();
  bekle('taslak projenin raporu sayılmıyor', uc2.kontrollu === once.kontrollu + 1,
    `${uc2.kontrollu}`);

  bekle('kontrollü sayısı proje sayısını aşmıyor', uc2.kontrollu <= uc2.proje);
  bekle('madde sayısı koddan geliyor', uc2.madde === KONTROL_MADDELERI.length);

  /* Tarihler ISO METİN dönmeli: `unstable_cache` `Date` nesnesini
     serileştirip düz dizeye çeviriyor ve bileşen ikinci isabette
     `toLocaleDateString is not a function` ile patlıyordu. */
  bekle('son kontrol tarihi ISO metin',
    typeof uc2.sonKontrol === 'string' && !Number.isNaN(Date.parse(uc2.sonKontrol)),
    String(uc2.sonKontrol));
  bekle('son çekim tarihi ISO metin',
    uc2.sonCekim === null || typeof uc2.sonCekim === 'string');

  await temizle();
  const sonra = await kanitOku();
  bekle('temizlik sonrası sayılar başlangıca dönüyor',
    sonra.proje === once.proje && sonra.kontrollu === once.kontrollu);

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
