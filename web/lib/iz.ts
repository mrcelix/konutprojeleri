import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './db';

/* ============================================================
   Ziyaret izleme.

   KVKK'nın burada üç karşılığı var ve üçü de mimariyi belirliyor:

   1. ÇEREZ YOK. Çerez, açık rıza gerektiriyor ve rıza bandı
      göstermek istemiyoruz. Ziyaretçiyi ayırt etmek için çerez
      yerine türetilmiş bir özet kullanılıyor.
   2. IP SAKLANMIYOR. IP kişisel veri; yalnızca özet üretilirken
      girdi olarak kullanılıp atılıyor, hiçbir yere yazılmıyor.
   3. TUZ HER GECE DÖNÜYOR. Aynı ziyaretçi ertesi gün yeni bir
      ziyaretçi sayılıyor. Bu, kişiyi zaman içinde takip etmeyi
      imkânsız kılıyor — istenen de bu: "bugün kaç kişi geldi"
      sorusunun cevabı, kimin geldiğini bilmeyi gerektirmiyor.

   Sonuç: Plausible/Fathom sınıfı bir ölçüm. Kişi bazlı huni analizi
   yapılamıyor; günlük/haftalık trafik, kaynak dağılımı, sayfa
   performansı ve etkileşim sayıları çıkarılabiliyor.
   ============================================================ */

/** Günlük tuz — süreç belleğinde tutuluyor, gün değişince yenileniyor. */
let tuz = { gun: '', deger: '' };

function gunlukTuz(): string {
  const bugun = new Date().toISOString().slice(0, 10);
  if (tuz.gun !== bugun) tuz = { gun: bugun, deger: randomBytes(32).toString('hex') };
  return tuz.deger;
}

/**
 * Ziyaretçi özeti.
 *
 * IP + user-agent + günlük tuz. Tuz olmadan IP'nin özeti geri
 * çevrilebilir olurdu: IPv4 uzayı 4 milyar, bir sözlük saldırısı
 * dakikalar sürer.
 */
export function ziyaretciOzeti(ip: string, ua: string): string {
  return createHash('sha256').update(`${ip}|${ua}|${gunlukTuz()}`).digest('hex').slice(0, 24);
}

/** 30 dakikalık pencere: aynı ziyaretçinin ardışık sayfaları tek oturum. */
export function oturumOzeti(ziyaretci: string): string {
  const pencere = Math.floor(Date.now() / (30 * 60 * 1000));
  return createHash('sha256').update(`${ziyaretci}|${pencere}`).digest('hex').slice(0, 16);
}

/* ---------------- Sınıflandırma ---------------- */

const BOTLAR: [RegExp, string][] = [
  [/googlebot|google-inspectiontool|storebot-google/i, 'googlebot'],
  [/bingbot|adidxbot/i, 'bingbot'],
  [/yandex(bot|images|mobilebot)/i, 'yandexbot'],
  [/duckduckbot/i, 'duckduckbot'],
  [/applebot/i, 'applebot'],
  [/baiduspider/i, 'baiduspider'],
  [/ahrefsbot|semrushbot|mj12bot|dotbot|petalbot/i, 'seo-araci'],
  [/gptbot|claudebot|ccbot|perplexitybot|anthropic-ai|google-extended/i, 'yapay-zeka'],
  [/facebookexternalhit|twitterbot|slackbot|whatsapp|telegrambot|linkedinbot/i, 'onizleme'],
  [/bot|crawler|spider|crawling|headlesschrome|lighthouse|pingdom|uptime/i, 'diger'],
];

export function botMu(ua: string): string | null {
  for (const [kalip, ad] of BOTLAR) if (kalip.test(ua)) return ad;
  return null;
}

