import 'server-only';
import { prisma } from './db';

/* ============================================================
   Silme öncesi güvenlik.

   Şemadaki `onDelete` kuralları iki gruba ayrılıyor ve tehlikeli olan
   ikincisi:

     Restrict → veritabanı reddediyor, kayıp yok
     Cascade  → veritabanı SESSİZCE siliyor

   Projeye `Cascade` ile bağlı olanlar: daire tipi, medya, konuşma,
   fiyat alarmı, çeviri, arama indeksi, pano ögesi, inceleme raporu.
   Yani bir projeyi silmek, ziyaretçilerin sorduğu soruları ve kurulan
   fiyat alarmlarını da götürüyor — hata vermeden.

   Bu yüzden silme ÖNCE burada tartılıyor: neyin gideceği sayılıp
   yöneticiye gösteriliyor, geri alınamayacak olan varsa reddediliyor.
   ============================================================ */

export interface SilmeRaporu {
  /** Silme yapılabilir mi */
  izin: boolean;
  /** Reddediliyorsa sebebi */
  engel?: string;
  /** Silinecek bağlı kayıtlar — yöneticiye gösteriliyor */
  gidecek: { ad: string; adet: number }[];
}

/**
 * Proje silinebilir mi?
 *
 * TALEP VARSA SİLİNMİYOR. Talep `SetNull` ile bağlı — veritabanı
 * reddetmez, projeyi siler ve talepleri projesiz bırakır. Ama satış
 * ekibinin elindeki "bu kişi hangi projeyi sordu" bilgisi sitenin
 * ürettiği tek değer; onu sessizce silmek, kaydı silmekten farksız.
 * Yayından kaldırmak doğru yol: proje aramada görünmez, talepler
 * bağlamını korur.
 */
export async function projeSilmeRaporu(projeId: string): Promise<SilmeRaporu> {
  const proje = await prisma.proje.findUnique({ where: { id: projeId }, select: { id: true } });
  if (!proje) return { izin: false, engel: 'Proje bulunamadı.', gidecek: [] };

  const [talep, daire, konusma, alarm, medya, pano] = await Promise.all([
    prisma.talep.count({ where: { projeId } }),
    prisma.daireTipi.count({ where: { projeId } }),
    prisma.konusma.count({ where: { projeId } }),
    prisma.fiyatAlarmi.count({ where: { projeId } }),
    prisma.medya.count({ where: { projeId } }),
    prisma.panoOge.count({ where: { projeId } }),
  ]);

  const gidecek = [
    { ad: 'daire tipi', adet: daire },
    { ad: 'mesajlaşma', adet: konusma },
    { ad: 'fiyat alarmı', adet: alarm },
    { ad: 'fotoğraf ve kat planı', adet: medya },
    { ad: 'karşılaştırma panosu kaydı', adet: pano },
  ].filter((x) => x.adet > 0);

  if (talep > 0) {
    return {
      izin: false,
      engel: `Bu projeye bağlı ${talep} satış talebi var. Talep geçmişi silinemez — `
        + 'projeyi yayından kaldırın; aramada ve site içinde görünmez, '
        + 'talepler bağlamıyla birlikte durur.',
      gidecek,
    };
  }

  return { izin: true, gidecek };
}

/**
 * Firma silinebilir mi?
 *
 * Proje `Restrict` ile bağlı. Firmayı silmek projeleri sahipsiz
 * bırakamaz; projesi olan firma silinmiyor.
 */
export async function firmaSilmeRaporu(firmaId: string): Promise<SilmeRaporu> {
  const firma = await prisma.firma.findUnique({ where: { id: firmaId }, select: { id: true } });
  if (!firma) return { izin: false, engel: 'Firma bulunamadı.', gidecek: [] };

  const [proje, basvuru, kullanici] = await Promise.all([
    prisma.proje.count({ where: { firmaId } }),
    prisma.firmaBasvuru.count({ where: { firmaId } }),
    prisma.kullanici.count({ where: { firmaId } }),
  ]);

  const gidecek: { ad: string; adet: number }[] = [];
  if (basvuru > 0) gidecek.push({ ad: 'başvurunun firma bağı kopacak', adet: basvuru });

  if (proje > 0) {
    return {
      izin: false,
      engel: `Bu firmanın ${proje} projesi var. Projeleri başka bir firmaya taşıyın ya da `
        + 'silin; firmayı yayından kaldırmak da bir seçenek — firma sayfası kapanır, '
        + 'projeler kayıtta kalır.',
      gidecek,
    };
  }

  /* Panel hesabı `SetNull` DEĞİL, tekil bir bağ: kullanıcı kalır ama
     firmasız bir FIRMA rolü hiçbir şey göremiyor. Yöneticinin bunu
     bilerek yapması gerekiyor. */
  if (kullanici > 0) {
    return {
      izin: false,
      engel: 'Bu firmaya bağlı bir panel hesabı var. Önce hesabı başka bir firmaya '
        + 'taşıyın ya da kapatın; firmasız kalan hesap panelde hiçbir şey göremez.',
      gidecek,
    };
  }

  return { izin: true, gidecek };
}

/**
 * Bölge silinebilir mi?
 *
 * Proje `Restrict` ile bağlı. Bölgeyi silmek projeleri sahipsiz
 * bırakamaz; envanteri olan bölge silinmiyor.
 */
export async function bolgeSilmeRaporu(bolgeId: string): Promise<SilmeRaporu> {
  const bolge = await prisma.bolge.findUnique({ where: { id: bolgeId }, select: { id: true } });
  if (!bolge) return { izin: false, engel: 'Bölge bulunamadı.', gidecek: [] };

  const [proje, sss, ceviri, yazi] = await Promise.all([
    prisma.proje.count({ where: { bolgeId } }),
    prisma.bolgeSss.count({ where: { bolgeId } }),
    prisma.bolgeCeviri.count({ where: { bolgeId } }),
    prisma.yazi.count({ where: { bolgeId } }),
  ]);

  const gidecek = [
    { ad: 'bölge SSS satırı', adet: sss },
    { ad: 'çeviri', adet: ceviri },
  ].filter((x) => x.adet > 0);

  if (yazi > 0) gidecek.push({ ad: 'rehber yazısının bölge bağı kopacak', adet: yazi });

  if (proje > 0) {
    return {
      izin: false,
      engel: `Bu bölgede ${proje} proje var. Projeleri başka bir bölgeye taşıyın ya da `
        + 'silin; bölgeyi yayından kaldırmak da bir seçenek — iniş sayfası kapanır, '
        + 'projeler kayıtta kalır.',
      gidecek,
    };
  }

  return { izin: true, gidecek };
}
