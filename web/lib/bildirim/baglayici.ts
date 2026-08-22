import 'server-only';
import { prisma } from '../db';
import { telefonBicim } from '../talep';
import * as SS from '../sms/sablonlar';
import { bildirimGonder, smsGonder } from './index';
import * as EN from './sablonlar-en';
import * as S from './sablonlar';

/* ============================================================
   Akışlar ile şablonlar arasındaki bağlayıcı.

   Talep/mesaj akışları e-posta şablonlarını doğrudan bilmez; burada
   tek bir yerde toplanır. Böylece bir bildirimin ne zaman gideceği
   tek dosyaya bakarak anlaşılır.

   Tüm fonksiyonlar hata yutar: bildirim gönderilememesi talebin
   kaydedilmesini engellememeli. TEK İSTİSNA `veriTalebiBildirimi` —
   gerekçesi kendi başlığında.
   ============================================================ */

const yut = (etiket: string) => (e: unknown) => console.error(`Bildirim (${etiket}) hatası:`, e);

/**
 * Ekibin bildirim adresi.
 *
 * `EKIP_EPOSTA` tanımlıysa o; değilse aktif yönetici hesapları.
 * Hiçbiri yoksa bildirim gönderilmiyor — uydurma bir adrese
 * göndermek sessiz kayıp üretirdi.
 */
async function ekipAdresleri(): Promise<{ eposta: string; ad: string }[]> {
  const ayarli = process.env.EKIP_EPOSTA?.trim();
  if (ayarli) {
    return ayarli.split(',').map((e) => ({ eposta: e.trim(), ad: 'KonutProjeleri ekibi' }))
      .filter((x) => x.eposta.includes('@'));
  }
  const yoneticiler = await prisma.kullanici.findMany({
    where: { rol: 'ADMIN', aktif: true },
    select: { eposta: true, ad: true },
  });
  /* ADRES YOKSA SESSİZ KALMIYOR. Bu sitede talep tek dönüşüm hedefi;
     ekibe hiçbir adres tanımlı değilse her talep bildirimi sessizce
     yok oluyor ve kimse fark etmiyor. Kurulum hatasının kendini
     göstereceği tek yer sunucu günlüğü. */
  if (yoneticiler.length === 0) {
    console.error(
      'Bildirim: ekip adresi yok — EKIP_EPOSTA tanımlı değil ve aktif '
      + 'yönetici hesabı bulunamadı. Satış talebi bildirimleri KİMSEYE gitmiyor.',
    );
  }
  return yoneticiler.map((k) => ({ eposta: k.eposta, ad: k.ad }));
}

/* ---------------- Satış talebi ---------------- */

/**
 * Satış ekibine: yeni talep düştü. Ayrıca talep sahibine alındı
 * teyidi.
 *
 * Talebin kendisi bildirimden ÖNCE yazılıyor (bkz. `lib/talep.ts`):
 * sağlayıcı hatası, kaydedilmiş bir talebi kaybetmemeli.
 *
 * TEYİT E-POSTASI ANCAK ADRES VARSA: e-posta isteğe bağlı bir alan ve
 * talep sahiplerinin çoğu yalnızca telefon bırakıyor. SMS teyidi
 * gönderilmiyor — talep sahibi numarasını bir saniye önce yazdı,
 * "aldık" SMS'i ona bir şey söylemiyor ve gönderim maliyeti üretiyor.
 */
export async function yeniTalepBildirimi(talepId: string) {
  try {
    const t = await prisma.talep.findUnique({
      where: { id: talepId },
      select: {
        kod: true, ad: true, telefon: true, eposta: true, saat: true, not: true,
        niyet: true, butceMin: true, butceMax: true, odemeSekli: true,
        proje: { select: { ad: true, slug: true, fiyatMin: true } },
        daireTipi: { select: { ad: true, brutM2: true } },
      },
    });
    if (!t) return;

    const ekipSablonu = S.talepEkip({
      kod: t.kod,
      niyet: t.niyet,
      ad: t.ad,
      telefon: telefonBicim(t.telefon),
      eposta: t.eposta,
      projeAd: t.proje?.ad ?? null,
      projeFiyat: t.proje?.fiyatMin ?? null,
      daireTipi: t.daireTipi ? `${t.daireTipi.ad} · ${t.daireTipi.brutM2} m²` : null,
      butceMin: t.butceMin,
      butceMax: t.butceMax,
      odemeSekli: t.odemeSekli,
      saat: t.saat,
      not: t.not,
    });

    for (const alici of await ekipAdresleri()) {
      await bildirimGonder({
        tip: 'TALEP_EKIP', alici: alici.eposta, aliciAd: alici.ad,
        sablon: ekipSablonu, talepId,
      });
    }

    if (t.eposta) {
      await bildirimGonder({
        tip: 'TALEP_ALINDI',
        alici: t.eposta, aliciAd: t.ad,
        sablon: S.talepAlindi(t.ad, t.kod, t.proje?.ad ?? null, t.proje?.slug ?? null),
        talepId,
      });
    }
  } catch (e) { yut('yeni talep')(e); }
}

