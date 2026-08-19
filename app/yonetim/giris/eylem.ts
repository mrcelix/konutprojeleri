'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { sql } from '@/lib/db';
import { supabaseSunucu } from '@/lib/supabase/sunucu';

/**
 * Panel girişi.
 *
 * Sunucu eylemi olarak yazıldı; JavaScript kapalıyken de çalışır.
 *
 * Deneme sınırı BAŞARISIZ giriş kayıtlarına dayanır: giris_kaydi
 * salt-ekleme olduğu için sayaç silinemez. Bellekte tutulsaydı sunucusuz
 * ortamda her soğuk başlatmada sıfırlanır, yani hiç var olmazdı.
 */

const PENCERE_DK = 15;
const AZAMI_DENEME = 8;

async function ipAl(): Promise<string | null> {
  const h = await headers();
  const xff = h.get('x-forwarded-for');
  return xff?.split(',')[0]?.trim() ?? null;
}

export async function girisYap(_onceki: unknown, form: FormData) {
  const eposta = String(form.get('eposta') ?? '').trim().toLowerCase();
  const parola = String(form.get('parola') ?? '');
  const don = String(form.get('don') ?? '/yonetim');
  // Açık yönlendirme koruması: yalnızca kendi yollarımız.
  const hedef = don.startsWith('/') && !don.startsWith('//') ? don : '/yonetim';

  if (!eposta || !parola) {
    return { hata: 'E-posta ve parola gerekli.' };
  }

  const ip = await ipAl();

  const [sayim] = await sql<{ n: number }[]>`
    select count(*)::int as n from giris_kaydi
    where eposta = ${eposta} and not basarili
      and zaman > now() - (${PENCERE_DK} || ' minutes')::interval
  `;
  if ((sayim?.n ?? 0) >= AZAMI_DENEME) {
    return {
      hata: `Çok fazla başarısız deneme. ${PENCERE_DK} dakika sonra tekrar deneyin.`,
    };
  }

  const supabase = await supabaseSunucu();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: eposta,
    password: parola,
  });

  const basarili = !error && !!data.user;

  await sql`
    insert into giris_kaydi (eposta, basarili, ip)
    values (${eposta}, ${basarili}, ${ip})
  `;

  if (!basarili) {
    // Hangi kısmın yanlış olduğu SÖYLENMEZ: e-posta doğrulaması,
    // hangi adreslerin kayıtlı olduğunu sızdırır.
    return { hata: 'E-posta veya parola hatalı.' };
  }

  const [k] = await sql<{ aktif: boolean }[]>`
    select aktif from kullanici where id = ${data.user!.id}::uuid
  `;
  if (!k || !k.aktif) {
    await supabase.auth.signOut();
    return { hata: 'Bu hesabın panel erişimi yok. Site yöneticisiyle görüşün.' };
  }

  await sql`update kullanici set son_giris = now() where id = ${data.user!.id}::uuid`;

  redirect(hedef);
}

export async function cikisYap() {
  const supabase = await supabaseSunucu();
  await supabase.auth.signOut();
  redirect('/yonetim/giris');
}
