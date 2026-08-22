import 'server-only';
import { prisma } from './db';

/* ============================================================
   Kişisel veri envanteri.

   KİŞİSEL VERİ TUTAN HER TABLO BURADA. Yeni bir tablo eklenip buraya
   yazılmazsa, veri sahibi "bende ne var" diye sorduğunda eksik yanıt
   verilir ve silme talebinde o tablo geride kalır. KVKK açısından
   ikisi de ihlal.

   ── Silme neden GERÇEKTEN silme ─────────────────────────────

   Bu sitede para hareketi yok: ziyaretçi bir şey satın almıyor,
   satış ekibiyle temas kuruyor. Fatura, ödeme kaydı, ticari defter
   üretilmiyor — dolayısıyla VUK md. 253 ve TTK md. 82'nin
   dayattığı saklama yükümlülüğü de doğmuyor.

   Saklama yükümlülüğü yoksa KVKK md. 7'nin tanıdığı üç yoldan
   (silme, yok etme, anonim hâle getirme) BİRİNCİSİ uygulanabiliyor
   ve uygulanması gerekiyor: satır anonimleştirilmiyor, siliniyor.
   Anonimleştirme burada gereksiz bir taviz olurdu — "sildik" deyip
   satırı tutmak, tutmayı gerektiren bir sebep yokken.

   TEK İSTİSNA: satışa dönüşmüş talep. Orada bir sözleşme ilişkisi
   doğuyor ve ilişkinin tarafı olan kişinin kimliği, ilişki sürdüğü
   sürece gerekiyor. O satırlar `silmeEngelleri` tarafından ayrıca
   ele alınıyor.
   ============================================================ */

export interface VeriKalemi {
  /** Panelde ve dışa aktarmada görünen başlık */
  baslik: string;
  /** Neden tutuluyor — KVKK aydınlatma yükümlülüğü */
  amac: string;
  kayitlar: Record<string, unknown>[];
}

export interface KisiselVeriRaporu {
  eposta: string;
  alindi: string;
  kalemler: VeriKalemi[];
  toplamKayit: number;
}

/**
 * E-postaya bağlı tüm kişisel veriyi toplar (KVKK md. 11/b–c).
 *
 * Firma yetkilisi ve panel kullanıcısı kayıtları da dâhil: aynı
 * e-posta hem alıcı hem firma yetkilisi olabilir.
 *
 * TELEFONLA BIRAKILAN TALEPLER BURADA GÖRÜNMÜYOR. Form e-postayı
 * zorunlu tutmuyor ve talep sahiplerinin büyük bölümü yalnızca
 * numara bırakıyor; e-postadan arama onları bulamıyor. Bu sınır
 * rapora AÇIKÇA yazılıyor (`telefonNotu`), sessizce eksik yanıt
 * verilmiyor — veri sahibi numarasıyla başvurabiliyor.
 */
