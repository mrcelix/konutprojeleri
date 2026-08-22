import 'dotenv/config';
import { parolaDogrula, parolaHashle } from '../lib/auth';
import { prisma } from '../lib/db';
import { bekleyenIsler, firmaProjeleri, huni, kpiHesapla, projePerformansi } from '../lib/analitik';

/**
 * Panel yetkilendirme ve analitik testleri.
 *   node --conditions=react-server --import tsx scripts/test-panel.ts
 */

let gecen = 0, kalan = 0, atlanan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

/* KURULUMA BAĞLI iddialar ayrı işaretleniyor. Yönetici hesabı ortam
   değişkeniyle açılıyor ve talep geçmişi ayrı bir tohum türü; ikisi de
   KOD DOĞRULUĞUNUN parçası değil. Kayıt yokken bunları "kaldı" saymak,
   kodda hiçbir sorun yokken kırmızı bir test tablosu üretiyordu.
   Atlanan iddia sessizce geçmiyor: sebebiyle birlikte yazılıyor. */
const atla = (ad: string, sebep: string) => {
  console.log(`  ~ ${ad} — atlandı: ${sebep}`);
  atlanan++;
};

async function main() {
  console.log('\n═══ 1. Parola güvenliği ═══');
  const hash = await parolaHashle('gizliParola123');
  bekle('hash düz parola içermiyor', !hash.includes('gizliParola123'));
  bekle('scrypt biçiminde', hash.startsWith('scrypt$'), hash.slice(0, 30) + '…');
  bekle('doğru parola kabul edilir', await parolaDogrula('gizliParola123', hash));
  bekle('yanlış parola reddedilir', !(await parolaDogrula('gizliParola124', hash)));
  bekle('bozuk hash reddedilir', !(await parolaDogrula('x', 'bozuk')));

  const h2 = await parolaHashle('gizliParola123');
  bekle('aynı parola farklı hash üretir (tuz)', hash !== h2);

  console.log('\n═══ 2. Kullanıcı ve kapsam ═══');
  const admin = await prisma.kullanici.findFirst({ where: { rol: 'ADMIN' } });
  if (admin) {
    bekle('yönetici hesabı var', admin.rol === 'ADMIN');
    bekle('yöneticinin firma bağı yok', admin.firmaId === null);
  } else {
    atla('yönetici hesabı', 'YONETICI_PAROLA ile tohumlanmamış');
    atla('yöneticinin firma bağı yok', 'yönetici hesabı yok');
  }

  /* Firma kaydına BAĞLI bir hesap aranıyor. Yalnızca role bakmak,
     başka bir sınama sırasında rolü FIRMA'ya yükseltilmiş ama henüz
     bir firma kaydına bağlanmamış bir hesabı seçebiliyordu; testler
     paralel koştuğunda bu, kendi hatası olmayan bir kalma
     üretiyordu. */
  const firmaKullanici = await prisma.kullanici.findFirst({
    where: { rol: 'FIRMA', firmaId: { not: null } },
    select: { id: true, firmaId: true },
  });

  /* Kapsam daraltma FİRMA HESABI OLMADAN da sınanabilir: kapsam bir
     proje kimliği listesi, hesaba değil firmaya bağlı. Hesap yoksa
     ilk firmanın projeleri kullanılıyor — sınanan davranış aynı. */
  const kapsamFirmasi = firmaKullanici?.firmaId
    ?? (await prisma.firma.findFirst({
      where: { projeler: { some: {} } }, select: { id: true },
    }))?.id;

  if (firmaKullanici) {
    bekle('firma hesabı var', true);
    bekle('firma bir kayda bağlı', !!firmaKullanici.firmaId);
  } else {
    atla('firma hesabı', 'panel hesabı açılmamış');
    atla('firma bir kayda bağlı', 'panel hesabı açılmamış');
  }

  const kendiProjeleri = kapsamFirmasi ? await firmaProjeleri(kapsamFirmasi) : [];
  bekle('kapsam firmasının projesi var', kendiProjeleri.length > 0,
    `${kendiProjeleri.length} proje`);

  console.log('\n═══ 3. Analitik kapsamı ═══');
  const yilBasi = new Date(new Date().getFullYear() - 1, 0, 1);
  const simdi = new Date();

  const tumu = await kpiHesapla(yilBasi, simdi, null);
  const kendi = await kpiHesapla(yilBasi, simdi, kendiProjeleri);
  /* Talep sayısı VERİYE bağlı: boş bir kurulumda sıfır olması doğru.
     Sınanan şey rakamın büyüklüğü değil, hesabın tutarlılığı. */
  if (tumu.talep > 0) bekle('tüm envanterde talep var', true, `${tumu.talep} talep`);
  else atla('tüm envanterde talep var', 'talep geçmişi tohumlanmamış');
  bekle('firma kapsamı daha dar', kendi.talep <= tumu.talep,
    `${kendi.talep} ≤ ${tumu.talep}`);
  bekle('satış talebi aşmıyor', tumu.satis <= tumu.talep);
  bekle('dönüşüm oranı 0–100 arasında',
    tumu.donusumOrani >= 0 && tumu.donusumOrani <= 100, `%${tumu.donusumOrani}`);
  /* Form dönüşümü tekil ZİYARETÇİYE bölünüyor, görüntülemeye değil:
     aynı kişinin beş sayfa gezmesi dönüşümü beşe bölmemeli. */
  bekle('form dönüşümü ziyaretçiye göre', tumu.ziyaretci <= tumu.ziyaret,
    `${tumu.ziyaretci} ≤ ${tumu.ziyaret}`);

  /* BOŞ KAPSAM ile NULL farklı: `null` "tüm envanter", `[]` "hiçbir
     proje". İkisi karışırsa henüz projesi olmayan bir firma, panelde
     tüm sitenin rakamlarını görür. */
  const bosKapsam = await kpiHesapla(yilBasi, simdi, []);
  bekle('boş kapsam sıfır döner', bosKapsam.talep === 0 && bosKapsam.satis === 0);

  console.log('\n═══ 4. Huni ═══');
  const h = await huni(yilBasi, simdi, null);
  bekle('dört adım üretiliyor', h.length === 4, h.map((a) => a.ad).join(' → '));
  /* Huni KÜMÜLATİF: her adım bir öncekinin alt kümesi. Değilse
     grafikte aşağı inerken genişleyen bir şekil çıkıyor ve rakam
     okunamıyor. */
  bekle('adımlar daralıyor',
    h.every((a, i) => i === 0 || h[i - 1].sayi >= a.sayi),
    h.map((a) => a.sayi).join(' ≥ '));
  bekle('ilk adım toplam talep', h[0].sayi === tumu.talep, `${h[0].sayi} / ${tumu.talep}`);
  bekle('son adım satış', h[3].sayi === tumu.satis);
  bekle('geçiş oranları 0–100', h.every((a) => a.gecis >= 0 && a.gecis <= 100));

  console.log('\n═══ 5. Proje performansı ═══');
  const perf = await projePerformansi(yilBasi, simdi, null);
  bekle('performans listesi doldu', perf.length > 0, `${perf.length} proje`);
  bekle('her satırda firma adı var', perf.every((v) => v.firma.length > 0));
  bekle('talep azalan sırada', perf.every((v, i) => i === 0 || perf[i - 1].talep >= v.talep));
  /* Talep sayısı tek başına yanıltıcı: dün yayına giren bir projenin
     az talep alması normal. `yayindaGun` o bağlamı taşıyor. */
  bekle('yayında gün sayısı negatif değil', perf.every((v) => v.yayindaGun >= 0));
  bekle('satış talebi aşmıyor', perf.every((v) => v.satis <= v.talep));

  const darPerf = await projePerformansi(yilBasi, simdi, kendiProjeleri);
  bekle('firma yalnızca kendi projelerini görüyor',
    darPerf.every((v) => kendiProjeleri.includes(v.id)));

  console.log('\n═══ 6. Bekleyen iş sayaçları ═══');
  const isler = await bekleyenIsler(null);
  bekle('sayaçlar negatif değil',
    isler.yeniTalep >= 0 && isler.okunmamisMesaj >= 0 && isler.bekleyenRandevu >= 0);
  const yeniSayisi = await prisma.talep.count({ where: { durum: 'YENI' } });
  bekle('yeni talep sayısı doğru', isler.yeniTalep === yeniSayisi, `${isler.yeniTalep}`);
  /* Geciken, yeninin ALT KÜMESİ: dört saati geçmiş YENİ talepler.
     Ayrı sayılıyor çünkü satış ekibinin bakması gereken tek gerçek
     uyarı bu. */
  bekle('geciken talep yeninin alt kümesi', isler.gecikenTalep <= isler.yeniTalep,
    `${isler.gecikenTalep} ≤ ${isler.yeniTalep}`);

  /* Firma başvuruları proje kapsamına bağlı değil — henüz projesi
     olmayan firmadan geliyor ve firma panelinde 0 kalmalı. */
  const firmaIsleri = await bekleyenIsler(kendiProjeleri);
  bekle('firma panelinde başvuru sayacı sıfır', firmaIsleri.yeniBasvuru === 0);

  console.log('\n═══ 7. Oturum güvenliği ═══');
  const oturumlar = await prisma.oturum.findMany({ take: 5, select: { tokenHash: true } });
  bekle('oturum tablosunda düz token yok',
    oturumlar.every((o) => o.tokenHash.length === 64 && /^[a-f0-9]+$/.test(o.tokenHash)),
    `${oturumlar.length} oturum, hepsi SHA-256 özeti`);

  console.log('\n═══ 8. Mesajlaşma ═══');
  const konusma = await prisma.konusma.findFirst({
    select: {
      proje: { select: { ad: true } },
      mesajlar: { select: { soranMi: true }, orderBy: { olusturma: 'asc' } },
    },
  });
  if (konusma) {
    bekle('konuşma bir projeye bağlı', !!konusma.proje);
    bekle('konuşmanın en az bir mesajı var', konusma.mesajlar.length > 0);
    bekle('ilk mesaj soran taraftan', konusma.mesajlar[0]?.soranMi === true);
  } else {
    atla('mesajlaşma akışı', 'hiç ziyaretçi sorusu yok');
  }

  const atlandiNot = atlanan ? ` · ${atlanan} atlandı (kuruluma bağlı)` : '';
  console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı${atlandiNot}\n`);
  await prisma.$disconnect();
  process.exit(kalan === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
