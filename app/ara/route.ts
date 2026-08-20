import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * /ara — hero arama kutusunun hedefi.
 *
 * Kanonik adrese YÖNLENDİRİR, kendi sonuç sayfası yoktur. Sebep SEO:
 * aynı liste hem /ara?il=mugla hem /mugla-konut-projeleri adresinde
 * görünürse iki adres birbiriyle yarışır. Tek kanonik adres var,
 * burası ona 302 ile taşıyor.
 *
 * 302 (kalıcı değil) bilinçli: arama parametreleri değişebilir,
 * kalıcı yönlendirme tarayıcıda önbelleklenip yanlış yere kilitlenir.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SLUG = /^[a-z0-9-]{1,60}$/;

export async function GET(istek: Request) {
  const q = new URL(istek.url).searchParams;
  const il = q.get('il')?.trim().toLowerCase();
  const tip = q.get('tip')?.trim().toLowerCase();
  const bolge = q.get('bolge')?.trim().toLowerCase();
  const maxf = q.get('maxf')?.replace(/\D/g, '');
  const teslim = q.get('teslim')?.replace(/\D/g, '');

  // Şehir seçilmediyse İstanbul'a düşmek YANLIŞ olurdu: villa projeleri
  // Muğla, İzmir ve Antalya'da yoğunlaşıyor ve "Villa projeleri"
  // bağlantısı boş bir İstanbul listesine çıkardı. Segmentte en çok
  // projesi olan il seçiliyor.
  let yol: string | null = null;

  // Sahil bölgesi ilçeye çözülür: "Yalıkavak" adres değil, Bodrum'un
  // içindeki bir bölge. Birden çok ilçeye yayılan bölgede (Kaş & Kalkan)
  // il sayfasına düşülür — yanlış ilçeye kilitlemektense geniş kalsın.
  if (bolge && SLUG.test(bolge)) {
    const [b] = await sql<{ il: string; ilceler: string[] }[]>`
      select il, ilceler from sahil_bolgesi where slug = ${bolge} and yayinda
    `;
    if (b) {
      yol = b.ilceler.length === 1
        ? `/${b.il}/${b.ilceler[0]}-konut-projeleri`
        : `/${b.il}-konut-projeleri`;
    }
  } else if (il && SLUG.test(il)) {
    yol = `/${il}-konut-projeleri`;
  }

  if (!yol) {
    const [en] = await sql<{ il: string }[]>`
      select il from proje
      where yayinda and durum in ('lansman','satista')
        ${tip && SLUG.test(tip) ? sql`and tip = ${tip.replace(/-/g, '_')}` : sql``}
      group by il
      order by count(*) desc, il
      limit 1
    `;
    yol = en ? `/${en.il}-konut-projeleri` : '/istanbul-konut-projeleri';
  }

  const p = new URLSearchParams();
  if (tip && SLUG.test(tip)) p.set('kategori', tip);
  if (maxf) p.set('maxf', maxf);
  if (teslim) p.set('teslim', teslim);

  const s = p.toString();
  return NextResponse.redirect(new URL(yol + (s ? `?${s}` : ''), istek.url), 302);
}