export async function kisiselVeriTopla(eposta: string): Promise<KisiselVeriRaporu> {
  const e = eposta.trim().toLowerCase();

  const [talepler, konusmalar, alarmlar, bildirimler, engeller,
    kullanici, basvurular, veriTalepleri] = await Promise.all([
    prisma.talep.findMany({
      where: { eposta: { equals: e, mode: 'insensitive' } },
      orderBy: { olusturma: 'desc' },
      select: {
        kod: true, ad: true, telefon: true, eposta: true, niyet: true,
        butceMin: true, butceMax: true, odemeSekli: true, saat: true, not: true,
        durum: true, kaynak: true, kvkkTarih: true, olusturma: true,
        proje: { select: { ad: true } },
        daireTipi: { select: { ad: true } },
      },
    }),
    prisma.konusma.findMany({
      where: { soranEposta: { equals: e, mode: 'insensitive' } },
      orderBy: { olusturma: 'desc' },
      select: {
        soranAd: true, soranEposta: true, konu: true, olusturma: true,
        proje: { select: { ad: true } },
        mesajlar: { select: { metin: true, soranMi: true, olusturma: true }, orderBy: { olusturma: 'asc' } },
      },
    }),
    prisma.fiyatAlarmi.findMany({
      where: { eposta: { equals: e, mode: 'insensitive' } },
      select: {
        eposta: true, hedef: true, dogrulandi: true, olusturma: true,
        proje: { select: { ad: true } },
      },
    }),
    prisma.bildirim.findMany({
      where: { alici: { equals: e, mode: 'insensitive' } },
      orderBy: { olusturma: 'desc' },
      select: { kanal: true, tip: true, durum: true, konu: true, olusturma: true },
    }),
    prisma.gonderimEngeli.findMany({
      where: { adres: { equals: e, mode: 'insensitive' } },
      select: { kanal: true, sebep: true, olusturma: true },
    }),
    prisma.kullanici.findUnique({
      where: { eposta: e },
      select: { ad: true, eposta: true, rol: true, sonGiris: true, olusturma: true },
    }),
    prisma.firmaBasvuru.findMany({
      where: { eposta: { equals: e, mode: 'insensitive' } },
      orderBy: { olusturma: 'desc' },
      select: {
        ad: true, eposta: true, telefon: true, firmaAd: true, bolge: true,
        projeSayisi: true, mesaj: true, durum: true, olusturma: true,
      },
    }),
    prisma.veriTalebi.findMany({
      where: { eposta: e },
      orderBy: { olusturma: 'desc' },
      select: { tip: true, durum: true, olusturma: true, tamamlanma: true },
    }),
  ]);

  const kalemler: VeriKalemi[] = [
    {
      baslik: 'Satış talepleri',
      amac: 'Talebiniz üzerine satış ekibinin sizinle iletişim kurması; açık rızanıza dayanıyor (KVKK md. 5/1).',
      kayitlar: talepler,
    },
    {
      baslik: 'Mesajlaşma',
      amac: 'Proje hakkındaki soruların yanıtlanması; talep ve şikâyet takibi.',
      kayitlar: konusmalar,
    },
    {
      baslik: 'Fiyat alarmları',
      amac: 'Takip ettiğiniz projede fiyat düştüğünde ya da satışa çıktığında bildirim; çift onaylı abonelik.',
      kayitlar: alarmlar,
    },
    {
      baslik: 'Gönderilen bildirimler',
      amac: 'Talep bilgilendirmeleri; gönderim kanıtı (uyuşmazlık hâlinde).',
      kayitlar: bildirimler,
    },
    {
      baslik: 'Gönderim engelleri',
      amac: 'Geri dönen ya da reddedilen adrese tekrar gönderim yapılmaması.',
      kayitlar: engeller,
    },
    {
      baslik: 'Panel hesabı',
      amac: 'Yönetim veya firma paneline erişim.',
      kayitlar: kullanici ? [kullanici] : [],
    },
    {
      baslik: 'Firma başvuruları',
      amac: 'Projesini listelemek isteyen firmanın başvurusunun değerlendirilmesi.',
      kayitlar: basvurular,
    },
    {
      baslik: 'Veri sahibi talepleri',
      amac: 'KVKK başvurularının kaydı ve yanıt süresinin takibi.',
      kayitlar: veriTalepleri,
    },
  ];

  return {
    eposta: e,
    alindi: new Date().toISOString(),
    kalemler,
    toplamKayit: kalemler.reduce((t, k) => t + k.kayitlar.length, 0),
  };
}

/**
 * Rapora eklenen sınır notu.
 *
 * E-posta bırakmadan yalnızca telefonla açılan talepler bu raporda
 * yer almıyor; veri sahibinin bunu bilmesi gerekiyor.
 */
export const telefonNotu =
  'Bu döküm e-posta adresinize bağlı kayıtları içeriyor. Formu yalnızca telefon '
  + 'numarası bırakarak doldurduysanız o talepler burada görünmez; numaranızı '
  + 'belirterek yeniden başvurabilirsiniz.';

export interface SilmeEngeli {
  /**
   * `engel` — silme hiç yapılamıyor, talep reddedilmeli.
   * `kapsam` — silme yapılıyor ama bazı alanlar kalıyor; veri
   *            sahibine bildirilmesi gereken bir sınırlama.
   */
  tur: 'engel' | 'kapsam';
  sebep: string;
  ayrinti: string;
}

