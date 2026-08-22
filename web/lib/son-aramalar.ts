/* ============================================================
   Son aramalar.

   Proje arama tek seferde bitmiyor: ziyaretçi bütçeyi değiştirip geri
   dönüyor, iki bölgeyi karşılaştırıyor, ertesi gün aynı aramaya
   dönüyor. Her seferinde filtreleri baştan kurmak gerekiyordu.

   Sunucuda değil TARAYICIDA saklanıyor: arama geçmişi kişisel veri
   ve ziyaretçilerin çoğunun hesabı yok. Hesapsız kullanıcının geçmişini
   sunucuda tutmak, onu kimliklendirmek için bir çerez üretmek demekti.

   Saf yardımcılar (`aramaEtiketi`, `aramaAnahtari`, `aramaEkle`)
   depolamadan bağımsız; sınanabiliyorlar.
   ============================================================ */

export interface SonArama {
  /** Aramayı geri yükleyen sorgu dizesi (`q=Ataşehir&oda=2+1`) */
  sorgu: string;
  /** Kullanıcıya gösterilen özet */
  etiket: string;
  /** Aynı aramayı iki kez yazmamak için sadeleştirilmiş kimlik */
  anahtar: string;
  zaman: number;
}

export const SON_ARAMA_ANAHTARI = 'kp_son_arama';
const AZAMI = 6;

const TIP_ETIKET: Record<string, string> = {
  KONUT: 'Konut', VILLA: 'Villa', OFIS: 'Ofis', KARMA: 'Karma',
};

/** Teslim tavanı yıl olarak yazılıyor: gün kimsenin aklında kalmıyor. */
const trYil = (iso: string): string => iso.slice(0, 4);

/**
 * Bütçe: "4,2 mn ₺'ye kadar", "3 mn ₺ üzeri", "3–6 mn ₺".
 *
 * Tam rakam yazılmıyor — etiket bir satırda duruyor ve
 * "4.250.000 ₺ – 8.400.000 ₺" tek başına satırı dolduruyordu.
 */
const mn = (n: number) => `${(n / 1_000_000).toLocaleString('tr-TR', {
  maximumFractionDigits: 1,
})} mn ₺`;

/**
 * Aramanın insan okunur özeti.
 *
 * Ham sorgu dizesi ("q=Ataşehir&oda=2+1&f=guvenlik") gösterilseydi
 * kullanıcı kendi aramasını tanıyamazdı; etiket aramanın KARARLARINI
 * söylüyor.
 */
export function aramaEtiketi(p: URLSearchParams): string {
  const parca: string[] = [];
  const q = p.get('q')?.trim();
  parca.push(q || 'Tüm projeler');

  const tip = p.get('tip');
  if (tip && TIP_ETIKET[tip]) parca.push(TIP_ETIKET[tip]);

  /* ODA ARAMANIN İLK KARARI: bütçeden de bölgeden de önce "kaç
     odalı" sorusu geliyor ve etikette görünmezse iki arama
     birbirinden ayırt edilemiyor. */
  const oda = p.get('oda')?.split(',').filter(Boolean) ?? [];
  if (oda.length) parca.push(oda.join(' / '));

  const min = Number(p.get('minFiyat') ?? 0);
  const max = Number(p.get('maxFiyat') ?? 0);
  if (min && max) parca.push(`${mn(min)} – ${mn(max)}`);
  else if (max) parca.push(`${mn(max)}’ye kadar`);
  else if (min) parca.push(`${mn(min)} üzeri`);

  const teslim = p.get('teslim');
  if (teslim) parca.push(`${trYil(teslim)}’e kadar teslim`);

  const f = p.get('f')?.split(',').filter(Boolean) ?? [];
  if (f.length) parca.push(`${f.length} filtre`);

  return parca.join(' · ');
}

/**
 * Aynı aramayı ayırt eden anahtar.
 *
 * Sayfa numarası ve sıralama DIŞARIDA: ikinci sayfaya geçmek yeni bir
 * arama değil, aynı aramanın devamı. İçeride bırakılsaydı liste tek
 * bir aramanın sayfalarıyla dolardı.
 */
export function aramaAnahtari(p: URLSearchParams): string {
  const onemli = ['q', 'tip', 'durum', 'oda', 'f', 'minFiyat', 'maxFiyat',
    'minM2', 'teslim', 'maxPesinat', 'minVade', 'kredi', 'takas'];
  return onemli
    .map((a) => `${a}=${(p.get(a) ?? '').trim()}`)
    .filter((s) => !s.endsWith('='))
    .join('&');
}

/** Listeye ekler: aynı arama başa taşınıyor, liste `AZAMI` ile sınırlı. */
export function aramaEkle(liste: SonArama[], yeni: SonArama): SonArama[] {
  return [yeni, ...liste.filter((a) => a.anahtar !== yeni.anahtar)].slice(0, AZAMI);
}

/* ---------------- Depolama ---------------- */

export function sonAramalariOku(): SonArama[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const ham = JSON.parse(localStorage.getItem(SON_ARAMA_ANAHTARI) ?? '[]');
    return Array.isArray(ham) ? (ham as SonArama[]).slice(0, AZAMI) : [];
  } catch {
    return [];
  }
}

/**
 * Aramayı kaydeder. Anahtarı boş olan (hiç filtre içermeyen) arama
 * kaydedilmiyor: "tüm projeler" listesi zaten bir tık uzakta.
 */
export function sonAramaKaydet(sorgu: string): void {
  if (typeof localStorage === 'undefined') return;
  const p = new URLSearchParams(sorgu);
  const anahtar = aramaAnahtari(p);
  if (!anahtar) return;
  try {
    const yeni = aramaEkle(sonAramalariOku(), {
      sorgu, anahtar, etiket: aramaEtiketi(p), zaman: Date.now(),
    });
    localStorage.setItem(SON_ARAMA_ANAHTARI, JSON.stringify(yeni));
  } catch { /* kota dolu ya da özel mod — geçmiş tutulamıyor, arama çalışıyor */ }
}

export function sonAramalariSil(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.removeItem(SON_ARAMA_ANAHTARI); } catch { /* yok sayılır */ }
}
