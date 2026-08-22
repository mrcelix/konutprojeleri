'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  adminZorunlu, bekleyenOturum, denetimYaz, digerOturumlariDusur, girisZorunlu,
  oturumAc, oturumDogrula, oturumKapat, parolaDogrula, parolaHashle, projeYetkisi,
} from './auth';
import { site } from './site';
import { kisiselVeriSil, sertEngeller, silmeEngelleri } from './kisisel-veri';
import { gizliOkunakli, gizliUret, kodDogrula, otpauthUri, yedekKodUret, yedekNormalle } from './totp';
import { adresNormalle, engelKaldir, telefonGecerli } from './bildirim/engel';
import { istekIp, sinirKontrol, sinirSifirla } from './hiz-sinir';
import {
  basvuruGoruseldi, basvuruKaydet, basvuruOnayla, basvuruReddet,
  type BasvuruSonucu,
} from './basvuru';
import {
  basvuruAlindiBildirimi, basvuruSonucBildirimi, hesapBildirimi,
  soruYanitBildirimi, veriTalebiBildirimi, yeniSoruBildirimi,
} from './bildirim/baglayici';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './db';
import {
  KATEGORI_IKONLARI, PROJE_DURUMLARI, PROJE_TIPLERI, TALEP_DURUMLARI, TAPU_DURUMLARI,
} from './kategori-sabit';
import { girisHedefi } from './rol';
import { dUTC } from './bicim';
import { ICERIK_ETIKET } from './icerik';
import {
  iceAktarCozumle, iceAktarUygula,
  type OnizlemeSonucu, type UygulamaSonucu,
} from './ice-aktar';
import { METIN_KAYDI, varsayilanMetin, type MetinAnahtari } from './metin-kayit';
import type { Prisma } from './generated/prisma';
import type { ProjeDurumu, ProjeTipi, TapuDurumu } from './types';
import type { TalepDurumu } from './talep';
import {
  VARSAYILAN_SAYFALAR, VARSAYILAN_SAYFALAR_EN,
} from './icerik-varsayilan';
import { KONTROL_MADDELERI } from './kontrol-kayit';
import { AYAR_ETIKET } from './site-ayar';
import { bloklariDenetle, govdeCozumle, sssCozumle } from './icerik-bicim';
import { KAMPANYA_ETIKET, kampanyaDenetle } from './kampanya';
import { okumaSuresi, yaziDenetle } from './yazi';
import { MENU_ETIKET, menuDenetle } from './menu-kayit';
import { HERO_ETIKET, heroDenetle } from './hero';
import { BOS_ICERIK, bolgeDenetle } from './bolge-yonet';
import { bolgeSilmeRaporu, firmaSilmeRaporu, projeSilmeRaporu } from './silme';
import { benzersizSlug, slugla } from './turkce';
import { partiyiSil, tohumla, turuYenile, TOHUM_TURLERI, type TohumTuru } from './tohum';
import { depo } from './depo';
import { ceviriYaz, type CeviriVarlik, type DilEnum } from './ceviri';
import { altMetniDenetle, MEDYA_TIPLERI, otomatikAlt, yayinKapisi } from './alt-metin';

/* ============================================================
   Panel sunucu eylemleri.

   Her eylem kendi yetki kontrolünü yapar — sayfa seviyesindeki kontrole
   güvenilmez, çünkü server action'lar doğrudan çağrılabilir.
   ============================================================ */

function tazele(...yollar: string[]) {
  for (const y of yollar) {
    try { revalidatePath(y); } catch { /* istek bağlamı yok */ }
  }
}

/* ---------------- Giriş / çıkış ---------------- */

export interface GirisSonucu { hata?: string }

export async function girisYap(_onceki: GirisSonucu | null, form: FormData): Promise<GirisSonucu> {
  const eposta = String(form.get('eposta') ?? '').trim().toLowerCase();
  const parola = String(form.get('parola') ?? '');
  if (!eposta || !parola) return { hata: 'E-posta ve parola gerekli.' };

  // İKİ EKSENDE SINIR: IP tek makineli saldırıyı, hesap ekseni dağıtık
  // saldırıda hedef hesabı koruyor. Hesap sınırı daha gevşek — aksi halde
  // saldırgan kurbanın hesabını kilitleyebilirdi.
  const ip = await istekIp();
  const ipSinir = await sinirKontrol('girisIp', ip);
  if (!ipSinir.izin) {
    await denetimYaz(null, 'giris.hiz_siniri', 'kullanici', undefined, { eposta, ip });
    return { hata: ipSinir.mesaj ?? 'Çok fazla deneme yapıldı.' };
  }
  const hesapSinir = await sinirKontrol('girisHesap', eposta);
  if (!hesapSinir.izin) {
    await denetimYaz(null, 'giris.hiz_siniri', 'kullanici', undefined, { eposta });
    return { hata: hesapSinir.mesaj ?? 'Çok fazla deneme yapıldı.' };
  }

  const k = await prisma.kullanici.findUnique({ where: { eposta } });

  // Kullanıcı yoksa da hash doğrulaması yapılır: yanıt süresi
  // e-postanın kayıtlı olup olmadığını ele vermemeli.
  const sahteHash = 'scrypt$00000000000000000000000000000000$0000';
  const dogru = await parolaDogrula(parola, k?.parolaHash ?? sahteHash);

  if (!k || !dogru || !k.aktif) {
    await denetimYaz(k?.id ?? null, 'giris.basarisiz', 'kullanici', k?.id, { eposta });
    return { hata: 'E-posta veya parola hatalı.' };
  }

  // Parola doğru: sayaçları sıfırla. Aksi halde meşru kullanıcı da
  // sınıra takılırdı — 10 kez doğru parola girmek yasak olmamalı.
  await sinirSifirla('girisIp', ip);
  await sinirSifirla('girisHesap', eposta);

  // İki adımlı doğrulama açıksa oturum henüz yetki vermez
  if (k.totpAktif && k.totpGizli) {
    await oturumAc(k.id, true);
    await denetimYaz(k.id, 'giris.ikinci_asama', 'kullanici', k.id);
    redirect('/giris/dogrulama');
  }

  await oturumAc(k.id);
  await denetimYaz(k.id, 'giris.basarili', 'kullanici', k.id);
  redirect(girisHedefi(k.rol));
}

/* ---------------- Ziyaretçi kaydı ----------------
   Siteden kendi kaydolan ziyaretçi. Rol ZIYARETCI: panel görmüyor,
   kendi taleplerini ve hesabını görüyor. Yönetici FIRMA
   rolü verdiğinde aynı hesap firma panelini görmeye başlıyor. */