/**
 * Silme talebinin önündeki engeller ve kapsam sınırları.
 *
 * Ticari belge saklama yükümlülüğü YOK (bkz. dosya başlığı), o yüzden
 * "on yıl kalacak" türü bir kapsam sınırı da yok. Gerçek engeller
 * ikisi: süren satış görüşmesi ve panel hesabı. İkisinde de veri
 * hâlâ AKTİF olarak kullanılıyor.
 */
export async function silmeEngelleri(eposta: string): Promise<SilmeEngeli[]> {
  const e = eposta.trim().toLowerCase();
  const esles = { equals: e, mode: 'insensitive' as const };
  const engeller: SilmeEngeli[] = [];

  /* Süren satış görüşmesi: satış ekibi kişiyi aramak üzere ve ada,
     telefona ihtiyaç var. Anonimleştirmek görüşmeyi imkânsız kılar.
     Kişi talebini kendisi kapattıysa (ILGILENMIYOR) engel yok. */
  const acik = await prisma.talep.count({
    where: { eposta: esles, durum: { in: ['YENI', 'ARANDI', 'RANDEVU'] } },
  });
  if (acik > 0) {
    engeller.push({
      tur: 'engel',
      sebep: 'Süren satış görüşmesi',
      ayrinti: `${acik} talebiniz hâlâ açık. Görüşme sonuçlandıktan sonra `
        + 'talep yeniden değerlendirilebilir; dilerseniz önce taleplerinizi '
        + 'kapatmamızı isteyebilirsiniz.',
    });
  }

  /* Satışa dönüşmüş talep: sözleşme ilişkisi doğmuş demek. Satırın
     kendisi siliniyor ama bu ilişkinin tarafı olan firmanın kendi
     kayıtları bizde değil — kişiye nereye başvuracağı söyleniyor. */
  const satis = await prisma.talep.count({ where: { eposta: esles, durum: 'SATIS' } });
  if (satis > 0) {
    engeller.push({
      tur: 'kapsam',
      sebep: 'Satışa dönüşmüş talep',
      ayrinti: `${satis} talebiniz satışa dönüşmüş görünüyor. Bizdeki kayıtlar `
        + 'silinecek; sözleşme ilişkisi kurduğunuz firmanın kendi kayıtları '
        + 'bizde tutulmuyor, onlar için doğrudan firmaya başvurmanız gerekiyor.',
    });
  }

  // Panel hesabı olan biri "ziyaretçi" değil; hesabı önce kapatılmalı
  const hesap = await prisma.kullanici.findUnique({ where: { eposta: e }, select: { rol: true } });
  if (hesap) {
    engeller.push({
      tur: 'engel',
      sebep: 'Panel hesabı',
      ayrinti: `Bu adrese bağlı bir ${hesap.rol === 'ADMIN' ? 'yönetici' : 'firma'} hesabı var. `
        + 'Hesap ilişkisi sona ermeden veri silinemiyor.',
    });
  }

  return engeller;
}

/** Silmeyi tamamen durduran engeller (kapsam notları hariç). */
export const sertEngeller = (e: SilmeEngeli[]) => e.filter((x) => x.tur === 'engel');

export interface SilmeSonucu {
  talep: number;
  konusma: number;
  mesaj: number;
  alarm: number;
  bildirim: number;
  gonderimEngeli: number;
  basvuru: number;
  toplam: number;
}

/**
 * Kişisel veriyi siler.
 *
 * TEK İŞLEMDE: yarıda kalırsa kişi bazı tablolarda kalır ve veri
 * sahibine "silindi" denmiş olur.
 *
 * Satırlar gerçekten SİLİNİYOR (bkz. dosya başlığı). İki istisna
 * gerekçeleriyle birlikte aşağıda.
 */
