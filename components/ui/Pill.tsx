/**
 * Durum etiketi.
 *
 * Yalnızca DURUM bildirir. Kategori, özellik veya süsleme için kullanılmaz.
 * Metni her zaman veriden üretilir — elle yazılmış "Fırsat!" gibi etiketler
 * sisteme girmez. Bir kartta en fazla iki tane bulunur.
 *
 * Renk tek başına anlam taşımaz; metin de her zaman vardır.
 */

export type PillDurum =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand'
  | 'neutral';

export function Pill({
  durum = 'neutral',
  children,
}: {
  durum?: PillDurum;
  children: React.ReactNode;
}) {
  return <span className={`kp-pill is-${durum}`}>{children}</span>;
}

/** Şantiye ilerlemesi → etiket. Veri yoksa hiç basılmaz. */
export function SantiyePill({ yuzde }: { yuzde: number | null | undefined }) {
  if (yuzde == null) return null;
  return <Pill durum="success">Şantiye %{yuzde}</Pill>;
}

/** Stok azaldı uyarısı — eşik 5. */
export function StokPill({ kalan }: { kalan: number | null | undefined }) {
  if (kalan == null || kalan > 5) return null;
  if (kalan === 0) return <Pill durum="neutral">Tükendi</Pill>;
  return <Pill durum="warning">Son {kalan} daire</Pill>;
}

/**
 * Veri tazeliği — 90 gün kuralı.
 * Fiyatı 90 gündür teyit edilmemiş proje sitede işaretlenir.
 */
export function TazelikPill({ teyitTarihi }: { teyitTarihi: string | null }) {
  if (!teyitTarihi) return null;
  const gun = Math.floor((Date.now() - new Date(teyitTarihi).getTime()) / 86_400_000);
  if (gun <= 90) return null;
  return <Pill durum="danger">Fiyat teyit edilmedi</Pill>;
}
