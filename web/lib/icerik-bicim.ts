/* ============================================================
   Kurumsal sayfa gövdesinin biçimi.

   Panelde yazılan metni bloklara çeviren saf çözümleyiciler. Sunucu
   eyleminin içindeydiler; önizlemenin AYNI kuralı kullanabilmesi için
   dışarı alındılar. Önizleme kendi çözümleyicisini yazsaydı, ikisi
   zamanla ayrışır ve panelde görünen ile yayına çıkan farklı olurdu.

   Saf oldukları için sınanabiliyorlar (scripts/test-icerik.ts).
   ============================================================ */

/* Arayüz değil TİP TAKMA ADI: Prisma'nın Json girdisi dizin imzası
   bekliyor ve adlandırılmış arayüzler ona atanamıyor. */
export type GovdeBlogu = {
  h?: string;
  p?: string;
  liste?: string[];
};

export type SssSatiri = {
  s: string;
  c: string;
};

/**
 * Gövde metnini bloklara ayırır.
 *
 * Biçim (yöneticinin öğrenmesi gereken tek şey):
 *   `## Başlık`  → alt başlık
 *   `- madde`    → liste maddesi
 *   düz satır    → paragraf
 *   `---`        → yeni blok
 *
 * Markdown yerine bu daraltılmış biçim seçildi: bağlantı ve gömülü
 * HTML kabul etmiyor, dolayısıyla panelden XSS yazılamıyor.
 */
export function govdeCozumle(ham: string): GovdeBlogu[] {
  return ham.split(/^---$/m).flatMap((parca) => {
    const satirlar = parca.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!satirlar.length) return [];
    const blok: GovdeBlogu = {};
    const liste: string[] = [];
    const paragraflar: string[] = [];
    for (const s of satirlar) {
      if (s.startsWith('## ')) blok.h = s.slice(3).trim();
      else if (s.startsWith('- ')) liste.push(s.slice(2).trim());
      else paragraflar.push(s);
    }
    if (paragraflar.length) blok.p = paragraflar.join(' ');
    if (liste.length) blok.liste = liste;
    return Object.keys(blok).length ? [blok] : [];
  });
}

/** SSS satırları: `soru | cevap` */
export function sssCozumle(ham: string): SssSatiri[] {
  return ham.split('\n').flatMap((satir) => {
    const i = satir.indexOf('|');
    if (i < 0) return [];
    const s = satir.slice(0, i).trim();
    const c = satir.slice(i + 1).trim();
    return s && c ? [{ s, c }] : [];
  });
}

/** Blok özeti — panelde "kaç blok, ne var" göstermek için. */
export function blokOzeti(blok: GovdeBlogu): string {
  const p: string[] = [];
  if (blok.h) p.push('başlık');
  if (blok.p) p.push(`${blok.p.split(/\s+/).length} kelime`);
  if (blok.liste) p.push(`${blok.liste.length} madde`);
  return p.join(' · ');
}

/**
 * Blok editöründen gelen JSON'u güvenli hâle getirir.
 *
 * Panel formu artık iki yoldan içerik gönderebiliyor: metin (eski,
 * hâlâ destekleniyor) ve blok dizisi. İkincisi istemciden geldiği için
 * ŞEKLİNE GÜVENİLMİYOR — tanınmayan alanlar atılıyor, uzunluklar
 * kırpılıyor. Metin yolu zaten çözümleyiciden geçiyordu; bu yol da
 * aynı daraltmaya tabi olmalı.
 *
 * Biçimlendirme kaçışı gerekmiyor: bloklar React metin düğümü olarak
 * basılıyor, HTML yorumlanmıyor.
 */
export function bloklariDenetle(ham: unknown): GovdeBlogu[] | null {
  if (!Array.isArray(ham)) return null;
  const kirp = (v: unknown, n: number): string | undefined => {
    if (typeof v !== 'string') return undefined;
    const t = v.trim().replace(/\s+/g, ' ');
    return t ? t.slice(0, n) : undefined;
  };

  const out: GovdeBlogu[] = [];
  for (const g of ham.slice(0, 40)) {
    if (!g || typeof g !== 'object') continue;
    const kaynak = g as Record<string, unknown>;
    const blok: GovdeBlogu = {};
    const h = kirp(kaynak.h, 160);
    const p = kirp(kaynak.p, 4000);
    if (h) blok.h = h;
    if (p) blok.p = p;
    if (Array.isArray(kaynak.liste)) {
      const liste = kaynak.liste
        .map((m) => kirp(m, 400))
        .filter((m): m is string => !!m)
        .slice(0, 40);
      if (liste.length) blok.liste = liste;
    }
    if (Object.keys(blok).length) out.push(blok);
  }
  return out;
}
