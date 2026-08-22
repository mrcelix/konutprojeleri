import 'dotenv/config';
import * as S from '../lib/bildirim/sablonlar';
import * as EN from '../lib/bildirim/sablonlar-en';

/**
 * Ziyaretçiye giden e-postaların dil eşleşmesi.
 *   node --conditions=react-server --import tsx scripts/test-bildirim-dil.ts
 *
 * Boşluk hep aynı şekilde oluşuyor: yeni bir şablon yazılıyor ama
 * yalnızca Türkçesi, çünkü hiçbir şey "bunun İngilizcesi de olmalı"
 * demiyor. İngilizce sayfadan form dolduran kişi Türkçe e-posta
 * alıyor ve o e-postayı hiç okumuyor.
 *
 * Aşağıdaki kayıt bunu söylüyor: ZIYARETCI_SABLONLARI listesindeki
 * her şablonun iki dilde de karşılığı olmak zorunda. Yeni bir
 * ziyaretçi şablonu eklenip listeye yazıldığında, İngilizcesi yoksa
 * test düşer.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

/**
 * ZİYARETÇİYE giden şablonlar — iki dilde de bulunmak zorunda.
 *
 * Ekibe ve firmaya giden şablonlar listede YOK ve bu kasıtlı: onlar
 * bizim kendi çalışanlarımız ve Türkiye'deki geliştirici firmalar,
 * Türkçe doğru dil. `talepEkip`, `yeniSoru`, `hesapOlusturuldu`,
 * `parolaSifirlandi`, `basvuru*` bu yüzden dışarıda.
 */
const ZIYARETCI_SABLONLARI = [
  'talepAlindi', 'randevuTeyit', 'soruYanitlandi', 'kvkkDogrulama', 'alarmSatista',
] as const;

/**
 * Şablonu örnek verilerle çağırır — imzalar farklı olduğu için elle.
 *
 * Alıntılanan KULLANICI metni (firmanın yanıtı) şablonun kendi metni
 * değil, olduğu gibi geçiriliyor. Dile göre örnek veriliyor ki
 * "İngilizce çıktıda Türkçe var" kontrolü, ziyaretçinin gerçekten
 * Türkçe bir yanıt alıntısını yakalayıp yanlış alarm vermesin.
 */
function uret(mod: typeof S | typeof EN, ad: string): S.Sablon | null {
  const f = (mod as Record<string, unknown>)[ad];
  if (typeof f !== 'function') return null;
  const ingilizce = mod === EN;
  const yanitOrnegi = ingilizce
    ? 'Delivery is scheduled for the second quarter of 2027.'
    : 'Teslim 2027 2. çeyrekte planlanıyor.';
  const projeAd = 'Meridyen Park Ataşehir';
  const projeSlug = 'meridyen-park-atasehir';

  switch (ad) {
    case 'talepAlindi':
      return (f as (a: string, k: string, p: string | null, s: string | null) => S.Sablon)(
        'Ada Fletcher', 'TLP-K7M2QX', projeAd, projeSlug);
    case 'randevuTeyit':
      return (f as (a: string, k: string, p: string | null, n: Date, y: string) => S.Sablon)(
        'Ada Fletcher', 'TLP-K7M2QX', projeAd,
        new Date(Date.UTC(2026, 6, 12, 11, 0)), 'Barbaros Mah. satış ofisi');
    case 'soruYanitlandi':
      return (f as (a: string, b: string, c: string, d: string, e: string) => S.Sablon)(
        'Ada Fletcher', 'Meridyen Yapı', projeAd, projeSlug, yanitOrnegi);
    case 'kvkkDogrulama':
      return (f as (t: 'ERISIM' | 'SILME', j: string) => S.Sablon)('SILME', 'jeton123');
    case 'alarmSatista':
      return (f as (p: string, s: string, j: string) => S.Sablon)(projeAd, projeSlug, 'jeton123');
    default:
      return (f as () => S.Sablon)();
  }
}

/** İngilizce metne sızmış Türkçe kalıntılar. */
const TURKCE_IZ = /\b(Merhaba|Sayın|Talebiniz|Randevunuz|Teşekkürler|gerekiyor|bağlantı)\b/;

