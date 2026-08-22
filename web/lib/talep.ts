import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from './db';

/* ============================================================
   SATIŞ TALEBİ (lead) — sitenin tek dönüşüm hedefi.

   Proje tanıtım sitesinde para hareketi yok: ziyaretçi bir şey satın
   almıyor, satış ekibiyle temas kuruyor. Bu yüzden tüm huni tek bir
   forma bakıyor ve o formun terk edilme oranı sitenin tek gerçek
   metriği.

   ZORUNLU ALAN İKİ TANE: ad ve telefon. E-posta İSTEĞE BAĞLI —
   zorunlu kılmak, en yüksek dönüşümlü formu en çok terk edilen forma
   çevirirdi. Konut alıcısının büyük bölümü numarasını bırakıp
   kapatıyor; e-posta ancak katalog/fiyat listesi isteyenlerde
   gerçekten gerekiyor ve orada zaten kendiliğinden veriliyor.

   BÜTÇE, ÖDEME ŞEKLİ VE DAİRE TİPİ doldurulursa satış ekibi
   önceliklendirebiliyor; hiçbiri zorunlu değil. Boş bırakılan alan
   "bilinmiyor" olarak duruyor, sıfırla doldurulmuyor.
   ============================================================ */

export type TalepNiyeti = 'BILGI' | 'FIYAT_LISTESI' | 'KATALOG' | 'RANDEVU';
export type TalepDurumu =
  | 'YENI' | 'ARANDI' | 'ULASILAMADI' | 'RANDEVU' | 'ILGILENMIYOR' | 'SATIS' | 'KAPANDI';
export type OdemeSekli = 'BELIRTILMEDI' | 'PESIN' | 'KREDI' | 'TAKSIT' | 'TAKAS';

export interface TalepGirdisi {
  projeId?: string | null;
  daireTipiId?: string | null;
  ad: string;
  telefon: string;
  eposta?: string | null;
  niyet?: TalepNiyeti;
  butceMin?: number | null;
  butceMax?: number | null;
  odemeSekli?: OdemeSekli;
  saat?: string | null;
  not?: string | null;
  kaynak?: string | null;
  /** KVKK açık rızası. false ise kayıt AÇILMIYOR. */
  kvkkOnay?: boolean;
  ip?: string | null;
}

export interface TalepSonucu {
  tamam: boolean;
  hata?: string;
  alan?: string;
  /**
   * Talep sahibinin durumunu sorgulayabildiği kod. Yalnızca YENİ
   * kayıt açıldığında dolu.
   */
  kod?: string;
  /**
   * Yeni yazılan kaydın kimliği — bildirimi TETİKLEYEN eylem bunu
   * kullanıyor. Mükerrer talep yutulduğunda boş: aynı kişi için
   * satış ekibine ikinci bir e-posta gitmiyor.
   *
   * Bildirim burada değil eylemde gönderiliyor (`talep-eylemler.ts`):
   * bu modül bildirim katmanını çağırsaydı `baglayici` ile karşılıklı
   * bağımlılık oluşurdu — bağlayıcı telefon biçimini buradan alıyor.
   */
  id?: string;
}

/**
 * Telefon normalleştirme.
 *
 * Ziyaretçi `0532 111 22 33`, `+90 532 111 22 33`, `532-111-22-33`
 * diye yazıyor; hepsi aynı numara. Rakam dışındaki her şey atılıp
 * baştaki `0` ve `90` kırpılıyor — ekip listede tek biçim görüyor,
 * mükerrer talep de yakalanabiliyor.
 */
export function telefonNormal(ham: string): string | null {
  let s = ham.replace(/\D+/g, '');
  if (s.startsWith('00')) s = s.slice(2);
  if (s.startsWith('90') && s.length > 10) s = s.slice(2);
  if (s.startsWith('0')) s = s.slice(1);
  /* Türkiye cep ve sabit hatları on hane ve alan kodu 2-5 ile
     başlıyor; sekiz hanelik bir giriş yazım hatası. */
  if (!/^[2-5]\d{9}$/.test(s)) return null;
  return s;
}

/** Ekrana yazarken okunur biçim: 0532 111 22 33 */
export function telefonBicim(on: string): string {
  return `0${on.slice(0, 3)} ${on.slice(3, 6)} ${on.slice(6, 8)} ${on.slice(8, 10)}`;
}

/** E-posta normalleştirme — boş bırakılabildiği için null dönebiliyor. */
export function epostaNormal(ham?: string | null): string | null {
  const s = (ham ?? '').trim().toLowerCase();
  if (!s) return null;
  return s;
}

const EPOSTA_KALIBI = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Talep kodu: TLP-XXXXXX.
 *
 * Rastgele, artan değil. Artan bir sayaç (`TLP-000042`) toplam talep
 * sayısını herkese açık ediyordu — rakip de, başvuran firma da o
 * sayıyı okuyabilirdi.
 */
function kodUret(): string {
  const abece = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // I, L, O, 0, 1 yok
  const ham = randomBytes(6);
  let s = '';
  for (const b of ham) s += abece[b % abece.length];
  return `TLP-${s}`;
}

