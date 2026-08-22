import type { Proje, ProjeDurumu, ProjeTipi, TapuDurumu } from './types';

/* ============================================================
   Biçimlendirme yardımcıları.

   Alan bağımsız kısım (para, tarih) ile projeye özgü kısım (fiyat
   aralığı, teslim çeyreği, tapu adı) aynı dosyada: hepsi "sayıyı
   ekrana nasıl yazarız" sorusunun cevabı ve çağrı yerleri iç içe.
   ============================================================ */

/* ---------------- Para ---------------- */

export const TL = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR');

/**
 * Milyonlu tutarlar için kısa biçim: ₺4,25 milyon.
 *
 * Konut fiyatları yedi–sekiz haneli ve kartta yan yana duruyor;
 * `₺4.250.000` üç kartta satırı taşırıyor. Eşik bir milyon: altındaki
 * tutarlar (ofis, arsa payı) tam yazılıyor çünkü orada yuvarlama
 * gerçek bir bilgi kaybı.
 */
export function TLkisa(n: number): string {
  if (n < 1_000_000) return TL(n);
  const m = n / 1_000_000;
  /* Tam milyonlarda ondalık basılmıyor: "₺4 milyon", "₺4,0 milyon"
     değil. */
  const yazi = Number.isInteger(m) ? String(m) : m.toFixed(2).replace('.', ',');
  return `₺${yazi} milyon`;
}

/**
 * Projenin fiyat aralığı.
 *
 * Üst uç çoğu projede AÇIKLANMIYOR — firma "şu fiyattan başlıyor"
 * demeyi tercih ediyor. Boş üst ucu alt uca eşitlemek, tek fiyatlı
 * bir proje varmış gibi gösteriyordu.
 */
export function fiyatAraligi(min: number, max?: number): string {
  if (!max || max <= min) return `${TLkisa(min)}'den başlayan`;
  return `${TLkisa(min)} – ${TLkisa(max)}`;
}

/* ---------------- Tarih ---------------- */

export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const trTarih = (d: Date) => `${d.getDate()} ${AYLAR[d.getMonth()].slice(0, 3)}`;
export const isoTarih = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * "2026-08-26" → UTC gece yarısı.
 *
 * Tarih-yalnız değerler (teslim tarihi, inşaat başlangıcı) veritabanında
 * `DATE` olarak saklanır ve UTC gece yarısı olarak okunur. Yerel gece
 * yarısı kullanılırsa UTC+3'te 3 saat geriye kayar; bu hem
 * karşılaştırmaları bozar hem de kaydı bir gün önceye yazar. Sunucu
 * tarafındaki tüm tarih işlemleri bu fonksiyondan geçmelidir.
 */
export function dUTC(s: string | Date | null | undefined): Date | null {
  if (!s) return null;
  if (s instanceof Date) {
    return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
  }
  const [y, m, g] = s.split('-').map(Number);
  if (!y || !m || !g) return null;
  return new Date(Date.UTC(y, m - 1, g));
}

/** UTC tarihini "12 Eylül 2026" biçiminde yazar. */
export const trTamUTC = (d: Date) =>
  `${d.getUTCDate()} ${AYLAR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

/** "2026-08-26" → yerel gece yarısı. Yalnızca istemci bileşenleri için. */
export function dLocal(s: string | Date | null | undefined): Date | null {
  if (!s) return null;
  if (s instanceof Date) { const d = new Date(s); d.setHours(0, 0, 0, 0); return d; }
  const [y, m, g] = s.split('-').map(Number);
  if (!y || !m || !g) return null;
  return new Date(y, m - 1, g);
}

export const ayniGun = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Teslim tarihi ÇEYREK olarak: "2027 4. çeyrek".
 *
 * Gün belirtmek yanıltıcı: inşaat teslimi hiçbir zaman güne sadık
 * değil ve "12 Ekim 2027" yazmak, tutulmayacak bir söz veriyor.
 * Sektörün kendi dili de çeyrek.
 */
export function teslimCeyrek(iso?: string): string {
  const d = dUTC(iso);
  if (!d) return 'Teslim tarihi açıklanmadı';
  const ceyrek = Math.floor(d.getUTCMonth() / 3) + 1;
  return `${d.getUTCFullYear()} ${ceyrek}. çeyrek`;
}

/** Teslime kalan süre — geçmişse "teslim edildi". */
export function teslimeKalan(iso?: string): string | null {
  const d = dUTC(iso);
  if (!d) return null;
  const ay = Math.round((d.getTime() - Date.now()) / (30 * 864e5));
  if (ay <= 0) return 'Teslim edildi';
  if (ay < 12) return `${ay} ay içinde`;
  const yil = Math.floor(ay / 12);
  const kalanAy = ay % 12;
  return kalanAy ? `${yil} yıl ${kalanAy} ay içinde` : `${yil} yıl içinde`;
}

/* ---------------- Ölçü ---------------- */

export const m2 = (n: number) => `${n.toLocaleString('tr-TR')} m²`;

/* ---------------- Etiketler ---------------- */

export const TIP_ADI: Record<ProjeTipi, string> = {
  KONUT: 'Konut',
  VILLA: 'Villa',
  OFIS: 'Ofis',
  KARMA: 'Karma',
};

export const DURUM_ADI: Record<ProjeDurumu, string> = {
  YAKINDA: 'Yakında',
  SATISTA: 'Satışta',
  SON_DAIRELER: 'Son daireler',
  TUKENDI: 'Tükendi',
  TESLIM_EDILDI: 'Teslim edildi',
};

export const TAPU_ADI: Record<TapuDurumu, string> = {
  KAT_MULKIYETI: 'Kat mülkiyeti',
  KAT_IRTIFAKI: 'Kat irtifakı',
  ARSA_TAPULU: 'Arsa tapulu',
  HISSELI: 'Hisseli',
  TAHSIS: 'Tahsis',
};

/**
 * Projenin oda aralığı: "1+1 – 4+1".
 *
 * Daire tipleri metin (`"2+1"`) olduğu için sayısal sıralama
 * yapılamıyor; baştaki sayıya göre sıralanıyor ve eşitlikte metin
 * karşılaştırması devreye giriyor ("3+1" < "3.5+1").
 */
export function odaAraligi(proje: Pick<Proje, 'daireTipleri'>): string | null {
  const odalar = [...new Set(proje.daireTipleri.map((d) => d.oda))];
  if (!odalar.length) return null;
  const sirali = odalar.sort((a, b) => (parseFloat(a) - parseFloat(b)) || a.localeCompare(b, 'tr'));
  if (sirali.length === 1) return sirali[0];
  return `${sirali[0]} – ${sirali[sirali.length - 1]}`;
}

/** Projenin brüt m² aralığı: "78 – 210 m²". */
export function m2Araligi(proje: Pick<Proje, 'daireTipleri'>): string | null {
  const olculer = proje.daireTipleri.map((d) => d.brutM2).filter((n) => n > 0);
  if (!olculer.length) return null;
  const min = Math.min(...olculer);
  const max = Math.max(...olculer);
  return min === max ? m2(min) : `${min.toLocaleString('tr-TR')} – ${m2(max)}`;
}
