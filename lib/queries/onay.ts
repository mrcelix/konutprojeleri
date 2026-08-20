import { revalidateTag } from 'next/cache';
import { sql } from '@/lib/db';
import { projeEtiketleri } from '@/lib/cache-tags';
import { veriSkoru } from '@/lib/veri-skoru';
import type { BekleyenOnay, DegisiklikPaketi } from '@/lib/onay-tipleri';

/**
 * Onay kuyruğu.
 *
 * Firma panelinden gelen değişiklikler doğrudan siteye yazılmaz;
 * buraya düşer ve bir insan karara bağlar. Sebep basit: fiyat, teslim
 * tarihi ve stok bu sitenin tek sermayesi. Denetimsiz yazma yetkisi
 * verilen bir portal, ilan sitesine dönüşür.
 *
 * UYGULAMA MANTIĞI TEK YERDE. Hem panel hem /api/onay ucu bu
 * fonksiyonu çağırır; iki ayrı kopya olsaydı biri güncellenip diğeri
 * unutulur ve onay yolu sessizce ayrışırdı.
 */

/** Değişiklik paketinde yazılmasına izin verilen proje alanları. */
const IZINLI = new Set([
  'ad', 'mahalle', 'teslim_ceyrek', 'toplam_konut', 'ticari_birim',
  'blok_sayisi', 'kat_sayisi', 'tavan_yuksekligi', 'aidat',
  'pesinat_orani', 'vade_ay', 'faizsiz', 'santiye_yuzde', 'aciklama',
  'durum',
]);

/**
 * Beyaz liste DIŞINDA bırakılanlar ve nedeni:
 *   slug, il, ilce  adres değişikliği 301 borcu doğurur, elle yapılır
 *   yayinda         yayına alma yetkisi firmada değil
 *   firma_id        projeyi başka firmaya devretmek onay işi değil
 *   veri_skoru      hesaplanan alan, beyan edilmez
 */

// Saf tipler ve etiketler lib/onay-tipleri.ts'te: onay kartı bir
// istemci bileşeni ve bu modülü import edemez.
export type { DegisiklikPaketi, BekleyenOnay } from '@/lib/onay-tipleri';
export { ISARET_ADLARI } from '@/lib/onay-tipleri';

export async function bekleyenOnaylar(firmaId?: number | null): Promise<BekleyenOnay[]> {
  return sql<BekleyenOnay[]>`
    select
      o.id, o.firma_id, f.ad as firma_ad,
      p.id as proje_id, p.ad as proje_ad, p.slug::text as proje_slug,
      p.il, p.ilce,
      o.degisiklik, o.isaretler,
      to_char(o.gonderildi, 'YYYY-MM-DD HH24:MI') as gonderildi
    from onay_kaydi o
    join firma f on f.id = o.firma_id
    join proje p on p.id = o.varlik_id
    where o.durum = 'bekliyor' and o.varlik = 'proje'
      ${firmaId ? sql`and o.firma_id = ${firmaId}` : sql``}
    order by
      array_length(o.isaretler, 1) desc nulls last,
      o.gonderildi asc
  `;
}

export type OnaySonuc = { ok: true } | { ok: false; hata: string };

/**
 * Kararı uygular.
 *
 * Onayda değişikliğin uygulanması, fiyat arşivi ve denetim günlüğü
 * TEK işlemde olur. Onay kaydını onaylandı işaretleyip değişikliği
 * ayrı yazmak, arada bir hata olduğunda kuyruğu boş ama siteyi eski
 * hâlde bırakırdı; geri dönüşü olmayan bir tutarsızlık.
 */
