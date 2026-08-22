import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { prisma } from '../lib/db';
import {
  bekleyenNiyetSayisi, bekleyenTalepSayisi, epostaNormal, talepDenetle,
  talepDurumu, talepOlustur, telefonBicim, telefonNormal,
} from '../lib/talep';

/**
 * Satış talebi (lead) testleri.
 *   node --conditions=react-server --import tsx scripts/test-talep.ts
 *
 * Talep formu sitenin TEK dönüşüm hedefi: proje tanıtım sitesinde
 * para hareketi yok, ziyaretçi yalnızca temas kuruyor. O yüzden
 * buradaki her kural doğrudan gelire dokunuyor.
 *
 * En kritik olanlar:
 *   · ZORUNLU ALAN İKİ TANE (ad, telefon) — e-posta zorunlu olsaydı
 *     en yüksek dönüşümlü form en çok terk edilen forma dönerdi;
 *   · KVKK onayı SUNUCUDA denetleniyor — form doğrudan POST edilebilir;
 *   · daire tipi projeye ait olmalı — değilse satış ekibi olmayan bir
 *     daireyi konuşuyor;
 *   · mükerrer talep yutuluyor — aynı kişi iki kez aranmamalı.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const ONEK = 'zzz-talep';
const AD = 'ZZTALEP Alıcı';

async function temizle() {
  await prisma.talep.deleteMany({ where: { ad: { startsWith: 'ZZTALEP' } } });
  const p = await prisma.proje.findMany({
    where: { slug: { startsWith: ONEK } }, select: { id: true },
  });
  for (const x of p) await prisma.proje.delete({ where: { id: x.id } });
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZTALEP' } } });
}

/** Mükerrer penceresi 10 dakika; testler arası çakışmasın diye her seferinde yeni numara. */
let sayac = 0;
const numara = () => `5${String(320_000_000 + (sayac++) * 7919)}`;

