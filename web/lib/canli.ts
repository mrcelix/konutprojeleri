import 'server-only';
import { prisma } from './db';

/* ============================================================
   Sosyal kanıt sayıları.

   SAYILAR GERÇEK. "Şu anda 23 kişi bakıyor" yazan uydurma bir rozet
   üretmek teknik olarak kolaydı — sayfa adresinden bir sayı türetip
   arada bir oynatmak yeterdi — ama o rozet ziyaretçiye canlı veri
   diye gösterilen bir kurgu olurdu. Ticari Reklam ve Haksız Ticari
   Uygulamalar Yönetmeliği (md. 7 ve 28) yanıltıcı aciliyet/talep
   göstergelerini açıkça yasaklıyor; AB tarafında da UCPD/Omnibus
   aynı yerde duruyor. Marka tarafı ayrı bir mesele: bir kez fark
   edilen sahte sayaç, sayfadaki bütün rakamları şüpheli hâle
   getiriyor — kontrol raporunu ve fiyatı da.

   Bu yüzden iki sayı da elimizdeki gerçek tablolardan geliyor:

   - CANLI: son beş dakikada aynı yolu görüntülemiş AYRIK OTURUM
     sayısı (`ziyaret` tablosu, botlar hariç).
   - TALEP: son yedi günde o villa için oluşturulmuş teklif ve
     talep sayısı.

   Sayı anlamlı bir eşiğin altındaysa `null` dönüyor ve rozet hiç
   basılmıyor. "Şu anda 1 kişi bakıyor" bir sosyal kanıt değil;
   yuvarlayıp şişirmek ise yine uydurma olurdu.
   ============================================================ */

/** Bu sayının altında rozet gösterilmiyor. */
export const CANLI_ESIK = 2;
export const TALEP_ESIK = 3;

export interface CanliOzet {
  /** Son 5 dakikada bu yolu görüntüleyen ayrık oturum sayısı */
  canli: number | null;
  /** Son 7 günde bu proje için gelen satış talebi */
  talep: number | null;
}

/**
 * Belirli bir yol için canlı ziyaretçi sayısı.
 *
 * `ziyaret` tablosunda oturum, aynı ziyaretçinin 30 dakikalık
 * penceresi. Beş dakikalık pencerede ayrık oturum saymak, "şu anda
 * bakanlar" sorusunun elimizdeki en yakın karşılığı.
 */
export async function canliSayi(yol: string): Promise<number | null> {
  const sinir = new Date(Date.now() - 5 * 60_000);
  const satirlar = await prisma.ziyaret.findMany({
    where: { yol, bot: false, olusturma: { gte: sinir } },
    select: { oturum: true },
    distinct: ['oturum'],
    take: 500,
  });
  return satirlar.length >= CANLI_ESIK ? satirlar.length : null;
}

/**
 * Bir proje için son yedi günün talebi.
 *
 * Görüntüleme SAYILMIYOR — bakmak talep değil. Sayılan tek şey form
 * dolduranlar; sosyal kanıt ancak gerçek bir eylemi yansıtıyorsa
 * işe yarıyor.
 */
export async function talepSayisi(projeId: string): Promise<number | null> {
  const sinir = new Date(Date.now() - 7 * 864e5);
  const toplam = await prisma.talep.count({
    where: { projeId, olusturma: { gte: sinir } },
  });
  return toplam >= TALEP_ESIK ? toplam : null;
}

/** İki sayı birden — tek istekte. */
export async function canliOzet(yol: string, projeId?: string): Promise<CanliOzet> {
  const [canli, talep] = await Promise.all([
    canliSayi(yol),
    projeId ? talepSayisi(projeId) : Promise.resolve(null),
  ]);
  return { canli, talep };
}
