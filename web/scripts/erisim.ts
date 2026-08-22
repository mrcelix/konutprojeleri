import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { altRaporu } from '../lib/alt-metin';

/**
 * Erişilebilirlik denetimi.
 *
 * Çalışan sunucudan sayfaları çekip HTML üzerinde kontrol ediyor:
 *
 *   npm run erisim                    → varsayılan sayfa kümesi
 *   npm run erisim -- http://localhost:4311 /proje/x  → belirli sayfalar
 *
 * NEDEN TARAYICI DEĞİL: axe gibi araçlar hesaplanmış stile bakabildiği
 * için daha kapsamlı, ama tarayıcı gerektiriyor ve CI'da kurulumu ağır.
 * Buradaki kontroller HTML'den okunabilen — ve gerçekte en sık kırılan —
 * kuralları kapsıyor. Renk kontrastı ayrıca tasarım token'ları üzerinden
 * hesaplanıyor (`kontrastDenetimi`), çünkü token'lar sabit.
 *
 * Ayrıca VERİTABANINA da bakıyor (`veritabaniDenetimi`). Proje
 * fotoğraflarının alt metni HTML'den okunabiliyor ama yalnızca o an
 * gezilen sayfalarınki; yayında olmayan ilanlar hiç görünmüyor.
 * Alt metin bir içerik alanı, sabit bir şablon değil.
 *
 * Kapsamadıkları: klavye odak sırası, ekran okuyucu duyurumları,
 * hareket/animasyon tercihleri. Bunlar elle test edilmeli.
 */

const RENK = { hata: '\x1b[31m', uyari: '\x1b[33m', ok: '\x1b[32m', soluk: '\x1b[90m', bit: '\x1b[0m' };

interface Bulgu {
  sayfa: string;
  kural: string;
  agirlik: 'hata' | 'uyari';
  detay: string;
}

const bulgular: Bulgu[] = [];
const ekle = (sayfa: string, kural: string, agirlik: Bulgu['agirlik'], detay: string) =>
  bulgular.push({ sayfa, kural, agirlik, detay });

/* ---------------- HTML yardımcıları ---------------- */

/** Etiketleri kaba biçimde ayıklar — tam ayrıştırıcı yerine yeterli. */
function etiketler(html: string, ad: string): string[] {
  const r = new RegExp(`<${ad}\\b[^>]*>`, 'gi');
  return html.match(r) ?? [];
}

const oznitelik = (etiket: string, ad: string): string | null => {
  const m = new RegExp(`\\b${ad}\\s*=\\s*"([^"]*)"`, 'i').exec(etiket);
  return m ? m[1] : null;
};

const varMi = (etiket: string, ad: string) =>
  new RegExp(`\\b${ad}\\b`, 'i').test(etiket);

/** <script>, <style> ve yorumları atarak metin çıkarır. */
const metin = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/* ---------------- Kurallar ---------------- */

