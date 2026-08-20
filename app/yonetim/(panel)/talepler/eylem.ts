'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { sql } from '@/lib/db';
import { panelGerekli, yonetici } from '@/lib/yetki';
import { TALEP_DURUMLARI } from '@/lib/talep-tipleri';

/**
 * Talep eylemleri.
 *
 * "Numarayı göster" GERİ ALINAMAZ bir eylemdir: acilma_zamani bir kez
 * damgalanır, sonraki görüntülemeler onu değiştirmez. Damganın yeniden
 * yazılabilmesi, firma karnesindeki yanıt süresini manipüle etmeye
 * açık kapı bırakırdı.
 */

export type TalepDurumu = {
  hata?: string;
  telefon?: string;
  talepId?: number;
} | null;

async function ipAl(): Promise<string | null> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

/** Erişim yetkisi: yönetim her talebi, firma yalnızca kendi taleplerini. */
async function talebeErisim(id: number) {
  const k = await panelGerekli();
  const admin = yonetici(k);

  const [t] = await sql<{ id: number; firma_id: number | null; telefon: string; acik: boolean }[]>`
    select id, firma_id, telefon, (acilma_zamani is not null) as acik
    from talep where id = ${id}
  `;
  if (!t) return { hata: 'Talep bulunamadı.' as const };
  if (!admin && t.firma_id !== k.firma_id) {
    return { hata: 'Bu talep sizin firmanıza ait değil.' as const };
  }
  return { k, t };
}

export async function numarayiGoster(_onceki: TalepDurumu, f: FormData): Promise<TalepDurumu> {
  const id = Number(f.get('id'));
  if (!Number.isFinite(id)) return { hata: 'Geçersiz talep.' };

  const e = await talebeErisim(id);
  if ('hata' in e) return { hata: e.hata };
  const { k, t } = e;

  await sql.begin(async (tx) => {
    // Damga YALNIZCA ilk açılışta. coalesce olmadan her görüntüleme
    // yanıt süresini sıfırlar ve karne ölçümü işe yaramaz hale gelir.
    await tx`
      update talep
      set acilma_zamani = coalesce(acilma_zamani, now()),
          durum = case when durum = 'yeni' then 'acildi' else durum end
      where id = ${id}
    `;
    // Kişisel veriye erişim kaydı: kim, hangi talep, ne zaman.
    await tx`
      insert into denetim_gunlugu (kim, islem, varlik, varlik_id, alan, ip)
      values (${k.eposta}, 'telefon_goruntuleme', 'talep', ${id}, 'telefon', ${await ipAl()})
    `;
  });

  revalidatePath('/yonetim/talepler');
  return { telefon: t.telefon, talepId: id };
}

export async function durumDegistir(_onceki: TalepDurumu, f: FormData): Promise<TalepDurumu> {
  const id = Number(f.get('id'));
  const durum = String(f.get('durum') ?? '');

  if (!Number.isFinite(id)) return { hata: 'Geçersiz talep.' };
  if (!(durum in TALEP_DURUMLARI)) return { hata: 'Geçersiz durum.' };

  const e = await talebeErisim(id);
  if ('hata' in e) return { hata: e.hata };
  const { k } = e;

  await sql.begin(async (tx) => {
    const [eski] = await tx<{ durum: string }[]>`select durum from talep where id = ${id}`;
    await tx`update talep set durum = ${durum} where id = ${id}`;
    await tx`
      insert into denetim_gunlugu (kim, islem, varlik, varlik_id, alan, eski_deger, yeni_deger)
      values (${k.eposta}, 'guncelleme', 'talep', ${id}, 'durum',
              ${eski?.durum ?? null}, ${durum})
    `;
  });

  revalidatePath('/yonetim/talepler');
  return null;
}
