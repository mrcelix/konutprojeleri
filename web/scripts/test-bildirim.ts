import 'dotenv/config';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { bildirimKuyrukla, kuyruguIsle } from '../lib/bildirim';
import * as S from '../lib/bildirim/sablonlar';
import { yeniTalepBildirimi, randevuTeyitBildirimi } from '../lib/bildirim/baglayici';
import { prisma } from '../lib/db';

/**
 * Bildirim altyapısı testleri.
 *   node --conditions=react-server --import tsx scripts/test-bildirim.ts
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const POSTA = path.join(process.cwd(), '.postakutusu');
const GUN = 864e5;
const EPOSTA = 'talep@bildirim.test';

const ornekTalep = (): S.TalepEkipBaglam => ({
  kod: 'TLP-K7M2QX', niyet: 'RANDEVU', ad: 'Test Alıcı', telefon: '0532 111 22 33',
  eposta: EPOSTA, projeAd: 'Meridyen Park Ataşehir', projeFiyat: 6_750_000,
  daireTipi: '2+1 · 95 m²', butceMin: 5_000_000, butceMax: 8_000_000,
  odemeSekli: 'KREDI', saat: '18:00 sonrası', not: 'Hafta içi akşam müsaitim.',
});

async function temizle() {
  await prisma.bildirim.deleteMany({ where: { alici: { endsWith: '@bildirim.test' } } });
  await prisma.talep.deleteMany({ where: { kod: { startsWith: 'ZZBLD' } } });
  await rm(POSTA, { recursive: true, force: true });
}

async function main() {
  await temizle();
  /* Ekip adresi SABİTLENİYOR: tanımlı değilse `ekipAdresleri()` aktif
     yönetici hesaplarına düşüyor ve boş veritabanında hiç adres
     bulamıyor. Test kurulum durumuna değil akışa bakmalı. */
  process.env.EKIP_EPOSTA = 'ekip@bildirim.test';

  console.log('\n═══ 1. Şablonlar ═══');
  const t = ornekTalep();
  const sablonlar: [string, S.Sablon][] = [
    ['talep ekibe', S.talepEkip(t)],
    ['talep alındı', S.talepAlindi('Test Alıcı', t.kod, t.projeAd, 'meridyen-park-atasehir')],
    ['randevu teyit', S.randevuTeyit('Test Alıcı', t.kod, t.projeAd,
      new Date(Date.UTC(2027, 5, 10, 11, 0)), 'Barbaros Mah. satış ofisi')],
    ['yeni soru', S.yeniSoru('Meridyen Yapı', 'Ayşe K.', 'Meridyen Park Ataşehir',
      'Teslim ne zaman?', 'kns1')],
    ['soru yanıtlandı', S.soruYanitlandi('Ayşe K.', 'Meridyen Yapı', 'Meridyen Park Ataşehir',
      'meridyen-park-atasehir', '2027 2. çeyrek.')],
    ['hesap oluşturuldu', S.hesapOlusturuldu('Test User', 'test@x.com', 'abc123xyz', 'FIRMA')],
    ['parola sıfırlandı', S.parolaSifirlandi('Test User', 'yeni123abc')],
    ['başvuru alındı', S.basvuruAlindi('Test User', '0532 111 22 33', 'test@x.com',
      'Örnek İnşaat', 'Ataşehir', 2, 'İki projemiz satışta.')],
    ['başvuru onaylandı', S.basvuruOnaylandi('Test User')],
    ['başvuru reddedildi', S.basvuruReddedildi('Test User', 'Bu bölgede henüz hizmet vermiyoruz.')],
    ['KVKK doğrulama', S.kvkkDogrulama('SILME', 'jeton123')],
    ['alarm doğrulama', S.alarmDogrulama('Meridyen Park Ataşehir', 6_000_000, 'jeton123')],
  ];

  bekle('12 şablon üretildi', sablonlar.length === 12);
  bekle('hepsinin konusu dolu', sablonlar.every(([, s]) => s.konu.length > 5));
  bekle('hepsinin HTML gövdesi var', sablonlar.every(([, s]) => s.html.includes('<!DOCTYPE html>')));
  bekle('hepsinin düz metin karşılığı var', sablonlar.every(([, s]) => s.metin.length > 30));
  bekle('HTML’de satır içi stil var (e-posta istemcileri için)',
    sablonlar.every(([, s]) => s.html.includes('style=')));
  bekle('harici stil sayfası yok', sablonlar.every(([, s]) => !s.html.includes('<link')));
  bekle('düz metinde HTML etiketi kalmamış',
    sablonlar.every(([, s]) => !/<[a-z][^>]*>/i.test(s.metin)));

  /* EKİBE GİDEN ŞABLONDA TELEFON GÖVDEDE. Konut satışında ilk teması
     kimin ne kadar hızlı kurduğu belirleyici; ekibi panele girmeye
     zorlamak o hızı harcıyor. */
  const ekip = sablonlar.find(([a]) => a === 'talep ekibe')![1];
  bekle('ekip şablonunda telefon var', ekip.metin.includes('0532 111 22 33'));
  bekle('ekip şablonunda talep kodu var', ekip.metin.includes('TLP-K7M2QX'));
  bekle('ekip şablonunda bütçe var', /5|8/.test(ekip.metin));
  /* Konu satırında NİYET: randevu talebi telefonu bugün açmayı
     gerektiriyor, katalog talebi aynı aciliyette değil. */
  bekle('konu satırı niyeti söylüyor', /[Rr]andevu/.test(ekip.konu), ekip.konu);

  const alindi = sablonlar.find(([a]) => a === 'talep alındı')![1];
  bekle('teyit e-postası kodu içeriyor', alindi.metin.includes('TLP-K7M2QX'));

  const soru = sablonlar.find(([a]) => a === 'yeni soru')![1];
  bekle('soru şablonu soruyu içeriyor', soru.html.includes('Teslim ne zaman?'));

  console.log('\n═══ 2. Kuyruk ═══');
  const id1 = await bildirimKuyrukla({
    tip: 'TALEP_ALINDI', alici: 'kuyruk@bildirim.test', aliciAd: 'Kuyruk Testi',
    sablon: alindi,
  });
  bekle('bildirim kuyruğa alındı', !!id1);
  const kayit = await prisma.bildirim.findUnique({ where: { id: id1! } });
  bekle('durum KUYRUKTA', kayit?.durum === 'KUYRUKTA');
  bekle('gövde saklandı', (kayit?.govdeHtml.length ?? 0) > 500);

  console.log('\n═══ 3. Gönderim (sahte sağlayıcı → dosya) ═══');
  const sonuc = await kuyruguIsle(10);
  bekle('kuyruk işlendi', sonuc.islenen >= 1, `${sonuc.basarili} gönderildi`);
  const sonra = await prisma.bildirim.findUnique({ where: { id: id1! } });
  bekle('durum GONDERILDI', sonra?.durum === 'GONDERILDI');
  bekle('gönderim zamanı yazıldı', !!sonra?.gonderim);
  bekle('sağlayıcı referansı var', !!sonra?.referans);

  const dosyalar = await readdir(POSTA).catch(() => [] as string[]);
  bekle('posta kutusuna HTML dosyası yazıldı', dosyalar.length >= 1, `${dosyalar.length} dosya`);

  console.log('\n═══ 4. Mükerrer engelleme ═══');
  const proje = await prisma.proje.findFirstOrThrow({
    where: { yayinda: true }, select: { id: true },
  });
  const talep = await prisma.talep.create({
    data: {
      kod: 'ZZBLD001', projeId: proje.id, ad: 'Bildirim Testi',
      telefon: '5321112233', eposta: EPOSTA, niyet: 'RANDEVU', kvkkOnay: true,
    },
    select: { id: true },
  });

  const ilk = await bildirimKuyrukla({
    tip: 'RANDEVU_TEYIT', alici: EPOSTA, aliciAd: 'x',
    sablon: sablonlar[2][1], talepId: talep.id, planlanan: new Date(Date.now() + GUN),
  });
  const ikinci = await bildirimKuyrukla({
    tip: 'RANDEVU_TEYIT', alici: EPOSTA, aliciAd: 'x',
    sablon: sablonlar[2][1], talepId: talep.id, planlanan: new Date(Date.now() + GUN),
  });
  bekle('ilk kayıt oluştu', !!ilk);
  bekle('aynı tip ikinci kez kuyruğa girmedi', ikinci === null);
  bekle('veritabanında tek kayıt var',
    (await prisma.bildirim.count({ where: { talepId: talep.id, tip: 'RANDEVU_TEYIT' } })) === 1);

  console.log('\n═══ 5. İleri tarihli bildirim ═══');
  const ileriIslem = await kuyruguIsle(10);
  const ileriKayit = await prisma.bildirim.findUnique({ where: { id: ilk! } });
  bekle('ileri tarihli bildirim gönderilmedi', ileriKayit?.durum === 'KUYRUKTA',
    `vadesi ${ileriKayit?.planlanan.toISOString().slice(0, 10)}`);
  bekle('kuyruk işleyicisi vadesi gelmeyeni almadı', ileriIslem.islenen === 0);

  console.log('\n═══ 6. Akış entegrasyonu ═══');
  await yeniTalepBildirimi(talep.id);
  const akis = await prisma.bildirim.findMany({
    where: { talepId: talep.id }, select: { tip: true, alici: true },
  });
  const tipler = akis.map((x) => x.tip);
  bekle('satış ekibine bildirim düştü', tipler.includes('TALEP_EKIP'));
  bekle('talep sahibine teyit gitti', tipler.includes('TALEP_ALINDI'));
  bekle('teyit doğru adrese gitti',
    akis.some((x) => x.tip === 'TALEP_ALINDI' && x.alici === EPOSTA));

  /* E-POSTASIZ TALEPTE teyit gönderilmiyor: alan isteğe bağlı ve
     talep sahiplerinin çoğu yalnızca telefon bırakıyor. Ekip
     bildirimi yine de gitmeli — ekibin adresine gidiyor. */
  const epostasiz = await prisma.talep.create({
    data: {
      kod: 'ZZBLD002', projeId: proje.id, ad: 'Telefonla Bırakan',
      telefon: '5329998877', kvkkOnay: true,
    },
    select: { id: true },
  });
  await yeniTalepBildirimi(epostasiz.id);
  const epostasizAkis = await prisma.bildirim.findMany({
    where: { talepId: epostasiz.id }, select: { tip: true },
  });
  bekle('e-postasız talepte ekip yine haberdar',
    epostasizAkis.some((x) => x.tip === 'TALEP_EKIP'));
  bekle('e-postasız talepte teyit gönderilmiyor',
    !epostasizAkis.some((x) => x.tip === 'TALEP_ALINDI'));

  console.log('\n═══ 7. Randevu teyidi ═══');
  /* AYRI TALEP: 4. bölümde aynı kişiye ileri tarihli bir
     RANDEVU_TEYIT kuyruğa alındı ve tekillik kısıtı ikincisini
     bilerek yutuyor. Aynı talebi kullanmak, kısıtın kendisini hata
     gibi gösterirdi. */
  const randevuTalebi = await prisma.talep.create({
    data: {
      kod: 'ZZBLD003', projeId: proje.id, ad: 'Randevu Testi',
      telefon: '5327776655', eposta: EPOSTA, niyet: 'RANDEVU', kvkkOnay: true,
    },
    select: { id: true },
  });
  await randevuTeyitBildirimi(
    randevuTalebi.id, new Date(Date.now() + 3 * GUN), 'Barbaros Mah. satış ofisi',
  );
  const randevu = await prisma.bildirim.findFirst({
    where: { talepId: randevuTalebi.id, tip: 'RANDEVU_TEYIT' },
    select: { govdeMetin: true },
  });
  bekle('randevu teyidi gönderildi', !!randevu);
  bekle('teyitte yer bilgisi var', randevu?.govdeMetin.includes('Barbaros') === true);

  await temizle();
  console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
  await prisma.$disconnect();
  process.exit(kalan === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await temizle(); await prisma.$disconnect(); process.exit(1); });
