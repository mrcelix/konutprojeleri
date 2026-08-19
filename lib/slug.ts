/**
 * Türkçe metinden URL parçası.
 *
 * Ayrı dosyada: 'use server' işaretli bir modül yalnızca async fonksiyon
 * dışa aktarabilir, oysa bu fonksiyon istemcide de (slug önizlemesi)
 * çağrılıyor.
 *
 * DİKKAT: 'ı' → 'i' ve 'İ' → 'i'. Türkçe'de iki ayrı harf ama adreste
 * ayrım korunamaz; "ışıklı" ve "isikli" aynı slug'a düşer. Çakışma
 * kontrolü bu yüzden kayıt sırasında yapılıyor.
 */

const TR: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', Ö: 'o', Ş: 's', Ü: 'u',
};

export function slugla(s: string): string {
  return s
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => TR[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