export async function ziyaretciKayit(_onceki: GirisSonucu | null, form: FormData): Promise<GirisSonucu> {
  const ad = String(form.get('ad') ?? '').trim();
  const eposta = String(form.get('eposta') ?? '').trim().toLowerCase();
  const parola = String(form.get('parola') ?? '');
  const kosullar = form.get('kosullar') === 'on';

  /* Kayıt da hız sınırlı: sınırsız kayıt, e-posta adresi
     doğrulamasını kötüye kullanarak posta kutusu bombardımanı ve
     veritabanını şişirme yolu açar. */
  const ip = await istekIp();
  const sinir = await sinirKontrol('girisIp', `kayit:${ip}`);
  if (!sinir.izin) return { hata: sinir.mesaj ?? 'Çok fazla deneme yapıldı.' };

  if (ad.length < 3) return { hata: 'Ad soyad en az 3 karakter olmalı.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta)) return { hata: 'Geçerli bir e-posta girin.' };
  if (parola.length < 10) return { hata: 'Parola en az 10 karakter olmalı.' };
  if (!kosullar) return { hata: 'Devam etmek için koşulları onaylayın.' };

  /* Adres kayıtlıysa HESAP AÇILMIYOR ama "bu adres kayıtlı" da
     denmiyor: kayıt formu, hangi adreslerin sistemde olduğunu
     öğrenmenin en kolay yolu olurdu. Kullanıcıya giriş yapması
     söyleniyor. */
  const varOlan = await prisma.kullanici.findUnique({
    where: { eposta }, select: { id: true },
  });
  if (varOlan) {
    return { hata: 'Bu adresle devam edemiyoruz. Hesabınız varsa giriş yapın, parolanızı unuttuysanız destekle iletişime geçin.' };
  }

  const k = await prisma.kullanici.create({
    data: { ad, eposta, parolaHash: await parolaHashle(parola), rol: 'ZIYARETCI' },
    select: { id: true },
  });

  await oturumAc(k.id);
  await denetimYaz(k.id, 'ziyaretci.kayit', 'kullanici', k.id, { eposta });
  redirect('/hesap');
}

/* ---------------- İki adımlı doğrulama ---------------- */

export interface DogrulamaSonucu { hata?: string }

/**
 * Girişin ikinci aşaması.
 *
 * Hem TOTP kodunu hem yedek kodu kabul eder. Yedek kod kullanılırsa
 * listeden SİLİNİR — tek kullanımlık olmasının anlamı bu.
 */
export async function ikinciAsamaDogrula(
  _onceki: DogrulamaSonucu | null,
  form: FormData,
): Promise<DogrulamaSonucu> {
  const bekleyen = await bekleyenOturum();
  if (!bekleyen) return { hata: 'Doğrulama süresi doldu. Yeniden giriş yapın.' };

  const girilen = String(form.get('kod') ?? '').trim();
  if (!girilen) return { hata: 'Kod gerekli.' };

  // 6 haneli kod kaba kuvvete çok açık: 1.000.000 olasılık, saniyede
  // yüzlerce deneme yapılabilse birkaç saatte kırılır.
  const asamaSinir = await sinirKontrol('ikinciAsama', bekleyen.kullaniciId);
  if (!asamaSinir.izin) {
    await denetimYaz(bekleyen.kullaniciId, 'ikinci_asama.hiz_siniri', 'kullanici', bekleyen.kullaniciId);
    return { hata: asamaSinir.mesaj ?? 'Çok fazla deneme yapıldı.' };
  }

  const k = await prisma.kullanici.findUnique({ where: { id: bekleyen.kullaniciId } });
  if (!k || !k.totpGizli || !k.aktif) return { hata: 'Doğrulama yapılamadı.' };

  // 1. Doğrulayıcı uygulamanın ürettiği kod
  if (kodDogrula(k.totpGizli, girilen)) {
    await sinirSifirla('ikinciAsama', k.id);
    await oturumDogrula(bekleyen.oturumId, k.id);
    await denetimYaz(k.id, 'giris.basarili', 'kullanici', k.id, { yontem: 'totp' });
    redirect(k.rol === 'ADMIN' ? '/yonetim' : '/panel');
  }

  // 2. Yedek kod — hash'lerle karşılaştırılır, eşleşen listeden çıkarılır
  const aday = yedekNormalle(girilen);
  for (const hash of k.yedekKodlar) {
    if (!(await parolaDogrula(aday, hash))) continue;

    await prisma.kullanici.update({
      where: { id: k.id },
      data: { yedekKodlar: k.yedekKodlar.filter((h) => h !== hash) },
    });
    await sinirSifirla('ikinciAsama', k.id);
    await oturumDogrula(bekleyen.oturumId, k.id);
    await denetimYaz(k.id, 'giris.basarili', 'kullanici', k.id, {
      yontem: 'yedek_kod', kalan: k.yedekKodlar.length - 1,
    });
    redirect(k.rol === 'ADMIN' ? '/yonetim' : '/panel');
  }

  await denetimYaz(k.id, 'giris.ikinci_asama_basarisiz', 'kullanici', k.id);
  return { hata: 'Kod doğrulanamadı. Doğrulayıcı uygulamadaki kodu ya da bir yedek kodu girin.' };
}

/** 2FA kurulumu için gizli anahtar üretir — henüz etkinleştirmez. */
export async function ikinciAsamaHazirla(): Promise<{ gizli: string; uri: string; okunakli: string }> {
  const k = await girisZorunlu();
  const gizli = gizliUret();

  // Etkinleştirme, kullanıcı ilk doğru kodu girene kadar yapılmaz.
  // Aksi halde yanlış kurulumda kendi hesabını kilitler.
  await prisma.kullanici.update({
    where: { id: k.id },
    data: { totpGizli: gizli, totpAktif: false },
  });

  return {
    gizli,
    uri: otpauthUri(gizli, k.eposta, site.ad),
    okunakli: gizliOkunakli(gizli),
  };
}

/** Kullanıcı ilk kodu doğru girerse 2FA açılır ve yedek kodlar üretilir. */
export async function ikinciAsamaAc(
  _onceki: { hata?: string; yedekler?: string[] } | null,
  form: FormData,
): Promise<{ hata?: string; yedekler?: string[] }> {
  const k = await girisZorunlu();
  const kod = String(form.get('kod') ?? '').trim();

  const tam = await prisma.kullanici.findUnique({
    where: { id: k.id }, select: { totpGizli: true, totpAktif: true },
  });
  if (!tam?.totpGizli) return { hata: 'Önce QR kodunu okutun.' };
  if (tam.totpAktif) return { hata: 'İki adımlı doğrulama zaten açık.' };
  if (!kodDogrula(tam.totpGizli, kod)) {
    return { hata: 'Kod doğrulanamadı. Telefonunuzun saati doğru mu?' };
  }

  const yedekler = yedekKodUret();
  const hashler = await Promise.all(yedekler.map((y) => parolaHashle(yedekNormalle(y))));

  await prisma.kullanici.update({
    where: { id: k.id },
    data: { totpAktif: true, yedekKodlar: hashler },
  });
  await denetimYaz(k.id, 'ikinci_asama.acildi', 'kullanici', k.id);
  tazele('/panel/guvenlik', '/yonetim/guvenlik');

  return { yedekler };
}

/**
 * 2FA kapatma — parola ZORUNLU.
 * Açık oturumu ele geçiren biri korumayı tek tıkla kaldırabilmemeli.
 */
export async function ikinciAsamaKapat(
  _onceki: { hata?: string; tamam?: boolean } | null,
  form: FormData,
): Promise<{ hata?: string; tamam?: boolean }> {
  const k = await girisZorunlu();
  const parola = String(form.get('parola') ?? '');
  if (!parola) return { hata: 'Parolanızı girin.' };

  const tam = await prisma.kullanici.findUnique({ where: { id: k.id }, select: { parolaHash: true } });
  /* Google ile açılmış hesabın parolası YOK; ikinci aşamayı parolayla
     kapatmak da mümkün değil. Sessizce reddetmek yerine sebebi
     söylüyoruz. */
  if (!tam?.parolaHash) return { hata: 'Bu hesabın parolası yok (Google ile açılmış).' };
  if (!(await parolaDogrula(parola, tam.parolaHash))) {
    await denetimYaz(k.id, 'ikinci_asama.kapatma_basarisiz', 'kullanici', k.id);
    return { hata: 'Parola hatalı.' };
  }

  await prisma.kullanici.update({
    where: { id: k.id },
    data: { totpAktif: false, totpGizli: null, yedekKodlar: [] },
  });
  await denetimYaz(k.id, 'ikinci_asama.kapatildi', 'kullanici', k.id);
  tazele('/panel/guvenlik', '/yonetim/guvenlik');
  return { tamam: true };
}

/* ---------------- Kendi hesabı: profil ----------------
   Kullanıcının kendi adını ve parolasını değiştirdiği yer. Şimdiye
   kadar ikisi de YALNIZCA yöneticide vardı: firma adını
   düzelttirmek ya da parolasını yenilemek için destek istemek
   zorundaydı ve yönetici geçici parola üretip güvensiz bir kanaldan
   iletiyordu. */

export async function profilKaydet(
  _onceki: { hata?: string; tamam?: boolean } | null,
  form: FormData,
): Promise<{ hata?: string; tamam?: boolean }> {
  const k = await girisZorunlu();
  const ad = String(form.get('ad') ?? '').trim();
  if (ad.length < 3) return { hata: 'Ad en az 3 karakter olmalı.' };
  if (ad.length > 60) return { hata: 'Ad en fazla 60 karakter olabilir.' };

  /* E-POSTA DEĞİŞTİRİLEMİYOR: giriş kimliği o ve doğrulama akışı
     (yeni adrese onay bağlantısı) yazılmadan değiştirmek, hesabın
     erişilemez hâle gelmesi ya da başkasının adresine devri
     anlamına gelirdi. */

  await prisma.kullanici.update({ where: { id: k.id }, data: { ad } });
  await denetimYaz(k.id, 'profil.guncellendi', 'kullanici', k.id, { ad });
  tazele('/panel/profil', '/panel', '/yonetim');
  return { tamam: true };
}

/**
 * Kullanıcı kendi parolasını değiştirir.
 *
 * Mevcut parola SORULUYOR: açık bırakılmış bir oturumu ele geçiren
 * kişi, parolayı değiştirip hesabı tümüyle devralabilirdi.
 *
 * Değişiklikten sonra DİĞER oturumlar düşüyor, bu oturum kalıyor:
 * parola değiştirmenin en yaygın sebebi "başkası girmiş olabilir"
 * ve o kişinin oturumu ayakta kalırsa değişikliğin anlamı olmaz.
 * Kendi oturumunu da düşürmek, kullanıcıyı kendi işleminin ortasında
 * dışarı atardı.
 */
export async function parolaDegistir(
  _onceki: { hata?: string; tamam?: boolean } | null,
  form: FormData,
): Promise<{ hata?: string; tamam?: boolean }> {
  const k = await girisZorunlu();
  const mevcut = String(form.get('mevcut') ?? '');
  const yeni = String(form.get('yeni') ?? '');
  const tekrar = String(form.get('tekrar') ?? '');

  if (yeni.length < 10) return { hata: 'Yeni parola en az 10 karakter olmalı.' };
  if (yeni !== tekrar) return { hata: 'Yeni parola iki alanda aynı değil.' };
  if (yeni === mevcut) return { hata: 'Yeni parola eskisiyle aynı olamaz.' };

  const tam = await prisma.kullanici.findUnique({
    where: { id: k.id }, select: { parolaHash: true },
  });
  /* Parolası hiç olmayan (Google) hesap için "mevcut parola" sorusu
     anlamsız; bu hesaplar parolayı ancak sıfırlama akışıyla
     kazanabilir. */
  if (!tam?.parolaHash) return { hata: 'Bu hesap Google ile açılmış; parolası yok.' };
  if (!(await parolaDogrula(mevcut, tam.parolaHash))) {
    await denetimYaz(k.id, 'parola.degistirme_basarisiz', 'kullanici', k.id);
    return { hata: 'Mevcut parola hatalı.' };
  }

  await prisma.kullanici.update({
    where: { id: k.id }, data: { parolaHash: await parolaHashle(yeni) },
  });
  await digerOturumlariDusur(k.id);

  await denetimYaz(k.id, 'parola.degistirildi', 'kullanici', k.id);
  tazele('/panel/profil', '/panel/guvenlik');
  return { tamam: true };
}

export async function cikisYap() {
  await oturumKapat();
  redirect('/giris');
}


/* ---------------- Proje düzenleme ---------------- */

export interface ProjeSonucu { hata?: string; alan?: string; tamam?: boolean }

/**
 * Projenin ticari alanlarını günceller.
 *
 * FİYAT ARALIĞI, tek fiyat değil: projede 1+1 ile 4+1 arasında kat kat
 * fark var ve kartta "…'den başlayan" yazıyor. Üst uç boş
 * bırakılabiliyor — firmaların çoğu yalnızca başlangıç fiyatı
 * açıklıyor.
 */
export async function projeGuncelle(_onceki: ProjeSonucu | null, form: FormData): Promise<ProjeSonucu> {
  const k = await girisZorunlu();
  const projeId = String(form.get('projeId') ?? '');
  if (!(await projeYetkisi(k, projeId))) return { hata: 'Bu proje üzerinde yetkiniz yok.' };

  const sayi = (ad: string) => Number(form.get(ad) ?? 0);
  const fiyatMin = sayi('fiyatMin');
  const fiyatMaxHam = sayi('fiyatMax');
  const pesinatOrani = sayi('pesinatOrani');
  const taksitAyi = sayi('taksitAyi');
  const aidatHam = sayi('aidat');
  const ilerlemeYuzde = sayi('ilerlemeYuzde');

  if (fiyatMin <= 0) return { hata: 'Başlangıç fiyatı sıfırdan büyük olmalı.' };
  /* Üst uç BOŞ BIRAKILABİLİR (0 = belirtilmedi) ama girildiyse alt
     ucun altında olamaz — tersi bir aralık, karttaki "şundan şuna"
     ifadesini anlamsız yapıyor. */
  if (fiyatMaxHam > 0 && fiyatMaxHam < fiyatMin) {
    return { hata: 'Üst fiyat, başlangıç fiyatından küçük olamaz.' };
  }
  if (pesinatOrani < 0 || pesinatOrani > 100) return { hata: 'Peşinat oranı %0–100 arasında olmalı.' };
  if (taksitAyi < 0 || taksitAyi > 360) return { hata: 'Vade 0–360 ay arasında olmalı.' };
  if (aidatHam < 0) return { hata: 'Aidat negatif olamaz.' };
  if (ilerlemeYuzde < 0 || ilerlemeYuzde > 100) return { hata: 'İnşaat ilerlemesi %0–100 arasında olmalı.' };

  const ozet = String(form.get('ozet') ?? '').trim();
  if (ozet.length < 40) return { hata: 'Proje açıklaması en az 40 karakter olmalı.' };

  const yayinda = form.get('yayinda') === 'on';
  const durum = (PROJE_DURUMLARI as readonly string[]).includes(String(form.get('durum')))
    ? String(form.get('durum')) as ProjeDurumu
    : 'SATISTA';

  const teslim = dUTC(String(form.get('teslimTarihi') ?? '') || null);
  const baslangic = dUTC(String(form.get('baslangicTarihi') ?? '') || null);

  const oncesi = await prisma.proje.findUnique({
    where: { id: projeId },
    select: { fiyatMin: true, yayinda: true, durum: true, slug: true },
  });

  await prisma.proje.update({
    where: { id: projeId },
    data: {
      fiyatMin,
      fiyatMax: fiyatMaxHam > 0 ? fiyatMaxHam : null,
      pesinatOrani,
      taksitAyi,
      krediyeUygun: form.get('krediyeUygun') === 'on',
      takas: form.get('takas') === 'on',
      aidat: aidatHam > 0 ? aidatHam : null,
      ilerlemeYuzde,
      teslimTarihi: teslim,
      baslangicTarihi: baslangic,
      tapuDurumu: (TAPU_DURUMLARI as readonly string[]).includes(String(form.get('tapuDurumu')))
        ? String(form.get('tapuDurumu')) as TapuDurumu
        : null,
      ozet,
      durum,
      yayinda,
      sec: String(form.get('sec') ?? '').trim() || null,
      oneCikan: form.get('oneCikan') === 'on',
    },
  });

  await denetimYaz(k.id, 'proje.guncelle', 'proje', projeId, {
    fiyatOnce: oncesi?.fiyatMin, fiyatSonra: fiyatMin,
    durumOnce: oncesi?.durum, durumSonra: durum,
    yayindaOnce: oncesi?.yayinda, yayindaSonra: yayinda,
  });
  tazele('/panel/projeler', '/yonetim/projeler', `/proje/${oncesi?.slug}`);
  return { tamam: true };
}

/* ---------------- Daire tipleri ---------------- */

/**
 * Daire tipi ekler ya da günceller.
 *
 * PROJENİN GERÇEK SATIŞ BİRİMİ BU. Ziyaretçi projeyi değil daire
 * tipini soruyor ("3+1 var mı, kaça?") ve talep formu bu tipe
 * bağlanıyor — satış ekibi telefonu açmadan önce hangi tipe
 * bakıldığını biliyor.
 *
 * `id` boşsa yeni kayıt açılıyor; doluysa güncelleniyor. İki ayrı
 * eylem tutmak, formun iki kopyasını doğurmuş olurdu.
 */
export async function daireTipiKaydet(
  _onceki: ProjeSonucu | null, form: FormData,
): Promise<ProjeSonucu> {
  const k = await girisZorunlu();
  const projeId = String(form.get('projeId') ?? '');
  if (!(await projeYetkisi(k, projeId))) return { hata: 'Bu proje üzerinde yetkiniz yok.' };

  const metin = (a: string) => String(form.get(a) ?? '').trim();
  const sayi = (a: string) => Number(form.get(a) ?? 0);

  const ad = metin('ad');
  const odaSayisi = metin('odaSayisi');
  const brutM2 = sayi('brutM2');
  const netM2Ham = sayi('netM2');
  const banyo = Math.max(1, sayi('banyo'));

  if (ad.length < 1) return { hata: 'Daire tipi adı gerekli (örn. "2+1").' };
  /* Oda sayısı METİN: "4.5+1" gerçek ve aranan bir kategori, sayıya
     indirgemek onu ya 4'e ya 5'e yuvarlamak demekti. Biçim yine de
     denetleniyor — serbest metin, filtreyi işlevsiz kılıyor. */
  if (!/^(stüdyo|studyo|\d+(\.\d)?\+\d+)$/i.test(odaSayisi)) {
    return { hata: 'Oda sayısı "2+1", "4.5+1" ya da "stüdyo" biçiminde olmalı.', alan: 'odaSayisi' };
  }
  if (brutM2 < 15) return { hata: 'Brüt alan en az 15 m² olmalı.', alan: 'brutM2' };
  /* Net alan brütten büyük olamaz: en sık yapılan veri girişi hatası
     ve alıcının en çok baktığı iki rakamdan biri. */
  if (netM2Ham > 0 && netM2Ham > brutM2) {
    return { hata: 'Net alan brüt alandan büyük olamaz.', alan: 'netM2' };
  }

  const fiyatMinHam = sayi('fiyatMin');
  const fiyatMaxHam = sayi('fiyatMax');
  if (fiyatMinHam > 0 && fiyatMaxHam > 0 && fiyatMaxHam < fiyatMinHam) {
    return { hata: 'Üst fiyat alt fiyattan küçük olamaz.', alan: 'fiyatMax' };
  }

  const adetHam = sayi('adet');
  const kalanHam = sayi('kalanAdet');
  if (adetHam > 0 && kalanHam > adetHam) {
    return { hata: 'Kalan adet, toplam adetten fazla olamaz.', alan: 'kalanAdet' };
  }

  const veri = {
    projeId,
    ad,
    odaSayisi,
    banyo,
    brutM2,
    netM2: netM2Ham > 0 ? netM2Ham : null,
    nitelik: metin('nitelik') || null,
    fiyatMin: fiyatMinHam > 0 ? fiyatMinHam : null,
    fiyatMax: fiyatMaxHam > 0 ? fiyatMaxHam : null,
    adet: adetHam > 0 ? adetHam : null,
    /* Kalan adet SIFIR OLABİLİR ve sıfır anlamlı: "tükendi" rozeti
       ondan basılıyor. `> 0` kontrolü sıfırı null'a çevirip tipi
       "bilinmiyor"a düşürürdü. */
    kalanAdet: form.get('kalanAdet') != null && String(form.get('kalanAdet')).trim() !== ''
      ? Math.max(0, kalanHam) : null,
    katPlaniUrl: metin('katPlaniUrl') || null,
    katPlaniAlt: metin('katPlaniAlt') || null,
    sira: sayi('sira'),
    yayinda: form.get('yayinda') !== 'off',
  };

  if (veri.katPlaniUrl && !/^https?:\/\//.test(veri.katPlaniUrl)) {
    return { hata: 'Kat planı adresi http(s) ile başlamalı.', alan: 'katPlaniUrl' };
  }
  /* Kat planı varsa alt metni ZORUNLU: proje sayfasındaki en çok
     tıklanan görsel bu ve alt metinsiz bir plan, ekran okuyucu
     kullanan biri için hiç yok demek. */
  if (veri.katPlaniUrl && (veri.katPlaniAlt ?? '').length < 5) {
    return { hata: 'Kat planının alt metni olmalı (en az 5 karakter).', alan: 'katPlaniAlt' };
  }

  const id = metin('id');
  try {
    if (id) {
      const mevcut = await prisma.daireTipi.findUnique({
        where: { id }, select: { projeId: true },
      });
      if (!mevcut || mevcut.projeId !== projeId) return { hata: 'Daire tipi bulunamadı.' };
      await prisma.daireTipi.update({ where: { id }, data: veri });
    } else {
      await prisma.daireTipi.create({ data: veri });
    }
  } catch (e) {
    console.error('Daire tipi kaydedilemedi:', e);
    return { hata: 'Daire tipi kaydedilemedi.' };
  }

  await denetimYaz(k.id, id ? 'daire.guncelle' : 'daire.olustur', 'proje', projeId, { ad });
  tazele('/panel/projeler', '/yonetim/projeler');
  return { tamam: true };
}

/**
 * Daire tipini siler.
 *
 * TALEBİ OLAN TİP SİLİNMİYOR. Talep `SetNull` ile bağlı — veritabanı
 * reddetmez, tipi siler ve satış ekibinin elindeki "bu kişi hangi
 * daireyi sordu" bilgisini sessizce yok eder. Yayından kaldırmak
 * doğru yol: tip sitede görünmez, talepler bağlamını korur.
 */
export async function daireTipiSil(id: string): Promise<{ hata?: string }> {
  const k = await girisZorunlu();
  const d = await prisma.daireTipi.findUnique({
    where: { id },
    select: { projeId: true, ad: true, _count: { select: { talepler: true } } },
  });
  if (!d) return { hata: 'Daire tipi bulunamadı.' };
  if (!(await projeYetkisi(k, d.projeId))) return { hata: 'Bu proje üzerinde yetkiniz yok.' };

  if (d._count.talepler > 0) {
    return {
      hata: `Bu daire tipine bağlı ${d._count.talepler} talep var. `
        + 'Silmek yerine yayından kaldırın; sitede görünmez, talepler bağlamıyla kalır.',
    };
  }

  await prisma.daireTipi.delete({ where: { id } });
  await denetimYaz(k.id, 'daire.sil', 'proje', d.projeId, { ad: d.ad });
  tazele('/panel/projeler', '/yonetim/projeler');
  return {};
}


/* ---------------- Mesajlaşma ---------------- */

export interface MesajSonucu { hata?: string; tamam?: boolean }

/** Panelden yanıt — firma yetkilisi veya admin. */
export async function mesajYanitla(_onceki: MesajSonucu | null, form: FormData): Promise<MesajSonucu> {
  const k = await girisZorunlu();
  const konusmaId = String(form.get('konusmaId') ?? '');
  const metin = String(form.get('metin') ?? '').trim();
  if (metin.length < 2) return { hata: 'Yanıt boş olamaz.' };

  const konusma = await prisma.konusma.findUnique({ where: { id: konusmaId }, select: { id: true, projeId: true } });
  if (!konusma) return { hata: 'Konuşma bulunamadı.' };
  if (!(await projeYetkisi(k, konusma.projeId))) return { hata: 'Bu konuşmada yetkiniz yok.' };

  await prisma.$transaction([
    prisma.mesaj.create({ data: { konusmaId, yazarId: k.id, soranMi: false, metin } }),
    prisma.konusma.update({ where: { id: konusmaId }, data: { durum: 'YANITLANDI', okundu: true } }),
  ]);

  await denetimYaz(k.id, 'mesaj.yanit', 'konusma', konusmaId);
  await soruYanitBildirimi(konusmaId, metin);
  tazele('/panel/mesajlar', '/yonetim/mesajlar');
  return { tamam: true };
}

export async function konusmaDurumDegistir(konusmaId: string, durum: 'ACIK' | 'YANITLANDI' | 'KAPALI') {
  const k = await girisZorunlu();
  const konusma = await prisma.konusma.findUnique({ where: { id: konusmaId }, select: { projeId: true } });
  if (!konusma) return { hata: 'Konuşma bulunamadı.' };
  if (!(await projeYetkisi(k, konusma.projeId))) return { hata: 'Yetkiniz yok.' };

  await prisma.konusma.update({ where: { id: konusmaId }, data: { durum, okundu: true } });
  tazele('/panel/mesajlar', '/yonetim/mesajlar');
  return { tamam: true };
}

/** Ziyaretçinin proje sayfasından soru göndermesi — oturum gerektirmez. */
export async function soruGonder(_onceki: MesajSonucu | null, form: FormData): Promise<MesajSonucu> {
  const projeSlug = String(form.get('projeSlug') ?? '');
  const ad = String(form.get('ad') ?? '').trim();
  const eposta = String(form.get('eposta') ?? '').trim().toLowerCase();
  const metin = String(form.get('metin') ?? '').trim();

  if (ad.length < 3) return { hata: 'Adınızı girin.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta)) return { hata: 'Geçerli bir e-posta girin.' };
  if (metin.length < 10) return { hata: 'Sorunuzu biraz daha açar mısınız?' };
  if (metin.length > 2000) return { hata: 'Soru çok uzun (en fazla 2000 karakter).' };

  // Form oturum gerektirmiyor — spam'e açık. Firmaya giden her soru
  // bir bildirim tetiklediği için sınırsız bırakmak aynı zamanda
  // e-posta itibarımızı da riske atar.
  const soruSinir = await sinirKontrol('soru', await istekIp());
  if (!soruSinir.izin) return { hata: soruSinir.mesaj ?? 'Çok fazla soru gönderildi.' };

  const proje = await prisma.proje.findFirst({ where: { slug: projeSlug, yayinda: true }, select: { id: true, ad: true } });
  if (!proje) return { hata: 'Proje bulunamadı.' };

  const konusma = await prisma.konusma.create({
    data: {
      projeId: proje.id,
      soranAd: ad,
      soranEposta: eposta,
      konu: `${proje.ad} hakkında soru`,
      mesajlar: { create: [{ soranMi: true, metin }] },
    },
  });

  await yeniSoruBildirimi(konusma.id);
  tazele('/panel/mesajlar', '/yonetim/mesajlar');
  return { tamam: true };
}

/* ---------------- Admin: kullanıcı yönetimi ---------------- */

export interface KullaniciSonucu { hata?: string; tamam?: boolean; gecici?: string }

export async function kullaniciOlustur(_onceki: KullaniciSonucu | null, form: FormData): Promise<KullaniciSonucu> {
  const admin = await adminZorunlu();
  const ad = String(form.get('ad') ?? '').trim();
  const eposta = String(form.get('eposta') ?? '').trim().toLowerCase();
  const rol = form.get('rol') === 'ADMIN' ? 'ADMIN' as const : 'FIRMA' as const;
  const firmaId = String(form.get('firmaId') ?? '') || null;

  if (ad.length < 3) return { hata: 'Ad en az 3 karakter olmalı.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta)) return { hata: 'Geçerli bir e-posta girin.' };
  if (await prisma.kullanici.findUnique({ where: { eposta } })) {
    return { hata: 'Bu e-posta zaten kayıtlı.' };
  }
  if (rol === 'FIRMA' && !firmaId) {
    return { hata: 'Firma rolü için bir firma kaydı seçin.' };
  }

  // Geçici parola üretilir; kullanıcıya güvenli kanaldan iletilmeli.
  const gecici = Array.from(crypto.getRandomValues(new Uint8Array(9)))
    .map((b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');

  const yeni = await prisma.kullanici.create({
    data: { ad, eposta, rol, parolaHash: await parolaHashle(gecici), firmaId },
  });

  await denetimYaz(admin.id, 'kullanici.olustur', 'kullanici', yeni.id, { eposta, rol });
  await hesapBildirimi(yeni.id, gecici, true);
  tazele('/yonetim/kullanicilar');
  return { tamam: true, gecici };
}

export async function kullaniciAktiflik(kullaniciId: string, aktif: boolean) {
  const admin = await adminZorunlu();
  if (kullaniciId === admin.id) return { hata: 'Kendi hesabınızı kapatamazsınız.' };

  await prisma.kullanici.update({ where: { id: kullaniciId }, data: { aktif } });
  // Hesap kapatılıyorsa açık oturumları da düşür
  if (!aktif) await prisma.oturum.deleteMany({ where: { kullaniciId } });

  await denetimYaz(admin.id, aktif ? 'kullanici.ac' : 'kullanici.kapat', 'kullanici', kullaniciId);
  tazele('/yonetim/kullanicilar');
  return { tamam: true };
}

export async function parolaSifirla(kullaniciId: string) {
  const admin = await adminZorunlu();
  const gecici = Array.from(crypto.getRandomValues(new Uint8Array(9)))
    .map((b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');

  await prisma.kullanici.update({
    where: { id: kullaniciId },
    data: { parolaHash: await parolaHashle(gecici) },
  });
  await prisma.oturum.deleteMany({ where: { kullaniciId } });

  await denetimYaz(admin.id, 'kullanici.parolaSifirla', 'kullanici', kullaniciId);
  await hesapBildirimi(kullaniciId, gecici, false);
  tazele('/yonetim/kullanicilar');
  return { tamam: true, gecici };
}


/* ---------------- Admin: bölge içeriği ---------------- */

export async function bolgeGuncelle(_onceki: ProjeSonucu | null, form: FormData): Promise<ProjeSonucu> {
  const admin = await adminZorunlu();
  const id = String(form.get('bolgeId') ?? '');
  const ozet = String(form.get('ozet') ?? '').trim();
  const adet = Number(form.get('adet') ?? 0);
  const yayinda = form.get('yayinda') === 'on';

  if (ozet.length < 40) return { hata: 'Bölge özeti en az 40 karakter olmalı.' };
  if (adet < 0) return { hata: 'Proje sayısı negatif olamaz.' };

  /* SIK SORULANLAR bölge sayfasında zaten basılıyor (FAQ şeması
     dâhil) ama panelde düzenlenemiyordu: tablo doluysa görünüyor,
     boşsa bölüm hiç çıkmıyordu ve içerik ekibinin elinde bir yol
     yoktu. Biçim kurumsal sayfalardakiyle aynı: her satırda
     `soru | cevap`.

     Kayıt TAMAMEN DEĞİŞTİRİYOR (sil-yaz): satır bazlı eşleme, sırayı
     korumak için ayrı bir kimlik alanı istiyor; metin kutusunda
     sıra zaten kullanıcı elinde. */
  const sssHam = String(form.get('sss') ?? '');
  const sssSatirlari = sssCozumle(sssHam);

  const b = await prisma.$transaction(async (tx) => {
    const guncel = await tx.bolge.update({
      where: { id }, data: { ozet, adet, yayinda }, select: { slug: true },
    });
    await tx.bolgeSss.deleteMany({ where: { bolgeId: id } });
    if (sssSatirlari.length) {
      await tx.bolgeSss.createMany({
        data: sssSatirlari.map((x, i) => ({ bolgeId: id, soru: x.s, cevap: x.c, sira: i })),
      });
    }
    return guncel;
  });
  await denetimYaz(admin.id, 'bolge.guncelle', 'bolge', id, { sss: sssSatirlari.length });
  tazele('/yonetim/bolgeler', `/projeler/${b.slug}`, '/bolgeler');
  return { tamam: true };
}

/* ---------------- Gönderim engelleri ---------------- */

/**
 * Engeli kaldırır — yalnızca yönetici.
 *
 * Otomatik kaldırma bilinçli olarak yok: engel, sağlayıcının "bu adres
 * yok" ya da alıcının "bu spam" demesiyle oluşuyor. Kendiliğinden
 * kalkması, engellemenin anlamını ortadan kaldırırdı.
 */
export async function engelKaldirEylem(kanal: string, adres: string): Promise<{ hata?: string }> {
  const k = await adminZorunlu();
  if (kanal !== 'EPOSTA' && kanal !== 'SMS') return { hata: 'Geçersiz kanal.' };

  const oldu = await engelKaldir(kanal, adres);
  if (!oldu) return { hata: 'Kayıt bulunamadı.' };

  await denetimYaz(k.id, 'engel.kaldirildi', 'gonderim_engeli', undefined, { kanal, adres });
  tazele('/yonetim/guvenlik', '/yonetim/bildirimler');
  return {};
}


/* ---------------- Tarih aralıklı fiyat kuralı ---------------- */


/* ---------------- Hak ediş ---------------- */


/* ---------------- Proje oluşturma (yalnızca yönetim) ---------------- */

export interface ProjeOlusturSonucu {
  hata?: string;
  alan?: string;
  slug?: string;
  /**
   * Hatada forma geri yazılan değerler.
   * React 19 eylem bitince formu sıfırlıyor; yirmi alanlık bir formda
   * tek bir hatalı koordinat yüzünden her şey baştan doldurulmasın.
   */
  degerler?: Record<string, string>;
  /** İşaretli kalması gereken özellik kodları */
  ozellikler?: string[];
}

/**
 * Yeni proje kaydı açar.
 *
 * YAYINA ALMADAN açılıyor (`yayinda: false`). Sitenin temel vaadi her
 * projeyi ekibin yerinde görmesi; kayıt açıldığı anda yayına
 * girseydi bu vaat yalnızca bir niyet beyanı olurdu. Yayına alma ayrı
 * ve bilinçli bir adım.
 *
 * GÖRSEL ZORUNLU: alt metniyle birlikte en az bir görsel. Görselsiz
 * proje hem dönüşüm hem erişilebilirlik açısından yayınlanamaz.
 *
 * DAİRE TİPİ BURADA İSTENMİYOR. Projenin gerçek satış birimi o ama
 * lansman öncesinde çoğu zaman henüz belli değil; kayıt açmayı daire
 * tipine bağlamak, "yakında" aşamasındaki projeyi hiç açtırmazdı.
 * Tipler `daireTipiKaydet` ile sonradan ekleniyor ve yayına alma
 * kapısı en az bir tip arıyor.
 */
export async function projeOlustur(
  _onceki: ProjeOlusturSonucu | null,
  form: FormData,
): Promise<ProjeOlusturSonucu> {
  const k = await adminZorunlu();

  const metin = (a: string) => String(form.get(a) ?? '').trim();
  const sayi = (a: string) => Number(form.get(a) ?? 0);

  const ad = metin('ad');
  const bolgeId = metin('bolgeId');
  const firmaId = metin('firmaId');
  const mahalle = metin('mahalle');
  const ozet = metin('ozet');

  // Girilenler her hata dönüşüne iliştirilir; form baştan doldurulmasın
  const degerler: Record<string, string> = {};
  for (const [alanAdi, deger] of form.entries()) {
    if (alanAdi !== 'ozellik' && typeof deger === 'string') degerler[alanAdi] = deger;
  }
  const seciliOzellikler = form.getAll('ozellik').map(String);
  const hata = (mesaj: string, alan?: string): ProjeOlusturSonucu =>
    ({ hata: mesaj, alan, degerler, ozellikler: seciliOzellikler });

  if (ad.length < 3) return hata('Proje adı en az 3 karakter olmalı.', 'ad');
  if (!bolgeId) return hata('Bölge seçin.', 'bolgeId');
  if (!firmaId) return hata('Geliştirici firma seçin.', 'firmaId');
  if (mahalle.length < 2) return hata('Mahalle girin.', 'mahalle');
  if (ozet.length < 40) return hata('Açıklama en az 40 karakter olmalı.', 'ozet');

  const lat = sayi('lat');
  const lng = sayi('lng');
  // Türkiye sınırları — kaba ama sıfır/ters koordinat hatasını yakalıyor
  if (!(lat >= 35.5 && lat <= 42.5)) return hata('Enlem 35,5–42,5 arasında olmalı (Türkiye).', 'lat');
  if (!(lng >= 25.5 && lng <= 45)) return hata('Boylam 25,5–45 arasında olmalı (Türkiye).', 'lng');

  const tip = (PROJE_TIPLERI as readonly string[]).includes(metin('tip'))
    ? metin('tip') as ProjeTipi : 'KONUT';
  const durum = (PROJE_DURUMLARI as readonly string[]).includes(metin('durum'))
    ? metin('durum') as ProjeDurumu : 'SATISTA';

  const fiyatMin = sayi('fiyatMin');
  const fiyatMaxHam = sayi('fiyatMax');
  if (fiyatMin <= 0) return hata('Başlangıç fiyatı sıfırdan büyük olmalı.', 'fiyatMin');
  if (fiyatMaxHam > 0 && fiyatMaxHam < fiyatMin) {
    return hata('Üst fiyat, başlangıç fiyatından küçük olamaz.', 'fiyatMax');
  }

  const pesinatOrani = sayi('pesinatOrani');
  const taksitAyi = sayi('taksitAyi');
  if (pesinatOrani < 0 || pesinatOrani > 100) return hata('Peşinat oranı %0–100 arasında olmalı.', 'pesinatOrani');
  if (taksitAyi < 0 || taksitAyi > 360) return hata('Vade 0–360 ay arasında olmalı.', 'taksitAyi');

  const ilerlemeYuzde = sayi('ilerlemeYuzde');
  if (ilerlemeYuzde < 0 || ilerlemeYuzde > 100) {
    return hata('İnşaat ilerlemesi %0–100 arasında olmalı.', 'ilerlemeYuzde');
  }

  const teslimTarihi = dUTC(metin('teslimTarihi') || null);
  const baslangicTarihi = dUTC(metin('baslangicTarihi') || null);
  /* Teslim, inşaat başlangıcından önce olamaz. Bariz görünüyor ama
     iki tarihi ayrı alanlarda girerken en sık yapılan hata bu ve
     sonucu, kartta "geçmişte teslim edilecek" yazan bir proje. */
  if (teslimTarihi && baslangicTarihi && teslimTarihi < baslangicTarihi) {
    return hata('Teslim tarihi, inşaat başlangıcından önce olamaz.', 'teslimTarihi');
  }

  // Fotoğraflar: her satır "url|alt metni"
  const fotoHam = metin('fotograflar').split('\n').map((s) => s.trim()).filter(Boolean);
  const fotograflar = fotoHam.map((satir) => {
    const [url, ...alt] = satir.split('|');
    return { url: url.trim(), alt: alt.join('|').trim() };
  });
  if (fotograflar.length === 0) return hata('En az bir görsel ekleyin.', 'fotograflar');
  for (const f of fotograflar) {
    if (!/^https?:\/\//.test(f.url)) {
      return hata(`Görsel adresi http(s) ile başlamalı: ${f.url.slice(0, 40)}`, 'fotograflar');
    }
    if (f.alt.length < 5) {
      return hata(
        `Her görselin alt metni olmalı (en az 5 karakter): ${f.url.slice(0, 40)}`,
        'fotograflar',
      );
    }
  }

  const ozellikKodlari = form.getAll('ozellik').map(String).filter(Boolean);

  const slug = await benzersizSlug(ad, async (s) =>
    (await prisma.proje.count({ where: { slug: s } })) > 0);

  try {
    const proje = await prisma.$transaction(async (tx) => {
      const v = await tx.proje.create({
        data: {
          slug, ad, bolgeId, firmaId, mahalle, lat, lng,
          tip, durum,
          adres: metin('adres') || null,
          fiyatMin,
          fiyatMax: fiyatMaxHam > 0 ? fiyatMaxHam : null,
          pesinatOrani,
          taksitAyi,
          krediyeUygun: form.get('krediyeUygun') !== 'off',
          takas: form.get('takas') === 'on',
          aidat: sayi('aidat') > 0 ? sayi('aidat') : null,
          tapuDurumu: (TAPU_DURUMLARI as readonly string[]).includes(metin('tapuDurumu'))
            ? metin('tapuDurumu') as TapuDurumu : null,
          blokSayisi: sayi('blokSayisi') > 0 ? sayi('blokSayisi') : null,
          katSayisi: sayi('katSayisi') > 0 ? sayi('katSayisi') : null,
          toplamBagimsizBolum: sayi('toplamBagimsizBolum') > 0 ? sayi('toplamBagimsizBolum') : null,
          arsaM2: sayi('arsaM2') > 0 ? sayi('arsaM2') : null,
          insaatAlaniM2: sayi('insaatAlaniM2') > 0 ? sayi('insaatAlaniM2') : null,
          yesilAlanOrani: sayi('yesilAlanOrani') > 0 ? sayi('yesilAlanOrani') : null,
          baslangicTarihi,
          teslimTarihi,
          ilerlemeYuzde,
          ozet,
          sec: metin('sec') || null,
          // Yayına alma ayrı bir adım — bkz. fonksiyon açıklaması
          yayinda: false,
          yayinTarihi: new Date(),
        },
      });

      await tx.medya.createMany({
        data: fotograflar.map((f, i) => ({
          projeId: v.id, url: f.url, alt: f.alt, sira: i,
          tip: i === 0 ? 'DIS_CEPHE' as const : 'IC_MEKAN' as const,
        })),
      });

      if (ozellikKodlari.length) {
        const ozellikler = await tx.ozellik.findMany({
          where: { kod: { in: ozellikKodlari } }, select: { id: true },
        });
        await tx.projeOzellik.createMany({
          data: ozellikler.map((o) => ({ projeId: v.id, ozellikId: o.id })),
        });
      }
      return v;
    });

    await denetimYaz(k.id, 'proje.olusturuldu', 'proje', proje.id, { ad, slug });
    tazele('/yonetim/projeler', '/panel/projeler');
    return { slug };
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m.includes('Unique constraint')) return hata('Bu slug zaten kullanımda.', 'ad');
    console.error('Proje oluşturulamadı:', e);
    return hata('Proje oluşturulamadı.');
  }
}

/**
 * Projeyi yayına alır veya yayından kaldırır.
 *
 * Yayına almadan önce görsel, açıklama ve DAİRE TİPİ kontrolü
 * yapılıyor. Daire tipi olmayan bir proje sayfası, ziyaretçinin tek
 * sorusuna ("hangi tipler var, kaça?") cevap vermiyor ve talep formu
 * boşa çalışıyor — eksik sayfanın canlıya çıkması doğrulama vaadini
 * de boşa düşürür.
 */
export async function projeYayinDurumu(
  projeId: string, yayinda: boolean,
): Promise<{ hata?: string }> {
  const k = await adminZorunlu();

  if (yayinda) {
    const v = await prisma.proje.findUnique({
      where: { id: projeId },
      select: {
        ozet: true,
        medya: { select: { alt: true, altOtomatik: true, sira: true } },
        _count: { select: { daireTipleri: { where: { yayinda: true } } } },
      },
    });
    if (!v) return { hata: 'Proje bulunamadı.' };
    if (v.ozet.trim().length < 40) return { hata: 'Açıklama en az 40 karakter olmalı.' };
    if (v._count.daireTipleri === 0) {
      return { hata: 'Yayına almadan önce en az bir daire tipi ekleyin.' };
    }

    // Görsel ve alt metin kuralları `lib/alt-metin.ts` içinde —
    // aynı kurallar panelde de gösteriliyor, iki yerde yazılmamalı.
    const kapi = yayinKapisi(v.medya);
    if (kapi.hata) return kapi;
  }

  await prisma.proje.update({ where: { id: projeId }, data: { yayinda } });
  await denetimYaz(k.id, yayinda ? 'proje.yayinlandi' : 'proje.yayindan_kaldirildi', 'proje', projeId);
  tazele('/yonetim/projeler', '/panel/projeler');
  return {};
}

/** Projeye görsel ekler (yalnızca yönetim). */
export async function projeGorselEkle(
  projeId: string, url: string, alt: string,
): Promise<{ hata?: string }> {
  const k = await adminZorunlu();
  if (!/^https?:\/\//.test(url.trim())) return { hata: 'Adres http(s) ile başlamalı.' };
  if (alt.trim().length < 5) return { hata: 'Alt metni en az 5 karakter olmalı.' };

  const son = await prisma.medya.findFirst({
    where: { projeId }, orderBy: { sira: 'desc' }, select: { sira: true },
  });
  await prisma.medya.create({
    data: { projeId, url: url.trim(), alt: alt.trim(), sira: (son?.sira ?? -1) + 1 },
  });
  await denetimYaz(k.id, 'proje.gorsel_eklendi', 'proje', projeId);
  tazele('/yonetim/projeler');
  return {};
}

/** Görsel siler — yayındaki projenin son görseli silinemez. */
export async function projeGorselSil(medyaId: string): Promise<{ hata?: string }> {
  const k = await adminZorunlu();
  const m = await prisma.medya.findUnique({
    where: { id: medyaId },
    select: {
      projeId: true, depoAnahtar: true,
      proje: { select: { yayinda: true, _count: { select: { medya: true } } } },
    },
  });
  if (!m) return { hata: 'Fotoğraf bulunamadı.' };
  if (m.proje.yayinda && m.proje._count.medya <= 1) {
    return { hata: 'Yayındaki projenin son görseli silinemez.' };
  }

  await prisma.medya.delete({ where: { id: medyaId } });

  /* Dosya SATIRDAN SONRA siliniyor. Ters sırada olsaydı, dosya silinip
     satır silinemediğinde panelde duran ama açılmayan bir fotoğraf
     kalırdı. Bu sırada en kötü ihtimal depoda sahipsiz bir dosya —
     görünürde bir bozukluk değil. */
  if (m.depoAnahtar) await depo()?.sil(m.depoAnahtar).catch(() => {});

  await denetimYaz(k.id, 'proje.gorsel_silindi', 'proje', m.projeId);
  tazele('/yonetim/projeler');
  return {};
}

/** Projenin özelliklerini toplu günceller (yalnızca yönetim). */
export async function projeOzellikGuncelle(
  projeId: string, kodlar: string[],
): Promise<{ hata?: string }> {
  const k = await adminZorunlu();
  const ozellikler = await prisma.ozellik.findMany({
    where: { kod: { in: kodlar } }, select: { id: true },
  });

  await prisma.$transaction([
    prisma.projeOzellik.deleteMany({ where: { projeId } }),
    prisma.projeOzellik.createMany({
      data: ozellikler.map((o) => ({ projeId, ozellikId: o.id })),
    }),
  ]);

  await denetimYaz(k.id, 'proje.ozellik_guncellendi', 'proje', projeId, { adet: kodlar.length });
  tazele('/yonetim/projeler');
  return {};
}

/* ---------------- Proje kimliği ve konumu (yalnızca yönetim) ---------------- */

export interface ProjeKimlikSonucu {
  hata?: string;
  alan?: string;
  tamam?: boolean;
  /** Ad değiştiyse yeni adres; panel buraya yönlendiriyor */
  slug?: string;
  /** Slug değiştiyse eski adresin yönlendirildiği bilgisi */
  eskiSlug?: string;
  degerler?: Record<string, string>;
}

/**
 * Projenin adını, firmasını, bölgesini ve konumunu günceller.
 *
 * YALNIZCA YÖNETİM. Firma kendi projesinin fiyatını, teslim tarihini ve
 * daire tiplerini değiştirebiliyor ama adını, bölgesini ve koordinatını
 * değiştiremiyor: bunlar ekibin yerinde doğruladığı bilgiler ve arama
 * sonuçlarının dayanağı. Firma projeyi "Kartal"dan "Ataşehir"e
 * taşıyabilseydi bölge sayfaları anlamını yitirirdi.
 *
 * Ad değişirse slug da değişiyor ve ESKİ SLUG saklanıyor; proje rotası
 * eski adresi kalıcı yönlendirmeyle (Next `permanentRedirect` → 308,
 * Google bunu 301 gibi işliyor) yenisine gönderiyor. Talep onay
 * e-postalarındaki ve reklam bağlantılarındaki adresler kırılmamalı.
 */
export async function projeKimlikGuncelle(
  _onceki: ProjeKimlikSonucu | null,
  form: FormData,
): Promise<ProjeKimlikSonucu> {
  const k = await adminZorunlu();
  const projeId = String(form.get('projeId') ?? '');

  const al = (a: string) => String(form.get(a) ?? '').trim();
  const ad = al('ad');
  const bolgeId = al('bolgeId');
  const firmaId = al('firmaId');
  const mahalle = al('mahalle');
  const lat = Number(form.get('lat') ?? 0);
  const lng = Number(form.get('lng') ?? 0);

  const degerler: Record<string, string> = {
    ad, bolgeId, firmaId, mahalle, adres: al('adres'), tip: al('tip'),
    lat: al('lat'), lng: al('lng'),
  };
  const hata = (mesaj: string, alan?: string): ProjeKimlikSonucu =>
    ({ hata: mesaj, alan, degerler });

  const mevcut = await prisma.proje.findUnique({
    where: { id: projeId },
    select: { slug: true, ad: true, bolgeId: true, yayinda: true },
  });
  if (!mevcut) return hata('Proje bulunamadı.');

  if (ad.length < 3) return hata('Proje adı en az 3 karakter olmalı.', 'ad');
  if (!bolgeId) return hata('Bölge seçin.', 'bolgeId');
  if (!firmaId) return hata('Firma seçin.', 'firmaId');
  if (mahalle.length < 2) return hata('Mahalle girin.', 'mahalle');
  // Türkiye sınırları — kaba ama sıfır/ters koordinat hatasını yakalıyor
  if (!(lat >= 35.5 && lat <= 42.5)) return hata('Enlem 35,5–42,5 arasında olmalı (Türkiye).', 'lat');
  if (!(lng >= 25.5 && lng <= 45)) return hata('Boylam 25,5–45 arasında olmalı (Türkiye).', 'lng');

  /* Slug yalnızca AD DEĞİŞTİYSE yeniden üretiliyor. Her kayıtta
     üretmek, elle düzeltilmiş bir slug'ı (örneğin kısaltılmış) sessizce
     geri alırdı. */
  let slug = mevcut.slug;
  let eskiSlug: string | undefined;
  if (ad !== mevcut.ad) {
    /* Doluluk kontrolü BAŞKA projelere bakıyor. Projenin kendi eski
       adresi "dolu" sayılsaydı, eski adına geri dönen proje
       `...-2` alırdı; kendi adresini geri alabilmeli. */
    const yeni = await benzersizSlug(ad, async (s) =>
      s !== mevcut.slug
      && ((await prisma.proje.count({ where: { slug: s, id: { not: projeId } } })) > 0
        || (await prisma.projeSlug.count({ where: { slug: s, projeId: { not: projeId } } })) > 0));
    if (yeni !== mevcut.slug) {
      eskiSlug = mevcut.slug;
      slug = yeni;
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (eskiSlug) {
        /* Eski adres yönlendirme tablosuna yazılıyor. `createMany` +
           skipDuplicates: proje daha önce bu adı taşıyıp geri dönmüş
           olabilir; çakışma hata değil. */
        await tx.projeSlug.createMany({
          data: [{ slug: eskiSlug, projeId }],
          skipDuplicates: true,
        });
        // Yeni slug bir yönlendirme kaydıysa kaldırılıyor: adres artık
        // gerçek sayfa, kendine yönlendirme döngü olurdu
        await tx.projeSlug.deleteMany({ where: { slug } });
      }
      await tx.proje.update({
        where: { id: projeId },
        data: {
          ad, slug, bolgeId, firmaId, mahalle, lat, lng,
          adres: al('adres') || null,
          ...((PROJE_TIPLERI as readonly string[]).includes(al('tip'))
            ? { tip: al('tip') as ProjeTipi } : {}),
        },
      });
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m.includes('Unique constraint')) return hata('Bu adres zaten kullanılıyor.', 'ad');
    console.error('Proje kimliği güncellenemedi:', e);
    return hata('Proje güncellenemedi.');
  }

  await denetimYaz(k.id, 'proje.kimlik_guncellendi', 'proje', projeId, {
    ad, eskiSlug: eskiSlug ?? null, slug,
    bolgeDegisti: bolgeId !== mevcut.bolgeId,
  });

  tazele('/yonetim/projeler', '/panel/projeler', `/proje/${slug}`, '/arama', '/bolgeler');
  if (eskiSlug) tazele(`/proje/${eskiSlug}`);
  return { tamam: true, slug, eskiSlug };
}

/* ---------------- Fotoğraf sırası ve alt metni ---------------- */

/**
 * Fotoğrafı bir sıra yukarı/aşağı taşır.
 *
 * Sürükle-bırak yerine düğme: sürükleme klavyeyle kullanılamıyor ve
 * dokunmatikte kaydırma ile çakışıyor. İki düğme her girdi yöntemiyle
 * çalışıyor (bkz. docs/erisilebilirlik.md).
 *
 * İlk sıradaki fotoğraf KAPAK; listede, aramada ve paylaşım
 * görselinde o kullanılıyor.
 */
export async function projeGorselTasi(
  medyaId: string, yon: 'yukari' | 'asagi',
): Promise<{ hata?: string }> {
  const k = await adminZorunlu();
  const m = await prisma.medya.findUnique({
    where: { id: medyaId },
    select: { projeId: true, sira: true, proje: { select: { slug: true } } },
  });
  if (!m) return { hata: 'Fotoğraf bulunamadı.' };

  // Komşu satır: yukarı için sıradan küçük en büyüğü, aşağı için tersi
  const komsu = await prisma.medya.findFirst({
    where: {
      projeId: m.projeId,
      sira: yon === 'yukari' ? { lt: m.sira } : { gt: m.sira },
    },
    orderBy: { sira: yon === 'yukari' ? 'desc' : 'asc' },
    select: { id: true, sira: true },
  });
  if (!komsu) return {};   // uçta; sessizce yok sayılıyor

  /* Sıra alanında benzersizlik kısıtı yok, doğrudan takas edilebiliyor.
     Tek işlemde: yarıda kalırsa iki fotoğraf aynı sırada kalırdı. */
  await prisma.$transaction([
    prisma.medya.update({ where: { id: medyaId }, data: { sira: komsu.sira } }),
    prisma.medya.update({ where: { id: komsu.id }, data: { sira: m.sira } }),
  ]);

  await denetimYaz(k.id, 'proje.gorsel_siralandi', 'proje', m.projeId);
  tazele('/yonetim/projeler', `/proje/${m.proje.slug}`);
  return {};
}

/** Fotoğrafın alt metnini günceller. */
export async function projeGorselAlt(
  medyaId: string, alt: string,
): Promise<{ hata?: string }> {
  const k = await adminZorunlu();

  const mevcut = await prisma.medya.findUnique({
    where: { id: medyaId }, select: { projeId: true },
  });
  if (!mevcut) return { hata: 'Fotoğraf bulunamadı.' };

  /* Aynı projedeki öbür alt metinleri de veriyoruz: kopya alt metin
     tek başına kötü bir metinden daha zararlı, galeriyi gezen kişi
     fotoğrafları birbirinden ayırt edemiyor. */
  const digerleri = (await prisma.medya.findMany({
    where: { projeId: mevcut.projeId, id: { not: medyaId } },
    select: { alt: true },
  })).map((x) => x.alt);

  const d = altMetniDenetle(alt, digerleri);
  if (d.hata) return { hata: d.hata };

  const m = await prisma.medya.update({
    where: { id: medyaId },
    // İnsan yazdı: bir daha otomatik sayılmıyor
    data: { alt: d.temiz, altOtomatik: false },
    select: { projeId: true, proje: { select: { slug: true } } },
  });
  await denetimYaz(k.id, 'proje.gorsel_alt_guncellendi', 'proje', m.projeId);
  tazele('/yonetim/projeler', `/proje/${m.proje.slug}`);
  return {};
}

/**
 * Fotoğraf türünü değiştirir.
 *
 * Alt metnini hâlâ makine yazdıysa tür değişince yeniden üretiliyor:
 * "… — özel havuz ve teras" hiç yoktan iyi ve tür seçmek zaten bir
 * insan kararı. İnsan yazdıysa DOKUNULMUYOR — yazılmış bir cümleyi
 * tür değişti diye ezmek, emeği sessizce silmek olurdu.
 */
export async function projeGorselTip(
  medyaId: string, tip: string,
): Promise<{ hata?: string }> {
  const k = await adminZorunlu();
  if (!MEDYA_TIPLERI.some((t) => t[0] === tip)) return { hata: 'Geçersiz fotoğraf türü.' };

  const m = await prisma.medya.findUnique({
    where: { id: medyaId },
    select: {
      altOtomatik: true, projeId: true,
      proje: { select: { ad: true, mahalle: true, slug: true, bolge: { select: { ad: true } } } },
    },
  });
  if (!m) return { hata: 'Fotoğraf bulunamadı.' };

  const yeniAlt = m.altOtomatik
    ? otomatikAlt(m.proje.ad, m.proje.mahalle, m.proje.bolge.ad, tip)
    : undefined;

  await prisma.medya.update({
    where: { id: medyaId },
    data: { tip: tip as never, ...(yeniAlt ? { alt: yeniAlt } : {}) },
  });
  await denetimYaz(k.id, 'proje.gorsel_tip_guncellendi', 'proje', m.projeId, { tip });
  tazele('/yonetim/projeler', `/proje/${m.proje.slug}`);
  return {};
}

/* ---------------- Toplu içe aktarma (yalnızca yönetim) ---------------- */

export interface IceAktarSonucu {
  hata?: string;
  onizleme?: OnizlemeSonucu;
  /** Uygulama sonrası rapor */
  rapor?: UygulamaSonucu;
  /** Önizlemeden uygulamaya taşınan CSV — kullanıcı yeniden yüklemesin */
  csv?: string;
}

/** Dosya ya da yapıştırılan metinden CSV'yi çıkarır. */
async function csvOku(form: FormData): Promise<string> {
  const dosya = form.get('dosya');
  if (dosya instanceof File && dosya.size > 0) return dosya.text();
  return String(form.get('csv') ?? '');
}

/**
 * CSV'yi çözümleyip ÖNİZLEME döndürür. Veritabanına yazmaz.
 *
 * Yazmadan önce görmek şart: yanlış sütun eşlemesiyle yüz satırlık bir
 * dosyayı doğrudan uygulamak envanteri sessizce bozar.
 */
export async function projeIceAktarOnizle(
  _onceki: IceAktarSonucu | null,
  form: FormData,
): Promise<IceAktarSonucu> {
  await adminZorunlu();

  const csv = await csvOku(form);
  if (!csv.trim()) return { hata: 'Dosya seçin veya CSV metnini yapıştırın.' };
  // Bellekte çözümlendiği için üst sınır var; 2 MB ~ birkaç bin satır
  if (csv.length > 2_000_000) return { hata: 'Dosya çok büyük (en fazla 2 MB).' };

  try {
    const { onizleme } = await iceAktarCozumle(csv);
    if (onizleme.eksikSutunlar.length) {
      return {
        hata: `Zorunlu sütunlar eksik: ${onizleme.eksikSutunlar.join(', ')}. Örnek dosyayı indirip başlık satırını karşılaştırın.`,
        onizleme,
      };
    }
    if (!onizleme.sonuclar.length) return { hata: 'Dosyada işlenecek satır yok.' };
    return { onizleme, csv };
  } catch (e) {
    console.error('İçe aktarma çözümlenemedi:', e);
    return { hata: 'Dosya okunamadı. CSV biçiminde olduğundan emin olun.' };
  }
}

/**
 * Önizlemesi görülen dosyayı uygular.
 *
 * CSV yeniden çözümleniyor: önizleme ile uygulama arasında bölge ya da
 * firma silinmiş olabilir. Önizlemedeki sonucu güvenilir kabul
 * edip yazmak, artık geçersiz bir kaydı yazmak demek.
 */
export async function projeIceAktarUygula(
  _onceki: IceAktarSonucu | null,
  form: FormData,
): Promise<IceAktarSonucu> {
  const k = await adminZorunlu();

  const csv = String(form.get('csv') ?? '');
  if (!csv.trim()) return { hata: 'Aktarılacak veri bulunamadı, dosyayı yeniden yükleyin.' };

  try {
    const { onizleme, cozulmus } = await iceAktarCozumle(csv);
    if (!cozulmus.length) {
      return { hata: 'Aktarılabilir satır yok — tüm satırlarda hata var.', onizleme };
    }

    const rapor = await iceAktarUygula(cozulmus);
    await denetimYaz(k.id, 'proje.toplu_ice_aktarma', 'proje', undefined, {
      eklenen: rapor.eklenen, guncellenen: rapor.guncellenen,
      atlanan: rapor.atlanan, hataliSatir: onizleme.hatali,
    });

    tazele('/yonetim/projeler', '/arama', '/bolgeler');
    return { rapor, onizleme };
  } catch (e) {
    console.error('İçe aktarma uygulanamadı:', e);
    return { hata: 'İçe aktarma tamamlanamadı. Kayıtların bir kısmı yazılmış olabilir; önizlemeyi yeniden çalıştırın.' };
  }
}

/* ---------------- KVKK veri sahibi talepleri ---------------- */

export interface VeriTalebiSonucu { hata?: string; tamam?: boolean; eposta?: string }

/**
 * Veri sahibi talebi açar ve doğrulama bağlantısı gönderir.
 *
 * Ziyaretçinin hesabı yok, dolayısıyla talebin sahibi olduğu ancak
 * E-POSTA ERİŞİMİYLE kanıtlanabiliyor. Doğrulanmamış talep hiçbir
 * veri göstermiyor ve hiçbir şey silmiyor.
 *
 * YANIT HER ZAMAN AYNI: "adres kayıtlıysa bağlantı gönderildi".
 * Farklı yanıt vermek, adresin sistemde olup olmadığını sızdırırdı —
 * kimin nerede tatil yaptığını öğrenmek için kullanılabilecek bir
 * bilgi (bkz. docs/guvenlik.md, kullanıcı sayımı).
 */
export async function veriTalebiOlustur(
  _onceki: VeriTalebiSonucu | null,
  form: FormData,
): Promise<VeriTalebiSonucu> {
  const eposta = String(form.get('eposta') ?? '').trim().toLowerCase();
  const tip = form.get('tip') === 'SILME' ? 'SILME' as const : 'ERISIM' as const;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta)) {
    return { hata: 'Geçerli bir e-posta adresi girin.' };
  }

  const ip = await istekIp();
  // Sınır ADRESE göre: aynı IP'den farklı adreslere talep açmak
  // meşru (aile, ortak ofis); AYNI adrese yağdırmak taciz.
  const sinir = await sinirKontrol('veriTalebi', eposta);
  if (!sinir.izin) {
    return { hata: sinir.mesaj ?? 'Çok fazla talep gönderildi. Bir süre sonra tekrar deneyin.' };
  }

  /* Açık bir talep varsa yenisi açılmıyor: art arda tıklamak posta
     kutusunu doldurmasın ve her tıklama önceki bağlantıyı
     geçersiz kılmasın. */
  const acik = await prisma.veriTalebi.findFirst({
    where: {
      eposta, tip,
      durum: { in: ['DOGRULAMA_BEKLIYOR', 'ISLEMDE'] },
      jetonSonKullanma: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!acik) {
    const jeton = randomBytes(32).toString('base64url');
    await prisma.veriTalebi.create({
      data: {
        tip, eposta,
        jetonHash: createHash('sha256').update(jeton).digest('hex'),
        // 48 saat: e-postayı hemen görmeyen biri de yetişebilsin
        jetonSonKullanma: new Date(Date.now() + 48 * 3600_000),
        ip,
      },
    });
    await veriTalebiBildirimi(eposta, tip, jeton);
  }

  return { tamam: true, eposta };
}

/**
 * Doğrulama jetonunu çözer. Geçersiz/süresi dolmuşsa null.
 * Jeton düz saklanmadığı için özetiyle aranıyor.
 */
export async function veriTalebiDogrula(jeton: string) {
  if (!jeton) return null;
  const talep = await prisma.veriTalebi.findUnique({
    where: { jetonHash: createHash('sha256').update(jeton).digest('hex') },
    select: {
      id: true, tip: true, eposta: true, durum: true,
      jetonSonKullanma: true, dogrulandi: true, not: true, sonuc: true,
    },
  });
  if (!talep || talep.jetonSonKullanma < new Date()) return null;

  if (!talep.dogrulandi) {
    await prisma.veriTalebi.update({
      where: { id: talep.id },
      data: { dogrulandi: new Date(), durum: 'ISLEMDE' },
    });
    return { ...talep, dogrulandi: new Date(), durum: 'ISLEMDE' as const };
  }
  return talep;
}

/**
 * Silme talebini uygular (yalnızca yönetim).
 *
 * Erişim talebi doğrulamayla kendiliğinden karşılanıyor; silme
 * GERİ ALINAMAZ olduğu için insan onayından geçiyor. KVKK md. 13
 * otuz gün süre tanıyor, bu onaya yer bırakıyor.
 */
export async function veriTalebiUygula(
  id: string, karar: 'onayla' | 'reddet', not: string,
): Promise<{ hata?: string; tamam?: boolean }> {
  const admin = await adminZorunlu();

  const talep = await prisma.veriTalebi.findUnique({
    where: { id },
    select: { eposta: true, tip: true, durum: true, dogrulandi: true },
  });
  if (!talep) return { hata: 'Talep bulunamadı.' };
  if (!talep.dogrulandi) return { hata: 'Talep e-posta ile doğrulanmadı.' };
  if (talep.durum !== 'ISLEMDE') return { hata: 'Bu talep zaten sonuçlandırılmış.' };

  if (karar === 'reddet') {
    if (!not.trim()) return { hata: 'Ret gerekçesi zorunlu (KVKK md. 13/3).' };
    await prisma.veriTalebi.update({
      where: { id },
      data: { durum: 'REDDEDILDI', not: not.trim(), tamamlanma: new Date() },
    });
    await denetimYaz(admin.id, 'kvkk.talep_reddedildi', 'veri_talebi', id, { tip: talep.tip });
    tazele('/yonetim/veri-talepleri');
    return { tamam: true };
  }

  if (talep.tip !== 'SILME') return { hata: 'Yalnızca silme talebi uygulanır.' };

  // Engeller uygulama anında yeniden kontrol ediliyor: talep
  // açıldığından beri yeni bir talep gelmiş olabilir
  // Yalnızca SERT engeller durduruyor; kapsam notları (yasal saklama
  // süresi) silmeyi engellemiyor, kapsamını daraltıyor
  const engeller = sertEngeller(await silmeEngelleri(talep.eposta));
  if (engeller.length) {
    return { hata: `Silme engellendi: ${engeller.map((x) => x.sebep).join(', ')}. Reddet ve gerekçeyi bildirin.` };
  }

  const sonuc = await kisiselVeriSil(talep.eposta);
  await prisma.veriTalebi.update({
    where: { id },
    data: {
      durum: 'TAMAMLANDI', tamamlanma: new Date(),
      sonuc: { ...sonuc }, not: not.trim() || null,
      // Talebin kendi IP'si de artık gereksiz
      ip: null,
    },
  });
  await denetimYaz(admin.id, 'kvkk.veri_anonimlestirildi', 'veri_talebi', id, sonuc);
  tazele('/yonetim/veri-talepleri');
  return { tamam: true };
}

/* ---------------- Firma kaydı (yalnızca yönetim) ---------------- */

export interface FirmaSonucu {
  hata?: string;
  alan?: string;
  firmaId?: string;
  /** Panel hesabı da açıldıysa geçici parola — bir kez gösterilir */
  gecici?: string;
  /**
   * Hatada forma geri yazılan değerler.
   * React 19 eylem bitince formu sıfırlıyor; girilenler geri
   * verilmezse tek bir hatalı IBAN yüzünden tüm form baştan doldurulur.
   */
  degerler?: Record<string, string>;
}

/**
 * Firma kaydı açar; istenirse panel hesabını da birlikte oluşturur.
 *
 * İkisi TEK İŞLEMDE: firma açılıp hesap açılamazsa ortada sahipsiz
 * bir kayıt kalıyor ve yönetici bunu fark etmiyor. Hesap açma hatası
 * (örneğin e-posta çakışması) tüm işlemi geri alıyor.
 *
 * Bildirim işlem DIŞINDA gönderiliyor: e-posta sağlayıcısının yavaşlığı
 * veritabanı işlemini açık tutmamalı.
 */
export async function firmaOlustur(
  _onceki: FirmaSonucu | null,
  form: FormData,
): Promise<FirmaSonucu> {
  const admin = await adminZorunlu();

  const metin = (a: string) => String(form.get(a) ?? '').trim();
  const ad = metin('ad');
  const eposta = metin('eposta').toLowerCase();
  const telefon = metin('telefon');
  const kurulusYili = Number(form.get('kurulusYili') ?? 0);
  const tamamlananProje = Number(form.get('tamamlananProje') ?? 0);
  const hesapAc = form.get('hesapAc') === 'on';

  // Girilenler her hata dönüşüne iliştirilir; form baştan doldurulmasın
  const degerler: Record<string, string> = {
    ad, eposta, telefon,
    kurulusYili: String(form.get('kurulusYili') ?? ''),
    tamamlananProje: String(form.get('tamamlananProje') ?? ''),
    web: metin('web'), ozet: metin('ozet'),
    hesapAc: hesapAc ? 'on' : '',
  };
  const hata = (mesaj: string, alan?: string): FirmaSonucu =>
    ({ hata: mesaj, alan, degerler });

  if (ad.length < 3) return hata('Ad en az 3 karakter olmalı.', 'ad');

  const buYil = new Date().getFullYear();
  /* Kuruluş yılı İSTEĞE BAĞLI (0 = belirtilmedi): rozet yalnızca
     doluysa basılıyor. Zorunlu tutmak, yılını bilmediğimiz bir firma
     için uydurma bir tarih girdirirdi. */
  if (kurulusYili && (!Number.isInteger(kurulusYili) || kurulusYili < 1900 || kurulusYili > buYil)) {
    return hata(`Kuruluş yılı 1900–${buYil} arasında olmalı.`, 'kurulusYili');
  }
  if (tamamlananProje < 0 || tamamlananProje > 500) {
    return hata('Tamamlanan proje sayısı 0–500 arasında olmalı.', 'tamamlananProje');
  }

  // E-posta firma kaydında isteğe bağlı ama panel hesabı için şart
  if (eposta && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eposta)) {
    return hata('Geçerli bir e-posta girin.', 'eposta');
  }
  if (hesapAc && !eposta) {
    return hata('Panel hesabı için e-posta zorunlu.', 'eposta');
  }

  // Telefon E.164'e normalleniyor — SMS bildirimi bu biçimi bekliyor
  const telefonE164 = telefon ? adresNormalle('SMS', telefon) : null;
  if (telefon && !telefonGecerli(telefonE164!)) {
    return hata('Telefon numarası geçersiz (örn. 0532 123 45 67).', 'telefon');
  }

  if (eposta) {
    /* `Firma.eposta` TEKİL DEĞİL: bir grup şirketinin birden çok
       markası aynı kurumsal adresi kullanabiliyor. Bu yüzden çakışma
       engel değil, yalnızca panel hesabı için denetleniyor. */
    if (hesapAc && (await prisma.kullanici.findUnique({ where: { eposta } }))) {
      return hata('Bu e-postayla bir kullanıcı hesabı zaten var.', 'eposta');
    }
  }

  const web = metin('web');
  if (web && !/^https?:\/\//.test(web)) {
    return hata('Web adresi http(s) ile başlamalı.', 'web');
  }

  const ozet = metin('ozet') || `${ad} tarafından geliştirilen projeler.`;
  const slug = await benzersizSlug(ad, async (x) =>
    (await prisma.firma.count({ where: { slug: x } })) > 0);

  // Geçici parola: karıştırılması kolay karakterler (0/O, 1/l) alfabede yok
  const gecici = hesapAc
    ? Array.from(crypto.getRandomValues(new Uint8Array(9)))
      .map((b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
    : null;

  try {
    const sonuc = await prisma.$transaction(async (tx) => {
      const es = await tx.firma.create({
        data: {
          slug,
          ad,
          ozet,
          eposta: eposta || null,
          telefon: telefonE164,
          web: web || null,
          kurulusYili: kurulusYili || null,
          tamamlananProje,
          /* Yayında DEĞİL: firma kaydı açılmakla sitede görünmeye hak
             kazanmıyor. Projesi eklenip yayına alındığında firma
             sayfası da açılıyor. */
          yayinda: false,
        },
      });

      let kullaniciId: string | null = null;
      if (hesapAc && gecici) {
        const k = await tx.kullanici.create({
          data: {
            ad, eposta, rol: 'FIRMA',
            parolaHash: await parolaHashle(gecici),
            firmaId: es.id,
          },
        });
        kullaniciId = k.id;
      }
      return { es, kullaniciId };
    });

    await denetimYaz(admin.id, 'ev_sahibi.olusturuldu', 'ev_sahibi', sonuc.es.id,
      { ad, eposta: eposta || null, hesapAc });

    // Bildirim işlem dışında: sağlayıcı yavaşlığı işlemi açık tutmamalı
    if (sonuc.kullaniciId && gecici) {
      await hesapBildirimi(sonuc.kullaniciId, gecici, true);
    }

    tazele('/yonetim/kullanicilar', '/yonetim/projeler');
    return { firmaId: sonuc.es.id, gecici: gecici ?? undefined };
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    if (m.includes('Unique constraint')) {
      return hata('Bu e-posta zaten kayıtlı.', 'eposta');
    }
    console.error('Firma oluşturulamadı:', e);
    return hata('Firma kaydı açılamadı.');
  }
}

/** Firma bilgilerini günceller (yalnızca yönetim). */
export async function firmaGuncelle(
  _onceki: FirmaSonucu | null,
  form: FormData,
): Promise<FirmaSonucu> {
  const admin = await adminZorunlu();
  const id = String(form.get('firmaId') ?? '');
  if (!id) return { hata: 'Firma seçilmedi.' };

  const metin = (a: string) => String(form.get(a) ?? '').trim();
  const ad = metin('ad');
  if (ad.length < 3) return { hata: 'Ad en az 3 karakter olmalı.', alan: 'ad' };

  const telefon = metin('telefon');
  const telefonE164 = telefon ? adresNormalle('SMS', telefon) : null;
  if (telefon && !telefonGecerli(telefonE164!)) {
    return { hata: 'Telefon numarası geçersiz.', alan: 'telefon' };
  }

  const iban = metin('iban').replace(/\s/g, '').toUpperCase();
  if (iban && !/^TR\d{24}$/.test(iban)) {
    return { hata: 'IBAN TR ile başlayan 26 karakter olmalı.', alan: 'iban' };
  }

  await prisma.firma.update({
    where: { id },
    data: {
      ad, telefon: telefonE164,
      ozet: metin('ozet') || undefined,
      web: metin('web') || null,
      kurulusYili: Number(form.get('kurulusYili') ?? 0) || null,
      tamamlananProje: Math.max(0, Number(form.get('tamamlananProje') ?? 0)),
      yayinda: form.get('yayinda') === 'on',
    },
  });

  await denetimYaz(admin.id, 'firma.guncellendi', 'firma', id);
  tazele('/yonetim/kullanicilar');
  return { firmaId: id };
}

/* ---------------- İçerik yönetimi (yalnızca yönetim) ---------------- */

export interface IcerikSonucu {
  hata?: string;
  alan?: string;
  tamam?: boolean;
  slug?: string;
  /** Hatada forma geri yazılan değerler — React 19 formu sıfırlıyor */
  degerler?: Record<string, string>;
}

/**
 * İçerik önbelleğini düşürür.
 *
 * Sayfalar statik üretiliyor ve içerikleri `unstable_cache` ile etiketli
 * okunuyor; etiketi düşürmeden kaydedilen metin yayına çıkmıyor.
 * `revalidatePath` tek başına yetmiyor — önbelleklenen SORGU hâlâ eski
 * değeri döndürürdü.
 */
function icerikTazele(...yollar: string[]) {
  try { revalidateTag(ICERIK_ETIKET); } catch { /* istek bağlamı yok */ }
  tazele('/yonetim/metinler', '/yonetim/sayfalar', ...yollar);
}

/** Tek bir metni kaydeder. Boş bırakılırsa varsayılana döner. */
export async function metinKaydet(
  _onceki: IcerikSonucu | null,
  form: FormData,
): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();

  const anahtar = String(form.get('anahtar') ?? '');
  const dil = form.get('dil') === 'EN' ? 'EN' as const : 'TR' as const;
  const deger = String(form.get('deger') ?? '').trim();

  if (!(anahtar in METIN_KAYDI)) return { hata: 'Bilinmeyen metin anahtarı.' };

  const tanim = METIN_KAYDI[anahtar as MetinAnahtari];
  const varsayilan = varsayilanMetin(anahtar as MetinAnahtari, dil === 'EN' ? 'en' : 'tr');

  // Boş bırakmak ya da varsayılanı aynen yazmak = üzerine yazmayı kaldır.
  // Aynı değeri satır olarak tutmak, kod tarafındaki varsayılan sonradan
  // güncellenince sayfanın eski metinde donmasına yol açardı.
  if (!deger || deger === varsayilan) {
    const silinen = await prisma.metin.deleteMany({ where: { anahtar, dil } });
    if (silinen.count) {
      await denetimYaz(admin.id, 'metin.varsayilana_dondu', 'metin', anahtar, { dil });
      icerikTazele('/');
    }
    return { tamam: true };
  }

  if (deger.length > (tanim.tip === 'satir' ? 200 : 1000)) {
    return { hata: 'Metin fazla uzun.', alan: anahtar };
  }

  await prisma.metin.upsert({
    where: { anahtar_dil: { anahtar, dil } },
    create: { anahtar, dil, deger, guncelleyenId: admin.id },
    update: { deger, guncelleyenId: admin.id },
  });
  await denetimYaz(admin.id, 'metin.guncellendi', 'metin', anahtar, { dil });
  icerikTazele('/');
  return { tamam: true };
}

/* ---------------- Site bilgileri ---------------- */

/**
 * Kurum bilgilerini kaydeder (tek satır, id = 1).
 *
 * Boş bırakılan alan SİLİNİYOR: koddaki varsayılan (`lib/site.ts`)
 * yeniden geçerli oluyor. Böylece "varsayılana dön" için ayrı bir
 * düğme gerekmiyor ve panelde yanlışlıkla boşaltılan bir alan siteyi
 * boş bırakmıyor.
 */
export async function siteAyarKaydet(
  _onceki: IcerikSonucu | null,
  form: FormData,
): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();

  const al = (ad: string) => {
    const d = String(form.get(ad) ?? '').trim();
    return d ? d : null;
  };

  const eposta = al('eposta');
  if (eposta && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(eposta)) {
    return { hata: 'E-posta adresi geçerli değil.', alan: 'eposta' };
  }
  const whatsapp = al('whatsapp');
  /* WhatsApp numarası wa.me biçiminde olmak zorunda: yalnızca rakam,
     ülke koduyla. Başında + ya da arada boşluk olan numara sessizce
     çalışmayan bir bağlantı üretiyordu. */
  if (whatsapp && !/^\d{10,15}$/.test(whatsapp)) {
    return { hata: 'WhatsApp numarası yalnızca rakam olmalı (ülke koduyla, işaretsiz).', alan: 'whatsapp' };
  }

  const sosyal = String(form.get('sosyal') ?? '')
    .split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const bozuk = sosyal.find((u) => !/^https?:\/\//i.test(u));
  if (bozuk) return { hata: `Sosyal hesap adresi tam URL olmalı: ${bozuk}`, alan: 'sosyal' };

  const veri = {
    unvan: al('unvan'), telefon: al('telefon'), whatsapp, eposta,
    slogan: al('slogan'), aciklama: al('aciklama'),
    adresSokak: al('adresSokak'), adresIlce: al('adresIlce'),
    adresIl: al('adresIl'), adresPosta: al('adresPosta'),
    tursab: al('tursab'), bakanlik: al('bakanlik'),
    etbis: al('etbis'), mersis: al('mersis'),
    sosyal,
    guncelleyenId: admin.id,
  };

  await prisma.siteAyar.upsert({
    where: { id: 1 },
    create: { id: 1, ...veri },
    update: veri,
  });
  await denetimYaz(admin.id, 'ayar.guncellendi', 'site_ayar', '1', {
    alanlar: Object.entries(veri).filter(([, v]) => v !== null).map(([k]) => k),
  });

  /* Kurum bilgisi altbilgide, JSON-LD'de ve WhatsApp bağlantısında:
     tek etiket düşünce hepsi tazeleniyor. */
  try { revalidateTag(AYAR_ETIKET); } catch { /* istek bağlamı yok */ }
  tazele('/yonetim/ayarlar', '/');
  return { tamam: true };
}

/* ---------------- Kurumsal sayfalar ---------------- */

/**
 * Dinamik `[sayfa]` rotasından ÖNCE eşleşen gerçek rotalar.
 * Bu adreslerde açılan bir sayfa hiç görünmez; sessizce kaybolmasındansa
 * kaydetmeyi reddediyoruz.
 */
const AYRILMIS_SLUG = new Set([
  'arama', 'bolgeler', 'proje', 'projeler', 'firma', 'firmalar', 'talep',
  'firma-basvuru', 'favoriler', 'pano', 'alarm', 'rehber', 'veri-talebi',
  'giris', 'kayit', 'hesap', 'panel', 'yonetim', 'api', 'en',
  'search', 'regions', 'developments', 'project', 'developer',
]);

export async function sayfaKaydet(
  _onceki: IcerikSonucu | null,
  form: FormData,
): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();

  const id = String(form.get('id') ?? '');
  const al = (a: string) => String(form.get(a) ?? '').trim();
  const dil = form.get('dil') === 'EN' ? 'EN' as const : 'TR' as const;
  const slug = slugla(al('slug'));
  const baslik = al('baslik');
  const h1 = al('h1');
  const aciklama = al('aciklama');

  const degerler: Record<string, string> = {
    slug: al('slug'), baslik, h1, aciklama,
    govde: String(form.get('govde') ?? ''), sss: String(form.get('sss') ?? ''),
    ctaMetin: al('ctaMetin'), ctaYol: al('ctaYol'),
    dil, indexle: form.get('indexle') === 'on' ? 'on' : '',
    yayinda: form.get('yayinda') === 'on' ? 'on' : '',
  };
  const hata = (mesaj: string, alan?: string): IcerikSonucu => ({ hata: mesaj, alan, degerler });

  if (!slug) return hata('Adres (slug) gerekli.', 'slug');
  if (AYRILMIS_SLUG.has(slug)) return hata(`"/${slug}" sistem tarafından kullanılıyor.`, 'slug');
  if (baslik.length < 5) return hata('Başlık en az 5 karakter olmalı.', 'baslik');
  if (h1.length < 3) return hata('Sayfa başlığı (H1) gerekli.', 'h1');
  // 50–160 arası Google'ın kırpmadan gösterdiği aralık
  if (aciklama.length < 50 || aciklama.length > 160) {
    return hata(`Meta açıklaması 50–160 karakter olmalı (şu an ${aciklama.length}).`, 'aciklama');
  }

  /* Blok editörü blokları JSON olarak gönderiyor; metin alanı hâlâ
     çalışıyor (editör kapalıyken ya da JS yoksa). JSON öncelikli ama
     bozuksa metne düşülüyor — kaydetmeyi reddetmek, yazılan içeriği
     kaybettirirdi. */
  const govdeJsonHam = String(form.get('govdeJson') ?? '').trim();
  let govde: ReturnType<typeof govdeCozumle> | null = null;
  if (govdeJsonHam) {
    try { govde = bloklariDenetle(JSON.parse(govdeJsonHam)); } catch { govde = null; }
  }
  if (!govde || govde.length === 0) govde = govdeCozumle(degerler.govde);
  if (!govde.length) return hata('Sayfa gövdesi boş olamaz.', 'govde');
  const sss = sssCozumle(degerler.sss);

  /* Çağrı düğmesi: ikisi de dolu olmalı, yoksa hiçbiri yazılmıyor.
     Yalnızca metin girip adres unutulursa tıklanamayan bir düğme
     çıkardı. Adres site içi olmalı — dış bağlantıyı buradan vermek
     kurumsal sayfayı yönlendirme aracına çevirirdi. */
  const ctaMetin = al('ctaMetin');
  const ctaYol = al('ctaYol');
  if ((ctaMetin || ctaYol) && !(ctaMetin && ctaYol)) {
    return hata('Çağrı düğmesi için hem metin hem adres gerekli.', ctaMetin ? 'ctaYol' : 'ctaMetin');
  }
  if (ctaYol && !ctaYol.startsWith('/')) {
    return hata('Çağrı düğmesi adresi site içi olmalı ve "/" ile başlamalı.', 'ctaYol');
  }

  const veri = {
    slug, dil, baslik, h1, aciklama,
    govde, sss: sss.length ? sss : undefined,
    ctaMetin: ctaMetin || null,
    ctaYol: ctaYol || null,
    indexle: form.get('indexle') === 'on',
    yayinda: form.get('yayinda') === 'on',
    guncelleyenId: admin.id,
  };

  try {
    if (id) {
      await prisma.sayfa.update({ where: { id }, data: veri });
      await denetimYaz(admin.id, 'sayfa.guncellendi', 'sayfa', id, { slug, dil });
    } else {
      const yeni = await prisma.sayfa.create({ data: veri });
      await denetimYaz(admin.id, 'sayfa.olusturuldu', 'sayfa', yeni.id, { slug, dil });
    }
  } catch (e) {
    const msj = e instanceof Error ? e.message : '';
    if (msj.includes('Unique constraint')) {
      return hata(`"/${slug}" adresi bu dilde zaten kullanılıyor.`, 'slug');
    }
    console.error('Sayfa kaydedilemedi:', e);
    return hata('Sayfa kaydedilemedi.');
  }

  icerikTazele(dil === 'EN' ? `/en/${slug}` : `/${slug}`);
  return { tamam: true, slug };
}

export async function sayfaSil(id: string): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const s = await prisma.sayfa.findUnique({ where: { id }, select: { slug: true, dil: true } });
  if (!s) return { hata: 'Sayfa bulunamadı.' };

  await prisma.sayfa.delete({ where: { id } });
  await denetimYaz(admin.id, 'sayfa.silindi', 'sayfa', id, { slug: s.slug, dil: s.dil });
  icerikTazele(s.dil === 'EN' ? `/en/${s.slug}` : `/${s.slug}`);
  return { tamam: true };
}

/**
 * Kurumsal sayfayı KODA GÖMÜLÜ hâline döndürür.
 *
 * `sayfa` tablosunda kayıt varsa o kazanıyor; `icerik-varsayilan.ts`
 * yalnızca tohumlanmamış kurulumun yedeği. Metin kodda güncellendiğinde
 * yayındaki sayfa eski hâlinde kalıyordu ve tazelemenin tek yolu
 * sunucuya erişip tohum betiğini çalıştırmaktı — panelden içerik yöneten
 * kişinin elinde böyle bir imkân yok.
 *
 * Panelden eklenmiş, kodda karşılığı olmayan sayfada geri dönülecek bir
 * varsayılan yok; o durumda hata dönüyor.
 */
export async function sayfaVarsayilanaDondur(id: string): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const s = await prisma.sayfa.findUnique({
    where: { id }, select: { slug: true, dil: true },
  });
  if (!s) return { hata: 'Sayfa bulunamadı.' };

  const kayit = s.dil === 'EN' ? VARSAYILAN_SAYFALAR_EN : VARSAYILAN_SAYFALAR;
  const v = kayit[s.slug];
  if (!v) {
    return { hata: 'Bu sayfanın kodda bir varsayılanı yok; panelden eklenmiş.' };
  }

  await prisma.sayfa.update({
    where: { id },
    data: {
      baslik: v.baslik, h1: v.h1, aciklama: v.aciklama,
      govde: v.govde as unknown as Prisma.InputJsonValue,
      sss: (v.sss ?? undefined) as unknown as Prisma.InputJsonValue | undefined,
      indexle: v.indexle ?? true,
      ctaMetin: v.ctaMetin ?? null,
      ctaYol: v.ctaYol ?? null,
      guncelleyenId: admin.id,
    },
  });

  await denetimYaz(admin.id, 'sayfa.varsayilana_donduruldu', 'sayfa', id, { slug: s.slug });
  icerikTazele(s.dil === 'EN' ? `/en/${s.slug}` : `/${s.slug}`);
  return { tamam: true };
}

export async function sayfaYayinDurumu(id: string, yayinda: boolean): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const s = await prisma.sayfa.update({
    where: { id }, data: { yayinda, guncelleyenId: admin.id },
    select: { slug: true, dil: true },
  });
  await denetimYaz(admin.id, yayinda ? 'sayfa.yayinda' : 'sayfa.yayindan_kaldirildi',
    'sayfa', id, { slug: s.slug });
  icerikTazele(s.dil === 'EN' ? `/en/${s.slug}` : `/${s.slug}`);
  return { tamam: true };
}

/* ---------------- Firma başvurusu ---------------- */

/**
 * Herkese açık firma başvuru formu.
 *
 * Hız sınırı ADRESE göre: aynı IP'den farklı kişiler başvurabilir
 * (aynı ofisten iki firma yetkilisi), ama aynı adrese art arda
 * gönderim spam.
 */
export async function firmaBasvurusu(
  _onceki: BasvuruSonucu | null,
  form: FormData,
): Promise<BasvuruSonucu> {
  const eposta = String(form.get('eposta') ?? '').trim().toLowerCase();

  const sinir = await sinirKontrol('basvuru', eposta || (await istekIp()));
  if (!sinir.izin) {
    return { hata: sinir.mesaj ?? 'Çok fazla başvuru gönderildi. Bir süre sonra tekrar deneyin.' };
  }

  const ip = await istekIp();
  const sonuc = await basvuruKaydet({
    ad: String(form.get('ad') ?? ''),
    eposta,
    telefon: String(form.get('telefon') ?? ''),
    firmaAd: String(form.get('firmaAd') ?? ''),
    bolge: String(form.get('bolge') ?? ''),
    projeSayisi: Number(form.get('projeSayisi') ?? 1),
    mesaj: String(form.get('mesaj') ?? ''),
  }, ip === 'bilinmeyen' ? null : ip);

  if (sonuc.tamam) {
    /* Bildirim yalnızca YENİ başvuruda; mükerrer gönderim mevcut
       kaydı güncelliyor ve ekibi ikinci kez uyandırmanın anlamı yok. */
    if (sonuc.yeniKayit) await basvuruAlindiBildirimi(sonuc.basvuruId!);
    tazele('/yonetim/basvurular');
  }
  return sonuc;
}

/** Başvuruyu sonuçlandırır (yalnızca yönetim). */
export async function basvuruKarar(
  id: string,
  karar: 'onayla' | 'reddet' | 'goruseldi',
  not: string,
): Promise<{ hata?: string; tamam?: boolean; firmaId?: string }> {
  const admin = await adminZorunlu();

  const sonuc = karar === 'onayla' ? await basvuruOnayla(id)
    : karar === 'reddet' ? await basvuruReddet(id, not)
      : await basvuruGoruseldi(id, not);

  if (sonuc.hata) return sonuc;

  // Sonuç bildirimi yalnızca kesin kararlarda; "görüşüldü" iç durum
  if (karar === 'onayla' || karar === 'reddet') {
    await basvuruSonucBildirimi(id, karar === 'onayla');
  }

  await denetimYaz(admin.id, `basvuru.${karar}`, 'ev_sahibi_basvuru', id,
    sonuc.firmaId ? { firmaId: sonuc.firmaId } : undefined);
  tazele('/yonetim/basvurular', '/yonetim/ev-sahipleri');
  return sonuc;
}

/* ---------------- Tohumlama ---------------- */

export interface TohumEylemSonucu {
  hata?: string;
  mesaj?: string;
  notlar?: string[];
}

/**
 * Panelden demo veri ekler.
 *
 * `npm run db:seed` DEĞİL: o betik 16 tabloyu boşaltıyor ve üretimde
 * bir kez yanlış çalıştırmak gerçek satış taleplerini siler. Buradaki
 * tohumlama yalnızca ekliyor ve ne eklediğini deftere yazıyor.
 */
export async function tohumEkle(
  _onceki: TohumEylemSonucu,
  form: FormData,
): Promise<TohumEylemSonucu> {
  const admin = await adminZorunlu();
  const tur = String(form.get('tur') ?? '') as TohumTuru;
  if (!TOHUM_TURLERI.some((t) => t.tur === tur)) return { hata: 'Geçersiz tohum türü.' };

  const adetHam = Number(form.get('adet'));
  const sonuc = await tohumla(tur, admin.id, {
    yayinda: form.get('yayinda') === 'evet',
    adet: Number.isFinite(adetHam) && adetHam > 0 ? adetHam : undefined,
  });
  if (!sonuc.tamam) return { hata: sonuc.hata ?? 'Tohumlama başarısız.', notlar: sonuc.notlar };

  await denetimYaz(admin.id, 'tohum.olusturuldu', 'tohum_parti', sonuc.partiId, {
    tur, sayim: sonuc.sayim,
  });
  tazele('/yonetim/tohum', '/yonetim', '/yonetim/projeler', '/yonetim/talepler', '/');

  const dokum = Object.entries(sonuc.sayim ?? {}).map(([m, n]) => `${n} ${m}`).join(', ');
  return { mesaj: `Eklendi: ${dokum || 'kayıt yok'}.`, notlar: sonuc.notlar };
}

/**
 * Partiyi geri alır.
 *
 * Gerçek veriye bağlanmış kayıtlar korunuyor ve sebebi yazılıyor —
 * sessizce atlamak "sildim" deyip bırakmak olurdu.
 */
export async function tohumSil(
  _onceki: TohumEylemSonucu,
  form: FormData,
): Promise<TohumEylemSonucu> {
  const admin = await adminZorunlu();
  const partiId = String(form.get('partiId') ?? '');
  if (!partiId) return { hata: 'Parti seçilmedi.' };
  // Yazarak onay: tek tıkla geri alınamaz bir silme yapılmamalı
  if (String(form.get('onay') ?? '').trim().toLocaleUpperCase('tr') !== 'SİL') {
    return { hata: 'Onaylamak için kutuya SİL yazın.' };
  }

  const sonuc = await partiyiSil(partiId);
  if (!sonuc.tamam) return { hata: sonuc.hata ?? 'Silinemedi.' };

  await denetimYaz(admin.id, 'tohum.silindi', 'tohum_parti', partiId, {
    silinen: sonuc.silinen, korunan: sonuc.korunan.length,
  });
  tazele('/yonetim/tohum', '/yonetim', '/yonetim/projeler', '/yonetim/talepler', '/');

  if (sonuc.korunan.length) {
    return {
      mesaj: `${sonuc.silinen} kayıt silindi, ${sonuc.korunan.length} tanesi korundu.`,
      notlar: sonuc.korunan.map((k) => `${k.model}: ${k.sebep}`),
    };
  }
  return { mesaj: `${sonuc.silinen} kayıt silindi, parti tamamen geri alındı.` };
}

/**
 * Bir türü yeniden basar: açık partileri geri alıp yenisini üretir.
 *
 * Üretici düzeltildiğinde yayındaki demo kayıtlar eski üreticiden
 * kalıyor ve "Ekle" onları düzeltmiyor — yanlarına yenisini koyuyor.
 * Bu eylem, düzeltmenin canlıya yansımasının tek yolu.
 *
 * Yazarak onay isteniyor: geri alma adımı, ekleme gibi geri
 * alınabilir bir işlem değil.
 */
export async function tohumYenile(
  _onceki: TohumEylemSonucu,
  form: FormData,
): Promise<TohumEylemSonucu> {
  const admin = await adminZorunlu();
  const tur = String(form.get('tur') ?? '') as TohumTuru;
  if (!TOHUM_TURLERI.some((t) => t.tur === tur)) return { hata: 'Geçersiz tohum türü.' };
  if (String(form.get('onay') ?? '').trim().toLocaleUpperCase('tr') !== 'YENİLE') {
    return { hata: 'Onaylamak için kutuya YENİLE yazın.' };
  }

  const adetHam = Number(form.get('adet'));
  const sonuc = await turuYenile(tur, admin.id, {
    yayinda: form.get('yayinda') === 'evet',
    adet: Number.isFinite(adetHam) && adetHam > 0 ? adetHam : undefined,
  });

  await denetimYaz(admin.id, 'tohum.yenilendi', 'tohum_parti', sonuc.partiId, {
    tur, geriAlinanKayit: sonuc.geriAlinanKayit, korunan: sonuc.korunan.length,
    sayim: sonuc.sayim,
  });
  tazele('/yonetim/tohum', '/yonetim', '/yonetim/projeler', '/yonetim/talepler', '/');

  if (!sonuc.tamam) {
    return {
      hata: `${sonuc.geriAlinanKayit} kayıt geri alındı ama yeniden basılamadı: ${sonuc.hata}`,
      notlar: sonuc.notlar,
    };
  }

  const dokum = Object.entries(sonuc.sayim ?? {}).map(([m, n]) => `${n} ${m}`).join(', ');
  /* Korunanlar sessizce geçilmiyor: o kayıtlar ESKİ üreticiden kalıyor
     ve yönetici hangileri olduğunu bilmeli. */
  const notlar = sonuc.korunan.length
    ? [
      `${sonuc.korunan.length} kayıt geri alınamadı — gerçek veri bağlı, eski hâlleriyle duruyorlar:`,
      ...sonuc.korunan.slice(0, 10).map((k) => `${k.model}: ${k.sebep}`),
      ...(sonuc.korunan.length > 10 ? [`…ve ${sonuc.korunan.length - 10} kayıt daha`] : []),
    ]
    : sonuc.notlar;

  return {
    mesaj: `${sonuc.geriAlinanKayit} eski kayıt geri alındı, yeniden basıldı: ${dokum || 'kayıt yok'}.`,
    notlar,
  };
}

/* ---------------- Çeviriler ---------------- */

/**
 * Bir kaydın çevirisini kaydeder.
 *
 * Türkçe reddediliyor: varsayılan dil ana tabloda duruyor ve
 * ilgili kaydın kendi sayfasından düzenleniyor. İki yerde birden
 * tutmak "içerik ya orada ya burada" belirsizliği üretirdi.
 */
export async function ceviriKaydet(
  varlik: string,
  varlikId: string,
  dil: string,
  alanlar: Record<string, string>,
): Promise<{ hata?: string; tamam?: boolean }> {
  const k = await adminZorunlu();

  if (!['bolge', 'proje', 'ozellik'].includes(varlik)) return { hata: 'Geçersiz kayıt türü.' };
  if (!['EN', 'RU', 'AR'].includes(dil)) return { hata: 'Geçersiz dil.' };

  const sonuc = await ceviriYaz(
    varlik as CeviriVarlik, varlikId, dil as DilEnum, alanlar,
  );
  if (sonuc.hata) return sonuc;

  await denetimYaz(k.id, 'ceviri.kaydedildi', varlik, varlikId, { dil });
  /* İngilizce sayfalar statik üretiliyor; çeviri değişince ilgili
     ağacın tazelenmesi gerekiyor. Rota ağacı olmayan dillerde
     (RU/AR) tazelenecek sayfa yok. */
  tazele('/yonetim/ceviriler', '/en', '/en/regions', '/en/search');
  return { tamam: true };
}

/* ---------------- Kampanya şeridi ---------------- */

function kampanyaTazele() {
  try { revalidateTag(KAMPANYA_ETIKET); } catch { /* istek bağlamı yok */ }
  tazele('/', '/yonetim/kampanyalar');
}

export async function kampanyaKaydet(
  _onceki: IcerikSonucu | null, form: FormData,
): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const metin = (a: string) => String(form.get(a) ?? '').trim();
  const tarih = (a: string) => new Date(`${metin(a)}T00:00:00Z`);

  const girdi = {
    metin: metin('metin'),
    cagriAd: metin('cagriAd') || null,
    cagriYol: metin('cagriYol') || null,
    geriSayim: form.get('geriSayim') === 'evet',
    baslangic: tarih('baslangic'),
    /* Bitiş GÜN SONU: "31 Ağustos'a kadar" diyen kampanya 31 Ağustos
       00:00'da düşerse bir gün eksik yayında kalırdı. */
    bitis: new Date(tarih('bitis').getTime() + 864e5 - 1),
    aktif: form.get('aktif') !== 'hayir',
  };

  const hata = kampanyaDenetle(girdi);
  if (hata) return { hata };

  const id = metin('id');
  if (id) {
    await prisma.kampanya.update({ where: { id }, data: girdi });
    await denetimYaz(admin.id, 'kampanya.guncellendi', 'kampanya', id);
  } else {
    const y = await prisma.kampanya.create({ data: girdi, select: { id: true } });
    await denetimYaz(admin.id, 'kampanya.olusturuldu', 'kampanya', y.id);
  }
  kampanyaTazele();
  return { tamam: true };
}

export async function kampanyaDurum(id: string, aktif: boolean): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  await prisma.kampanya.update({ where: { id }, data: { aktif } });
  await denetimYaz(admin.id, aktif ? 'kampanya.acildi' : 'kampanya.kapatildi', 'kampanya', id);
  kampanyaTazele();
  return { tamam: true };
}

export async function kampanyaSil(id: string): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  await prisma.kampanya.delete({ where: { id } });
  await denetimYaz(admin.id, 'kampanya.silindi', 'kampanya', id);
  kampanyaTazele();
  return { tamam: true };
}

