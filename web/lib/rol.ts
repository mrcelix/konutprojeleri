/* ============================================================
   Roller ve rolden türeyen kararlar.

   `lib/panel-eylemler.ts` içinde duramıyor: o dosya `'use server'`
   ve yalnızca async işlev dışa aktarabiliyor — senkron bir yardımcı
   eklendiğinde derleme "Server Actions must be async functions"
   diyerek kırılıyor (aynı tuzağa `KATEGORI_IKONLARI` de düşmüştü).
   ============================================================ */

export type Rol = 'ADMIN' | 'FIRMA' | 'ZIYARETCI';

/**
 * Giriş sonrası varış noktası.
 *
 * Ziyaretçi panel görmüyor: projesi, talebi, satışı yok. Yönetici ona
 * FIRMA rolü verdiğinde AYNI hesap proje panelini görmeye başlıyor —
 * ikinci bir hesap gerekmiyor.
 */
export function girisHedefi(rol: Rol): string {
  if (rol === 'ADMIN') return '/yonetim';
  if (rol === 'ZIYARETCI') return '/hesap';
  return '/panel';
}

export function rolAdi(rol: Rol): string {
  if (rol === 'ADMIN') return 'Yönetici';
  if (rol === 'ZIYARETCI') return 'Ziyaretçi';
  return 'Firma yetkilisi';
}
