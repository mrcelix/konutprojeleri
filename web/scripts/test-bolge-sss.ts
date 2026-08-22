import 'dotenv/config';
import { prisma } from '../lib/db';
import { sssCozumle } from '../lib/icerik-bicim';

/**
 * Bölge sık sorulanları — panelden düzenleme (Faz 106).
 *   node --conditions=react-server --import tsx scripts/test-bolge-sss.ts
 *
 * SSS satırları bölge iniş sayfasında zaten basılıyordu (FAQ şeması
 * dâhil) ama panelde düzenlenemiyordu. Buradaki sınamalar biçim
 * çözümlemesini ve sil-yaz kaydının SIRAYI koruduğunu doğruluyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzz-f106';

async function temizle() {
  await prisma.bolge.deleteMany({ where: { slug: { startsWith: ONEK } } });
}

async function main() {
  await temizle();

  /* ---------- Biçim çözümlemesi ---------- */
  const ham = [
    'Kaş’a nasıl gidilir? | Antalya havalimanından 3 saat, Dalaman’dan 2 saat.',
    '  Deniz sezonu ne zaman?  |  Mayıs sonundan ekim ortasına kadar.  ',
    'Boru işareti olmayan satır atlanmalı',
    '   |   ',
    'Cevapta | boru | olursa? | İlk borudan sonrası cevap sayılıyor.',
  ].join('\n');

  const cozum = sssCozumle(ham);
  bekle('boru işareti olmayan satır atlanıyor', cozum.length === 3, `${cozum.length} satır`);
  bekle('baştaki/sondaki boşluk kırpılıyor', cozum[1]?.s === 'Deniz sezonu ne zaman?');
  bekle('boş soru/cevap kaydedilmiyor', !cozum.some((x) => !x.s || !x.c));
  bekle(
    'cevaptaki boru korunuyor',
    cozum[2]?.c === 'boru | olursa? | İlk borudan sonrası cevap sayılıyor.',
    cozum[2]?.c ?? '-',
  );

  /* ---------- Veritabanı turu ---------- */
  const bolge = await prisma.bolge.create({
    data: {
      slug: `${ONEK}-kiyi`, ad: 'ZZ Kıyı', il: 'ZZ', ozet: 'x'.repeat(60),
      lat: 36.2, lng: 29.6, img: 'photo-0000000000000',
      // `icerik` zorunlu JSON sütunu: iniş sayfasının bölümleri
      icerik: { fiyatlar: [], ulasim: [], yapilacaklar: [], ipuclari: [] },
      adet: 0, yayinda: false,
    },
    select: { id: true },
  });

  const yaz = async (satirlar: { s: string; c: string }[]) => {
    await prisma.$transaction(async (tx) => {
      await tx.bolgeSss.deleteMany({ where: { bolgeId: bolge.id } });
      if (satirlar.length) {
        await tx.bolgeSss.createMany({
          data: satirlar.map((x, i) => ({ bolgeId: bolge.id, soru: x.s, cevap: x.c, sira: i })),
        });
      }
    });
    return prisma.bolgeSss.findMany({
      where: { bolgeId: bolge.id }, orderBy: { sira: 'asc' },
      select: { soru: true, cevap: true, sira: true },
    });
  };

  const ilk = await yaz(cozum);
  bekle('satırlar sırasıyla yazılıyor', ilk.map((x) => x.sira).join(',') === '0,1,2');
  bekle('ilk soru korunuyor', ilk[0]?.soru === 'Kaş’a nasıl gidilir?');

  /* Sıra değişince kayıt da değişmeli: sil-yaz stratejisinin asıl
     nedeni bu — satır bazlı eşlemede sıra kayıyordu. */
  const tersi = await yaz([...cozum].reverse());
  bekle('yeni sıra kaydediliyor', tersi[0]?.soru === cozum[2]?.s, tersi[0]?.soru ?? '-');
  bekle('satır sayısı aynı kalıyor', tersi.length === 3);

  const bos = await yaz([]);
  bekle('boş bırakılınca tüm satırlar siliniyor', bos.length === 0);

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
