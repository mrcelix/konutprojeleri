import Link from 'next/link';

/**
 * Filtre çipi.
 *
 * KURAL: Filtre bir BAĞLANTIDIR. JavaScript yalnızca sayfayı yeniden
 * yüklemeden günceller; href her zaman çalışır. Aksi halde arama motoru
 * filtreli sayfaları göremez, geri tuşu bozulur, filtre paylaşılamaz.
 * POST ile filtreleme asla kullanılmaz.
 *
 * Sayaç kuralı: her seçeneğin yanında sonuç sayısı görünür.
 * 0 sonuçlu seçenek soluklaşır ama GİZLENMEZ — kullanıcı neyin
 * var olmadığını da öğrenir.
 */

export function Chip({
  href,
  secili = false,
  sayi,
  children,
}: {
  href: string;
  secili?: boolean;
  sayi?: number;
  children: React.ReactNode;
}) {
  const bos = sayi === 0;
  const sinif = ['chip', secili && 'is-selected', bos && 'is-empty']
    .filter(Boolean)
    .join(' ');

  return (
    <Link href={href} className={sinif} aria-pressed={secili} aria-disabled={bos}>
      {children}
      {sayi != null && <span className="kp-chip__count">{sayi}</span>}
    </Link>
  );
}
