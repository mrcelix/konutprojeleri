import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { onayUygula } from '@/lib/queries/onay';

/**
 * Onay kuyruğu — makineden gelen kararlar için uç.
 *
 * Paneldeki düğme sunucu eylemi kullanır, bu uç değil. Uç, dışarıdan
 * (toplu araç, harici entegrasyon) karar bağlamak için duruyor.
 *
 * UYGULAMA MANTIĞI BURADA DEĞİL: lib/queries/onay.ts içindeki
 * onayUygula() çağrılır. İki kopya olsaydı biri güncellenip diğeri
 * unutulur ve onay yolu sessizce ayrışırdı — panelden onaylananla
 * uçtan onaylanan farklı sonuç verirdi.
 *
 * onayUygula() değişikliği uygular, fiyat arşivine yazar, denetim
 * günlüğünü doldurur ve YALNIZCA etkilenen sayfaları yeniler. Geniş
 * kapsamlı revalidatePath('/', 'layout') çağırmak 5.000 sayfayı
 * geçersiz kılar ve ISR'ın faydasını sıfırlar.
 */

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const gizli = req.headers.get('authorization');
  if (gizli !== `Bearer ${process.env.REVALIDATE_SECRET}`) {
    return NextResponse.json({ hata: 'yetkisiz' }, { status: 401 });
  }

  const { onayKaydiId, karar, gerekce, kullanici } = await req.json();

  if (karar !== 'onayla' && karar !== 'reddet') {
    return NextResponse.json({ hata: 'karar onayla ya da reddet olmalı' }, { status: 400 });
  }
  if (!kullanici) {
    // Kararı kimin verdiği denetim günlüğüne yazılıyor; anonim karar olmaz.
    return NextResponse.json({ hata: 'kullanici zorunlu' }, { status: 400 });
  }

  const sonuc = await onayUygula(Number(onayKaydiId), karar, String(kullanici), gerekce);
  if (!sonuc.ok) {
    return NextResponse.json({ hata: sonuc.hata }, { status: 400 });
  }

  await sql`
    insert into denetim_gunlugu (kim, islem, varlik, varlik_id, yeni_deger, ip)
    values (
      ${String(kullanici)},
      ${karar === 'onayla' ? 'onayladi' : 'reddetti'},
      'onay_kaydi', ${Number(onayKaydiId)}, ${gerekce ?? null},
      ${req.headers.get('x-forwarded-for') ?? null}
    )
  `;

  return NextResponse.json({ ok: true });
}
