'use server';

import { revalidateTag } from 'next/cache';
import { sql } from '@/lib/db';
import { panelGerekli, yonetici } from '@/lib/yetki';
import { projeEtiketleri } from '@/lib/cache-tags';
import {
  r2Hazir, yuklemeAdresi, medyaAnahtari, medyaSil, uzantiCoz,
  GORSEL_TIPLERI, AZAMI_BOYUT,
} from '@/lib/r2';

/**
 * Medya yönetimi.
 *
 * Yükleme iki adımlı: önce sunucudan imzalı adres alınır, dosya
 * doğrudan R2'ye gider, sonra veritabanına kayıt düşer. Kayıt ancak
 * yükleme başarılıysa yazılır — aksi halde veritabanında var olup
 * R2'de olmayan hayalet satırlar birikirdi.
 *
 * Ters yönde bir risk kalıyor: yükleme başarılı olup ikinci adım
 * başarısız olursa R2'de sahipsiz dosya kalır. Bu kabul edilebilir —
 * sahipsiz dosya yalnızca yer kaplar, kırık görsel üretmez. Tersi
 * (kayıt var, dosya yok) her ziyaretçiye kırık görsel gösterirdi.
 */

export type MedyaDurumu = {
  hata?: string;
  bilgi?: string;
  adres?: string;
  anahtar?: string;
} | null;

/** Kullanıcının bu projeye dokunma yetkisi var mı? */
async function projeErisimi(projeId: number) {
  const k = await panelGerekli();
  const [p] = await sql<{ id: number; firma_id: number; slug: string; il: string;
    ilce: string; mahalle: string | null; firma_slug: string }[]>`
    select p.id, p.firma_id, p.slug::text as slug, p.il, p.ilce, p.mahalle,
           f.slug::text as firma_slug
    from proje p join firma f on f.id = p.firma_id
    where p.id = ${projeId}
  `;
  if (!p) return { hata: 'Proje bulunamadı.' as const };
  if (!yonetici(k) && p.firma_id !== k.firma_id) {
    return { hata: 'Bu proje sizin firmanıza ait değil.' as const };
  }
  return { k, p };
}

/**
 * Adım 1 — imzalı yükleme adresi.
 *
 * Boyut ve tip BURADA doğrulanır. İstemciye güvenilemez: imzalı adres
 * bir kez verildiğinde tarayıcı ne gönderirse R2 kabul eder, o yüzden
 * imzayı vermeden önce kontrol etmek tek şans.
 */
export async function yuklemeIzni(_onceki: MedyaDurumu, f: FormData): Promise<MedyaDurumu> {
  const projeId = Number(f.get('projeId'));
  const icerikTipi = String(f.get('tip') ?? '');
  const boyut = Number(f.get('boyut'));

  if (!Number.isFinite(projeId)) return { hata: 'Geçersiz proje.' };

  const e = await projeErisimi(projeId);
  if ('hata' in e) return { hata: e.hata };

  if (!r2Hazir()) {
    return {
      hata:
        'Medya deposu yapılandırılmamış. R2_ACCOUNT_ID, R2_ACCESS_KEY_ID ve ' +
        'R2_SECRET_ACCESS_KEY ortam değişkenleri tanımlanmalı.',
    };
  }
  if (!GORSEL_TIPLERI.has(icerikTipi)) {
    return { hata: 'Yalnızca JPEG, PNG, WebP ve AVIF yüklenebilir.' };
  }
  if (!Number.isFinite(boyut) || boyut <= 0 || boyut > AZAMI_BOYUT) {
    return { hata: `Dosya 25 MB'ı aşamaz. Yüklemeden önce küçültün.` };
  }

  const uzanti = uzantiCoz(icerikTipi)!;
  const anahtar = medyaAnahtari(projeId, 'gorsel', uzanti);

  try {
    const adres = await yuklemeAdresi(anahtar, icerikTipi, boyut);
    return { adres, anahtar };
  } catch (hata) {
    return { hata: `İmzalı adres alınamadı: ${(hata as Error).message}` };
  }
}

