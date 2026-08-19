/**
 * m² fiyat bantları — pin renklerini ve harita efsanesini belirler.
 *
 * BU DOSYA VERİTABANINA DOKUNMAZ ve dokunmamalı. İstemci bileşenleri
 * (harita) buradan import eder; sorgu modülünden import etseydi
 * postgres sürücüsü tarayıcı paketine girerdi.
 *
 * DİKKAT: Koyu temada ısı yönü TERSİNE DÖNER. Açık temada "koyu = pahalı"
 * okunurken koyu temada "açık = pahalı" olur. Efsane her iki temada da
 * görünür kalmalı, yoksa okuma tersine döner. (Renkler components.css)
 */

export const BANTLAR = [
  { ust: 60_000, ad: '60 bin ₺ altı', sinif: 'ucuz' },
  { ust: 90_000, ad: '60–90 bin ₺', sinif: 'orta' },
  { ust: 120_000, ad: '90–120 bin ₺', sinif: 'yuksek' },
  { ust: Infinity, ad: '120 bin ₺ üzeri', sinif: 'premium' },
] as const;

export function bant(m2: number | null): string {
  if (m2 == null) return 'bilinmiyor';
  return BANTLAR.find((b) => m2 < b.ust)?.sinif ?? 'premium';
}
