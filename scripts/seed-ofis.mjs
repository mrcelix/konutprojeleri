import postgres from 'postgres';

/**
 * Ofis projesi örnek verisi.
 *
 * seed.mjs'ten AYRI: o dosya tabloları truncate ederek baştan kuruyor.
 * Bu betik ekleme yapıyor, silmiyor — seed-villa.mjs ile aynı desen.
 *
 *   node --env-file=.env.local scripts/seed-ofis.mjs
 *
 * Menüde "Satılık Ofis" duruyordu ama arkasında tek kayıt yoktu;
 * /ara?tip=ofis boş dönüyordu.
 *
 * OFİS KONUTTAN FARKLI MODELLENİYOR:
 *   · bağımsız bölüm adı '3+1' değil kat/blok tanımı
 *   · aidat ortak gider olarak m² başına değil aylık toplam
 *   · havuz_tipi yok, denize mesafe yok
 *   · özellikler kendi anahtarlarını kullanıyor (toplantı salonu,
 *     resepsiyon, jeneratör, LEED) — lib/filtre.ts'te tanımlılar
 *
 * Örnek veridir. Firma ve proje adları gerçek şirketlere benziyor
 * olabilir; canlıya geçmeden temizlenmeli.
 */

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL tanımlı değil.');
  process.exit(1);
}
const sql = postgres(url, { prepare: false, max: 1 });

const FIRMALAR = [
  { slug: 'meridyen-gayrimenkul', ad: 'Meridyen Gayrimenkul', yil: 1998, il: 'istanbul', ilce: 'sisli' },
  { slug: 'ege-ofis-yatirim', ad: 'Ege Ofis Yatırım', yil: 2009, il: 'izmir', ilce: 'bayrakli' },
  { slug: 'ankara-is-merkezleri', ad: 'Ankara İş Merkezleri', yil: 2003, il: 'ankara', ilce: 'cankaya' },
];

