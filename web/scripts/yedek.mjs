import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

/**
 * Veritabanı yedekleme ve geri yükleme.
 *
 *   npm run yedek           → yedek al
 *   npm run yedek -- liste  → mevcut yedekleri listele
 *   npm run yedek -- geri <dosya>  → geri yükle (ONAY İSTER)
 *
 * NEDEN GEREKLİ: ödeme kayıtları, rezervasyonlar ve hak edişler
 * yeniden üretilemez. Yönetilen PostgreSQL servisleri otomatik yedek
 * alıyor ama:
 *   · Yedeklerin GERİ YÜKLENEBİLDİĞİ hiç denenmemişse yedek yok demektir.
 *   · Sağlayıcı hesabı kapanırsa oradaki yedekler de gider.
 *   · Yanlışlıkla silinen bir kaydı tek tablo olarak geri almak,
 *     tüm veritabanını geri yüklemekten çok daha kolay.
 *
 * Bu script sağlayıcıdan bağımsız, dışarı alınabilir bir kopya üretiyor.
 */

const YEDEK_DIZIN = process.env.YEDEK_DIZIN ?? path.join(process.cwd(), '.yedek');
const SAKLAMA_GUN = Number(process.env.YEDEK_SAKLAMA_GUN ?? 30);

function pgAraci(ad) {
  // Gömülü PostgreSQL'in araçları; sistemde kurulu olan da kullanılabilir
  const gomulu = path.join(
    process.cwd(), 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin', `${ad}.exe`,
  );
  return existsSync(gomulu) ? gomulu : ad;
}

function damga() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function baglanti() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL tanımlı değil.');
    process.exit(1);
  }
  // Havuzlayıcı üzerinden dump alınmaz — DIRECT_URL varsa o tercih edilir
  if (/pgbouncer=true|:6543/.test(url) && !process.env.DIRECT_URL) {
    console.warn('! Havuzlayıcı adresi kullanılıyor. DIRECT_URL tanımlamanız önerilir.');
  }
  return url;
}

function al() {
  mkdirSync(YEDEK_DIZIN, { recursive: true });
  const dosya = path.join(YEDEK_DIZIN, `konutprojeleri-${damga()}.dump`);

  console.log(`Yedek alınıyor → ${dosya}`);
  const s = spawnSync(pgAraci('pg_dump'), [
    baglanti(),
    // Özel biçim: sıkıştırılmış ve seçmeli geri yüklemeye izin veriyor
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    `--file=${dosya}`,
  ], { stdio: 'inherit' });

  if (s.status !== 0) {
    console.error('\npg_dump başarısız. PostgreSQL araçları kurulu mu?');
    process.exit(1);
  }

  const boyut = (statSync(dosya).size / 1024 / 1024).toFixed(2);
  console.log(`✓ Yedek alındı: ${boyut} MB`);

  temizle();
}

function temizle() {
  if (!existsSync(YEDEK_DIZIN)) return;
  const sinir = Date.now() - SAKLAMA_GUN * 864e5;
  let silinen = 0;
  for (const f of readdirSync(YEDEK_DIZIN)) {
    if (!f.endsWith('.dump')) continue;
    const tam = path.join(YEDEK_DIZIN, f);
    if (statSync(tam).mtimeMs < sinir) { unlinkSync(tam); silinen++; }
  }
  if (silinen) console.log(`${silinen} eski yedek silindi (${SAKLAMA_GUN} günden eski)`);
}

function liste() {
  if (!existsSync(YEDEK_DIZIN)) {
    console.log('Henüz yedek yok.');
    return;
  }
  const dosyalar = readdirSync(YEDEK_DIZIN)
    .filter((f) => f.endsWith('.dump'))
    .map((f) => {
      const st = statSync(path.join(YEDEK_DIZIN, f));
      return { f, mb: (st.size / 1024 / 1024).toFixed(2), tarih: st.mtime };
    })
    .sort((a, b) => +b.tarih - +a.tarih);

  if (!dosyalar.length) { console.log('Henüz yedek yok.'); return; }

  console.log(`\n${dosyalar.length} yedek (${YEDEK_DIZIN}):\n`);
  for (const d of dosyalar) {
    console.log(`  ${d.f.padEnd(36)} ${d.mb.padStart(7)} MB   ${d.tarih.toLocaleString('tr-TR')}`);
  }
  console.log('\nGeri yüklemek için: npm run yedek -- geri <dosya>\n');
}

function geri(dosyaAdi) {
  if (!dosyaAdi) {
    console.error('Dosya adı gerekli: npm run yedek -- geri konutprojeleri-....dump');
    process.exit(1);
  }
  const tam = path.isAbsolute(dosyaAdi) ? dosyaAdi : path.join(YEDEK_DIZIN, dosyaAdi);
  if (!existsSync(tam)) {
    console.error(`Dosya bulunamadı: ${tam}`);
    process.exit(1);
  }

  // Geri yükleme YIKICI. Onay olmadan asla çalıştırılmamalı.
  if (process.env.YEDEK_ONAY !== 'EVET') {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  DİKKAT: geri yükleme mevcut veriyi SİLİP ÜZERİNE YAZAR  ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    console.log(`Hedef veritabanı: ${baglanti().replace(/:[^:@]+@/, ':***@')}`);
    console.log(`Kaynak dosya    : ${tam}\n`);
    console.log('Devam etmek için ortam değişkeniyle çalıştırın:\n');
    console.log(`  YEDEK_ONAY=EVET npm run yedek -- geri ${dosyaAdi}\n`);
    process.exit(1);
  }

  console.log(`Geri yükleniyor: ${tam}`);
  const s = spawnSync(pgAraci('pg_restore'), [
    `--dbname=${baglanti()}`,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    tam,
  ], { stdio: 'inherit' });

  // pg_restore uyarılarda 1 dönebiliyor; yine de sonucu bildiriyoruz
  console.log(s.status === 0
    ? '✓ Geri yükleme tamamlandı'
    : `! pg_restore ${s.status} koduyla bitti — çıktıyı kontrol edin`);
}

const komut = process.argv[2];
if (komut === 'liste') liste();
else if (komut === 'geri') geri(process.argv[3]);
else al();
