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
 *  2. max: 1 (ÇALIŞMA ANINDA)
 *     Havuzlama Supavisor'ın işi. Serverless fonksiyon örneği başına
 *     tek bağlantı yeter; fonksiyon içinde ikinci bir havuz kurmak
 *     bağlantı fırtınasına yol açar.
 *
 *     DERLEME AYRI BİR DÜNYA. `next build` onlarca sayfayı aynı anda
 *     render eder ve hepsi tek bağlantıda sıraya girer. Frankfurt'a
 *     gidiş-dönüş 50 ms olduğunda 30+ sorgu birikince sıranın sonundaki
 *     sayfa Next'in 60 saniyelik sayfa sınırını aşıp derlemeyi
 *     düşürüyordu. Derleme sunucusuz değil; orada havuz açılır.
 *
 *  3. numeric → number
 *     postgres.js numeric/decimal sütunlarını VARSAYILAN OLARAK METİN
 *     döndürür (float64 kayıpsız temsil edemeyeceği için). Bizim numeric
 *     sütunlarımız fiyat, metrekare, aidat ve gecikme ayı — hepsi
 *     10^15'in çok altında, yani float64'te tam temsil ediliyor.
 *     Metin dönmesi sinsi bir hata sınıfı üretiyordu: `para()` ve
 *     `m2Birim()` zorlama sayesinde çalışıyor, `.toFixed()` ise
 *     "toFixed is not a function" ile patlıyordu. Tek tek cast yazmak
 *     yerine sürücü seviyesinde çözülüyor.
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

  // NEXT_PHASE'i Next derleme sırasında kendisi ayarlar.
  const derleme = process.env.NEXT_PHASE === 'phase-production-build';

  istemci = postgres(url, {
    prepare: false,
    max: derleme ? 8 : 1,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: { undefined: null },
    types: {
      // OID 1700 = numeric. Bkz. yukarıdaki 3 numaralı not.
      numeric: {
        to: 1700,
        from: [1700],
        serialize: (x: number | string) => String(x),
        parse: (x: string) => Number(x),
      },
    },
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
export type Gecikme = {
  /** İlk sorgu: DNS + TCP + TLS + havuz kimlik doğrulaması dahil. */
  ilk: number;
  /** Bağlantı kurulduktan sonraki ortanca. Bölge eşleşmesinin ölçüsü budur. */
  ortanca: number;
};

/**
 * Ağ gecikmesi ölçümü.
 *
 * TEK SORGU ÖLÇMEK YANLIŞTI. İlk sorgu bağlantı kurulumunu da içerir:
 * DNS, TCP, TLS el sıkışması ve Supavisor kimlik doğrulaması. Bu, aynı
 * şehirde bile 100-150 ms sürer ve bölge eşleşmesi hakkında hiçbir şey
 * söylemez — rozet doğru yapılandırılmış bir kurulumda bile alarm
 * veriyordu.
 *
 * Bölge eşleşmesinin ölçüsü, bağlantı kurulduktan SONRAKİ gidiş-dönüş
 * süresidir. İkisi de döndürülüyor: ilk sorgu soğuk başlatmada gerçekten
 * ödenen bedel, ortanca ise altyapının doğru kurulduğunun kanıtı.
 */
export async function gecikmeOlc(orneklem = 5): Promise<Gecikme> {
  const t0 = performance.now();
  await sql`select 1`;
  const ilk = performance.now() - t0;

  const olcumler: number[] = [];
  for (let i = 0; i < orneklem; i++) {
    const t = performance.now();
    await sql`select 1`;
    olcumler.push(performance.now() - t);
  }
  olcumler.sort((a, b) => a - b);

  const yuvarla = (n: number) => Math.round(n * 100) / 100;
  return {
    ilk: yuvarla(ilk),
    ortanca: yuvarla(olcumler[Math.floor(olcumler.length / 2)] ?? ilk),
  };
}
