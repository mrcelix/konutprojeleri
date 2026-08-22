import 'server-only';
import { redirect } from 'next/navigation';
import { bekleyenIsler, firmaProjeleri } from './analitik';
import { aktifKullanici, type AktifKullanici } from './auth';
import type { NavOge } from '@/components/panel/PanelKabuk';

/* ============================================================
   Panel bağlamı.

   Her panel sayfası bunu çağırır: yetki kontrolü, kapsam (hangi
   projeler), gezinme menüsü ve bekleyen iş sayaçları tek yerde.
   ============================================================ */

export interface PanelBaglam {
  kullanici: AktifKullanici;
  /** Firma panelinde kendi projeleri; admin ise null (= tümü) */
  projeIdler: string[] | null;
  nav: NavOge[];
  isler: Awaited<ReturnType<typeof bekleyenIsler>>;
  kok: string;
}

/**
 * Ziyaretçi hesabı bağlamı.
 *
 * Siteden kendi kaydolan ziyaretçi panel görmüyor: projesi, talebi,
 * satışı yok. Gördüğü şey kendi talepleri, favorileri ve panoları.
 * Yönetici ona FIRMA rolü verdiğinde AYNI hesap proje panelini
 * görmeye başlıyor — ikinci bir hesap açmak gerekmiyor.
 */
export async function ziyaretciBaglam(): Promise<PanelBaglam> {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect('/giris');

  return {
    kullanici,
    projeIdler: null,
    isler: await bekleyenIsler([]),
    kok: '/hesap',
    nav: [
      { yol: '/hesap', ad: 'Taleplerim', ikon: 'phone' },
      { yol: '/favoriler', ad: 'Favorilerim', ikon: 'heart' },
      { yol: '/panel/profil', ad: 'Profil', ikon: 'users' },
      { yol: '/panel/guvenlik', ad: 'Güvenlik', ikon: 'shield' },
    ],
  };
}

/**
 * Role göre doğru kabuğu seçer.
 *
 * Profil ve güvenlik sayfaları ÜÇ rolde de aynı; yalnızca içinde
 * durdukları panel değişiyor.
 */
export async function hesapBaglam(): Promise<PanelBaglam> {
  const k = await aktifKullanici();
  if (!k) redirect('/giris');
  if (k.rol === 'ADMIN') return yonetimBaglam();
  if (k.rol === 'ZIYARETCI') return ziyaretciBaglam();
  return firmaBaglam();
}

/** Firma paneli baglami. */
export async function firmaBaglam(): Promise<PanelBaglam> {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect('/giris');
  /* Ziyaretci hesabi firma panelini GORMEMELI: projesi yok, butun
     sayfalar bos cikardi ve "talepler" gibi basliklar yanlis beklenti
     yaratirdi. */
  if (kullanici.rol === 'ZIYARETCI') redirect('/hesap');

  // Admin firma panelini gorebilir ama kendi projesi olmadigi icin
  // kapsami tum envanter olur (destek amacli gorunum).
  const projeIdler = kullanici.firmaId ? await firmaProjeleri(kullanici.firmaId) : null;
  const isler = await bekleyenIsler(projeIdler);

  return {
    kullanici,
    projeIdler,
    isler,
    kok: '/panel',
    nav: [
      { yol: '/panel', ad: 'Genel bakis', ikon: 'grid' },
      { yol: '/panel/talepler', ad: 'Talepler', ikon: 'phone', rozet: isler.yeniTalep },
      { yol: '/panel/projeler', ad: 'Projelerim', ikon: 'building' },
      { yol: '/panel/mesajlar', ad: 'Mesajlar', ikon: 'share', rozet: isler.okunmamisMesaj },
      { yol: '/panel/profil', ad: 'Profil', ikon: 'users' },
      { yol: '/panel/guvenlik', ad: 'Guvenlik', ikon: 'shield' },
    ],
  };
}