/* ---------------- Rehber yazıları ---------------- */

export async function yaziKaydet(
  _onceki: IcerikSonucu | null, form: FormData,
): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const metin = (a: string) => String(form.get(a) ?? '').trim();

  /* Gövde blok editöründen JSON olarak geliyor; kurumsal sayfayla
     AYNI daraltmadan geçiyor — istemciden gelen şekle güvenilmiyor. */
  let govde: ReturnType<typeof bloklariDenetle> = null;
  const ham = metin('govdeJson');
  if (ham) {
    try { govde = bloklariDenetle(JSON.parse(ham)); } catch { govde = null; }
  }
  if (!govde || govde.length === 0) govde = govdeCozumle(metin('govde'));

  const girdi = {
    slug: slugla(metin('slug') || metin('baslik')),
    baslik: metin('baslik'),
    ozet: metin('ozet'),
    kapak: metin('kapak') || null,
    govde,
  };

  const hata = yaziDenetle(girdi);
  if (hata) return { hata, degerler: { baslik: girdi.baslik, ozet: girdi.ozet, slug: girdi.slug } };

  const id = metin('id');
  const bolgeId = metin('bolgeId') || null;
  const veri = {
    ...girdi,
    bolgeId,
    yazar: metin('yazar') || null,
    /* Okuma süresi elle girilseydi güncellenen yazılarda eskirdi. */
    okumaDk: okumaSuresi(govde),
    yayinda: form.get('yayinda') === 'evet',
  };

  try {
    if (id) {
      await prisma.yazi.update({ where: { id }, data: veri });
      await denetimYaz(admin.id, 'yazi.guncellendi', 'yazi', id);
    } else {
      const y = await prisma.yazi.create({ data: veri, select: { id: true } });
      await denetimYaz(admin.id, 'yazi.olusturuldu', 'yazi', y.id);
    }
  } catch (e) {
    // Diğer kaydetme eylemleriyle aynı kalıp: sürücü sınıfına değil
    // mesaja bakılıyor, Prisma sürüm geçişlerinde sınıf adı değişti.
    const msj = e instanceof Error ? e.message : '';
    if (msj.includes('Unique constraint')) {
      return { hata: `"/rehber/${girdi.slug}" adresi zaten kullanılıyor.`, alan: 'slug' };
    }
    return { hata: 'Yazı kaydedilemedi.' };
  }

  icerikTazele('/rehber', `/rehber/${girdi.slug}`);
  return { tamam: true, slug: girdi.slug };
}

