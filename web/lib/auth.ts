import 'server-only';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { prisma } from './db';

/* ============================================================
   Kimlik doğrulama.

   Kararlar:
   - Parola scrypt ile saklanır (Node yerleşiği, ek bağımlılık yok).
     bcrypt yerine scrypt: bellek-zor, native derleme gerektirmiyor.
   - Oturum çerezi httpOnly + sameSite=lax + secure(üretimde).
   - Veritabanında çerezin KENDİSİ değil SHA-256 özeti saklanır;
     veritabanı sızsa bile mevcut oturumlar ele geçirilemez.
   ============================================================ */

const scryptAsync = promisify(scrypt) as (
  parola: string, tuz: Buffer, uzunluk: number,
) => Promise<Buffer>;

const OTURUM_CEREZ = 'vn_oturum';
const OTURUM_GUN = 7;
const SCRYPT_UZUNLUK = 64;

/* ---------------- Parola ---------------- */

export async function parolaHashle(parola: string): Promise<string> {
  const tuz = randomBytes(16);
  const anahtar = await scryptAsync(parola, tuz, SCRYPT_UZUNLUK);
  return `scrypt$${tuz.toString('hex')}$${anahtar.toString('hex')}`;
}

export async function parolaDogrula(parola: string, hash: string): Promise<boolean> {
  const [algo, tuzHex, anahtarHex] = hash.split('$');
  if (algo !== 'scrypt' || !tuzHex || !anahtarHex) return false;

  const beklenen = Buffer.from(anahtarHex, 'hex');
  const hesaplanan = await scryptAsync(parola, Buffer.from(tuzHex, 'hex'), beklenen.length);
  // Sabit zamanlı karşılaştırma — zamanlama saldırısına kapalı
  return beklenen.length === hesaplanan.length && timingSafeEqual(beklenen, hesaplanan);
}

/* ---------------- Oturum ---------------- */

const ozetle = (t: string) => createHash('sha256').update(t).digest('hex');

/**
 * Oturum açar.
 *
 * `dogrulamaBekliyor` true ise çerez yazılır ama oturum HENÜZ yetki
 * vermez — TOTP kodu doğrulanana kadar `aktifKullanici()` null döner.
 * Bekleyen durumu ayrı bir tabloda ya da imzalı çerezde tutmak yerine
 * oturum kaydında tutuyoruz: böylece iptal edilebilir, süresi dolar ve
 * çok örnekli kurulumda paylaşılan durum sorunu çıkmaz.
 */
export async function oturumAc(kullaniciId: string, dogrulamaBekliyor = false) {
  const token = randomBytes(32).toString('base64url');
  // Doğrulama bekleyen oturum kısa ömürlü: kod girilmezse 10 dakikada düşer.
  const sonKullanma = dogrulamaBekliyor
    ? new Date(Date.now() + 10 * 60_000)
    : new Date(Date.now() + OTURUM_GUN * 864e5);

  let ip: string | null = null;
  let tarayici: string | null = null;
  try {
    const h = await headers();
    ip = h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? null;
    tarayici = h.get('user-agent')?.slice(0, 200) ?? null;
  } catch { /* istek bağlamı yok */ }

  await prisma.oturum.create({
    data: { tokenHash: ozetle(token), kullaniciId, sonKullanma, ip, tarayici, dogrulamaBekliyor },
  });
  // sonGiris yalnızca giriş TAMAMLANDIĞINDA güncellenir
  if (!dogrulamaBekliyor) {
    await prisma.kullanici.update({ where: { id: kullaniciId }, data: { sonGiris: new Date() } });
  }

  const c = await cookies();
  c.set(OTURUM_CEREZ, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: sonKullanma,
  });
  return token;
}

export async function oturumKapat() {
  const c = await cookies();
  const token = c.get(OTURUM_CEREZ)?.value;
  if (token) {
    await prisma.oturum.deleteMany({ where: { tokenHash: ozetle(token) } }).catch(() => {});
  }
  c.delete(OTURUM_CEREZ);
}

/**
 * Bu oturum DIŞINDAKİ tüm oturumları düşürür.
 *
 * Parola değiştirildiğinde çağrılıyor: değişikliğin en yaygın sebebi
 * "başkası girmiş olabilir" ve o kişinin oturumu ayakta kalırsa
 * işlemin anlamı kalmıyor. Çerez adı ve özet işlevi bu dosyada
 * kaldığı için kural da burada — çağıran tarafın çerez adını
 * bilmesi gerekmiyor.
 */
export async function digerOturumlariDusur(kullaniciId: string) {
  let token: string | undefined;
  try {
    token = (await cookies()).get(OTURUM_CEREZ)?.value;
  } catch { /* istek bağlamı yok */ }
  const bu = token ? ozetle(token) : null;
  await prisma.oturum.deleteMany({
    where: { kullaniciId, ...(bu ? { NOT: { tokenHash: bu } } : {}) },
  });
}