/** Yönetim paneli bağlamı — yalnızca ADMIN. */
export async function yonetimBaglam(): Promise<PanelBaglam> {
  const kullanici = await aktifKullanici();
  if (!kullanici) redirect('/giris');
  if (kullanici.rol === 'ZIYARETCI') redirect('/hesap');
  if (kullanici.rol !== 'ADMIN') redirect('/panel');

  const isler = await bekleyenIsler(null);

  return {
    kullanici,
    projeIdler: null,
    isler,
    kok: '/yonetim',
    /* MENU GRUPLU: uzun ve duz bir liste, aranan satiri her seferinde
       bastan okutuyordu. Sira gunluk ise gore: once gelen kutusu
       (talep, mesaj, basvuru), sonra envanter, sonra icerik, en altta
       sistem.

       TALEPLER EN USTTE ve rozeti GECIKENLERI sayiyor, yeni olanlari
       degil: yeni talep normal, dort saattir aranmamis talep bir
       sorun. Rozet her seye yaniyorsa hicbir seye yanmiyor demektir. */
    nav: [
      { yol: '/yonetim', ad: 'Analitik', ikon: 'grid', grup: 'Genel' },

      { yol: '/yonetim/talepler', ad: 'Satış talepleri', ikon: 'phone', rozet: isler.gecikenTalep, grup: 'Operasyon' },
      { yol: '/yonetim/mesajlar', ad: 'Mesajlar', ikon: 'share', rozet: isler.okunmamisMesaj, grup: 'Operasyon' },
      { yol: '/yonetim/basvurular', ad: 'Firma başvuruları', ikon: 'users', rozet: isler.yeniBasvuru, grup: 'Operasyon' },
      { yol: '/yonetim/alarmlar', ad: 'Fiyat alarmları', ikon: 'clock', grup: 'Operasyon' },

      { yol: '/yonetim/projeler', ad: 'Projeler', ikon: 'building', grup: 'Envanter' },
      { yol: '/yonetim/firmalar', ad: 'Firmalar', ikon: 'users', grup: 'Envanter' },
      { yol: '/yonetim/bolgeler', ad: 'Bölgeler', ikon: 'pin', grup: 'Envanter' },
      { yol: '/yonetim/kategoriler', ad: 'Kategoriler', ikon: 'filter', grup: 'Envanter' },

      { yol: '/yonetim/sayfalar', ad: 'Kurumsal sayfalar', ikon: 'grid', grup: 'İçerik' },
      { yol: '/yonetim/metinler', ad: 'Sayfa metinleri', ikon: 'sliders', grup: 'İçerik' },
      { yol: '/yonetim/yazilar', ad: 'Rehber yazıları', ikon: 'grid', grup: 'İçerik' },
      { yol: '/yonetim/hero', ad: 'Hero görselleri', ikon: 'cam', grup: 'İçerik' },
      { yol: '/yonetim/menu', ad: 'Menü', ikon: 'sliders', grup: 'İçerik' },
      { yol: '/yonetim/kampanyalar', ad: 'Kampanyalar', ikon: 'spark', grup: 'İçerik' },
      { yol: '/yonetim/ceviriler', ad: 'Çeviriler', ikon: 'share', grup: 'İçerik' },
      { yol: '/yonetim/ayarlar', ad: 'Site bilgileri', ikon: 'shield', grup: 'İçerik' },

      { yol: '/yonetim/analitik', ad: 'Trafik analitiği', ikon: 'grid', grup: 'Sistem' },
      { yol: '/yonetim/performans', ad: 'Performans', ikon: 'spark', grup: 'Sistem' },
      { yol: '/yonetim/bildirimler', ad: 'Bildirimler', ikon: 'share', grup: 'Sistem' },
      { yol: '/yonetim/kullanicilar', ad: 'Kullanıcılar', ikon: 'users', grup: 'Sistem' },
      { yol: '/yonetim/guvenlik', ad: 'Güvenlik', ikon: 'shield', grup: 'Sistem' },
      { yol: '/yonetim/veri-talepleri', ad: 'Veri başvuruları', ikon: 'shield', grup: 'Sistem' },
      { yol: '/yonetim/denetim', ad: 'Denetim kaydı', ikon: 'shield', grup: 'Sistem' },
      { yol: '/yonetim/tohum', ad: 'Demo veri', ikon: 'sliders', grup: 'Sistem' },
      { yol: '/panel/profil', ad: 'Profil', ikon: 'users', grup: 'Sistem' },
    ],
  };
}

/* ---------------- Ortak biçimlendirme yardımcıları ---------------- */

export const trTarihSaat = (d: Date) =>
  d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const trGun = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;

/** Dönem seçici için tarih aralığı üretir. */
export function donemAraligi(donem: string): { baslangic: Date; bitis: Date; onceki: Date; ad: string } {
  const simdi = new Date();
  const gun = (n: number) => new Date(simdi.getTime() - n * 864e5);
  const tablo: Record<string, [number, string]> = {
    '7g': [7, 'Son 7 gün'],
    '30g': [30, 'Son 30 gün'],
    '90g': [90, 'Son 90 gün'],
    '12a': [365, 'Son 12 ay'],
  };
  const [n, ad] = tablo[donem] ?? tablo['30g'];
  return { baslangic: gun(n), bitis: simdi, onceki: gun(n * 2), ad };
}