/** Formdan gelen talebi doğrular. Eylem ve testler aynı kuralı kullanıyor. */
export function talepDenetle(g: TalepGirdisi): TalepSonucu {
  const ad = g.ad.trim();
  if (ad.length < 2) return { tamam: false, hata: 'Adınızı yazın.', alan: 'ad' };
  if (ad.length > 80) return { tamam: false, hata: 'Ad en fazla 80 karakter olabilir.', alan: 'ad' };

  if (!telefonNormal(g.telefon)) {
    return { tamam: false, hata: 'Geçerli bir telefon numarası girin.', alan: 'telefon' };
  }

  const eposta = epostaNormal(g.eposta);
  /* E-posta İSTEĞE BAĞLI ama yazıldıysa geçerli olmalı: yanlış yazılmış
     bir adres, katalog isteyen kişiye hiçbir şey ulaşmaması demek. */
  if (eposta && !EPOSTA_KALIBI.test(eposta)) {
    return { tamam: false, hata: 'Geçerli bir e-posta adresi girin.', alan: 'eposta' };
  }
  /* Katalog ve fiyat listesi E-POSTAYLA gidiyor; niyet buysa adres
     zorunlu. Boş bırakılırsa talep açılıyor ama istenen şey hiç
     gönderilemiyor ve ekip sebebini anlamıyordu. */
  if (!eposta && (g.niyet === 'KATALOG' || g.niyet === 'FIYAT_LISTESI')) {
    return {
      tamam: false,
      hata: 'Katalog ve fiyat listesi e-posta ile gönderiliyor; adresinizi yazın.',
      alan: 'eposta',
    };
  }

  const { butceMin, butceMax } = g;
  if (butceMin != null && butceMin < 0) {
    return { tamam: false, hata: 'Bütçe negatif olamaz.', alan: 'butceMin' };
  }
  if (butceMin != null && butceMax != null && butceMax < butceMin) {
    return { tamam: false, hata: 'Bütçe üst sınırı alt sınırdan küçük olamaz.', alan: 'butceMax' };
  }

  if ((g.not ?? '').length > 500) {
    return { tamam: false, hata: 'Not en fazla 500 karakter olabilir.', alan: 'not' };
  }
  if ((g.saat ?? '').length > 60) return { tamam: false, hata: 'Saat aralığı çok uzun.', alan: 'saat' };

  /* KVKK açık rızası olmadan kişisel veri işlenemiyor. Sunucuda
     denetleniyor: onay kutusu istemcide `required` olsa da form
     doğrudan POST edilebiliyor. */
  if (!g.kvkkOnay) {
    return {
      tamam: false,
      hata: 'Devam etmek için kişisel verilerin işlenmesine onay vermelisiniz.',
      alan: 'kvkkOnay',
    };
  }

  return { tamam: true };
}

/** Talebi kaydeder. */
export async function talepOlustur(g: TalepGirdisi): Promise<TalepSonucu> {
  const denet = talepDenetle(g);
  if (!denet.tamam) return denet;

  const telefon = telefonNormal(g.telefon)!;
  const eposta = epostaNormal(g.eposta);

  if (g.projeId) {
    const p = await prisma.proje.findUnique({ where: { id: g.projeId }, select: { id: true } });
    if (!p) return { tamam: false, hata: 'Proje bulunamadı.' };
  }

  /* Daire tipi PROJEYE AİT OLMALI. Form gizli alanla geliyor ve
     başka bir projenin tipiyle eşleştirilirse satış ekibi olmayan bir
     daireyi konuşuyor. */
  if (g.daireTipiId) {
    const d = await prisma.daireTipi.findUnique({
      where: { id: g.daireTipiId },
      select: { projeId: true },
    });
    if (!d) return { tamam: false, hata: 'Daire tipi bulunamadı.' };
    if (g.projeId && d.projeId !== g.projeId) {
      return { tamam: false, hata: 'Daire tipi bu projeye ait değil.' };
    }
  }

  /* Aynı numaradan aynı projeye on dakika içinde ikinci talep, çift
     tıklama ya da sayfa yenileme demek — ekibe iki kez aynı kişiyi
     aratmıyoruz. */
  const yakin = await prisma.talep.findFirst({
    where: {
      telefon,
      projeId: g.projeId ?? null,
      olusturma: { gte: new Date(Date.now() - 10 * 60_000) },
    },
    select: { id: true },
  });
  if (yakin) return { tamam: true };

  const kayit = await prisma.talep.create({
    data: {
      kod: kodUret(),
      projeId: g.projeId ?? null,
      daireTipiId: g.daireTipiId ?? null,
      ad: g.ad.trim(),
      telefon,
      eposta,
      niyet: g.niyet ?? 'BILGI',
      butceMin: g.butceMin ?? null,
      butceMax: g.butceMax ?? null,
      odemeSekli: g.odemeSekli ?? 'BELIRTILMEDI',
      saat: g.saat?.trim() || null,
      not: g.not?.trim() || null,
      kaynak: g.kaynak ?? null,
      kvkkOnay: true,
      kvkkTarih: new Date(),
      ip: g.ip ?? null,
    },
    select: { id: true, kod: true },
  });

  return { tamam: true, id: kayit.id, kod: kayit.kod };
}

/** Panelde bekleyen talep sayısı — menüdeki rozet. */
export async function bekleyenTalepSayisi(): Promise<number> {
  return prisma.talep.count({ where: { durum: 'YENI' } });
}

/** Niyet başına bekleyen sayısı — ekranın üstündeki rakamlar. */
export async function bekleyenNiyetSayisi(): Promise<Record<TalepNiyeti, number>> {
  const satirlar = await prisma.talep.groupBy({
    by: ['niyet'],
    where: { durum: 'YENI' },
    _count: { _all: true },
  });
  const out: Record<TalepNiyeti, number> = {
    BILGI: 0, FIYAT_LISTESI: 0, KATALOG: 0, RANDEVU: 0,
  };
  for (const s of satirlar) out[s.niyet as TalepNiyeti] = s._count._all;
  return out;
}

/** Talep sahibinin kendi kodu ile durum sorgusu. */
export async function talepDurumu(kod: string) {
  return prisma.talep.findUnique({
    where: { kod: kod.trim().toUpperCase() },
    select: {
      kod: true, durum: true, niyet: true, olusturma: true,
      proje: { select: { ad: true, slug: true } },
    },
  });
}
