import 'dotenv/config';
import { DILLER, dilYolu, turkceYol } from '../lib/i18n';

/* ============================================================
   SEO denetimi.

   Çalışan sunucuya karşı HTML çekip her indekslenebilir sayfada
   temel işaretleri sınıyor. `npm run erisim` erişilebilirliğe,
   bu betik arama motoruna bakıyor.

   Çalıştırma:
     npm run dev   (ayrı terminalde)
     npm run seo

   Kontroller ve NEDEN:

   · title 15–65 karakter — Google 60 civarında kesiyor; çok kısa
     başlık sayfayı ayırt etmiyor
   · description 70–165 — kısa açıklama SERP'te boş yer bırakıyor,
     uzun olan kesiliyor
   · TEK h1 — birden fazla h1, sayfanın konusunu belirsizleştiriyor
   · canonical — aynı içeriğin sorgu dizeli kopyaları ayrı sayfa
     sayılmasın
   · og:image — paylaşımda kart görseli
   · JSON-LD — zengin sonuç
   · hreflang — çok dilli eşleşme
   · alt metni olmayan görsel
   · noindex — YANLIŞLIKLA konmuş mu
   ============================================================ */

const KOK = process.env.SEO_KOK ?? 'http://localhost:3000';

/** Bu yolun başka bir yayındaki dilde karşılığı var mı? */
function cokDilli(yol: string): boolean {
  const tr = yol.startsWith('/en') || yol.startsWith('/ru') ? turkceYol(yol) : yol;
  if (!tr) return false;
  return DILLER.some((d) => d !== 'tr' && dilYolu(tr, d) !== null);
}

const YOLLAR = [
  '/', '/bolgeler', '/arama', '/rehber', '/firmalar', '/pano',
  '/projeler/atasehir', '/projeler/atasehir/guvenlikli-siteler',
  '/hakkimizda', '/nasil-calisir', '/sikca-sorulanlar', '/yerinde-inceleme',
  '/firma-rehberi', '/gizlilik', '/firma-basvuru', '/iletisim',
  '/en', '/en/regions', '/en/search', '/en/developments/atasehir',
];

interface Bulgu { yol: string; seviye: 'hata' | 'uyari'; ne: string }

const bulgular: Bulgu[] = [];
const ekle = (yol: string, seviye: Bulgu['seviye'], ne: string) => bulgular.push({ yol, seviye, ne });

const arasi = (html: string, kalip: RegExp): string | null => kalip.exec(html)?.[1]?.trim() ?? null;

