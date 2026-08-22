import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Migration'lar havuzlayıcı (PgBouncer / Supabase transaction pooler)
 * üzerinden ÇALIŞMAZ: DDL için gereken advisory lock ve prepared statement
 * desteği transaction modunda yok. Bu yüzden DIRECT_URL tanımlıysa şema
 * işlemleri onun üzerinden gidiyor; uygulama sorguları DATABASE_URL'i
 * (havuzlanmış adres) kullanmaya devam ediyor.
 */
/*
 * `prisma generate` VERİTABANI ADRESİ İSTEMEZ — yalnızca şemayı okur.
 * Ama `env()` değişken tanımsızsa hata fırlatıyor ve config yüklenemiyor;
 * bu da `postinstall: prisma generate` adımını düşürüyor, istemci hiç
 * üretilmiyor ve `next build` "Cannot find module './generated/prisma'"
 * ile çöküyor.
 *
 * Dağıtımda ortam değişkeni eksik ya da yanlış adla tanımlıysa hata
 * kurulumda, alakasız bir mesajla patlıyordu. Artık adres yoksa yer
 * tutucuya düşülüyor: `generate` çalışıyor, gerçek adrese ihtiyaç duyan
 * `migrate`/`db` komutları ise bağlanamayınca zaten açıkça hata veriyor.
 */
/*
 * Panelden yapıştırılan adreslerde iki şey sık kırılıyor:
 *
 *   · TIRNAK. `.env` dosyasında `URL="postgresql://…"` yazmak doğru;
 *     tırnakları dosya okuyucu soyuyor. Ama Vercel'in ortam değişkeni
 *     kutusuna aynı şey tırnaklarıyla yapıştırılırsa tırnaklar
 *     DEĞERİN PARÇASI oluyor ve Prisma "P1013: scheme is not
 *     recognized" veriyor — çünkü değer `"postgresql` ile başlıyor.
 *   · BOŞLUK / SATIR SONU. Kopyalarken sona takılan görünmez karakter.
 *
 * İkisi de gerçek bir bağlantı adresinin parçası olamaz, bu yüzden
 * sessizce temizlemek bir hatayı gizlemiyor.
 */
function adresTemizle(ham: string | undefined): string | undefined {
  const t = ham?.trim();
  if (!t) return undefined;
  // Yalnızca BAŞTA VE SONDA eşleşen tırnak soyuluyor. Sadece baştakini
  // almak sondakini adresin içinde bırakır ve sessizce bozuk bir
  // bağlantı dizesi üretirdi.
  const ilk = t[0];
  const son = t[t.length - 1];
  const tirnakli = (ilk === '"' || ilk === "'") && ilk === son && t.length > 1;
  return (tirnakli ? t.slice(1, -1) : t).trim();
}

const dogrudan = adresTemizle(process.env.DIRECT_URL);
const havuz = adresTemizle(process.env.DATABASE_URL);
const secilen = dogrudan ?? havuz;

/*
 * Adres varsa ama şeması tanınmıyorsa BURADA ve açıkça söyleniyor.
 * Prisma'nın P1013 mesajı hangi değişkenin bozuk olduğunu
 * söylemiyor; iki adresten hangisi olduğunu aramak vakit alıyor.
 */
if (secilen && !/^postgres(ql)?:\/\//.test(secilen)) {
  const ad = dogrudan ? 'DIRECT_URL' : 'DATABASE_URL';
  throw new Error(
    `${ad} geçerli bir PostgreSQL adresi değil: "postgresql://" ile başlamalı. `
    + `Şu an "${secilen.slice(0, 12)}…" ile başlıyor. `
    + 'Vercel ortam değişkenine yapıştırırken TIRNAK KOYMAYIN ve '
    + '"psql " öneki varsa silin.',
  );
}

/*
 * HAVUZLAYICI ÜZERİNDEN MIGRATION ÇALIŞMIYOR — ve hata da vermiyor,
 * SONSUZA KADAR BEKLİYOR.
 *
 * Prisma şema değişikliğinden önce oturum düzeyinde bir advisory lock
 * alıyor. PgBouncer transaction modunda (Supabase havuzlayıcısı, port
 * 6543) her ifade farklı bir arka uç bağlantısına gidebildiği için
 * kilit hiçbir zaman alınamıyor; `migrate deploy` tek satır çıktı
 * verip asılı kalıyor.
 *
 * Vercel'de `DIRECT_URL` tanımsız unutulduğunda derleme 45 dakika
 * "Building" görünüp zaman aşımına düşüyordu ve günlükte sebebe dair
 * hiçbir şey yoktu. Burada ANINDA ve sebebiyle söyleniyor.
 *
 * Yalnızca `DIRECT_URL` yokken bakılıyor: tanımlıysa şema işlemleri
 * zaten doğrudan bağlantıdan gidiyor ve `DATABASE_URL`in havuzlanmış
 * olması normal — uygulama sorguları için doğrusu o.
 */
const HAVUZ_PORTLARI = [':6543'];
/* YALNIZCA şema komutlarında. `prisma generate` adres istemiyor ve
   yukarıdaki blokta özellikle dayanıklı bırakıldı: burada da hata
   fırlatmak `postinstall` adımını düşürür, istemci hiç üretilmez ve
   `next build` alakasız bir "Cannot find module" ile çöker. */
const semaKomutu = process.argv.some((a) => a === 'migrate' || a === 'db');
if (semaKomutu && !dogrudan && havuz
    && HAVUZ_PORTLARI.some((liman) => havuz.includes(liman))) {
  throw new Error(
    'DIRECT_URL tanımlı değil ve DATABASE_URL havuzlayıcıya (6543) bakıyor. '
    + 'Migration havuzlayıcı üzerinden çalışmaz: advisory lock alınamadığı '
    + 'için `prisma migrate deploy` hata vermeden sonsuza kadar bekler. '
    + 'DIRECT_URL olarak Supabase\'in DOĞRUDAN adresini (port 5432) tanımlayın.',
  );
}

/*
 * TEMİZLENMİŞ değer doğrudan veriliyor, `env()` ile DEĞİL.
 *
 * `env('DIRECT_URL')` Prisma'ya "bu değişkeni sen oku" demek; ham
 * değeri kendisi alıyor ve yukarıdaki temizlik hiç uygulanmıyordu.
 * Sonuç: tırnaklı bir adreste doğrulama geçiyor ama Prisma yine
 * P1013 veriyordu — iki tarafın farklı değere bakması en kötüsü.
 */
const semaUrl = secilen ?? 'postgresql://tanimsiz:tanimsiz@localhost:5432/tanimsiz';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: semaUrl,
  },
});
