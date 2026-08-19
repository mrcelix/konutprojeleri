import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { KVKK_SURUM, kvkkHash } from '@/lib/kvkk';

/**
 * Talep formu — dönüşüm hunisinin son adımı.
 *
 * Üç şey aynı işlemde olur:
 *   1. Talep kaydı (hangi projeye, hangi tipe, hangi bütçeyle)
 *   2. KVKK açık rıza kaydı — metin sürümü, hash, IP, tarayıcı
 *   3. Firmaya yönlendirme (paket kotası dolmuşsa "dağıtılmadı" kalır,
 *      talep kaybolmaz)
 *
 * Talep kaydı ile rıza kaydı AYNI TRANSACTION içinde yazılır. Biri yazılıp
 * diğeri yazılamazsa rızasız kişisel veri tutmuş oluruz.
 */

export const runtime = 'nodejs';

const Girdi = z.object({
  proje_id: z.coerce.number().int().positive().optional(),
  firma_slug: z.string().max(120).optional(),
  ad: z.string().trim().min(2, 'Ad soyad en az 2 karakter olmalı').max(120),
  telefon: z.string().trim().regex(/^0?5\d{9}$/, 'Telefon 10 haneli olmalı (05XX XXX XX XX)'),
  daire_tipi: z.string().max(20).optional(),
  butce_min: z.coerce.number().nonnegative().optional(),
  butce_max: z.coerce.number().nonnegative().optional(),
  tasinma: z.string().max(40).optional(),
  kvkk: z.literal('on', { message: 'KVKK onayı zorunlu' }),
  // Bal küpü: gerçek kullanıcı bu alanı görmez ve doldurmaz
  website: z.string().max(0).optional(),
});

export async function POST(req: Request) {
  const form = Object.fromEntries((await req.formData()).entries());
  const cozum = Girdi.safeParse(form);

  if (!cozum.success) {
    const ilk = cozum.error.issues[0];
    return NextResponse.json(
      { hata: ilk?.message ?? 'Form eksik veya hatalı' },
      { status: 400 }
    );
  }

  const d = cozum.data;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const ua = req.headers.get('user-agent') ?? null;
  const referer = req.headers.get('referer') ?? null;

  // Telefonu normalize et: 05XXXXXXXXX
  const telefon = d.telefon.startsWith('0') ? d.telefon : `0${d.telefon}`;

  try {
    const [talep] = await sql.begin(async (tx) => {
      // Firma, projeden gelir. Firma sayfasından geldiyse slug ile.
      const [hedef] = await tx<{ firma_id: number | null; kota_doldu: boolean }[]>`
        select
          coalesce(p.firma_id, f2.id) as firma_id,
          coalesce((
            select count(*) >= case f.paket
              when 'ucretsiz' then 5
              when 'pro' then 60
              else 1000000 end
            from talep t
            where t.firma_id = coalesce(p.firma_id, f2.id)
              and t.olusturuldu > date_trunc('month', now())
              and t.durum <> 'spam'
          ), false) as kota_doldu
        from (select 1) x
        left join proje p on p.id = ${d.proje_id ?? null}
        left join firma f2 on f2.slug = ${d.firma_slug ?? null}
        left join firma f on f.id = coalesce(p.firma_id, f2.id)
      `;

      // Spam: aynı telefon son 10 dakikada 3'ten fazla proje denemişse
      const [sayim] = await tx<{ son_dakika: number }[]>`
        select count(*)::int as son_dakika from talep
        where telefon = ${telefon} and olusturuldu > now() - interval '10 minutes'
      `;
      const spam = (sayim?.son_dakika ?? 0) >= 3;

      const durum = spam ? 'spam' : hedef?.kota_doldu ? 'yeni' : 'iletildi';

      const [kayit] = await tx<{ id: number }[]>`
        insert into talep (
          proje_id, firma_id, ad, telefon, daire_tipi,
          butce_min, butce_max, tasinma, kaynak_sayfa, durum
        ) values (
          ${d.proje_id ?? null}, ${hedef?.firma_id ?? null}, ${d.ad}, ${telefon},
          ${d.daire_tipi ?? null}, ${d.butce_min ?? null}, ${d.butce_max ?? null},
          ${d.tasinma ?? null}, ${referer}, ${durum}
        ) returning id
      `;

      // Rıza kaydı AYNI transaction'da. Değişmez tablo: sonradan düzeltilemez.
      await tx`
        insert into kvkk_onay (talep_id, metin_surumu, metin_hash, ip, user_agent)
        values (${kayit!.id}, ${KVKK_SURUM}, ${kvkkHash()}, ${ip}, ${ua})
      `;

      return [kayit!];
    });

    const url = new URL('/talep/gonderildi', req.url);
    if (d.proje_id) url.searchParams.set('proje', String(d.proje_id));
    url.searchParams.set('t', String(talep!.id));

    // 303: POST sonrası GET — tazelemede form tekrar gönderilmez
    return NextResponse.redirect(url, 303);
  } catch (e) {
    console.error('talep kaydedilemedi', e);
    return NextResponse.json(
      { hata: 'Talebiniz kaydedilemedi. Lütfen tekrar deneyin.' },
      { status: 500 }
    );
  }
}
