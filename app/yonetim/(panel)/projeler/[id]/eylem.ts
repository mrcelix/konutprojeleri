'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { panelGerekli, yonetici } from '@/lib/yetki';
import { projeEtiketleri } from '@/lib/cache-tags';
import { veriSkoru } from '@/lib/veri-skoru';
import { OZELLIKLER } from '@/lib/filtre';
import { duzenlenirProje, type DuzenlenirDaire } from '@/lib/queries/duzenleyici';

/**
 * Proje kaydetme.
 *
 * Üç şey aynı işlemde (transaction) olur ya da hiçbiri olmaz:
 * projenin kendisi, daire tipleri ve fiyat arşivi. Fiyat arşivi
 * ayrı yazılsaydı, araya giren bir hata "fiyat değişti ama geçmişi
 * yok" durumunu üretirdi — endeks o boşluğu asla telafi edemez.
 *
 * FİRMA KULLANICISI DOĞRUDAN YAZAMAZ. Değişikliği onay kuyruğuna
 * düşer. Bu kural burada, uygulamada zorlanır; RLS (0002) ikinci
 * savunma katmanıdır.
 */

export type KayitDurumu = { hata?: string; bilgi?: string } | null;

const metin = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? '').trim();
  return v === '' ? null : v;
};

const sayi = (f: FormData, k: string) => {
  const v = metin(f, k);
  if (v == null) return null;
  const n = Number(v.replace(/\s/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const evet = (f: FormData, k: string) => f.get(k) != null;

/** Formdaki indeksli daire tipi satırlarını toplar. */
function daireleriTopla(f: FormData): DuzenlenirDaire[] {
  const satirlar: DuzenlenirDaire[] = [];
  for (let i = 0; i < 40; i++) {
    if (!f.has(`dt_tip_${i}`)) continue;
    if (evet(f, `dt_sil_${i}`)) continue;
    const tip = metin(f, `dt_tip_${i}`);
    if (!tip) continue; // boş satır: kullanıcı doldurmamış
    const hamId = metin(f, `dt_id_${i}`);
    satirlar.push({
      id: hamId ? Number(hamId) : null,
      tip,
      net_m2: sayi(f, `dt_net_${i}`),
      brut_m2: sayi(f, `dt_brut_${i}`),
      liste_fiyati: sayi(f, `dt_fiyat_${i}`),
      toplam_adet: sayi(f, `dt_toplam_${i}`),
      kalan_adet: sayi(f, `dt_kalan_${i}`),
    });
  }
  return satirlar;
}

/** Değişen alanlar — hem denetim günlüğü hem onay kaydı bunu kullanır. */
function fark(
  onceki: Record<string, unknown>,
  yeni: Record<string, unknown>
): Record<string, { eski: unknown; yeni: unknown }> {
  const d: Record<string, { eski: unknown; yeni: unknown }> = {};
  for (const [k, v] of Object.entries(yeni)) {
    const e = onceki[k] ?? null;
    const y = v ?? null;
    // Sayı/metin karışmasın diye string karşılaştırma; null === null.
    if (JSON.stringify(e) !== JSON.stringify(y)) d[k] = { eski: e, yeni: y };
  }
  return d;
}

export async function projeKaydet(_onceki: KayitDurumu, f: FormData): Promise<KayitDurumu> {
  const k = await panelGerekli();
  const admin = yonetici(k);
  const id = Number(f.get('id'));
  if (!Number.isFinite(id)) return { hata: 'Geçersiz proje.' };

  const mevcut = await duzenlenirProje(id);
  if (!mevcut) return { hata: 'Proje bulunamadı.' };

  // Firma kullanıcısı yalnızca kendi projesine dokunabilir. Bu kontrol
  // atlanırsa id'yi elle değiştiren bir firma başkasının projesini
  // düzenler — form gizlemek yeterli değildir.
  if (!admin && mevcut.firma_id !== k.firma_id) {
    return { hata: 'Bu proje sizin firmanıza ait değil.' };
  }

  const ozellikler: Record<string, boolean> = {};
  for (const anahtar of Object.keys(OZELLIKLER)) {
    if (evet(f, `oz_${anahtar}`)) ozellikler[anahtar] = true;
  }

  const alanlar = {
    ad: metin(f, 'ad'),
    slug: metin(f, 'slug'),
    il: metin(f, 'il'),
    ilce: metin(f, 'ilce'),
    mahalle: metin(f, 'mahalle'),
    tip: metin(f, 'tip'),
    durum: metin(f, 'durum'),
    teslim_ceyrek: metin(f, 'teslim_ceyrek'),
    toplam_konut: sayi(f, 'toplam_konut'),
    ticari_birim: sayi(f, 'ticari_birim'),
    blok_sayisi: sayi(f, 'blok_sayisi'),
    kat_sayisi: sayi(f, 'kat_sayisi'),
    tavan_yuksekligi: sayi(f, 'tavan_yuksekligi'),
    aidat: sayi(f, 'aidat'),
    pesinat_orani: sayi(f, 'pesinat_orani'),
    vade_ay: sayi(f, 'vade_ay'),
    faizsiz: evet(f, 'faizsiz'),
    santiye_yuzde: sayi(f, 'santiye_yuzde'),
    aciklama: metin(f, 'aciklama'),
    fiyat_teyit_tarihi: metin(f, 'fiyat_teyit_tarihi'),
    lat: sayi(f, 'lat'),
    lng: sayi(f, 'lng'),
    ozellikler,
    // Yayına alma yetkisi YALNIZCA yönetimde. Firma formu bu alanı
    // göndermez; gönderse bile burada yok sayılır.
    yayinda: admin ? evet(f, 'yayinda') : mevcut.yayinda,
  };

  if (!alanlar.ad || !alanlar.slug || !alanlar.il || !alanlar.ilce) {
    return { hata: 'Ad, slug, il ve ilçe zorunlu.' };
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(alanlar.slug)) {
    return { hata: 'Slug yalnızca küçük harf, rakam ve tire içerebilir.' };
  }
  if (alanlar.teslim_ceyrek && !/^\d{4}Q[1-4]$/.test(alanlar.teslim_ceyrek)) {
    return { hata: 'Teslim çeyreği 2027Q2 biçiminde olmalı.' };
  }
  if (alanlar.santiye_yuzde != null && (alanlar.santiye_yuzde < 0 || alanlar.santiye_yuzde > 100)) {
    return { hata: 'Şantiye ilerlemesi 0–100 arasında olmalı.' };
  }
  if ((alanlar.lat == null) !== (alanlar.lng == null)) {
    return { hata: 'Koordinat için enlem ve boylamın ikisi de gerekli.' };
  }

  const daireler = daireleriTopla(f);
  const tipler = daireler.map((d) => d.tip);
  if (new Set(tipler).size !== tipler.length) {
    return { hata: 'Aynı daire tipi birden fazla kez girilmiş.' };
  }

  const oncekiAlanlar = {
    ad: mevcut.ad, slug: mevcut.slug, il: mevcut.il, ilce: mevcut.ilce,
    mahalle: mevcut.mahalle, tip: mevcut.tip, durum: mevcut.durum,
    teslim_ceyrek: mevcut.teslim_ceyrek, toplam_konut: mevcut.toplam_konut,
    ticari_birim: mevcut.ticari_birim, blok_sayisi: mevcut.blok_sayisi,
    kat_sayisi: mevcut.kat_sayisi, tavan_yuksekligi: mevcut.tavan_yuksekligi,
    aidat: mevcut.aidat, pesinat_orani: mevcut.pesinat_orani,
    vade_ay: mevcut.vade_ay, faizsiz: mevcut.faizsiz ?? false,
    santiye_yuzde: mevcut.santiye_yuzde, aciklama: mevcut.aciklama,
    fiyat_teyit_tarihi: mevcut.fiyat_teyit_tarihi,
    lat: mevcut.lat, lng: mevcut.lng,
    ozellikler: mevcut.ozellikler ?? {},
    yayinda: mevcut.yayinda,
  };

  const degisiklik = fark(oncekiAlanlar, alanlar);

  // Daire tipi değişiklikleri ayrı toplanır: fiyat arşivi onlara bağlı.
  const eskiDaire = new Map(mevcut.daire_tipleri.map((d) => [d.id, d]));
  const silinen = mevcut.daire_tipleri
    .filter((e) => e.id != null && !daireler.some((y) => y.id === e.id))
    .map((e) => e.id!);

  const skor = veriSkoru({
    ...alanlar,
    konum_var: alanlar.lat != null,
    gorsel_sayisi: mevcut.gorsel_sayisi,
    daire_tipleri: daireler,
    ozellik_sayisi: Object.keys(ozellikler).length,
  });

  // ── Firma kullanıcısı: onay kuyruğu ──
  if (!admin) {
    if (Object.keys(degisiklik).length === 0 && daireler.length === 0) {
      return { bilgi: 'Değişiklik yok.' };
    }
    const isaretler: string[] = [];
    if ('durum' in degisiklik) isaretler.push('durum_degisti');
    for (const d of daireler) {
      const e = d.id != null ? eskiDaire.get(d.id) : null;
      if (e?.liste_fiyati && d.liste_fiyati) {
        const oran = Math.abs(d.liste_fiyati - e.liste_fiyati) / e.liste_fiyati;
        if (oran > 0.2) isaretler.push('fiyat_sicramasi');
      }
      if (e?.kalan_adet != null && d.kalan_adet != null && d.kalan_adet > e.kalan_adet) {
        isaretler.push('stok_artisi');
      }
    }

    await sql`
      insert into onay_kaydi (firma_id, varlik, varlik_id, degisiklik, isaretler)
      values (${mevcut.firma_id}, 'proje', ${id},
              ${sql.json(JSON.parse(JSON.stringify({ alanlar: degisiklik, daireler })))}::jsonb,
              ${[...new Set(isaretler)]})
    `;
    return {
      bilgi:
        'Değişiklik onay kuyruğuna gönderildi. Onaylanana kadar sitede eski ' +
        'değerler görünmeye devam eder.',
    };
  }

  // ── Yönetim: doğrudan yaz ──
  await sql.begin(async (tx) => {
    await tx`
      update proje set
        ad = ${alanlar.ad}, slug = ${alanlar.slug},
        il = ${alanlar.il}, ilce = ${alanlar.ilce}, mahalle = ${alanlar.mahalle},
        tip = ${alanlar.tip}, durum = ${alanlar.durum},
        teslim_ceyrek = ${alanlar.teslim_ceyrek},
        toplam_konut = ${alanlar.toplam_konut}, ticari_birim = ${alanlar.ticari_birim},
        blok_sayisi = ${alanlar.blok_sayisi}, kat_sayisi = ${alanlar.kat_sayisi},
        tavan_yuksekligi = ${alanlar.tavan_yuksekligi},
        aidat = ${alanlar.aidat}, pesinat_orani = ${alanlar.pesinat_orani},
        vade_ay = ${alanlar.vade_ay}, faizsiz = ${alanlar.faizsiz},
        santiye_yuzde = ${alanlar.santiye_yuzde},
        ozellikler = ${tx.json(ozellikler)}::jsonb,
        aciklama = ${alanlar.aciklama},
        fiyat_teyit_tarihi = ${alanlar.fiyat_teyit_tarihi}::date,
        konum = ${
          alanlar.lat != null && alanlar.lng != null
            ? tx`st_setsrid(st_makepoint(${alanlar.lng}, ${alanlar.lat}), 4326)::geography`
            : tx`null`
        },
        yayinda = ${alanlar.yayinda},
        veri_skoru = ${skor},
        guncellendi = now()
      where id = ${id}
    `;

    if (silinen.length > 0) {
      // Fiyat arşivi daire tipine bağlı; silme kaydı arşivi düşürmez
      // çünkü fiyat_kaydi.daire_tipi_id kısıtı RESTRICT değil ama
      // arşivin korunması için önce bağ kesilmez — tip gerçekten
      // yanlış girildiyse silinir, aksi halde adı düzeltilir.
      await tx`delete from daire_tipi where id = any(${silinen}) and proje_id = ${id}`;
    }

    for (const d of daireler) {
      if (d.id != null) {
        const eski = eskiDaire.get(d.id);
        await tx`
          update daire_tipi set
            tip = ${d.tip}, net_m2 = ${d.net_m2}, brut_m2 = ${d.brut_m2},
            liste_fiyati = ${d.liste_fiyati},
            toplam_adet = ${d.toplam_adet}, kalan_adet = ${d.kalan_adet}
          where id = ${d.id} and proje_id = ${id}
        `;
        // Fiyat değiştiyse arşive yeni satır. Güncelleme DEĞİL ekleme:
        // tablo salt-ekleme, geçmiş yeniden yazılamaz.
        if (d.liste_fiyati != null && eski?.liste_fiyati !== d.liste_fiyati) {
          await tx`
            insert into fiyat_kaydi (daire_tipi_id, fiyat, kalan_adet, kaynak, kaydeden)
            values (${d.id}, ${d.liste_fiyati}, ${d.kalan_adet}, 'yonetim', ${k.eposta})
          `;
        }
      } else {
        const [yeni] = await tx<{ id: number }[]>`
          insert into daire_tipi
            (proje_id, tip, net_m2, brut_m2, liste_fiyati, toplam_adet, kalan_adet)
          values (${id}, ${d.tip}, ${d.net_m2}, ${d.brut_m2},
                  ${d.liste_fiyati}, ${d.toplam_adet}, ${d.kalan_adet})
          returning id
        `;
        if (yeni && d.liste_fiyati != null) {
          await tx`
            insert into fiyat_kaydi (daire_tipi_id, fiyat, kalan_adet, kaynak, kaydeden)
            values (${yeni.id}, ${d.liste_fiyati}, ${d.kalan_adet}, 'yonetim', ${k.eposta})
          `;
        }
      }
    }

    for (const [alan, { eski, yeni }] of Object.entries(degisiklik)) {
      await tx`
        insert into denetim_gunlugu (kim, islem, varlik, varlik_id, alan, eski_deger, yeni_deger)
        values (${k.eposta}, 'guncelleme', 'proje', ${id}, ${alan},
                ${eski == null ? null : String(typeof eski === 'object' ? JSON.stringify(eski) : eski)},
                ${yeni == null ? null : String(typeof yeni === 'object' ? JSON.stringify(yeni) : yeni)})
      `;
    }
  });

  // Yalnızca etkilenen sayfalar. Geniş kapsamlı yenileme ISR'ı anlamsız kılar.
  for (const etiket of projeEtiketleri({
    id,
    slug: alanlar.slug,
    il: alanlar.il,
    ilce: alanlar.ilce,
    mahalle: alanlar.mahalle,
    firmaSlug: mevcut.firma_slug,
  })) {
    revalidateTag(etiket);
  }
  // Slug değiştiyse eski adresin etiketi de temizlenmeli.
  if (mevcut.slug !== alanlar.slug) revalidateTag(`proje-slug-${mevcut.slug}`);

  redirect(`/yonetim/projeler/${id}?kaydedildi=1`);
}
