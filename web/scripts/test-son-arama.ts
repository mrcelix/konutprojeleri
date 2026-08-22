import {
  aramaAnahtari, aramaEkle, aramaEtiketi, type SonArama,
} from '../lib/son-aramalar';

/**
 * Faz 56 son arama testleri.
 *   node --conditions=react-server --import tsx scripts/test-son-arama.ts
 *
 * Depolama katmanı (localStorage) sınanmıyor — tarayıcıya ait. Sınanan,
 * listenin ne zaman AYNI aramayı iki kez yazdığı: sayfa numarası ve
 * sıralama anahtara girseydi liste tek bir aramanın sayfalarıyla
 * dolardı ve özellik işe yaramazdı.
 *
 * Veritabanı gerekmiyor: hesap saf.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const P = (s: string) => new URLSearchParams(s);

console.log('\n=== 1. Etiket ===');
bekle('boş arama "Tüm projeler"', aramaEtiketi(P('')) === 'Tüm projeler', aramaEtiketi(P('')));
bekle('metin etikete giriyor',
  aramaEtiketi(P('q=Ataşehir')).startsWith('Ataşehir'), aramaEtiketi(P('q=Ataşehir')));
bekle('proje tipi yazılıyor',
  aramaEtiketi(P('q=Ataşehir&tip=OFIS')) === 'Ataşehir · Ofis',
  aramaEtiketi(P('q=Ataşehir&tip=OFIS')));
/* ODA aramanın ilk kararı: etikette görünmezse "2+1 Ataşehir" ile
   "4+1 Ataşehir" aynı satır olarak görünüyordu. */
bekle('oda sayıları etikete giriyor',
  aramaEtiketi(P('oda=2%2B1,3%2B1')) === 'Tüm projeler · 2+1 / 3+1',
  aramaEtiketi(P('oda=2%2B1,3%2B1')));
bekle('bütçe aralığı kısaltılıyor',
  aramaEtiketi(P('minFiyat=3000000&maxFiyat=6000000')) === 'Tüm projeler · 3 mn ₺ – 6 mn ₺',
  aramaEtiketi(P('minFiyat=3000000&maxFiyat=6000000')));
bekle('tek yanlı bütçe de yazılıyor',
  aramaEtiketi(P('maxFiyat=4250000')) === 'Tüm projeler · 4,3 mn ₺’ye kadar',
  aramaEtiketi(P('maxFiyat=4250000')));
bekle('teslim yılı yazılıyor',
  aramaEtiketi(P('teslim=2027-12-31')).endsWith('2027’e kadar teslim'),
  aramaEtiketi(P('teslim=2027-12-31')));
bekle('filtre sayısı',
  aramaEtiketi(P('f=guvenlik,metroyakin')).endsWith('2 filtre'),
  aramaEtiketi(P('f=guvenlik,metroyakin')));

console.log('\n=== 2. Anahtar ===');
bekle('boş sorgu anahtarsız', aramaAnahtari(P('')) === '');
bekle('yalnızca sayfa anahtarsız', aramaAnahtari(P('sayfa=3&limit=24')) === '');
/* Sayfa ve sıralama anahtara GİRMEMELİ: ikinci sayfaya geçmek yeni bir
   arama değil, aynı aramanın devamı. */
bekle('sayfa anahtarı değiştirmiyor',
  aramaAnahtari(P('q=Ataşehir&sayfa=1')) === aramaAnahtari(P('q=Ataşehir&sayfa=4')));
bekle('sıralama anahtarı değiştirmiyor',
  aramaAnahtari(P('q=Ataşehir&sirala=ucuz')) === aramaAnahtari(P('q=Ataşehir&sirala=teslim')));
bekle('filtre anahtarı değiştiriyor',
  aramaAnahtari(P('q=Ataşehir&f=guvenlik')) !== aramaAnahtari(P('q=Ataşehir')));
bekle('oda anahtarı değiştiriyor',
  aramaAnahtari(P('q=Ataşehir&oda=2%2B1')) !== aramaAnahtari(P('q=Ataşehir')));
bekle('bütçe anahtarı değiştiriyor',
  aramaAnahtari(P('q=Ataşehir&maxFiyat=6000000')) !== aramaAnahtari(P('q=Ataşehir')));
bekle('boş değerli parametre anahtara girmiyor',
  aramaAnahtari(P('q=Ataşehir&oda=')) === aramaAnahtari(P('q=Ataşehir')));

console.log('\n=== 3. Liste ===');
const yap = (sorgu: string, zaman = 1): SonArama => ({
  sorgu, anahtar: aramaAnahtari(P(sorgu)), etiket: aramaEtiketi(P(sorgu)), zaman,
});

let l: SonArama[] = [];
l = aramaEkle(l, yap('q=Ataşehir'));
l = aramaEkle(l, yap('q=Kalkan'));
bekle('yeni arama başa geliyor', l[0].etiket.startsWith('Kalkan'), l[0].etiket);
bekle('iki kayıt var', l.length === 2);

l = aramaEkle(l, yap('q=Ataşehir', 2));
bekle('tekrar eden arama kopyalanmıyor', l.length === 2, `${l.length}`);
bekle('tekrar eden arama başa taşınıyor', l[0].etiket.startsWith('Ataşehir'), l[0].etiket);

/* Sayfa numarası farklı olsa da aynı arama sayılmalı. */
l = aramaEkle(l, yap('q=Kalkan&sayfa=3'));
bekle('farklı sayfa yeni kayıt açmıyor', l.length === 2, `${l.length}`);

for (let i = 0; i < 10; i++) l = aramaEkle(l, yap(`q=Bolge${i}`));
bekle('liste altıyla sınırlı', l.length === 6, `${l.length}`);
bekle('en yeni başta', l[0].etiket.startsWith('Bolge9'), l[0].etiket);

console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
process.exit(kalan === 0 ? 0 : 1);
