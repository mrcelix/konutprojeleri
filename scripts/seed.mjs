/**
 * Geliştirme verisi.
 *
 * Proje adları, firmalar ve ilçeler konutprojeleri.com envanterinden alınmıştır.
 * Fiyat, m², stok, şantiye yüzdesi ve koordinatlar TEMSİLİ değerlerdir —
 * arayüzün gerçek veriyle nasıl davrandığını görmek için.
 *
 * Çalıştırma:  node --env-file=.env.local scripts/seed.mjs
 */

import postgres from 'postgres';

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DIRECT_URL veya DATABASE_URL tanımlı değil.');
  process.exit(1);
}
const sql = postgres(url, { max: 1 });

const FIRMALAR = [
  { slug: 'esat-insaat', ad: 'Esat İnşaat', yil: 1998, il: 'istanbul', ilce: 'atasehir', otomatik: true,
    ortakliklar: ['Emlak Konut GYO'],
    hakkinda: 'Esat İnşaat 1998 yılından bu yana İstanbul Anadolu Yakası\'nda konut geliştiriyor. Portföyün ağırlığı Kadıköy ve Ümraniye\'de; iki projesini Emlak Konut GYO ortaklığıyla yürüttü. Son beş yıldaki projelerinde üç metre tavan yüksekliği ve geniş teras uygulaması firmanın tekrar eden tasarım tercihi.' },
  { slug: 'torunlar-gyo', ad: 'Torunlar GYO', yil: 1996, il: 'istanbul', ilce: 'basaksehir', otomatik: true,
    ortakliklar: ['Emlak Konut GYO'],
    hakkinda: 'Halka açık gayrimenkul yatırım ortaklığı. İstanbul genelinde büyük ölçekli karma projeler geliştiriyor; portföyünde konut, ofis ve alışveriş merkezi bir arada bulunuyor.' },
  { slug: 'sur-yapi',         ad: 'Sur Yapı',                 yil: 2004, il: 'istanbul', ilce: 'umraniye', otomatik: true },
  { slug: 'hasanoglu-grup',   ad: 'Hasanoğlu Şirketler Grubu',yil: 1991, il: 'istanbul', ilce: 'avcilar', otomatik: false },
  { slug: 'baskent-insaat',   ad: 'Başkent İnşaat',           yil: 2015, il: 'istanbul', ilce: 'sancaktepe', otomatik: false },
  { slug: 'cevahir-yapi',     ad: 'Cevahir Yapı',             yil: 2009, il: 'istanbul', ilce: 'avcilar', otomatik: false },
  { slug: 'neva-prestij',     ad: 'Neva Prestij × Vizör Grup',yil: 2011, il: 'istanbul', ilce: 'kartal', otomatik: false },
  { slug: 'akyaka-doga',      ad: 'Akyaka-Doğa',              yil: 2007, il: 'istanbul', ilce: 'umraniye', otomatik: false },
];