function main() {
  console.log('\n═══ 1. Her ziyaretçi şablonu iki dilde var ═══');
  for (const ad of ZIYARETCI_SABLONLARI) {
    const trVar = typeof (S as Record<string, unknown>)[ad] === 'function';
    const enVar = typeof (EN as Record<string, unknown>)[ad] === 'function';
    bekle(`${ad}: TR + EN`, trVar && enVar,
      trVar && enVar ? '' : `TR:${trVar ? 'var' : 'YOK'} EN:${enVar ? 'var' : 'YOK'}`);
  }

  console.log('\n═══ 2. İkisi de gerçekten içerik üretiyor ═══');
  for (const ad of ZIYARETCI_SABLONLARI) {
    const tr = uret(S, ad);
    const en = uret(EN, ad);
    bekle(`${ad}: konu, html ve düz metin dolu`,
      !!tr?.konu && !!tr.html && !!tr.metin && !!en?.konu && !!en.html && !!en.metin);
  }

  console.log('\n═══ 3. İngilizce çıktı gerçekten İngilizce ═══');
  for (const ad of ZIYARETCI_SABLONLARI) {
    const en = uret(EN, ad);
    bekle(`${ad}: lang="en"`, en?.html.includes('lang="en"') === true);
  }
  for (const ad of ZIYARETCI_SABLONLARI) {
    const en = uret(EN, ad);
    const iz = TURKCE_IZ.exec(en?.metin ?? '');
    bekle(`${ad}: düz metinde Türkçe kalıntı yok`, !iz, iz?.[0] ?? '');
  }

  console.log('\n═══ 4. İngilizce bağlantılar İngilizce sayfalara gidiyor ═══');
  /* `/proje/x` yerine `/en/project/x`. Yanlış dile düşen bağlantı,
     e-postayı çevirmenin yarısını boşa çıkarıyor. */
  for (const ad of ['talepAlindi', 'soruYanitlandi', 'alarmSatista'] as const) {
    const en = uret(EN, ad);
    const metin = en?.metin ?? '';
    const trYol = /https?:\/\/[^"\s]*\/proje\//.test(metin);
    const enYol = /\/en\/project\//.test(metin);
    bekle(`${ad}: /en/ altına bağlanıyor`, enYol && !trYol,
      trYol ? 'Türkçe yola bağlanıyor' : '');
  }

  /* Talep kodu İKİ DİLDE DE gövdede: ziyaretçinin durumunu
     sorgulayabildiği tek anahtar o ve e-postadan başka bir yerde
     saklanmıyor. */
  console.log('\n═══ 5. Talep kodu kaybolmuyor ═══');
  bekle('talepAlindi (TR): kod gövdede',
    (uret(S, 'talepAlindi')?.metin ?? '').includes('TLP-K7M2QX'));
  bekle('talepAlindi (EN): kod gövdede',
    (uret(EN, 'talepAlindi')?.metin ?? '').includes('TLP-K7M2QX'));

  // Alıntılanan yanıt gövdeye gerçekten giriyor mu
  bekle('soruYanitlandi: firmanın yanıtı gövdede',
    (uret(EN, 'soruYanitlandi')?.metin ?? '').includes('second quarter of 2027'));

  /* KVKK doğrulama sayfası BİLEREK Türkçe: hak adları Türk
     mevzuatından geliyor ve çevirisi hukuki karşılık taşımıyor.
     E-posta bunu okuyucuya söylemek zorunda. */
  const kvkkEn = uret(EN, 'kvkkDogrulama');
  bekle('kvkkDogrulama: doğrulama sayfasının Türkçe olduğu söyleniyor',
    /Turkish/.test(kvkkEn?.metin ?? '') && /Turkish/.test(kvkkEn?.html ?? ''));
  bekle('kvkkDogrulama: 48 saat sınırı iki dilde de yazıyor',
    (uret(S, 'kvkkDogrulama')?.metin ?? '').includes('48')
    && (kvkkEn?.metin ?? '').includes('48'));

  console.log('\n═══ 6. Türkçe şablonlar bozulmadı ═══');
  for (const ad of ZIYARETCI_SABLONLARI) {
    const tr = uret(S, ad);
    bekle(`${ad}: lang="tr"`, tr?.html.includes('lang="tr"') === true);
  }

  console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
  process.exit(kalan === 0 ? 0 : 1);
}

main();
