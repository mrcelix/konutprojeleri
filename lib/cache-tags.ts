/**
 * Önbellek etiketleri — ISR'ın hedefli yenilemesi bunlara dayanır.
 *
 * KURAL: Asla geniş kapsamlı revalidatePath('/', 'layout') çağırmayın.
 * Bir onaydan sonra 5.000 sayfayı geçersiz kılmak, ertesi gün gelen
 * ziyaretçilerin tamamını soğuk sayfaya düşürür ve ISR'ın faydasını sıfırlar.
 *
 * Her veri okuması etiketlenir, her yayın yalnızca ilgili etiketleri yeniler.
 */

export const tag = {
  proje: (id: number | string) => `proje-${id}`,
  projeSlug: (slug: string) => `proje-slug-${slug}`,
  firma: (slug: string) => `firma-${slug}`,
  il: (slug: string) => `il-${slug}`,
  ilce: (il: string, ilce: string) => `ilce-${il}-${ilce}`,
  mahalle: (il: string, ilce: string, m: string) => `mahalle-${il}-${ilce}-${m}`,
  haber: (slug: string) => `haber-${slug}`,
  kampanya: (slug: string) => `kampanya-${slug}`,
  endeks: (donem: string) => `endeks-${donem}`,
  anasayfa: () => 'anasayfa',
} as const;

/**
 * Bir proje yayına alındığında/güncellendiğinde temizlenmesi gereken etiketler.
 * Onay kuyruğundaki "Onayla" düğmesi bu listeyi kullanır.
 */
export function projeEtiketleri(p: {
  id: number;
  slug: string;
  il: string;
  ilce: string;
  mahalle?: string | null;
  firmaSlug: string;
}): string[] {
  const t = [
    tag.proje(p.id),
    tag.projeSlug(p.slug),
    tag.ilce(p.il, p.ilce),
    tag.il(p.il),
    tag.firma(p.firmaSlug),
    tag.anasayfa(),
  ];
  if (p.mahalle) t.push(tag.mahalle(p.il, p.ilce, p.mahalle));
  return t;
}
