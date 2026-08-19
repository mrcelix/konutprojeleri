import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * Gecelik yönlendirme testi.
 *
 * Eski PHP adreslerinden gelen bağlantılar sitenin birikmiş SEO
 * değeridir. Bir yönlendirme sessizce bozulursa kayıp aylar sonra,
 * sıralama düştüğünde fark edilir. Bu iş onu ertesi gün yakalar.
 *
 * Örnekleme yapılır, tamamı taranmaz: amaç kapsam değil erken uyarı.
 * Tek bir kırık yönlendirme bile kalıbın bozulduğunu gösterir.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const ORNEK = 12;

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ hata: 'yetkisiz' }, { status: 401 });
  }

  const taban = process.env.NEXT_PUBLIC_SITE_URL;
  if (!taban) {
    return NextResponse.json({ hata: 'NEXT_PUBLIC_SITE_URL tanımlı değil' }, { status: 500 });
  }

  try {
    // Yayındaki projelerden örnek: kanonik adreslerinin 200 dönmesi gerekir.
    const projeler = await sql<{ il: string; ilce: string; slug: string }[]>`
      select il, ilce, slug::text as slug from proje
      where yayinda and durum in ('lansman','satista','teslim_edildi','arsiv')
      order by random() limit ${ORNEK}
    `;

    const adresler = [
      // Kalıp bazlı eski adresler — next.config.ts'teki kurallar
      { yol: '/index.php', bekle: 308 },
      { yol: '/proje-detay.php', bekle: 308 },
      ...projeler.map((p) => ({ yol: `/${p.il}/${p.ilce}/${p.slug}`, bekle: 200 })),
    ];

    const sonuclar = await Promise.all(
      adresler.map(async (a) => {
        try {
          const c = await fetch(new URL(a.yol, taban), {
            redirect: 'manual',
            cache: 'no-store',
          });
          return { yol: a.yol, bekle: a.bekle, geldi: c.status, ok: c.status === a.bekle };
        } catch (e) {
          return { yol: a.yol, bekle: a.bekle, geldi: 0, ok: false, hata: String(e) };
        }
      })
    );

    const kirik = sonuclar.filter((s) => !s.ok);

    if (kirik.length > 0) {
      await sql`
        insert into denetim_gunlugu (kim, islem, varlik, alan, yeni_deger)
        values ('cron/yonlendirme-testi', 'uyari', 'yonlendirme', 'kirik',
                ${kirik.map((k) => `${k.yol} → ${k.geldi} (beklenen ${k.bekle})`).join('; ')})
      `;
    }

    return NextResponse.json({
      ok: kirik.length === 0,
      denenen: sonuclar.length,
      kirik,
      zaman: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { hata: 'yönlendirme testi başarısız', ayrinti: String(e) },
      { status: 500 }
    );
  }
}