const OFISLER = [
  {
    slug: 'meridyen-plaza-maslak', ad: 'Meridyen Plaza Maslak', firma: 'meridyen-gayrimenkul',
    il: 'istanbul', ilce: 'sariyer', mahalle: 'maslak', lng: 29.0196, lat: 41.1102,
    durum: 'satista', teslim: '2027Q2', birim: 84, blok: 1, kat: 24,
    tavan: 3.6, aidat: 18500, pesinat: 35, vade: 48, faizsiz: false, santiye: 41,
    ozellikler: {
      toplanti_salonu: true, resepsiyon: true, jenerator: true, leed_sertifikali: true,
      kapali_otopark: true, guvenlik_247: true, akilli_ev: true, spor_salonu: true,
      deprem_2018: true, sismik_izolator: true,
    },
    aciklama:
      'Büyükdere aksında yirmi dört katlı ofis kulesi. Kat planları 210 m² modül üzerine kurulu; ' +
      'iki modül birleştirilerek tam kat kullanımı mümkün. LEED Gold hedefiyle sertifikasyon süreci yürüyor.',
    tipler: [
      { tip: 'Modül ofis', net: 210, brut: 268, fiyat: 41500000, toplam: 48, kalan: 22 },
      { tip: 'Yarım kat', net: 420, brut: 512, fiyat: 79800000, toplam: 24, kalan: 11 },
      { tip: 'Tam kat', net: 840, brut: 1010, fiyat: 152000000, toplam: 12, kalan: 5 },
    ],
  },
  {
    slug: 'levent-is-kule', ad: 'Levent İş Kule', firma: 'meridyen-gayrimenkul',
    il: 'istanbul', ilce: 'besiktas', mahalle: 'levent', lng: 29.0092, lat: 41.0819,
    durum: 'lansman', teslim: '2028Q1', birim: 56, blok: 1, kat: 18,
    tavan: 3.4, aidat: 15200, pesinat: 30, vade: 60, faizsiz: true, santiye: 8,
    ozellikler: {
      toplanti_salonu: true, resepsiyon: true, jenerator: true,
      kapali_otopark: true, guvenlik_247: true, deprem_2018: true,
    },
    aciklama:
      'Levent metro çıkışına yüz metre mesafede on sekiz katlı iş kulesi. Zemin ve birinci kat ' +
      'ticari birim olarak ayrıldı; üst katlar bağımsız ofis olarak satılıyor.',
    tipler: [
      { tip: 'Kat ofisi', net: 165, brut: 205, fiyat: 33900000, toplam: 36, kalan: 30 },
      { tip: 'Köşe ofis', net: 240, brut: 292, fiyat: 51200000, toplam: 16, kalan: 14 },
      { tip: 'Teras ofis', net: 310, brut: 388, fiyat: 74500000, toplam: 4, kalan: 4 },
    ],
  },
  {
    slug: 'bayrakli-finans-merkezi', ad: 'Bayraklı Finans Merkezi', firma: 'ege-ofis-yatirim',
    il: 'izmir', ilce: 'bayrakli', mahalle: 'salhane', lng: 27.1729, lat: 38.4602,
    durum: 'satista', teslim: '2026Q4', birim: 120, blok: 2, kat: 22,
    tavan: 3.5, aidat: 11800, pesinat: 25, vade: 60, faizsiz: true, santiye: 67,
    ozellikler: {
      toplanti_salonu: true, resepsiyon: true, jenerator: true, leed_sertifikali: true,
      kapali_otopark: true, guvenlik_247: true, spor_salonu: true, deprem_2018: true,
    },
    aciklama:
      'İzmir Yeni Kent Merkezi’nde iki kuleli ofis kompleksi. Körfez cepheli katlarda tam boy cam ' +
      'cephe; ortak kullanımda konferans salonu ve yemekhane bulunuyor.',
    tipler: [
      { tip: 'Küçük ofis', net: 96, brut: 124, fiyat: 14200000, toplam: 60, kalan: 19 },
      { tip: 'Modül ofis', net: 185, brut: 232, fiyat: 26800000, toplam: 44, kalan: 12 },
      { tip: 'Körfez cepheli', net: 265, brut: 328, fiyat: 41900000, toplam: 16, kalan: 6 },
    ],
  },
  {
    slug: 'cankaya-ofis-park', ad: 'Çankaya Ofis Park', firma: 'ankara-is-merkezleri',
    il: 'ankara', ilce: 'cankaya', mahalle: 'birlik', lng: 32.8102, lat: 39.8776,
    durum: 'satista', teslim: '2026Q3', birim: 64, blok: 4, kat: 6,
    tavan: 3.3, aidat: 7400, pesinat: 20, vade: 36, faizsiz: false, santiye: 82,
    ozellikler: {
      toplanti_salonu: true, jenerator: true,
      kapali_otopark: true, guvenlik_247: true, deprem_2018: true,
    },
    aciklama:
      'Birlik Mahallesi’nde dört bloklu az katlı ofis yerleşkesi. Her blok bağımsız girişli; ' +
      'bahçe katları kendi terasına sahip. Kule tipi ofis istemeyen kurumlar için tasarlandı.',
    tipler: [
      { tip: 'Bahçe katı', net: 140, brut: 172, fiyat: 16800000, toplam: 16, kalan: 4 },
      { tip: 'Ara kat', net: 118, brut: 146, fiyat: 13400000, toplam: 32, kalan: 9 },
      { tip: 'Çatı katı', net: 158, brut: 198, fiyat: 19900000, toplam: 16, kalan: 7 },
    ],
  },
  {
    slug: 'kozyatagi-is-merkezi', ad: 'Kozyatağı İş Merkezi', firma: 'meridyen-gayrimenkul',
    il: 'istanbul', ilce: 'kadikoy', mahalle: 'kozyatagi', lng: 29.1002, lat: 40.9736,
    durum: 'satista', teslim: '2027Q4', birim: 72, blok: 1, kat: 15,
    tavan: 3.4, aidat: 13600, pesinat: 30, vade: 48, faizsiz: true, santiye: 29,
    ozellikler: {
      toplanti_salonu: true, resepsiyon: true, jenerator: true,
      kapali_otopark: true, guvenlik_247: true, akilli_ev: true, deprem_2018: true,
    },
    aciklama:
      'Kozyatağı metro istasyonuna bağlantılı on beş katlı iş merkezi. Otopark katlarında ' +
      'elektrikli araç şarj altyapısı kurulu; bina yönetimi merkezi otomasyondan yürüyor.',
    tipler: [
      { tip: 'Kat ofisi', net: 132, brut: 168, fiyat: 21600000, toplam: 45, kalan: 17 },
      { tip: 'Köşe ofis', net: 198, brut: 246, fiyat: 32400000, toplam: 20, kalan: 8 },
      { tip: 'Tam kat', net: 640, brut: 790, fiyat: 98500000, toplam: 7, kalan: 3 },
    ],
  },
];

