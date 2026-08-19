'use server';

import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { yoneticiGerekli } from '@/lib/yetki';
import { slugla } from '@/lib/slug';

/**
 * Yeni proje oluşturma.
 *
 * Yalnızca temel alanlar sorulur ve proje TASLAK olarak açılır; gerisi
 * düzenleyicide doldurulur. Uzun bir formu baştan dayatmak, kullanıcıyı
 * eksik veriyle yayına almaya iter — taslak hiçbir yerde görünmediği
 * için o baskı ortadan kalkar.
 */

export type YeniDurum = { hata?: string } | null;

export async function projeOlustur(_onceki: YeniDurum, f: FormData): Promise<YeniDurum> {
  const k = await yoneticiGerekli();

  const ad = String(f.get('ad') ?? '').trim();
  const firmaId = Number(f.get('firma_id'));
  const il = String(f.get('il') ?? '').trim().toLowerCase();
  const ilce = String(f.get('ilce') ?? '').trim().toLowerCase();
  const tip = String(f.get('tip') ?? 'konut');
  const slugHam = String(f.get('slug') ?? '').trim();

  if (!ad || !Number.isFinite(firmaId) || !il || !ilce) {
    return { hata: 'Proje adı, firma, il ve ilçe zorunlu.' };
  }

  const slug = slugla(slugHam || ad);
  if (!slug) return { hata: 'Slug üretilemedi; elle girin.' };

  const [varMi] = await sql<{ id: number }[]>`select id from proje where slug = ${slug}`;
  if (varMi) {
    return { hata: `"${slug}" adresi kullanımda. Slug alanına farklı bir değer girin.` };
  }

  const [yeni] = await sql<{ id: number }[]>`
    insert into proje (slug, ad, firma_id, il, ilce, tip, durum, yayinda)
    values (${slug}, ${ad}, ${firmaId}, ${il}, ${ilce}, ${tip}, 'taslak', false)
    returning id
  `;
  if (!yeni) return { hata: 'Proje oluşturulamadı.' };

  await sql`
    insert into denetim_gunlugu (kim, islem, varlik, varlik_id, yeni_deger)
    values (${k.eposta}, 'olusturma', 'proje', ${yeni.id}, ${ad})
  `;

  redirect(`/yonetim/projeler/${yeni.id}`);
}
