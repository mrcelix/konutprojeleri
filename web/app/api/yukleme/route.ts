import { headers } from 'next/headers';
import { aktifKullanici, denetimYaz, projeYetkisi } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { anahtarUret, depo, depoEksigi } from '@/lib/depo';
import {
  EN_COK_DOSYA, PROJE_EN_COK_GORSEL, gorseliIsle,
} from '@/lib/gorsel-isle';
import { otomatikAlt } from '@/lib/alt-metin';
import { istekIp, sinirKontrol } from '@/lib/hiz-sinir';
import { site } from '@/lib/site';
import { randomBytes } from 'node:crypto';

/* ============================================================
   Proje görseli yükleme.

   Sunucu eylemi değil, rota işleyicisi: sunucu eylemlerinin gövde
   sınırı varsayılan 1 MB ve çok dosyalı yüklemede bu sınır her
   telefon fotoğrafında aşılıyor. Yapılandırmayla büyütmek tüm
   eylemlerin sınırını büyütüyor — asıl istenen bu değil.

   Kimlik doğrulaması oturum çerezinden geliyor (yönetici ya da o
   projenin firması). Çerez `sameSite=lax`, yani başka bir siteden
   gönderilen POST isteğine eklenmiyor; buna ek olarak `Origin`
   başlığı da kontrol ediliyor.
   ============================================================ */

export const runtime = 'nodejs';
/** Görsel işleme CPU istiyor; birkaç fotoğraf varsayılan 10 sn'yi aşabiliyor. */
export const maxDuration = 60;

function yanit(veri: unknown, durum = 200) {
  return Response.json(veri, { status: durum, headers: { 'Cache-Control': 'no-store' } });
}

/** İstek bu siteden mi geliyor. */
async function kaynakGuvenli(): Promise<boolean> {
  const h = await headers();
  const kaynak = h.get('origin');
  // Origin yoksa (bazı eski istemciler) çerez zaten sameSite=lax ile korunuyor
  if (!kaynak) return true;
  try {
    const g = new URL(kaynak).host;
    const bizim = new URL(site.url).host;
    return g === bizim || g === h.get('host');
  } catch { return false; }
}

export async function POST(istek: Request) {
  const k = await aktifKullanici();
  if (!k) return yanit({ hata: 'Oturum gerekiyor.' }, 401);
  if (!await kaynakGuvenli()) return yanit({ hata: 'İstek kaynağı doğrulanamadı.' }, 403);

  const sinir = await sinirKontrol('yukleme', `yukleme:${k.id}`);
  if (!sinir.izin) return yanit({ hata: sinir.mesaj ?? 'Çok fazla yükleme denemesi.' }, 429);

  const eksik = depoEksigi();
  const d = depo();
  if (eksik || !d) return yanit({ hata: eksik ?? 'Depolama yapılandırılmamış.' }, 503);

  const form = await istek.formData().catch(() => null);
  if (!form) return yanit({ hata: 'Form okunamadı.' }, 400);

  const projeId = String(form.get('projeId') ?? '');
  if (!projeId) return yanit({ hata: 'Proje seçilmedi.' }, 400);
  if (!await projeYetkisi(k, projeId)) return yanit({ hata: 'Bu projeye erişiminiz yok.' }, 403);

  const dosyalar = form.getAll('dosya').filter((x): x is File => x instanceof File);
  if (dosyalar.length === 0) return yanit({ hata: 'Dosya seçilmedi.' }, 400);
  if (dosyalar.length > EN_COK_DOSYA) {
    return yanit({ hata: `Tek seferde en çok ${EN_COK_DOSYA} dosya yükleyebilirsiniz.` }, 400);
  }

  const mevcut = await prisma.medya.count({ where: { projeId } });
  if (mevcut + dosyalar.length > PROJE_EN_COK_GORSEL) {
    return yanit({
      hata: `Bir projede en çok ${PROJE_EN_COK_GORSEL} görsel olabilir `
        + `(şu an ${mevcut}, ${dosyalar.length} eklemeye çalışıyorsunuz).`,
    }, 400);
  }

  const proje = await prisma.proje.findUnique({
    where: { id: projeId }, select: { ad: true, mahalle: true, bolge: { select: { ad: true } } },
  });
  if (!proje) return yanit({ hata: 'Proje bulunamadı.' }, 404);

  const sonSira = (await prisma.medya.findFirst({
    where: { projeId }, orderBy: { sira: 'desc' }, select: { sira: true },
  }))?.sira ?? -1;

  const eklenen: { id: string; url: string; alt: string; sira: number }[] = [];
  const hatalar: string[] = [];
  let sira = sonSira;

  for (const dosya of dosyalar) {
    const ham = Buffer.from(await dosya.arrayBuffer());
    const sonuc = await gorseliIsle(ham);
    if (!sonuc.tamam || !sonuc.gorsel) {
      hatalar.push(`${dosya.name}: ${sonuc.hata}`);
      continue;
    }

    const anahtar = anahtarUret(projeId, randomBytes(12).toString('base64url'));
    try {
      await d.yaz(anahtar, sonuc.gorsel.veri, sonuc.gorsel.icerikTipi);
    } catch {
      hatalar.push(`${dosya.name}: depoya yazılamadı`);
      continue;
    }

    /* Alt metin ZORUNLU alan; boş bırakmak ekran okuyucuya hiçbir şey
       söylemeyen bir görsel demek. Ama fotoğrafta ne olduğunu
       bilmiyoruz — geçici bir metin yazılıp `altOtomatik` ile
       işaretleniyor. İşaret olmasa kimse hangi fotoğrafın alt metnini
       yazacağını bilemezdi. */
    sira += 1;
    try {
      const m = await prisma.medya.create({
        data: {
          projeId,
          url: d.url(anahtar),
          alt: otomatikAlt(proje.ad, proje.mahalle, proje.bolge.ad),
          altOtomatik: true,
          sira,
          genislik: sonuc.gorsel.genislik,
          yukseklik: sonuc.gorsel.yukseklik,
          depoAnahtar: anahtar,
          bayt: sonuc.gorsel.veri.length,
        },
        select: { id: true, url: true, alt: true, sira: true },
      });
      eklenen.push(m);
    } catch {
      // Satır yazılamadıysa dosyayı bırakma: kimsenin göremeyeceği çöp olur
      await d.sil(anahtar).catch(() => {});
      hatalar.push(`${dosya.name}: kayıt oluşturulamadı`);
    }
  }

  if (eklenen.length) {
    await denetimYaz(k.id, 'proje.gorsel.yuklendi', 'proje', projeId, {
      adet: eklenen.length, surucu: d.ad,
    });
  }

  return yanit({
    eklenen,
    hatalar,
    // Hiçbiri geçmediyse istemci bunu hata olarak göstersin
    tamam: eklenen.length > 0,
  }, eklenen.length ? 200 : 400);
}