export async function yaziYayinDurumu(id: string, yayinda: boolean): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const y = await prisma.yazi.update({
    where: { id }, data: { yayinda }, select: { slug: true },
  });
  await denetimYaz(admin.id, yayinda ? 'yazi.yayinlandi' : 'yazi.yayindanKaldirildi', 'yazi', id);
  icerikTazele('/rehber', `/rehber/${y.slug}`);
  return { tamam: true };
}

export async function yaziSil(id: string): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const y = await prisma.yazi.delete({ where: { id }, select: { slug: true } });
  await denetimYaz(admin.id, 'yazi.silindi', 'yazi', id);
  icerikTazele('/rehber', `/rehber/${y.slug}`);
  return { tamam: true };
}

/* ---------------- Menü ---------------- */

function menuTazele() {
  try { revalidateTag(MENU_ETIKET); } catch { /* istek bağlamı yok */ }
  /* Menü her sayfanın başlığında: yol yol tazelemek yerine kök
     düzeni düşürülüyor. */
  try { revalidatePath('/', 'layout'); } catch { /* istek bağlamı yok */ }
  tazele('/yonetim/menu');
}

export async function menuKaydet(
  _onceki: IcerikSonucu | null, form: FormData,
): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const metin = (a: string) => String(form.get(a) ?? '').trim();

  const ustId = metin('ustId') || null;
  const girdi = {
    ad: metin('ad'),
    yol: metin('yol') || null,
    ustId,
    mega: form.get('mega') === 'evet',
  };

  const hata = menuDenetle(girdi);
  if (hata) return { hata };

  /* Alt öge mega olamaz: mega yalnızca üst düzeyde anlamlı, sütun ya da
     bağlantı olarak işaretlenirse panel iki kez açılmaya çalışırdı. */
  const mega = ustId ? false : girdi.mega;

  const veri = {
    konum: 'BASLIK' as const,
    ad: girdi.ad,
    yol: girdi.yol,
    ustId,
    mega,
    ikon: metin('ikon') || null,
    not: metin('not') || null,
    sira: Number(form.get('sira') ?? 0) || 0,
    aktif: form.get('aktif') !== 'hayir',
    yeniSekme: form.get('yeniSekme') === 'evet',
    tanitimBaslik: mega ? (metin('tanitimBaslik') || null) : null,
    tanitimMetin: mega ? (metin('tanitimMetin') || null) : null,
    tanitimDugme: mega ? (metin('tanitimDugme') || null) : null,
    tanitimYol: mega ? (metin('tanitimYol') || null) : null,
    seritBaslik: mega ? (metin('seritBaslik') || null) : null,
  };

  const id = metin('id');
  if (id) {
    /* Öge kendi altına taşınamaz: döngü, ağacı kuran özyinelemeyi
       sonsuza sokardı. */
    if (ustId === id) return { hata: 'Bir öge kendi altına taşınamaz.' };
    await prisma.menuOgesi.update({ where: { id }, data: veri });
    await denetimYaz(admin.id, 'menu.guncellendi', 'menu', id);
  } else {
    const y = await prisma.menuOgesi.create({ data: veri, select: { id: true } });
    await denetimYaz(admin.id, 'menu.olusturuldu', 'menu', y.id);
  }
  menuTazele();
  return { tamam: true };
}