export async function kisiselVeriSil(eposta: string): Promise<SilmeSonucu> {
  const e = eposta.trim().toLowerCase();
  const esles = { equals: e, mode: 'insensitive' as const };

  return prisma.$transaction(async (tx) => {
    /* Konuşmalar önce: mesajlar `Cascade` ile bağlı ama sayabilmek
       için silmeden önce sayılıyor. */
    const konusmalar = await tx.konusma.findMany({
      where: { soranEposta: esles }, select: { id: true },
    });
    const konusmaIdler = konusmalar.map((k) => k.id);

    const mesaj = konusmaIdler.length
      ? await tx.mesaj.count({ where: { konusmaId: { in: konusmaIdler } } })
      : 0;

    const konusma = await tx.konusma.deleteMany({ where: { soranEposta: esles } });

    const talep = await tx.talep.deleteMany({ where: { eposta: esles } });
    const alarm = await tx.fiyatAlarmi.deleteMany({ where: { eposta: esles } });
    const basvuru = await tx.firmaBasvuru.deleteMany({ where: { eposta: esles } });

    /* Bildirim SATIRI KALIYOR, içeriği temizleniyor. Gönderim kaydı
       "bu adrese şu tarihte ne gönderdik" sorusunun tek kanıtı ve
       istenmeyen posta şikâyetinde bize düşen ispat yükü bu. Adres ve
       gövde gidiyor; kanal, tip ve tarih kalıyor — kalan alanlar tek
       başına kimseyi işaret etmiyor. */
    const bildirim = await tx.bildirim.updateMany({
      where: { alici: esles },
      data: {
        alici: 'anonim@silinmis.gecersiz', aliciAd: 'Silinmiş kayıt',
        konu: '[silindi]', govdeHtml: '', govdeMetin: '',
      },
    });

    /* Gönderim engeli SİLİNİYOR: adresi anonimleştirmek engeli
       işlevsiz bırakır, tutmak ise silinmesi istenen adresi
       saklamak olurdu. */
    const gonderimEngeli = await tx.gonderimEngeli.deleteMany({ where: { adres: esles } });

    const sonuc: SilmeSonucu = {
      talep: talep.count,
      konusma: konusma.count,
      mesaj,
      alarm: alarm.count,
      bildirim: bildirim.count,
      gonderimEngeli: gonderimEngeli.count,
      basvuru: basvuru.count,
      toplam: 0,
    };
    sonuc.toplam = sonuc.talep + sonuc.konusma + sonuc.mesaj + sonuc.alarm
      + sonuc.bildirim + sonuc.gonderimEngeli + sonuc.basvuru;
    return sonuc;
  });
}

/* ---------------- Saklama süreleri ve otomatik imha ---------------- */

/**
 * Saklama süreleri (gün).
 *
 * KVKK md. 7: amaç ortadan kalkınca sil. "Belki lazım olur" bir amaç
 * değil. Süreler dayanaklarıyla birlikte burada; değiştirmek
 * saklama ve imha politikasını değiştirmek demek.
 */
export const SAKLAMA = {
  /** Süresi dolan oturumlar. Güvenlik incelemesi için kısa bir kuyruk. */
  oturum: 30,
  /** Anonim performans ölçümü; kişisel veri değil ama biriktirmenin anlamı yok. */
  olcum: 90,
  /** 6563 sayılı e-ticaret kanunu: kayıtlar üç yıl. */
  bildirim: 3 * 365,
  /** Yanıtlanmış ve kapanmış yazışma; e-ticaret kanunu ile aynı süre. */
  konusma: 3 * 365,
  /** Denetim kaydı: güvenlik olayı incelemesi. IP iki yıl sonra temizleniyor. */
  denetimIp: 2 * 365,
  /**
   * Sonuçlanmış satış talebi.
   *
   * İKİ YIL: konut alım kararı aylarca sürüyor ve "geçen yıl aramıştım"
   * diyen kişinin geçmişini bulabilmek satış ekibinin gerçek ihtiyacı.
   * Daha uzunu, sonuçlanmış bir ilişkinin verisini amaçsız tutmak olurdu.
   * Süre `durum` sonuçlandığı andan değil talebin açıldığı andan sayılıyor.
   */
  talep: 2 * 365,
  /** Sonuçlanmış KVKK başvurusu; başvuru kanıtı olarak iki yıl. */
  veriTalebi: 2 * 365,
} as const;

const gunOnce = (gun: number) => new Date(Date.now() - gun * 864e5);

