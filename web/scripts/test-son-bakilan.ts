import { bakilanEkle, bakilanlariSuz, type BakilanProje } from '../lib/son-bakilan';

/**
 * Faz 58 son bakılan proje testleri.
 *   node --conditions=react-server --import tsx scripts/test-son-bakilan.ts
 *
 * Depolama (localStorage) sınanmıyor — tarayıcıya ait. Sınanan iki
 * kural: aynı proje listeye iki kez yazılmıyor ve AÇIK OLAN proje
 * kendi listesinde çıkmıyor. İkincisi olmadan "son baktıklarınız"
 * şu an bakılanı gösterirdi.
 *
 * Veritabanı gerekmiyor: hesap saf.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const v = (slug: string, zaman = 1): BakilanProje => ({
  slug, ad: `Proje ${slug}`, bolge: 'Ataşehir', fiyat: 4_000_000, gorsel: null, zaman,
});

console.log('\n=== 1. Listeye ekleme ===');
let l: BakilanProje[] = [];
l = bakilanEkle(l, v('a'));
l = bakilanEkle(l, v('b'));
bekle('yeni proje başa geliyor', l[0].slug === 'b', l[0].slug);
bekle('iki kayıt var', l.length === 2);

l = bakilanEkle(l, v('a', 2));
bekle('tekrar eden proje kopyalanmıyor', l.length === 2, `${l.length}`);
bekle('tekrar eden proje başa taşınıyor', l[0].slug === 'a', l[0].slug);
bekle('zaman damgası tazeleniyor', l[0].zaman === 2, `${l[0].zaman}`);

for (let i = 0; i < 12; i++) l = bakilanEkle(l, v(`x${i}`));
bekle('liste sekizle sınırlı', l.length === 8, `${l.length}`);
bekle('en yeni başta', l[0].slug === 'x11', l[0].slug);
bekle('en eski düştü', !l.some((x) => x.slug === 'a'));

console.log('\n=== 2. Açık proje süzülüyor ===');
const liste = [v('kas-1'), v('kas-2'), v('kas-3')];
bekle('hariç verilmezse hepsi kalıyor', bakilanlariSuz(liste).length === 3);
const suzulmus = bakilanlariSuz(liste, 'kas-2');
bekle('açık proje listede yok', !suzulmus.some((x) => x.slug === 'kas-2'));
bekle('diğerleri duruyor', suzulmus.length === 2, `${suzulmus.length}`);
bekle('listede olmayan slug zarar vermiyor',
  bakilanlariSuz(liste, 'yok-boyle-bir-proje').length === 3);

console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
process.exit(kalan === 0 ? 0 : 1);