export async function menuSil(id: string): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  await prisma.menuOgesi.delete({ where: { id } });
  await denetimYaz(admin.id, 'menu.silindi', 'menu', id);
  menuTazele();
  return { tamam: true };
}

export async function menuDurum(id: string, aktif: boolean): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  await prisma.menuOgesi.update({ where: { id }, data: { aktif } });
  await denetimYaz(admin.id, aktif ? 'menu.acildi' : 'menu.kapatildi', 'menu', id);
  menuTazele();
  return { tamam: true };
}

/** Sırayı bir basamak taşır. Komşusuyla sıra numarası takas ediliyor. */
export async function menuTasi(id: string, yon: 'yukari' | 'asagi'): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const oge = await prisma.menuOgesi.findUnique({
    where: { id }, select: { id: true, sira: true, ustId: true, konum: true, dil: true },
  });
  if (!oge) return { hata: 'Öge bulunamadı.' };

  /* Komşu AYNI DÜZEYDEN seçiliyor: farklı düzeyle takas, alt ögeyi
     üst düzeye taşımadan sırasını bozardı. */
  const kardesler = await prisma.menuOgesi.findMany({
    where: { ustId: oge.ustId, konum: oge.konum, dil: oge.dil },
    orderBy: [{ sira: 'asc' }, { ad: 'asc' }],
    select: { id: true, sira: true },
  });
  const i = kardesler.findIndex((k) => k.id === id);
  const hedef = yon === 'yukari' ? i - 1 : i + 1;
  if (i < 0 || hedef < 0 || hedef >= kardesler.length) return { tamam: true };

  await prisma.$transaction([
    prisma.menuOgesi.update({ where: { id }, data: { sira: kardesler[hedef].sira } }),
    prisma.menuOgesi.update({ where: { id: kardesler[hedef].id }, data: { sira: kardesler[i].sira } }),
  ]);
  await denetimYaz(admin.id, 'menu.tasindi', 'menu', id);
  menuTazele();
  return { tamam: true };
}

