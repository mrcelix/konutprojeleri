import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

/**
 * Gecelik site haritası yenilemesi.
 *
 * Ağır veritabanı işleri BURADA DEĞİL, pg_cron'da çalışır (fonksiyon süre
 * sınırı, soğuk başlatma ve ağ hatası sorunları bir anda ortadan kalkar).
 * Vercel Cron yalnızca uygulama mantığı gerektiren işleri yapar —
 * site haritası beyaz liste ve eşik kurallarına bağlı olduğu için burada.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ hata: 'yetkisiz' }, { status: 401 });
  }

  revalidatePath('/sitemap.xml');

  return NextResponse.json({ ok: true, zaman: new Date().toISOString() });
}
