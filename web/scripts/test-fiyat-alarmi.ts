import 'dotenv/config';
import { prisma } from '../lib/db';
import {
  BEKLEME_GUN, alarmDamgala, alarmDenetle, alarmIptal, alarmKur,
  alarmOnayla, tetiklenenAlarmlar,
} from '../lib/fiyat-alarmi';

/**
 * Faz 60 fiyat alarmı testleri.
 *   node --conditions=react-server --import tsx scripts/test-fiyat-alarmi.ts
 *
 * Asıl sınananlar iki koruma:
 *
 *   1. ÇİFT ONAY — doğrulanmamış adrese bildirim gitmiyor. Onaysız
 *      gönderim, başkasının adresini yazan birinin bizi istenmeyen
 *      posta göndericisi yapması demekti.
 *   2. TEKRAR KORUMASI — fiyat sabit kalırken haftada bir "düştü"
 *      e-postası gitmiyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzf60';
const eposta = (n: string) => `${ONEK}-${n}@ornek.test`;

async function temizle() {
  await prisma.fiyatAlarmi.deleteMany({ where: { eposta: { startsWith: ONEK } } });
}

async function main() {
  await temizle();

  const proje = await prisma.proje.findFirstOrThrow({
    where: { yayinda: true }, select: { id: true, slug: true, fiyatMin: true },
  });
  const F = proje.fiyatMin;

  console.log('\n=== 1. Dogrulama ===');
  bekle('geçerli girdi kabul', alarmDenetle(eposta('a'), Math.round(F * 0.8), F) === null);
  bekle('bozuk e-posta reddediliyor', alarmDenetle('aaa', Math.round(F * 0.8), F) !== null);
  /* SIFIR HEDEF GEÇERLİ: "satışa çıkınca haber ver" demek. Lansman
     öncesi projede alarmın asıl kullanımı bu ve fiyat karşılaştırması
     hiç yapılmıyor (bkz. lib/fiyat-alarmi.ts). */
  bekle('sıfır hedef kabul ediliyor (satışa çıkış takibi)',
    alarmDenetle(eposta('a'), 0, F) === null);
  bekle('negatif hedef reddediliyor', alarmDenetle(eposta('a'), -1, F) !== null);
  /* Hedef mevcut fiyatın ÜSTÜNDEyse alarm anında tetiklenir ve
     bildirim hiçbir şey söylemez. */
  bekle('mevcut fiyatın üstü reddediliyor', alarmDenetle(eposta('a'), F + 1000, F) !== null);
  bekle('mevcut fiyata eşit reddediliyor', alarmDenetle(eposta('a'), F, F) !== null);
  /* Çok düşük hedef hiç tetiklenmez; "kurdum ama hiç haber gelmedi". */
  bekle('gerçekçi olmayan hedef reddediliyor', alarmDenetle(eposta('a'), Math.round(F * 0.1), F) !== null);

  console.log('\n=== 2. Alarm kurma ===');
  const k1 = await alarmKur(proje.id, eposta('b'), Math.round(F * 0.8));
  bekle('alarm kuruldu', k1.tamam && !!k1.jeton, k1.hata ?? '');
  const kayit = await prisma.fiyatAlarmi.findFirstOrThrow({
    where: { eposta: eposta('b') },
    select: { dogrulandi: true, kurulusFiyati: true, hedef: true },
  });
  bekle('doğrulanmamış açılıyor', kayit.dogrulandi === false);
  bekle('kuruluş fiyatı yazıldı', kayit.kurulusFiyati === F, `${kayit.kurulusFiyati}`);

  /* Kopya satır, fiyat düşünce aynı kişiye iki e-posta demekti. */
  const k2 = await alarmKur(proje.id, eposta('b'), Math.round(F * 0.7));
  bekle('aynı adres ikinci satır açmıyor',
    (await prisma.fiyatAlarmi.count({ where: { eposta: eposta('b') } })) === 1);
  bekle('hedef güncellendi',
    (await prisma.fiyatAlarmi.findFirstOrThrow({ where: { eposta: eposta('b') }, select: { hedef: true } }))
      .hedef === Math.round(F * 0.7), `${k2.tamam}`);

  bekle('olmayan proje reddediliyor',
    !(await alarmKur('yok-boyle-proje', eposta('c'), 1000)).tamam);

  console.log('\n=== 3. Cift onay ===');
  /* DOĞRULANMAMIŞ alarm tetiklenmemeli. Fiyatı hedefin çok altına
     çekip kontrol ediyoruz. */
  await prisma.fiyatAlarmi.updateMany({
    where: { eposta: eposta('b') }, data: { hedef: F * 10 },
  });
  const onaysiz = await tetiklenenAlarmlar();
  bekle('doğrulanmamış alarm tetiklenmiyor',
    !onaysiz.some((a) => a.eposta === eposta('b')));

  const jeton = (await prisma.fiyatAlarmi.findFirstOrThrow({
    where: { eposta: eposta('b') }, select: { jeton: true },
  })).jeton;
  const onay = await alarmOnayla(jeton);
  bekle('onay çalışıyor', onay.tamam, onay.hata ?? '');
  bekle('proje slug döndü', onay.projeSlug === proje.slug, onay.projeSlug ?? '');
  bekle('doğrulandı işaretlendi',
    (await prisma.fiyatAlarmi.findFirstOrThrow({ where: { eposta: eposta('b') }, select: { dogrulandi: true } }))
      .dogrulandi === true);
  bekle('ikinci onay bilgi veriyor', (await alarmOnayla(jeton)).bilgi !== undefined);
  bekle('olmayan jeton reddediliyor', !(await alarmOnayla('yok-boyle-jeton')).tamam);

  console.log('\n=== 4. Tetikleme ===');
  const tetiklenen = await tetiklenenAlarmlar();
  const bizimki = tetiklenen.find((a) => a.eposta === eposta('b'));
  bekle('doğrulanmış alarm tetikleniyor', !!bizimki);
  bekle('yeni fiyat taşınıyor', bizimki?.yeniFiyat === F, `${bizimki?.yeniFiyat}`);

  await alarmDamgala(bizimki!.id, F);
  /* Damgalandıktan sonra fiyat AYNI kalırsa yeniden tetiklenmemeli:
     yoksa fiyat sabitken haftada bir "düştü" e-postası giderdi. */
  bekle('damgalanan alarm tekrar tetiklenmiyor',
    !(await tetiklenenAlarmlar()).some((a) => a.eposta === eposta('b')));

  // Bekleme süresini geriye alıp fiyat aynıyken tekrar bakıyoruz
  await prisma.fiyatAlarmi.updateMany({
    where: { eposta: eposta('b') },
    data: { sonBildirim: new Date(Date.now() - (BEKLEME_GUN + 1) * 864e5) },
  });
  bekle('süre geçse de fiyat düşmediyse tetiklenmiyor',
    !(await tetiklenenAlarmlar()).some((a) => a.eposta === eposta('b')));

  // Fiyat daha da düşmüş gibi: son bildirilen fiyatı yukarı çekiyoruz
  await prisma.fiyatAlarmi.updateMany({
    where: { eposta: eposta('b') }, data: { sonFiyat: F + 5000 },
  });
  bekle('fiyat daha da düşünce yeniden tetikleniyor',
    (await tetiklenenAlarmlar()).some((a) => a.eposta === eposta('b')));

  console.log('\n=== 5. Abonelikten cikma ===');
  const iptal = await alarmIptal(jeton);
  bekle('iptal çalışıyor', iptal.tamam);
  /* Satır SİLİNİYOR — "aktif: false" bırakmak, adresi elimizde
     tutmak olurdu. */
  bekle('kayıt silindi',
    (await prisma.fiyatAlarmi.count({ where: { eposta: eposta('b') } })) === 0);
  bekle('ikinci iptal hata vermiyor', (await alarmIptal(jeton)).tamam);

  console.log('\n=== 6. Temizlik ===');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.fiyatAlarmi.count({ where: { eposta: { startsWith: ONEK } } })) === 0);

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
