import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/db';
import { acikDemoVeri, acikKayitSayisi, partiyiSil, tohumla, turuYenile } from '../lib/tohum';

/**
 * Tohumlama testleri.
 *   node --conditions=react-server --import tsx scripts/test-tohum.ts
 *
 * Asıl sınanan şey silmenin GERÇEK veriye dokunamaması. Tehlike FK
 * hatası değil: `Konusma`, `FiyatAlarmi`, `PanoOge` ve `DaireTipi`
 * projeye `onDelete: Cascade` ile bağlı — demo bir projeyi silmek
 * gerçek bir ziyaretçi sorusunu SESSİZCE götürür. `Talep` daha da
 * sinsi: `SetNull` bağlı, yani talep kaydı kalıyor ama satış ekibinin
 * elindeki "bu kişi hangi projeyi sordu" bilgisi buharlaşıyor.
 * Aşağıdaki 5. bölüm bunu kovalıyor.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzz-tohum';

async function temizle() {
  // Test partileri ve onların defter satırları (parti silinince cascade)
  await prisma.tohumParti.deleteMany({ where: { etiket: { startsWith: 'ZZTOHUM' } } });
  await prisma.talep.deleteMany({ where: { kod: { startsWith: 'ZZT' } } });
  const p = await prisma.proje.findMany({
    where: { slug: { startsWith: ONEK } }, select: { id: true },
  });
  for (const x of p) await prisma.proje.delete({ where: { id: x.id } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZTOHUM' } } });
}

/** Elle bir parti kurar: gerçek tohumlayıcıyı beklemeden silmeyi sınamak için. */
async function partiKur(kayitlar: { model: string; kayitId: string }[]) {
  const p = await prisma.tohumParti.create({
    data: { tur: 'ORNEK_PROJE', etiket: 'ZZTOHUM elle kurulan parti' },
    select: { id: true },
  });
  for (const [i, k] of kayitlar.entries()) {
    await prisma.tohumKayit.create({
      data: { partiId: p.id, model: k.model, kayitId: k.kayitId, sira: i },
    });
  }
  return p.id;
}

async function testProje(firmaId: string, bolgeId: string, ek = '') {
  return prisma.proje.create({
    data: {
      slug: `${ONEK}${ek}-${randomBytes(2).toString('hex')}`,
      ad: `ZZTOHUM Proje${ek}`, bolgeId, firmaId,
      mahalle: 'Test', lat: 40.98, lng: 29.12,
      tip: 'KONUT', durum: 'SATISTA',
      fiyatMin: 4_000_000, fiyatMax: 7_500_000,
      pesinatOrani: 25, taksitAyi: 24, ilerlemeYuzde: 40,
      ozet: 'Tohumlama testleri için açılan geçici proje kaydıdır.',
      yayinda: false, yayinTarihi: new Date(),
    },
    select: { id: true, slug: true },
  });
}

async function testTalep(projeId: string) {
  return prisma.talep.create({
    data: {
      kod: `ZZT${randomBytes(3).toString('hex').toUpperCase()}`,
      projeId, ad: 'Gerçek Alıcı', telefon: '5551112233',
      niyet: 'RANDEVU', durum: 'YENI', kvkkOnay: true,
    },
    select: { id: true },
  });
}

