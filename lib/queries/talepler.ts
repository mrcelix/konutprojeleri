import { sql } from '@/lib/db';
import type { Talep } from '@/lib/talep-tipleri';

/**
 * Talepler.
 *
 * Bu sayfanın en önemli mekaniği TELEFONUN GİZLİ OLMASI. Numara ancak
 * açıkça istendiğinde gösterilir ve o an acilma_zamani damgalanır.
 * İki sebep:
 *
 *  1. ÖLÇÜM. Firma karnesindeki "ortalama yanıt süresi" bu damgaya
 *     dayanır. Satırı görüntülemekle damgalansaydı, listeyi açan
 *     herkes tüm talepleri "açılmış" yapar ve ölçüm anlamsızlaşırdı.
 *  2. KVKK. Telefon kişisel veridir; gereksiz yere ekranda durmaz.
 *     Kim, hangi talebin numarasını, ne zaman gördü — denetim
 *     günlüğünde yazılı olur.
 *
 * Numarayı görmek geri alınamaz bir eylemdir; arayüz bunu söyler.
 */

// Saf tipler ve etiketler lib/talep-tipleri.ts'te: talep satırı bir
// istemci bileşeni ve bu modülü import edemez.
export type { Talep } from '@/lib/talep-tipleri';
export { TALEP_DURUMLARI } from '@/lib/talep-tipleri';

export type TalepSuzgeci = {
  durum?: string;
  /** 'geciken' → 24 saati aşmış açılmamış talepler */
  sorun?: string;
  firmaId?: number | null;
  sayfa?: number;
};

export const TALEP_SAYFA = 30;


/**
 * Telefon maskesi SQL tarafında.
 *
 * Ham numara sorgudan HİÇ ÇIKMAZ. Sunucuda maskelemek de olurdu ama o
 * zaman numara sunucu belleğine ve olası hata günlüklerine girerdi;
 * hiç çekmemek daha güvenli.
 */
export async function talepListesi(
  f: TalepSuzgeci
): Promise<{ satirlar: Talep[]; toplam: number }> {
  const kosullar = [sql`true`];
  if (f.firmaId) kosullar.push(sql`t.firma_id = ${f.firmaId}`);
  if (f.durum) kosullar.push(sql`t.durum = ${f.durum}`);
  if (f.sorun === 'geciken') {
    kosullar.push(sql`t.durum = 'yeni' and t.olusturuldu < now() - interval '24 hours'`);
  }
  const where = kosullar.reduce((a, b) => sql`${a} and ${b}`);

  const sayfa = Math.max(1, f.sayfa ?? 1);
  const offset = (sayfa - 1) * TALEP_SAYFA;

  const [r] = await sql<[{ satirlar: Talep[]; toplam: number }]>`
    with eslesen as (
      select
        t.id, t.ad,
        -- 05XX ••• XX 42 — son iki hane teyit için yeterli, tanımlamaya yetmez
        (left(t.telefon, 4) || ' ••• •• ' || right(t.telefon, 2)) as telefon_maskeli,
        t.daire_tipi,
        t.butce_min::float8 as butce_min,
        t.butce_max::float8 as butce_max,
        t.tasinma, t.kaynak_sayfa, t.uyum_skoru, t.durum,
        t.proje_id, p.ad as proje_ad, p.il, p.ilce, f.ad as firma_ad,
        to_char(t.olusturuldu, 'YYYY-MM-DD HH24:MI') as olusturuldu,
        to_char(t.acilma_zamani, 'YYYY-MM-DD HH24:MI') as acilma_zamani,
        round(extract(epoch from
          coalesce(t.acilma_zamani, now()) - t.olusturuldu) / 3600)::float8 as saat
      from talep t
      left join proje p on p.id = t.proje_id
      left join firma f on f.id = t.firma_id
      where ${where}
    )
    select
      (select coalesce(json_agg(s order by s.olusturuldu desc), '[]')
         from (select * from eslesen order by olusturuldu desc
               limit ${TALEP_SAYFA} offset ${offset}) s
      ) as satirlar,
      (select count(*)::int from eslesen) as toplam
  `;

  return { satirlar: r?.satirlar ?? [], toplam: r?.toplam ?? 0 };
}

export type TalepOzeti = {
  yeni: number;
  geciken: number;
  ortYanitSaat: number | null;
  bu_ay: number;
  satis: number;
};

export async function talepOzeti(firmaId?: number | null): Promise<TalepOzeti> {
  const kapsam = firmaId ? sql`and t.firma_id = ${firmaId}` : sql``;
  const [r] = await sql<[TalepOzeti]>`
    select
      (select count(*)::int from talep t where t.durum = 'yeni' ${kapsam}) as yeni,
      (select count(*)::int from talep t
        where t.durum = 'yeni' and t.olusturuldu < now() - interval '24 hours' ${kapsam}
      ) as geciken,
      -- Yanıt süresi YALNIZCA açılmış taleplerden. Açılmamışları dahil
      -- etmek ortalamayı sürekli büyütür ve firma ne yaparsa yapsın
      -- düzelmez; o bilgi ayrıca "geciken" sayısında zaten var.
      (select round(avg(extract(epoch from t.acilma_zamani - t.olusturuldu)) / 3600)::float8
        from talep t where t.acilma_zamani is not null ${kapsam}) as "ortYanitSaat",
      (select count(*)::int from talep t
        where t.olusturuldu >= date_trunc('month', now()) ${kapsam}) as bu_ay,
      (select count(*)::int from talep t where t.durum = 'satis' ${kapsam}) as satis
  `;
  return r ?? { yeni: 0, geciken: 0, ortYanitSaat: null, bu_ay: 0, satis: 0 };
}

export async function talepDurumSayimlari(firmaId?: number | null) {
  return sql<{ durum: string; n: number }[]>`
    select durum, count(*)::int as n from talep t
    where true ${firmaId ? sql`and t.firma_id = ${firmaId}` : sql``}
    group by durum order by count(*) desc
  `;
}
