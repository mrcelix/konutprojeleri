import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/db';
import {
  SAKLAMA, imhaCalistir, kisiselVeriSil, kisiselVeriTopla,
  sertEngeller, silmeEngelleri, telefonNotu,
} from '../lib/kisisel-veri';

/**
 * KVKK veri hakları testleri.
 *   node --conditions=react-server --import tsx scripts/test-kvkk.ts
 *
 * Server action'lar oturum bağlamı gerektirdiği için doğrudan
 * çağrılamıyor; envanter, engel kontrolü, silme ve imha katmanları
 * burada. Panel ve doğrulama akışı tarayıcıda uçtan uca doğrulandı.
 *
 * BU SİTEDE SİLME GERÇEK SİLME. Kiralama tarafında rezervasyon bir
 * ticari belge üretiyordu (VUK 253, TTK 82) ve kayıt on yıl
 * anonimleştirilerek tutuluyordu. Burada para hareketi yok: talep
 * yalnızca bir temas kaydı, saklama yükümlülüğü doğurmuyor. Bu yüzden
 * testler "anonimleşti mi" değil "gerçekten gitti mi" diye soruyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const EPOSTA = 'zzz-kvkk-test@ornek.test';
const BASKA = 'zzz-kvkk-baska@ornek.test';
const ANONIM_EPOSTA = 'anonim@silinmis.gecersiz';

const gunOnce = (n: number) => new Date(Date.now() - n * 864e5);

async function temizle() {
  await prisma.talep.deleteMany({ where: { kod: { startsWith: 'ZZKVKK' } } });
  for (const e of [EPOSTA, BASKA]) {
    await prisma.talep.deleteMany({ where: { eposta: e } });
    await prisma.konusma.deleteMany({ where: { soranEposta: e } });
    await prisma.fiyatAlarmi.deleteMany({ where: { eposta: e } });
    await prisma.firmaBasvuru.deleteMany({ where: { eposta: e } });
    await prisma.bildirim.deleteMany({ where: { alici: e } });
    await prisma.gonderimEngeli.deleteMany({ where: { adres: e } });
    await prisma.veriTalebi.deleteMany({ where: { eposta: e } });
  }
  await prisma.bildirim.deleteMany({ where: { alici: ANONIM_EPOSTA, konu: '[silindi]' } });
  const p = await prisma.proje.findMany({
    where: { slug: { startsWith: 'zzz-kvkk-proje-' } }, select: { id: true },
  });
  for (const x of p) await prisma.proje.delete({ where: { id: x.id } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZKVKK' } } });
}

/** Test için kendi projesini açar — gerçek envantere dokunulmuyor. */
async function testProjesi(sira: number) {
  const bolge = await prisma.bolge.findFirstOrThrow({ select: { id: true } });
  const firma = await prisma.firma.upsert({
    where: { slug: 'zzz-kvkk-firma' },
    update: {},
    create: {
      slug: 'zzz-kvkk-firma', ad: 'ZZKVKK Firma',
      ozet: 'KVKK testleri için açılan geçici firma kaydı.',
    },
    select: { id: true },
  });
  return prisma.proje.create({
    data: {
      slug: `zzz-kvkk-proje-${sira}-${randomBytes(2).toString('hex')}`,
      ad: `ZZKVKK Proje ${sira}`, bolgeId: bolge.id, firmaId: firma.id,
      mahalle: 'Test', lat: 40.98, lng: 29.12,
      tip: 'KONUT', durum: 'SATISTA', fiyatMin: 4_000_000,
      ozet: 'KVKK testleri için açılan geçici proje kaydıdır, en az kırk karakter uzunluğunda.',
      yayinda: false, yayinTarihi: new Date(),
    },
    select: { id: true },
  });
}

let kodSayaci = 0;
const kod = () => `ZZKVKK${String(kodSayaci++).padStart(4, '0')}`;

