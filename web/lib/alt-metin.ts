/* ============================================================
   Görsel alt metni kuralları.

   Yükleme hattı her görsele aynı cümleyi yazıyor: "Meridyen Park
   Ataşehir, Barbaros Ataşehir". Dokuz görselin dokuzunda aynı metin.
   Ekran okuyucu kullanan biri aynı şeyi dokuz kez duyuyor; arama
   motoru hiçbir şey öğrenmiyor. Boş alt metinden biraz daha iyi, ama
   sadece biraz.

   Burada iki ayrı soru var ve karıştırılmamalı:

     · METNİ İNSAN MI YAZDI — `Medya.altOtomatik` alanında tutuluyor.
       Metne bakıp tahmin etmiyoruz.
     · METİN İYİ Mİ — aşağıdaki kurallar. İnsan da kötü yazabilir.

   Sunucuya kilitli değil: panel bileşeni istemcide çalışıyor ve
   yazarken aynı kuralları göstermesi gerekiyor.
   ============================================================ */

export const ALT_EN_AZ = 15;
export const ALT_EN_COK = 140;

/**
 * Görsel türü etiketleri — panel seçicisi ve otomatik metin.
 *
 * Liste şemadaki `MedyaTipi` ile BİREBİR: panelde seçilebilen ama
 * veritabanına yazılamayan bir tür, kaydetmeyi sessizce düşürüyordu.
 *
 * Türler proje tanıtımının gerçek kategorileri. Lansman öncesi
 * projede iç mekân fotoğrafı yok, görselleştirme var; "örnek daire"
 * ile "iç mekân" ayrı tutuluyor çünkü ziyaretçi için biri vaat,
 * diğeri gerçek. `INSAAT_DURUMU` en çok bakılan kategori: alıcı
 * şantiyenin bugünkü hâlini görmek istiyor.
 */
export const MEDYA_TIPLERI = [
  ['DIS_CEPHE', 'Dış cephe', 'dış cephe görselleştirmesi'],
  ['IC_MEKAN', 'İç mekân', 'iç mekân görselleştirmesi'],
  ['ORNEK_DAIRE', 'Örnek daire', 'örnek daire'],
  ['SOSYAL_TESIS', 'Sosyal tesis', 'sosyal tesis ve peyzaj alanı'],
  ['MANZARA', 'Manzara', 'çevre ve manzara'],
  ['VAZIYET_PLANI', 'Vaziyet planı', 'vaziyet planı — blokların yerleşimi'],
  ['KAT_PLANI', 'Kat planı', 'kat planı'],
  ['INSAAT_DURUMU', 'İnşaat durumu', 'şantiyeden güncel ilerleme'],
] as const;

export type MedyaTipiKodu = typeof MEDYA_TIPLERI[number][0];

export const medyaTipiAdi = (kod: string) =>
  MEDYA_TIPLERI.find((t) => t[0] === kod)?.[1] ?? kod;

/**
 * Yükleme sırasında yazılan geçici metin.
 *
 * Doğru ama yetersiz: görselde ne olduğunu söylemiyor, çünkü
 * bilmiyoruz. `altOtomatik` ile işaretleniyor ki unutulmasın.
 */
export function otomatikAlt(
  projeAd: string, mahalle: string, bolge: string, tip?: string,
): string {
  const ek = MEDYA_TIPLERI.find((t) => t[0] === tip)?.[2];
  const taban = `${projeAd}, ${mahalle} ${bolge}`;
  return (ek ? `${taban} — ${ek}` : taban).slice(0, ALT_EN_COK);
}

/** Ekran okuyucu "görsel" olduğunu zaten söylüyor; metinde tekrarı gürültü. */
const GEREKSIZ_BAS = /^\s*(bir\s+)?(fotoğraf|fotograf|resim|görsel|gorsel|image|photo)[ışi\s:,-]*/i;

export interface AltDenetimi {
  hata?: string;
  /** Engellemeyen ama düzeltilmesi iyi olur */
  uyari?: string;
  temiz: string;
}

