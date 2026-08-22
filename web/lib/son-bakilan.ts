/* ============================================================
   Son bakılan projeler.

   Konut alımı karşılaştırmalı: ziyaretçi dört beş projeyi açıp geri
   dönüyor ve hangisini beğendiğini hatırlamaya çalışıyor. Favori
   düğmesi bunun için var ama tıklamayı gerektiriyor; "az önce
   baktığım şu proje" bilgisini kimse işaretlemiyor.

   Son aramalarla aynı gerekçeyle TARAYICIDA saklanıyor: gezinme
   geçmişi kişisel veri ve ziyaretçilerin çoğunun hesabı yok.

   Kart verisi de saklanıyor (ad, görsel, fiyat): yalnızca slug
   tutulsaydı listeyi çizmek için her açılışta sunucuya sorulması
   gerekirdi ve liste ilk boyamada boş kalırdı.
   ============================================================ */

export interface BakilanProje {
  slug: string;
  ad: string;
  bolge: string;
  /** Başlangıç fiyatı (TL) — kartta "…'den başlayan" olarak basılıyor */
  fiyat: number;
  gorsel: string | null;
  zaman: number;
}

export const SON_BAKILAN_ANAHTARI = 'kp_son_bakilan';
const AZAMI = 8;

/** Listeye ekler: aynı proje başa taşınıyor, liste `AZAMI` ile sınırlı. */
export function bakilanEkle(liste: BakilanProje[], yeni: BakilanProje): BakilanProje[] {
  return [yeni, ...liste.filter((v) => v.slug !== yeni.slug)].slice(0, AZAMI);
}

/** Şu an açık olan proje listeden düşülüyor — zaten ekranda. */
export function bakilanlariSuz(liste: BakilanProje[], haricSlug?: string): BakilanProje[] {
  return haricSlug ? liste.filter((v) => v.slug !== haricSlug) : liste;
}

export function sonBakilanlariOku(): BakilanProje[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const ham = JSON.parse(localStorage.getItem(SON_BAKILAN_ANAHTARI) ?? '[]');
    return Array.isArray(ham) ? (ham as BakilanProje[]).slice(0, AZAMI) : [];
  } catch {
    return [];
  }
}

export function sonBakilanKaydet(v: Omit<BakilanProje, 'zaman'>): void {
  if (typeof localStorage === 'undefined' || !v.slug) return;
  try {
    const yeni = bakilanEkle(sonBakilanlariOku(), { ...v, zaman: Date.now() });
    localStorage.setItem(SON_BAKILAN_ANAHTARI, JSON.stringify(yeni));
  } catch { /* kota dolu ya da özel mod — geçmiş tutulamıyor, sayfa çalışıyor */ }
}

export function sonBakilanlariSil(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(SON_BAKILAN_ANAHTARI); } catch { /* yok sayılır */ }
}
