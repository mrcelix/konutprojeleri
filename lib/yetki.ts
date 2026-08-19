import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { supabaseSunucu } from '@/lib/supabase/sunucu';

/**
 * Yetkilendirme.
 *
 * KİMLİK Supabase Auth'ta, YETKİ `kullanici` tablosunda. İkisini
 * ayırmak bilinçli: kimlik sağlayıcısı değişse bile rol modeli yerinde
 * kalır, ve JWT'ye rol gömmediğimiz için rol değişikliği anında etkili
 * olur — kullanıcının token'ının süresinin dolmasını beklemez.
 *
 * Uygulama veritabanına servis rolüyle bağlandığı için RLS bu yolda
 * devreye girmez; buradaki kontrol ASIL kontroldür, dekoratif değildir.
 */

export type Rol = 'admin' | 'editor' | 'firma';

export type Kullanici = {
  id: string;
  eposta: string;
  ad: string | null;
  rol: Rol;
  firma_id: number | null;
  aktif: boolean;
};

/** Oturumdaki kullanıcı, yoksa null. */
export async function oturum(): Promise<Kullanici | null> {
  const supabase = await supabaseSunucu();

  // getUser() token'ı Supabase'e doğrulatır. getSession() çerezdeki
  // veriye güvenir ve sunucuda ASLA yetki kararına dayanak yapılmamalı.
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const [k] = await sql<Kullanici[]>`
    select id::text as id, eposta::text as eposta, ad, rol, firma_id, aktif
    from kullanici where id = ${data.user.id}::uuid
  `;

  // Auth'ta var ama kullanici tablosunda yok ya da pasif: yetkisiz.
  // Sessizce "yetkili" saymak en tehlikeli varsayılan olurdu.
  if (!k || !k.aktif) return null;
  return k;
}

/** Panel sayfalarının başında çağrılır; yetkisizi girişe atar. */
export async function panelGerekli(): Promise<Kullanici> {
  const k = await oturum();
  if (!k) redirect('/yonetim/giris');
  return k;
}

/** Yalnızca admin ve editörün görebileceği sayfalar için. */
export async function yoneticiGerekli(): Promise<Kullanici> {
  const k = await panelGerekli();
  if (k.rol === 'firma') redirect('/yonetim/projeler');
  return k;
}

export const yonetici = (k: Kullanici) => k.rol === 'admin' || k.rol === 'editor';

export const ROL_ADLARI: Record<Rol, string> = {
  admin: 'Yönetici',
  editor: 'Editör',
  firma: 'Firma',
};
