import 'dotenv/config';
import { prisma } from '../lib/db';
import {
  botMu, cihazTipi, eskiIzleriSil, olayYaz, oturumOzeti, rotaTipi,
  siniflandir, yoluTemizle, ziyaretYaz, ziyaretciOzeti,
} from '../lib/iz';
import { botTrafigi, gunlukTrafik, kanalDagilimi, olayDagilimi, trafikOzeti } from '../lib/analitik-trafik';

/**
 * Faz 77 trafik ölçümü testleri.
 *   node --conditions=react-server --import tsx scripts/test-iz.ts
 *
 * Asıl sınanan iki şey:
 *   1. KVKK — IP hiçbir yere yazılmıyor, özet geri çevrilemiyor,
 *      tuz dönünce aynı ziyaretçi başka bir özet üretiyor.
 *   2. Bot ayrımı — arama motoru robotları sayılıyor ama insan
 *      trafiğine KARIŞMIYOR.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = '/zzf77';

async function temizle() {
  await prisma.ziyaret.deleteMany({ where: { yol: { startsWith: ONEK } } });
  await prisma.olay.deleteMany({ where: { yol: { startsWith: ONEK } } });
}

async function main() {
  await temizle();

  console.log('\n=== 1. Bot tanıma ===');
  bekle('googlebot yakalanıyor', botMu('Mozilla/5.0 (compatible; Googlebot/2.1)') === 'googlebot');
  bekle('bingbot yakalanıyor', botMu('Mozilla/5.0 (compatible; bingbot/2.0)') === 'bingbot');
  bekle('yandex yakalanıyor', botMu('Mozilla/5.0 (compatible; YandexBot/3.0)') === 'yandexbot');
  bekle('yapay zekâ tarayıcısı ayrı', botMu('Mozilla/5.0 (compatible; GPTBot/1.0)') === 'yapay-zeka');
  /* Gerçek tarayıcı bot sayılırsa insan trafiği sıfırlanır — en
     pahalı yanlış bu yönde. */
  bekle('gerçek Chrome bot değil',
    botMu('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36') === null);
  bekle('gerçek Safari bot değil',
    botMu('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1') === null);

  console.log('\n=== 2. Kanal sınıflandırma ===');
  bekle('yönlendiren yoksa doğrudan', siniflandir(null, null, null).kanal === 'doğrudan');
  const g = siniflandir('https://www.google.com/search?q=konut+projesi', null, null);
  bekle('google organik', g.kanal === 'organik' && g.motor === 'google', `${g.kanal}/${g.motor}`);
  bekle('google.com.tr de organik', siniflandir('https://www.google.com.tr/', null, null).motor === 'google');
  bekle('instagram sosyal', siniflandir('https://www.instagram.com/x', null, null).kanal === 'sosyal');
  bekle('bilinmeyen site referans', siniflandir('https://ornek.test/a', null, null).kanal === 'referans');
  /* UTM yönlendireni EZMELİ: reklam tıklaması Google'dan gelir ve
     yönlendirene bakılırsa organik sayılır — bütçe kararını yanlış
     besler. */
  const reklam = siniflandir('https://www.google.com/', 'google', 'cpc');
  bekle('utm reklamı organikten ayırıyor', reklam.kanal === 'reklam', reklam.kanal);

  console.log('\n=== 3. Yol ve cihaz ===');
  bekle('sorgu dizesi atılıyor', yoluTemizle('/arama?q=ali@ornek.test') === '/arama');
  bekle('çapa atılıyor', yoluTemizle('/proje/x#daire-tipleri') === '/proje/x');
  bekle('proje rotası tanınıyor', rotaTipi('/proje/meridyen-park-atasehir') === 'proje');
  bekle('firma rotası tanınıyor', rotaTipi('/firma/meridyen-yapi') === 'firma');
  bekle('bölge rotası tanınıyor', rotaTipi('/projeler/atasehir') === 'bölge');
  /* Bölge ile iniş sayfası AYRI: uzun kuyruk sayfalarının getirisi
     bölge sayfasının içinde kaybolmamalı. */
  bekle('iniş sayfası tanınıyor',
    rotaTipi('/projeler/atasehir/guvenlikli-siteler') === 'iniş sayfası');
  bekle('İngilizce proje rotası tanınıyor',
    rotaTipi('/en/project/meridyen-park-atasehir') === 'proje');
  bekle('mobil cihaz', cihazTipi('iPhone Mobile Safari') === 'mobil');
  bekle('masaüstü cihaz', cihazTipi('Windows NT 10.0 Chrome') === 'masaüstü');

  console.log('\n=== 4. KVKK: ziyaretçi özeti ===');
  const ua = 'Mozilla/5.0 Chrome/120';
  const o1 = ziyaretciOzeti('203.0.113.7', ua);
  const o2 = ziyaretciOzeti('203.0.113.7', ua);
  const o3 = ziyaretciOzeti('203.0.113.8', ua);
  bekle('aynı ziyaretçi aynı özet', o1 === o2);
  bekle('farklı IP farklı özet', o1 !== o3);
  /* Özet IP'yi İÇERMEMELİ: içerseydi tabloda düz metin IP tutmakla
     aynı kapıya çıkardı. */
  bekle('özet IP içermiyor', !o1.includes('203.0.113'));
  bekle('özet kısa ve sabit uzunlukta', o1.length === 24);
  bekle('oturum özeti ziyaretçiden türüyor', oturumOzeti(o1) === oturumOzeti(o1));
  bekle('farklı ziyaretçi farklı oturum', oturumOzeti(o1) !== oturumOzeti(o3));

  console.log('\n=== 5. Yazma ve raporlama ===');
  const yaz = (yol: string, ua2: string, ref: string | null) => ziyaretYaz({
    yol, referrer: ref, utmKaynak: null, utmOrtam: null, utmKampanya: null,
    ua: ua2, ip: `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
    dil: 'tr-TR', ulke: 'TR',
  });

  for (let i = 0; i < 5; i++) await yaz(`${ONEK}/proje/a`, ua, 'https://www.google.com/');
  for (let i = 0; i < 3; i++) await yaz(`${ONEK}/arama`, ua, null);
  await yaz(`${ONEK}/proje/a`, 'Mozilla/5.0 (compatible; Googlebot/2.1)', null);
  await yaz(`${ONEK}/proje/b`, 'Mozilla/5.0 (compatible; Googlebot/2.1)', null);

  const insanSayi = await prisma.ziyaret.count({ where: { yol: { startsWith: ONEK }, bot: false } });
  const botSayi = await prisma.ziyaret.count({ where: { yol: { startsWith: ONEK }, bot: true } });
  bekle('insan ziyaretleri yazıldı', insanSayi === 8, `${insanSayi}`);
  bekle('bot ziyaretleri ayrı işaretlendi', botSayi === 2, `${botSayi}`);

  const botKayit = await prisma.ziyaret.findFirst({ where: { yol: { startsWith: ONEK }, bot: true } });
  bekle('bot kanalı ayrı', botKayit?.kanal === 'bot', botKayit?.kanal ?? '');
  bekle('bot adı kaydedildi', botKayit?.botAdi === 'googlebot');

  const organik = await prisma.ziyaret.count({
    where: { yol: { startsWith: ONEK }, kanal: 'organik', motor: 'google' },
  });
  bekle('organik ziyaretler motorla kaydedildi', organik === 5, `${organik}`);

  /* Tabloda IP'ye benzer bir alan olmamalı — şema değişince bu test
     düşsün diye açıkça sütun adlarına bakılıyor. */
  const sutunlar = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'ziyaret'`,
  );
  const adlar = sutunlar.map((s) => s.column_name);
  /* TAM ad eşleşmesi: `/ip/` gibi geniş bir kalıp "tip" sütununa da
     takılıyor ve test kendi kendini yanlış yere düşürüyordu. */
  bekle('şemada ip sütunu yok',
    !adlar.some((a) => /^(ip|ip_adres|ipadres|adres|ua|user_agent)$/i.test(a)),
    adlar.join(','));

  console.log('\n=== 6. Olaylar ===');
  const ipO = '198.51.100.250';
  await olayYaz({ tur: 'proje-ac', hedef: 'zzf77-proje', yol: `${ONEK}/arama`, deger: 12000, ua, ip: ipO });
  await olayYaz({ tur: 'filtre', hedef: 'guvenlik', yol: `${ONEK}/arama`, ua, ip: ipO });
  /* Bilinmeyen tür SESSİZCE atılıyor: uç herkese açık ve serbest
     metin kabul etmek tabloyu çöple doldurmanın yolu. */
  await olayYaz({ tur: 'bilinmeyen-tur', hedef: 'x', yol: `${ONEK}/arama`, ua, ip: ipO });
  const olaySayi = await prisma.olay.count({ where: { yol: { startsWith: ONEK } } });
  bekle('geçerli olaylar yazıldı', olaySayi === 2, `${olaySayi}`);
  bekle('bilinmeyen tür reddedildi',
    (await prisma.olay.count({ where: { tur: 'bilinmeyen-tur' } })) === 0);

  console.log('\n=== 7. Rapor sorguları ===');
  const ozet = await trafikOzeti(1);
  bekle('özet ziyaret sayıyor', ozet.ziyaret >= 8, `${ozet.ziyaret}`);
  bekle('özet botu insana KARIŞTIRMIYOR', ozet.botZiyaret >= 2 && ozet.ziyaret >= 8);
  bekle('hemen çıkma oranı 0–100 arası', ozet.hemenCikma >= 0 && ozet.hemenCikma <= 100);

  const seri = await gunlukTrafik(7);
  bekle('günlük seri boş günleri dolduruyor', seri.length === 7, `${seri.length}`);
  bekle('seri bugünle bitiyor',
    seri[seri.length - 1].gun === new Date().toISOString().slice(0, 10));

  const kanal = await kanalDagilimi(1);
  bekle('kanal dağılımında organik var', kanal.some((k) => k.ad === 'organik'));
  bekle('kanal dağılımında bot YOK',
    !kanal.some((k) => k.ad === 'bot'), kanal.map((k) => k.ad).join(','));

  const botlar = await botTrafigi(1);
  bekle('bot raporunda googlebot var', botlar.some((b) => b.botAdi === 'googlebot'));
  const olaylar = await olayDagilimi(1);
  bekle('olay dağılımı türleri ayırıyor', olaylar.some((o) => o.tur === 'proje-ac'));

  console.log('\n=== 8. Saklama süresi ===');
  const eski = new Date(Date.now() - 500 * 864e5);
  await prisma.ziyaret.create({
    data: {
      yol: `${ONEK}/eski`, tip: 'proje', kanal: 'doğrudan', cihaz: 'masaüstü',
      ziyaretci: 'zzf77eski', oturum: 'zzf77eski', olusturma: eski,
    },
  });
  const silme = await eskiIzleriSil(400);
  bekle('400 günden eski kayıt siliniyor', silme.ziyaret >= 1, `${silme.ziyaret} satır`);
  bekle('yeni kayıtlar duruyor',
    (await prisma.ziyaret.count({ where: { yol: { startsWith: ONEK }, bot: false } })) === 8);

  console.log('\n=== 9. Temizlik ===');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.ziyaret.count({ where: { yol: { startsWith: ONEK } } })) === 0);

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
