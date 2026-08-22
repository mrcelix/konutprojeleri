import 'dotenv/config';
import { prisma } from '../lib/db';
import { blokOzeti, bloklariDenetle, govdeCozumle, sssCozumle } from '../lib/icerik-bicim';
import { site } from '../lib/site';
import { blokAyikla, govdeMetne, sayfalariOku, sssAyikla, sssMetne } from '../lib/icerik';
import {
  METIN_ANAHTARLARI, METIN_GRUPLARI, metinTanimi, varsayilanMetin,
} from '../lib/metin-kayit';

/**
 * İçerik yönetimi testleri.
 *   node --conditions=react-server --import tsx scripts/test-icerik.ts
 *
 * Server action'lar oturum bağlamı gerektirdiği için doğrudan
 * çağrılamıyor; burada okuma katmanı, biçim çözümleme ve gidiş-dönüş
 * kayıpsızlığı test ediliyor. Panelin kendisi tarayıcıda uçtan uca
 * doğrulandı.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

/* Çözümleyiciler artık kopya DEĞİL: `lib/icerik-bicim.ts` içindeki
   gerçek fonksiyonlar sınanıyor. Önceden buraya yansıtılmış birer
   kopyaydılar — test geçiyordu ama yayına çıkan kodu sınamıyordu. */

/** JSONB anahtar sırasını korumuyor; karşılaştırma sıradan bağımsız. */
const duzle = (o: unknown): string => JSON.stringify(o, (_k, v) =>
  (v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v as object).sort(([a], [b]) => a.localeCompare(b)))
    : v));

const TEST_SLUG = 'zzz-test-icerik-sayfasi';