const PROJELER = [
  {
    slug: 'benesta-benleo-acibadem', ad: 'Benesta Benleo Acıbadem', firma: 'esat-insaat',
    il: 'istanbul', ilce: 'kadikoy', mahalle: 'acibadem', tip: 'konut', durum: 'satista',
    teslim: '2027Q1', konut: 186, ticari: 8, blok: 2, kat: 14, tavan: 3.0,
    aidat: 3100, pesinat: 25, vade: 60, faizsiz: true, santiye: 88,
    lng: 29.0501, lat: 40.9912, goruntulenme: 9140,
    ozellikler: { kapali_havuz: true, spor_salonu: true, guvenlik_247: true, kapali_otopark: true,
                  cocuk_oyun: true, ankastre: true, yerden_isitma: true, ebeveyn_banyo: true,
                  akilli_ev: true, deprem_2018: true },
    aciklama: 'Esat İnşaat tarafından Kadıköy Acıbadem\'de geliştiriliyor. İki blokta 186 konut ve 8 ticari bölüm yer alıyor; dairelerin tavan yüksekliği 3 metre. Acıbadem metro istasyonuna 7 dakika yürüme mesafesinde.',
    tipler: [
      { tip: '1+1', net: 68, brut: 86, fiyat: 5_900_000, toplam: 28, kalan: 6,
        cephe: 'kuzeydogu', katlar: '[3,13)', manzara: 'Şehir',
        odalar: [
          { ad: 'Salon + mutfak', alan: 31.2, cephe: 'kuzeydogu', not: 'Amerikan mutfak, ankastre' },
          { ad: 'Yatak odası', alan: 16.4, cephe: 'kuzeydogu', not: 'Gömme dolap' },
          { ad: 'Banyo', alan: 5.8 },
          { ad: 'Antre ve koridor', alan: 9.6 },
          { ad: 'Balkon', alan: 5.0, cephe: 'kuzeydogu', not: 'Net alana dahil değil' },
        ] },
      { tip: '2+1', net: 104, brut: 128, fiyat: 8_400_000, toplam: 74, kalan: 19,
        cephe: 'guneybati', katlar: '[3,13)', manzara: 'Şehir · 9. kattan itibaren kısmi deniz',
        odalar: [
          { ad: 'Salon + mutfak', alan: 42.4, cephe: 'guneybati', not: 'Amerikan mutfak, ankastre' },
          { ad: 'Ebeveyn yatak odası', alan: 18.6, cephe: 'guneybati', not: 'Giyinme odası ve banyo bağlantılı' },
          { ad: 'Yatak odası', alan: 14.2, cephe: 'kuzeydogu', not: 'Gömme dolap' },
          { ad: 'Ebeveyn banyo', alan: 5.4, not: 'Duşakabin' },
          { ad: 'Banyo', alan: 6.1, not: 'Küvet' },
          { ad: 'Antre ve koridor', alan: 17.3, not: 'Çelik kapı' },
          { ad: 'Teras', alan: 17.0, cephe: 'guneybati', not: 'Net alana dahil değil' },
        ] },
      { tip: '3+1', net: 134, brut: 164, fiyat: 11_900_000, toplam: 56, kalan: 14,
        cephe: 'guneybati', katlar: '[2,13)', manzara: 'Şehir',
        odalar: [
          { ad: 'Salon + mutfak', alan: 48.6, cephe: 'guneybati' },
          { ad: 'Ebeveyn yatak odası', alan: 20.2, cephe: 'guneybati', not: 'Giyinme odalı' },
          { ad: 'Yatak odası', alan: 15.4, cephe: 'kuzeydogu' },
          { ad: 'Çocuk odası', alan: 13.8, cephe: 'kuzeydogu' },
          { ad: 'Ebeveyn banyo', alan: 6.0 },
          { ad: 'Banyo', alan: 6.4 },
          { ad: 'Antre ve koridor', alan: 23.6 },
          { ad: 'Teras', alan: 21.0, cephe: 'guneybati', not: 'Net alana dahil değil' },
        ] },
      { tip: '4+1', net: 178, brut: 214, fiyat: 16_200_000, toplam: 22, kalan: 4,
        cephe: 'guneybati', katlar: '[10,15)', manzara: 'Deniz ve şehir' },
    ],
  },
  {
    slug: 'vn-kartal', ad: 'VN Kartal', firma: 'neva-prestij',
    il: 'istanbul', ilce: 'kartal', mahalle: 'yakacik', tip: 'konut', durum: 'satista',
    teslim: '2027Q2', konut: 884, ticari: 11, blok: 15, kat: 14, tavan: 2.8,
    aidat: 3400, pesinat: 25, vade: 62, faizsiz: true, santiye: 41,
    lng: 29.1889, lat: 40.9067, goruntulenme: 6280,
    ozellikler: { acik_havuz: true, spor_salonu: true, guvenlik_247: true, kapali_otopark: true,
                  cocuk_oyun: true, deprem_2018: true, site_ici_okul: true },
    aciklama: 'Neva Prestij ve Vizör Grup ortaklığı. 15 blokta 884 konut, 11 ticari bölüm. Metro çıkışına yürüme mesafesinde.',
    tipler: [
      { tip: '1+1', net: 62,  brut: 78,  fiyat: 4_200_000,  toplam: 180, kalan: 62 },
      { tip: '2+1', net: 87,  brut: 108, fiyat: 6_450_000,  toplam: 420, kalan: 148 },
      { tip: '3+1', net: 124, brut: 152, fiyat: 9_100_000,  toplam: 224, kalan: 78 },
      { tip: '4+1', net: 166, brut: 198, fiyat: 12_400_000, toplam: 60,  kalan: 24 },
    ],
  },
  {
    slug: 'isiltili-evler-sancaktepe', ad: 'Işıltılı Evler Sancaktepe', firma: 'baskent-insaat',
    il: 'istanbul', ilce: 'sancaktepe', mahalle: 'abdurrahmangazi', tip: 'konut', durum: 'satista',
    teslim: '2026Q4', konut: 77, ticari: 6, blok: 3, kat: 9, tavan: 2.8,
    aidat: 1950, pesinat: 20, vade: 48, faizsiz: true, santiye: 79,
    lng: 29.2317, lat: 41.0011, goruntulenme: 3620,
    ozellikler: { guvenlik_247: true, kapali_otopark: true, cocuk_oyun: true, deprem_2018: true, ankastre: true },
    aciklama: 'Başkent İnşaat kalitesiyle Sancaktepe\'de hayat buluyor. 3 blok ve 77 konut; projede 6 ticari bölüm de yer alıyor.',
    tipler: [
      { tip: '2+1', net: 86,  brut: 106, fiyat: 5_900_000, toplam: 48, kalan: 8 },
      { tip: '3+1', net: 118, brut: 142, fiyat: 7_800_000, toplam: 29, kalan: 4 },
    ],
  },
  {
    slug: 'sur-yapi-exen-konaklari', ad: 'Sur Yapı Exen Konakları', firma: 'sur-yapi',
    il: 'istanbul', ilce: 'umraniye', mahalle: 'cakmak', tip: 'konut', durum: 'lansman',
    teslim: '2028Q1', konut: 612, ticari: 24, blok: 8, kat: 16, tavan: 3.0,
    aidat: 2800, pesinat: 20, vade: 60, faizsiz: true, santiye: 12,
    lng: 29.1244, lat: 41.0203, goruntulenme: 4180,
    ozellikler: { acik_havuz: true, kapali_havuz: true, spor_salonu: true, guvenlik_247: true,
                  kapali_otopark: true, cocuk_oyun: true, akilli_ev: true, deprem_2018: true },
    aciklama: 'Sur Yapı Eksen projesinin karşısında yükseliyor. Lüks ve konforu bir arada sunan proje ön talep aşamasında.',
    tipler: [
      { tip: '2+1', net: 92,  brut: 116, fiyat: 8_900_000,  toplam: 240, kalan: 198 },
      { tip: '3+1', net: 128, brut: 158, fiyat: 12_300_000, toplam: 220, kalan: 176 },
      { tip: '4+1', net: 172, brut: 208, fiyat: 16_800_000, toplam: 112, kalan: 94 },
      { tip: '5+1', net: 214, brut: 256, fiyat: 21_400_000, toplam: 40,  kalan: 36 },
    ],
  },
  {
    slug: '5-levent-korupark', ad: '5. Levent Korupark', firma: 'torunlar-gyo',
    il: 'istanbul', ilce: 'eyupsultan', mahalle: 'alibeykoy', tip: 'konut', durum: 'satista',
    teslim: '2027Q4', konut: 1240, ticari: 46, blok: 12, kat: 22, tavan: 2.9,
    aidat: 4200, pesinat: 25, vade: 60, faizsiz: true, santiye: 62,
    lng: 28.9394, lat: 41.0761, goruntulenme: 8140,
    ozellikler: { acik_havuz: true, kapali_havuz: true, spor_salonu: true, guvenlik_247: true,
                  kapali_otopark: true, cocuk_oyun: true, site_ici_okul: true, deprem_2018: true },
    aciklama: 'Torunlar GYO\'nun İstanbul merkezindeki projesi. Alanın %70\'i yeşil alan; zengin sosyal alanlar, spor tesisleri ve çarşı ile birlikte teslim ediliyor. 5. Levent\'in son etabı.',
    tipler: [
      { tip: '1+1', net: 64,  brut: 82,  fiyat: 7_400_000,  toplam: 320, kalan: 96 },
      { tip: '2+1', net: 98,  brut: 124, fiyat: 11_400_000, toplam: 480, kalan: 142 },
      { tip: '3+1', net: 136, brut: 168, fiyat: 15_900_000, toplam: 320, kalan: 88 },
      { tip: '4+1', net: 184, brut: 222, fiyat: 22_600_000, toplam: 120, kalan: 34 },
    ],
  },
  {
    slug: 'limonlu-bahce-konaklari', ad: 'Limonlu Bahçe Konakları', firma: 'akyaka-doga',
    il: 'istanbul', ilce: 'umraniye', mahalle: 'ihlamurkuyu', tip: 'konut', durum: 'lansman',
    teslim: '2028Q3', konut: 264, ticari: 12, blok: 6, kat: 8, tavan: 3.2,
    aidat: 3800, pesinat: 30, vade: 48, faizsiz: false, santiye: 5,
    lng: 29.1521, lat: 41.0344, goruntulenme: 2140,
    ozellikler: { acik_havuz: true, guvenlik_247: true, kapali_otopark: true, cocuk_oyun: true,
                  ebeveyn_banyo: true, deprem_2018: true },
    aciklama: '52 dönüm arsa üzerine kurulu, bahçeli konak tipolojisini apartman yoğunluğu olmadan kuran projelerden.',
    tipler: [
      { tip: '3+1', net: 142, brut: 172, fiyat: 9_800_000,  toplam: 132, kalan: 118 },
      { tip: '4+1', net: 188, brut: 224, fiyat: 13_600_000, toplam: 96,  kalan: 88 },
      { tip: '5+1', net: 236, brut: 278, fiyat: 17_200_000, toplam: 36,  kalan: 34 },
    ],
  },
  {
    slug: 'major-golyaka', ad: 'Majör Gölyaka', firma: 'cevahir-yapi',
    il: 'istanbul', ilce: 'avcilar', mahalle: 'firuzkoy', tip: 'konut', durum: 'satista',
    teslim: '2027Q3', konut: 1140, ticari: 38, blok: 14, kat: 18, tavan: 2.8,
    aidat: 2600, pesinat: 25, vade: 60, faizsiz: true, santiye: 33,
    lng: 28.7186, lat: 40.9797, goruntulenme: 3960,
    ozellikler: { acik_havuz: true, spor_salonu: true, guvenlik_247: true, kapali_otopark: true,
                  cocuk_oyun: true, deprem_2018: true },
    aciklama: 'Cevahir Yapı ve Emlak Konut GYO ortaklığı taşıyor. Modern şehirleşmenin başarılı örneklerinden.',
    tipler: [
      { tip: '1+1', net: 58,  brut: 74,  fiyat: 3_600_000,  toplam: 240, kalan: 96 },
      { tip: '2+1', net: 88,  brut: 110, fiyat: 5_400_000,  toplam: 520, kalan: 214 },
      { tip: '3+1', net: 122, brut: 150, fiyat: 7_200_000,  toplam: 300, kalan: 118 },
    ],
  },
  {
    // Fiyatı olmayan proje — arayüzün bu durumu nasıl karşıladığını görmek için
    slug: 'banu-evleri-ispartakule-4', ad: 'Banu Evleri Ispartakule 4', firma: 'hasanoglu-grup',
    il: 'istanbul', ilce: 'avcilar', mahalle: 'ispartakule', tip: 'konut', durum: 'lansman',
    teslim: '2028Q2', konut: 70, ticari: 4, blok: 2, kat: 12, tavan: 2.8,
    aidat: null, pesinat: null, vade: null, faizsiz: null, santiye: 8,
    lng: 28.7002, lat: 41.0294, goruntulenme: 1520,
    ozellikler: { guvenlik_247: true, kapali_otopark: true, deprem_2018: true },
    aciklama: 'Hasanoğlu şirketler grubu tarafından Avcılar Ispartakule\'de inşa ediliyor. Proje 2+1 ve 3+1 dairelerden meydana geliyor.',
    tipler: [
      { tip: '2+1', net: 96,  brut: 118, fiyat: null, toplam: 40, kalan: 40 },
      { tip: '3+1', net: 128, brut: 154, fiyat: null, toplam: 30, kalan: 30 },
    ],
  },
];