/**
 * Talep sahibine: randevu teyidi.
 *
 * Adres yoksa SMS'e düşüyor: randevu, tarih ve saat taşıyan tek
 * bildirim ve yanlış hatırlanması karşılıklı zaman kaybı. Burada
 * SMS'in maliyeti gerekçeli.
 */
export async function randevuTeyitBildirimi(talepId: string, ne: Date, nerede: string) {
  try {
    const t = await prisma.talep.findUnique({
      where: { id: talepId },
      select: {
        kod: true, ad: true, telefon: true, eposta: true,
        proje: { select: { ad: true } },
      },
    });
    if (!t) return;

    const projeAd = t.proje?.ad ?? null;

    if (t.eposta) {
      await bildirimGonder({
        tip: 'RANDEVU_TEYIT',
        alici: t.eposta, aliciAd: t.ad,
        sablon: S.randevuTeyit(t.ad, t.kod, projeAd, ne, nerede),
        talepId,
      });
      return;
    }

    await smsGonder({
      tip: 'RANDEVU_TEYIT',
      alici: t.telefon, aliciAd: t.ad,
      sablon: SS.randevuTeyit(projeAd, ne, nerede),
      talepId,
    });
  } catch (e) { yut('randevu teyidi')(e); }
}

/* ---------------- Proje soruları ---------------- */

export async function yeniSoruBildirimi(konusmaId: string) {
  try {
    const k = await prisma.konusma.findUnique({
      where: { id: konusmaId },
      select: {
        soranAd: true, konu: true,
        proje: {
          select: {
            ad: true,
            firma: { select: { ad: true, kullanici: { select: { eposta: true } } } },
          },
        },
        mesajlar: { orderBy: { olusturma: 'asc' }, take: 1, select: { metin: true } },
      },
    });
    if (!k) return;

    const sablon = S.yeniSoru(
      k.proje.firma.ad, k.soranAd, k.proje.ad, k.mesajlar[0]?.metin ?? '', konusmaId,
    );

    /* Soru önce PROJENİN FİRMASINA gidiyor; firmanın panel hesabı
       yoksa ekibe düşüyor. Hiçbirine göndermemek, soruyu sessizce
       yutmak demekti — soran kişi yanıt bekliyor. */
    const firmaEposta = k.proje.firma.kullanici?.eposta;
    if (firmaEposta) {
      await bildirimGonder({
        tip: 'YENI_SORU',
        alici: firmaEposta, aliciAd: k.proje.firma.ad,
        sablon, konusmaId,
      });
      return;
    }

    for (const alici of await ekipAdresleri()) {
      await bildirimGonder({
        tip: 'YENI_SORU', alici: alici.eposta, aliciAd: alici.ad, sablon, konusmaId,
      });
    }
  } catch (e) { yut('yeni soru')(e); }
}

export async function soruYanitBildirimi(konusmaId: string, yanit: string) {
  try {
    const k = await prisma.konusma.findUnique({
      where: { id: konusmaId },
      select: {
        soranAd: true, soranEposta: true, dil: true,
        proje: { select: { ad: true, slug: true, firma: { select: { ad: true } } } },
      },
    });
    if (!k) return;

    // Soruyu İngilizce soran kişiye Türkçe yanıt bildirimi gitmemeli
    const T = (k.dil === 'EN' ? EN : S) as typeof S;

    await bildirimGonder({
      tip: 'SORU_YANITLANDI',
      alici: k.soranEposta, aliciAd: k.soranAd,
      sablon: T.soruYanitlandi(k.soranAd, k.proje.firma.ad, k.proje.ad, k.proje.slug, yanit),
      konusmaId,
    });
  } catch (e) { yut('soru yanıtı')(e); }
}

/* ---------------- Hesap ---------------- */

export async function hesapBildirimi(kullaniciId: string, geciciParola: string, yeniMi: boolean) {
  try {
    const k = await prisma.kullanici.findUnique({
      where: { id: kullaniciId },
      select: { ad: true, eposta: true, rol: true },
    });
    if (!k) return;

    await bildirimGonder({
      tip: yeniMi ? 'HESAP_OLUSTURULDU' : 'PAROLA_SIFIRLANDI',
      alici: k.eposta, aliciAd: k.ad,
      sablon: yeniMi
        ? S.hesapOlusturuldu(k.ad, k.eposta, geciciParola, k.rol)
        : S.parolaSifirlandi(k.ad, geciciParola),
      kullaniciId,
    });
  } catch (e) { yut('hesap')(e); }
}

