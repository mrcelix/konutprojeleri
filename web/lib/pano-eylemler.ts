'use server';

import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { aktifKullanici } from './auth';
import { KIMLIK_CEREZ, panoKodu } from './pano';

/* ============================================================
   Karşılaştırma panosu — yazma eylemleri.

   Hepsi GİRİŞ GEREKTİRMİYOR: pano bir bağlantı arkasında paylaşılıyor
   ve davet edilen kişiyi kayıt ekranıyla karşılamak özelliğin tek
   amacını baltalardı. Ayırt etme çerezdeki anonim kimlikle: kişisel
   veri değil, "aynı tarayıcı" demek.

   Sınırlar bilinçli olarak dar: pano başına 40 proje, not 400
   karakter, ad 40 karakter. Herkese açık yazma uçlarında sınırsız
   alan, ilk günden çöp yığını demek.
   ============================================================ */

const EN_COK_OGE = 40;
const NOT_SINIR = 400;
const AD_SINIR = 40;

export interface PanoSonuc { tamam?: boolean; hata?: string; kod?: string }

/** Çerezdeki anonim kimliği okur, yoksa üretip yazar. */
async function kimlikAlVeYaz(): Promise<string> {
  const c = await cookies();
  const mevcut = c.get(KIMLIK_CEREZ)?.value;
  if (mevcut) return mevcut;

  const yeni = randomBytes(16).toString('base64url');
  c.set(KIMLIK_CEREZ, yeni, {
    httpOnly: true, sameSite: 'lax', path: '/',
    secure: process.env.NODE_ENV === 'production',
    // Bir yıl: tatil planı haftalara yayılıyor, oturum çerezi yetmezdi.
    maxAge: 60 * 60 * 24 * 365,
  });
  return yeni;
}

const kirp = (x: unknown, sinir: number) => String(x ?? '').trim().slice(0, sinir);

