import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/* ============================================================
   TOTP — zaman tabanlı tek kullanımlık parola (RFC 6238).

   Bağımlılık yok: algoritma HMAC-SHA1 üzerine kurulu ve node:crypto
   bunu zaten sağlıyor. Google Authenticator, Authy, 1Password ve
   Microsoft Authenticator hepsi aynı standardı uyguluyor.

   SHA-1 burada bir zafiyet değil: TOTP'de çakışma direnci değil,
   HMAC'in anahtar gizliliği önemli ve HMAC-SHA1 bu amaçla hâlâ güvenli.
   Ayrıca doğrulayıcı uygulamaların büyük kısmı SHA-256'yı desteklemiyor.
   ============================================================ */

const ADIM = 30;          // saniye
const HANE = 6;
/** Saat kaymasına tolerans: ±1 adım (±30 sn) */
const PENCERE = 1;

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Rastgele gizli anahtar üretir (base32, 160 bit). */
export function gizliUret(): string {
  const ham = randomBytes(20);
  let bit = '';
  for (const b of ham) bit += b.toString(2).padStart(8, '0');
  let cikti = '';
  for (let i = 0; i + 5 <= bit.length; i += 5) cikti += B32[parseInt(bit.slice(i, i + 5), 2)];
  return cikti;
}

function base32Coz(gizli: string): Buffer {
  const temiz = gizli.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bit = '';
  for (const k of temiz) {
    const i = B32.indexOf(k);
    if (i < 0) continue;
    bit += i.toString(2).padStart(5, '0');
  }
  const bayt: number[] = [];
  for (let i = 0; i + 8 <= bit.length; i += 8) bayt.push(parseInt(bit.slice(i, i + 8), 2));
  return Buffer.from(bayt);
}

/** Belirli bir zaman adımı için kod üretir. */
function kodUret(gizli: string, adim: number): string {
  const sayac = Buffer.alloc(8);
  sayac.writeBigUInt64BE(BigInt(adim));

  const ozet = createHmac('sha1', base32Coz(gizli)).update(sayac).digest();
  // Dinamik kesme (RFC 4226 §5.4)
  const kayma = ozet[ozet.length - 1] & 0x0f;
  const ikili =
    ((ozet[kayma] & 0x7f) << 24) |
    ((ozet[kayma + 1] & 0xff) << 16) |
    ((ozet[kayma + 2] & 0xff) << 8) |
    (ozet[kayma + 3] & 0xff);

  return (ikili % 10 ** HANE).toString().padStart(HANE, '0');
}

/** Şu an geçerli kod — test ve geliştirme için. */
export function suankiKod(gizli: string): string {
  return kodUret(gizli, Math.floor(Date.now() / 1000 / ADIM));
}

/**
 * Kodu doğrular.
 *
 * Karşılaştırma sabit zamanlı: kodun ilk hanelerinin doğru olup
 * olmadığı yanıt süresinden anlaşılmamalı.
 */
export function kodDogrula(gizli: string, kod: string): boolean {
  const temiz = kod.replace(/\D/g, '');
  if (temiz.length !== HANE) return false;

  const simdi = Math.floor(Date.now() / 1000 / ADIM);
  const gelen = Buffer.from(temiz);

  let gecerli = false;
  for (let d = -PENCERE; d <= PENCERE; d++) {
    const beklenen = Buffer.from(kodUret(gizli, simdi + d));
    // Erken çıkış yok: her adım denenir ki süre sabit kalsın
    if (beklenen.length === gelen.length && timingSafeEqual(beklenen, gelen)) gecerli = true;
  }
  return gecerli;
}

/**
 * Doğrulayıcı uygulamanın okuduğu URI.
 * `issuer` hem parametre hem etiket önekinde olmalı — bazı uygulamalar
 * yalnızca birini okuyor.
 */
export function otpauthUri(gizli: string, hesap: string, kurum: string): string {
  const etiket = encodeURIComponent(`${kurum}:${hesap}`);
  const p = new URLSearchParams({
    secret: gizli,
    issuer: kurum,
    algorithm: 'SHA1',
    digits: String(HANE),
    period: String(ADIM),
  });
  return `otpauth://totp/${etiket}?${p}`;
}

/** Gizli anahtarı elle girmek için 4'erli gruplara ayırır. */
export function gizliOkunakli(gizli: string): string {
  return (gizli.match(/.{1,4}/g) ?? []).join(' ');
}

/* ---------------- yedek kodlar ---------------- */

/**
 * Telefonunu kaybeden kullanıcı için tek kullanımlık kodlar.
 * Bunlar olmadan 2FA açmak, hesabı kilitlenmeye açık bırakır.
 */
export function yedekKodUret(adet = 8): string[] {
  const kodlar: string[] = [];
  for (let i = 0; i < adet; i++) {
    // Karıştırılması kolay karakterler (0/O, 1/I) alfabede yok
    const harf = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let k = '';
    for (const b of randomBytes(10)) k += harf[b % harf.length];
    kodlar.push(`${k.slice(0, 5)}-${k.slice(5, 10)}`);
  }
  return kodlar;
}

/** Yedek kodu karşılaştırma için normalize eder. */
export function yedekNormalle(kod: string): string {
  return kod.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
