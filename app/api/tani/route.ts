import { NextResponse } from 'next/server';
import { gecikmeOlc } from '@/lib/db';

/**
 * GEÇİCİ TANI UCU — kurulum bitince SİLİNECEK.
 *
 * Ortam değişkenlerinin dağıtıma ulaşıp ulaşmadığını söyler.
 * DEĞER DÖNDÜRMEZ, yalnızca var/yok bilgisi ve bağlantı sunucusunun
 * adı. Değişken adları zaten .env.example ile depoda açık olduğu için
 * var/yok bilgisi sır değil; parola, anahtar ve dize hiçbir koşulda
 * yanıta girmez.
 *
 * NEDEN GEREKLİ: Vercel'de değişken tanımlıyken de dağıtıma
 * geçmeyebiliyor — yanlış ortam kapsamı (Production yerine yalnızca
 * Development), kaydedilmemiş form ya da NEXT_PUBLIC_ değişkenlerinin
 * derleme anında gömülmesi yüzünden. Dışarıdan bakınca hepsi aynı
 * görünüyor; bu uç ayrımı yapıyor.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CALISMA_ANI = [
  'DATABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'REVALIDATE_SECRET',
];

// Bunlar derleme anında koda gömülür. Değişken sonradan eklenip
// derleme önbelleği kullanılarak yeniden dağıtıldıysa boş kalırlar.
const DERLEME_ANI = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
  NEXT_PUBLIC_HARITA_KARO: process.env.NEXT_PUBLIC_HARITA_KARO,
};

export async function GET() {
  const calismaAni = Object.fromEntries(
    CALISMA_ANI.map((k) => [k, process.env[k] ? 'tanımlı' : 'YOK'])
  );
  const derlemeAni = Object.fromEntries(
    Object.entries(DERLEME_ANI).map(([k, v]) => [k, v ? 'tanımlı' : 'YOK'])
  );

  // Bağlantı dizesinden yalnızca sunucu adı ve port. Kullanıcı adı ve
  // parola ayrıştırılıp atılır.
  let sunucu = 'YOK';
  const ham = process.env.DATABASE_URL;
  if (ham) {
    try {
      const u = new URL(ham);
      sunucu = `${u.hostname}:${u.port || '5432'}`;
    } catch {
      sunucu = 'ÇÖZÜLEMEDİ (dize bozuk olabilir)';
    }
  }

  let veritabani: string;
  let gecikme: { ilk: number; ortanca: number } | null = null;
  try {
    gecikme = await gecikmeOlc();
    veritabani = 'bağlandı';
  } catch (e) {
    veritabani = `bağlanamadı: ${(e as Error).message.slice(0, 140)}`;
  }

  return NextResponse.json(
    {
      not: 'Geçici tanı ucu. Kurulum bitince silinecek. Değer döndürmez.',
      bolge: process.env.VERCEL_REGION ?? 'bilinmiyor',
      ortam: process.env.VERCEL_ENV ?? 'yerel',
      calismaAni,
      derlemeAni,
      sunucu,
      veritabani,
      gecikme,
    },
    { headers: { 'cache-control': 'no-store' } }
  );
}