/** Bütçe alanı — boş, bozuk ya da negatifse null ("belirtilmedi"). */
function butce(x: FormDataEntryValue | null): number | null {
  const s = String(x ?? '').replace(/[^\d]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Yeni pano açar ve verilen projeleri ekler. */
export async function panoOlustur(form: FormData): Promise<PanoSonuc> {
  const kimlik = await kimlikAlVeYaz();
  const kullanici = await aktifKullanici().catch(() => null);

  const ad = kirp(form.get('ad'), 60) || 'Proje panom';
  const slugler = String(form.get('projeler') ?? '')
    .split(',').map((x) => x.trim()).filter(Boolean).slice(0, EN_COK_OGE);

  const butceMin = butce(form.get('butceMin'));
  const butceMax = butce(form.get('butceMax'));

  const projeler = slugler.length
    ? await prisma.proje.findMany({
      where: { slug: { in: slugler }, yayinda: true },
      select: { id: true, slug: true },
    })
    : [];

  /* Kod ÇAKIŞABİLİR (kısa alfabe): üç deneme yeterli, sonrasında
     hata döndürmek sessizce uzun kod üretmekten dürüst. */
  let kod = '';
  for (let i = 0; i < 3 && !kod; i++) {
    const aday = panoKodu();
    const varOlan = await prisma.pano.findUnique({ where: { kod: aday }, select: { id: true } });
    if (!varOlan) kod = aday;
  }
  if (!kod) return { hata: 'Pano kodu üretilemedi, tekrar deneyin.' };

  await prisma.pano.create({
    data: {
      kod, ad, sahipKimlik: kimlik, sahipId: kullanici?.id ?? null,
      butceMin, butceMax,
      ogeler: {
        create: projeler.map((v, i) => ({ projeId: v.id, sira: i })),
      },
    },
  });

  return { tamam: true, kod };
}

/** Var olan panoya proje ekler. */
export async function panoyaEkle(kod: string, projeSlug: string, ekleyen?: string): Promise<PanoSonuc> {
  await kimlikAlVeYaz();

  const [pano, proje] = await Promise.all([
    prisma.pano.findUnique({ where: { kod }, select: { id: true, _count: { select: { ogeler: true } } } }),
    prisma.proje.findUnique({ where: { slug: projeSlug }, select: { id: true, yayinda: true } }),
  ]);
  if (!pano) return { hata: 'Pano bulunamadı.' };
  if (!proje || !proje.yayinda) return { hata: 'Proje bulunamadı.' };
  /* TÜKENMİŞ PROJE ENGELLENMİYOR: pano bir karşılaştırma aracı ve
     "bunu kaçırdık" da grup için bilgi. Kart `alinamaz` rozetiyle
     basılıyor (bkz. `lib/pano.ts`) — eklemeyi reddetmek, kişinin
     neden ekleyemediğini anlamadığı bir hata mesajı üretirdi. */
  if (pano._count.ogeler >= EN_COK_OGE) return { hata: `Bir panoya en çok ${EN_COK_OGE} proje eklenebiliyor.` };

  await prisma.panoOge.upsert({
    where: { panoId_projeId: { panoId: pano.id, projeId: proje.id } },
    create: {
      panoId: pano.id, projeId: proje.id, sira: pano._count.ogeler,
      ekleyen: ekleyen ? kirp(ekleyen, AD_SINIR) : null,
    },
    update: {},
  });

  revalidatePath(`/pano/${kod}`);
  return { tamam: true, kod };
}

/** Projeyi panodan çıkarır — yalnızca panoyu kuran. */
export async function panodanCikar(kod: string, ogeId: string): Promise<PanoSonuc> {
  const kimlik = await kimlikAlVeYaz();
  const pano = await prisma.pano.findUnique({ where: { kod }, select: { id: true, sahipKimlik: true } });
  if (!pano) return { hata: 'Pano bulunamadı.' };
  if (pano.sahipKimlik !== kimlik) return { hata: 'Bu panoyu yalnızca kuran kişi düzenleyebiliyor.' };

  await prisma.panoOge.deleteMany({ where: { id: ogeId, panoId: pano.id } });
  revalidatePath(`/pano/${kod}`);
  return { tamam: true };
}

/** Oy verir; aynı yöne ikinci kez basmak oyu geri alıyor. */
export async function panoOyVer(kod: string, ogeId: string, yon: number): Promise<PanoSonuc> {
  const kimlik = await kimlikAlVeYaz();
  const temiz = yon > 0 ? 1 : -1;

  const oge = await prisma.panoOge.findFirst({
    where: { id: ogeId, pano: { kod } },
    select: { id: true },
  });
  if (!oge) return { hata: 'Proje panoda bulunamadı.' };

  const mevcut = await prisma.panoOy.findUnique({
    where: { ogeId_kimlik: { ogeId: oge.id, kimlik } },
    select: { id: true, yon: true },
  });

  if (mevcut && mevcut.yon === temiz) {
    /* Aynı yöne ikinci basış: oyu geri al. Ayrı bir "kaldır" düğmesi
       koymak, oy satırını üç düğmeye çıkarırdı. */
    await prisma.panoOy.delete({ where: { id: mevcut.id } });
  } else {
    await prisma.panoOy.upsert({
      where: { ogeId_kimlik: { ogeId: oge.id, kimlik } },
      create: { ogeId: oge.id, kimlik, yon: temiz },
      update: { yon: temiz },
    });
  }

  revalidatePath(`/pano/${kod}`);
  return { tamam: true };
}

/** Panoya ya da tek projeye not bırakır. */
export async function panoNotYaz(form: FormData): Promise<PanoSonuc> {
  await kimlikAlVeYaz();

  const kod = kirp(form.get('kod'), 20);
  const ogeId = kirp(form.get('ogeId'), 40) || null;
  const ad = kirp(form.get('ad'), AD_SINIR) || 'Ziyaretçi';
  const metin = kirp(form.get('metin'), NOT_SINIR);

  if (metin.length < 2) return { hata: 'Not boş olamaz.' };

  const pano = await prisma.pano.findUnique({ where: { kod }, select: { id: true } });
  if (!pano) return { hata: 'Pano bulunamadı.' };

  if (ogeId) {
    const oge = await prisma.panoOge.findFirst({
      where: { id: ogeId, panoId: pano.id }, select: { id: true },
    });
    if (!oge) return { hata: 'Proje panoda bulunamadı.' };
  }

  await prisma.panoYorum.create({
    data: { panoId: pano.id, ogeId, ad, metin },
  });

  revalidatePath(`/pano/${kod}`);
  return { tamam: true };
}

/** Panonun tarih ve kişi bağlamını günceller — yalnızca kuran. */
export async function panoBaglamKaydet(form: FormData): Promise<PanoSonuc> {
  const kimlik = await kimlikAlVeYaz();
  const kod = kirp(form.get('kod'), 20);

  const pano = await prisma.pano.findUnique({ where: { kod }, select: { id: true, sahipKimlik: true } });
  if (!pano) return { hata: 'Pano bulunamadı.' };
  if (pano.sahipKimlik !== kimlik) return { hata: 'Bu panoyu yalnızca kuran kişi düzenleyebiliyor.' };

  const ad = kirp(form.get('ad'), 60);
  const butceMin = butce(form.get('butceMin'));
  const butceMax = butce(form.get('butceMax'));

  if (butceMin !== null && butceMax !== null && butceMax < butceMin) {
    return { hata: 'Bütçe üst sınırı alt sınırdan küçük olamaz.' };
  }

  await prisma.pano.update({
    where: { id: pano.id },
    data: {
      ...(ad ? { ad } : {}),
      butceMin, butceMax,
    },
  });

  revalidatePath(`/pano/${kod}`);
  return { tamam: true };
}

/** Bu tarayıcının panoları — "Panoya ekle" menüsü için. */
export async function panolarimOzet(): Promise<{ kod: string; ad: string; adet: number }[]> {
  const c = await cookies();
  const kimlik = c.get(KIMLIK_CEREZ)?.value;
  if (!kimlik) return [];
  const liste = await prisma.pano.findMany({
    where: { sahipKimlik: kimlik },
    orderBy: { guncelleme: 'desc' },
    take: 10,
    select: { kod: true, ad: true, _count: { select: { ogeler: true } } },
  });
  return liste.map((p) => ({ kod: p.kod, ad: p.ad, adet: p._count.ogeler }));
}

/** Projeyi yeni bir panoya koyar; pano adı verilmezse varsayılan ad. */
export async function panoyaHizliEkle(projeSlug: string, panoAdi?: string): Promise<PanoSonuc> {
  const form = new FormData();
  form.set('ad', panoAdi?.trim() || 'Proje panom');
  form.set('projeler', projeSlug);
  return panoOlustur(form);
}
