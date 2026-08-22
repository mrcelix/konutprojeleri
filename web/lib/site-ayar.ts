import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';
import { site } from './site';

/* ============================================================
   Kurum bilgileri: koda gömülü varsayılan + panelden düzenlenen satır.

   Telefon, WhatsApp, e-posta, adres, belge numaraları ve sosyal
   hesaplar yalnızca `lib/site.ts` içindeydi: numarayı değiştirmek
   dağıtım demekti. Artık tek satırlık `site_ayar` tablosu koddaki
   değerlerin ÜZERİNE yazıyor; boş bırakılan alan koddaki değeri
   kullanmaya devam ediyor.

   Okuma etiketli önbellekte: sayfaların çoğu statik üretiliyor ve
   panelden kayıt yapılınca `revalidateTag` ile tek seferde düşüyor
   (`lib/icerik.ts` ile aynı kalıp).
   ============================================================ */

export const AYAR_ETIKET = 'site-ayar';

export interface SiteBilgi {
  ad: string;
  unvan: string;
  url: string;
  slogan: string;
  aciklama: string;
  telefon: string;
  whatsapp: string;
  eposta: string;
  belge: { tursab: string; bakanlik: string; etbis: string; mersis: string };
  adres: { sokak: string; ilce: string; il: string; postaKodu: string; ulke: string };
  sosyal: string[];
}

/** Boş/whitespace değerler yok sayılıyor: yarım doldurulmuş bir satır
    koddaki sağlam varsayılanı silmemeli. */
const dolu = (x: string | null | undefined) => (x && x.trim() ? x.trim() : undefined);

async function ayariOku(): Promise<SiteBilgi> {
  const s = await prisma.siteAyar.findUnique({ where: { id: 1 } });
  return {
    ad: site.ad,
    url: site.url,
    unvan: dolu(s?.unvan) ?? site.unvan,
    slogan: dolu(s?.slogan) ?? site.slogan,
    aciklama: dolu(s?.aciklama) ?? site.aciklama,
    telefon: dolu(s?.telefon) ?? site.telefon,
    whatsapp: dolu(s?.whatsapp) ?? site.whatsapp,
    eposta: dolu(s?.eposta) ?? site.eposta,
    belge: {
      tursab: dolu(s?.tursab) ?? site.belge.tursab,
      bakanlik: dolu(s?.bakanlik) ?? site.belge.bakanlik,
      etbis: dolu(s?.etbis) ?? site.belge.etbis,
      mersis: dolu(s?.mersis) ?? site.belge.mersis,
    },
    adres: {
      sokak: dolu(s?.adresSokak) ?? site.adres.sokak,
      ilce: dolu(s?.adresIlce) ?? site.adres.ilce,
      il: dolu(s?.adresIl) ?? site.adres.il,
      postaKodu: dolu(s?.adresPosta) ?? site.adres.postaKodu,
      ulke: site.adres.ulke,
    },
    sosyal: s && s.sosyal.length ? s.sosyal : [...site.sosyal],
  };
}

const onbellekli = unstable_cache(ayariOku, ['site-ayar'], { tags: [AYAR_ETIKET] });

/** Kurum bilgileri. Veritabanı erişilemezse koddaki varsayılanlar. */
export async function siteBilgi(): Promise<SiteBilgi> {
  try {
    return await onbellekli();
  } catch (e) {
    console.error('Site ayarları okunamadı:', e);
    return ayariVarsayilan();
  }
}

/** Yalnızca koda gömülü değerler — panel formunun "varsayılan" sütunu. */
export function ayariVarsayilan(): SiteBilgi {
  return {
    ad: site.ad,
    unvan: site.unvan,
    url: site.url,
    slogan: site.slogan,
    aciklama: site.aciklama,
    telefon: site.telefon,
    whatsapp: site.whatsapp,
    eposta: site.eposta,
    belge: { ...site.belge },
    adres: { ...site.adres },
    sosyal: [...site.sosyal],
  };
}
