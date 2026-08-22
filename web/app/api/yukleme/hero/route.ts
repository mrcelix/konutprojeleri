import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { aktifKullanici, denetimYaz } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { depo, depoEksigi, heroAnahtarUret } from '@/lib/depo';
import { HERO_ETIKET } from '@/lib/hero';
import { gorseliIsle } from '@/lib/gorsel-isle';
import { istekIp, sinirKontrol } from '@/lib/hiz-sinir';
import { site } from '@/lib/site';

/* ============================================================
   Hero görseli yükleme.

   Proje görseli yüklemesiyle aynı gerekçe: sunucu eyleminin gövde
   sınırı 1 MB ve hero görseli büyük olmak ZORUNDA — bant ilk ekranın
   tamamını kaplıyor. Rota işleyicisi bu sınıra takılmıyor.

   Yalnızca YÖNETİCİ: hero site genelinde tek bir yüzey, firmanın
   düzenleyebileceği bir alan değil.

   Kayıt burada AÇILIYOR (yükle → hemen listeye gir). Önce dosyayı
   yükleyip sonra adresi forma yapıştırtmak, yarım kalan yüklemelerde
   depoda sahipsiz dosya bırakıyordu.
   ============================================================ */

export const runtime = 'nodejs';
export const maxDuration = 60;

const EN_COK_HERO_DOSYA = 8;

function yanit(veri: unknown, durum = 200) {
  return Response.json(veri, { status: durum, headers: { 'Cache-Control': 'no-store' } });
}

/** İstek bu siteden mi geliyor. */
async function kaynakGuvenli(): Promise<boolean> {
  const h = await headers();
  const kaynak = h.get('origin');
  if (!kaynak) return true;
  try {
    const g = new URL(kaynak).host;
    const bizim = new URL(site.url).host;
    return g === bizim || g === h.get('host');
  } catch { return false; }
}

export async function POST(istek: Request) {
  try {
    return await yukle(istek);
  } catch (e) {
    /* Beklenmeyen hata da JSON dönmeli: HTML hata sayfası alan
       istemci "Yükleme başarısız" diyor ve sebebi hiçbir yerde
       görünmüyor. Mesajın kendisi değil SINIFI dönüyor — sürücü
       mesajları yol ve ana sunucu adı taşıyabiliyor. */
    console.error('Hero yükleme hatası:', e);
    return yanit({
      hata: `Sunucuda beklenmeyen hata (${e instanceof Error ? e.name : 'bilinmeyen'}). `
        + 'Günlüklerde ayrıntısı var.',
    }, 500);
  }
}

