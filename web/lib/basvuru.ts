import 'server-only';
import { prisma } from './db';
import { adresNormalle, telefonGecerli } from './bildirim/engel';
import { BASVURU_EN_COK_MESAJ, type BasvuruSonucu } from './basvuru-tipler';

export * from './basvuru-tipler';

/* ============================================================
   Firma başvurusu.

   `/firma-basvuru` sayfası platformun ARZ tarafındaki kazanım hunisi.
   Talep tarafı (alıcı) formu sitenin her yerinde; arz tarafı (projesini
   listelemek isteyen müteahhit) tek bir sayfada ve süreç telefonla
   ilerliyor.

   Onaylanan başvuru `Firma` kaydına dönüşüyor ve oradan panelden proje
   açılıyor — huni uçtan uca kapanıyor.
   ============================================================ */

export interface BasvuruGirdisi {
  ad: string;
  eposta: string;
  telefon: string;
  firmaAd: string;
  bolge: string;
  projeSayisi: number;
  mesaj: string;
}

/** Firma adından URL parçası üretir. */
function slugla(ham: string): string {
  const harita: Record<string, string> = {
    ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
    Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
  };
  return ham
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (c) => harita[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'firma';
}

/**
 * Başvuruyu kaydeder.
 *
 * AÇIK BAŞVURU VARSA YENİSİ AÇILMIYOR. Aynı kişi formu iki kez
 * gönderdiğinde ekip aynı işi iki kez aramamalı; ikinci gönderim
 * mevcut başvuruyu güncelliyor ve kullanıcıya yine "alındı" deniyor.
 * Ret sebebini söylemek de doğru değil — "zaten başvurdunuz" demek,
 * bir adresin sistemde olup olmadığını sorgulama aracına dönüşür.
 */
export async function basvuruKaydet(
  girdi: BasvuruGirdisi,
  ip: string | null,
): Promise<BasvuruSonucu> {
  const ad = girdi.ad.trim();
  const eposta = girdi.eposta.trim().toLowerCase();
  const telefonHam = girdi.telefon.trim();
  const firmaAd = girdi.firmaAd.trim();
  const bolge = girdi.bolge.trim();
  const mesaj = girdi.mesaj.trim();

  const degerler: Record<string, string> = {
    ad, eposta, telefon: telefonHam, firmaAd, bolge,
    projeSayisi: String(girdi.projeSayisi || ''), mesaj,
  };
  const hata = (m: string, alan?: string): BasvuruSonucu => ({ hata: m, alan, degerler });

  if (ad.length < 3) return hata('Ad soyad en az 3 karakter olmalı.', 'ad');
  if (firmaAd.length < 2) return hata('Firma unvanını yazın.', 'firmaAd');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta)) {
    return hata('Geçerli bir e-posta adresi girin.', 'eposta');
  }

  /* Telefon ZORUNLU: proje listeleme süreci telefonla ilerliyor,
     ekip yerinde inceleme için randevulaşıyor. */
  const telefon = telefonHam ? adresNormalle('SMS', telefonHam) : '';
  if (!telefon || !telefonGecerli(telefon)) {
    return hata('Telefon numarası geçersiz (örn. 0532 123 45 67).', 'telefon');
  }

  if (bolge.length < 2) return hata('Projenizin bulunduğu yeri yazın.', 'bolge');

  const projeSayisi = Math.round(girdi.projeSayisi);
  if (!Number.isFinite(projeSayisi) || projeSayisi < 1 || projeSayisi > 200) {
    return hata('Proje sayısı 1–200 arasında olmalı.', 'projeSayisi');
  }

  if (mesaj.length > BASVURU_EN_COK_MESAJ) {
    return hata(`Mesaj en fazla ${BASVURU_EN_COK_MESAJ} karakter olabilir.`, 'mesaj');
  }

  const veri = {
    ad, eposta, telefon, firmaAd, bolge, projeSayisi,
    mesaj: mesaj || null,
    ip,
  };

  const acik = await prisma.firmaBasvuru.findFirst({
    where: { eposta, durum: { in: ['YENI', 'GORUSULDU'] } },
    select: { id: true },
  });

  try {
    if (acik) {
      await prisma.firmaBasvuru.update({ where: { id: acik.id }, data: veri });
      return { tamam: true, basvuruId: acik.id, yeniKayit: false };
    }
    const yeni = await prisma.firmaBasvuru.create({ data: veri, select: { id: true } });
    return { tamam: true, basvuruId: yeni.id, yeniKayit: true };
  } catch (e) {
    console.error('Başvuru kaydedilemedi:', e);
    return hata('Başvurunuz kaydedilemedi, lütfen tekrar deneyin.');
  }
}