const MOTORLAR: [RegExp, string][] = [
  [/(^|\.)google\./i, 'google'],
  [/(^|\.)bing\.com$/i, 'bing'],
  [/(^|\.)yandex\./i, 'yandex'],
  [/duckduckgo\.com$/i, 'duckduckgo'],
  [/(^|\.)yahoo\./i, 'yahoo'],
  [/ecosia\.org$/i, 'ecosia'],
  [/brave\.com$/i, 'brave'],
];

const SOSYAL = /(facebook|instagram|twitter|x\.com|t\.co|linkedin|pinterest|youtube|tiktok|reddit)\./i;
const EPOSTA = /(mail\.google|outlook\.|yahoo.*mail|webmail)/i;

export interface Siniflandirma {
  kanal: string;
  motor: string | null;
  kaynak: string | null;
}

/**
 * Trafiğin nereden geldiği.
 *
 * UTM parametresi VARSA yönlendireni ezer: reklam tıklaması
 * Google'dan gelir ve yönlendirene bakılırsa "organik" sayılır —
 * ücretli ile organiği karıştırmak bütçe kararını yanlış besler.
 */
export function siniflandir(referrer: string | null, utmKaynak: string | null,
  utmOrtam: string | null): Siniflandirma {
  if (utmOrtam) {
    const o = utmOrtam.toLowerCase();
    const kanal = /cpc|ppc|paid|ads?/.test(o) ? 'reklam'
      : /email|newsletter|eposta/.test(o) ? 'e-posta'
        : /social|sosyal/.test(o) ? 'sosyal' : 'kampanya';
    return { kanal, motor: null, kaynak: utmKaynak };
  }

  if (!referrer) return { kanal: 'doğrudan', motor: null, kaynak: null };

  let alan: string;
  try { alan = new URL(referrer).hostname.replace(/^www\./, ''); } catch { return { kanal: 'doğrudan', motor: null, kaynak: null }; }

  for (const [kalip, ad] of MOTORLAR) {
    if (kalip.test(alan)) return { kanal: 'organik', motor: ad, kaynak: alan };
  }
  if (SOSYAL.test(alan)) return { kanal: 'sosyal', motor: null, kaynak: alan };
  if (EPOSTA.test(alan)) return { kanal: 'e-posta', motor: null, kaynak: alan };
  return { kanal: 'referans', motor: null, kaynak: alan };
}

