/**
 * Veri gösterim kuralları — Tasarım Sistemi 1.0, "Veri gösterimi" bölümü.
 *
 * TEK KURAL: veri yoksa alan basılmaz.
 * Bu fonksiyonlar `null` döner; şablon `null` gelen alanı hiç render etmez.
 * `NULL`, `0`, `-`, "Belirtilmemiş" hiçbir koşulda ekrana çıkmaz —
 * bugünkü sitenin güvenilirliğini en çok yıkan şey buydu.
 */

const tr = 'tr-TR';

/** 8.400.000 ₺ — nokta ayraç, kuruş yok */
export function para(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v) || v <= 0) return null;
  return `${new Intl.NumberFormat(tr, { maximumFractionDigits: 0 }).format(v)} ₺`;
}

/** 8,40 mn ₺ — kart ve dar alanlarda */
export function paraKisa(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v) || v <= 0) return null;
  if (v >= 1_000_000) {
    const mn = new Intl.NumberFormat(tr, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v / 1_000_000);
    return `${mn} mn ₺`;
  }
  return para(v);
}

/** 80.700 ₺/m² — net metrekare üzerinden, hesaplanan alan */
export function m2Birim(
  fiyat: number | null | undefined,
  netM2: number | null | undefined
): string | null {
  if (!fiyat || !netM2) return null;
  const birim = Math.round(fiyat / netM2);
  return `${new Intl.NumberFormat(tr).format(birim)} ₺/m²`;
}

/** 104 / 128 m² — net / brüt sırasıyla */
export function alan(
  net: number | null | undefined,
  brut?: number | null
): string | null {
  if (!net) return null;
  return brut ? `${net} / ${brut} m²` : `${net} m²`;
}

/** '2027Q1' → '2027 Q1' */
export function teslim(ceyrek: string | null | undefined): string | null {
  if (!ceyrek) return null;
  const m = /^(\d{4})Q([1-4])$/.exec(ceyrek);
  return m ? `${m[1]} Q${m[2]}` : null;
}

/** 15.08.2026 */
export function tarih(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(tr, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/** 7 güne kadar "2 gün önce", sonrası tarih */
export function gorelizaman(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;

  const gun = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (gun < 0) return tarih(date);
  if (gun === 0) return 'bugün';
  if (gun === 1) return 'dün';
  if (gun <= 7) return `${gun} gün önce`;
  return tarih(date);
}

/** %88 · +%3,7 — Türkçe kuralı: yüzde işareti önde */
export function yuzde(
  v: number | null | undefined,
  opts: { isaretli?: boolean; basamak?: number } = {}
): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  const { isaretli = false, basamak = 0 } = opts;
  const s = new Intl.NumberFormat(tr, {
    minimumFractionDigits: basamak,
    maximumFractionDigits: basamak,
  }).format(Math.abs(v));
  const on = isaretli ? (v > 0 ? '+' : v < 0 ? '−' : '') : '';
  return `${on}%${s}`;
}

/** 7 dk — yürüme mesafesi, yuvarlanmış */
export function yurumeSuresi(metre: number | null | undefined): string | null {
  if (!metre || metre <= 0) return null;
  const dk = Math.round(metre / 80); // ~4,8 km/sa
  return dk < 1 ? '1 dk' : `${dk} dk`;
}

/**
 * Fiyatı olmayan proje listeden düşmez, farklı görünür.
 * Şablon bu ayrımı kullanır: fiyat varsa rakam, yoksa eylem.
 */
export function fiyatGosterimi(
  v: number | null | undefined
): { tip: 'fiyat'; deger: string } | { tip: 'iste' } {
  const p = para(v);
  return p ? { tip: 'fiyat', deger: p } : { tip: 'iste' };
}

/**
 * Bağımsız bölümün adı — proje tipine göre.
 *
 * Sayaçlar her yerde "konut" yazıyordu. Ofis projesinde "48 konut"
 * yanlış bilgi: satılan şey konut değil ofis katı. Tek yerden
 * çözülüyor ki yeni bir tip eklendiğinde on iki dosya taranmasın.
 */
export function birimAdi(tip: string | null | undefined): string {
  if (tip === 'ofis') return 'bağımsız bölüm';
  if (tip === 'villa' || tip === 'mustakil' || tip === 'yali') return 'villa';
  return 'konut';
}