export interface AktifKullanici {
  id: string;
  ad: string;
  eposta: string;
  rol: 'ADMIN' | 'FIRMA' | 'ZIYARETCI';
  firmaId: string | null;
}

/** Geçerli oturumun kullanıcısı. Render başına bir kez sorgulanır. */
export const aktifKullanici = cache(async (): Promise<AktifKullanici | null> => {
  let token: string | undefined;
  try {
    token = (await cookies()).get(OTURUM_CEREZ)?.value;
  } catch {
    return null;
  }
  if (!token) return null;

  const oturum = await prisma.oturum.findUnique({
    where: { tokenHash: ozetle(token) },
    include: { kullanici: true },
  });
  if (!oturum || oturum.sonKullanma < new Date() || !oturum.kullanici.aktif) return null;
  // İkinci aşama tamamlanmadan oturum yetki vermez
  if (oturum.dogrulamaBekliyor) return null;

  const k = oturum.kullanici;
  return { id: k.id, ad: k.ad, eposta: k.eposta, rol: k.rol, firmaId: k.firmaId };
});

/**
 * Doğrulama bekleyen oturumun kullanıcısı.
 * Yalnızca ikinci aşama ekranı bunu kullanır; yetki vermez.
 */
export async function bekleyenOturum(): Promise<{ oturumId: string; kullaniciId: string } | null> {
  let token: string | undefined;
  try {
    token = (await cookies()).get(OTURUM_CEREZ)?.value;
  } catch {
    return null;
  }
  if (!token) return null;

  const oturum = await prisma.oturum.findUnique({
    where: { tokenHash: ozetle(token) },
    select: { id: true, kullaniciId: true, sonKullanma: true, dogrulamaBekliyor: true },
  });
  if (!oturum || !oturum.dogrulamaBekliyor || oturum.sonKullanma < new Date()) return null;
  return { oturumId: oturum.id, kullaniciId: oturum.kullaniciId };
}

/** İkinci aşama başarılı — oturumu tam yetkili hale getirir ve süresini uzatır. */
export async function oturumDogrula(oturumId: string, kullaniciId: string) {
  await prisma.oturum.update({
    where: { id: oturumId },
    data: {
      dogrulamaBekliyor: false,
      sonKullanma: new Date(Date.now() + OTURUM_GUN * 864e5),
    },
  });
  await prisma.kullanici.update({ where: { id: kullaniciId }, data: { sonGiris: new Date() } });
}

/* ---------------- Yetki kapıları ---------------- */

/** Oturum yoksa hata fırlatır — sayfa kodunda `await girisZorunlu()` şeklinde kullanılır. */
export async function girisZorunlu(): Promise<AktifKullanici> {
  const k = await aktifKullanici();
  if (!k) throw new Error('YETKISIZ');
  return k;
}

export async function adminZorunlu(): Promise<AktifKullanici> {
  const k = await girisZorunlu();
  if (k.rol !== 'ADMIN') throw new Error('YETKISIZ');
  return k;
}

/**
 * Firma paneli erişimi. Admin de girebilir (destek amaçlı),
 * ama kendi projesi olmadığı için `firmaId` boş döner.
 */
export async function panelZorunlu(): Promise<AktifKullanici> {
  const k = await girisZorunlu();
  if (k.rol !== 'FIRMA' && k.rol !== 'ADMIN') throw new Error('YETKISIZ');
  return k;
}

/**
 * Bir projenin bu kullanıcıya ait olup olmadığını doğrular.
 * Firma yalnızca kendi projesini yönetebilir; admin hepsini.
 */
export async function projeYetkisi(kullanici: AktifKullanici, projeId: string): Promise<boolean> {
  if (kullanici.rol === 'ADMIN') return true;
  if (!kullanici.firmaId) return false;
  const sayi = await prisma.proje.count({ where: { id: projeId, firmaId: kullanici.firmaId } });
  return sayi > 0;
}

/* ---------------- Denetim kaydı ---------------- */

export async function denetimYaz(
  kullaniciId: string | null,
  eylem: string,
  varlik: string,
  varlikId?: string,
  detay?: unknown,
) {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
  } catch { /* yok */ }

  await prisma.denetimKaydi.create({
    data: {
      kullaniciId, eylem, varlik, varlikId: varlikId ?? null,
      detay: (detay ?? undefined) as object | undefined, ip,
    },
  }).catch((e) => console.error('Denetim kaydı yazılamadı:', e));
}

/** Süresi dolmuş oturumları siler. Zamanlanmış işle çağrılmalı. */
export async function sureDolanOturumlariTemizle() {
  const { count } = await prisma.oturum.deleteMany({ where: { sonKullanma: { lt: new Date() } } });
  return count;
}
