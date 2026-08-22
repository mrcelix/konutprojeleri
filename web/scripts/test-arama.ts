import 'dotenv/config';
import { aramaSorgusu, aramaIndeksiniYenile, oneriler } from '../lib/arama';
import { prisma } from '../lib/db';

/**
 * Arama motoru testleri.
 *   node --conditions=react-server --import tsx scripts/test-arama.ts
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

/* Vitrinde görünen satış aşamaları. Filtre verilmediğinde arama bunu
   uyguluyor: tükenen ya da teslim edilmiş projeyi listede göstermek,
   ziyaretçiyi satın alınamayacak bir sayfaya götürüyor. Testin
   "toplam" beklentileri bu yüzden `proje.count()` değil bu kümeye
   göre kuruluyor. */
const SATILABILIR = ['YAKINDA', 'SATISTA', 'SON_DAIRELER'] as const;

async function main() {
  console.log('\n═══ 1. İndeks bütünlüğü ═══');
  const yayinda = await prisma.proje.count({ where: { yayinda: true } });
  const indeks = await prisma.projeArama.count();
  bekle('her yayında proje indekste', indeks === yayinda, `${indeks} / ${yayinda}`);

  const yenilenen = await aramaIndeksiniYenile();
  bekle('indeks yeniden kurulabiliyor', yenilenen > 0, `${yenilenen} satır`);

  const vitrinde = await prisma.proje.count({
    where: { yayinda: true, durum: { in: [...SATILABILIR] } },
  });

  console.log('\n═══ 2. Aksan duyarsızlığı ═══');
  /* Türkçe klavyesiz yazan ziyaretçi gerçek: "atasehir" yazan kişi
     "Ataşehir" bekliyor. `tr_unaccent` yapılandırması bunu indeks
     tarafında çözüyor; test iki yazımın AYNI sonucu verdiğini
     kovalıyor. */
  const ciftler: [string, string][] = [
    ['atasehir', 'ataşehir'], ['basaksehir', 'başakşehir'],
    ['cankaya', 'çankaya'], ['nilufer', 'nilüfer'],
    ['yesilova', 'yeşilova'],
  ];
  for (const [aksansiz, aksanli] of ciftler) {
    const a = await aramaSorgusu({ q: aksansiz });
    const b = await aramaSorgusu({ q: aksanli });
    bekle(`"${aksansiz}" = "${aksanli}"`, a.toplam === b.toplam && a.toplam > 0,
      `${a.toplam} / ${b.toplam}`);
  }

  console.log('\n═══ 3. Alaka sıralaması ═══');
  const bolgeAdi = (await prisma.bolge.findFirstOrThrow({
    where: { projeler: { some: { yayinda: true, durum: { in: [...SATILABILIR] } } } },
    select: { ad: true },
  })).ad;
  const bolgeArama = await aramaSorgusu({ q: bolgeAdi });
  bekle('sonuç var', bolgeArama.toplam > 0, `${bolgeArama.toplam}`);
  bekle(`hepsi ${bolgeAdi} bölgesinden`, bolgeArama.sonuclar.every((s) => s.bolge === bolgeAdi));
  bekle('skorlar azalan sırada',
    bolgeArama.sonuclar.every((s, i) => i === 0 || bolgeArama.sonuclar[i - 1].skor >= s.skor));

  // Proje adı (A ağırlığı) özet içindeki geçişten (D) önce gelmeli
  const proje = await prisma.proje.findFirst({
    where: { yayinda: true, durum: { in: [...SATILABILIR] } }, select: { ad: true },
  });
  const adAramasi = await aramaSorgusu({ q: proje!.ad });
  bekle('proje adı aramasında o proje ilk sırada',
    adAramasi.sonuclar[0]?.ad === proje!.ad, adAramasi.sonuclar[0]?.ad);

  /* FİRMA ADIYLA ARAMA (B ağırlığı): konut alıcısının önemli bir
     kısmı müteahhit adıyla arıyor. Bu eşleşme yoksa "Meridyen
     projeleri" araması boş dönüyor. */
  const firma = await prisma.firma.findFirst({
    where: { projeler: { some: { yayinda: true, durum: { in: [...SATILABILIR] } } } },
    select: { ad: true },
  });
  const firmaArama = await aramaSorgusu({ q: firma!.ad.split(' ')[0] });
  bekle('firma adıyla arama sonuç veriyor', firmaArama.toplam > 0,
    `${firma!.ad} → ${firmaArama.toplam}`);

  /* DAİRE TİPİYLE ARAMA (C ağırlığı): "3+1" arayan kişi o tipin
     bulunduğu projeleri görmeli. Oda sayısı metin ("4.5+1" gerçek bir
     kategori) olduğu için indekse metin olarak giriyor. */
  const odaArama = await aramaSorgusu({ q: '3+1' });
  bekle('daire tipiyle arama sonuç veriyor', odaArama.toplam > 0, `${odaArama.toplam}`);

  console.log('\n═══ 4. Yazım hatası toleransı ═══');
  const hatali = await aramaSorgusu({ q: 'atasehirr' });
  bekle('hatalı yazımda öneri dönüyor', hatali.oneri === 'Ataşehir', hatali.oneri ?? '(yok)');
  const anlamsiz = await aramaSorgusu({ q: 'qwertyuiop' });
  bekle('anlamsız aramada sonuç yok', anlamsiz.toplam === 0);
  bekle('anlamsız aramada uydurma öneri yok', anlamsiz.oneri === null, anlamsiz.oneri ?? 'null');

  console.log('\n═══ 5. Filtreler ═══');
  const hepsi = await aramaSorgusu({});
  bekle('filtresiz yalnızca satılabilir projeler', hepsi.toplam === vitrinde,
    `${hepsi.toplam} / ${vitrinde}`);
  bekle('tükenmiş proje varsayılan listede yok',
    hepsi.sonuclar.every((s) => (SATILABILIR as readonly string[]).includes(s.durum)));

  /* KARMA proje HEM konut HEM ofis filtresinde çıkıyor: içinde ikisi
     de var ve alıcı hangi taraftan gelirse gelsin görmesi gerekiyor.
     Bu yüzden iddia "tip birebir eşleşiyor" değil, "tip ya aranan ya
     KARMA". */
  const konut = await aramaSorgusu({ tip: 'KONUT' });
  bekle('konut filtresi karma projeyi de kapsıyor',
    konut.sonuclar.every((s) => s.tip === 'KONUT' || s.tip === 'KARMA'),
    `${konut.toplam} proje`);
  bekle('konut filtresinde ofis yok',
    !konut.sonuclar.some((s) => s.tip === 'OFIS'));

  const ofis = await aramaSorgusu({ tip: 'OFIS' });
  bekle('ofis filtresi karma projeyi de kapsıyor',
    ofis.sonuclar.every((s) => s.tip === 'OFIS' || s.tip === 'KARMA'),
    `${ofis.toplam} proje`);
  bekle('ofis filtresinde konut yok',
    !ofis.sonuclar.some((s) => s.tip === 'KONUT'));

  /* KARMA doğrudan arandığında YALNIZCA karma dönüyor: "karma proje
     istiyorum" diyen kişi tek fonksiyonlu projeleri görmemeli. */
  const karma = await aramaSorgusu({ tip: 'KARMA' });
  bekle('karma filtresi yalnızca karma veriyor',
    karma.sonuclar.every((s) => s.tip === 'KARMA'), `${karma.toplam} proje`);

  const ucuz = await aramaSorgusu({ maxFiyat: 6_000_000 });
  /* Fiyat tavanı BAŞLANGIÇ fiyatına bakıyor: "6 milyona kadar" diyen
     kişi, en küçük tipi 6 milyonun altında olan projeyi görmek
     istiyor — projenin en pahalı dairesi 12 milyon olsa bile. */
  bekle('fiyat tavanı başlangıç fiyatına uygulanıyor',
    ucuz.sonuclar.every((s) => s.fiyatMin <= 6_000_000), `${ucuz.toplam} proje`);

  const pahali = await aramaSorgusu({ minFiyat: 5_000_000 });
  bekle('fiyat tabanı doğru', pahali.sonuclar.every((s) => (s.fiyatMax ?? s.fiyatMin) >= 5_000_000));

  const kredi = await aramaSorgusu({ krediyeUygun: true });
  bekle('kredi filtresi doğru', kredi.sonuclar.every((s) => s.krediyeUygun));

  const oda = await aramaSorgusu({ oda: ['2+1', '3+1'] });
  /* Oda filtresi VEYA: "2+1 ya da 3+1 arıyorum" diyen kişi ikisinden
     birine sahip her projeyi görmeli. Özellik filtresi ise VE. */
  bekle('oda filtresi VEYA mantığıyla',
    oda.sonuclar.every((s) => s.odalar.includes('2+1') || s.odalar.includes('3+1')),
    `${oda.toplam} proje`);

  const iki = await aramaSorgusu({ ozellikler: ['guvenlik', 'kapaliotopark'] });
  bekle('çoklu özellik VE mantığıyla',
    iki.sonuclar.every((s) => s.ozellikler.includes('guvenlik')
      && s.ozellikler.includes('kapaliotopark')),
    `${iki.toplam} proje`);
  bekle('çoklu özellik tekliden dar veya eşit',
    iki.toplam <= (await aramaSorgusu({ ozellikler: ['guvenlik'] })).toplam);

  console.log('\n═══ 6. Ödeme filtreleri ═══');
  /* Peşinat süzgeci SIFIRI DIŞARIDA bırakıyor: peşinat oranı 0
     "peşinatsız" değil "belirtilmemiş" demek. Sıfırları içeri almak,
     "en fazla %20 peşinat" arayan kişiye peşinatı bilinmeyen projeleri
     peşinatsız diye gösterirdi. */
  const dusukPesinat = await aramaSorgusu({ maxPesinat: 25 });
  bekle('peşinat süzgeci belirtilmemişleri eliyor',
    dusukPesinat.sonuclar.every((s) => s.pesinatOrani > 0 && s.pesinatOrani <= 25),
    `${dusukPesinat.toplam} proje`);

  const uzunVade = await aramaSorgusu({ minVade: 24 });
  bekle('vade tabanı doğru', uzunVade.sonuclar.every((s) => s.taksitAyi >= 24),
    `${uzunVade.toplam} proje`);

  console.log('\n═══ 7. Teslim tarihi ═══');
  const sinir = new Date();
  sinir.setUTCFullYear(sinir.getUTCFullYear() + 2);
  const yakinTeslim = await aramaSorgusu({ maxTeslim: sinir });
  bekle('teslim tavanı doğru',
    yakinTeslim.sonuclar.every((s) => s.teslimTarihi !== null && s.teslimTarihi <= sinir),
    `${yakinTeslim.toplam} proje`);
  /* Teslim tarihi GİRİLMEMİŞ proje süzgeçte çıkmamalı: "2 yıl içinde
     teslim" arayan kişiye tarihi bilinmeyen projeyi göstermek,
     tutulamayacak bir söz vermek olurdu. */
  bekle('tarihi bilinmeyen proje teslim süzgecinde yok',
    yakinTeslim.sonuclar.every((s) => s.teslimTarihi !== null));

  console.log('\n═══ 8. Sıralama ═══');
  const ucuzS = await aramaSorgusu({ sirala: 'ucuz' });
  bekle('ucuz: artan fiyat',
    ucuzS.sonuclar.every((s, i) => i === 0 || ucuzS.sonuclar[i - 1].fiyatMin <= s.fiyatMin));
  const pahaliS = await aramaSorgusu({ sirala: 'pahali' });
  bekle('pahalı: azalan fiyat',
    pahaliS.sonuclar.every((s, i) => i === 0 || pahaliS.sonuclar[i - 1].fiyatMin >= s.fiyatMin));
  const ilerleme = await aramaSorgusu({ sirala: 'ilerleme' });
  bekle('ilerleme: azalan',
    ilerleme.sonuclar.every((s, i) => i === 0
      || ilerleme.sonuclar[i - 1].ilerlemeYuzde >= s.ilerlemeYuzde));

  /* Teslim sıralamasında TARİHSİZ PROJELER SONA: `NULLS LAST`
     olmasaydı PostgreSQL onları en başa koyar ve "en yakın teslim"
     listesi tarihi belli olmayan projelerle açılırdı. */
  const teslim = await aramaSorgusu({ sirala: 'teslim' });
  const ilkBos = teslim.sonuclar.findIndex((s) => s.teslimTarihi === null);
  bekle('teslim: tarihsizler sonda',
    ilkBos === -1 || teslim.sonuclar.slice(ilkBos).every((s) => s.teslimTarihi === null));
  const tarihliler = teslim.sonuclar.filter((s) => s.teslimTarihi !== null);
  bekle('teslim: artan tarih',
    tarihliler.every((s, i) => i === 0 || tarihliler[i - 1].teslimTarihi! <= s.teslimTarihi!));

  console.log('\n═══ 9. Coğrafi arama ═══');
  const kutu = await aramaSorgusu({ kutu: [40.5, 28.5, 41.5, 29.5] });
  bekle('sınır kutusu dışına taşmıyor',
    kutu.sonuclar.every((s) => s.lat >= 40.5 && s.lat <= 41.5 && s.lng >= 28.5 && s.lng <= 29.5),
    `${kutu.toplam} proje`);
  bekle('kutu tüm envanterden dar', kutu.toplam < vitrinde);

  const yakin = await aramaSorgusu({ merkez: [40.99, 29.12], yaricapKm: 40 });
  bekle('yarıçap içindeki hepsi 40 km altında',
    yakin.sonuclar.every((s) => s.uzaklikKm !== null && s.uzaklikKm <= 40),
    `${yakin.toplam} proje`);
  bekle('uzaklık hesaplanmış',
    yakin.sonuclar.every((s) => typeof s.uzaklikKm === 'number'));

  const genis = await aramaSorgusu({ merkez: [40.99, 29.12], yaricapKm: 800 });
  bekle('yarıçap büyüdükçe sonuç artıyor', genis.toplam >= yakin.toplam,
    `40km: ${yakin.toplam} → 800km: ${genis.toplam}`);

  console.log('\n═══ 10. Yüzler (facet) ═══');
  bekle('yüz sayıları üretiliyor', hepsi.yuzler.length > 0, `${hepsi.yuzler.length} özellik`);
  bekle('hiçbir yüz toplamı aşmıyor', hepsi.yuzler.every((y) => y.sayi <= hepsi.toplam));

  const guvenlikYuz = hepsi.yuzler.find((y) => y.kod === 'guvenlik');
  const guvenlikArama = await aramaSorgusu({ ozellikler: ['guvenlik'] });
  bekle('yüz sayısı gerçek sonuç sayısıyla aynı',
    guvenlikYuz?.sayi === guvenlikArama.toplam,
    `yüz ${guvenlikYuz?.sayi} = arama ${guvenlikArama.toplam}`);

  // Filtre uygulandığında yüzler daralmalı
  const darYuz = await aramaSorgusu({ tip: 'KONUT' });
  bekle('filtre altında yüzler daralıyor',
    darYuz.yuzler.every((y) => y.sayi <= (hepsi.yuzler.find((h) => h.kod === y.kod)?.sayi ?? 0)));

  console.log('\n═══ 11. Fiyat dağılımı ═══');
  /* Histogram FİYAT FİLTRESİ UYGULANMADAN hesaplanıyor: kaydırıcıyı
     daraltan kişi, dışarıda bıraktığı aralıkta ne kadar arz olduğunu
     görebilmeli. Filtreye tabi olsaydı histogram her hareketle
     kendini yiyip düz bir çizgiye dönerdi. */
  const dar = await aramaSorgusu({ maxFiyat: 5_000_000 });
  bekle('histogram fiyat filtresinden etkilenmiyor',
    dar.fiyatDagilimi.enCok === hepsi.fiyatDagilimi.enCok,
    `${dar.fiyatDagilimi.enCok} = ${hepsi.fiyatDagilimi.enCok}`);
  bekle('histogram kovaları dolu', hepsi.fiyatDagilimi.kovalar.some((k) => k > 0));
  bekle('en az ≤ en çok', hepsi.fiyatDagilimi.enAz <= hepsi.fiyatDagilimi.enCok);

  console.log('\n═══ 12. Sayfalama ═══');
  const s1 = await aramaSorgusu({ limit: 3, sayfa: 1, sirala: 'ucuz' });
  const s2 = await aramaSorgusu({ limit: 3, sayfa: 2, sirala: 'ucuz' });
  bekle('sayfa boyutu uygulanıyor', s1.sonuclar.length <= 3);
  bekle('toplam sayfalar arasında aynı', s1.toplam === s2.toplam, `${s1.toplam}`);
  const kesisim = s1.sonuclar.filter((a) => s2.sonuclar.some((b) => b.id === a.id));
  bekle('sayfalar çakışmıyor', kesisim.length === 0);
  bekle('limit üst sınırı zorlanıyor', (await aramaSorgusu({ limit: 9999 })).limit === 100);

  console.log('\n═══ 13. Yayında olmayanlar ═══');
  const gizli = await prisma.proje.findFirst({
    where: { yayinda: true, durum: { in: [...SATILABILIR] } }, select: { id: true },
  });
  await prisma.proje.update({ where: { id: gizli!.id }, data: { yayinda: false } });
  const sonra = await aramaSorgusu({ limit: 100 });
  bekle('yayından kaldırılan aramada çıkmıyor',
    !sonra.sonuclar.some((s) => s.id === gizli!.id));
  const indeksSonra = await prisma.projeArama.count({ where: { projeId: gizli!.id } });
  bekle('tetikleyici indeksten de sildi', indeksSonra === 0);

  await prisma.proje.update({ where: { id: gizli!.id }, data: { yayinda: true } });
  const geri = await prisma.projeArama.count({ where: { projeId: gizli!.id } });
  bekle('geri yayınlanınca indekse döndü', geri === 1);

  console.log('\n═══ 14. Öneriler ═══');
  const oAta = await oneriler('ata');
  bekle('önek eşleşmesi ilk sırada', oAta[0]?.ad === 'Ataşehir', oAta[0]?.ad ?? '(yok)');
  const ilkProje = oAta.findIndex((o) => o.tip === 'proje');
  bekle('bölgeler projelerden önce',
    oAta.findIndex((o) => o.tip === 'bolge') < (ilkProje === -1 ? 99 : ilkProje));
  bekle('tek harfte öneri yok', (await oneriler('a')).length === 0);
  bekle('öneriler yol içeriyor', oAta.every((o) => o.yol.startsWith('/')));

  console.log('\n═══ 15. Performans ═══');
  bekle('filtresiz arama < 250 ms', hepsi.sureMs < 250, `${hepsi.sureMs} ms`);
  bekle('metin araması < 250 ms', bolgeArama.sureMs < 250, `${bolgeArama.sureMs} ms`);
  bekle('coğrafi arama < 250 ms', yakin.sureMs < 250, `${yakin.sureMs} ms`);

  console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
  await prisma.$disconnect();
  process.exit(kalan === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