const POI = [
  { tip: 'metro',    ad: 'Acıbadem (M4)',        lng: 29.0463, lat: 40.9938 },
  { tip: 'metro',    ad: 'Ünalan (M4)',          lng: 29.0669, lat: 40.9975 },
  { tip: 'metro',    ad: 'Yakacık (M4)',         lng: 29.1841, lat: 40.9092 },
  { tip: 'metro',    ad: 'Çakmak (M5)',          lng: 29.1288, lat: 41.0246 },
  { tip: 'metro',    ad: 'Alibeyköy (T5)',       lng: 28.9432, lat: 41.0736 },
  { tip: 'metrobus', ad: 'Avcılar Merkez',       lng: 28.7215, lat: 40.9799 },
  { tip: 'okul',     ad: 'Acıbadem İlkokulu',    lng: 29.0538, lat: 40.9887 },
  { tip: 'okul',     ad: 'Yakacık Anadolu Lisesi', lng: 29.1912, lat: 40.9041 },
  { tip: 'hastane',  ad: 'Acıbadem Hastanesi',   lng: 29.0602, lat: 40.9861 },
  { tip: 'hastane',  ad: 'Kartal Eğitim ve Araştırma', lng: 29.1774, lat: 40.9105 },
  { tip: 'avm',      ad: 'Emaar Square',         lng: 29.0668, lat: 40.9944 },
  { tip: 'avm',      ad: 'Metropol İstanbul',    lng: 29.1265, lat: 40.9924 },
  { tip: 'sahil',    ad: 'Kartal Sahil',         lng: 29.1932, lat: 40.8886 },
];