async function main() {
  await prisma.sayfa.deleteMany({ where: { slug: TEST_SLUG } });

  console.log('\n═══ 1. Metin kaydı ═══');
  bekle('kayıt boş değil', METIN_ANAHTARLARI.length > 20, `${METIN_ANAHTARLARI.length} metin`);
  bekle('her metnin Türkçesi var', METIN_ANAHTARLARI.every((a) => metinTanimi(a).tr.trim().length > 0));
  bekle('her metnin etiketi var', METIN_ANAHTARLARI.every((a) => metinTanimi(a).etiket.trim().length > 0));
  bekle('her metin bir gruba ait', METIN_ANAHTARLARI.every((a) => METIN_GRUPLARI.includes(metinTanimi(a).grup)));
  bekle('anahtarlar benzersiz', new Set(METIN_ANAHTARLARI).size === METIN_ANAHTARLARI.length);
  // İngilizcesi olmayan anahtar İngilizce sayfada Türkçesini gösterir;
  // sessizce boş kalmasındansa görünür bir eksiklik olsun
  bekle('İngilizcesi yoksa Türkçeye düşüyor', METIN_ANAHTARLARI.every((a) =>
    varsayilanMetin(a, 'en').length > 0));

  console.log('\n═══ 2. Değişken doldurma ═══');
  // `metinler()` unstable_cache kullanıyor ve yalnızca istek bağlamında
  // çalışıyor; burada aynı doldurma mantığı varsayılanlar üzerinden
  // sınanıyor. Üzerine yazma yolu tarayıcıda doğrulandı.
  /* `{proje}` ve `{bolge}` ORTAK LİSTEDE YOK: sayılar veriden geliyor
     ve çağrı yerinde geçiliyor (bkz. app/page.tsx). Burada da öyle
     sınanıyor — sabit bir varsayılan koymak, çağrıyı unutan bir
     sayfanın "0 proje" yazdığını gizlerdi. */
  const ORTAK: Record<string, string> = {
    marka: site.ad, unvan: site.unvan, yil: String(new Date().getFullYear()),
  };
  const m = (a: Parameters<typeof varsayilanMetin>[0], ek?: Record<string, string>) =>
    varsayilanMetin(a, 'tr').replace(/\{(\w+)\}/g, (tam, ad: string) => {
      const d = ek?.[ad] ?? ORTAK[ad];
      return d === undefined ? tam : d;
    });
  const rozet = m('anasayfa.hero.rozet', { proje: '8', bolge: '6' });
  bekle('{proje} çağrıda geçilen sayıyla değişiyor', rozet.includes('8'), rozet);
  bekle('{bolge} çağrıda geçilen sayıyla değişiyor', rozet.includes('6'));
  /* Geçilmezse OLDUĞU GİBİ kalıyor: eksik veri sessizce sıfıra
     dönüşmüyor, yer tutucu ekranda görünüyor ve fark ediliyor. */
  bekle('geçilmeyen yer tutucu olduğu gibi kalıyor',
    m('anasayfa.hero.rozet').includes('{proje}'));
  bekle('{marka} marka adıyla değişiyor', !m('altbilgi.telif').includes('{marka}'));
  const telif = m('altbilgi.telif');
  bekle('{yil} içinde bulunulan yıl', telif.includes(String(new Date().getFullYear())), telif);
  // Karşılığı olmayan yer tutucu SİLİNMİYOR: yöneticinin yazım hatası görünsün
  bekle('bilinmeyen yer tutucu olduğu gibi kalıyor',
    '{tanimsiz}'.replace(/\{(\w+)\}/g, (tam, ad: string) => ORTAK[ad] ?? tam) === '{tanimsiz}');

  console.log('\n═══ 3. Gövde biçimi ═══');
  const ornek = ['## Başlık', 'Bir paragraf.', '- ilk madde', '- ikinci madde', '---', 'İkinci blok.'].join('\n');
  const bloklar = govdeCozumle(ornek);
  bekle('iki blok üretiliyor', bloklar.length === 2, `${bloklar.length} blok`);
  bekle('## alt başlık oluyor', bloklar[0].h === 'Başlık');
  bekle('düz satır paragraf oluyor', bloklar[0].p === 'Bir paragraf.');
  bekle('- maddeleri liste oluyor', bloklar[0].liste?.length === 2);
  bekle('--- yeni blok açıyor', bloklar[1].p === 'İkinci blok.' && !bloklar[1].h);
  bekle('boş girdi blok üretmiyor', govdeCozumle('\n\n   \n').length === 0);
  bekle('yalnız --- blok üretmiyor', govdeCozumle('---\n---').length === 0);
  // HTML kabul edilmiyor: panelden XSS yazılamasın
  const html = govdeCozumle('<script>alert(1)</script>');
  bekle('HTML düz metin paragraf oluyor', html[0].p === '<script>alert(1)</script>' && !html[0].h);

  console.log('\n═══ 4. SSS biçimi ═══');
  const sss = sssCozumle('Soru bir? | Cevap bir.\nSoru iki? | Cevap | boru içeren.');
  bekle('iki soru ayrışıyor', sss.length === 2);
  bekle('ilk borudan sonrası cevap', sss[1].c === 'Cevap | boru içeren.', sss[1].c);
  bekle('borusuz satır atlanıyor', sssCozumle('borusuz satır').length === 0);
  bekle('yarım satır atlanıyor', sssCozumle('soru |').length === 0);

  console.log('\n═══ 5. Gidiş-dönüş kayıpsızlığı ═══');
  const hepsi = await prisma.sayfa.findMany();
  bekle('göç edilmiş sayfalar var', hepsi.length >= 12, `${hepsi.length} sayfa`);
  let bozuk = 0;
  for (const s of hepsi) {
    const govde = s.govde as never as { h?: string; p?: string; liste?: string[] }[];
    const sssHam = s.sss as never as { s: string; c: string }[] | null;
    if (duzle(govde) !== duzle(govdeCozumle(govdeMetne(govde)))) { bozuk++; console.log(`    ✗ govde /${s.slug}`); }
    if (duzle(sssHam ?? []) !== duzle(sssCozumle(sssMetne(sssHam ?? undefined)))) { bozuk++; console.log(`    ✗ sss /${s.slug}`); }
  }
  bekle('düzenleyiciden geçen içerik bozulmuyor', bozuk === 0, `${hepsi.length} sayfa denendi`);

  console.log('\n═══ 6. Okuma katmanı ═══');
  const trSayfalar = await sayfalariOku('TR');
  const enSayfalar = await sayfalariOku('EN');
  bekle('Türkçe sayfalar okunuyor', trSayfalar.length >= 7, `${trSayfalar.length} sayfa`);
  bekle('İngilizce sayfalar ayrı', enSayfalar.length >= 6, `${enSayfalar.length} sayfa`);
  bekle('slug ile sayfa bulunuyor',
    (trSayfalar.find((x) => x.slug === 'nasil-calisir')?.h1.length ?? 0) > 0);
  bekle('Türkçe sayfa İngilizcede yok', !enSayfalar.some((x) => x.slug === 'nasil-calisir'));
  bekle('her sayfanın gövdesi dolu', trSayfalar.every((x) => x.govde.length > 0));

  // Bozuk JSON sayfayı çökertmemeli — sütun tipi bunu güvence altına almıyor
  bekle('bozuk gövde JSON boş listeye düşüyor',
    blokAyikla('metin değil').length === 0 && blokAyikla([null, 42, {}]).length === 0);
  bekle('geçerli blok ayıklanıyor',
    blokAyikla([{ h: 'B', p: 'P', liste: ['a', '', 'b'] }])[0].liste?.length === 2);
  bekle('eksik alanlı SSS atlanıyor',
    sssAyikla([{ s: 'x' }, { s: 'a', c: 'b' }])?.length === 1);

  console.log('\n═══ 7. Yayın durumu ═══');
  const taslak = await prisma.sayfa.create({
    data: {
      slug: TEST_SLUG, dil: 'TR', baslik: 'Test sayfası başlığı',
      h1: 'Test sayfası', aciklama: 'x'.repeat(60),
      govde: [{ p: 'Test içeriği.' }], yayinda: false,
    },
  });
  bekle('taslak sayfa yayında değil',
    !(await sayfalariOku('TR')).some((x) => x.slug === TEST_SLUG));

  let cakisma = false;
  try {
    await prisma.sayfa.create({
      data: {
        slug: TEST_SLUG, dil: 'TR', baslik: 'Aynı adres', h1: 'x',
        aciklama: 'y'.repeat(60), govde: [{ p: 'z' }],
      },
    });
  } catch { cakisma = true; }
  bekle('aynı dilde aynı adres açılamıyor', cakisma);

  const enAyni = await prisma.sayfa.create({
    data: {
      slug: TEST_SLUG, dil: 'EN', baslik: 'Same slug other language', h1: 'x',
      aciklama: 'y'.repeat(60), govde: [{ p: 'z' }],
    },
  });
  bekle('farklı dilde aynı adres açılabiliyor', !!enAyni.id);

  console.log('\n═══ 8. Temizlik ═══');
  await prisma.sayfa.deleteMany({ where: { slug: TEST_SLUG } });
  bekle('test sayfaları silindi',
    (await prisma.sayfa.count({ where: { slug: TEST_SLUG } })) === 0);
  bekle('kalıcı sayfalar duruyor', (await prisma.sayfa.count()) === hepsi.length,
    `${await prisma.sayfa.count()} sayfa`);
  void taslak;

    console.log(`
=== Blok JSON denetimi (Faz 57) ===`);
  bekle('dizi olmayan reddediliyor', bloklariDenetle({ h: 'x' }) === null);
  bekle('bos dizi bos donuyor', (bloklariDenetle([]) ?? ['x']).length === 0);
  const denetli = bloklariDenetle([
    { h: '  Baslik  ', p: 'Bir   paragraf', liste: ['madde', '  ', 'iki'] },
    { h: '', p: '' },
    { h: 'x', zararli: '<script>', bilinmeyen: 1 },
    'metin',
  ]);
  bekle('gecerli bloklar kaldi', denetli!.length === 2, `${denetli!.length}`);
  bekle('bosluk kirpildi', denetli![0].h === 'Baslik', denetli![0].h);
  bekle('ic bosluk sadelesti', denetli![0].p === 'Bir paragraf', denetli![0].p);
  bekle('bos madde atildi', denetli![0].liste!.length === 2, `${denetli![0].liste!.length}`);
  /* Taninmayan alanlar TASINMIYOR: istemciden gelen sekle guvenilmiyor. */
  bekle('bilinmeyen alan tasinmadi',
    Object.keys(denetli![1]).every((k) => ['h', 'p', 'liste'].includes(k)),
    Object.keys(denetli![1]).join(','));
  bekle('bos blok atildi', !denetli!.some((b) => Object.keys(b).length === 0));
  const uzun = bloklariDenetle([{ p: 'x'.repeat(5000) }]);
  bekle('uzun paragraf kirpildi', uzun![0].p!.length === 4000, `${uzun![0].p!.length}`);
  bekle('blok sayisi sinirli', bloklariDenetle(Array.from({ length: 60 }, () => ({ p: 'a' })))!.length === 40);

  console.log(`
=== Blok ozeti (Faz 52) ===`);
  const oz = govdeCozumle('## Baslik\nBir paragraf metin.\n- madde bir\n- madde iki');
  bekle('tek blok cikti', oz.length === 1, `${oz.length}`);
  bekle('ozet basligi sayiyor', blokOzeti(oz[0]).includes('başlık'), blokOzeti(oz[0]));
  bekle('ozet madde sayiyor', blokOzeti(oz[0]).includes('2 madde'), blokOzeti(oz[0]));
  bekle('bos blok ozeti bos', blokOzeti({}) === '');

console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
  await prisma.$disconnect();
  process.exit(kalan === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.sayfa.deleteMany({ where: { slug: TEST_SLUG } }).catch(() => {});
  await prisma.$disconnect();
  process.exit(1);
});
