import 'dotenv/config';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { prisma } from '../lib/db';

/**
 * Mantıksal (JSON) yedek — `pg_dump` yoksa.
 *
 * `pg_dump` her zaman daha iyi: şemayı, indeksleri, kısıtları ve
 * fonksiyonları da alıyor. Ancak PostgreSQL istemci araçları her
 * makinede kurulu olmuyor (gömülü paket yalnızca sunucu ikililerini
 * içeriyor) ve yedek alınamayan bir sistem, yedeği olmayan sistemdir.
 *
 * Bu yedek YALNIZCA VERİYİ taşıyor. Geri yüklemek için şemanın
 * `prisma migrate deploy` ile kurulmuş olması gerekiyor.
 *
 * SIRA ÖNEMLİ: yabancı anahtarlar yüzünden tablolar bağımlılık
 * sırasıyla yazılıyor ve aynı sırayla geri yükleniyor.
 */

const DIZIN = process.env.YEDEK_DIZIN ?? path.join(process.cwd(), '.yedek');

/**
 * Bağımlılık sırası — ebeveyn önce.
 *
 * DIŞARIDA BIRAKILANLAR:
 * · `projeArama` — türetilmiş tablo, tetikleyicilerle yeniden kuruluyor.
 *   Ayrıca `tsvector` alanı Prisma'nın `createMany`'siyle yazılamıyor.
 * · `hizSinir` — geçici sayaç; geri yüklemenin anlamı yok, üstelik
 *   eski bir engeli geri getirmek meşru kullanıcıyı kilitleyebilir.
 */
const TABLOLAR = [
  'bolge', 'ozellik', 'firma', 'proje', 'bolgeSss', 'daireTipi',
  'projeOzellik', 'medya', 'talep', 'kullanici', 'oturum',
  'rezervasyon', 'odeme', 'musaitlik', 'takvimBaglantisi',
  'evSahibiOdemesi', 'yorum', 'konusma', 'mesaj', 'bildirim',
  'gonderimEngeli', 'denetimKaydi', 'olcumCWV',
  // İçerik: kullanıcı tarafından yazılmış, yeniden üretilemez
  'sayfa', 'metin',
  // Eski adresler: yeniden üretilemez, kaybolursa bağlantılar kırılır
  'projeSlug',
  // KVKK başvuru kaydı: yanıt süresinin kanıtı
  'veriTalebi',
  // Ev sahibi başvuruları: kazanım hunisinin kaydı, yeniden üretilemez
  'evSahibiBasvuru',
] as const;

type Tablo = typeof TABLOLAR[number];

const damga = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/* BigInt ve Decimal JSON.stringify tarafından desteklenmiyor. */
const donustur = (_k: string, v: unknown) => {
  if (typeof v === 'bigint') return { __tip: 'bigint', d: v.toString() };
  if (v && typeof v === 'object' && 'toFixed' in v && 'd' in v) {
    return { __tip: 'decimal', d: String(v) };
  }
  return v;
};

async function al() {
  mkdirSync(DIZIN, { recursive: true });
  const dosya = path.join(DIZIN, `konutprojeleri-${damga()}.json`);

  const veri: Record<string, unknown[]> = {};
  let toplam = 0;

  for (const t of TABLOLAR) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (prisma as any)[t];
    if (!model?.findMany) { console.warn(`  ! model yok: ${t}`); continue; }
    const satirlar = await model.findMany();
    veri[t] = satirlar;
    toplam += satirlar.length;
    console.log(`  ${t.padEnd(20)} ${String(satirlar.length).padStart(6)} satır`);
  }

  const govde = JSON.stringify(
    { surum: 1, alindi: new Date().toISOString(), sira: TABLOLAR, veri },
    donustur, 0,
  );
  writeFileSync(dosya, govde, 'utf8');

  const mb = (Buffer.byteLength(govde) / 1024 / 1024).toFixed(2);
  console.log(`\n✓ ${toplam} satır, ${mb} MB → ${dosya}`);
  console.log('  Not: bu yedek yalnızca VERİYİ içeriyor. Geri yüklemeden önce');
  console.log('  şema `npm run db:migrate` ile kurulmuş olmalı.');
}

async function geri(dosyaAdi: string) {
  const tam = path.isAbsolute(dosyaAdi) ? dosyaAdi : path.join(DIZIN, dosyaAdi);

  if (process.env.YEDEK_ONAY !== 'EVET') {
    console.log('\nDİKKAT: geri yükleme mevcut veriyi SİLİP üzerine yazar.\n');
    console.log(`  YEDEK_ONAY=EVET npm run yedek:json -- geri ${dosyaAdi}\n`);
    process.exit(1);
  }

  const ham = JSON.parse(readFileSync(tam, 'utf8'), (_k, v) => {
    if (v && typeof v === 'object' && '__tip' in v) {
      return v.__tip === 'bigint' ? BigInt(v.d) : v.d;
    }
    return v;
  }) as { sira: string[]; veri: Record<string, unknown[]> };

  // Eski yedekler artık dışarıda bıraktığımız tabloları içerebiliyor
  // (örn. türetilmiş `projeArama`). Bilinmeyen tabloyu atlıyoruz —
  // yedek biçimi ilerledikçe eski dosyalar okunamaz hâle gelmemeli.
  const gecerli = new Set<string>(TABLOLAR);
  const atlanan = ham.sira.filter((t) => !gecerli.has(t));
  if (atlanan.length) {
    console.log(`  (atlanan tablo: ${atlanan.join(', ')} — türetilmiş veya geçici)`);
  }
  ham.sira = ham.sira.filter((t) => gecerli.has(t));

  // TEK İŞLEM İÇİNDE: yarıda kalan bir geri yükleme, veriyi silmiş ama
  // yerine koymamış bir veritabanı bırakıyor. İlk denemede tam olarak bu
  // oldu — bir tablo `createMany` desteklemiyordu ve silinen veri geri
  // gelmedi. İşlem sarmalayıcısı bunu imkânsız kılıyor.
  let toplam = 0;
  await prisma.$transaction(async (tx) => {
    // Silme TERS sırada — yabancı anahtar kısıtları yüzünden
    for (const t of [...ham.sira].reverse()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (tx as any)[t];
      if (model?.deleteMany) await model.deleteMany({});
    }

    for (const t of ham.sira) {
      const satirlar = ham.veri[t] ?? [];
      if (!satirlar.length) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (tx as any)[t];
      if (!model?.createMany) {
        // Sessizce atlamak yerine işlemi düşürüyoruz: eksik geri yükleme
        // en kötü sonuç, çünkü fark edilmiyor.
        throw new Error(`${t} için createMany yok — yedek biçimi uyumsuz`);
      }
      await model.createMany({ data: satirlar, skipDuplicates: true });
      toplam += satirlar.length;
      console.log(`  ${t.padEnd(20)} ${String(satirlar.length).padStart(6)} satır`);
    }
  }, { timeout: 120_000 });

  // Arama indeksi türetilmiş: yedekte yok, tetikleyici fonksiyonla kuruluyor
  const yenilenen = await prisma.$queryRaw<{ n: bigint }[]>`
    WITH y AS (SELECT proje_arama_yenile(id) FROM proje)
    SELECT count(*)::bigint AS n FROM y`;
  console.log(`  ${'projeArama'.padEnd(20)} ${String(Number(yenilenen[0].n)).padStart(6)} satır (yeniden kuruldu)`);

  console.log(`\n✓ ${toplam} satır geri yüklendi`);
}

async function main() {
  const komut = process.argv[2];
  if (komut === 'geri') await geri(process.argv[3] ?? '');
  else await al();
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
