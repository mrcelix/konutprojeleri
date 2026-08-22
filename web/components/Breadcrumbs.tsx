export interface Kirinti { ad: string; yol: string }

/* ============================================================
   Görsel kırıntı yolu KALDIRILDI (site geneli karar).

   Her sayfanın üstünde duran şerit, ilk ekranın 40 pikselini
   kimsenin tıklamadığı bir gezinmeye harcıyordu: ziyaretçi zaten
   başlıktaki menüden ve iç bağlantılardan geziniyor.

   `BreadcrumbList` JSON-LD DURUYOR (`lib/seo.ts` → `breadcrumbLd`):
   Google arama sonucundaki kırıntı yolunu ondan üretiyor, görsel
   satıra ihtiyacı yok. Bileşen imzası korunuyor — çağıran on yedi
   sayfayı tek tek düzenlemek yerine tek yerden kapatıldı.
   ============================================================ */
export default function Breadcrumbs(_: { items: Kirinti[] }) {
  return null;
}