function denetle(yol: string, html: string) {
  /* 1. Sayfa dili */
  const htmlEtiket = etiketler(html, 'html')[0] ?? '';
  const lang = oznitelik(htmlEtiket, 'lang');
  if (!lang) ekle(yol, 'html-lang', 'hata', '<html> etiketinde lang yok');
  else if (!/^(tr|en)/.test(lang)) ekle(yol, 'html-lang', 'uyari', `beklenmeyen dil: ${lang}`);

  /* 2. Sayfa başlığı */
  const baslik = /<title>([^<]*)<\/title>/i.exec(html)?.[1]?.trim();
  if (!baslik) ekle(yol, 'title', 'hata', '<title> yok veya boş');
  else if (baslik.length < 8) ekle(yol, 'title', 'uyari', `çok kısa: "${baslik}"`);

  /* 3. Görsellerde alt metni */
  for (const img of etiketler(html, 'img')) {
    const alt = oznitelik(img, 'alt');
    if (alt === null) {
      const src = (oznitelik(img, 'src') ?? '').slice(0, 60);
      ekle(yol, 'img-alt', 'hata', `alt yok: ${src}`);
    } else if (/^(image|görsel|foto|photo|img)$/i.test(alt.trim())) {
      ekle(yol, 'img-alt', 'uyari', `anlamsız alt: "${alt}"`);
    }
  }

  /* 4. Başlık hiyerarşisi */
  const basliklar = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => ({ seviye: Number(m[1]), metin: metin(m[2]) }));

  const h1ler = basliklar.filter((b) => b.seviye === 1);
  if (h1ler.length === 0) ekle(yol, 'h1', 'hata', 'sayfada h1 yok');
  if (h1ler.length > 1) ekle(yol, 'h1', 'uyari', `${h1ler.length} adet h1 var`);

  let onceki = 0;
  for (const b of basliklar) {
    // Seviye atlaması: h2'den sonra h4 gelmesi ekran okuyucuda yapıyı bozar
    if (onceki && b.seviye > onceki + 1) {
      ekle(yol, 'baslik-sirasi', 'uyari',
        `h${onceki} → h${b.seviye} atlaması ("${b.metin.slice(0, 40)}")`);
    }
    if (!b.metin) ekle(yol, 'bos-baslik', 'hata', `boş h${b.seviye}`);
    onceki = b.seviye;
  }

  /* 5. Bağlantı ve düğme adları */
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const oz = m[1];
    const ic = metin(m[2]);
    const etiketAdi = /aria-label\s*=\s*"([^"]*)"/i.exec(oz)?.[1]
      ?? /title\s*=\s*"([^"]*)"/i.exec(oz)?.[1];
    // İçinde görsel varsa onun alt metni ad sayılır
    const icAlt = /<img\b[^>]*\balt\s*=\s*"([^"]+)"/i.exec(m[2])?.[1];
    if (!ic && !etiketAdi && !icAlt) {
      const href = /href\s*=\s*"([^"]*)"/i.exec(oz)?.[1] ?? '?';
      ekle(yol, 'bag-adi', 'hata', `metinsiz bağlantı: ${href.slice(0, 50)}`);
    }
    if (/^(tıkla|buraya|devam|daha|click here|read more)$/i.test(ic)) {
      ekle(yol, 'bag-adi', 'uyari', `bağlam dışı bağlantı metni: "${ic}"`);
    }
  }

  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const ic = metin(m[2]);
    const etiketAdi = /aria-label\s*=\s*"([^"]*)"/i.exec(m[1])?.[1];
    if (!ic && !etiketAdi) ekle(yol, 'dugme-adi', 'hata', 'adsız düğme (aria-label yok)');
  }

  /* 6. Form alanlarında etiket */
  const etiketliIdler = new Set(
    [...html.matchAll(/<label\b[^>]*\bfor\s*=\s*"([^"]+)"/gi)].map((m) => m[1]),
  );

  // <label>…<input>…</label> — sarmalanmış alanlar da etiketli sayılır.
  // Bunu görmezden gelmek denetimi yanlış pozitife boğuyordu; sürekli
  // uyaran bir araç bir süre sonra hiç okunmuyor.
  const sarmalananlar = new Set<string>();
  for (const m of html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/gi)) {
    for (const alan of m[1].match(/<(input|select|textarea)\b[^>]*>/gi) ?? []) {
      sarmalananlar.add(alan);
    }
  }

  for (const alan of [...etiketler(html, 'input'), ...etiketler(html, 'select'), ...etiketler(html, 'textarea')]) {
    const tip = (oznitelik(alan, 'type') ?? '').toLowerCase();
    if (['hidden', 'submit', 'button', 'image'].includes(tip)) continue;

    const id = oznitelik(alan, 'id');
    const ariaLabel = oznitelik(alan, 'aria-label') ?? oznitelik(alan, 'aria-labelledby');
    const sarmalanmis = sarmalananlar.has(alan);

    if (!(id && etiketliIdler.has(id)) && !ariaLabel && !sarmalanmis) {
      const ipucu = oznitelik(alan, 'placeholder') ?? oznitelik(alan, 'name') ?? '?';
      // placeholder etiket yerine geçmez: odaklanınca kaybolur
      ekle(yol, 'form-etiketi', 'uyari', `etiketsiz alan: ${ipucu.slice(0, 40)}`);
    }
  }

  /* 7. Yinelenen id */
  /* `\bid=` deseni `data-id=` gibi öznitelikleri de yakalıyordu: tire
     ile "id" arasında sözcük sınırı var. Aynı proje iki listede birden
     çıktığında `data-id` tekrar ediyor ve araç gerçek olmayan bir
     çakışma bildiriyordu. Öncesinde harf ya da tire olmaması aranıyor. */
  const idler = [...html.matchAll(/(?<![\w-])id\s*=\s*"([^"]+)"/gi)].map((m) => m[1]);
  const gorulen = new Set<string>();
  for (const id of idler) {
    if (gorulen.has(id)) ekle(yol, 'yinelenen-id', 'hata', `id="${id}" birden fazla`);
    gorulen.add(id);
  }

  /* 8. Yakınlaştırma engeli */
  const viewport = etiketler(html, 'meta').find((m) => /name\s*=\s*"viewport"/i.test(m));
  if (viewport) {
    const icerik = oznitelik(viewport, 'content') ?? '';
    if (/user-scalable\s*=\s*no/i.test(icerik) || /maximum-scale\s*=\s*1(\.0)?\b/i.test(icerik)) {
      ekle(yol, 'yakinlastirma', 'hata', 'yakınlaştırma engellenmiş (WCAG 1.4.4)');
    }
  }

  /* 9. Yer işaretleri (landmark) */
  if (!/<main\b/i.test(html)) ekle(yol, 'landmark', 'uyari', '<main> yok');
  if (!/<nav\b/i.test(html)) ekle(yol, 'landmark', 'uyari', '<nav> yok');

  /* 10. Pozitif tabindex — odak sırasını bozar */
  for (const m of html.matchAll(/\btabindex\s*=\s*"(\d+)"/gi)) {
    if (Number(m[1]) > 0) ekle(yol, 'tabindex', 'uyari', `tabindex="${m[1]}" odak sırasını bozar`);
  }

  /* 11. İçeriğe atlama bağlantısı */
  if (!/href\s*=\s*"#(icerik|content|main)"/i.test(html)) {
    ekle(yol, 'atlama-bagi', 'uyari', 'içeriğe atlama bağlantısı yok');
  }
}