async function talepEkle(
  projeId: string, eposta: string | null, durum: 'YENI' | 'ARANDI' | 'RANDEVU' | 'SATIS' | 'ILGILENMIYOR' | 'KAPANDI' | 'ULASILAMADI',
  gunYas = 0,
) {
  return prisma.talep.create({
    data: {
      kod: kod(), projeId, ad: 'ZZKVKK Alıcı', telefon: '5551112233',
      eposta, durum, kvkkOnay: true,
      olusturma: gunYas ? gunOnce(gunYas) : undefined,
    },
    select: { id: true },
  });
}

async function main() {
  await temizle();

  const proje = await testProjesi(1);

  console.log('\n═══ 1. Veri envanteri (md. 11/b–c) ═══');
  await talepEkle(proje.id, EPOSTA, 'ILGILENMIYOR');
  await prisma.konusma.create({
    data: {
      projeId: proje.id, soranAd: 'ZZKVKK Alıcı', soranEposta: EPOSTA,
      konu: 'Teslim tarihi', durum: 'KAPALI',
      mesajlar: {
        create: [
          { soranMi: true, metin: 'Teslim ne zaman?' },
          { soranMi: false, metin: '2027 2. çeyrek.' },
        ],
      },
    },
  });
  await prisma.fiyatAlarmi.create({
    data: {
      projeId: proje.id, eposta: EPOSTA, kurulusFiyati: 4_000_000,
      jeton: randomBytes(8).toString('hex'),
    },
  });
  await prisma.bildirim.create({
    data: {
      kanal: 'EPOSTA', tip: 'TALEP_ALINDI', alici: EPOSTA, aliciAd: 'ZZKVKK Alıcı',
      konu: 'Talebiniz alındı', govdeHtml: '<p>x</p>', govdeMetin: 'x',
      durum: 'GONDERILDI', saglayici: 'test',
    },
  });

  // Başkasının verisi — hiçbir adımda karışmamalı
  await talepEkle(proje.id, BASKA, 'ILGILENMIYOR');

  const rapor = await kisiselVeriTopla(EPOSTA);
  bekle('rapor kalem içeriyor', rapor.kalemler.length > 0, `${rapor.kalemler.length} kalem`);
  bekle('toplam kayıt sayılıyor', rapor.toplamKayit > 0, `${rapor.toplamKayit} kayıt`);
  bekle('her kalemin amacı yazılı (aydınlatma yükümlülüğü)',
    rapor.kalemler.every((k) => k.amac.length > 10));

  const duz = JSON.stringify(rapor);
  bekle('başkasının adresi rapora sızmıyor', !duz.includes(BASKA));

  /* TELEFONLA BIRAKILAN TALEP e-postadan bulunamıyor ve bu sınır
     rapora AÇIKÇA yazılmak zorunda: sessizce eksik yanıt vermek,
     veri sahibine "başka kaydınız yok" demekle aynı şey. */
  bekle('telefon sınırı metinde açıkça söyleniyor',
    telefonNotu.includes('telefon') && telefonNotu.includes('yeniden başvurabilirsiniz'));

  const epostasiz = await talepEkle(proje.id, null, 'YENI');
  const raporSonra = await kisiselVeriTopla(EPOSTA);
  bekle('e-postasız talep raporda görünmüyor (bilinen sınır)',
    JSON.stringify(raporSonra).includes(epostasiz.id) === false);
  await prisma.talep.delete({ where: { id: epostasiz.id } });

  console.log('\n═══ 2. Silme engelleri ═══');
  /* Süren satış görüşmesi ENGEL: satış ekibi kişiyi aramak üzere ve
     ada, telefona ihtiyaç var. Kişi talebini kendisi kapattıysa
     (ILGILENMIYOR) engel yok. */
  const acikTalep = await talepEkle(proje.id, EPOSTA, 'YENI');
  const acikEngel = await silmeEngelleri(EPOSTA);
  bekle('açık talep silmeyi durduruyor',
    sertEngeller(acikEngel).some((e) => /satış görüşmesi/i.test(e.sebep)),
    acikEngel.map((e) => e.sebep).join('; '));

  await prisma.talep.update({ where: { id: acikTalep.id }, data: { durum: 'ILGILENMIYOR' } });
  bekle('talep kapanınca engel kalkıyor',
    sertEngeller(await silmeEngelleri(EPOSTA)).length === 0);

  /* Satışa dönüşmüş talep KAPSAM notu, engel değil: bizdeki kayıt
     siliniyor ama sözleşmenin tarafı olan firmanın kendi kayıtları
     bizde değil ve kişiye nereye başvuracağı söylenmeli. */
  await prisma.talep.update({ where: { id: acikTalep.id }, data: { durum: 'SATIS' } });
  const satisEngel = await silmeEngelleri(EPOSTA);
  bekle('satış kaydı kapsam notu üretiyor',
    satisEngel.some((e) => e.tur === 'kapsam' && /[Ss]atış/.test(e.sebep)));
  bekle('kapsam notu silmeyi durdurmuyor', sertEngeller(satisEngel).length === 0);
  bekle('nereye başvurulacağı yazıyor',
    satisEngel.some((e) => e.tur === 'kapsam' && /firma/i.test(e.ayrinti)));
  await prisma.talep.update({ where: { id: acikTalep.id }, data: { durum: 'ILGILENMIYOR' } });

  /* Panel hesabı olan biri "ziyaretçi" değil: hesabı önce
     kapatılmalı, yoksa silme oturumu kırık bırakır. */
  const hesap = await prisma.kullanici.create({
    data: {
      ad: 'ZZKVKK Kullanıcı', eposta: EPOSTA, rol: 'FIRMA',
      parolaHash: 'scrypt$test$test',
    },
    select: { id: true },
  });
  const hesapEngel = await silmeEngelleri(EPOSTA);
  bekle('panel hesabı silmeyi durduruyor',
    sertEngeller(hesapEngel).some((e) => e.sebep === 'Panel hesabı'),
    hesapEngel.map((e) => e.sebep).join('; '));
  await prisma.kullanici.delete({ where: { id: hesap.id } });
  bekle('hesap kapanınca engel kalkıyor',
    sertEngeller(await silmeEngelleri(EPOSTA)).length === 0);

  console.log('\n═══ 3. Silme gerçekten siliyor ═══');
  const oncekiBaska = await prisma.talep.count({ where: { eposta: BASKA } });
  const sonuc = await kisiselVeriSil(EPOSTA);
  bekle('silme kayıt sayısı döndürüyor', sonuc.toplam > 0, `${sonuc.toplam} kayıt`);

  bekle('talepler gerçekten silindi',
    (await prisma.talep.count({ where: { eposta: EPOSTA } })) === 0);
  bekle('yazışmalar silindi',
    (await prisma.konusma.count({ where: { soranEposta: EPOSTA } })) === 0);
  bekle('mesajlar da gitti (cascade)', sonuc.mesaj === 2, `${sonuc.mesaj}`);
  bekle('fiyat alarmı silindi',
    (await prisma.fiyatAlarmi.count({ where: { eposta: EPOSTA } })) === 0);

  /* BİLDİRİM SATIRI KALIYOR, içeriği temizleniyor: "bu adrese şu
     tarihte ne gönderdik" sorusunun tek kanıtı o ve istenmeyen posta
     şikâyetinde ispat yükü bizde. Kalan alanlar tek başına kimseyi
     işaret etmiyor. */
  bekle('bildirim satırı silinmedi', sonuc.bildirim > 0, `${sonuc.bildirim} bildirim`);
  bekle('bildirim adresi anonimleşti',
    (await prisma.bildirim.count({ where: { alici: EPOSTA } })) === 0);
  const anonimBildirim = await prisma.bildirim.findFirst({
    where: { alici: ANONIM_EPOSTA }, select: { konu: true, govdeMetin: true, kanal: true, olusturma: true },
  });
  bekle('bildirim gövdesi boşaltıldı',
    anonimBildirim?.govdeMetin === '' && anonimBildirim?.konu === '[silindi]');
  bekle('kanal ve tarih korundu',
    !!anonimBildirim?.kanal && !!anonimBildirim?.olusturma);

  bekle('başkasının verisine dokunulmadı',
    (await prisma.talep.count({ where: { eposta: BASKA } })) === oncekiBaska,
    `${oncekiBaska}`);

  const raporSil = await kisiselVeriTopla(EPOSTA);
  bekle('silmeden sonra envanter boş', raporSil.toplamKayit === 0, `${raporSil.toplamKayit}`);

  console.log('\n═══ 4. Saklama süreleri ═══');
  /* Süreler dayanaklarıyla tanımlı; sayıyı değiştirmek politika
     değiştirmek demek. Test sınırları değil TUTARLILIĞI kovalıyor. */
  bekle('oturum en kısa süre', SAKLAMA.oturum < SAKLAMA.olcum);
  bekle('bildirim 6563 gereği üç yıl', SAKLAMA.bildirim === 3 * 365);
  bekle('yazışma bildirimle aynı', SAKLAMA.konusma === SAKLAMA.bildirim);
  bekle('talep iki yıl', SAKLAMA.talep === 2 * 365);
  bekle('KVKK başvurusu iki yıl', SAKLAMA.veriTalebi === 2 * 365);

  console.log('\n═══ 5. İmha ═══');
  const proje2 = await testProjesi(2);

  /* AÇIK talep ne kadar eski olursa olsun silinmiyor: süresi doldu
     diye silinen açık bir talep, satış ekibinin hâlâ aramayı
     beklediği kişiyi yok etmek olurdu. */
  const eskiAcik = await talepEkle(proje2.id, EPOSTA, 'YENI', SAKLAMA.talep + 30);
  const eskiKapali = await talepEkle(proje2.id, EPOSTA, 'ILGILENMIYOR', SAKLAMA.talep + 30);
  const yeniKapali = await talepEkle(proje2.id, EPOSTA, 'ILGILENMIYOR', 10);

  /* Kuru çalışmada YALNIZCA süresi dolmuş KAPALI talep sayılıyor:
     açık talep ne kadar eski olursa olsun imhaya girmiyor. */
  const kuru = await imhaCalistir(true);
  bekle('kuru çalışma sayı veriyor', kuru.talep >= 1, `${kuru.talep} talep`);
  bekle('kuru çalışma hiçbir şey silmiyor',
    (await prisma.talep.count({ where: { id: eskiKapali.id } })) === 1);

  const imha = await imhaCalistir();
  bekle('imha süresi dolan talebi sildi', imha.talep >= 1, `${imha.talep} talep`);
  bekle('süresi dolmuş kapalı talep silindi',
    (await prisma.talep.count({ where: { id: eskiKapali.id } })) === 0);
  bekle('süresi dolmuş AÇIK talep korundu',
    (await prisma.talep.count({ where: { id: eskiAcik.id } })) === 1);
  bekle('süresi dolmamış talep korundu',
    (await prisma.talep.count({ where: { id: yeniKapali.id } })) === 1);

  bekle('toplam alt kalemlerin toplamı',
    imha.toplam === imha.oturum + imha.olcum + imha.bildirim + imha.konusma
      + imha.denetimIp + imha.talep + imha.veriTalebi,
    `${imha.toplam}`);

  const ikinciImha = await imhaCalistir();
  bekle('ikinci imha aynı kayıtları tekrar saymıyor', ikinciImha.talep === 0,
    `${ikinciImha.talep}`);

  console.log('\n═══ 6. Temizlik ═══');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.talep.count({ where: { kod: { startsWith: 'ZZKVKK' } } })) === 0);
  bekle('test projeleri silindi',
    (await prisma.proje.count({ where: { slug: { startsWith: 'zzz-kvkk-proje-' } } })) === 0);

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