/** Rota tipi: rapor "hangi tür sayfa" sorusunu yola bakmadan cevaplasın. */
export function rotaTipi(yol: string): string {
  if (yol === '/' || yol === '/en') return 'ana sayfa';
  if (/^\/(en\/)?(proje|project)\//.test(yol)) return 'proje';
  if (/^\/(en\/)?(firma|developer)\//.test(yol)) return 'firma';
  /* İki dilimli bölge yolu (`/projeler/atasehir`) BÖLGE, üç dilimli
     (`/projeler/atasehir/guvenlikli-siteler`) İNİŞ SAYFASI: ikisi ayrı
     ölçülmezse uzun kuyruk sayfalarının getirisi bölge sayfasının
     içinde kayboluyordu. */
  if (/^\/(en\/)?(projeler|developments)\/[^/]+\/[^/]+/.test(yol)) return 'iniş sayfası';
  if (/^\/(en\/)?(projeler|developments)\//.test(yol)) return 'bölge';
  if (/^\/(en\/)?(arama|search)/.test(yol)) return 'arama';
  if (/^\/(en\/)?(bolgeler|regions)/.test(yol)) return 'bölge listesi';
  if (/^\/(firmalar|en\/developers)/.test(yol)) return 'firma listesi';
  if (/^\/rehber/.test(yol)) return 'rehber';
  if (/^\/pano/.test(yol)) return 'pano';
  if (/^\/talep/.test(yol)) return 'talep';
  if (/^\/(yonetim|panel)/.test(yol)) return 'panel';
  return 'kurumsal';
}

export function cihazTipi(ua: string): string {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobi|android|iphone|ipod/i.test(ua)) return 'mobil';
  return 'masaüstü';
}

/* ---------------- Yazma ---------------- */

export interface ZiyaretGirdisi {
  yol: string;
  referrer: string | null;
  utmKaynak: string | null;
  utmOrtam: string | null;
  utmKampanya: string | null;
  ua: string;
  ip: string;
  dil: string | null;
  ulke: string | null;
}

/** Sorgu dizesini atar; arama terimi kişisel veri taşıyabilir. */
export function yoluTemizle(yol: string): string {
  const temiz = yol.split('?')[0].split('#')[0];
  return temiz.length > 180 ? temiz.slice(0, 180) : temiz || '/';
}

export async function ziyaretYaz(g: ZiyaretGirdisi): Promise<void> {
  const botAdi = botMu(g.ua);
  const { kanal, motor, kaynak } = siniflandir(g.referrer, g.utmKaynak, g.utmOrtam);
  const ziyaretci = ziyaretciOzeti(g.ip, g.ua);
  const yol = yoluTemizle(g.yol);

  await prisma.ziyaret.create({
    data: {
      yol,
      tip: rotaTipi(yol),
      kaynak,
      kanal: botAdi ? 'bot' : kanal,
      motor,
      kampanya: g.utmKampanya?.slice(0, 80) ?? null,
      bot: !!botAdi,
      botAdi,
      cihaz: cihazTipi(g.ua),
      dil: g.dil?.slice(0, 5) ?? null,
      ulke: g.ulke?.slice(0, 2) ?? null,
      ziyaretci,
      oturum: oturumOzeti(ziyaretci),
    },
  });
}

export interface OlayGirdisi {
  tur: string;
  hedef?: string | null;
  yol: string;
  deger?: number | null;
  ua: string;
  ip: string;
}

/**
 * Panelde raporlanan etkileşim türleri — serbest metin kabul edilmiyor.
 *
 * LİSTE FİİLEN GÖNDERİLENLERLE AYNI OLMAK ZORUNDA: `olayYaz` tanınmayan
 * türü sessizce düşürüyor, yani listede olmayan bir olay hiç kaydedilmiyor
 * ve panelde "henüz tıklama yok" yazıyor. Yeni bir `olayBildir(...)`
 * çağrısı eklerken türünü buraya da yazın.
 *
 * Huninin sırası: proje-ac → kat-plani → talep-basla → talep-gonder.
 */
export const OLAY_TURLERI = [
  'proje-ac', 'hizli-bakis', 'filtre', 'arama', 'harita', 'favori',
  'karsilastir', 'kat-plani', 'numara-goster',
  'talep-basla', 'talep-gonder', 'randevu-basla', 'whatsapp',
  'telefon', 'fiyat-alarmi',
] as const;

export async function olayYaz(g: OlayGirdisi): Promise<void> {
  if (!OLAY_TURLERI.includes(g.tur as (typeof OLAY_TURLERI)[number])) return;
  const ziyaretci = ziyaretciOzeti(g.ip, g.ua);
  await prisma.olay.create({
    data: {
      tur: g.tur,
      hedef: g.hedef?.slice(0, 120) ?? null,
      yol: yoluTemizle(g.yol),
      deger: Number.isFinite(g.deger) ? g.deger : null,
      ziyaretci,
      oturum: oturumOzeti(ziyaretci),
    },
  });
}

/**
 * Saklama süresi.
 *
 * Ham satır 400 gün sonra siliniyor: yıllık karşılaştırma için bir
 * yıl + pay yeterli, sonrası hem KVKK'da "gerektiği kadar saklama"
 * ilkesine aykırı hem de tabloyu şişiriyor.
 */
export async function eskiIzleriSil(gun = 400): Promise<{ ziyaret: number; olay: number }> {
  const esik = new Date(Date.now() - gun * 864e5);
  const z = await prisma.ziyaret.deleteMany({ where: { olusturma: { lt: esik } } });
  const o = await prisma.olay.deleteMany({ where: { olusturma: { lt: esik } } });
  return { ziyaret: z.count, olay: o.count };
}