async function main() {
  await temizle();

  const bolge = await prisma.bolge.findFirstOrThrow({ select: { id: true } });
  const firma = await prisma.firma.create({
    data: {
      slug: `zztalep-${randomBytes(2).toString('hex')}`, ad: 'ZZTALEP Firma',
      ozet: 'Talep testleri için açılan geçici firma kaydı.',
    },
    select: { id: true },
  });
  const proje = await prisma.proje.create({
    data: {
      slug: `${ONEK}-${randomBytes(2).toString('hex')}`, ad: 'ZZTALEP Proje',
      bolgeId: bolge.id, firmaId: firma.id, mahalle: 'Test',
      lat: 40.98, lng: 29.12, tip: 'KONUT', durum: 'SATISTA',
      fiyatMin: 4_000_000, fiyatMax: 8_000_000,
      ozet: 'Talep testleri için açılan geçici proje kaydıdır.',
      yayinda: false, yayinTarihi: new Date(),
    },
    select: { id: true },
  });
  const digerProje = await prisma.proje.create({
    data: {
      slug: `${ONEK}b-${randomBytes(2).toString('hex')}`, ad: 'ZZTALEP Proje B',
      bolgeId: bolge.id, firmaId: firma.id, mahalle: 'Test',
      lat: 40.99, lng: 29.13, tip: 'KONUT', durum: 'SATISTA',
      fiyatMin: 3_000_000,
      ozet: 'Talep testleri için açılan ikinci geçici proje kaydıdır.',
      yayinda: false, yayinTarihi: new Date(),
    },
    select: { id: true },
  });
  const daire = await prisma.daireTipi.create({
    data: {
      projeId: proje.id, ad: '2+1', odaSayisi: '2+1', banyo: 1,
      brutM2: 95, netM2: 78, fiyatMin: 4_000_000, adet: 40, kalanAdet: 12, sira: 0,
    },
    select: { id: true },
  });

  console.log('\n═══ 1. Telefon normalleştirme ═══');
  /* Ziyaretçi numarayı bildiği gibi yazıyor. Hepsi tek biçime
     inmezse mükerrer kontrolü çalışmıyor ve ekip listede aynı kişiyi
     üç ayrı satırda görüyor. */
  const yazimlar = [
    '0532 111 22 33', '+90 532 111 22 33', '532-111-22-33',
    '905321112233', '00905321112233', '(0532) 111 22 33',
  ];
  for (const y of yazimlar) {
    bekle(`"${y}" → 5321112233`, telefonNormal(y) === '5321112233', telefonNormal(y) ?? 'null');
  }
  bekle('sekiz hane reddediliyor', telefonNormal('532 111 22') === null);
  bekle('alan kodu 1 ile başlayan reddediliyor', telefonNormal('1321112233') === null);
  bekle('harf içeren reddediliyor', telefonNormal('532abc1122') === null);
  bekle('okunur biçim', telefonBicim('5321112233') === '0532 111 22 33',
    telefonBicim('5321112233'));

  console.log('\n═══ 2. E-posta normalleştirme ═══');
  bekle('boş e-posta null', epostaNormal('') === null && epostaNormal(null) === null);
  bekle('büyük harf ve boşluk temizleniyor',
    epostaNormal('  Ali@Ornek.TEST ') === 'ali@ornek.test');

  console.log('\n═══ 3. Doğrulama kuralları ═══');
  const temel = { ad: AD, telefon: '5321112233', kvkkOnay: true };
  bekle('ad + telefon + onay yeterli', talepDenetle(temel).tamam);
  bekle('e-posta zorunlu değil', talepDenetle({ ...temel, eposta: null }).tamam);
  bekle('tek harflik ad reddediliyor', talepDenetle({ ...temel, ad: 'A' }).alan === 'ad');
  bekle('geçersiz telefon reddediliyor',
    talepDenetle({ ...temel, telefon: '123' }).alan === 'telefon');
  bekle('bozuk e-posta reddediliyor',
    talepDenetle({ ...temel, eposta: 'ali@' }).alan === 'eposta');

  /* KATALOG ve FİYAT LİSTESİ e-postayla gidiyor. Adres olmadan talep
     açılırsa kayıt oluşuyor ama istenen şey hiç gönderilemiyor ve
     ekip sebebini anlamıyor. */
  bekle('katalog isteğinde e-posta zorunlu',
    talepDenetle({ ...temel, niyet: 'KATALOG' }).alan === 'eposta');
  bekle('fiyat listesi isteğinde e-posta zorunlu',
    talepDenetle({ ...temel, niyet: 'FIYAT_LISTESI' }).alan === 'eposta');
  bekle('adresi olan katalog isteği geçiyor',
    talepDenetle({ ...temel, niyet: 'KATALOG', eposta: 'ali@ornek.test' }).tamam);
  bekle('randevuda e-posta istenmiyor',
    talepDenetle({ ...temel, niyet: 'RANDEVU' }).tamam);

  bekle('ters bütçe aralığı reddediliyor',
    talepDenetle({ ...temel, butceMin: 5_000_000, butceMax: 3_000_000 }).alan === 'butceMax');
  bekle('negatif bütçe reddediliyor',
    talepDenetle({ ...temel, butceMin: -1 }).alan === 'butceMin');
  bekle('yalnızca üst sınır girilebiliyor',
    talepDenetle({ ...temel, butceMax: 5_000_000 }).tamam);
  bekle('uzun not reddediliyor',
    talepDenetle({ ...temel, not: 'x'.repeat(501) }).alan === 'not');

  /* KVKK: onay kutusu istemcide `required` olsa da form doğrudan
     POST edilebiliyor. Sunucu denetimi tek gerçek kapı. */
  bekle('onaysız talep reddediliyor',
    talepDenetle({ ...temel, kvkkOnay: false }).alan === 'kvkkOnay');
  bekle('onay alanı hiç gelmezse de reddediliyor',
    talepDenetle({ ad: AD, telefon: '5321112233' }).alan === 'kvkkOnay');

  console.log('\n═══ 4. Kayıt açma ═══');
  const t1 = await talepOlustur({
    ...temel, telefon: numara(), projeId: proje.id, daireTipiId: daire.id,
    niyet: 'RANDEVU', butceMin: 4_000_000, butceMax: 6_000_000,
    odemeSekli: 'KREDI', saat: '18:00 sonrası', kaynak: 'proje-sayfasi',
  });
  bekle('talep açıldı', t1.tamam && !!t1.id, t1.hata ?? '');
  bekle('kod TLP- ile başlıyor', (t1.kod ?? '').startsWith('TLP-'), t1.kod ?? '');
  /* Kod RASTGELE, artan değil: `TLP-000042` toplam talep sayısını
     herkese açık ederdi — rakip de, başvuran firma da okuyabilirdi. */
  const t2 = await talepOlustur({ ...temel, telefon: numara(), projeId: proje.id });
  bekle('ikinci kodun sayı ilişkisi yok', t1.kod !== t2.kod && (t2.kod ?? '').length === t1.kod!.length);

  const kayit = await prisma.talep.findUniqueOrThrow({
    where: { id: t1.id! },
    select: {
      telefon: true, kvkkOnay: true, kvkkTarih: true, durum: true,
      niyet: true, odemeSekli: true, daireTipiId: true, atananId: true, eposta: true,
    },
  });
  bekle('telefon normalleşmiş kaydedildi', /^\d{10}$/.test(kayit.telefon), kayit.telefon);
  bekle('KVKK onayı ve tarihi yazıldı', kayit.kvkkOnay && !!kayit.kvkkTarih);
  bekle('yeni talep YENI durumunda', kayit.durum === 'YENI');
  bekle('e-posta verilmediyse null', kayit.eposta === null);
  bekle('kimseye atanmamış', kayit.atananId === null);

  console.log('\n═══ 5. Daire tipi projeye ait olmalı ═══');
  /* Daire tipi gizli alanla geliyor; başka bir projenin tipiyle
     eşleştirilirse satış ekibi o projede OLMAYAN bir daireyi
     konuşuyor. */
  const yanlis = await talepOlustur({
    ...temel, telefon: numara(), projeId: digerProje.id, daireTipiId: daire.id,
  });
  bekle('başka projenin daire tipi reddediliyor', !yanlis.tamam,
    yanlis.hata ?? '(kabul edildi)');
  const olmayanTip = await talepOlustur({
    ...temel, telefon: numara(), projeId: proje.id, daireTipiId: 'olmayan-tip-kimligi',
  });
  bekle('olmayan daire tipi reddediliyor', !olmayanTip.tamam);
  const olmayanProje = await talepOlustur({
    ...temel, telefon: numara(), projeId: 'olmayan-proje-kimligi',
  });
  bekle('olmayan proje reddediliyor', !olmayanProje.tamam);

  console.log('\n═══ 6. Mükerrer talep yutuluyor ═══');
  const tekrarNo = numara();
  const a = await talepOlustur({ ...temel, telefon: tekrarNo, projeId: proje.id });
  const b = await talepOlustur({ ...temel, telefon: tekrarNo, projeId: proje.id });
  bekle('ilk talep kayıt açtı', a.tamam && !!a.id);
  /* İkinci istek BAŞARILI dönüyor ama kayıt açmıyor: ziyaretçiye
     "zaten gönderdiniz" demek gereksiz, çift tıklama onun hatası
     değil. `id` boş olduğu için bildirim de tetiklenmiyor. */
  bekle('ikinci talep başarılı görünüyor', b.tamam);
  bekle('ikinci talep kayıt açmadı', !b.id);
  bekle('veritabanında tek satır var',
    (await prisma.talep.count({ where: { telefon: tekrarNo } })) === 1);

  /* BAŞKA projeye aynı numaradan gelen talep mükerrer DEĞİL: aynı
     kişi iki proje soruyor olabilir ve ikisi de aranmalı. */
  const farkli = await talepOlustur({ ...temel, telefon: tekrarNo, projeId: digerProje.id });
  bekle('başka projeye aynı numara ayrı talep', farkli.tamam && !!farkli.id);

  /* Penceresi geçmiş talep yeniden açılabilmeli: on gün sonra aynı
     kişi tekrar sorabilir. */
  await prisma.talep.updateMany({
    where: { telefon: tekrarNo, projeId: proje.id },
    data: { olusturma: new Date(Date.now() - 11 * 60_000) },
  });
  const sonra = await talepOlustur({ ...temel, telefon: tekrarNo, projeId: proje.id });
  bekle('pencere kapanınca yeni talep açılıyor', sonra.tamam && !!sonra.id);

  console.log('\n═══ 7. Projesiz genel talep ═══');
  /* Ana sayfadaki "size uygun projeyi bulalım" formu projesiz geliyor;
     reddedilirse o form hiç çalışmaz. */
  const genel = await talepOlustur({ ...temel, telefon: numara() });
  bekle('projesiz talep kabul ediliyor', genel.tamam && !!genel.id, genel.hata ?? '');

  console.log('\n═══ 8. Sayaçlar ═══');
  const bekleyen = await bekleyenTalepSayisi();
  bekle('bekleyen sayacı gerçek satırla uyuşuyor',
    bekleyen === (await prisma.talep.count({ where: { durum: 'YENI' } })), `${bekleyen}`);

  const niyetler = await bekleyenNiyetSayisi();
  bekle('niyet sayacında dört anahtar var', Object.keys(niyetler).length === 4);
  bekle('niyet toplamı bekleyen sayısına eşit',
    Object.values(niyetler).reduce((t, n) => t + n, 0) === bekleyen,
    `${Object.values(niyetler).reduce((t, n) => t + n, 0)} / ${bekleyen}`);
  bekle('randevu niyeti sayılmış', niyetler.RANDEVU > 0, `${niyetler.RANDEVU}`);

  console.log('\n═══ 9. Kod ile durum sorgusu ═══');
  const sorgu = await talepDurumu(t1.kod!);
  bekle('kod ile talep bulunuyor', sorgu?.kod === t1.kod);
  bekle('sorgu projeyi de veriyor', sorgu?.proje?.ad === 'ZZTALEP Proje');
  bekle('küçük harfli kod da çalışıyor',
    (await talepDurumu(t1.kod!.toLowerCase()))?.kod === t1.kod);
  /* Sorgu telefon ve notu DÖNDÜRMÜYOR: kod tahmin edilebilir olmasa
     da adres çubuğuna yazılabiliyor; kişisel veriyi kod bilenin
     eline vermek gereksiz. */
  bekle('sorgu kişisel veri sızdırmıyor',
    !Object.keys(sorgu ?? {}).includes('telefon')
    && !Object.keys(sorgu ?? {}).includes('not'));
  bekle('olmayan kod null dönüyor', (await talepDurumu('TLP-XXXXXX')) === null);

  console.log('\n═══ 10. Temizlik ═══');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.talep.count({ where: { ad: { startsWith: 'ZZTALEP' } } })) === 0);

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
