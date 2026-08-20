import postgres from 'postgres';

/**
 * Villa ve sahil bölgesi örnek verisi.
 *
 * seed.mjs'ten AYRI: o dosya tabloları truncate ederek baştan kuruyor.
 * Bu betik ekleme yapıyor, silmiyor — mevcut veriyi bozmadan lüks
 * segmenti dolduruyor.
 *
 *   node --env-file=.env.local scripts/seed-villa.mjs
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

const SAHILLER = [
  { slug: 'yalikavak', ad: 'Yalıkavak', il: 'mugla', ilceler: ['bodrum'], sira: 1 },
  { slug: 'turkbuku', ad: 'Türkbükü', il: 'mugla', ilceler: ['bodrum'], sira: 2 },
  { slug: 'gocek', ad: 'Göcek', il: 'mugla', ilceler: ['fethiye'], sira: 3 },
  { slug: 'datca', ad: 'Datça', il: 'mugla', ilceler: ['datca'], sira: 4 },
  { slug: 'cesme', ad: 'Çeşme', il: 'izmir', ilceler: ['cesme'], sira: 5 },
  { slug: 'alacati', ad: 'Alaçatı', il: 'izmir', ilceler: ['cesme'], sira: 6 },
  { slug: 'kas-kalkan', ad: 'Kaş & Kalkan', il: 'antalya', ilceler: ['kas'], sira: 7 },
  { slug: 'sapanca', ad: 'Sapanca', il: 'sakarya', ilceler: ['sapanca'], sira: 8 },
];

const FIRMALAR = [
  { slug: 'ege-marin-yapi', ad: 'Ege Marin Yapı', yil: 2005, il: 'mugla', ilce: 'bodrum' },
  { slug: 'orman-konak', ad: 'Orman Konak İnşaat', yil: 2012, il: 'sakarya', ilce: 'sapanca' },
];

const VILLALAR = [
  {
    slug: 'exen-yalikavak-konaklari', ad: 'Exen Yalıkavak Konakları', firma: 'sur-yapi',
    il: 'mugla', ilce: 'bodrum', mahalle: 'yalikavak', lng: 27.2936, lat: 37.1069,
    tip: 'villa', durum: 'lansman', teslim: '2027Q2', konut: 14, blok: 14, kat: 3,
    tavan: 3.4, aidat: 8500, pesinat: 30, vade: 36, faizsiz: false, santiye: 18,
    denize: 120, havuz: 'ozel',
    ozellikler: { acik_havuz: true, deniz_manzarasi: true, akilli_ev: true,
                  guvenlik_247: true, kapali_otopark: true, yerden_isitma: true },
    aciklama: 'Yalıkavak marinaya yürüme mesafesinde, on dört adet müstakil villadan oluşan butik proje. Her villanın özel havuzu ve deniz manzaralı terası bulunuyor.',
    tipler: [
      { tip: '4+2', net: 265, brut: 310, arsa: 520, fiyat: 38500000, toplam: 6, kalan: 4 },
      { tip: '5+2', net: 310, brut: 365, arsa: 640, fiyat: 42500000, toplam: 8, kalan: 5 },
    ],
  },
  {
    slug: 'doga-sapanca-malikaneleri', ad: 'Doğa Sapanca Malikâneleri', firma: 'orman-konak',
    il: 'sakarya', ilce: 'sapanca', mahalle: 'kirkpinar', lng: 30.2661, lat: 40.6912,
    tip: 'mustakil', durum: 'satista', teslim: '2026Q4', konut: 28, blok: 28, kat: 2,
    tavan: 3.2, aidat: 4200, pesinat: 20, vade: 48, faizsiz: true, santiye: 74,
    denize: null, havuz: 'ozel',
    ozellikler: { acik_havuz: true, guvenlik_247: true, kapali_otopark: true,
                  cocuk_oyun: true, yerden_isitma: true, deprem_2018: true },
    aciklama: 'Kırkpınar mevkiinde orman dokusuna komşu yirmi sekiz malikâne. Her parselde özel havuz, kapalı otopark ve şömineli yaşam alanı.',
    tipler: [
      { tip: '5+2', net: 340, brut: 385, arsa: 1100, fiyat: 28900000, toplam: 16, kalan: 9 },
      { tip: '6+2', net: 395, brut: 448, arsa: 1400, fiyat: 34200000, toplam: 12, kalan: 5 },
    ],
  },
  {
    slug: 'marin-cesme-villalari', ad: 'Marin Çeşme Villaları', firma: 'ege-marin-yapi',
    il: 'izmir', ilce: 'cesme', mahalle: 'alacati', lng: 26.3742, lat: 38.2814,
    tip: 'villa', durum: 'satista', teslim: '2027Q1', konut: 22, blok: 22, kat: 2,
    tavan: 3.3, aidat: 6800, pesinat: 25, vade: 36, faizsiz: false, santiye: 46,
    denize: 640, havuz: 'ozel',
    ozellikler: { acik_havuz: true, deniz_manzarasi: true, guvenlik_247: true,
                  akilli_ev: true, ankastre: true },
    aciklama: 'Alaçatı merkezine beş dakika, taş mimarisiyle yörenin dokusunu sürdüren yirmi iki villa. Bahçelerde zeytin ağaçları korundu.',
    tipler: [
      { tip: '3+1', net: 185, brut: 220, arsa: 380, fiyat: 24500000, toplam: 10, kalan: 3 },
      { tip: '4+1', net: 240, brut: 285, arsa: 500, fiyat: 31800000, toplam: 12, kalan: 7 },
    ],
  },
  {
    slug: 'gocek-yali-konaklari', ad: 'Göcek Yalı Konakları', firma: 'ege-marin-yapi',
    il: 'mugla', ilce: 'fethiye', mahalle: 'gocek', lng: 28.9394, lat: 36.7519,
    tip: 'yali', durum: 'lansman', teslim: '2028Q1', konut: 8, blok: 8, kat: 3,
    tavan: 3.6, aidat: 14000, pesinat: 35, vade: 24, faizsiz: false, santiye: 6,
    denize: 0, havuz: 'ozel',
    ozellikler: { acik_havuz: true, deniz_manzarasi: true, akilli_ev: true,
                  guvenlik_247: true, kapali_otopark: true, sismik_izolator: true },
    aciklama: 'Göcek koyunda denize sıfır sekiz yalı. Her konağın özel iskelesi ve tekne bağlama hakkı bulunuyor.',
    tipler: [
      { tip: '5+2', net: 420, brut: 495, arsa: 900, fiyat: 96000000, toplam: 4, kalan: 4 },
      { tip: '6+2', net: 505, brut: 590, arsa: 1250, fiyat: 128000000, toplam: 4, kalan: 3 },
    ],
  },
  {
    slug: 'benesta-zekeriyakoy', ad: 'Benesta Zekeriyaköy', firma: 'esat-insaat',
    il: 'istanbul', ilce: 'sariyer', mahalle: 'zekeriyakoy', lng: 29.0361, lat: 41.1889,
    tip: 'rezidans', durum: 'satista', teslim: '2027Q1', konut: 46, blok: 4, kat: 4,
    tavan: 3.2, aidat: 7200, pesinat: 25, vade: 60, faizsiz: true, santiye: 58,
    denize: null, havuz: 'ortak',
    ozellikler: { kapali_havuz: true, spor_salonu: true, guvenlik_247: true,
                  site_ici_okul: true, cocuk_oyun: true, yerden_isitma: true,
                  kapali_otopark: true },
    aciklama: 'Zekeriyaköy’de dört bloklu butik site. Bahçe dubleksler kendi özel bahçesine sahip; site içinde anaokulu bulunuyor.',
    tipler: [
      { tip: '3+1', net: 165, brut: 195, arsa: null, fiyat: 28400000, toplam: 18, kalan: 6 },
      { tip: '4+1', net: 210, brut: 245, arsa: 180, fiyat: 36750000, toplam: 20, kalan: 3 },
      { tip: '5+1', net: 268, brut: 312, arsa: 240, fiyat: 47900000, toplam: 8, kalan: 2 },
    ],
  },
  {
    slug: 'kas-panorama-evleri', ad: 'Kaş Panorama Evleri', firma: 'akyaka-doga',
    il: 'antalya', ilce: 'kas', mahalle: 'cukurbag', lng: 29.6389, lat: 36.2019,
    tip: 'villa', durum: 'satista', teslim: '2027Q3', konut: 16, blok: 16, kat: 2,
    tavan: 3.1, aidat: 5400, pesinat: 20, vade: 48, faizsiz: true, santiye: 32,
    denize: 850, havuz: 'ozel',
    ozellikler: { acik_havuz: true, deniz_manzarasi: true, guvenlik_247: true,
                  ankastre: true, deprem_2018: true },
    aciklama: 'Çukurbağ yarımadasında Akdeniz’e hâkim on altı villa. Kaskad havuzlar ve taş teraslarla arazinin eğimi korunarak yerleşildi.',
    tipler: [
      { tip: '3+1', net: 175, brut: 205, arsa: 420, fiyat: 19800000, toplam: 8, kalan: 5 },
      { tip: '4+1', net: 225, brut: 262, arsa: 560, fiyat: 25400000, toplam: 8, kalan: 2 },
    ],
  },
];

try {
  console.log('Sahil bölgeleri…');
  for (const s of SAHILLER) {
    await sql`
      insert into sahil_bolgesi (slug, ad, il, ilceler, sira)
      values (${s.slug}, ${s.ad}, ${s.il}, ${s.ilceler}, ${s.sira})
      on conflict (slug) do update set
        ad = excluded.ad, il = excluded.il,
        ilceler = excluded.ilceler, sira = excluded.sira`;
  }

  console.log('Firmalar…');
  for (const f of FIRMALAR) {
    await sql`
      insert into firma (slug, ad, kurulus_yili, merkez_il, merkez_ilce)
      values (${f.slug}, ${f.ad}, ${f.yil}, ${f.il}, ${f.ilce})
      on conflict (slug) do nothing`;
  }

  console.log('Villa projeleri…');
  let eklenen = 0;
  for (const p of VILLALAR) {
    const [f] = await sql`select id from firma where slug = ${p.firma}`;
    if (!f) { console.log(`  ! firma yok: ${p.firma} — ${p.ad} atlandı`); continue; }

    const [mevcut] = await sql`select id from proje where slug = ${p.slug}`;
    if (mevcut) { console.log(`  · zaten var: ${p.ad}`); continue; }

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
        ${p.tip}, ${p.durum}, ${p.teslim},
        ${p.konut}, ${p.blok}, ${p.kat}, ${p.tavan},
        ${p.aidat}, ${p.pesinat}, ${p.vade}, ${p.faizsiz}, ${p.santiye},
        ${p.denize}, ${p.havuz}, ${sql.json(p.ozellikler)}, ${p.aciklama},
        current_date - 3, ${1200 + Math.round(p.konut * 37)}, 88, true
      ) returning id`;

    await sql`
      insert into medya (proje_id, tur, key, alt, sira, varyant_hazir)
      values (${proje.id}, 'gorsel', ${`projeler/${proje.id}/gorsel/kapak.jpg`},
              ${`${p.ad} — ${p.ilce}, ${p.il}`}, 0, true)`;

    for (const t of p.tipler) {
      const [dt] = await sql`
        insert into daire_tipi
          (proje_id, tip, net_m2, brut_m2, arsa_m2, liste_fiyati, toplam_adet, kalan_adet)
        values (${proje.id}, ${t.tip}, ${t.net}, ${t.brut}, ${t.arsa},
                ${t.fiyat}, ${t.toplam}, ${t.kalan})
        returning id`;
      await sql`
        insert into fiyat_kaydi (daire_tipi_id, fiyat, kalan_adet, kaynak, kaydeden)
        values (${dt.id}, ${t.fiyat}, ${t.kalan}, 'yonetim', 'seed-villa')`;
    }
    eklenen++;
  }

  // CONCURRENTLY değil: benzersiz indeksi olmayan görünümde çalışmıyor
  // ve tohum betiğinde kısa süreli kilit sorun değil.
  console.log('Materyalize görünümler yenileniyor…');
  await sql`refresh materialized view mv_ilce_m2`;
  await sql`refresh materialized view mv_firma_karne`;
  await sql`refresh materialized view mv_endeks_donem`;

  const [s] = await sql`
    select count(*)::int as n from proje
    where yayinda and tip in ('villa','mustakil','yali','rezidans')`;
  console.log(`\nTamam: ${eklenen} yeni proje · toplam ${s.n} lüks segment projesi.`);
} finally {
  await sql.end();
}