async function calistir() {
  console.log('Temizleniyor…');
  await sql`truncate medya, daire_tipi, teslim_kaydi, fiyat_kaydi, proje, firma, poi restart identity cascade`;

  console.log('Firmalar…');
  const firmaId = {};
  for (const f of FIRMALAR) {
    const [row] = await sql`
      insert into firma (
        slug, ad, kurulus_yili, merkez_il, merkez_ilce, dogrulandi,
        paket, otomatik_onay, ortakliklar, hakkinda
      ) values (
        ${f.slug}, ${f.ad}, ${f.yil}, ${f.il}, ${f.ilce}, true,
        ${f.otomatik ? 'pro' : 'ucretsiz'}, ${f.otomatik},
        ${f.ortakliklar ?? null}, ${f.hakkinda ?? null}
      ) returning id`;
    firmaId[f.slug] = row.id;
  }

  console.log('POI…');
  for (const p of POI) {
    await sql`
      insert into poi (tip, ad, konum)
      values (${p.tip}, ${p.ad}, st_setsrid(st_makepoint(${p.lng}, ${p.lat}), 4326)::geography)`;
  }

  console.log('Projeler…');
  for (const p of PROJELER) {
    const [proje] = await sql`
      insert into proje (
        slug, ad, firma_id, il, ilce, mahalle, konum, tip, durum, teslim_ceyrek,
        toplam_konut, ticari_birim, blok_sayisi, kat_sayisi, tavan_yuksekligi,
        aidat, pesinat_orani, vade_ay, faizsiz, santiye_yuzde, ozellikler,
        aciklama, fiyat_teyit_tarihi, goruntulenme, veri_skoru, yayinda
      ) values (
        ${p.slug}, ${p.ad}, ${firmaId[p.firma]}, ${p.il}, ${p.ilce}, ${p.mahalle},
        st_setsrid(st_makepoint(${p.lng}, ${p.lat}), 4326)::geography,
        ${p.tip}, ${p.durum}, ${p.teslim},
        ${p.konut}, ${p.ticari}, ${p.blok}, ${p.kat}, ${p.tavan},
        ${p.aidat}, ${p.pesinat}, ${p.vade}, ${p.faizsiz}, ${p.santiye},
        ${sql.json(p.ozellikler)}, ${p.aciklama},
        ${p.tipler.some((t) => t.fiyat) ? sql`current_date - 2` : null},
        ${p.goruntulenme}, 80, true
      ) returning id`;

    // Kapak görseli — R2 anahtarı; dosyanın kendisi veritabanında tutulmaz
    await sql`
      insert into medya (proje_id, tur, key, alt, sira, varyant_hazir)
      values (${proje.id}, 'gorsel', ${`projeler/${proje.id}/gorsel/kapak.jpg`},
              ${`${p.ad} — ${p.ilce}, ${p.il}`}, 0, true)`;

    for (const t of p.tipler) {
      // Kat planı görseli — plan yoksa kat planı sayfası hiç açılmaz
      let planId = null;
      if (t.odalar?.length) {
        const [plan] = await sql`
          insert into medya (proje_id, tur, key, alt, sira, varyant_hazir)
          values (${proje.id}, 'kat_plani',
                  ${`projeler/${proje.id}/plan/${t.tip.replace('+', '-')}.png`},
                  ${`${p.ad} ${t.tip} kat planı, ${t.net} m² net`}, 0, true)
          returning id`;
        planId = plan.id;
      }

      const [dt] = await sql`
        insert into daire_tipi (
          proje_id, tip, net_m2, brut_m2, liste_fiyati, toplam_adet, kalan_adet,
          odalar, cephe, manzara, bulundugu_katlar, kat_plani_id
        ) values (
          ${proje.id}, ${t.tip}, ${t.net}, ${t.brut}, ${t.fiyat}, ${t.toplam}, ${t.kalan},
          ${sql.json(t.odalar ?? [])}, ${t.cephe ?? null}, ${t.manzara ?? null},
          ${t.katlar ?? null}, ${planId}
        ) returning id`;

      // Fiyat arşivi — append-only. m² fiyat endeksinin geçmiş serisi
      // burada birikir; arşiv ne kadar derinse endeks o kadar sağlam.
      //
      // 24 aylık geçmiş geriye doğru üretilir: bugünkü fiyattan başlayıp
      // aylık ~%2,2 bileşik düşüşle geriye gidilir, üstüne küçük bir
      // dalgalanma eklenir. Gerçek veri gelene kadar seri boş kalmasın diye.
      if (t.fiyat) {
        const AY = 24;
        const AYLIK_ARTIS = 0.022;
        const kayitlar = [];

        for (let geri = AY; geri >= 0; geri--) {
          const taban = t.fiyat / Math.pow(1 + AYLIK_ARTIS, geri);
          // Deterministik dalgalanma: aynı seed her çalıştırmada aynı seriyi üretir
          const salinim = 1 + Math.sin(geri * 1.7 + t.net) * 0.012;
          const fiyat = Math.round((taban * salinim) / 1000) * 1000;
          const kalan = Math.min(t.toplam, t.kalan + Math.round(geri * (t.toplam - t.kalan) / AY));
          kayitlar.push({ fiyat, kalan, geri });
        }

        for (const k of kayitlar) {
          await sql`
            insert into fiyat_kaydi (daire_tipi_id, fiyat, kalan_adet, kaynak, kaydeden, kaydedildi)
            values (${dt.id}, ${k.fiyat}, ${k.kalan}, 'panel', 'seed',
                    date_trunc('month', now()) - (${k.geri} || ' months')::interval + interval '12 days')`;
        }
      }
    }
  }

  // ── Teslim edilmiş projeler ──
  // Proje SİLİNMEZ, arşive geçer. Fiyat geçmişi kalır ve firma karnesinin
  // teslim isabeti bileşenini besler. "teslim m²" ile "bugünkü m²" farkı
  // alıcıya firmanın geçmiş projelerinin getirisini gösterir.
  console.log('Arşiv projeleri ve teslim kayıtları…');

  const ARSIV = [
    { slug: 'esat-koru-evleri', ad: 'Esat Koru Evleri', firma: 'esat-insaat',
      ilce: 'umraniye', konut: 124, ilan: '2025Q2', ger: '2025Q2', gecikme: 0,
      teslimM2: 41_200, guncelM2: 64_800, lng: 29.1201, lat: 41.0189 },
    { slug: 'acibadem-loft', ad: 'Acıbadem Loft', firma: 'esat-insaat',
      ilce: 'kadikoy', konut: 88, ilan: '2024Q3', ger: '2024Q4', gecikme: 1,
      teslimM2: 34_600, guncelM2: 71_400, lng: 29.0522, lat: 40.9901 },
    { slug: 'esat-park-residence', ad: 'Esat Park Residence', firma: 'esat-insaat',
      ilce: 'atasehir', konut: 162, ilan: '2023Q4', ger: '2023Q4', gecikme: 0,
      teslimM2: 22_900, guncelM2: 58_200, lng: 29.1264, lat: 40.9923 },
    { slug: 'bostanci-sahil-evleri', ad: 'Bostancı Sahil Evleri', firma: 'esat-insaat',
      ilce: 'kadikoy', konut: 96, ilan: '2022Q2', ger: '2022Q3', gecikme: 3,
      teslimM2: 16_400, guncelM2: 79_600, lng: 29.0942, lat: 40.9541 },
    { slug: 'torunlar-vadi-konaklari', ad: 'Torunlar Vadi Konakları', firma: 'torunlar-gyo',
      ilce: 'basaksehir', konut: 420, ilan: '2024Q1', ger: '2024Q1', gecikme: 0,
      teslimM2: 28_400, guncelM2: 52_100, lng: 28.8021, lat: 41.0937 },
    { slug: 'torunlar-mahal-evleri', ad: 'Torunlar Mahal Evleri', firma: 'torunlar-gyo',
      ilce: 'eyupsultan', konut: 268, ilan: '2023Q2', ger: '2023Q2', gecikme: 0,
      teslimM2: 24_100, guncelM2: 49_800, lng: 28.9312, lat: 41.0688 },
    { slug: 'sur-yapi-vega', ad: 'Sur Yapı Vega', firma: 'sur-yapi',
      ilce: 'umraniye', konut: 340, ilan: '2024Q2', ger: '2024Q3', gecikme: 2,
      teslimM2: 33_800, guncelM2: 61_200, lng: 29.1188, lat: 41.0261 },
    { slug: 'cevahir-park-avcilar', ad: 'Cevahir Park Avcılar', firma: 'cevahir-yapi',
      ilce: 'avcilar', konut: 210, ilan: '2023Q3', ger: '2024Q1', gecikme: 4,
      teslimM2: 19_600, guncelM2: 42_300, lng: 28.7241, lat: 40.9821 },
    { slug: 'cevahir-yasam-vadisi', ad: 'Cevahir Yaşam Vadisi', firma: 'cevahir-yapi',
      ilce: 'avcilar', konut: 186, ilan: '2022Q1', ger: '2022Q3', gecikme: 5,
      teslimM2: 12_800, guncelM2: 40_100, lng: 28.7108, lat: 40.9884 },
    { slug: 'banu-evleri-ispartakule-3', ad: 'Banu Evleri Ispartakule 3', firma: 'hasanoglu-grup',
      ilce: 'avcilar', konut: 64, ilan: '2024Q4', ger: '2025Q1', gecikme: 2,
      teslimM2: 31_400, guncelM2: 48_900, lng: 28.7014, lat: 41.0281 },
    { slug: 'isiltili-evler-1', ad: 'Işıltılı Evler 1. Etap', firma: 'baskent-insaat',
      ilce: 'sancaktepe', konut: 58, ilan: '2024Q2', ger: '2024Q3', gecikme: 2,
      teslimM2: 27_200, guncelM2: 46_400, lng: 29.2298, lat: 41.0002 },
  ];

  for (const a of ARSIV) {
    const [proje] = await sql`
      insert into proje (
        slug, ad, firma_id, il, ilce, konum, tip, durum, teslim_ceyrek,
        teslim_tarihi, toplam_konut, teslim_m2_fiyati, guncel_m2_fiyati,
        ozellikler, veri_skoru, yayinda
      ) values (
        ${a.slug}, ${a.ad}, ${firmaId[a.firma]}, 'istanbul', ${a.ilce},
        st_setsrid(st_makepoint(${a.lng}, ${a.lat}), 4326)::geography,
        'konut', 'arsiv', ${a.ger},
        ${`${a.ger.slice(0, 4)}-0${(Number(a.ger.slice(5)) * 3)}-01`}::date,
        ${a.konut}, ${a.teslimM2}, ${a.guncelM2},
        '{}'::jsonb, 96, true
      ) returning id`;

    await sql`
      insert into teslim_kaydi (
        firma_id, proje_id, ilan_edilen, gerceklesen, gecikme_ay, kaynak, durum
      ) values (
        ${firmaId[a.firma]}, ${proje.id}, ${a.ilan}, ${a.ger}, ${a.gecikme},
        'ilan_arsivi', 'teyitli'
      )`;
  }

  // Açık itiraz örneği — firma sayfasında "itiraz edildi" olarak görünür
  await sql`
    update teslim_kaydi set durum = 'itiraz',
      itiraz_aciklama = 'Gecikme ruhsat revizyonundan kaynaklandı, belediye yazısı ekte.',
      itiraz_son_tarih = current_date + 2
    where proje_id = (select id from proje where slug = 'cevahir-yasam-vadisi')`;

  console.log('Bölge metinleri…');
  await sql`
    insert into bolge_sayfasi (il, ilce, metin) values
    ('istanbul', null, ${'İstanbul\'da 39 ilçede aktif konut projeleri listeleniyor. Fiyatlar, daire tipleri, ödeme planları ve teslim tarihleriyle birlikte. Projelerin büyük kısmı Anadolu Yakası\'nda Kadıköy, Ümraniye ve Kartal hattında; Avrupa Yakası\'nda ise Başakşehir ve Eyüpsultan çevresinde yoğunlaşıyor. Ulaşım, İstanbul\'da metrekare fiyatını belirleyen ana etken: ray sistemine yürüme mesafesindeki projelerde birim fiyat, aynı mahalledeki diğer projelere göre belirgin biçimde yüksek seyrediyor. Bu sayfadaki tüm veriler proje geliştiricilerinden alınan bilgilerle haftalık güncellenir.'}),
    ('istanbul', 'kadikoy', ${'Kadıköy, İstanbul Anadolu Yakası\'nın en yoğun konut geliştirme bölgelerinden biri. İlçedeki yeni projelerin büyük kısmı Fikirtepe kentsel dönüşüm alanında ve Acıbadem-Koşuyolu hattında yoğunlaşıyor. Fikirtepe\'de arsa payı yüksek, metrekare fiyatı görece düşük projeler; Acıbadem ve Suadiye\'de ise daha küçük ölçekli, metrekare fiyatı yüksek butik projeler öne çıkıyor. Ulaşım Kadıköy\'de fiyatı belirleyen ana etken. M4 ve M8 hatlarına yürüme mesafesindeki projelerde birim fiyat, aynı mahalledeki diğer projelere göre ortalama yüzde on dört daha yüksek. Sahil bandına yakınlık ise özellikle üç artı bir ve üzeri tiplerde belirleyici oluyor.'})`;

  console.log('Materyalize görünümler yenileniyor…');
  await sql`refresh materialized view mv_ilce_m2`;
  await sql`refresh materialized view mv_firma_karne`;
  await sql`refresh materialized view mv_endeks_donem`;

  const [{ count: pn }] = await sql`select count(*)::int from proje`;
  const [{ count: dn }] = await sql`select count(*)::int from daire_tipi`;
  console.log(`\nTamam: ${pn} proje, ${dn} daire tipi, ${FIRMALAR.length} firma, ${POI.length} POI.`);
  await sql.end();
}

calistir().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
