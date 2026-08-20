'use server';

import { revalidatePath } from 'next/cache';
import { yoneticiGerekli } from '@/lib/yetki';
import { onayUygula } from '@/lib/queries/onay';

/**
 * Onay kuyruğu kararları.
 *
 * Yetki kontrolü BURADA da yapılır, sayfada yaptık diye atlanmaz:
 * sunucu eylemi kendi başına çağrılabilen bir uçtur, sayfanın
 * uzantısı değil.
 */

export type OnayDurumu = { hata?: string; bilgi?: string } | null;

export async function kararVer(_onceki: OnayDurumu, f: FormData): Promise<OnayDurumu> {
  const k = await yoneticiGerekli();

  const id = Number(f.get('id'));
  const karar = String(f.get('karar'));
  const gerekce = String(f.get('gerekce') ?? '');

  if (!Number.isFinite(id)) return { hata: 'Geçersiz kayıt.' };
  if (karar !== 'onayla' && karar !== 'reddet') return { hata: 'Geçersiz karar.' };

  const sonuc = await onayUygula(id, karar, k.eposta, gerekce);
  if (!sonuc.ok) return { hata: sonuc.hata };

  revalidatePath('/yonetim/onay');
  return {
    bilgi:
      karar === 'onayla'
        ? 'Değişiklik uygulandı ve etkilenen sayfalar yenilendi.'
        : 'Değişiklik reddedildi; gerekçe firmaya görünür.',
  };
}
