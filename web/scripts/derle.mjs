import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Doğrulama derlemesi — çalışan dev sunucusunu BOZMADAN.
 *
 *   npm run derle
 *
 * `next build` varsayılan olarak `.next` klasörüne yazıyor; `next dev`
 * de aynı klasörü kullanıyor. Derleme, dev sunucusunun bellekte
 * tuttuğu parça dosyalarını silip yerine üretim çıktısını koyunca dev
 * sunucusu o andan sonra her isteğe
 *   Error: Cannot find module './5873.js'
 * diyerek 500 dönüyor ve yalnızca yeniden başlatınca toparlıyor. Bu
 * tek başına bir geliştirme oturumunda dört kez yaşandı; her seferinde
 * yeniden başlatma + yeniden derleme birkaç dakika.
 *
 * Burada çıktı `.next-kontrol` klasörüne gidiyor (gitignore'da).
 * Dağıtımda kullanılan `npm run build` dokunulmadan duruyor: Vercel
 * standart `.next` bekliyor.
 */

const KLASOR = process.env.NEXT_DIST_DIR || '.next-kontrol';

console.log(`Doğrulama derlemesi → ${KLASOR} (dev sunucusu etkilenmiyor)\n`);

/* `next` ikilisi doğrudan çağrılıyor: Windows'ta `npx.cmd`
   `spawn` ile EINVAL veriyor (kabuk dosyası, çalıştırılabilir
   değil) ve `shell: true` argümanları kabuğa bırakıyor. */
const next = new URL('../node_modules/next/dist/bin/next', import.meta.url);

const p = spawn(process.execPath, [fileURLToPath(next), 'build'], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_DIST_DIR: KLASOR },
});

p.on('exit', (kod) => process.exit(kod ?? 1));
