import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/db';
import { basvuruKaydet, basvuruOnayla, basvuruReddet } from '../lib/basvuru';
import {
  alarmDogrulamaBildirimi, basvuruAlindiBildirimi, basvuruSonucBildirimi,
} from '../lib/bildirim/baglayici';

/**
 * Firma başvurusu ve fiyat alarmı bildirimleri.
 *   node --conditions=react-server --import tsx scripts/test-bildirim-basvuru.ts
 *
 * Üç boşluk kapatılıyor: başvuru alındı (ekibe), başvuru sonucu
 * (başvurana), alarm doğrulama (takipçiye). Burada kuyruğa doğru
 * kaydın düştüğü ve içeriğinin doğru olduğu sınanıyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const EPOSTA = 'zzz-f28@ornek.test';
const ONEK = 'zzz-f28';

async function temizle() {
  /* Bildirimler TİPE göre siliniyor, adrese göre değil: ekip bildirimi
     EKIP_EPOSTA tanımlı değilse yönetici adresine gidiyor ve `zzz-f28`
     süzgecine takılmıyordu. Artık kalıntı bir sonraki çalıştırmayı
     düşürmüyor. */
  await prisma.bildirim.deleteMany({
    where: {
      tip: {
        in: ['BASVURU_ALINDI', 'BASVURU_ONAYLANDI', 'BASVURU_REDDEDILDI', 'ALARM_DOGRULAMA'],
      },
    },
  });
  await prisma.fiyatAlarmi.deleteMany({ where: { eposta: EPOSTA } });
  await prisma.firmaBasvuru.deleteMany({ where: { eposta: EPOSTA } });
  /* PROJELER FİRMADAN ÖNCE: `proje.firmaId` `Restrict` bağlı,
     ters sırada silmek yabancı anahtar hatası veriyor. */
  const v = await prisma.proje.findMany({
    where: { slug: { startsWith: ONEK } }, select: { id: true },
  });
  for (const x of v) await prisma.proje.delete({ where: { id: x.id } });
  await prisma.firma.deleteMany({ where: { eposta: EPOSTA } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZZ Faz28' } } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZZ Başvuru' } } });
}

const bildirimler = (tip: string) =>
  prisma.bildirim.findMany({
    where: { tip: tip as never },
    select: { alici: true, konu: true, govdeMetin: true },
  });