/**
 * Koddaki varsayılan menüyü tabloya yazar.
 *
 * Boş bir panelde "sıfırdan menü kur" demek, yöneticiyi mevcut menüyü
 * elle yeniden yazmaya zorlamak olurdu. Tablo doluysa hiçbir şey
 * yapmıyor — üzerine yazmak, yapılmış düzenlemeleri silerdi.
 */
export async function menuVarsayilaniYukle(): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const mevcut = await prisma.menuOgesi.count({ where: { konum: 'BASLIK', dil: 'TR' } });
  if (mevcut > 0) return { hata: 'Menü zaten kurulu. Önce mevcut ögeleri silin.' };

  const { menuTanimlari } = await import('./menu');
  const mega = await menuTanimlari();

  const duz = [
    { ad: 'Projeler', yol: '/arama' },
    { ad: 'Rehber', yol: '/rehber' },
    { ad: 'İletişim', yol: '/iletisim' },
  ];

  let sira = 0;
  for (const d of duz) {
    await prisma.menuOgesi.create({ data: { konum: 'BASLIK', ad: d.ad, yol: d.yol, sira: sira++ } });
  }

  for (const m of mega) {
    const ust = await prisma.menuOgesi.create({
      data: {
        konum: 'BASLIK', ad: m.ad, yol: m.yol, mega: true, sira: sira++,
        tanitimBaslik: m.tanitim.baslik, tanitimMetin: m.tanitim.metin,
        tanitimDugme: m.tanitim.dugme, tanitimYol: m.tanitim.yol,
        seritBaslik: m.populerBaslik,
      },
      select: { id: true },
    });
    let sSira = 0;
    for (const s of m.sutunlar) {
      const sutun = await prisma.menuOgesi.create({
        data: { konum: 'BASLIK', ad: s.baslik, ustId: ust.id, sira: sSira++ },
        select: { id: true },
      });
      let bSira = 0;
      for (const b of s.baglantilar) {
        await prisma.menuOgesi.create({
          data: {
            konum: 'BASLIK', ad: b.ad, yol: b.yol, ikon: b.ikon,
            not: b.not ?? null, ustId: sutun.id, sira: bSira++,
          },
        });
      }
    }
  }

  await denetimYaz(admin.id, 'menu.varsayilanYuklendi', 'menu', 'BASLIK');
  menuTazele();
  return { tamam: true };
}

