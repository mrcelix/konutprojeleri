import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Çalışan siteden ekran görüntüsü alır.
 *
 *   npm run ekran -- /proje/meridyen-park-atasehir
 *   npm run ekran -- /arama arama.png --tam --genislik=390
 *   npm run ekran -- /yonetim panel.png --oturum=<jeton>
 *
 * NEDEN BETİK: görsel doğrulamayı her seferinde elle yazılan geçici
 * bir CDP betiğiyle yapmak, her kontrolde birkaç dakika alıyordu.
 * Burada tarayıcı açma, görsellerin yüklenmesini bekleme ve kırpma
 * tek yerde.
 *
 * Chrome DevTools Protocol doğrudan kullanılıyor; Puppeteer bağımlılığı
 * eklenmedi — tek ihtiyaç bir ekran görüntüsü ve Node'un yerleşik
 * `WebSocket`i yetiyor.
 */

const CHROME_ADAYLARI = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const args = process.argv.slice(2);
const bayrak = (ad, vars) => {
  const b = args.find((a) => a.startsWith(`--${ad}=`));
  return b ? b.split('=').slice(1).join('=') : vars;
};
const konum = args.filter((a) => !a.startsWith('--'));

/* Git Bash (MSYS) `/arama` gibi bir argümanı Windows yoluna
   çeviriyor: `C:/Program Files/Git/arama`. Hem konum argümanında hem
   `--yol=` bayrağında oluyor; site yolunu kurtarıyoruz. */
function siteYolu(ham) {
  if (!ham || !/^[A-Za-z]:/.test(ham)) return ham;
  const duz = ham.split('\\').join('/');
  const i = duz.indexOf('/Git/');
  return i >= 0 ? duz.slice(i + 4) : '/';
}

const yolBayragi = bayrak('yol', null);
const yol = siteYolu(yolBayragi ?? konum[0]) ?? '/';
// Yol bayrakla verildiyse ilk konum argümanı ÇIKTI dosyasıdır
const ciktiHam = yolBayragi ? konum[0] : konum[1];
const cikti = ciktiHam ?? join(tmpdir(), 'konutprojeleri-ekran.png');
const taban = bayrak('taban', 'http://localhost:3000');
const genislik = Number(bayrak('genislik', 1440));
const yukseklik = Number(bayrak('yukseklik', 900));
const bekleme = Number(bayrak('bekle', 9000));
const oturum = bayrak('oturum', '');
const tamSayfa = args.includes('--tam');
const koyu = args.includes('--koyu');

const chrome = CHROME_ADAYLARI.find((y) => existsSync(y));
if (!chrome) {
  console.error('Chrome bulunamadı. --chrome=<yol> ile verin.');
  process.exit(1);
}

const port = 9500 + Math.floor(process.pid % 400);
const p = spawn(chrome, [
  '--headless=new', `--remote-debugging-port=${port}`,
  `--window-size=${genislik},${yukseklik}`,
  '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  `--user-data-dir=${join(tmpdir(), `konutprojeleri-chrome-${port}`)}`,
  'about:blank',
], { stdio: 'ignore' });

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const al = (u) => new Promise((res, rej) => {
  http.get(u, (r) => { let d = ''; r.on('data', (c) => { d += c; }); r.on('end', () => res(JSON.parse(d))); })
    .on('error', rej);
});

(async () => {
  let hedef = null;
  for (let i = 0; i < 40 && !hedef; i++) {
    await bekle(400);
    try { hedef = (await al(`http://localhost:${port}/json`)).find((t) => t.type === 'page'); } catch { /* açılıyor */ }
  }
  if (!hedef) throw new Error('Chrome başlatılamadı');

  const ws = new WebSocket(hedef.webSocketDebuggerUrl);
  let no = 0;
  const bekleyen = new Map();
  const g = (metot, parametre = {}) => new Promise((r) => {
    const id = ++no;
    bekleyen.set(id, r);
    ws.send(JSON.stringify({ id, method: metot, params: parametre }));
  });
  await new Promise((r) => { ws.onopen = r; });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && bekleyen.has(m.id)) { bekleyen.get(m.id)(m.result); bekleyen.delete(m.id); }
  };

  await g('Page.enable');
  await g('Network.enable');
  /* Görüntü alanı `--window-size` ile DEĞİL burada belirleniyor:
     başsız Chrome pencereyi istenen ölçüye indirmiyor (390 istenip
     512 alınıyor) ve kırpma, sayfanın kesilmiş gibi görünmesine yol
     açıyordu — var olmayan bir taşma teşhisi. `setDeviceMetricsOverride`
     gerçek görüntü alanını ayarlıyor; dar genişlikte mobil kipi de
     açılıyor (dokunma, mobil kullanıcı aracısı). */
  /* `mobile: false`: mobil kip acikken Chrome bazi durumlarda 980 px
     genisliginde bir yerlesim gorunumu varsayiyor ve olcum ile
     goruntu birbirini tutmuyor. Amac gercek genislikte yerlesimi
     gormek; dokunma taklidi gerekmiyor. */
  await g('Emulation.setDeviceMetricsOverride', {
    width: genislik, height: yukseklik, deviceScaleFactor: 1, mobile: false,
  });
  if (koyu) {
    await g('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  }
  if (oturum) {
    const host = new URL(taban).hostname;
    await g('Network.setCookie', {
      name: 'vn_oturum', value: oturum, domain: host, path: '/', httpOnly: true,
    });
  }

  await g('Page.navigate', { url: taban + yol });
  // Görseller `next/image` ile geliyor ve ilk istekte sunucuda
  // yeniden boyutlanıyor; sabit bekleme, ağ boşta kalmasından daha
  // güvenilir çıktı.
  await bekle(bekleme);

  const boy = tamSayfa
    ? (await g('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true })).result.value
    : yukseklik;

  const s = await g('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: tamSayfa,
    clip: { x: 0, y: 0, width: genislik, height: Math.min(boy, 12000), scale: 1 },
  });
  writeFileSync(cikti, Buffer.from(s.data, 'base64'));
  console.log(`${taban}${yol} → ${cikti} (${genislik}×${Math.min(boy, 12000)})`);

  ws.close();
  p.kill();
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  p.kill();
  process.exit(1);
});
