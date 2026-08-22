/* ============================================================
   CSV çözümleme — bağımlılıksız.

   Neden hazır kütüphane değil: ihtiyaç duyulan kısım RFC 4180'in
   küçük bir alt kümesi, ama Türkçe Excel'in ürettiği dosyalar için
   gereken şeyler (noktalı virgül ayracı, ondalık virgül, BOM)
   kütüphanelerde de elle yapılandırılıyor. Kendi çözümleyicimiz
   bunları varsayılan davranış hâline getiriyor.

   Türkçe Excel'in tuzakları — hepsi burada ele alınıyor:

   · AYRAÇ NOKTALI VİRGÜL. Windows'ta Türkçe bölge ayarında Excel
     "CSV (virgülle ayrılmış)" derken dosyayı `;` ile yazıyor, çünkü
     liste ayracı virgül DEĞİL. Ayraç otomatik seziliyor.

   · ONDALIK VİRGÜL. "36,201234" bir koordinat; `Number()` NaN döner.
     Sayı çözümlemesi virgülü nokta sayıyor.

   · BİNLİK AYRACI NOKTA. "18.500" on sekiz bin beş yüz demek, 18,5
     değil. Ondalık virgül varsa noktalar binlik kabul edilip atılıyor.

   · BOM. Excel UTF-8 dosyanın başına ﻿ koyuyor; ilk sütun adı
     "﻿ad" oluyor ve hiçbir eşleşme tutmuyor.

   · SATIR SONU. Excel CRLF yazıyor; tırnak içindeki gerçek satır
     sonlarıyla karışmaması gerekiyor.
   ============================================================ */

/** Ayraç sezimi: başlık satırında en çok geçen aday kazanıyor. */
function ayracSez(ilkSatir: string): string {
  const adaylar = [';', ',', '\t'];
  let en = ',', enCok = -1;
  for (const a of adaylar) {
    // Tırnak içindekiler sayılmıyor; "Kaş, Antalya" tek alan
    let sayi = 0, tirnakta = false;
    for (let i = 0; i < ilkSatir.length; i++) {
      if (ilkSatir[i] === '"') tirnakta = !tirnakta;
      else if (!tirnakta && ilkSatir[i] === a) sayi++;
    }
    if (sayi > enCok) { enCok = sayi; en = a; }
  }
  return en;
}

/**
 * CSV metnini satır dizilerine çevirir.
 * Tırnak içindeki ayraç ve satır sonu korunuyor; `""` tek tırnak.
 */
export function csvSatirlar(metin: string): string[][] {
  // BOM at, satır sonlarını tekilleştir
  const ham = metin.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const ilkSatirSonu = ham.indexOf('\n');
  const ayrac = ayracSez(ilkSatirSonu < 0 ? ham : ham.slice(0, ilkSatirSonu));

  const satirlar: string[][] = [];
  let alanlar: string[] = [];
  let alan = '';
  let tirnakta = false;

  for (let i = 0; i < ham.length; i++) {
    const c = ham[i];

    if (tirnakta) {
      if (c === '"') {
        if (ham[i + 1] === '"') { alan += '"'; i++; }  // kaçırılmış tırnak
        else tirnakta = false;
      } else alan += c;
      continue;
    }

    if (c === '"') tirnakta = true;
    else if (c === ayrac) { alanlar.push(alan); alan = ''; }
    else if (c === '\n') {
      alanlar.push(alan);
      satirlar.push(alanlar);
      alanlar = []; alan = '';
    } else alan += c;
  }

  // Son satır satır sonuyla bitmiyorsa
  if (alan || alanlar.length) { alanlar.push(alan); satirlar.push(alanlar); }

  // Tamamen boş satırlar atılıyor (dosya sonundaki boşluk yaygın)
  return satirlar.filter((s) => s.some((a) => a.trim() !== ''));
}

