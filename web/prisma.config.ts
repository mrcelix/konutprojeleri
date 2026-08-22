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
