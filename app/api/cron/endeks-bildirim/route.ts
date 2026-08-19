import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * Haftalık endeks sağlık kontrolü.
 *
 * Endeksin KENDİSİ pg_cron'da hesaplanır; burada yalnızca sonucun
 * makul olup olmadığına bakılır. Amaç, bozuk bir seriyi sayfada
 * görünmeden önce yakalamak: endeks sitenin en kırılgan iddiası,
 * bir kez yanlış rakam yayınlarsa tamamı tartışmaya açılır.
 *
 * DİKKAT: adı "bildirim" ama e-posta göndermez — sistemde henüz
 * e-posta sağlayıcısı yok. Bulgular denetim günlüğüne yazılır ve
 * yanıtta döner. Sağlayıcı eklendiğinde gönderim buraya girer.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

// Aylık %25'ten büyük değişim gerçek olabilir ama incelenmeden yayınlanmamalı.
const SICRAMA_ESIGI = 0.25;

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ hata: 'yetkisiz' }, { status: 401 });
  }

  try {
    const bulgular = await sql<{ tur: string; il: string | null; donem: string; ayrinti: string }[]>`
      with son as (
        select
          coalesce(il, '__TR__') as il,
          donem,
          m2::float8 as m2,
          lag(m2) over (partition by coalesce(il, '__TR__') order by donem)::float8 as onceki,
          row_number() over (partition by coalesce(il, '__TR__') order by donem desc) as sira
        from mv_endeks_donem
      )
      select 'sicrama' as tur,
             nullif(il, '__TR__') as il,
             donem,
             format('%s → %s (%s%%)',
                    round(onceki), round(m2),
                    round(((m2 - onceki) / nullif(onceki, 0) * 100)::numeric, 1)) as ayrinti
        from son
       where sira = 1 and onceki is not null
         and abs((m2 - onceki) / nullif(onceki, 0)) > ${SICRAMA_ESIGI}

      union all

      -- Serisi duran bölge: son dönem güncel değilse hesap kırılmıştır
      select 'bayat' as tur,
             nullif(il, '__TR__') as il,
             donem,
             'seri güncellenmiyor' as ayrinti
        from son
       where sira = 1
         and donem < to_char(now() - interval '2 month', 'YYYY-MM')
    `;

    // Bulgular denetim günlüğüne yazılır: sonradan "ne zaman fark ettik"
    // sorusunun cevabı olur.
    if (bulgular.length > 0) {
      await sql`
        insert into denetim_gunlugu (kim, islem, varlik, alan, yeni_deger)
        select 'cron/endeks-bildirim', 'uyari', 'mv_endeks_donem',
               b.tur, format('%s %s · %s', coalesce(b.il, 'TR'), b.donem, b.ayrinti)
          from json_to_recordset(${JSON.stringify(bulgular)}::json)
            as b(tur text, il text, donem text, ayrinti text)
      `;
    }

    return NextResponse.json({
      ok: true,
      bulgu: bulgular.length,
      bulgular,
      zaman: new Date().toISOString(),
    });
  } catch (e) {
    // Cron hatası sessiz kalmamalı: 500 dönerse Vercel günlüğünde görünür.
    return NextResponse.json(
      { hata: 'endeks kontrolü başarısız', ayrinti: String(e) },
      { status: 500 }
    );
  }
}
