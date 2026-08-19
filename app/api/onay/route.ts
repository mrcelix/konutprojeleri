import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { projeEtiketleri } from '@/lib/cache-tags';

/**
 * Onay kuyruğu — yönetim panelindeki "Onayla" düğmesi buraya vurur.
 *
 * Firma paneli yayına alma yetkisine sahip değildir; gönderdiği değişiklik
 * onay_kaydi tablosuna düşer. Onaylandığı anda:
 *   1. değişiklik projeye uygulanır
 *   2. fiyat arşivine kalıcı kayıt düşer (silinemez)
 *   3. denetim günlüğüne yazılır
 *   4. YALNIZCA etkilenen sayfalar yeniden üretilir
 *
 * Adım 4 kritik: geniş kapsamlı revalidatePath('/', 'layout') çağırmak
 * 5.000 sayfayı geçersiz kılar ve ISR'ın faydasını sıfırlar.
 */

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const gizli = req.headers.get('authorization');
  if (gizli !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
    return NextResponse.json({ hata: 'yetkisiz' }, { status: 401 });
  }

  const { onayKaydiId, karar, gerekce, kullanici } = await req.json();

  if (karar === 'reddet' && !gerekce) {
    // Gerekçesiz ret, firmanın aynı hatayı tekrarlamasına yol açar
    return NextResponse.json({ hata: 'ret gerekçesi zorunlu' }, { status: 400 });
  }

  const [kayit] = await sql<
    { proje_id: number; slug: string; il: string; ilce: string; mahalle: string | null; firma_slug: string }[]
  >`
    select p.id as proje_id, p.slug, p.il, p.ilce, p.mahalle, f.slug as firma_slug
    from onay_kaydi o
    join proje p on p.id = o.varlik_id
    join firma f on f.id = p.firma_id
    where o.id = ${onayKaydiId} and o.durum = 'bekliyor'
  `;

  if (!kayit) {
    return NextResponse.json({ hata: 'kayıt bulunamadı veya karara bağlanmış' }, { status: 404 });
  }

  if (karar === 'onayla') {
    // TODO aşama 5: değişikliği uygula + fiyat_kaydi'na ekle (tek transaction)
    await sql`
      update onay_kaydi
      set durum = 'onaylandi', karar_veren = ${kullanici}, karar_zaman = now()
      where id = ${onayKaydiId}
    `;

    // Hedefli yenileme — tüm site değil, yalnızca etkilenenler
    for (const etiket of projeEtiketleri({
      id: kayit.proje_id,
      slug: kayit.slug,
      il: kayit.il,
      ilce: kayit.ilce,
      mahalle: kayit.mahalle,
      firmaSlug: kayit.firma_slug,
    })) {
      revalidateTag(etiket);
    }
  } else {
    await sql`
      update onay_kaydi
      set durum = 'reddedildi', gerekce = ${gerekce},
          karar_veren = ${kullanici}, karar_zaman = now()
      where id = ${onayKaydiId}
    `;
  }

  // Denetim günlüğü — append-only, silinemez
  await sql`
    insert into denetim_gunlugu (kim, islem, varlik, varlik_id, yeni_deger, ip)
    values (
      ${kullanici},
      ${karar === 'onayla' ? 'onayladi' : 'reddetti'},
      'onay_kaydi', ${onayKaydiId}, ${gerekce ?? null},
      ${req.headers.get('x-forwarded-for') ?? null}
    )
  `;

  return NextResponse.json({ ok: true });
}
