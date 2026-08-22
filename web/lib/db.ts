import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma';

/**
 * Prisma 7 sürücü adaptörüyle tek örnek (singleton) istemci.
 * Next.js geliştirme modunda modüller sık sık yeniden yüklendiği için
 * globalThis üzerinde saklanır; aksi halde her hot reload yeni bir
 * bağlantı havuzu açar ve PostgreSQL bağlantı sınırı dolar.
 */
const baglantiUrl = process.env.DATABASE_URL;
if (!baglantiUrl) throw new Error('DATABASE_URL tanımlı değil. web/.env dosyasını kontrol edin.');

/**
 * Sunucusuz ortamda her fonksiyon örneği kendi havuzunu açıyor. Supabase
 * ve Neon gibi servislerde bağlantı sınırı hızla doluyor; bu yüzden
 * havuzlayıcı (pooler) adresi kullanıldığında havuzu 1'e indiriyoruz —
 * havuzlama zaten sunucu tarafında yapılıyor.
 */
const havuzlu = /pgbouncer=true|:6543|pooler\./i.test(baglantiUrl);
const sunucusuz = !!process.env.VERCEL;

const olustur = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: baglantiUrl,
      ...(havuzlu || sunucusuz
        ? { max: 1, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000 }
        : {}),
    }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

const g = globalThis as unknown as { prisma?: ReturnType<typeof olustur> };

export const prisma = g.prisma ?? olustur();

if (process.env.NODE_ENV !== 'production') g.prisma = prisma;