/**
 * Alt metni denetler.
 *
 * `digerleri` aynı projedeki öbür görsellerin alt metinleri:
 * kopya alt metin, tek başına kötü bir metinden daha zararlı —
 * galeriyi gezen kişi görselleri birbirinden ayırt edemiyor.
 */
export function altMetniDenetle(ham: string, digerleri: string[] = []): AltDenetimi {
  const temiz = ham.replace(/\s+/g, ' ').trim();

  if (temiz.length < ALT_EN_AZ) {
    return { temiz, hata: `Alt metni en az ${ALT_EN_AZ} karakter olmalı — görselde ne olduğunu yazın.` };
  }
  if (temiz.length > ALT_EN_COK) {
    return { temiz, hata: `Alt metni en çok ${ALT_EN_COK} karakter olabilir.` };
  }
  if (GEREKSIZ_BAS.test(temiz)) {
    return {
      temiz,
      hata: '“Fotoğraf…” diye başlamayın — ekran okuyucu görsel olduğunu zaten söylüyor.',
    };
  }

  const kar = (s: string) => s.toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (digerleri.some((d) => kar(d) === kar(temiz))) {
    return { temiz, hata: 'Bu alt metin aynı projedeki başka bir görselde zaten kullanılıyor.' };
  }

  // Sayı yoksa uyarı değil; sadece "her görselde aynı şablon" olmasın
  if (!/\s/.test(temiz)) return { temiz, uyari: 'Tek kelimelik alt metin görseli anlatmıyor.' };

  return { temiz };
}

export interface AltRaporu {
  toplam: number;
  otomatik: number;
  kopya: number;
  /** Kapak görselinin alt metnini insan yazdı mı */
  kapakHazir: boolean;
}

/**
 * Bir projenin görsellerini değerlendirir.
 *
 * KAPAK ayrı tutuluyor: listede, arama sonucunda ve paylaşım
 * görselinde o çıkıyor. Tek bir görselin alt metni düzeltilecekse
 * o olmalı.
 */
export function altRaporu(
  fotograflar: { alt: string; altOtomatik: boolean; sira: number }[],
): AltRaporu {
  const sirali = [...fotograflar].sort((a, b) => a.sira - b.sira);
  const kar = (s: string) => s.toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

  const sayim = new Map<string, number>();
  for (const f of sirali) sayim.set(kar(f.alt), (sayim.get(kar(f.alt)) ?? 0) + 1);
  // Kopya grubunda ilk kayıt "asıl" sayılıyor, fazlalıklar kopya
  const kopya = [...sayim.values()].reduce((t, n) => t + (n > 1 ? n - 1 : 0), 0);

  return {
    toplam: sirali.length,
    otomatik: sirali.filter((f) => f.altOtomatik).length,
    kopya,
    kapakHazir: sirali.length > 0 && !sirali[0].altOtomatik,
  };
}

/**
 * Proje yayına alınabilir mi — görsel tarafı.
 *
 * KAPAK şart, geri kalanı değil. Kapak listede, arama sonucunda ve
 * paylaşım görselinde çıkıyor; tek bir alt metin düzeltilecekse o
 * olmalı. Sekiz görselin sekizini de şart koşmak projeyi yayına
 * almayı pratikte imkânsız kılar ve kural yazılır yazılmaz
 * atlanmaya çalışılırdı.
 *
 * Kopya metin ise şart: iki görselin aynı cümleyle anlatılması
 * galeriyi ekran okuyucu için anlamsız kılıyor ve düzeltmesi kolay.
 */
export function yayinKapisi(
  fotograflar: { alt: string; altOtomatik: boolean; sira: number }[],
): { hata?: string } {
  if (fotograflar.length === 0) return { hata: 'Görseli olmayan proje yayına alınamaz.' };

  const r = altRaporu(fotograflar);
  if (!r.kapakHazir) {
    return { hata: 'Kapak görselinin alt metni yazılmamış. Görseller bölümünden yazın.' };
  }
  if (r.kopya > 0) {
    return { hata: `${r.kopya} görselde alt metin tekrar ediyor; her görsel farklı anlatılmalı.` };
  }
  return {};
}