async function yukle(istek: Request) {
  const k = await aktifKullanici();
  if (!k) return yanit({ hata: 'Oturum gerekiyor.' }, 401);
  if (k.rol !== 'ADMIN') return yanit({ hata: 'Bu işlem için yönetici olmalısınız.' }, 403);
  if (!await kaynakGuvenli()) return yanit({ hata: 'İstek kaynağı doğrulanamadı.' }, 403);

  const sinir = await sinirKontrol('yukleme', `hero:${k.id}`);
  if (!sinir.izin) return yanit({ hata: sinir.mesaj ?? 'Çok fazla yükleme denemesi.' }, 429);

  const eksik = depoEksigi();
  const d = depo();
  if (eksik || !d) return yanit({ hata: eksik ?? 'Depolama yapılandırılmamış.' }, 503);

  const form = await istek.formData().catch(() => null);
  if (!form) return yanit({ hata: 'Form okunamadı.' }, 400);

  const dosyalar = form.getAll('dosya').filter((x): x is File => x instanceof File);
  if (dosyalar.length === 0) return yanit({ hata: 'Dosya seçilmedi.' }, 400);
  if (dosyalar.length > EN_COK_HERO_DOSYA) {
    return yanit({ hata: `Tek seferde en çok ${EN_COK_HERO_DOSYA} görsel yükleyebilirsiniz.` }, 400);
  }

  /* Alt metin formdan geliyor ve ZORUNLU: hero sayfanın en büyük
     görseli; alt metni olmadan ekran okuyucu kullanan biri sayfanın
     ne anlattığını hiç öğrenemiyor. Proje görsellerindeki gibi
     otomatik metin üretilemiyor — hero'nun konusu tek bir proje değil. */
  const alt = String(form.get('alt') ?? '').trim();
  if (alt.length < 10) {
    return yanit({ hata: 'Alt metin en az 10 karakter olmalı — görselde ne olduğunu yazın.' }, 400);
  }
  const etiket = String(form.get('etiket') ?? '').trim();

  const sonSira = (await prisma.heroGorsel.findFirst({
    orderBy: { sira: 'desc' }, select: { sira: true },
  }))?.sira ?? 0;

  const eklenen: { id: string; url: string }[] = [];
  const hatalar: string[] = [];
  let sira = sonSira;

  for (const dosya of dosyalar) {
    const ham = Buffer.from(await dosya.arrayBuffer());
    const sonuc = await gorseliIsle(ham);
    if (!sonuc.tamam || !sonuc.gorsel) {
      hatalar.push(`${dosya.name}: ${sonuc.hata}`);
      continue;
    }
    /* Hero bandı çok geniş ve kısa; dar bir fotoğrafın ortası
       kırpılıyor ve konu dışarıda kalıyor. 1600 pikselin altını
       kabul etmiyoruz. */
    if (sonuc.gorsel.genislik < 1600) {
      hatalar.push(`${dosya.name}: hero için dar (${sonuc.gorsel.genislik} px, en az 1600 gerekiyor)`);
      continue;
    }

    const anahtar = heroAnahtarUret(randomBytes(12).toString('base64url'));
    try {
      await d.yaz(anahtar, sonuc.gorsel.veri, sonuc.gorsel.icerikTipi);
    } catch (e) {
      /* Sürücünün mesajı YAZILIYOR: "depoya yazılamadı" tek başına
         kovanın olmadığını mı, yetkinin yetmediğini mi, adresin mi
         yanlış olduğunu söylemiyordu. Bu uç yalnızca yöneticiye açık
         ve mesaj kısaltılıyor. */
      const sebep = e instanceof Error ? e.message.slice(0, 160) : 'bilinmeyen hata';
      hatalar.push(`${dosya.name}: depoya yazılamadı — ${sebep}`);
      continue;
    }

    sira += 1;
    try {
      const h = await prisma.heroGorsel.create({
        data: {
          url: d.url(anahtar),
          alt,
          etiket: etiket || null,
          sira,
          aktif: true,
          depoAnahtar: anahtar,
        },
        select: { id: true, url: true },
      });
      eklenen.push(h);
    } catch {
      // Satır yazılamadıysa dosyayı bırakma: kimsenin göremeyeceği çöp olur
      await d.sil(anahtar).catch(() => {});
      hatalar.push(`${dosya.name}: kayıt oluşturulamadı`);
    }
  }

  if (eklenen.length) {
    await denetimYaz(k.id, 'hero.yuklendi', 'hero', undefined, {
      adet: eklenen.length, ip: await istekIp(),
    });

    /* ÖNBELLEK TAZELEME BURADA DA GEREKLİ. Panelin sunucu eylemleri
       (kaydet, sil, taşı) `heroTazele()` çağırıyordu ama yükleme bir
       ROTA İŞLEYİCİSİ ve o zinciri atlıyordu: hero listesi
       `unstable_cache` ile etiketli, ana sayfa da bir saatlik
       `revalidate` ile statik. Yeni görsel veritabanına yazılıyor,
       panelde görünüyor ama ana sayfa eski kareleri göstermeye devam
       ediyordu. */
    revalidateTag(HERO_ETIKET);
    revalidatePath('/');
    revalidatePath('/yonetim/hero');
  }

  return yanit({ eklenen, hatalar }, eklenen.length ? 200 : 400);
}
