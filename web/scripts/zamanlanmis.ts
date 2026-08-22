import 'dotenv/config';
import { prisma } from '../lib/db';
import { islerCalistir, IS_ADLARI } from '../lib/isler';

/**
 * Zamanlanmış işlerin komut satırı çalıştırıcısı.
 *
 *   npm run isler                → hepsini bir kez çalıştırır
 *   npm run isler -- bildirimler → yalnızca bildirim kuyruğunu işler
 *
 * İş mantığı `lib/isler.ts` içinde; burası yalnızca günlüğe yazan sarmalayıcı.
 * Sunucusuz ortamlarda aynı işler `GET /api/isler` üzerinden tetikleniyor.
 *
 * Kendi sunucunuzda cron ile:
 *   * * * * * cd /uygulama/web && npm run isler >> /var/log/konutprojeleri-isler.log 2>&1
 */

const damga = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const log = (m: string) => console.log(`[${damga()}] ${m}`);

async function main() {
  const secilen = process.argv[2];

  if (secilen && !IS_ADLARI.includes(secilen)) {
    console.error(`Bilinmeyen iş: ${secilen}. Geçerli: ${IS_ADLARI.join(', ')}`);
    process.exit(1);
  }

  const sonuc = await islerCalistir(secilen);

  for (const is of sonuc.isler) {
    for (const n of is.notlar) log(`  ${n}`);
    if (is.hata) log(`✗ ${is.ad} hatası: ${is.hata}`);
  }

  log(`Tamamlandı — ${sonuc.toplam} kayıt işlendi, ${sonuc.sure} ms`);
  await prisma.$disconnect();
  process.exit(sonuc.isler.some((i) => i.hata) ? 1 : 0);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