/**
 * Başlık satırını kullanarak nesne listesi üretir.
 * Sütun adları küçültülüp Türkçe harfleri sadeleştiriliyor:
 * "Villa Adı", "villa adi" ve "VILLA_ADI" aynı anahtara düşüyor.
 */
export function csvNesneler(metin: string): { basliklar: string[]; satirlar: Record<string, string>[] } {
  const tablo = csvSatirlar(metin);
  if (!tablo.length) return { basliklar: [], satirlar: [] };

  const basliklar = tablo[0].map((b) => b.trim());
  const anahtarlar = basliklar.map(basligiAnahtarla);

  const satirlar = tablo.slice(1).map((s) => {
    const nesne: Record<string, string> = {};
    anahtarlar.forEach((a, i) => { if (a) nesne[a] = (s[i] ?? '').trim(); });
    return nesne;
  });
  return { basliklar, satirlar };
}

const HARF: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u',
  Ç: 'c', Ğ: 'g', I: 'i', Ö: 'o', Ş: 's', Ü: 'u', â: 'a', î: 'i', û: 'u',
};

/** "Villa Adı" → "villaadi" — sütun eşlemesi biçime takılmasın. */
export function basligiAnahtarla(baslik: string): string {
  return [...baslik]
    .map((h) => HARF[h] ?? h)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Türkçe biçimli sayıyı çözer. Çözülemezse null.
 *
 *   "18.500"     → 18500   (nokta binlik)
 *   "36,201234"  → 36.201234
 *   "1.234,56"   → 1234.56
 *   "18500 TL"   → 18500
 *   "%10"        → 10
 */
export function sayiCoz(ham: string): number | null {
  let s = ham.trim().replace(/[^\d.,-]/g, '');
  if (!s) return null;

  const sonVirgul = s.lastIndexOf(',');
  const sonNokta = s.lastIndexOf('.');

  if (sonVirgul >= 0 && sonNokta >= 0) {
    // İkisi de var: sonda olan ondalık ayracı
    if (sonVirgul > sonNokta) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (sonVirgul >= 0) {
    /* Yalnızca virgül var. "1,5" ondalık; "1,500" büyük ihtimalle
       binlik — ama "36,201234" koordinat. Ayraçtan sonra tam 3 hane
       varsa binlik sayılıyor, aksi hâlde ondalık. */
    const sonra = s.length - sonVirgul - 1;
    s = sonra === 3 && s.indexOf(',') === sonVirgul && /^\d{1,3},\d{3}$/.test(s)
      ? s.replace(',', '')
      : s.replace(',', '.');
  } else if (sonNokta >= 0) {
    // Yalnızca nokta: 3 haneli grup ise binlik ("18.500"), değilse ondalık
    s = /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s;
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "evet/hayır/var/yok/1/0/true/false/x" → boolean. Boşsa null. */
export function evetHayir(ham: string): boolean | null {
  const s = basligiAnahtarla(ham);
  if (!s) return null;
  if (['evet', 'e', 'var', '1', 'true', 'dogru', 'x', 'yes', 'y'].includes(s)) return true;
  if (['hayir', 'h', 'yok', '0', 'false', 'yanlis', 'no', 'n'].includes(s)) return false;
  return null;
}

/** CSV alanını kaçırır — dışa aktarma ve şablon için. */
export function csvAlan(deger: string): string {
  return /[";\n]/.test(deger) ? `"${deger.replace(/"/g, '""')}"` : deger;
}

/**
 * Satırları CSV metnine çevirir.
 * Ayraç NOKTALI VİRGÜL: Türkçe Excel dosyayı çift tıklamayla açtığında
 * sütunlara doğru bölsün. BOM ekleniyor ki Türkçe karakterler bozulmasın.
 */
export function csvYaz(satirlar: string[][]): string {
  return '﻿' + satirlar.map((s) => s.map(csvAlan).join(';')).join('\r\n') + '\r\n';
}
