/* ============================================================
   Türkçe ek uyumu.
   Yer adları şablon dizgilerine sabit ekle yazılamaz:
   "Kalkan'ta" değil "Kalkan'da", "Göcek'ta" değil "Göcek'te".
   Ünlü uyumu (kalın/ince) + ünsüz benzeşmesi (sert/yumuşak) uygulanır.
   ============================================================ */

const UNLU = 'aeıioöuü';
const KALIN = 'aıou';
const SERT = 'pçtkfhsş';           // sert ünsüzden sonra ek sertleşir: -da → -ta

const kucuk = (h: string) => h.toLocaleLowerCase('tr');

function sonUnlu(ad: string): string {
  for (let i = ad.length - 1; i >= 0; i--) {
    const h = kucuk(ad[i]);
    if (UNLU.includes(h)) return h;
  }
  return 'a';
}
const sonHarf = (ad: string) => kucuk(ad[ad.length - 1] ?? 'a');
const unluIleBiter = (ad: string) => UNLU.includes(sonHarf(ad));
const kalinMi = (ad: string) => KALIN.includes(sonUnlu(ad));
const sertMi = (ad: string) => SERT.includes(sonHarf(ad));

/** Bulunma hâli: Kaş’ta, Kalkan’da, Göcek’te, Fethiye’de */
export const bulunma = (ad: string) =>
  `${ad}’${sertMi(ad) ? 't' : 'd'}${kalinMi(ad) ? 'a' : 'e'}`;

/** Yönelme hâli: Kaş’a, Kalkan’a, Göcek’e, Datça’ya, Fethiye’ye */
export const yonelme = (ad: string) =>
  `${ad}’${unluIleBiter(ad) ? 'y' : ''}${kalinMi(ad) ? 'a' : 'e'}`;

/** Çıkma hâli: Kaş’tan, Kalkan’dan, Göcek’ten */
export const cikma = (ad: string) =>
  `${ad}’${sertMi(ad) ? 't' : 'd'}${kalinMi(ad) ? 'an' : 'en'}`;

/** İlgi hâli (tamlayan): Kalkan’ın, Göcek’in, Bodrum’un, Datça’nın */
export function tamlayan(ad: string): string {
  const v = sonUnlu(ad);
  const ek = v === 'a' || v === 'ı' ? 'ı'
    : v === 'e' || v === 'i' ? 'i'
      : v === 'o' || v === 'u' ? 'u'
        : 'ü';
  return `${ad}’${unluIleBiter(ad) ? 'n' : ''}${ek}n`;
}

/** Bulunma hâli + "ki": Kaş’taki, Kalkan’daki, Göcek’teki */
export const bulunmaKi = (ad: string) => `${bulunma(ad)}ki`;

/* ---------------- Sayılarda ek uyumu ----------------
   Rakamdan sonra gelen ek YAZILIŞA değil OKUNUŞA uyar:
   2025 "iki bin yirmi beş" → beş’ten → "2025’ten"
   2019 "iki bin on dokuz"  → dokuz’dan → "2019’dan"
   Sabit "’den" yazmak yılların yarısında yanlış sonuç veriyor.
   ---------------------------------------------------- */

const BIRLER = ['', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'];
const ONLAR = ['', 'on', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'];

/** Sayının son okunan sözcüğü — ek bu sözcüğe göre şekilleniyor. */
function sonSozcuk(sayi: number): string {
  const n = Math.abs(Math.trunc(sayi));
  if (BIRLER[n % 10]) return BIRLER[n % 10];
  if (ONLAR[Math.floor(n / 10) % 10]) return ONLAR[Math.floor(n / 10) % 10];
  if (Math.floor(n / 100) % 10) return 'yüz';
  return n >= 1000 ? 'bin' : 'sıfır';
}

/** Sayı + çıkma hâli: 2025’ten, 2019’dan, 2020’den, 2017’den */
export function sayiCikma(sayi: number): string {
  const s = sonSozcuk(sayi);
  return `${sayi}${cikma(s).slice(s.length)}`;
}

/* ============================================================
   Slug üretimi.

   Türkçe karakterler ASCII karşılıklarına indirgeniyor. `toLowerCase()`
   tek başına yetmiyor: "İ" harfi standart küçültmede "i̇" (nokta ayrı
   birleşen) üretiyor ve slug'a görünmez bir karakter sızıyor. Bu yüzden
   harf eşlemesi ÖNCE yapılıyor.
   ============================================================ */

const SLUG_HARF: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i', i: 'i',
  ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u',
};

export function slugla(metin: string): string {
  return metin
    .split('')
    .map((h) => SLUG_HARF[h] ?? h)
    .join('')
    .toLowerCase()
    .normalize('NFD')
    // Kalan birleşen aksanları at
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Çakışmayan slug üretir: "meridyen-park" doluysa "meridyen-park-2".
 * `varMi` çağıranın veritabanı kontrolü.
 */
export async function benzersizSlug(
  taban: string,
  varMi: (s: string) => Promise<boolean>,
): Promise<string> {
  const kok = slugla(taban) || 'villa';
  if (!(await varMi(kok))) return kok;
  for (let i = 2; i <= 50; i++) {
    const aday = `${kok}-${i}`;
    if (!(await varMi(aday))) return aday;
  }
  // 50 denemede boş bulunamadıysa zaman damgası ekle
  return `${kok}-${Date.now().toString(36)}`;
}
