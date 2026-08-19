import { cookies } from 'next/headers';

/**
 * Karşılaştırma sepeti.
 *
 * Çerezde tutulur, sunucuda okunur. JavaScript gerektirmez: ekleme ve
 * çıkarma POST formuyla yapılır, sunucu çerezi yazıp geri yönlendirir.
 *
 * NEDEN localStorage DEĞİL: sepet sunucuda render edilen şeritte
 * görünmeli. localStorage'da tutulsaydı şerit ancak istemci JavaScript'i
 * çalıştıktan sonra belirir; ilk boyamada zıplama olurdu.
 *
 * DİKKAT: çerez okumak sayfayı dinamikleştirir. Bu yüzden sepet YALNIZCA
 * zaten dinamik olan sayfalarda okunur. Proje detayı statik kalmalı —
 * oraya yalnızca "ekle" düğmesi konur, sepet durumu okunmaz.
 */

export const SEPET_COOKIE = 'kp_karsilastir';
export const SEPET_AZAMI = 4;

const SLUG_KALIBI = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function sepetCoz(ham: string | undefined | null): string[] {
  if (!ham) return [];
  return [...new Set(
    ham.split(',').map((s) => s.trim().toLowerCase()).filter((s) => SLUG_KALIBI.test(s))
  )].slice(0, SEPET_AZAMI);
}

export async function sepetOku(): Promise<string[]> {
  const c = await cookies();
  return sepetCoz(c.get(SEPET_COOKIE)?.value);
}

export function sepetYolu(sluglar: string[]): string {
  return sluglar.length ? `/karsilastir/${sluglar.join('+')}` : '/karsilastir';
}

/**
 * Geri dönüş adresini güvenli hale getirir.
 *
 * Form alanından gelen değer kullanıcı girdisidir; doğrudan
 * yönlendirmeye verilirse açık yönlendirme (open redirect) açığı olur.
 * Yalnızca tek eğik çizgiyle başlayan göreli yollar kabul edilir.
 */
export function guvenliDon(ham: unknown): string {
  const s = typeof ham === 'string' ? ham : '';
  if (!s.startsWith('/') || s.startsWith('//')) return '/';
  return s;
}
