import 'dotenv/config';
import { prisma } from '../lib/db';
import {
  basvuruGoruseldi, basvuruKaydet, basvuruOnayla, basvuruReddet,
} from '../lib/basvuru';

/**
 * Geliştirici firma başvurusu testleri.
 *   node --conditions=react-server --import tsx scripts/test-basvuru.ts
 *
 * Server action oturum bağlamı gerektirdiği için doğrudan
 * çağrılamıyor; doğrulama, mükerrer başvuru ve firma kaydına dönüşüm
 * burada. Form tarayıcıda uçtan uca doğrulandı.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const EPOSTA = 'zzz-basvuru@ornek.test';
const EPOSTA2 = 'zzz-basvuru-iki@ornek.test';

const gecerli = {
  ad: 'Deniz Aydın', eposta: EPOSTA, telefon: '0532 111 22 33',
  firmaAd: 'ZZZ Başvuru Yapı', bolge: 'Ataşehir, Barbaros',
  projeSayisi: 2, mesaj: 'İki projemiz satışta.',
};

async function temizle() {
  for (const e of [EPOSTA, EPOSTA2]) {
    await prisma.firmaBasvuru.deleteMany({ where: { eposta: e } });
    await prisma.firma.deleteMany({ where: { eposta: e } });
  }
  await prisma.firma.deleteMany({ where: { ad: { startsWith: 'ZZZ Başvuru' } } });
}

async function main() {
  await temizle();

  console.log('\n═══ 1. Doğrulama ═══');
  const kotu = async (ek: Partial<typeof gecerli>) =>
    (await basvuruKaydet({ ...gecerli, ...ek }, null)).hata;

  bekle('kısa ad reddediliyor', !!(await kotu({ ad: 'Al' })));
  bekle('firma unvanı boşsa reddediliyor', !!(await kotu({ firmaAd: '' })));
  bekle('geçersiz e-posta reddediliyor', !!(await kotu({ eposta: 'deniz@ornek' })));
  // Telefon ZORUNLU: süreç telefonla ilerliyor, yerinde inceleme randevusu alınıyor
  bekle('telefon boşsa reddediliyor', !!(await kotu({ telefon: '' })));
  bekle('eksik haneli telefon reddediliyor', !!(await kotu({ telefon: '0532 111' })));
  bekle('boş bölge reddediliyor', !!(await kotu({ bolge: '' })));
  bekle('sıfır proje reddediliyor', !!(await kotu({ projeSayisi: 0 })));
  bekle('201 proje reddediliyor', !!(await kotu({ projeSayisi: 201 })));
  bekle('çok uzun mesaj reddediliyor', !!(await kotu({ mesaj: 'x'.repeat(1001) })));
  bekle('doğrulama hatasında kayıt açılmadı',
    (await prisma.firmaBasvuru.count({ where: { eposta: EPOSTA } })) === 0);

  // Hata dönüşü girilenleri geri vermeli — React 19 formu sıfırlıyor
  const hatali = await basvuruKaydet({ ...gecerli, ad: 'Al' }, null);
  bekle('hatada girilen değerler geri veriliyor',
    hatali.degerler?.eposta === EPOSTA && hatali.degerler?.bolge === 'Ataşehir, Barbaros');

  console.log('\n═══ 2. Kayıt ═══');
  const s = await basvuruKaydet(gecerli, '203.0.113.7');
  bekle('başvuru kaydediliyor', s.tamam === true, s.hata ?? '');

  const b = await prisma.firmaBasvuru.findFirstOrThrow({
    where: { eposta: EPOSTA },
    select: {
      durum: true, telefon: true, firmaAd: true, projeSayisi: true,
      mesaj: true, ip: true, firmaId: true,
    },
  });
  bekle('durum YENİ', b.durum === 'YENI');
  bekle('telefon E.164 normalleniyor', b.telefon.startsWith('+90'), b.telefon);
  bekle('firma unvanı kaydedildi', b.firmaAd === 'ZZZ Başvuru Yapı');
  bekle('proje sayısı kaydedildi', b.projeSayisi === 2);
  bekle('IP kaydediliyor', b.ip === '203.0.113.7');
  bekle('henüz firmaya bağlı değil', b.firmaId === null);

  console.log('\n═══ 3. Mükerrer başvuru ═══');
  // Aynı kişi formu iki kez gönderdiğinde ekip aynı işi iki kez aramamalı
  await basvuruKaydet({ ...gecerli, projeSayisi: 5, mesaj: 'Güncellendi.' }, null);
  const adet = await prisma.firmaBasvuru.count({ where: { eposta: EPOSTA } });
  bekle('ikinci gönderim yeni kayıt açmıyor', adet === 1, `${adet} kayıt`);
  const guncel = await prisma.firmaBasvuru.findFirstOrThrow({
    where: { eposta: EPOSTA }, select: { projeSayisi: true, mesaj: true },
  });
  bekle('mevcut başvuru güncelleniyor',
    guncel.projeSayisi === 5 && guncel.mesaj === 'Güncellendi.');

  console.log('\n═══ 4. Görüşüldü ═══');
  const b1 = await prisma.firmaBasvuru.findFirstOrThrow({
    where: { eposta: EPOSTA }, select: { id: true },
  });
  await basvuruGoruseldi(b1.id, '12.08 arandı, eylülde tekrar.');
  const gorusuldu = await prisma.firmaBasvuru.findUniqueOrThrow({
    where: { id: b1.id }, select: { durum: true, not: true },
  });
  bekle('durum GÖRÜŞÜLDÜ', gorusuldu.durum === 'GORUSULDU');
  bekle('not kaydedildi', gorusuldu.not?.includes('eylülde') === true);

  console.log('\n═══ 5. Onay → firma kaydı ═══');
  const onay = await basvuruOnayla(b1.id);
  bekle('onay başarılı', onay.tamam === true, onay.hata ?? '');
  bekle('firma kimliği dönüyor', !!onay.firmaId);

  const f = await prisma.firma.findFirstOrThrow({
    where: { eposta: EPOSTA },
    select: { ad: true, slug: true, telefon: true, ozet: true, yayinda: true },
  });
  bekle('firma unvanı başvurudan geliyor', f.ad === 'ZZZ Başvuru Yapı');
  bekle('slug unvandan üretiliyor', f.slug === 'zzz-basvuru-yapi', f.slug);
  bekle('telefon taşındı', f.telefon?.startsWith('+90') === true);
  bekle('özet boş bırakılmıyor', f.ozet.length > 10, f.ozet);
  /* Firma kaydı açılmakla sitede görünmeye HAK KAZANMIYOR: yerinde
     inceleme yapılıp projesi eklendikten sonra yayına alınıyor. Boş
     bir firma sayfası, arama sonucunda hiçbir şey olmayan bir adres. */
  bekle('firma yayında açılmıyor', f.yayinda === false);

  const sonrasi = await prisma.firmaBasvuru.findUniqueOrThrow({
    where: { id: b1.id }, select: { durum: true, firmaId: true, sonuclanma: true },
  });
  bekle('başvuru ONAYLANDI', sonrasi.durum === 'ONAYLANDI');
  bekle('firmaya bağlandı', !!sonrasi.firmaId);
  bekle('sonuçlanma damgalandı', sonrasi.sonuclanma instanceof Date);

  /* Panel hesabı BİLEREK açılmıyor: firma kaydı ilişkinin başlangıcı,
     panele erişim ayrı bir karar. Her onaya otomatik hesap açmak,
     paneli hiç kullanmayacak kişiler için kullanılmayan kimlik
     bilgisi üretirdi. */
  bekle('panel hesabı açılmıyor',
    (await prisma.kullanici.count({ where: { eposta: EPOSTA } })) === 0);

  bekle('ikinci onay reddediliyor', !!(await basvuruOnayla(b1.id)).hata);
  bekle('onaylanmış başvuru reddedilemiyor',
    !!(await basvuruReddet(b1.id, 'gerekçe metni yeterince uzun')).hata);

  console.log('\n═══ 6. Var olan firmayla çakışma ═══');
  /* Aynı e-posta ya da aynı slug'la firma zaten varsa YENİSİ
     açılmamalı. `Firma.eposta` tekil DEĞİL — bir grup şirketinin
     birden çok markası aynı adresi kullanabiliyor — o yüzden slug
     üzerinden de bakılıyor. */
  await basvuruKaydet({ ...gecerli, mesaj: 'İkinci tur.' }, null);
  const b2 = await prisma.firmaBasvuru.findFirstOrThrow({
    where: { eposta: EPOSTA, durum: 'YENI' }, select: { id: true },
  });
  const onay2 = await basvuruOnayla(b2.id);
  bekle('mevcut firmaya bağlanıyor', onay2.tamam === true, onay2.hata ?? '');
  bekle('ikinci firma kaydı açılmadı',
    (await prisma.firma.count({ where: { eposta: EPOSTA } })) === 1);

  console.log('\n═══ 7. Ret ═══');
  await basvuruKaydet({ ...gecerli, eposta: EPOSTA2, firmaAd: 'ZZZ Başvuru İkinci' }, null);
  const b3 = await prisma.firmaBasvuru.findFirstOrThrow({
    where: { eposta: EPOSTA2 }, select: { id: true },
  });
  // Gerekçe zorunlu: boş bırakılabilse kişi neden reddedildiğini öğrenemezdi
  bekle('kısa gerekçe reddediliyor', !!(await basvuruReddet(b3.id, 'olmaz')).hata);
  bekle('gerekçeyle ret çalışıyor',
    (await basvuruReddet(b3.id, 'Bu bölgede henüz hizmet vermiyoruz.')).tamam === true);
  const red = await prisma.firmaBasvuru.findUniqueOrThrow({
    where: { id: b3.id }, select: { durum: true, not: true },
  });
  bekle('durum REDDEDİLDİ', red.durum === 'REDDEDILDI');
  bekle('gerekçe saklandı', red.not?.includes('hizmet vermiyoruz') === true);
  bekle('reddedilenden firma açılmadı',
    (await prisma.firma.count({ where: { eposta: EPOSTA2 } })) === 0);

  // Reddedilen firma yeniden başvurabilmeli
  await basvuruKaydet({ ...gecerli, eposta: EPOSTA2, firmaAd: 'ZZZ Başvuru İkinci' }, null);
  bekle('reddedilen firma yeniden başvurabiliyor',
    (await prisma.firmaBasvuru.count({ where: { eposta: EPOSTA2 } })) === 2);

  console.log('\n═══ 8. Temizlik ═══');
  await temizle();
  bekle('test kayıtları silindi',
    (await prisma.firmaBasvuru.count({ where: { eposta: { startsWith: 'zzz-basvuru' } } })) === 0);

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