async function main() {
  await temizle();
  // Ekip adresi sabitlensin; yoksa yönetici hesaplarına gidiyor
  process.env.EKIP_EPOSTA = 'zzz-f28-ekip@ornek.test';

  console.log('\n═══ 1. Başvuru alındı → ekibe ═══');
  const s = await basvuruKaydet({
    ad: 'Şule Karadeniz', eposta: EPOSTA, telefon: '0533 444 55 66',
    firmaAd: 'ZZZ Faz28 Yapı', bolge: 'Ataşehir, Barbaros',
    projeSayisi: 3, mesaj: 'İkisi teslim aşamasında.',
  }, null);
  bekle('başvuru kaydedildi', s.tamam === true);
  bekle('yeni kayıt işaretlendi', s.yeniKayit === true);
  bekle('başvuru kimliği dönüyor', !!s.basvuruId);

  await basvuruAlindiBildirimi(s.basvuruId!);
  const ekip = await bildirimler('BASVURU_ALINDI');
  bekle('ekibe bildirim düştü', ekip.length === 1, `${ekip.length} kayıt`);
  bekle('EKIP_EPOSTA adresine gitti', ekip[0]?.alici === 'zzz-f28-ekip@ornek.test');
  // Telefon gövdede: ekip panele girmeden arayabilsin
  bekle('telefon gövdede', ekip[0]?.govdeMetin.includes('+905334445566') === true);
  bekle('firma unvanı gövdede', ekip[0]?.govdeMetin.includes('ZZZ Faz28 Yapı') === true);
  bekle('proje sayısı gövdede', ekip[0]?.govdeMetin.includes('3') === true);
  bekle('serbest mesaj gövdede', ekip[0]?.govdeMetin.includes('teslim aşamasında') === true);

  // Mükerrer gönderim ekibi ikinci kez uyandırmamalı
  const ikinci = await basvuruKaydet({
    ad: 'Şule Karadeniz', eposta: EPOSTA, telefon: '0533 444 55 66',
    firmaAd: 'ZZZ Faz28 Yapı', bolge: 'Ataşehir, Barbaros',
    projeSayisi: 4, mesaj: 'Güncelledim.',
  }, null);
  bekle('mükerrer gönderim yeni kayıt değil', ikinci.yeniKayit === false);
  bekle('aynı başvuru kimliği', ikinci.basvuruId === s.basvuruId);

  console.log('\n═══ 2. Ret → başvurana ═══');
  await basvuruReddet(s.basvuruId!, 'Bu bölgede henüz hizmet vermiyoruz.');
  await basvuruSonucBildirimi(s.basvuruId!, false);
  const red = await bildirimler('BASVURU_REDDEDILDI');
  bekle('ret bildirimi düştü', red.length === 1);
  bekle('başvurana gitti', red[0]?.alici === EPOSTA);
  // Gerekçe olmadan ret, kişiyi neyi düzelteceğini bilmeden bırakır
  bekle('gerekçe gövdede', red[0]?.govdeMetin.includes('hizmet vermiyoruz') === true);
  bekle('yeniden başvuru söyleniyor',
    red[0]?.govdeMetin.includes('yeniden başvurabilirsiniz') === true);

  console.log('\n═══ 3. Onay → başvurana ═══');
  await prisma.firmaBasvuru.update({
    where: { id: s.basvuruId! }, data: { durum: 'YENI', not: null },
  });
  const onay = await basvuruOnayla(s.basvuruId!);
  bekle('onay başarılı', onay.tamam === true, onay.hata ?? '');
  await basvuruSonucBildirimi(s.basvuruId!, true);
  const kabul = await bildirimler('BASVURU_ONAYLANDI');
  bekle('onay bildirimi düştü', kabul.length === 1);
  bekle('başvurana gitti', kabul[0]?.alici === EPOSTA);
  /* Sonraki adım AÇIKÇA yazılmalı: firma kaydı açılmakla proje yayına
     girmiyor ve bunu bilmeyen firma "neden görünmüyorum" diye
     arıyordu. */
  bekle('sonraki adım yerinde inceleme deniyor',
    kabul[0]?.govdeMetin.includes('yerinde inceleme') === true);

  console.log('\n═══ 4. Alarm doğrulama → takipçiye ═══');
  const bolge = await prisma.bolge.findFirstOrThrow({ select: { id: true } });
  const firma = await prisma.firma.create({
    data: {
      slug: `${ONEK}-firma`, ad: 'ZZZ Faz28 Firma',
      ozet: 'Bildirim testleri için açılan geçici firma kaydı.',
    },
    select: { id: true },
  });
  const proje = await prisma.proje.create({
    data: {
      slug: `${ONEK}-1`, ad: 'ZZZ Faz28 Projesi', bolgeId: bolge.id, firmaId: firma.id,
      mahalle: 'Test', lat: 40.98, lng: 29.12, tip: 'KONUT', durum: 'SATISTA',
      fiyatMin: 6_000_000,
      ozet: 'Bildirim testleri için açılan geçici proje kaydıdır, kırk karakterden uzun.',
      yayinda: true, yayinTarihi: new Date(),
    },
    select: { id: true },
  });

  const alarm = await prisma.fiyatAlarmi.create({
    data: {
      projeId: proje.id, eposta: EPOSTA, hedef: 5_000_000,
      kurulusFiyati: 6_000_000, jeton: randomBytes(8).toString('hex'),
    },
    select: { id: true },
  });
  await alarmDogrulamaBildirimi(alarm.id);
  const dogrulama = await bildirimler('ALARM_DOGRULAMA');
  bekle('doğrulama bildirimi düştü', dogrulama.length === 1, `${dogrulama.length} kayıt`);
  bekle('takipçiye gitti', dogrulama[0]?.alici === EPOSTA);
  /* ÇİFT OPT-IN: doğrulama bağlantısına tıklanmadan alarm çalışmıyor.
     Başkasının adresini yazan biri, o adrese bildirim yağdıramamalı. */
  bekle('doğrulama bağlantısı gövdede',
    dogrulama[0]?.govdeMetin.includes('/alarm/') === true, dogrulama[0]?.govdeMetin.slice(0, 120));
  bekle('proje adı gövdede',
    dogrulama[0]?.govdeMetin.includes('ZZZ Faz28 Projesi') === true);

  console.log('\n═══ 5. Temizlik ═══');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.proje.count({ where: { slug: { startsWith: ONEK } } })) === 0);

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