export async function onayUygula(
  onayId: number,
  karar: 'onayla' | 'reddet',
  kararVeren: string,
  gerekce?: string | null
): Promise<OnaySonuc> {
  if (karar === 'reddet' && !gerekce?.trim()) {
    // Gerekçesiz ret firmanın aynı hatayı tekrarlamasına yol açar.
    return { ok: false, hata: 'Ret gerekçesi zorunlu.' };
  }

  const [kayit] = await sql<
    {
      id: number; proje_id: number; slug: string; il: string; ilce: string;
      mahalle: string | null; firma_slug: string; degisiklik: DegisiklikPaketi;
      gorsel_sayisi: number;
    }[]
  >`
    select o.id, p.id as proje_id, p.slug::text as slug, p.il, p.ilce, p.mahalle,
           f.slug::text as firma_slug, o.degisiklik,
           (select count(*)::int from medya m
             where m.proje_id = p.id and m.tur = 'gorsel') as gorsel_sayisi
    from onay_kaydi o
    join proje p on p.id = o.varlik_id
    join firma f on f.id = p.firma_id
    where o.id = ${onayId} and o.durum = 'bekliyor'
  `;

  if (!kayit) return { ok: false, hata: 'Kayıt bulunamadı ya da zaten karara bağlanmış.' };

  if (karar === 'reddet') {
    await sql`
      update onay_kaydi
      set durum = 'reddedildi', gerekce = ${gerekce!.trim()},
          karar_veren = ${kararVeren}, karar_zaman = now()
      where id = ${onayId}
    `;
    return { ok: true };
  }

  const paket = kayit.degisiklik ?? {};
  const alanlar = paket.alanlar ?? {};
  const daireler = paket.daireler ?? [];

  // Beyaz liste dışındaki her alan SESSİZCE düşer. Sessiz olması doğru:
  // paket elle kurcalanmış olabilir ve hata döndürmek saldırgana hangi
  // alanların yazılabildiğini söylerdi.
  const yazilacak: Record<string, unknown> = {};
  for (const [alan, d] of Object.entries(alanlar)) {
    if (IZINLI.has(alan)) yazilacak[alan] = d.yeni ?? null;
  }
  const anahtarlar = Object.keys(yazilacak);

  await sql.begin(async (tx) => {
    if (anahtarlar.length > 0) {
      // tx(nesne, ...anahtarlar) tanımlayıcıları kaçışlar; alan adı
      // sorguya dize olarak girmez.
      await tx`
        update proje set ${tx(yazilacak, ...anahtarlar)}, guncellendi = now()
        where id = ${kayit.proje_id}
      `;
    }

    for (const d of daireler) {
      if (d.id != null) {
        const [eski] = await tx<{ liste_fiyati: number | null }[]>`
          select liste_fiyati::float8 as liste_fiyati from daire_tipi
          where id = ${d.id} and proje_id = ${kayit.proje_id}
        `;
        // Bu arada silinmişse onay onu geri getirmez.
        if (!eski) continue;

        await tx`
          update daire_tipi set
            tip = ${d.tip}, net_m2 = ${d.net_m2}, brut_m2 = ${d.brut_m2},
            liste_fiyati = ${d.liste_fiyati},
            toplam_adet = ${d.toplam_adet}, kalan_adet = ${d.kalan_adet}
          where id = ${d.id} and proje_id = ${kayit.proje_id}
        `;
        if (d.liste_fiyati != null && eski.liste_fiyati !== d.liste_fiyati) {
          await tx`
            insert into fiyat_kaydi (daire_tipi_id, fiyat, kalan_adet, kaynak, kaydeden)
            values (${d.id}, ${d.liste_fiyati}, ${d.kalan_adet}, 'panel', ${kararVeren})
          `;
        }
      } else {
        const [yeni] = await tx<{ id: number }[]>`
          insert into daire_tipi
            (proje_id, tip, net_m2, brut_m2, liste_fiyati, toplam_adet, kalan_adet)
          values (${kayit.proje_id}, ${d.tip}, ${d.net_m2}, ${d.brut_m2},
                  ${d.liste_fiyati}, ${d.toplam_adet}, ${d.kalan_adet})
          on conflict (proje_id, tip) do update set
            net_m2 = excluded.net_m2, brut_m2 = excluded.brut_m2,
            liste_fiyati = excluded.liste_fiyati,
            toplam_adet = excluded.toplam_adet, kalan_adet = excluded.kalan_adet
          returning id
        `;
        if (yeni && d.liste_fiyati != null) {
          await tx`
            insert into fiyat_kaydi (daire_tipi_id, fiyat, kalan_adet, kaynak, kaydeden)
            values (${yeni.id}, ${d.liste_fiyati}, ${d.kalan_adet}, 'panel', ${kararVeren})
          `;
        }
      }
    }

    // Skor değişen veriye göre yeniden hesaplanır; beyan edilmez.
    const [p] = await tx<
      {
        aciklama: string | null; teslim_ceyrek: string | null; santiye_yuzde: number | null;
        aidat: number | null; pesinat_orani: number | null; vade_ay: number | null;
        konum_var: boolean; fiyat_teyit_tarihi: string | null;
        daire_tipleri: { liste_fiyati: number | null; net_m2: number | null }[];
      }[]
    >`
      select p.aciklama, p.teslim_ceyrek, p.santiye_yuzde,
             p.aidat::float8 as aidat, p.pesinat_orani::float8 as pesinat_orani,
             p.vade_ay, (p.konum is not null) as konum_var,
             to_char(p.fiyat_teyit_tarihi, 'YYYY-MM-DD') as fiyat_teyit_tarihi,
             coalesce((select json_agg(json_build_object(
               'liste_fiyati', d.liste_fiyati::float8, 'net_m2', d.net_m2::float8))
               from daire_tipi d where d.proje_id = p.id), '[]') as daire_tipleri
      from proje p where p.id = ${kayit.proje_id}
    `;
    if (p) {
      await tx`
        update proje set veri_skoru = ${veriSkoru({ ...p, gorsel_sayisi: kayit.gorsel_sayisi })}
        where id = ${kayit.proje_id}
      `;
    }

    for (const [alan, d] of Object.entries(alanlar)) {
      if (!IZINLI.has(alan)) continue;
      await tx`
        insert into denetim_gunlugu (kim, islem, varlik, varlik_id, alan, eski_deger, yeni_deger)
        values (${kararVeren}, 'onay', 'proje', ${kayit.proje_id}, ${alan},
                ${d.eski == null ? null : String(d.eski)},
                ${d.yeni == null ? null : String(d.yeni)})
      `;
    }

    await tx`
      update onay_kaydi
      set durum = 'onaylandi', karar_veren = ${kararVeren}, karar_zaman = now()
      where id = ${onayId}
    `;
  });

  // Yalnızca etkilenen sayfalar. Geniş kapsamlı yenileme ISR'ı anlamsız kılar.
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

  return { ok: true };
}