export interface ImhaSonucu {
  oturum: number;
  olcum: number;
  bildirim: number;
  konusma: number;
  denetimIp: number;
  talep: number;
  veriTalebi: number;
  toplam: number;
}

/**
 * Saklama süresi dolan verileri imha eder.
 *
 * Zamanlanmış iş olarak çalışıyor.
 *
 * `kuruCalisma` ile hiçbir şey yazılmadan sayılar görülebiliyor;
 * imha politikasını üretimde ilk kez çalıştırmadan önce ne kadar
 * kaydın etkileneceğini görmek gerekiyor.
 */
export async function imhaCalistir(kuruCalisma = false): Promise<ImhaSonucu> {
  const s: ImhaSonucu = {
    oturum: 0, olcum: 0, bildirim: 0, konusma: 0,
    denetimIp: 0, talep: 0, veriTalebi: 0, toplam: 0,
  };

  const say = async (n: () => Promise<number>, y: () => Promise<{ count: number }>) =>
    (kuruCalisma ? await n() : (await y()).count);

  s.oturum = await say(
    () => prisma.oturum.count({ where: { sonKullanma: { lt: gunOnce(SAKLAMA.oturum) } } }),
    () => prisma.oturum.deleteMany({ where: { sonKullanma: { lt: gunOnce(SAKLAMA.oturum) } } }),
  );

  s.olcum = await say(
    () => prisma.olcumCWV.count({ where: { olusturma: { lt: gunOnce(SAKLAMA.olcum) } } }),
    () => prisma.olcumCWV.deleteMany({ where: { olusturma: { lt: gunOnce(SAKLAMA.olcum) } } }),
  );

  s.bildirim = await say(
    () => prisma.bildirim.count({ where: { olusturma: { lt: gunOnce(SAKLAMA.bildirim) } } }),
    () => prisma.bildirim.deleteMany({ where: { olusturma: { lt: gunOnce(SAKLAMA.bildirim) } } }),
  );

  // Yalnızca KAPANMIŞ yazışmalar; açık olan hâlâ yanıt bekliyor
  const konusmaKosul = {
    olusturma: { lt: gunOnce(SAKLAMA.konusma) },
    durum: 'KAPALI' as const,
  };
  s.konusma = await say(
    () => prisma.konusma.count({ where: konusmaKosul }),
    () => prisma.konusma.deleteMany({ where: konusmaKosul }),
  );

  // Denetim kaydı duruyor, yalnızca IP temizleniyor: kaydın kendisi
  // güvenlik için gerekli, IP iki yıl sonra gerekli değil
  const ipKosul = { olusturma: { lt: gunOnce(SAKLAMA.denetimIp) }, ip: { not: null } };
  s.denetimIp = await say(
    () => prisma.denetimKaydi.count({ where: ipKosul }),
    () => prisma.denetimKaydi.updateMany({ where: ipKosul, data: { ip: null } }),
  );

  /* Yalnızca SONUÇLANMIŞ talepler. Açık bir talep ne kadar eski
     olursa olsun silinmiyor — süresi dolduğu için silinen bir talep,
     satış ekibinin hâlâ aramayı beklediği kişiyi yok etmek olurdu. */
  const talepKosul = {
    olusturma: { lt: gunOnce(SAKLAMA.talep) },
    durum: { in: ['ILGILENMIYOR' as const, 'ULASILAMADI' as const, 'KAPANDI' as const, 'SATIS' as const] },
  };
  s.talep = await say(
    () => prisma.talep.count({ where: talepKosul }),
    () => prisma.talep.deleteMany({ where: talepKosul }),
  );

  const veriTalebiKosul = {
    olusturma: { lt: gunOnce(SAKLAMA.veriTalebi) },
    durum: { in: ['TAMAMLANDI' as const, 'REDDEDILDI' as const] },
  };
  s.veriTalebi = await say(
    () => prisma.veriTalebi.count({ where: veriTalebiKosul }),
    () => prisma.veriTalebi.deleteMany({ where: veriTalebiKosul }),
  );

  s.toplam = s.oturum + s.olcum + s.bildirim + s.konusma
    + s.denetimIp + s.talep + s.veriTalebi;
  return s;
}