/* ---------------- Renk kontrastı ---------------- */

const HEX = /#([0-9a-f]{6})/i;

function kanal(v: number) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function parlaklik(hex: string): number {
  const m = HEX.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return 0.2126 * kanal((n >> 16) & 255) + 0.7152 * kanal((n >> 8) & 255) + 0.0722 * kanal(n & 255);
}

export function kontrast(a: string, b: string): number {
  const l1 = parlaklik(a), l2 = parlaklik(b);
  const [y, k] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (y + 0.05) / (k + 0.05);
}

/**
 * Tasarım token'ları üzerinden kontrast denetimi.
 * Token'lar sabit hex olduğu için tarayıcı gerekmiyor.
 */
/**
 * Tasarım token'ları üzerinden kontrast denetimi.
 *
 * Palet `app/globals.css`ten OKUNUYOR, buraya kopyalanmıyor. İlk sürümde
 * kopyalanmıştı ve token'lar değişince denetim eski değerleri raporladı —
 * yani düzeltilmiş bir sorunu "hâlâ var" diye gösterdi. Tek kaynak ilkesi
 * denetim araçları için de geçerli.
 */
function paletOku(css: string, blok: RegExp): Record<string, string> {
  const govde = blok.exec(css)?.[1] ?? '';
  const p: Record<string, string> = {};
  for (const m of govde.matchAll(/--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) {
    p[m[1]] = m[2];
  }
  return p;
}

function kontrastDenetimi() {
  const css = readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');
  const acik = paletOku(css, /:root\s*\{([\s\S]*?)\}/);
  const koyu = paletOku(css, /\[data-theme="dark"\]\s*\{([\s\S]*?)\}/);

  if (!acik.ink || !koyu.ink) {
    console.log('\n  ! globals.css okunamadı, kontrast denetimi atlandı');
    return;
  }

  const ciftler: [string, string, string, number][] = [];
  for (const [tema, p] of [['açık', acik], ['koyu', koyu]] as const) {
    const zemin = p.bg;
    ciftler.push(
      [`${tema}: gövde metni / zemin`, p.ink, zemin, 4.5],
      [`${tema}: ikincil metin / zemin`, p['ink-2'], zemin, 4.5],
      [`${tema}: soluk metin / zemin`, p['ink-3'], zemin, 4.5],
      [`${tema}: gövde metni / yüzey`, p.ink, p.surface, 4.5],
      [`${tema}: ikincil metin / yüzey-2`, p['ink-2'], p['surface-2'], 4.5],
      [`${tema}: marka rengi / zemin`, p.primary, zemin, 4.5],
      [`${tema}: vurgu / zemin`, p.accent, zemin, 4.5],
      [`${tema}: başarı / zemin`, p.success, zemin, 4.5],
      [`${tema}: hata / zemin`, p.danger, zemin, 4.5],
      [`${tema}: vurgu / vurgu rozeti`, p.accent, p['accent-100'], 4.5],
      [`${tema}: başarı / başarı rozeti`, p.success, p['success-100'], 4.5],
      [`${tema}: hata / hata rozeti`, p.danger, p['danger-100'], 4.5],
      // Amber dolgu metin rengi olarak kullanılamıyor; üstündeki metin kontrol ediliyor
      [`${tema}: çağrı metni / çağrı zemini`, p['on-cta'], p.cta, 4.5],
      // Altbilgi ve çağrı şeridi tema fark etmeksizin koyu blok
      [`${tema}: altbilgi metni / koyu blok`, p['koyu-ink'], p['koyu-blok'], 4.5],
      [`${tema}: altbilgi ikincil / koyu blok`, p['koyu-ink-2'], p['koyu-blok'], 4.5],
      // Birincil düğme: beyaz metin marka zemininde
      [`${tema}: düğme metni / marka zemini`, tema === 'açık' ? '#FFFFFF' : '#06110F', p.primary, 4.5],
    );
  }

  console.log('\n═══ Renk kontrastı (WCAG AA, normal metin ≥ 4.5) ═══');
  for (const [ad, on, arka, esik] of ciftler) {
    if (!on || !arka) { console.log(`  ${RENK.soluk}? ${ad} — token bulunamadı${RENK.bit}`); continue; }
    const k = kontrast(on, arka);
    const gecti = k >= esik;
    const isaret = gecti ? `${RENK.ok}✓${RENK.bit}` : `${RENK.hata}✗${RENK.bit}`;
    console.log(`  ${isaret} ${ad.padEnd(34)} ${k.toFixed(2)}:1`);
    if (!gecti) {
      ekle('(tasarım token)', 'kontrast', k >= 3 ? 'uyari' : 'hata',
        `${ad} — ${k.toFixed(2)}:1 (gereken ${esik}) · ${on} / ${arka}`);
    }
  }
}

/* ---------------- Çalıştırma ---------------- */

const VARSAYILAN = [
  '/', '/bolgeler', '/projeler/atasehir', '/arama', '/firmalar',
  '/nasil-calisir', '/yerinde-inceleme', '/giris', '/veri-talebi', '/firma-basvuru',
  '/pano', '/favoriler',
  /* Proje ve firma sayfaları SLUG İSTİYOR: envanter kuruluma göre
     değişiyor ve sabit bir slug yazmak, boş bir kurulumda denetimi
     404 üzerinde çalıştırırdı. */
  ...(process.env.ERISIM_PROJE ? [`/proje/${process.env.ERISIM_PROJE}`] : []),
  ...(process.env.ERISIM_FIRMA ? [`/firma/${process.env.ERISIM_FIRMA}`] : []),
  '/en', '/en/regions', '/en/search', '/en/developments/atasehir',
  ...(process.env.ERISIM_PROJE ? [`/en/project/${process.env.ERISIM_PROJE}`] : []),
];

/**
 * Oturum gerektiren sayfalar.
 *
 * Panel arayüzleri de erişilebilir olmalı: firma yetkilileri arasında
 * görme güçlüğü olanlar var ve panel onların işini yaptığı yer. `ERISIM_OTURUM`
 * ortam değişkenine geçerli bir oturum çerezi verilirse bunlar da
 * denetleniyor.
 *
 *   ERISIM_OTURUM=<token> npm run erisim
 */
const PANEL = [
  '/panel', '/panel/projeler', '/panel/mesajlar', '/panel/profil', '/panel/guvenlik',
  '/yonetim', '/yonetim/talepler', '/yonetim/kullanicilar', '/yonetim/analitik',
  '/yonetim/guvenlik', '/yonetim/performans', '/yonetim/alarmlar',
  // Uzun formlar: etiket bağı ve zorunlu alan işaretlemesi burada kırılıyor
  '/yonetim/firmalar', '/yonetim/firmalar/yeni', '/yonetim/projeler/yeni',
  '/yonetim/sayfalar', '/yonetim/sayfalar/yeni', '/yonetim/metinler',
  '/yonetim/projeler/ice-aktar', '/yonetim/veri-talepleri', '/yonetim/basvurular',
  ...(process.env.ERISIM_PROJE_ID ? [`/yonetim/projeler/${process.env.ERISIM_PROJE_ID}`] : []),
];

/**
 * Veritabanındaki alt metinler.
 *
 * Üç şeye bakıyor: makine yazdığı için henüz kimsenin dokunmadığı
 * metinler, aynı projede tekrar eden metinler ve kapak görseli.
 * Veritabanına ulaşılamazsa denetim düşmüyor — bu geçiş ek bir
 * kaynak, HTML denetiminin ön koşulu değil.
 */
async function veritabaniDenetimi() {
  let prisma: typeof import('../lib/db').prisma;
  try {
    ({ prisma } = await import('../lib/db'));
  } catch {
    console.log(`
${RENK.soluk}Veritabanı geçişi atlandı — bağlantı yok${RENK.bit}`);
    return;
  }

  try {
    const projeler = await prisma.proje.findMany({
      select: {
        ad: true, slug: true, yayinda: true,
        medya: { select: { alt: true, altOtomatik: true, sira: true }, orderBy: { sira: 'asc' } },
      },
    });

    for (const v of projeler) {
      if (v.medya.length === 0) continue;
      const r = altRaporu(v.medya);
      const yer = `db:/proje/${v.slug}`;

      /* Yayındaki projede eksik alt metin HATA: sayfa canlıda ve ekran
         okuyucu kullanan biri şu anda o galeriyi geziyor olabilir.
         Yayında değilse uyarı — henüz kimse görmüyor. */
      const agirlik = v.yayinda ? 'hata' : 'uyari';

      if (r.otomatik > 0) {
        ekle(yer, 'alt metni makine yazdı', agirlik,
          `${v.ad}: ${r.otomatik}/${r.toplam} görsel`);
      }
      if (r.kopya > 0) {
        ekle(yer, 'aynı projede tekrar eden alt metin', agirlik,
          `${v.ad}: ${r.kopya} tekrar`);
      }
      if (!r.kapakHazir && v.yayinda) {
        ekle(yer, 'kapak görselinin alt metni yazılmamış', 'hata', v.ad);
      }
    }

    const toplamGorsel = projeler.reduce((t, v) => t + v.medya.length, 0);
    console.log(`
  ${RENK.soluk}veritabanı: ${projeler.length} proje, ${toplamGorsel} görsel${RENK.bit}`);
    await prisma.$disconnect();
  } catch (e) {
    console.log(`
${RENK.uyari}!${RENK.bit} Veritabanı geçişi başarısız: ${e instanceof Error ? e.message : e}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const taban = args.find((a) => a.startsWith('http')) ?? 'http://localhost:4311';
  const yollar = args.filter((a) => a.startsWith('/'));

  const oturum = process.env.ERISIM_OTURUM?.trim();
  const hedefler = yollar.length
    ? yollar
    : (oturum ? [...VARSAYILAN, ...PANEL] : VARSAYILAN);

  console.log(`\nErişilebilirlik denetimi — ${taban}`);
  console.log(oturum
    ? `${RENK.soluk}Panel sayfaları dahil (${PANEL.length} sayfa)${RENK.bit}\n`
    : `${RENK.soluk}Panel sayfaları atlandı — ERISIM_OTURUM tanımlayın${RENK.bit}\n`);

  for (const yol of hedefler) {
    try {
      const y = await fetch(taban + yol, {
        redirect: 'follow',
        headers: oturum ? { Cookie: `vn_oturum=${oturum}` } : {},
      });
      if (!y.ok) {
        console.log(`  ${RENK.uyari}!${RENK.bit} ${yol} — HTTP ${y.status}, atlandı`);
        continue;
      }
      const html = await y.text();
      const oncekiSayi = bulgular.length;
      denetle(yol, html);
      const yeni = bulgular.length - oncekiSayi;
      const hata = bulgular.slice(oncekiSayi).filter((b) => b.agirlik === 'hata').length;
      const isaret = hata ? `${RENK.hata}✗${RENK.bit}` : yeni ? `${RENK.uyari}!${RENK.bit}` : `${RENK.ok}✓${RENK.bit}`;
      console.log(`  ${isaret} ${yol.padEnd(30)} ${yeni ? `${hata} hata, ${yeni - hata} uyarı` : 'temiz'}`);
    } catch (e) {
      console.log(`  ${RENK.uyari}!${RENK.bit} ${yol} — ulaşılamadı (${e instanceof Error ? e.message : e})`);
    }
  }

  kontrastDenetimi();
  await veritabaniDenetimi();

  const hatalar = bulgular.filter((b) => b.agirlik === 'hata');
  const uyarilar = bulgular.filter((b) => b.agirlik === 'uyari');

  if (bulgular.length) {
    console.log('\n═══ Bulgular ═══');
    const gruplar = new Map<string, Bulgu[]>();
    for (const b of bulgular) {
      const l = gruplar.get(b.kural) ?? [];
      l.push(b);
      gruplar.set(b.kural, l);
    }
    for (const [kural, liste] of [...gruplar].sort((a, b) => b[1].length - a[1].length)) {
      const agir = liste[0].agirlik === 'hata' ? RENK.hata : RENK.uyari;
      console.log(`\n${agir}${kural}${RENK.bit} (${liste.length})`);
      for (const b of liste.slice(0, 6)) {
        console.log(`  ${RENK.soluk}${b.sayfa}${RENK.bit}  ${b.detay}`);
      }
      if (liste.length > 6) console.log(`  ${RENK.soluk}… ${liste.length - 6} tane daha${RENK.bit}`);
    }
  }

  console.log(`\n${hatalar.length ? RENK.hata : RENK.ok}${hatalar.length} hata${RENK.bit}, ${uyarilar.length} uyarı\n`);
  console.log(`${RENK.soluk}Kapsam dışı (elle test edilmeli): klavye odak sırası,`);
  console.log(`ekran okuyucu duyurumları, hareket tercihleri.${RENK.bit}\n`);

  process.exit(hatalar.length ? 1 : 0);
}

// Yalnızca doğrudan çalıştırıldığında denetim yapılır; `kontrast`
// fonksiyonu başka scriptlerden içe aktarılabiliyor.
if (process.argv[1]?.includes('erisim')) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