/* ---------------- Hero görselleri ---------------- */

function heroTazele() {
  try { revalidateTag(HERO_ETIKET); } catch { /* istek bağlamı yok */ }
  tazele('/', '/yonetim/hero');
}

export async function heroKaydet(
  _onceki: IcerikSonucu | null, form: FormData,
): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const metin = (a: string) => String(form.get(a) ?? '').trim();

  const girdi = { url: metin('url'), alt: metin('alt') };
  const hata = heroDenetle(girdi);
  if (hata) return { hata };

  const veri = {
    ...girdi,
    etiket: metin('etiket') || null,
    sira: Number(form.get('sira') ?? 0) || 0,
    aktif: form.get('aktif') !== 'hayir',
  };

  const id = metin('id');
  if (id) {
    await prisma.heroGorsel.update({ where: { id }, data: veri });
    await denetimYaz(admin.id, 'hero.guncellendi', 'hero', id);
  } else {
    const y = await prisma.heroGorsel.create({ data: veri, select: { id: true } });
    await denetimYaz(admin.id, 'hero.olusturuldu', 'hero', y.id);
  }
  heroTazele();
  return { tamam: true };
}

export async function heroDurum(id: string, aktif: boolean): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  await prisma.heroGorsel.update({ where: { id }, data: { aktif } });
  await denetimYaz(admin.id, aktif ? 'hero.acildi' : 'hero.kapatildi', 'hero', id);
  heroTazele();
  return { tamam: true };
}

export async function heroSil(id: string): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const h = await prisma.heroGorsel.findUnique({
    where: { id }, select: { depoAnahtar: true },
  });
  if (!h) return { hata: 'Görsel bulunamadı.' };

  await prisma.heroGorsel.delete({ where: { id } });

  /* Panelden YÜKLENMİŞSE dosyayı da sil: kayıt gidip dosya kalırsa
     depoda kimsenin göremediği bir dosya birikiyor. Silme sırası
     önce kayıt: dosya silinip kayıt kalsaydı hero kırık görsel
     gösterirdi. Dosya silinemezse kayıt yine de gitmiş oluyor —
     görünürdeki sorun çözülüyor, artık dosya sonra temizlenebilir. */
  if (h.depoAnahtar) {
    await depo()?.sil(h.depoAnahtar).catch(() => {});
  }

  await denetimYaz(admin.id, 'hero.silindi', 'hero', id);
  heroTazele();
  return { tamam: true };
}

/**
 * Hero görselini bir basamak taşır.
 *
 * Sıra gösterinin akışı: ilk kare sayfanın ilk ekranında görünen
 * kare. Sıra alanına elle sayı yazmak, iki görsele aynı sayı
 * verildiğinde diziyi sessizce bozuyordu; komşuyla YER DEĞİŞTİRME
 * bunu imkânsız kılıyor.
 */
export async function heroTasi(id: string, yon: 'yukari' | 'asagi'): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();
  const bu = await prisma.heroGorsel.findUnique({
    where: { id }, select: { id: true, sira: true },
  });
  if (!bu) return { hata: 'Görsel bulunamadı.' };

  const komsu = await prisma.heroGorsel.findFirst({
    where: yon === 'yukari' ? { sira: { lt: bu.sira } } : { sira: { gt: bu.sira } },
    orderBy: { sira: yon === 'yukari' ? 'desc' : 'asc' },
    select: { id: true, sira: true },
  });
  if (!komsu) return { hata: yon === 'yukari' ? 'Zaten en üstte.' : 'Zaten en altta.' };

  await prisma.$transaction([
    prisma.heroGorsel.update({ where: { id: bu.id }, data: { sira: komsu.sira } }),
    prisma.heroGorsel.update({ where: { id: komsu.id }, data: { sira: bu.sira } }),
  ]);

  await denetimYaz(admin.id, 'hero.tasindi', 'hero', id, { yon });
  heroTazele();
  return { tamam: true };
}

/* ---------------- Bölge ekleme ve silme ---------------- */

