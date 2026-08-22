import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { cpus } from 'node:os';

/**
 * Test koşucusu.
 *
 *   npm test                 → tüm sınamalar (paralel)
 *   npm test -- arac iz      → adı eşleşenler
 *   npm test -- --seri       → hepsi sırayla (hata ayıklarken)
 *   npm run test:hizli       → çekirdek altküme
 *
 * NEDEN PARALEL: her betik kendi Node sürecini açıyor, `tsx`i
 * yüklüyor ve Prisma istemcisini kuruyor — sınamalar başlamadan önce
 * betik başına 4–6 saniye. Kırk betikte bu tek başına üç dakikadan
 * fazla ve zamanın çoğu beklemekle geçiyor, iş yapmakla değil.
 *
 * SERİ KALANLAR: bazı betikler veritabanının TAMAMINI sayıyor
 * ("gerçek veri yerinde", proje/medya sayıları) ya da açık tohum
 * partilerini geri alıyor. Bunlar başkasının kayıt açtığı bir anda
 * çalışırsa kendi hatası olmadan kalıyor. O yüzden önce paralel grup
 * bitiyor, sonra bunlar tek tek çalışıyor.
 */

const SERI = [
  'test-tohum.ts',      // açık DEMO_PROJE partilerini geri alıyor
  'test-silme.ts',      // proje/firma silme akışı, genel sayım
  'test-gorsel.ts',     // tüm medya satırlarını tarıyor
  'test-alt-metin.ts',  // tüm medya alt metinlerini tarıyor
  'test-arama.ts',      // yayındaki proje sayısını karşılaştırıyor
  'test-panel.ts',      // tüm envanterin KPI'larını sayıyor
  'test-kanit.ts',      // yayındaki proje / rapor oranını sayıyor
  /* Bildirim KUYRUĞU tek ve genel: `kuyrukIsle()` sırada ne varsa
     işliyor. Paralel çalışan başka bir betik bir bildirim yazdığında
     "vadesi gelmeyeni almadı" gibi sayıya bakan sınamalar kendi
     hatası olmadan kalıyor. */
  'test-bildirim.ts',
  'test-bildirim-basvuru.ts',
  'test-bildirim-dil.ts',
  'test-i18n.ts',       // soru-yanıt akışı bildirim kuyruğuna yazıyor
];

const args = process.argv.slice(2);
const seriMi = args.includes('--seri');
const suzgec = args.filter((a) => !a.startsWith('--'));

const hepsi = readdirSync(new URL('.', import.meta.url))
  .filter((d) => d.startsWith('test-') && d.endsWith('.ts'))
  .sort();

const secilen = suzgec.length
  ? hepsi.filter((d) => suzgec.some((s) => d.includes(s)))
  : hepsi;

if (secilen.length === 0) {
  console.error(`Eşleşen sınama yok: ${suzgec.join(', ')}`);
  process.exit(1);
}

const paralel = seriMi ? [] : secilen.filter((d) => !SERI.includes(d));
const sirali = seriMi ? secilen : secilen.filter((d) => SERI.includes(d));

/** Aynı anda kaç betik — veritabanı bağlantısı da paylaşılıyor. */
const ESZAMAN = Math.max(2, Math.min(6, cpus().length - 2));

function calistir(dosya) {
  return new Promise((res) => {
    const bas = Date.now();
    const p = spawn(
      process.execPath,
      ['--conditions=react-server', '--import', 'tsx', `scripts/${dosya}`],
      { env: process.env },
    );
    let cikti = '';
    p.stdout.on('data', (d) => { cikti += d; });
    p.stderr.on('data', (d) => { cikti += d; });
    p.on('close', (kod) => {
      res({ dosya, kod: kod ?? 1, saniye: (Date.now() - bas) / 1000, cikti });
    });
  });
}

function ozet(s) {
  const m = s.cikti.match(/(\d+) geçti, (\d+) kaldı/);
  return m ? `${m[1]} geçti${m[2] === '0' ? '' : `, ${m[2]} KALDI`}` : '';
}

function yaz(s) {
  const im = s.kod === 0 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${im} ${s.dosya.padEnd(28)} ${s.saniye.toFixed(1)}s  ${ozet(s)}`);
  if (s.kod !== 0) {
    // Yalnızca başarısızın çıktısı basılıyor: kırk betiğin tam çıktısı
    // hangisinin kaldığını görünmez kılıyordu.
    console.log(s.cikti.split('\n').slice(-40).join('\n'));
  }
}

async function havuz(liste, esZaman) {
  const sonuc = [];
  let i = 0;
  const isci = async () => {
    while (i < liste.length) {
      const d = liste[i++];
      const s = await calistir(d);
      yaz(s);
      sonuc.push(s);
    }
  };
  await Promise.all(Array.from({ length: Math.min(esZaman, liste.length) }, isci));
  return sonuc;
}

const bas = Date.now();
console.log(
  `${secilen.length} sınama betiği — ${paralel.length} paralel (${ESZAMAN} eşzamanlı), `
  + `${sirali.length} sırayla\n`,
);

const sonuclar = [...await havuz(paralel, ESZAMAN), ...await havuz(sirali, 1)];

/* Kalan betikler TEK BAŞINA bir kez daha çalışıyor.
   Paralel koşuda bir sınama, başka bir betiğin o an açtığı kayıt
   yüzünden kendi hatası olmadan kalabiliyor. Yeniden deneme bunu
   GİZLEMİYOR: ikinci denemede geçen betik ayrıca yazılıyor, çünkü
   tekrarlayan bir "ikinci denemede geçti" satırı düzeltilmesi
   gereken bir yalıtım sorununu gösteriyor. */
const ikinciSans = [];
for (const s of sonuclar.filter((x) => x.kod !== 0)) {
  console.log(`↻ ${s.dosya} tek başına yeniden deneniyor…`);
  const y = await calistir(s.dosya);
  yaz(y);
  if (y.kod === 0) ikinciSans.push(s.dosya);
  s.kod = y.kod;
}
if (ikinciSans.length) {
  console.log(`
[33m! İkinci denemede geçti:[0m ${ikinciSans.join(', ')}`
    + ' — paralel koşuda yalıtım sorunu olabilir.');
}

const kalan = sonuclar.filter((s) => s.kod !== 0);
const gecen = (Date.now() - bas) / 1000;

console.log(
  `\n${kalan.length === 0 ? '\x1b[32m✓ TÜM BETİKLER GEÇTİ\x1b[0m' : `\x1b[31m✗ ${kalan.length} BETİK KALDI\x1b[0m`}`
  + ` — ${sonuclar.length} betik, ${gecen.toFixed(0)} saniye`,
);
if (kalan.length) console.log(`Kalanlar: ${kalan.map((s) => s.dosya).join(', ')}`);

process.exit(kalan.length === 0 ? 0 : 1);
