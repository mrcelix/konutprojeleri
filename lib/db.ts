import postgres from 'postgres';
import type { Sql } from 'postgres';

/**
 * Supabase bağlantısı — Supavisor TRANSACTION mode (port 6543).
 *
 * İki ayar pazarlık konusu değil:
 *
 *  1. prepare: false
 *     Transaction-mode havuzda sunucu tarafı prepared statement çalışmaz.
 *     Açık kalırsa sorgular YÜK ALTINDA rastgele
 *     `prepared statement "s1" does not exist` hatası verir.
 *     Geliştirmede ve testte görünmez, canlıda patlar.
 *
 *  2. max: 1
 *     Havuzlama Supavisor'ın işi. Serverless fonksiyon örneği başına
 *     tek bağlantı yeter; fonksiyon içinde ikinci bir havuz kurmak
 *     bağlantı fırtınasına yol açar.
 *
 * BAĞLANTI TEMBELDİR: istemci ilk sorguda kurulur, modül yüklenirken değil.
 * Aksi halde DATABASE_URL olmayan ortamlarda (CI, ilk derleme, önizleme
 * dağıtımı) `next build` daha veri çekmeye çalışmadan kırılır.
 */

declare global {
  // eslint-disable-next-line no-var
  var __sql: Sql | undefined;
}

let istemci: Sql | undefined;

function baglan(): Sql {
  if (istemci) return istemci;
  if (globalThis.__sql) return (istemci = globalThis.__sql);

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL tanımlı değil. .env.example dosyasını .env.local olarak kopyalayın.'
    );
  }

  istemci = postgres(url, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: { undefined: null },
  });

  if (process.env.NODE_ENV !== 'production') globalThis.__sql = istemci;
  return istemci;
}

/**
 * `sql` tembel bir vekildir: etiketli şablon olarak çağrıldığında
 * (`sql\`select 1\``) veya `sql.unsafe`, `sql.json` gibi üyelerine
 * erişildiğinde bağlantıyı kurar.
 */
export const sql = new Proxy((() => {}) as unknown as Sql, {
  apply(_hedef, _this, argumanlar) {
    return Reflect.apply(baglan() as never, undefined, argumanlar);
  },
  get(_hedef, alan) {
    const c = baglan() as unknown as Record<string | symbol, unknown>;
    const deger = c[alan];
    return typeof deger === 'function' ? deger.bind(c) : deger;
  },
}) as Sql;

/**
 * Göçler ve bakım işleri için doğrudan bağlantı (SESSION mode, 5432).
 * Uygulama isteklerinde KULLANILMAZ.
 */
export function directSql(): Sql {
  const direct = process.env.DIRECT_URL;
  if (!direct) throw new Error('DIRECT_URL tanımlı değil.');
  return postgres(direct, { max: 1 });
}

/** Bölge yapılandırmasının doğruluğunu ölçer. Beklenen: < 3 ms. */
export async function gecikmeOlc(): Promise<number> {
  const t0 = performance.now();
  await sql`select 1`;
  return Math.round((performance.now() - t0) * 100) / 100;
}