export async function bolgeOlustur(
  _onceki: ProjeSonucu | null, form: FormData,
): Promise<ProjeSonucu> {
  const admin = await adminZorunlu();
  const metin = (a: string) => String(form.get(a) ?? '').trim();

  const girdi = {
    slug: slugla(metin('slug') || metin('ad')),
    ad: metin('ad'),
    il: metin('il'),
    lat: Number(form.get('lat')),
    lng: Number(form.get('lng')),
    img: metin('img'),
    ozet: metin('ozet'),
  };

  const hata = bolgeDenetle(girdi);
  if (hata) return { hata };

  try {
    await prisma.bolge.create({
      data: {
        ...girdi,
        adet: Number(form.get('adet') ?? 0) || 0,
        /* İskeletle açılıyor: boş JSON yazılsaydı iniş sayfası
           `icerik.mevkiler.map(...)` deyip 500 verirdi. İçerik
           "Bölgeler & içerik" ekranından dolduruluyor. */
        icerik: BOS_ICERIK,
        /* Yayın dışı açılıyor: içeriği boş bir iniş sayfasının
           arama motoruna açılması, zayıf sayfa üretmek demek. */
        yayinda: false,
      },
    });
  } catch (e) {
    const msj = e instanceof Error ? e.message : '';
    if (msj.includes('Unique constraint')) {
      return { hata: `"${girdi.slug}" adresi zaten kullanılıyor.` };
    }
    return { hata: 'Bölge oluşturulamadı.' };
  }

  await denetimYaz(admin.id, 'bolge.olusturuldu', 'bolge', girdi.slug);
  tazele('/yonetim/bolgeler', '/bolgeler');
  return { tamam: true };
}

/** Silme raporu — panel onay ekranında gösteriliyor. */
export async function bolgeSilmeOnBakis(id: string) {
  await adminZorunlu();
  return bolgeSilmeRaporu(id);
}

export async function bolgeSil(id: string): Promise<ProjeSonucu> {
  const admin = await adminZorunlu();
  const rapor = await bolgeSilmeRaporu(id);
  if (!rapor.izin) return { hata: rapor.engel };

  const b = await prisma.bolge.delete({ where: { id }, select: { slug: true } });
  await denetimYaz(admin.id, 'bolge.silindi', 'bolge', id);
  tazele('/yonetim/bolgeler', '/bolgeler', `/projeler/${b.slug}`);
  return { tamam: true };
}

/* ---------------- Proje ve firma silme ---------------- */

export async function projeSilmeOnBakis(id: string) {
  await adminZorunlu();
  return projeSilmeRaporu(id);
}

export async function projeSil(id: string, onay: string): Promise<ProjeSonucu> {
  const admin = await adminZorunlu();

  /* Yazılı onay: proje silmek daire tiplerini, soruları ve fiyat
     alarmlarını da götürüyor ve geri alınamıyor. Tek tıkla
     yapılabilir olmamalı. */
  if (onay.trim().toUpperCase() !== 'SİL' && onay.trim().toUpperCase() !== 'SIL') {
    return { hata: 'Onaylamak için SİL yazın.' };
  }

  const rapor = await projeSilmeRaporu(id);
  if (!rapor.izin) return { hata: rapor.engel };

  const v = await prisma.proje.delete({ where: { id }, select: { slug: true } });
  await denetimYaz(admin.id, 'proje.silindi', 'proje', id);
  tazele('/yonetim/projeler', '/arama', `/proje/${v.slug}`);
  return { tamam: true };
}

export async function firmaSilmeOnBakis(id: string) {
  await adminZorunlu();
  return firmaSilmeRaporu(id);
}

export async function firmaSil(id: string, onay: string): Promise<ProjeSonucu> {
  const admin = await adminZorunlu();
  if (onay.trim().toUpperCase() !== 'SİL' && onay.trim().toUpperCase() !== 'SIL') {
    return { hata: 'Onaylamak için SİL yazın.' };
  }

  const rapor = await firmaSilmeRaporu(id);
  if (!rapor.izin) return { hata: rapor.engel };

  await prisma.firma.delete({ where: { id } });
  await denetimYaz(admin.id, 'firma.silindi', 'firma', id);
  tazele('/yonetim/firmalar', '/firmalar');
  return { tamam: true };
}

/* ---------------- Kategoriler (özellikler) ----------------
   `Ozellik` tablosu arama filtrelerinin, proje etiketlerinin ve
   `/projeler/[bölge]/[özellik]` iniş sayfalarının kaynağı.
   Panelden yönetilmiyordu: yeni bir kategori açmak kod değişikliği
   ve dağıtım gerektiriyordu.

   KOD sonradan değiştirilemiyor. Projelere `proje_ozellik` üzerinden
   bağlı ve iniş sayfası adresleri ona göre üretiliyor; değiştirmek
   hem bağları hem yayındaki adresleri kırardı. */

function kategoriDenetle(kod: string, ad: string, ikon: string, landingSlug: string): string | null {
  if (!/^[a-z0-9]{2,24}$/.test(kod)) {
    return 'Kod yalnızca küçük harf ve rakam içerebilir (2–24 karakter).';
  }
  if (ad.trim().length < 2) return 'Kategori adı en az 2 karakter olmalı.';
  if (!(KATEGORI_IKONLARI as readonly string[]).includes(ikon)) return 'Geçersiz ikon.';
  if (landingSlug && !/^[a-z0-9-]{3,60}$/.test(landingSlug)) {
    return 'İniş sayfası adresi küçük harf, rakam ve tire içerebilir.';
  }
  return null;
}

export async function kategoriOlustur(
  _onceki: ProjeSonucu | null,
  form: FormData,
): Promise<ProjeSonucu> {
  const admin = await adminZorunlu();
  const kod = String(form.get('kod') ?? '').trim().toLowerCase();
  const ad = String(form.get('ad') ?? '').trim();
  const ikon = String(form.get('ikon') ?? 'spark');
  const landingSlug = String(form.get('landingSlug') ?? '').trim();
  const landingBaslik = String(form.get('landingBaslik') ?? '').trim();
  const landingAciklama = String(form.get('landingAciklama') ?? '').trim();

  const hata = kategoriDenetle(kod, ad, ikon, landingSlug);
  if (hata) return { hata };
  /* İniş sayfası ÜÇÜ BİRDEN ister: slug varsa başlık ve açıklama da
     olmalı, yoksa sayfa boş başlıkla üretiliyor. */
  if (landingSlug && (landingBaslik.length < 5 || landingAciklama.length < 30)) {
    return { hata: 'İniş sayfası için başlık (5+) ve açıklama (30+ karakter) gerekli.' };
  }
  if (await prisma.ozellik.findUnique({ where: { kod }, select: { id: true } })) {
    return { hata: `"${kod}" kodu zaten kullanılıyor.` };
  }

  const enBuyuk = await prisma.ozellik.aggregate({ _max: { sira: true } });
  await prisma.ozellik.create({
    data: {
      kod, ad, ikon,
      landingSlug: landingSlug || null,
      landingBaslik: landingSlug ? landingBaslik : null,
      landingAciklama: landingSlug ? landingAciklama : null,
      sira: (enBuyuk._max.sira ?? 0) + 1,
    },
  });

  await denetimYaz(admin.id, 'kategori.olusturuldu', 'ozellik', kod, { ad });
  tazele('/yonetim/kategoriler', '/arama', '/', '/bolgeler');
  return { tamam: true };
}

export async function kategoriKaydet(
  _onceki: ProjeSonucu | null,
  form: FormData,
): Promise<ProjeSonucu> {
  const admin = await adminZorunlu();
  const id = String(form.get('id') ?? '');
  const ad = String(form.get('ad') ?? '').trim();
  const ikon = String(form.get('ikon') ?? 'spark');
  const landingSlug = String(form.get('landingSlug') ?? '').trim();
  const landingBaslik = String(form.get('landingBaslik') ?? '').trim();
  const landingAciklama = String(form.get('landingAciklama') ?? '').trim();

  const mevcut = await prisma.ozellik.findUnique({
    where: { id }, select: { kod: true, landingSlug: true },
  });
  if (!mevcut) return { hata: 'Kategori bulunamadı.' };

  const hata = kategoriDenetle(mevcut.kod, ad, ikon, landingSlug);
  if (hata) return { hata };
  if (landingSlug && (landingBaslik.length < 5 || landingAciklama.length < 30)) {
    return { hata: 'İniş sayfası için başlık (5+) ve açıklama (30+ karakter) gerekli.' };
  }
  if (landingSlug) {
    const cakisan = await prisma.ozellik.findFirst({
      where: { landingSlug, NOT: { id } }, select: { kod: true },
    });
    if (cakisan) return { hata: `"${landingSlug}" adresi ${cakisan.kod} kategorisinde kullanılıyor.` };
  }

  await prisma.ozellik.update({
    where: { id },
    data: {
      ad, ikon,
      landingSlug: landingSlug || null,
      landingBaslik: landingSlug ? landingBaslik : null,
      landingAciklama: landingSlug ? landingAciklama : null,
    },
  });

  await denetimYaz(admin.id, 'kategori.guncellendi', 'ozellik', mevcut.kod, { ad });
  /* İniş sayfası adresi değiştiyse eski adres 404 veriyor; sitemap ve
     bölge sayfaları da tazeleniyor. */
  tazele('/yonetim/kategoriler', '/arama', '/', '/bolgeler');
  return { tamam: true };
}

/**
 * Kategoriyi bir basamak taşır.
 *
 * Sıra; arama filtrelerinin, ana sayfadaki tema ızgarasının ve iniş
 * sayfası listelerinin dizilişini belirliyor. Komşuyla YER
 * DEĞİŞTİRİYOR — tek tek `sira` yazmak, arada boşluk kalınca
 * sıralamayı sessizce bozuyor.
 */
export async function kategoriTasi(id: string, yon: 'yukari' | 'asagi'): Promise<ProjeSonucu> {
  const admin = await adminZorunlu();
  const bu = await prisma.ozellik.findUnique({
    where: { id }, select: { id: true, sira: true, kod: true },
  });
  if (!bu) return { hata: 'Kategori bulunamadı.' };

  const komsu = await prisma.ozellik.findFirst({
    where: yon === 'yukari' ? { sira: { lt: bu.sira } } : { sira: { gt: bu.sira } },
    orderBy: { sira: yon === 'yukari' ? 'desc' : 'asc' },
    select: { id: true, sira: true },
  });
  if (!komsu) return { hata: yon === 'yukari' ? 'Zaten en üstte.' : 'Zaten en altta.' };

  await prisma.$transaction([
    prisma.ozellik.update({ where: { id: bu.id }, data: { sira: komsu.sira } }),
    prisma.ozellik.update({ where: { id: komsu.id }, data: { sira: bu.sira } }),
  ]);

  await denetimYaz(admin.id, 'kategori.tasindi', 'ozellik', bu.kod, { yon });
  tazele('/yonetim/kategoriler', '/arama', '/');
  return { tamam: true };
}

/**
 * Kategoriyi siler.
 *
 * Projeye bağlıysa REDDEDİYOR: `proje_ozellik` cascade ile giderdi ve
 * "kapalı otopark" etiketini taşıyan kırk proje etiketini sessizce
 * kaybederdi. Önce projelerden kaldırılması isteniyor.
 */
export async function kategoriSil(id: string): Promise<ProjeSonucu> {
  const admin = await adminZorunlu();
  const o = await prisma.ozellik.findUnique({
    where: { id },
    select: { kod: true, ad: true, _count: { select: { projeler: true } } },
  });
  if (!o) return { hata: 'Kategori bulunamadı.' };
  if (o._count.projeler > 0) {
    return {
      hata: `Bu kategori ${o._count.projeler} projede kullanılıyor. Önce projelerden kaldırın`
        + ' — silmek etiketleri sessizce yok ederdi.',
    };
  }

  await prisma.ozellik.delete({ where: { id } });
  await denetimYaz(admin.id, 'kategori.silindi', 'ozellik', o.kod, { ad: o.ad });
  tazele('/yonetim/kategoriler', '/arama', '/', '/bolgeler');
  return { tamam: true };
}

/**
 * Bölgeyi bir basamak taşır.
 *
 * Sıra; ana sayfadaki bölge ızgarasının, altbilgi bağlantılarının ve
 * `/bolgeler` hub'ının dizilişi. Kategorilerdeki gibi komşuyla YER
 * DEĞİŞTİRİYOR — tek tek `sira` yazmak, arada boşluk kalınca
 * sıralamayı sessizce bozuyor.
 */
export async function bolgeTasi(id: string, yon: 'yukari' | 'asagi'): Promise<ProjeSonucu> {
  const admin = await adminZorunlu();
  const bu = await prisma.bolge.findUnique({
    where: { id }, select: { id: true, sira: true, slug: true },
  });
  if (!bu) return { hata: 'Bölge bulunamadı.' };

  const komsu = await prisma.bolge.findFirst({
    where: yon === 'yukari' ? { sira: { lt: bu.sira } } : { sira: { gt: bu.sira } },
    orderBy: { sira: yon === 'yukari' ? 'desc' : 'asc' },
    select: { id: true, sira: true },
  });
  if (!komsu) return { hata: yon === 'yukari' ? 'Zaten en üstte.' : 'Zaten en altta.' };

  await prisma.$transaction([
    prisma.bolge.update({ where: { id: bu.id }, data: { sira: komsu.sira } }),
    prisma.bolge.update({ where: { id: komsu.id }, data: { sira: bu.sira } }),
  ]);

  await denetimYaz(admin.id, 'bolge.tasindi', 'bolge', bu.slug, { yon });
  tazele('/yonetim/bolgeler', '/', '/bolgeler');
  return { tamam: true };
}

/* ---------------- Kontrol raporu ---------------- */

/**
 * KonutProjeleri kontrol raporunu kaydeder.
 *
 * Maddeler koda gömülü; form her madde için `durum-<kod>` ve
 * `not-<kod>` alanları gönderiyor. Kayda YALNIZCA işaretlenmiş
 * maddeler yazılıyor: boş bırakılan bir madde "bakılmadı" demek ve
 * onu sessizce "geçti" saymak, yapılmamış bir kontrolü yapılmış
 * göstermek olurdu.
 */
export async function kontrolRaporuKaydet(
  _onceki: IcerikSonucu | null,
  form: FormData,
): Promise<IcerikSonucu> {
  const admin = await adminZorunlu();

  const projeId = String(form.get('projeId') ?? '');
  const ziyaret = String(form.get('ziyaret') ?? '').trim();
  const kontrolEden = String(form.get('kontrolEden') ?? '').trim();
  const ozet = String(form.get('ozet') ?? '').trim();
  const yayinda = form.get('yayinda') === 'on';

  const proje = await prisma.proje.findUnique({ where: { id: projeId }, select: { slug: true } });
  if (!proje) return { hata: 'Proje bulunamadı.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ziyaret)) return { hata: 'Ziyaret tarihi gerekli.', alan: 'ziyaret' };
  if (kontrolEden.length < 2) return { hata: 'Kontrolü yapan kişinin adı gerekli.', alan: 'kontrolEden' };
  if (new Date(`${ziyaret}T00:00:00Z`).getTime() > Date.now()) {
    return { hata: 'Ziyaret tarihi gelecekte olamaz.', alan: 'ziyaret' };
  }

  const sonuclar = KONTROL_MADDELERI.flatMap((m) => {
    const durum = String(form.get(`durum-${m.kod}`) ?? '');
    if (durum !== 'gecti' && durum !== 'kalmadi' && durum !== 'uygulanmaz') return [];
    const not = String(form.get(`not-${m.kod}`) ?? '').trim().slice(0, 200);
    return [{ kod: m.kod, durum, ...(not ? { not } : {}) }];
  });

  if (sonuclar.length === 0) return { hata: 'En az bir madde işaretlenmeli.' };

  const veri = {
    ziyaret: new Date(`${ziyaret}T00:00:00Z`),
    kontrolEden: kontrolEden.slice(0, 60),
    ozet: ozet ? ozet.slice(0, 400) : null,
    sonuclar: sonuclar as unknown as Prisma.InputJsonValue,
    yayinda,
    guncelleyenId: admin.id,
  };

  await prisma.kontrolRaporu.upsert({
    where: { projeId },
    create: { projeId, ...veri },
    update: veri,
  });
  await denetimYaz(admin.id, 'kontrol.kaydedildi', 'proje', projeId, {
    madde: sonuclar.length, yayinda,
  });
  tazele(`/yonetim/projeler/${projeId}`, `/proje/${proje.slug}`);
  return { tamam: true };
}

/* ---------------- Konsiyerj hizmetleri ---------------- */


/** Şemadaki `TapuDurumu` değerleri — formdan gelen değer buna daraltılıyor. */
const TAPU_KODLARI: string[] = [
  'KAT_MULKIYETI', 'KAT_IRTIFAKI', 'ARSA_TAPULU', 'HISSELI', 'TAHSIS',
];


/* ---------------- Satış talebi ----------------
   Talep salt okunur DEĞİL: satış ekibi arıyor ve sonucu buraya
   yazıyor. Durum ve not olmadan liste, iki gün sonra kimin arandığı
   bilinmeyen bir yığına dönüyor. */
export async function talepDurum(
  id: string,
  durum: string,
  ekipNotu?: string,
): Promise<IcerikSonucu> {
  const k = await adminZorunlu();
  if (!(TALEP_DURUMLARI as readonly string[]).includes(durum)) {
    return { hata: 'Geçersiz talep durumu.' };
  }

  const mevcut = await prisma.talep.findUnique({
    where: { id }, select: { id: true, durum: true },
  });
  if (!mevcut) return { hata: 'Talep bulunamadı.' };

  await prisma.talep.update({
    where: { id },
    data: {
      durum: durum as TalepDurumu,
      ...(ekipNotu !== undefined ? { ekipNotu: ekipNotu.trim() || null } : {}),
      /* Talebi ilk kez elleyen kişi ÜSTLENİYOR. Atama ayrı bir
         eylem olsaydı kimse kullanmaz ve "kim ilgileniyor" sorusu
         cevapsız kalırdı. Sonraki değişiklikler atamayı bozmuyor. */
      ...(mevcut.durum === 'YENI' ? { atananId: k.id } : {}),
    },
  });

  await denetimYaz(k.id, 'talep.durum_guncellendi', 'talep', id, {
    once: mevcut.durum, sonra: durum,
  });
  tazele('/yonetim/talepler');
  return { tamam: true };
}