try {
  console.log('Firmalar…');
  for (const f of FIRMALAR) {
    await sql`
      insert into firma (slug, ad, kurulus_yili, merkez_il, merkez_ilce)
      values (${f.slug}, ${f.ad}, ${f.yil}, ${f.il}, ${f.ilce})
      on conflict (slug) do nothing`;
  }

  console.log('Ofis projeleri…');
  let eklenen = 0;
  for (const p of OFISLER) {
    const [f] = await sql`select id from firma where slug = ${p.firma}`;
    if (!f) { console.log(`  ! firma yok: ${p.firma} — ${p.ad} atlandı`); continue; }

    const [mevcut] = await sql`select id from proje where slug = ${p.slug}`;
    if (mevcut) { console.log(`  · zaten var: ${p.ad}`); continue; }

    /* havuz_tipi ve denize_mesafe_m BİLEREK null: ofis projesinde
       böyle bir alan yok, 'yok' yazmak da bir bilgi uydurmak olurdu. */
    const [proje] = await sql`
      insert into proje (
        slug, ad, firma_id, il, ilce, mahalle, konum, tip, durum, teslim_ceyrek,
        toplam_konut, blok_sayisi, kat_sayisi, tavan_yuksekligi,
        aidat, pesinat_orani, vade_ay, faizsiz, santiye_yuzde,
        denize_mesafe_m, havuz_tipi, ozellikler, aciklama,
        fiyat_teyit_tarihi, goruntulenme, veri_skoru, yayinda
      ) values (
        ${p.slug}, ${p.ad}, ${f.id}, ${p.il}, ${p.ilce}, ${p.mahalle},
        st_setsrid(st_makepoint(${p.lng}, ${p.lat}), 4326)::geography,
        'ofis', ${p.durum}, ${p.teslim},
        ${p.birim}, ${p.blok}, ${p.kat}, ${p.tavan},
        ${p.aidat}, ${p.pesinat}, ${p.vade}, ${p.faizsiz}, ${p.santiye},
        null, null, ${sql.json(p.ozellikler)}, ${p.aciklama},
        current_date - 2, ${900 + Math.round(p.birim * 29)}, 86, true
      ) returning id`;

    for (const t of p.tipler) {
      const [dt] = await sql`
        insert into daire_tipi
          (proje_id, tip, net_m2, brut_m2, arsa_m2, liste_fiyati, toplam_adet, kalan_adet)
        values (${proje.id}, ${t.tip}, ${t.net}, ${t.brut}, null,
                ${t.fiyat}, ${t.toplam}, ${t.kalan})
        returning id`;
      await sql`
        insert into fiyat_kaydi (daire_tipi_id, fiyat, kalan_adet, kaynak, kaydeden)
        values (${dt.id}, ${t.fiyat}, ${t.kalan}, 'yonetim', 'seed-ofis')`;
    }
    eklenen++;
    console.log(`  + ${p.ad}`);
  }

  /* MEDYA KAYDI YAZILMIYOR.
     seed-villa.mjs her projeye kapak kaydı yazıyor ama dosya hiçbir
     zaman yüklenmiyor; nesne deposu bağlanana kadar bu kayıtlar
     kırık görsel üretiyordu. Ofis projeleri kapaksız giriyor ve
     stok havuzundan çiziliyorlar (lib/gorsel-havuzu.ts). Gerçek
     fotoğraf panelden yüklendiğinde kayıt da orada oluşuyor. */

  // CONCURRENTLY değil: benzersiz indeksi olmayan görünümde çalışmıyor
  // ve tohum betiğinde kısa süreli kilit sorun değil.
  console.log('Materyalize görünümler yenileniyor…');
  await sql`refresh materialized view mv_ilce_m2`;
  await sql`refresh materialized view mv_firma_karne`;
  await sql`refresh materialized view mv_endeks_donem`;

  const [s] = await sql`
    select count(*)::int as n from proje where tip = 'ofis' and yayinda`;
  console.log(`\nEklenen: ${eklenen} · yayındaki ofis projesi: ${s.n}`);
} finally {
  await sql.end();
}