async function denetle(yol: string) {
  let html: string;
  try {
    const y = await fetch(KOK + yol, { headers: { 'user-agent': 'konutprojeleri-seo-denetim' } });
    if (!y.ok) { ekle(yol, 'hata', `HTTP ${y.status}`); return; }
    html = await y.text();
  } catch (e) {
    ekle(yol, 'hata', `istek başarısız: ${(e as Error).message}`);
    return;
  }

  const baslik = arasi(html, /<title>([^<]*)<\/title>/i);
  if (!baslik) ekle(yol, 'hata', 'title yok');
  else if (baslik.length < 15) ekle(yol, 'uyari', `title kısa (${baslik.length})`);
  else if (baslik.length > 65) ekle(yol, 'uyari', `title uzun (${baslik.length}): ${baslik.slice(0, 40)}…`);

  const aciklama = arasi(html, /<meta name="description" content="([^"]*)"/i);
  if (!aciklama) ekle(yol, 'hata', 'description yok');
  else if (aciklama.length < 70) ekle(yol, 'uyari', `description kısa (${aciklama.length})`);
  else if (aciklama.length > 165) ekle(yol, 'uyari', `description uzun (${aciklama.length})`);

  const h1Sayisi = (html.match(/<h1[\s>]/gi) ?? []).length;
  if (h1Sayisi === 0) ekle(yol, 'hata', 'h1 yok');
  else if (h1Sayisi > 1) ekle(yol, 'hata', `${h1Sayisi} adet h1`);

  const robots = arasi(html, /<meta name="robots" content="([^"]*)"/i) ?? '';
  /* `/arama` faceted arama (indeks kirliliği), `/gizlilik` demo
     sürümde örnek metin taşıdığı için, `/pano` ve `/favoriler` ise
     ÇEREZE BAĞLI kişisel araçlar oldukları için bilerek kapalı:
     arama sonucundan gelen kişi orada boş bir sayfa görürdü.
     `/firma-basvuru` ise gerçek bir pazarlama sayfası ve
     İNDEKSLENMELİ. */
  const NOINDEX = ['/arama', '/en/search', '/gizlilik', '/pano', '/favoriler'];
  const indekslenmeli = !NOINDEX.includes(yol);
  if (indekslenmeli && /noindex/i.test(robots)) ekle(yol, 'hata', 'noindex — bu sayfa indekslenmeli');
  if (!indekslenmeli && !/noindex/i.test(robots)) ekle(yol, 'uyari', 'noindex bekleniyordu');

  if (indekslenmeli) {
    if (!/<link rel="canonical"/i.test(html)) ekle(yol, 'hata', 'canonical yok');

    /* Canonical'ın ANA BİLGİSAYAR ADI, sayfanın sunulduğu adresle
       aynı olmalı. `www.site.com` üzerinden sunulan bir sayfanın
       canonical'ı `site.com` diyorsa Google iki host arasında karar
       vermek zorunda kalıyor; ikisi de 200 dönüyorsa aynı içerik iki
       adreste indekslenmeye aday oluyor. Çözüm kodda değil dağıtımda:
       biri diğerine 301 ile yönlenmeli ve NEXT_PUBLIC_SITE_URL o
       adresi göstermeli. */
    const kanonik = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
    if (kanonik) {
      try {
        const kHost = new URL(kanonik).host;
        const sHost = new URL(KOK).host;
        /* Yerelde ayrık: geliştirme sunucusu 3000'de, yapılandırılmış
           adres başka bir portta olabiliyor — bu bir kusur değil. */
        const yerel = (h: string) => /^(localhost|127\.|0\.0\.0\.0)/.test(h);
        if (kHost !== sHost && !yerel(kHost) && !yerel(sHost)) {
          ekle(yol, 'uyari', `canonical host farklı: ${kHost} ≠ ${sHost}`);
        }
      } catch { ekle(yol, 'uyari', 'canonical adresi çözümlenemedi'); }
    }
    if (!/property="og:image"/i.test(html)) ekle(yol, 'uyari', 'og:image yok');
    if (!/application\/ld\+json/i.test(html)) ekle(yol, 'uyari', 'JSON-LD yok');
    /* hreflang YALNIZCA karşılığı olan sayfada bekleniyor.
       `/rehber`, `/teklif-al`, `/ev-sahibi-ol` tek dilli: bunlara
       hreflang basmak, Google'a var olmayan bir alternatif bildirmek
       ve "alternatif sayfa bulunamadı" hatası üretmek olurdu. */
    if (cokDilli(yol) && !/hreflang=/i.test(html)) ekle(yol, 'uyari', 'hreflang yok');
  }

  /* Alt metni olmayan görsel: ekran okuyucuya sessiz, arama
     motoruna bilgisiz. `alt=""` bilinçli boşluk sayılıyor. */
  const imgler = html.match(/<img[^>]*>/gi) ?? [];
  const altsiz = imgler.filter((i) => !/\salt=/i.test(i)).length;
  if (altsiz > 0) ekle(yol, 'hata', `${altsiz} görselde alt metni yok`);

  // Başlık hiyerarşisi: h2 olmadan h3 kullanmak yapıyı bozuyor
  if ((html.match(/<h3[\s>]/gi) ?? []).length > 0 && (html.match(/<h2[\s>]/gi) ?? []).length === 0) {
    ekle(yol, 'uyari', 'h2 yokken h3 kullanılmış');
  }
}

async function ekDosyalar() {
  for (const [ad, yol] of [['sitemap', '/sitemap.xml'], ['robots', '/robots.txt']] as const) {
    try {
      const y = await fetch(KOK + yol);
      if (!y.ok) { ekle(yol, 'hata', `${ad} HTTP ${y.status}`); continue; }
      const metin = await y.text();
      if (ad === 'sitemap') {
        const adet = (metin.match(/<url>/g) ?? []).length;
        console.log(`  sitemap: ${adet} URL`);
        if (adet === 0) ekle(yol, 'hata', 'sitemap boş');
        /* İndekslenmeyen sayfa sitemap'te olmamalı: tarama bütçesini
           harcıyor ve "neden indekslemiyorsun" sinyali veriyor. */
        if (/\/arama/.test(metin)) ekle(yol, 'hata', 'sitemap noindex sayfa içeriyor (/arama)');
      } else {
        if (!/sitemap:/i.test(metin)) ekle(yol, 'uyari', 'robots.txt sitemap satırı yok');
      }
    } catch (e) {
      ekle(yol, 'hata', `${ad} okunamadı: ${(e as Error).message}`);
    }
  }
}

async function main() {
  console.log(`SEO denetimi — ${KOK}\n`);
  for (const yol of YOLLAR) await denetle(yol);
  await ekDosyalar();

  const hata = bulgular.filter((b) => b.seviye === 'hata');
  const uyari = bulgular.filter((b) => b.seviye === 'uyari');

  for (const b of bulgular) {
    console.log(`  ${b.seviye === 'hata' ? '✗' : '!'} ${b.yol} — ${b.ne}`);
  }
  console.log(`\n${hata.length} hata, ${uyari.length} uyarı · ${YOLLAR.length} sayfa`);
  process.exit(hata.length > 0 ? 1 : 0);
}

main();