/* ---------------- KVKK ---------------- */

/**
 * KVKK talebi doğrulama postası.
 *
 * `yut` ile sessiz düşmüyor: gönderilemezse talep sahibi hiçbir zaman
 * doğrulayamaz ve KVKK'nın otuz günlük yanıt süresi sessizce kaçar.
 * Hata yukarı taşınıyor ki eylem kullanıcıya bildirebilsin.
 */
export async function veriTalebiBildirimi(
  eposta: string, tip: 'ERISIM' | 'SILME', jeton: string,
): Promise<void> {
  /* Talepte dil alanı yok — kişinin hesabı da yok. Ama adres bir
     proje sorusuna bağlıysa o konuşmanın dili biliniyor. Doğrulama
     postası anlaşılmazsa kişi tıklamaz ve hakkını kullanamaz. */
  const son = await prisma.konusma.findFirst({
    where: { soranEposta: eposta },
    orderBy: { olusturma: 'desc' },
    select: { dil: true },
  }).catch(() => null);

  await bildirimGonder({
    tip: 'KVKK_DOGRULAMA',
    alici: eposta,
    aliciAd: son?.dil === 'EN' ? 'Data subject' : 'Veri sahibi',
    sablon: (son?.dil === 'EN' ? EN : S).kvkkDogrulama(tip, jeton),
  });
}

/* ---------------- Firma başvurusu ---------------- */

/** Ekibe: yeni firma başvurusu. */
export async function basvuruAlindiBildirimi(basvuruId: string) {
  try {
    const b = await prisma.firmaBasvuru.findUnique({
      where: { id: basvuruId },
      select: {
        ad: true, telefon: true, eposta: true, firmaAd: true,
        bolge: true, projeSayisi: true, mesaj: true,
      },
    });
    if (!b) return;

    const sablon = S.basvuruAlindi(
      b.ad, b.telefon, b.eposta, b.firmaAd, b.bolge, b.projeSayisi, b.mesaj,
    );
    for (const alici of await ekipAdresleri()) {
      await bildirimGonder({
        tip: 'BASVURU_ALINDI', alici: alici.eposta, aliciAd: alici.ad, sablon,
      });
    }
  } catch (e) { yut('başvuru alındı')(e); }
}

/** Başvurana: sonuç bildirimi. */
export async function basvuruSonucBildirimi(basvuruId: string, onaylandi: boolean) {
  try {
    const b = await prisma.firmaBasvuru.findUnique({
      where: { id: basvuruId },
      select: { ad: true, eposta: true, not: true },
    });
    if (!b) return;

    await bildirimGonder({
      tip: onaylandi ? 'BASVURU_ONAYLANDI' : 'BASVURU_REDDEDILDI',
      alici: b.eposta, aliciAd: b.ad,
      sablon: onaylandi
        ? S.basvuruOnaylandi(b.ad)
        : S.basvuruReddedildi(b.ad, b.not ?? 'Gerekçe belirtilmemiş.'),
    });
  } catch (e) { yut('başvuru sonucu')(e); }
}

/* ---------------- Fiyat alarmı ---------------- */

/**
 * Takipçiye: alarm doğrulama bağlantısı.
 *
 * ÇİFT OPT-IN'in taşıyıcısı: bu posta tıklanmadan alarm hiç
 * çalışmıyor. Başkasının adresini forma yazan biri, bizi o adrese
 * istenmeyen posta gönderen taraf yapamasın.
 *
 * Hata yutuluyor — alarm satırı zaten yazıldı; sağlayıcı arızasını
 * "kurulamadı" diye göstermek, yazılmış bir kaydı yazılmamış gibi
 * sunardı. Kişi posta gelmezse alarmı yeniden kurabiliyor.
 */
export async function alarmDogrulamaBildirimi(alarmId: string) {
  try {
    const a = await prisma.fiyatAlarmi.findUnique({
      where: { id: alarmId },
      select: {
        eposta: true, hedef: true, jeton: true, dogrulandi: true,
        proje: { select: { ad: true } },
      },
    });
    if (!a || a.dogrulandi) return;

    await bildirimGonder({
      tip: 'ALARM_DOGRULAMA',
      alici: a.eposta, aliciAd: a.eposta.split('@')[0],
      sablon: S.alarmDogrulama(a.proje.ad, a.hedef, a.jeton),
    });
  } catch (e) { yut('alarm doğrulama')(e); }
}
