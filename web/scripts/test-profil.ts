import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../lib/db';
import { parolaDogrula, parolaHashle } from '../lib/auth';

/**
 * Faz 86 profil (kendi hesabı) testleri.
 *   node --conditions=react-server --import tsx scripts/test-profil.ts
 *
 * Sunucu eylemleri `girisZorunlu()` çağırdığı için doğrudan
 * çağrılamıyor (istek bağlamı yok). Burada aynı KURALLAR ve veri
 * etkileri sınanıyor: parola politikası, mevcut parolanın
 * doğrulanması ve parola değişince DİĞER oturumların düşmesi.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const EPOSTA = 'zzf86@ornek.test';
const ozetle = (t: string) => createHash('sha256').update(t).digest('hex');

async function temizle() {
  await prisma.oturum.deleteMany({ where: { kullanici: { eposta: EPOSTA } } });
  await prisma.kullanici.deleteMany({ where: { eposta: EPOSTA } });
}

/** Panel eylemindeki doğrulamanın aynısı — kural tek yerde kalmalı. */
function parolaDenetle(mevcut: string, yeni: string, tekrar: string): string | null {
  if (yeni.length < 10) return 'kisa';
  if (yeni !== tekrar) return 'tekrar';
  if (yeni === mevcut) return 'ayni';
  return null;
}

function adDenetle(ad: string): string | null {
  if (ad.trim().length < 3) return 'kisa';
  if (ad.length > 60) return 'uzun';
  return null;
}

async function main() {
  await temizle();

  console.log('\n=== 1. Ad doğrulaması ===');
  bekle('geçerli ad kabul', adDenetle('Ayşe Yılmaz') === null);
  bekle('iki karakterlik ad reddediliyor', adDenetle('Ay') === 'kisa');
  bekle('boşluktan ibaret ad reddediliyor', adDenetle('   ') === 'kisa');
  bekle('60 karakterden uzun ad reddediliyor', adDenetle('a'.repeat(61)) === 'uzun');

  console.log('\n=== 2. Parola politikası ===');
  bekle('10 karakterden kısa parola reddediliyor', parolaDenetle('eski12345678', 'kisa', 'kisa') === 'kisa');
  bekle('tekrar tutmuyorsa reddediliyor',
    parolaDenetle('eski12345678', 'yeniparola1', 'yeniparola2') === 'tekrar');
  bekle('eskisiyle aynı parola reddediliyor',
    parolaDenetle('ayniparola12', 'ayniparola12', 'ayniparola12') === 'ayni');
  bekle('geçerli parola kabul', parolaDenetle('eski12345678', 'yeniparola123', 'yeniparola123') === null);

  console.log('\n=== 3. Mevcut parola doğrulaması ===');
  const ESKI = 'eskiparola123';
  const k = await prisma.kullanici.create({
    data: { ad: 'ZZF86 Kullanıcı', eposta: EPOSTA, rol: 'FIRMA', parolaHash: await parolaHashle(ESKI) },
    select: { id: true, parolaHash: true },
  });
  bekle('doğru mevcut parola tanınıyor', await parolaDogrula(ESKI, k.parolaHash!));
  bekle('yanlış mevcut parola reddediliyor', !(await parolaDogrula('bambaskabir', k.parolaHash!)));

  console.log('\n=== 4. Ad güncelleme ===');
  await prisma.kullanici.update({ where: { id: k.id }, data: { ad: 'ZZF86 Yeni Ad' } });
  const guncel = await prisma.kullanici.findUnique({ where: { id: k.id }, select: { ad: true, eposta: true } });
  bekle('ad değişti', guncel?.ad === 'ZZF86 Yeni Ad');
  bekle('e-posta değişmedi', guncel?.eposta === EPOSTA, 'giriş kimliği korunuyor');

  console.log('\n=== 5. Parola değişince diğer oturumlar düşüyor ===');
  const buToken = randomBytes(16).toString('hex');
  const digerToken = randomBytes(16).toString('hex');
  const yarin = new Date(Date.now() + 864e5);
  await prisma.oturum.createMany({
    data: [
      { tokenHash: ozetle(buToken), kullaniciId: k.id, sonKullanma: yarin },
      { tokenHash: ozetle(digerToken), kullaniciId: k.id, sonKullanma: yarin },
      { tokenHash: ozetle(randomBytes(16).toString('hex')), kullaniciId: k.id, sonKullanma: yarin },
    ],
  });
  bekle('üç oturum açık', (await prisma.oturum.count({ where: { kullaniciId: k.id } })) === 3);

  const YENI = 'yeniparola456';
  await prisma.kullanici.update({ where: { id: k.id }, data: { parolaHash: await parolaHashle(YENI) } });
  // `digerOturumlariDusur` ile aynı sorgu: bu oturum HARİÇ hepsi
  await prisma.oturum.deleteMany({
    where: { kullaniciId: k.id, NOT: { tokenHash: ozetle(buToken) } },
  });

  const kalanlar = await prisma.oturum.findMany({
    where: { kullaniciId: k.id }, select: { tokenHash: true },
  });
  bekle('yalnızca bu oturum kaldı', kalanlar.length === 1, `${kalanlar.length} oturum`);
  bekle('kalan oturum doğru olan', kalanlar[0]?.tokenHash === ozetle(buToken));

  const sonHash = (await prisma.kullanici.findUnique({
    where: { id: k.id }, select: { parolaHash: true },
  }))!.parolaHash;
  bekle('yeni parola geçerli', await parolaDogrula(YENI, sonHash!));
  bekle('eski parola artık geçmiyor', !(await parolaDogrula(ESKI, sonHash!)));

  console.log('\n=== 6. Temizlik ===');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.kullanici.count({ where: { eposta: EPOSTA } })) === 0);

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
