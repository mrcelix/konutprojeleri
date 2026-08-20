import { sql } from '@/lib/db';

/**
 * Proje düzenleyici · veri erişimi.
 *
 * Düzenleyici tek bir kaydı okur ve yazar; burada tek sorgu takıntısı
 * yok — asıl mesele YAZMANIN DOĞRU OLMASI. Üç kural:
 *
 *  1. Fiyat değişikliği fiyat_kaydi'na düşer. O tablo salt-eklemedir;
 *     endeks ve "fiyat geçmişi" grafiği ona dayanır. Kaydı atlamak,
 *     geçmişi sessizce silmek demektir.
 *  2. Her alan değişikliği denetim günlüğüne yazılır. "Bu fiyatı kim
 *     ne zaman değiştirdi" sorusunun cevabı başka yerde yok.
 *  3. Firma kullanıcısı doğrudan yazamaz; değişikliği onay kuyruğuna
 *     düşer. Bu kural uygulamada zorlanır (RLS ikinci katman).
 */

export type DuzenlenirDaire = {
  id: number | null;
  tip: string;
  net_m2: number | null;
  brut_m2: number | null;
  liste_fiyati: number | null;
  toplam_adet: number | null;
  kalan_adet: number | null;
};

export type DuzenlenirProje = {
  id: number;
  slug: string;
  ad: string;
  firma_id: number;
  firma_ad: string;
  firma_slug: string;
  il: string;
  ilce: string;
  mahalle: string | null;
  tip: string;
  durum: string;
  yayinda: boolean;
  teslim_ceyrek: string | null;
  toplam_konut: number | null;
  ticari_birim: number | null;
  blok_sayisi: number | null;
  kat_sayisi: number | null;
  tavan_yuksekligi: number | null;
  aidat: number | null;
  pesinat_orani: number | null;
  vade_ay: number | null;
  faizsiz: boolean | null;
  santiye_yuzde: number | null;
  ozellikler: Record<string, boolean>;
  aciklama: string | null;
  fiyat_teyit_tarihi: string | null;
  lat: number | null;
  lng: number | null;
  veri_skoru: number;
  gorsel_sayisi: number;
  daire_tipleri: DuzenlenirDaire[];
  medya: { id: number; key: string; alt: string | null; sira: number; varyant_hazir: boolean }[];
};

export async function duzenlenirProje(id: number): Promise<DuzenlenirProje | null> {
  const [p] = await sql<DuzenlenirProje[]>`
    select
      p.id, p.slug::text as slug, p.ad, p.firma_id, f.ad as firma_ad, f.slug::text as firma_slug,
      p.il, p.ilce, p.mahalle, p.tip, p.durum, p.yayinda, p.teslim_ceyrek,
      p.toplam_konut, p.ticari_birim, p.blok_sayisi, p.kat_sayisi,
      p.tavan_yuksekligi::float8 as tavan_yuksekligi,
      p.aidat::float8          as aidat,
      p.pesinat_orani::float8  as pesinat_orani,
      p.vade_ay, p.faizsiz, p.santiye_yuzde, p.ozellikler, p.aciklama,
      to_char(p.fiyat_teyit_tarihi, 'YYYY-MM-DD') as fiyat_teyit_tarihi,
      st_y(p.konum::geometry)::float8 as lat,
      st_x(p.konum::geometry)::float8 as lng,
      p.veri_skoru,
      (select count(*)::int from medya m
        where m.proje_id = p.id and m.tur = 'gorsel') as gorsel_sayisi,
      coalesce((
        select json_agg(json_build_object(
          'id', d.id, 'tip', d.tip,
          'net_m2', d.net_m2::float8, 'brut_m2', d.brut_m2::float8,
          'liste_fiyati', d.liste_fiyati::float8,
          'toplam_adet', d.toplam_adet, 'kalan_adet', d.kalan_adet
        ) order by d.net_m2 nulls last, d.tip)
        from daire_tipi d where d.proje_id = p.id
      ), '[]') as daire_tipleri,
      coalesce((
        select json_agg(json_build_object(
          'id', m.id, 'key', m.key, 'alt', m.alt,
          'sira', m.sira, 'varyant_hazir', m.varyant_hazir
        ) order by m.sira, m.id)
        from medya m where m.proje_id = p.id and m.tur = 'gorsel'
      ), '[]') as medya
    from proje p
    join firma f on f.id = p.firma_id
    where p.id = ${id}
  `;
  return p ?? null;
}

export async function firmaSecenekleri() {
  return sql<{ id: number; ad: string }[]>`
    select id, ad from firma order by ad
  `;
}

/** Projede yapılan son işlemler — düzenleyicinin yan sütununda. */
export async function sonIslemler(projeId: number) {
  return sql<
    { kim: string; islem: string; alan: string | null; eski_deger: string | null;
      yeni_deger: string | null; zaman: string }[]
  >`
    select kim, islem, alan, eski_deger, yeni_deger,
           to_char(zaman, 'YYYY-MM-DD HH24:MI') as zaman
    from denetim_gunlugu
    where varlik = 'proje' and varlik_id = ${projeId}
    order by zaman desc
    limit 12
  `;
}

/**
 * Kaydetmeden önce dikkat çekilecek durumlar.
 *
 * Engel DEĞİL uyarı: %30 fiyat artışı gerçek olabilir. Ama sessizce
 * geçmesi de olmaz — hem kaydeden hem sonradan bakan görmeli.
 */
export type Uyari = { agir: boolean; metin: string };

export function kaydetmeUyarilari(
  onceki: DuzenlenirProje,
  yeniDaire: DuzenlenirDaire[],
  yayindaOluyor: boolean
): Uyari[] {
  const u: Uyari[] = [];
  const eskiDizin = new Map(onceki.daire_tipleri.map((d) => [d.id, d]));

  for (const d of yeniDaire) {
    const eski = d.id != null ? eskiDizin.get(d.id) : null;
    if (!eski) continue;

    if (eski.liste_fiyati != null && d.liste_fiyati != null && eski.liste_fiyati > 0) {
      const oran = (d.liste_fiyati - eski.liste_fiyati) / eski.liste_fiyati;
      if (Math.abs(oran) > 0.2) {
        u.push({
          agir: true,
          metin: `${d.tip} fiyatı %${Math.round(Math.abs(oran) * 100)} ${
            oran > 0 ? 'arttı' : 'düştü'
          }. Fiyat arşivine kalıcı olarak yazılacak.`,
        });
      }
    }

    // Stok ARTIŞI olağan dışı: satılan daire geri gelmez. Yeni etap
    // açıldıysa doğrudur ama sorulmadan geçmemeli.
    if (eski.kalan_adet != null && d.kalan_adet != null && d.kalan_adet > eski.kalan_adet) {
      u.push({
        agir: false,
        metin: `${d.tip} kalan adedi ${eski.kalan_adet} → ${d.kalan_adet} arttı. Yeni etap mı açıldı?`,
      });
    }
  }

  if (yayindaOluyor) {
    if (onceki.gorsel_sayisi === 0) {
      u.push({ agir: true, metin: 'Görsel yok. Görselsiz proje listede en alta düşer.' });
    }
    if (onceki.lat == null) {
      u.push({ agir: false, metin: 'Koordinat girilmemiş; proje haritada görünmez.' });
    }
    if (!yeniDaire.some((d) => d.liste_fiyati != null)) {
      u.push({ agir: true, metin: 'Hiçbir daire tipinde fiyat yok.' });
    }
  }

  return u;
}