export interface OnaySonucu {
  hata?: string;
  tamam?: boolean;
  firmaId?: string;
}

/**
 * Başvuruyu onaylayıp firma kaydına dönüştürür.
 *
 * Panel hesabı BURADA AÇILMIYOR — bilerek. Firma kaydı açmak ilişkinin
 * başlangıcı; panele erişim ayrı bir karar ve ayrı bir ekranda
 * veriliyor. Her onaylanan başvuruya otomatik hesap açmak, paneli hiç
 * kullanmayacak kişiler için kullanılmayan kimlik bilgisi üretirdi.
 */
export async function basvuruOnayla(basvuruId: string): Promise<OnaySonucu> {
  const b = await prisma.firmaBasvuru.findUnique({
    where: { id: basvuruId },
    select: {
      id: true, ad: true, eposta: true, telefon: true, firmaAd: true,
      durum: true, firmaId: true,
    },
  });
  if (!b) return { hata: 'Başvuru bulunamadı.' };
  if (b.firmaId) return { hata: 'Bu başvuru zaten firma kaydına dönüştürülmüş.' };

  /* Aynı e-postayla firma zaten varsa yenisi açılmıyor, mevcut kayda
     bağlanıyor. `Firma.eposta` TEKİL DEĞİL (bir grup şirketinin birden
     çok markası aynı adresi kullanabiliyor), o yüzden slug üzerinden
     de kontrol ediliyor. */
  const mevcut = await prisma.firma.findFirst({
    where: { OR: [{ eposta: b.eposta }, { slug: slugla(b.firmaAd) }] },
    select: { id: true },
  });

  try {
    const sonuc = await prisma.$transaction(async (tx) => {
      let firmaId = mevcut?.id;

      if (!firmaId) {
        /* Slug çakışırsa sonuna sayı ekleniyor: iki farklı firmanın
           unvanı aynı slug'a indirgenebiliyor ("ABC İnşaat" ve
           "A.B.C. İnşaat") ve benzersizlik kısıtı onayı düşürürdü. */
        const taban = slugla(b.firmaAd);
        let slug = taban;
        for (let i = 2; await tx.firma.findUnique({ where: { slug }, select: { id: true } }); i += 1) {
          slug = `${taban}-${i}`;
        }
        const f = await tx.firma.create({
          data: {
            slug,
            ad: b.firmaAd,
            eposta: b.eposta,
            telefon: b.telefon,
            ozet: `${b.firmaAd} tarafından geliştirilen projeler.`,
            /* Yayında DEĞİL: firma kaydı açılmakla sitede görünmeye
               hak kazanmıyor. Ekip yerinde incelemeyi yapıp proje
               eklendikten sonra yayına alınıyor. */
            yayinda: false,
          },
          select: { id: true },
        });
        firmaId = f.id;
      }

      await tx.firmaBasvuru.update({
        where: { id: b.id },
        data: { durum: 'ONAYLANDI', firmaId, sonuclanma: new Date() },
      });
      return firmaId;
    });
    return { tamam: true, firmaId: sonuc };
  } catch (e) {
    console.error('Başvuru onaylanamadı:', e);
    return { hata: 'Firma kaydı açılamadı.' };
  }
}

/** Başvuruyu reddeder. Gerekçe zorunlu — başvurana bildiriliyor. */
export async function basvuruReddet(basvuruId: string, gerekce: string): Promise<OnaySonucu> {
  const temiz = gerekce.trim();
  if (temiz.length < 10) return { hata: 'Ret gerekçesi en az 10 karakter olmalı.' };

  const b = await prisma.firmaBasvuru.findUnique({
    where: { id: basvuruId }, select: { durum: true },
  });
  if (!b) return { hata: 'Başvuru bulunamadı.' };
  if (b.durum === 'ONAYLANDI') return { hata: 'Onaylanmış başvuru reddedilemez.' };

  await prisma.firmaBasvuru.update({
    where: { id: basvuruId },
    data: { durum: 'REDDEDILDI', not: temiz, sonuclanma: new Date() },
  });
  return { tamam: true };
}

/** Başvuruyu "görüşüldü" olarak işaretler ve nota ekler. */
export async function basvuruGoruseldi(basvuruId: string, not: string): Promise<OnaySonucu> {
  await prisma.firmaBasvuru.update({
    where: { id: basvuruId },
    data: { durum: 'GORUSULDU', not: not.trim() || undefined },
  });
  return { tamam: true };
}