async function main() {
  await temizle();

  const bolge = await prisma.bolge.findFirstOrThrow({ select: { id: true } });

  console.log('\n═══ 1. Tohumlama hiçbir şeyi silmiyor ═══');
  const projeOnce = await prisma.proje.count();
  const talepOnce = await prisma.talep.count();
  const ornek = await tohumla('ORNEK_PROJE', null, { yayinda: false });
  bekle('proje sayısı azalmadı', (await prisma.proje.count()) >= projeOnce);
  bekle('talep sayısı değişmedi', (await prisma.talep.count()) === talepOnce);

  if (ornek.tamam) {
    // Boş veritabanı: projeler eklendi
    bekle('defter satırı yazıldı',
      (await prisma.tohumKayit.count({ where: { partiId: ornek.partiId! } })) > 0);
    const geri = await partiyiSil(ornek.partiId!);
    bekle('parti geri alındı', geri.korunan.length === 0, `${geri.silinen} kayıt`);
    bekle('proje sayısı başa döndü', (await prisma.proje.count()) === projeOnce);
  } else {
    // Tohumlanmış veritabanı: slug'lar zaten var
    bekle('mükerrer tohumlama reddedildi', /kalmadı/.test(ornek.hata ?? ''), ornek.hata ?? '');
    bekle('boş parti geride bırakılmadı',
      (await prisma.tohumParti.count({ where: { silinme: null, kayitlar: { none: {} } } })) === 0);
  }

  console.log('\n═══ 2. Satış talebi geçmişi ═══');
  const gecmis = await tohumla('TALEP_GECMISI', null);
  bekle('talepler oluştu', gecmis.tamam === true, gecmis.hata ?? '');
  const talepSayi = gecmis.sayim?.Talep ?? 0;
  bekle('defterde talep var', talepSayi > 0, `${talepSayi} kayıt`);

  /* Sahte talep YAYINDAKİ bir projeye bağlanmalı ve KVKK onayı
     taşımalı: paneldeki liste onay tarihini gösteriyor, onaysız bir
     satır orada "aranabilir" görünüp aranamayacak bir kayıt olurdu. */
  const tohumTalepIdler = (await prisma.tohumKayit.findMany({
    where: { model: 'Talep' }, select: { kayitId: true },
  })).map((x) => x.kayitId);
  const talepKayitlari = await prisma.talep.findMany({
    where: { id: { in: tohumTalepIdler } },
    select: { kod: true, projeId: true, kvkkOnay: true, telefon: true, eposta: true },
  });
  bekle('her sahte talep bir projeye bağlı',
    talepKayitlari.every((t) => !!t.projeId), `${talepKayitlari.length} talep`);
  bekle('her sahte talepte KVKK onayı var',
    talepKayitlari.every((t) => t.kvkkOnay));
  bekle('talep kodu TLP- ile başlıyor',
    talepKayitlari.every((t) => t.kod.startsWith('TLP-')));

  /* Sahte e-posta DIŞARI ÇIKAMAMALI. `.test` RFC 2606 ile ayrılmış:
     bildirim işi yanlışlıkla çalışsa bile mektup kimseye gitmiyor. */
  bekle('sahte e-postalar .test alanında',
    talepKayitlari.every((t) => !t.eposta || t.eposta.endsWith('.test')),
    talepKayitlari.find((t) => t.eposta && !t.eposta.endsWith('.test'))?.eposta ?? '');

  console.log('\n═══ 3. Talep durumları gerçekçi dağılıyor ═══');
  /* Hepsi YENİ olsaydı huni ekranı tek çubuk gösterirdi ve
     "dönüşüm oranı" her zaman sıfır çıkardı — tohumun amacı tam
     olarak o ekranları dolu görmek. */
  const durumlar = await prisma.talep.groupBy({
    by: ['durum'], where: { id: { in: tohumTalepIdler } }, _count: { _all: true },
  });
  bekle('birden fazla durum üretildi', durumlar.length > 1,
    durumlar.map((d) => `${d.durum}:${d._count._all}`).join(' '));
  bekle('sonuçlanmış talep var',
    durumlar.some((d) => d.durum === 'SATIS' || d.durum === 'ILGILENMIYOR'));

  console.log('\n═══ 4. Geri alma tam ═══');
  const gecmisGeri = await partiyiSil(gecmis.partiId!);
  bekle('talep partisi geri alındı', gecmisGeri.korunan.length === 0,
    gecmisGeri.korunan.map((k) => k.sebep).join('; '));
  bekle('talep sayısı başa döndü', (await prisma.talep.count()) === talepOnce);
  bekle('parti silinme tarihi işlendi',
    (await prisma.tohumParti.findUnique({
      where: { id: gecmis.partiId! }, select: { silinme: true },
    }))?.silinme !== null);

  console.log('\n═══ 5. Gerçek veri silinemiyor ═══');
  const fi = await prisma.firma.create({
    data: {
      slug: `zztohum-${randomBytes(2).toString('hex')}`, ad: 'ZZTOHUM Firma',
      ozet: 'Tohumlama testi için açılan geçici firma kaydı.',
    },
    select: { id: true },
  });
  const p1 = await testProje(fi.id, bolge.id);
  const partiId = await partiKur([
    { model: 'Firma', kayitId: fi.id },
    { model: 'Proje', kayitId: p1.id },
  ]);

  // (a) Gerçek talep — SetNull bağlı, FK engellemez: sessiz bilgi kaybı
  const gercekTalep = await testTalep(p1.id);
  const denemeA = await partiyiSil(partiId);
  bekle('gerçek talebi olan proje korundu',
    denemeA.korunan.some((k) => k.model === 'Proje' && /gerçek satış talebi/.test(k.sebep)),
    denemeA.korunan.map((k) => k.sebep).join('; '));
  bekle('projesi duran firma da korundu',
    denemeA.korunan.some((k) => k.model === 'Firma'));
  bekle('proje hâlâ duruyor', (await prisma.proje.count({ where: { id: p1.id } })) === 1);
  bekle('talebin proje bağı kopmadı',
    (await prisma.talep.findUnique({
      where: { id: gercekTalep.id }, select: { projeId: true },
    }))?.projeId === p1.id);
  bekle('defter satırları korundu — engel kalkınca tekrar denenebilmeli',
    (await prisma.tohumKayit.count({ where: { partiId } })) === 2);
  bekle('parti açık kaldı',
    (await prisma.tohumParti.findUnique({
      where: { id: partiId }, select: { silinme: true },
    }))?.silinme === null);

  // (b) Ziyaretçi yazışması — Cascade bağlı, SESSİZ kayıp riski
  await prisma.talep.delete({ where: { id: gercekTalep.id } });
  const konusma = await prisma.konusma.create({
    data: {
      projeId: p1.id, soranAd: 'Gerçek Ziyaretçi',
      soranEposta: `${ONEK}-gercek@ornek.test`, konu: 'Teslim tarihi',
      mesajlar: { create: [{ soranMi: true, metin: 'Teslim ne zaman?' }] },
    },
    select: { id: true },
  });
  const denemeB = await partiyiSil(partiId);
  bekle('yazışması olan proje korundu',
    denemeB.korunan.some((k) => k.model === 'Proje' && /yazışma/.test(k.sebep)),
    denemeB.korunan.map((k) => k.sebep).join('; '));
  bekle('gerçek yazışma duruyor',
    (await prisma.konusma.count({ where: { id: konusma.id } })) === 1);

  // (c) Fiyat alarmı — ziyaretçi e-postasını bırakmış, kayıt onun
  await prisma.konusma.delete({ where: { id: konusma.id } });
  const alarm = await prisma.fiyatAlarmi.create({
    data: {
      projeId: p1.id, eposta: `${ONEK}-alarm@ornek.test`,
      kurulusFiyati: 4_000_000, jeton: randomBytes(8).toString('hex'),
    },
    select: { id: true },
  });
  const denemeC = await partiyiSil(partiId);
  bekle('fiyat alarmı olan proje korundu',
    denemeC.korunan.some((k) => k.model === 'Proje' && /alarm/.test(k.sebep)),
    denemeC.korunan.map((k) => k.sebep).join('; '));

  // (d) Yerinde inceleme raporu — ekibin şantiyede harcadığı emek
  await prisma.fiyatAlarmi.delete({ where: { id: alarm.id } });
  const rapor = await prisma.kontrolRaporu.create({
    data: {
      projeId: p1.id, ziyaret: new Date(), kontrolEden: 'Test Ekibi',
      sonuclar: [{ kod: 'ruhsat', durum: 'gecti' }],
    },
    select: { id: true },
  });
  const denemeD = await partiyiSil(partiId);
  bekle('inceleme raporu olan proje korundu',
    denemeD.korunan.some((k) => k.model === 'Proje' && /inceleme raporu/.test(k.sebep)),
    denemeD.korunan.map((k) => k.sebep).join('; '));

  // (e) Engel kalkınca silinebiliyor
  await prisma.kontrolRaporu.delete({ where: { id: rapor.id } });
  const denemeE = await partiyiSil(partiId);
  bekle('engel kalkınca proje silindi', denemeE.korunan.length === 0,
    denemeE.korunan.map((k) => k.sebep).join('; '));
  bekle('proje gitti', (await prisma.proje.count({ where: { id: p1.id } })) === 0);
  bekle('firma gitti', (await prisma.firma.count({ where: { id: fi.id } })) === 0);
  bekle('parti kapandı',
    (await prisma.tohumParti.findUnique({
      where: { id: partiId }, select: { silinme: true },
    }))?.silinme !== null);

  console.log('\n═══ 6. Tohumlanmış talep engel değil ═══');
  const fi2 = await prisma.firma.create({
    data: {
      slug: `zztohum2-${randomBytes(2).toString('hex')}`, ad: 'ZZTOHUM Firma 2',
      ozet: 'Tohumlama testi için açılan ikinci geçici firma kaydı.',
    },
    select: { id: true },
  });
  const p2 = await testProje(fi2.id, bolge.id, 'b');
  const t2 = await testTalep(p2.id);
  // Talep de defterde: projeden ÖNCE silinmeli (ters sıra)
  const parti2 = await partiKur([
    { model: 'Firma', kayitId: fi2.id },
    { model: 'Proje', kayitId: p2.id },
    { model: 'Talep', kayitId: t2.id },
  ]);
  const deneme2 = await partiyiSil(parti2);
  bekle('kendi talebi engel olmadı', deneme2.korunan.length === 0,
    deneme2.korunan.map((k) => `${k.model}: ${k.sebep}`).join('; '));
  bekle('talep silindi', (await prisma.talep.count({ where: { id: t2.id } })) === 0);
  bekle('proje silindi', (await prisma.proje.count({ where: { id: p2.id } })) === 0);

  console.log('\n═══ 7. Sayaç ve ikinci kez silme ═══');
  const tekrar = await partiyiSil(parti2);
  bekle('boş partiyi tekrar silmek hata vermiyor', tekrar.tamam === true && tekrar.silinen === 0);
  const yok = await partiyiSil('olmayan-parti-kimligi');
  bekle('olmayan parti düzgün reddediliyor', yok.tamam === false);

  const sayac = await acikDemoVeri();
  bekle('açık demo sayacı tutarlı',
    sayac.kayit === (await prisma.tohumKayit.count()), `${sayac.kayit} kayıt`);

  console.log('\n═══ 8. Temizlik ═══');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.proje.count({ where: { slug: { startsWith: ONEK } } })) === 0);
  bekle('gerçek veri yerinde',
    (await prisma.proje.count()) === projeOnce && (await prisma.talep.count()) === talepOnce,
    `${await prisma.proje.count()} proje / ${projeOnce}`);

  console.log('\n═══ 9. Demo proje üreticisi ═══');
  const demoOnce = await prisma.proje.count({ where: { slug: { startsWith: 'demo-' } } });
  const d1 = await tohumla('DEMO_PROJE', null, { yayinda: false, adet: 3 });
  bekle('demo parti açıldı', d1.tamam && !!d1.partiId, d1.hata ?? '');
  bekle('istenen adet üretildi', d1.sayim?.Proje === 3, `${d1.sayim?.Proje}`);

  /* İkinci basış: örnek proje tohumu ikinci çağrıda "kalmadı" diyor,
     demo üreticisi numarayı sürdürüp yenisini üretmeli. */
  const d2 = await tohumla('DEMO_PROJE', null, { yayinda: false, adet: 2 });
  bekle('ikinci basış da üretiyor', d2.tamam && d2.sayim?.Proje === 2,
    d2.hata ?? `${d2.sayim?.Proje}`);

  const demoSonra = await prisma.proje.count({ where: { slug: { startsWith: 'demo-' } } });
  bekle('projeler eklendi', demoSonra === demoOnce + 5, `${demoOnce} -> ${demoSonra}`);

  const sluglar = await prisma.proje.findMany({
    where: { slug: { startsWith: 'demo-' } }, select: { slug: true },
  });
  bekle('slug çakışması yok', new Set(sluglar.map((v) => v.slug)).size === sluglar.length);

  const demoProje = await prisma.proje.findFirst({
    where: { slug: { startsWith: 'demo-' } },
    select: {
      ad: true,
      medya: { select: { alt: true } },
      ozellikler: { select: { ozellikId: true } },
      daireTipleri: { select: { id: true } },
    },
  });
  bekle('görselleri var', (demoProje?.medya.length ?? 0) > 0, `${demoProje?.medya.length} görsel`);
  bekle('her görselin alt metni var', demoProje!.medya.every((m) => m.alt.length > 10));
  bekle('özellikleri var', (demoProje?.ozellikler.length ?? 0) > 0,
    `${demoProje?.ozellikler.length} özellik`);
  /* DAİRE TİPİ OLMADAN proje yayına alınamıyor (bkz. projeYayinDurumu).
     Üretici tip basmasaydı demo envanter hiç yayınlanamazdı. */
  bekle('daire tipleri var', (demoProje?.daireTipleri.length ?? 0) > 0,
    `${demoProje?.daireTipleri.length} tip`);
  bekle('adı Demo ile başlıyor', demoProje!.ad.startsWith('Demo '), demoProje!.ad);

  console.log('\n═══ 10. Üretilen proje kendi içinde tutarlı ═══');
  /* Ziyaretçinin gördüğü ilk çelişki hep aynı yerden çıkıyor: kart
     bir şey derken içerik başka bir şey diyor. Ofis projesinde
     "çocuk oyun alanı", %90 ilerlemiş projede üç yıl sonra teslim,
     "tükendi" rozetiyle 80 daire kalmış tablo… */
  const uretilenler = await prisma.proje.findMany({
    where: { slug: { startsWith: 'demo-' } },
    select: {
      slug: true, tip: true, durum: true, ilerlemeYuzde: true,
      teslimTarihi: true, fiyatMin: true, fiyatMax: true,
      ozellikler: { select: { ozellik: { select: { kod: true } } } },
      daireTipleri: { select: { fiyatMin: true, fiyatMax: true, adet: true, kalanAdet: true } },
      medya: { select: { url: true } },
    },
  });
  const kodlari = (v: (typeof uretilenler)[number]) =>
    new Set(v.ozellikler.map((o) => o.ozellik.kod));

  const ofisCelisen = uretilenler.filter(
    (v) => v.tip === 'OFIS' && kodlari(v).has('cocukoyun'));
  bekle('ofis projesinde çocuk oyun alanı yok', ofisCelisen.length === 0,
    ofisCelisen.map((v) => v.slug).join(', '));

  const fiyatCelisen = uretilenler.filter((v) => {
    if (v.daireTipleri.length === 0) return false;
    const enUcuz = Math.min(...v.daireTipleri.map((d) => d.fiyatMin ?? Infinity));
    if (!Number.isFinite(enUcuz)) return false;
    return v.fiyatMin !== enUcuz;
  });
  bekle('proje başlangıç fiyatı en ucuz daire tipiyle aynı', fiyatCelisen.length === 0,
    fiyatCelisen.map((v) => v.slug).join(', '));

  const araliksiz = uretilenler.filter((v) => v.fiyatMax !== null && v.fiyatMax < v.fiyatMin);
  bekle('üst fiyat başlangıçtan küçük değil', araliksiz.length === 0,
    araliksiz.map((v) => v.slug).join(', '));

  const stokCelisen = uretilenler.filter(
    (v) => v.durum === 'TUKENDI' && v.daireTipleri.some((d) => (d.kalanAdet ?? 0) > 0));
  bekle('tükendi rozeti stokla çelişmiyor', stokCelisen.length === 0,
    stokCelisen.map((v) => v.slug).join(', '));

  const stokAsimi = uretilenler.filter(
    (v) => v.daireTipleri.some(
      (d) => d.kalanAdet !== null && d.adet !== null && d.kalanAdet > d.adet));
  bekle('kalan adet toplamı aşmıyor', stokAsimi.length === 0,
    stokAsimi.map((v) => v.slug).join(', '));

  /* Teslim ilerlemeyle tutarlı: %90 ilerlemiş bir projenin teslimi üç
     yıl sonra olamaz. Kaba bir üst sınır yeter — tam formülü
     kopyalamak testi üreticinin aynası yapardı. */
  const ay = (t: Date | null) =>
    (t ? (t.getTime() - Date.now()) / (30 * 864e5) : 0);
  const teslimCelisen = uretilenler.filter(
    (v) => v.ilerlemeYuzde >= 80 && ay(v.teslimTarihi) > 18);
  bekle('ilerlemesi yüksek projenin teslimi yakın', teslimCelisen.length === 0,
    teslimCelisen.map((v) => `${v.slug}: %${v.ilerlemeYuzde}`).join(' | '));

  const yakindaCelisen = uretilenler.filter(
    (v) => v.durum === 'YAKINDA' && v.ilerlemeYuzde > 0);
  bekle('yakında olanın ilerlemesi sıfır', yakindaCelisen.length === 0,
    yakindaCelisen.map((v) => v.slug).join(', '));

  const kopyaGorselli = uretilenler.filter(
    (v) => new Set(v.medya.map((m) => m.url)).size !== v.medya.length);
  bekle('galeride kopya görsel yok', kopyaGorselli.length === 0,
    kopyaGorselli.map((v) => v.slug).join(', '));

  /* Partiler bağımsız geri alınabilmeli: ikinci partiyi silmek
     birincinin projelerini götürmemeli. */
  const geriAl = await partiyiSil(d2.partiId!);
  bekle('ikinci parti geri alındı', geriAl.tamam && geriAl.silinen === 2, `${geriAl.silinen} kayıt`);
  bekle('birinci parti duruyor',
    await prisma.proje.count({ where: { slug: { startsWith: 'demo-' } } }) === demoOnce + 3);

  const geriAl1 = await partiyiSil(d1.partiId!);
  bekle('birinci parti de geri alındı', geriAl1.tamam, `${geriAl1.silinen} kayıt`);
  bekle('demo proje kalmadı',
    await prisma.proje.count({ where: { slug: { startsWith: 'demo-' } } }) === demoOnce);

  console.log('\n═══ 11. Yeniden basma ═══');
  /* Üretici düzeltildiğinde tek yol bu: "ekle" eskiyi düzeltmiyor,
     yanına yenisini koyuyor.

     İKİ parti kuruluyor. Sebebi bir hata: `demoProje` firmayı
     yalnızca ilk partide deftere yazıyor ve ikinci partinin projeleri
     de ona bağlı. Geri alma eskiden yeniye gitseydi ilk partinin
     firması, ikinci partinin projeleri dururken silinmeye çalışılır ve
     "korunan" olarak geride kalırdı. */
  const e1 = await tohumla('DEMO_PROJE', null, { yayinda: false, adet: 3 });
  const e2 = await tohumla('DEMO_PROJE', null, { yayinda: false, adet: 2 });
  bekle('yenileme öncesi iki parti açık', e1.tamam && e2.tamam);

  const oncekiler = await prisma.proje.findMany({
    where: { slug: { startsWith: 'demo-' } }, select: { id: true },
  });
  /* Defterde satırı olmayan demo proje = YETİM: eski, geri alınmış bir
     partiden kalmış. Yenileme onlara dokunamaz; sayım onları hesaba
     katmalı, aksi halde test geliştirme veritabanının geçmişine
     bağımlı hâle geliyor. */
  const defterdekiler = new Set((await prisma.tohumKayit.findMany({
    where: { model: 'Proje', kayitId: { in: oncekiler.map((v) => v.id) } },
    select: { kayitId: true },
  })).map((x) => x.kayitId));
  const yetim = oncekiler.filter((v) => !defterdekiler.has(v.id)).length;

  bekle('defter yeni açılan projeleri sayıyor',
    (await acikKayitSayisi('DEMO_PROJE', 'Proje')) === defterdekiler.size,
    `${await acikKayitSayisi('DEMO_PROJE', 'Proje')} / ${defterdekiler.size}`);

  const y = await turuYenile('DEMO_PROJE', null, { yayinda: false, adet: 4 });
  bekle('yenileme başarılı', y.tamam, y.hata ?? '');
  bekle('açık partilerin hepsi geri alındı', y.geriAlinanParti >= 2, `${y.geriAlinanParti} parti`);
  bekle('hiçbir kayıt korunmadı', y.korunan.length === 0,
    y.korunan.map((k) => `${k.model}: ${k.sebep}`).join(' | '));
  bekle('istenen adet basıldı', y.sayim?.Proje === 4, `${y.sayim?.Proje}`);

  const sonrakiler = await prisma.proje.findMany({
    where: { slug: { startsWith: 'demo-' } }, select: { id: true },
  });
  bekle('defterdeki eski projeler gitti',
    sonrakiler.every((v) => !defterdekiler.has(v.id)),
    `${sonrakiler.filter((v) => defterdekiler.has(v.id)).length} tanesi duruyor`);
  bekle('yalnızca yeni parti + yetimler duruyor', sonrakiler.length === yetim + 4,
    `${sonrakiler.length} / ${yetim + 4}`);
  bekle('geri alınan parti kapatıldı',
    (await prisma.tohumParti.findUnique({
      where: { id: e2.partiId! }, select: { silinme: true },
    }))?.silinme !== null);
  bekle('yenilemeden sonra açık proje sayısı basılan kadar',
    (await acikKayitSayisi('DEMO_PROJE', 'Proje')) === 4);

  await partiyiSil(y.partiId!);
  bekle('yenileme partisi de geri alınabiliyor',
    (await prisma.proje.count({ where: { slug: { startsWith: 'demo-' } } })) === yetim,
    `${await prisma.proje.count({ where: { slug: { startsWith: 'demo-' } } })} / ${yetim}`);
  bekle('yetim projeler korundu', true);

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