/** Adım 2 — yükleme bittikten sonra kaydı yaz. */
export async function medyaKaydet(_onceki: MedyaDurumu, f: FormData): Promise<MedyaDurumu> {
  const projeId = Number(f.get('projeId'));
  const anahtar = String(f.get('anahtar') ?? '');
  const alt = String(f.get('alt') ?? '').trim();

  if (!Number.isFinite(projeId)) return { hata: 'Geçersiz proje.' };
  // Anahtar sunucuda üretildi ama forma girip değiştirilebilir;
  // proje klasörü dışına yazan bir kayıt kabul edilmemeli.
  if (!anahtar.startsWith(`projeler/${projeId}/gorsel/`)) {
    return { hata: 'Geçersiz dosya anahtarı.' };
  }

  const e = await projeErisimi(projeId);
  if ('hata' in e) return { hata: e.hata };
  const { k, p } = e;

  await sql.begin(async (tx) => {
    const [son] = await tx<{ sira: number }[]>`
      select coalesce(max(sira), -1) + 1 as sira from medya
      where proje_id = ${projeId} and tur = 'gorsel'
    `;
    await tx`
      insert into medya (proje_id, tur, key, alt, sira, varyant_hazir)
      values (${projeId}, 'gorsel', ${anahtar}, ${alt || null},
              ${son?.sira ?? 0}, ${!!alt})
    `;
    await tx`
      insert into denetim_gunlugu (kim, islem, varlik, varlik_id, alan, yeni_deger)
      values (${k.eposta}, 'medya_ekleme', 'proje', ${projeId}, 'gorsel', ${anahtar})
    `;
  });

  for (const etiket of projeEtiketleri({ ...p, firmaSlug: p.firma_slug })) {
    revalidateTag(etiket);
  }
  return { bilgi: 'Görsel yüklendi.' };
}

/**
 * Alt metin ve sıra.
 *
 * ALT METİN OLMADAN YAYINLANMAZ: varyant_hazir alt metne bağlı.
 * Görme engelli kullanıcı için zorunlu, arama motoru için değerli ve
 * ikisi de sonradan eklenmiyor — o yüzden kural şemada.
 */
export async function medyaGuncelle(_onceki: MedyaDurumu, f: FormData): Promise<MedyaDurumu> {
  const medyaId = Number(f.get('medyaId'));
  const projeId = Number(f.get('projeId'));
  const alt = String(f.get('alt') ?? '').trim();
  const sira = Number(f.get('sira'));

  if (!Number.isFinite(medyaId) || !Number.isFinite(projeId)) {
    return { hata: 'Geçersiz kayıt.' };
  }
  const e = await projeErisimi(projeId);
  if ('hata' in e) return { hata: e.hata };
  const { p } = e;

  await sql`
    update medya set
      alt = ${alt || null},
      sira = ${Number.isFinite(sira) ? sira : 0},
      varyant_hazir = ${!!alt}
    where id = ${medyaId} and proje_id = ${projeId}
  `;

  for (const etiket of projeEtiketleri({ ...p, firmaSlug: p.firma_slug })) {
    revalidateTag(etiket);
  }
  return { bilgi: 'Kaydedildi.' };
}

/**
 * Silme.
 *
 * Önce veritabanı kaydı, sonra R2 dosyası. Ters sırada yapılıp R2
 * silme başarısız olsaydı kayıt var ama dosya yok durumu doğar ve
 * her ziyaretçi kırık görsel görürdü. Bu sırada en kötü ihtimalle
 * R2'de sahipsiz dosya kalır — kimseyi rahatsız etmez.
 */
export async function medyaKaldir(_onceki: MedyaDurumu, f: FormData): Promise<MedyaDurumu> {
  const medyaId = Number(f.get('medyaId'));
  const projeId = Number(f.get('projeId'));
  if (!Number.isFinite(medyaId) || !Number.isFinite(projeId)) {
    return { hata: 'Geçersiz kayıt.' };
  }

  const e = await projeErisimi(projeId);
  if ('hata' in e) return { hata: e.hata };
  const { k, p } = e;

  const [kayit] = await sql<{ key: string }[]>`
    select key from medya where id = ${medyaId} and proje_id = ${projeId}
  `;
  if (!kayit) return { hata: 'Görsel bulunamadı.' };

  await sql.begin(async (tx) => {
    await tx`delete from medya where id = ${medyaId} and proje_id = ${projeId}`;
    await tx`
      insert into denetim_gunlugu (kim, islem, varlik, varlik_id, alan, eski_deger)
      values (${k.eposta}, 'medya_silme', 'proje', ${projeId}, 'gorsel', ${kayit.key})
    `;
  });

  // R2 silme başarısız olursa kayıt yine de gitti; sahipsiz dosya
  // kalır ama site tutarlı kalır.
  try {
    await medyaSil(kayit.key);
  } catch {
    // sessiz: denetim günlüğünde silme kaydı zaten var
  }

  for (const etiket of projeEtiketleri({ ...p, firmaSlug: p.firma_slug })) {
    revalidateTag(etiket);
  }
  return { bilgi: 'Görsel silindi.' };
}
