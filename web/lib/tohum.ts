import 'server-only';
import { prisma } from './db';
import { depo } from './depo';
import { FIRMALAR, PROJELER } from '../prisma/seed-data';
import type { OzellikKey } from './types';

/* ============================================================
   Panelden tohumlama ve geri alma.

   `npm run db:seed` tabloları `deleteMany()` ile boşaltıp baştan
   yazıyor. Geliştirmede doğru; üretimde bir kez yanlış çalıştırmak
   gerçek satış taleplerini siler. O yüzden panele konulan şey seed
   betiği DEĞİL.

   Buradaki tohumlama:
     · hiçbir şey silmiyor, yalnızca ekliyor,
     · ne eklediğini `TohumKayit` defterine yazıyor,
     · silme YALNIZCA deftere bakıyor.

   Yani "demo görünen" değil, "demo olduğu yazılan" siliniyor.
   Gerçek kayıtlar defterde olmadığı için silme onlara erişemiyor.

   Defter yalnızca KÖK kayıtları tutuyor (Firma, Proje, Talep).
   Medya, özellik, daire tipi zaten `onDelete: Cascade` ile kökle
   gidiyor.
   ============================================================ */

export type TohumTuru = 'ORNEK_PROJE' | 'DEMO_PROJE' | 'TALEP_GECMISI';

export const TOHUM_TURLERI: { tur: TohumTuru; ad: string; aciklama: string }[] = [
  {
    tur: 'ORNEK_PROJE',
    ad: 'Örnek projeler',
    aciklama: 'Firma, proje, daire tipi, görsel ve özellik kayıtları. Slug'
      + ' zaten varsa o proje atlanıyor; ikinci kez basmak kopya üretmiyor.',
  },
  {
    tur: 'DEMO_PROJE',
    ad: 'Üretilmiş demo projeler',
    aciklama: 'Her basışta 12 yeni proje üretir (demo-1, demo-2… diye'
      + ' numaralanır). Örnek projeler bir kez basılıp tükeniyor;'
      + ' tasarımı dolu envanterle görmek için bu tür sınırsız basılabilir.',
  },
  {
    tur: 'TALEP_GECMISI',
    ad: 'Satış talebi geçmişi',
    aciklama: 'Yayındaki projelere son 6 ay için talep kaydı üretir.'
      + ' Analitik ve huni ekranları dolar. Gerçek projelere de talep'
      + ' bağlanabiliyor — kayıtlar deftere yazıldığı için geri alınabilir.',
  },
];

/** Demo talep adresleri. `.test` ayrılmış alan adı (RFC 2606) — dışarı çıkamaz. */
const DEMO_ALAN = '@demo.test';

const AD_HAVUZU = ['Ceren Kaya', 'Ahmet Yıldız', 'Selin Öztürk', 'Burcu Tanrıverdi',
  'Kaan Demir', 'Elif Mutlu', 'Onur Şen', 'Deniz Arslan', 'Merve Koç', 'Emre Balcı',
  'Zeynep Ak', 'Mert Uysal', 'Gökhan Er', 'Nazlı Duman', 'Serkan Aydın'];

const MEDYA_TIPI = ['DIS_CEPHE', 'DIS_CEPHE', 'IC_MEKAN', 'ORNEK_DAIRE', 'IC_MEKAN',
  'SOSYAL_TESIS'] as const;
const MEDYA_ACIKLAMA = ['dış cephe görselleştirmesi', 'bahçe ve giriş aksı',
  'örnek daire salon', 'örnek daire mutfak', 'örnek daire ebeveyn banyosu',
  'sosyal tesis ve peyzaj alanı'];

/** Deterministik sözde rastgele — aynı tohumdan aynı veri. */
function rastgele(tohum: number) {
  let s = tohum;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

/* ============================================================
   Defter
   ============================================================ */

type DefterModel = 'Firma' | 'Proje' | 'Talep';

/**
 * Parti ÖNCE açılıyor, kayıtlar oluşturuldukça deftere yazılıyor.
 *
 * Tersi olsaydı (önce oluştur, sonunda deftere yaz) tohumlama
 * ortasında bir hata kayıtları defterde olmayan — yani panelden
 * silinemeyen — hâlde bırakırdı.
 */
class Defter {
  private sira = 0;
  readonly sayim: Record<string, number> = {};

  private constructor(readonly partiId: string) {}

  static async ac(tur: TohumTuru, etiket: string, kullaniciId: string | null) {
    const p = await prisma.tohumParti.create({
      data: { tur, etiket, olusturanId: kullaniciId },
      select: { id: true },
    });
    return new Defter(p.id);
  }

  async yaz(model: DefterModel, kayitId: string) {
    /* `upsert`: defterde o kayıt için satır kalmış olabilir.
       `demoProje` sabit kimlikli tek bir firma kullanıyor
       (`demo-firma`); geri alma sırasında o satır KORUNMUŞSA
       (projeleri duruyordu, silinemedi) defter satırı da bilerek
       kalıyor. `create` orada benzersizlik kısıtına takılıp
       tohumlamanın tamamını düşürüyordu — kayıt zaten "bu partinin
       ürettiği" sayılmalı, ikinci bir satır değil.

       Sahiplik yeni partiye geçiyor: eski parti geri alınmış ya da
       alınmaya çalışılmış, kaydın canlı sahibi bu parti. */
    await prisma.tohumKayit.upsert({
      where: { model_kayitId: { model, kayitId } },
      create: { partiId: this.partiId, model, kayitId, sira: this.sira++ },
      update: { partiId: this.partiId, sira: this.sira++ },
    });
    this.sayim[model] = (this.sayim[model] ?? 0) + 1;
  }

  async kapat() {
    await prisma.tohumParti.update({
      where: { id: this.partiId },
      data: { ozet: this.sayim },
    });
    return { partiId: this.partiId, sayim: this.sayim };
  }
}

/* ============================================================
   Tohumlayıcılar
   ============================================================ */

export interface TohumSonucu {
  tamam: boolean;
  hata?: string;
  partiId?: string;
  sayim?: Record<string, number>;
  /** Atlanan kayıtların insan okunur gerekçeleri */
  notlar?: string[];
}

/** Örnek projeler: firma + proje + daire tipi + görsel + özellik. */
async function ornekProje(kullaniciId: string | null, yayinda: boolean): Promise<TohumSonucu> {
  const bolgeler = new Map(
    (await prisma.bolge.findMany({ select: { id: true, slug: true } })).map((b) => [b.slug, b.id]),
  );
  const ozellikler = new Map(
    (await prisma.ozellik.findMany({ select: { id: true, kod: true } })).map((o) => [o.kod, o.id]),
  );

  if (bolgeler.size === 0) {
    return { tamam: false, hata: 'Önce bölgeler tanımlanmalı — referans veri eksik.' };
  }

  const varOlan = new Set(
    (await prisma.proje.findMany({ select: { slug: true } })).map((p) => p.slug),
  );

  const defter = await Defter.ac(
    'ORNEK_PROJE', `${PROJELER.length} projelik örnek envanter`, kullaniciId,
  );
  const notlar: string[] = [];
  const firmaKimlik = new Map<string, string>();

  for (const p of PROJELER) {
    if (varOlan.has(p.slug)) { notlar.push(`${p.ad}: slug zaten var, atlandı`); continue; }
    const bolgeId = bolgeler.get(p.bolgeSlug);
    if (!bolgeId) { notlar.push(`${p.ad}: "${p.bolgeSlug}" bölgesi yok, atlandı`); continue; }

    /* Firma slug'ı tekil; aynı firma varsa yeniden kullanılıyor ve
       DEFTERE YAZILMIYOR — bu parti onu oluşturmadı, silmemeli. */
    let firmaId = firmaKimlik.get(p.firmaSlug);
    if (!firmaId) {
      const tanim = FIRMALAR.find((f) => f.slug === p.firmaSlug);
      if (!tanim) { notlar.push(`${p.ad}: "${p.firmaSlug}" firması tanımsız, atlandı`); continue; }

      const mevcut = await prisma.firma.findUnique({
        where: { slug: tanim.slug }, select: { id: true },
      });
      if (mevcut) {
        firmaId = mevcut.id;
      } else {
        const yeni = await prisma.firma.create({
          data: {
            slug: tanim.slug, ad: tanim.ad, ozet: tanim.ozet,
            kurulusYili: tanim.kurulusYili,
            tamamlananProje: tanim.tamamlananProje,
            web: tanim.web ?? null,
            yayinda,
          },
          select: { id: true },
        });
        firmaId = yeni.id;
        await defter.yaz('Firma', firmaId);
      }
      firmaKimlik.set(p.firmaSlug, firmaId);
    }

    const proje = await prisma.proje.create({
      data: {
        slug: p.slug, ad: p.ad, tip: p.tip, durum: p.durum,
        bolgeId, firmaId,
        mahalle: p.mahalle, adres: p.adres ?? null, lat: p.lat, lng: p.lng,
        fiyatMin: p.fiyatMin, fiyatMax: p.fiyatMax ?? null,
        pesinatOrani: p.odeme.pesinat, taksitAyi: p.odeme.vade,
        krediyeUygun: p.odeme.krediyeUygun, takas: p.odeme.takas,
        aidat: p.odeme.aidat ?? null, tapuDurumu: p.odeme.tapu ?? null,
        blokSayisi: p.olcek.blok ?? null, katSayisi: p.olcek.kat ?? null,
        toplamBagimsizBolum: p.olcek.bagimsizBolum ?? null,
        arsaM2: p.olcek.arsaM2 ?? null, insaatAlaniM2: p.olcek.insaatM2 ?? null,
        yesilAlanOrani: p.olcek.yesilOran ?? null,
        baslangicTarihi: p.baslangic ? new Date(p.baslangic) : null,
        teslimTarihi: p.teslim ? new Date(p.teslim) : null,
        ilerlemeYuzde: p.ilerleme,
        ozet: p.ozet, sec: p.sec || null, yeni: p.yeni, oneCikan: p.oneCikan,
        yayinda,
        yayinTarihi: new Date(p.yayin),
        medya: {
          create: p.foto.map((url, i) => ({
            url,
            alt: `${p.ad}, ${p.mahalle} — ${MEDYA_ACIKLAMA[i % MEDYA_ACIKLAMA.length]}`,
            tip: MEDYA_TIPI[i % MEDYA_TIPI.length],
            sira: i,
          })),
        },
        ozellikler: {
          create: p.ozellik
            .filter((k: OzellikKey) => ozellikler.has(k))
            .map((k: OzellikKey) => ({ ozellikId: ozellikler.get(k)! })),
        },
        daireTipleri: {
          create: p.daireTipleri.map((t, i) => ({
            ad: t.ad, odaSayisi: t.oda, banyo: t.banyo,
            brutM2: t.brutM2, netM2: t.netM2 ?? null,
            nitelik: t.nitelik ?? null,
            fiyatMin: t.fiyatMin ?? null, fiyatMax: t.fiyatMax ?? null,
            adet: t.adet ?? null, kalanAdet: t.kalan ?? null,
            sira: i,
          })),
        },
      },
      select: { id: true },
    });
    await defter.yaz('Proje', proje.id);
  }

  const { partiId, sayim } = await defter.kapat();
  if (!sayim.Proje) {
    await prisma.tohumParti.delete({ where: { id: partiId } });
    return { tamam: false, hata: 'Eklenecek yeni proje kalmadı — hepsi zaten kayıtlı.', notlar };
  }
  return { tamam: true, partiId, sayim, notlar };
}

/* ---------------- Üretilmiş demo projeler ---------------- */

/** Proje adı iki parçadan kuruluyor — tekrar etmeyen ama türdeş isimler. */
const DEMO_ON = ['Vadi', 'Panorama', 'Teras', 'Bahçe', 'Koru', 'Meydan', 'Kule',
  'Avlu', 'Yamaç', 'Liman', 'Çınar', 'Zirve', 'Sahil', 'Bulvar', 'Yeşil', 'Kent'];
const DEMO_SON = ['Konakları', 'Residence', 'Evleri', 'Park', 'Yaşam', 'City',
  'Towers', 'Suites'];

/** Tip dağılımı gerçeğe yakın: konut ağırlıklı, az sayıda ofis ve villa. */
const TIP_DAGILIM = ['KONUT', 'KONUT', 'KONUT', 'KONUT', 'KONUT',
  'VILLA', 'OFIS', 'KARMA'] as const;

/** Satış aşaması dağılımı — çoğu satışta, birkaçı yakında/son daireler. */
const DURUM_DAGILIM = ['SATISTA', 'SATISTA', 'SATISTA', 'SATISTA',
  'SON_DAIRELER', 'YAKINDA'] as const;

/** Oda tipi şablonları: [ad, oda, brütM2, banyo] */
const TIP_SABLON: [string, string, number, number][] = [
  ['1+1', '1+1', 68, 1],
  ['2+1', '2+1', 102, 1],
  ['3+1', '3+1', 142, 2],
  ['4+1', '4+1', 196, 3],
];

async function demoProje(
  kullaniciId: string | null, yayinda: boolean, adet: number,
): Promise<TohumSonucu> {
  const bolgeler = await prisma.bolge.findMany({
    select: { id: true, slug: true, ad: true, il: true, lat: true, lng: true },
  });
  if (bolgeler.length === 0) {
    return { tamam: false, hata: 'Önce bölgeler tanımlanmalı — referans veri eksik.' };
  }
  const ozellikler = await prisma.ozellik.findMany({ select: { id: true, kod: true } });
  /* Havuz ADRESE GÖRE TEKİL. Örnek projeler ortak bir stok görsel
     havuzu kullanıyor: 48 medya satırında yalnızca 14 farklı adres
     var. Satırları saymak, "tekrarsız seçtim" derken aynı adresi
     ikinci kez seçmek demekti. */
  const fotoHavuzu = [...new Set(
    (await prisma.medya.findMany({
      select: { url: true }, take: 200, orderBy: { sira: 'asc' },
    })).map((m) => m.url),
  )];
  if (fotoHavuzu.length === 0) {
    return { tamam: false, hata: 'Görsel havuzu boş — önce örnek projeleri ekleyin.' };
  }

  /* Numara kaldığı yerden devam ediyor: ikinci basışta demo-1 çakışır,
     proje yazılamaz ve parti yarıda kalırdı. */
  const sonuncu = await prisma.proje.findMany({
    where: { slug: { startsWith: 'demo-' } }, select: { slug: true },
  });
  const baslangic = sonuncu.reduce((en, p) => {
    const n = Number(p.slug.split('-')[1]);
    return Number.isFinite(n) && n > en ? n : en;
  }, 0) + 1;

  const n = Math.min(Math.max(1, Math.round(adet)), 48);
  const defter = await Defter.ac('DEMO_PROJE', `${n} üretilmiş demo proje`, kullaniciId);
  const rnd = rastgele(baslangic * 7919);

  /* Galeride KOPYA GÖRSEL OLMUYOR: her kare bağımsız çekildiğinde aynı
     görsel bir projede iki kez çıkıyordu ve galeri gezen kişi aynı
     fotoğrafı ikinci kez görüyordu. Havuzdan tekrarsız seçiliyor;
     havuz istenen sayıdan küçükse olan kadarı basılıyor. */
  const gorselSec = (kac: number): string[] => {
    const kalanlar = [...fotoHavuzu];
    const secilen: string[] = [];
    while (secilen.length < kac && kalanlar.length) {
      secilen.push(kalanlar.splice(Math.floor(rnd() * kalanlar.length), 1)[0]);
    }
    return secilen;
  };

  const firma = await prisma.firma.upsert({
    where: { id: 'demo-firma' },
    update: {},
    create: {
      id: 'demo-firma', slug: 'demo-yapi', ad: 'Demo Yapı',
      ozet: 'Tohumlama ile üretilmiş demo geliştirici kaydı.',
      kurulusYili: new Date().getFullYear() - 12,
      tamamlananProje: 7,
      yayinda,
    },
    select: { id: true },
  });
  /* Firma yalnızca ilk basışta oluşturulduğu için deftere de bir kez
     yazılıyor — aksi halde ilk partiyi silmek, ikinci partinin
     projelerini sahipsiz bırakırdı. */
  if (sonuncu.length === 0) await defter.yaz('Firma', firma.id);

  for (let i = 0; i < n; i++) {
    const no = baslangic + i;
    const b = bolgeler[Math.floor(rnd() * bolgeler.length)];
    const ad = `Demo ${DEMO_ON[no % DEMO_ON.length]} ${DEMO_SON[Math.floor(rnd() * DEMO_SON.length)]} ${no}`;
    const tip = TIP_DAGILIM[Math.floor(rnd() * TIP_DAGILIM.length)];
    const durum = DURUM_DAGILIM[Math.floor(rnd() * DURUM_DAGILIM.length)];

    /* Fiyat tabanı BÖLGEYE göre değil rastgele: tohum verisinde
       bölgeye özgü bir fiyat tablosu tutmak, gerçek olmayan bir
       piyasa verisini kod içine gömmek olurdu. Aralık geniş
       tutuluyor ki filtre ve histogram anlamlı çalışsın. */
    const taban = 3_000_000 + Math.floor(rnd() * 12) * 1_000_000;

    /* Daire tipleri: küçükten büyüğe kesintisiz bir dilim alınıyor.
       Rastgele seçim "1+1 ve 4+1 var ama 2+1 yok" gibi gerçekte
       görülmeyen kombinasyonlar üretiyordu. */
    const ilk = Math.floor(rnd() * 2);
    const son = Math.min(TIP_SABLON.length, ilk + 2 + Math.floor(rnd() * 2));
    const secilen = TIP_SABLON.slice(ilk, son);

    const daireler = secilen.map(([tAd, oda, brut, banyo], k) => {
      const carpan = 1 + k * (0.35 + rnd() * 0.2);
      const min = Math.round((taban * carpan) / 100_000) * 100_000;
      const toplam = 20 + Math.floor(rnd() * 120);
      return {
        ad: tAd, odaSayisi: oda, banyo,
        brutM2: brut, netM2: Math.round(brut * 0.82),
        fiyatMin: min,
        fiyatMax: Math.round((min * (1.15 + rnd() * 0.2)) / 100_000) * 100_000,
        adet: toplam,
        /* TÜKENDİ durumunda kalan sıfır: kart rozetiyle daire tipi
           listesi birbirini tutmalı. */
        kalanAdet: durum === 'YAKINDA' ? toplam : Math.floor(toplam * rnd() * 0.6),
        sira: k,
      };
    });

    const fiyatMin = Math.min(...daireler.map((d) => d.fiyatMin));
    const fiyatMax = Math.max(...daireler.map((d) => d.fiyatMax));

    /* Ortak olanaklar her projede; geri kalanı rastgele. Havuz ve
       sosyal tesis kodları TİPE BAĞLI: ofis projesinde "çocuk oyun
       alanı" çıkması, kartla içeriğin çeliştiği bir tutarsızlıktı. */
    const kodlar = new Set<string>(['guvenlik', 'kamera', 'kapaliotopark',
      'depremyonetmelik', 'isiyalitim', 'asansor']);
    if (tip === 'OFIS') {
      for (const k of ['sarj', 'jeneratör', 'engelli', 'merkez', 'sosyaltesis']) kodlar.add(k);
    } else {
      for (const k of ['cocukoyun', 'peyzaj', 'fitness', 'yerdenisitma']) kodlar.add(k);
      if (rnd() < 0.6) kodlar.add('yuzmehavuzu');
      if (rnd() < 0.35) kodlar.add('kapalihavuz');
      if (tip === 'VILLA') { kodlar.add('kapalisite'); kodlar.add('doga'); }
    }
    if (rnd() < 0.5) kodlar.add('metroyakin');
    if (rnd() < 0.3) kodlar.add('manzara');

    const ozellikIdleri = ozellikler.filter((o) => kodlar.has(o.kod)).map((o) => o.id);

    /* Teslim tarihi ilerlemeyle TUTARLI: %90 ilerlemiş bir projenin
       teslimi üç yıl sonra olamaz. İlerleme arttıkça teslim yakınlaşıyor. */
    const ilerleme = durum === 'YAKINDA' ? 0 : Math.floor(rnd() * 95);
    const kalanAy = Math.max(3, Math.round((100 - ilerleme) * 0.42));
    const teslim = new Date();
    teslim.setUTCMonth(teslim.getUTCMonth() + kalanAy, 1);
    teslim.setUTCHours(0, 0, 0, 0);

    const proje = await prisma.proje.create({
      data: {
        slug: `demo-${no}`,
        ad,
        tip, durum,
        bolgeId: b.id, firmaId: firma.id,
        mahalle: `${b.ad} Mahallesi`,
        lat: b.lat + (rnd() - 0.5) * 0.05,
        lng: b.lng + (rnd() - 0.5) * 0.05,
        fiyatMin, fiyatMax,
        pesinatOrani: [0, 20, 25, 30, 35, 40][Math.floor(rnd() * 6)],
        taksitAyi: [0, 12, 24, 36, 48, 60][Math.floor(rnd() * 6)],
        krediyeUygun: rnd() < 0.9,
        takas: rnd() < 0.25,
        aidat: 1500 + Math.floor(rnd() * 40) * 100,
        /* Demo üreticisi TESLIM_EDILDI basmıyor (bkz. DURUM_DAGILIM):
           teslim edilmiş proje vitrinde görünmüyor ve demo verinin
           amacı dolu bir vitrin. Tapu bu yüzden her zaman kat
           irtifakı — inşaatı süren projenin gerçek durumu. */
        tapuDurumu: 'KAT_IRTIFAKI',
        blokSayisi: tip === 'VILLA' ? null : 1 + Math.floor(rnd() * 8),
        katSayisi: tip === 'VILLA' ? 3 : 6 + Math.floor(rnd() * 24),
        toplamBagimsizBolum: daireler.reduce((t, d) => t + d.adet, 0),
        arsaM2: 3_000 + Math.floor(rnd() * 40) * 1_000,
        yesilAlanOrani: 25 + Math.floor(rnd() * 50),
        teslimTarihi: teslim,
        ilerlemeYuzde: ilerleme,
        ozet: `${b.ad} ${b.il} bölgesinde ${daireler.length} farklı daire tipiyle planlanan `
          + `${tip === 'OFIS' ? 'ofis' : tip === 'VILLA' ? 'villa' : 'konut'} projesi. `
          + 'Tohumlama ile üretilmiş demo kayıttır; tasarım ve akış denemesi için kullanılıyor.',
        yeni: rnd() < 0.3,
        oneCikan: rnd() < 0.15,
        yayinda,
        yayinTarihi: new Date(),
        medya: { create: gorselSec(4).map((url, k) => ({
          url,
          alt: `${ad}, ${b.ad} — ${MEDYA_ACIKLAMA[k % MEDYA_ACIKLAMA.length]}`,
          tip: MEDYA_TIPI[k % MEDYA_TIPI.length],
          sira: k,
        })) },
        ozellikler: { create: ozellikIdleri.map((ozellikId) => ({ ozellikId })) },
        daireTipleri: { create: daireler },
      },
      select: { id: true },
    });
    await defter.yaz('Proje', proje.id);
  }

  const { partiId, sayim } = await defter.kapat();
  return { tamam: true, partiId, sayim };
}

/* ---------------- Talep geçmişi ---------------- */

const NIYETLER = ['BILGI', 'BILGI', 'BILGI', 'FIYAT_LISTESI', 'KATALOG', 'RANDEVU'] as const;
const DURUMLAR = ['YENI', 'ARANDI', 'ARANDI', 'ULASILAMADI', 'RANDEVU',
  'ILGILENMIYOR', 'SATIS', 'KAPANDI'] as const;
const ODEMELER = ['BELIRTILMEDI', 'KREDI', 'KREDI', 'PESIN', 'TAKSIT', 'TAKAS'] as const;

const KOD_ABECE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Yayındaki projelere geçmişe dönük talep kaydı üretir.
 *
 * TALEPLER GERÇEK PROJELERE DE BAĞLANABİLİYOR: analitik ekranını
 * yalnızca demo projelerle doldurmak, huninin gerçek envanterde nasıl
 * göründüğünü göstermiyor. Kayıtlar deftere yazıldığı için geri alma
 * yine çalışıyor ve gerçek talepler etkilenmiyor.
 */
async function talepGecmisi(kullaniciId: string | null): Promise<TohumSonucu> {
  const projeler = await prisma.proje.findMany({
    where: { yayinda: true },
    select: { id: true, fiyatMin: true, daireTipleri: { select: { id: true } } },
    take: 200,
  });
  if (projeler.length === 0) {
    return { tamam: false, hata: 'Yayında proje yok — önce proje ekleyip yayına alın.' };
  }

  const defter = await Defter.ac('TALEP_GECMISI', 'Son 6 ayın talep geçmişi', kullaniciId);
  const rnd = rastgele(projeler.length * 104729);
  const simdi = Date.now();

  for (const p of projeler) {
    // Proje başına 3–14 talep; bazı projeler doğal olarak daha popüler
    const kac = 3 + Math.floor(rnd() * 12);
    for (let i = 0; i < kac; i++) {
      const ad = AD_HAVUZU[Math.floor(rnd() * AD_HAVUZU.length)];
      const niyet = NIYETLER[Math.floor(rnd() * NIYETLER.length)];
      const durum = DURUMLAR[Math.floor(rnd() * DURUMLAR.length)];

      /* KATALOG ve FIYAT_LISTESI e-posta ZORUNLU kılıyor (bkz.
         `lib/talep.ts`). Tohum verisi de o kurala uymalı; uymayan
         satır, doğrulamanın hiç çalışmadığı izlenimi verirdi. */
      const epostaGerek = niyet === 'KATALOG' || niyet === 'FIYAT_LISTESI';
      const eposta = epostaGerek || rnd() < 0.45
        ? `${ad.toLocaleLowerCase('tr').replace(/[^a-zçğıöşü]/g, '')}${Math.floor(rnd() * 900) + 100}${DEMO_ALAN}`
        : null;

      const gunOnce = Math.floor(rnd() * 180);
      const olusturma = new Date(simdi - gunOnce * 864e5);

      /* Güncelleme = ilk temas anı. Hâlâ YENİ olan talepte
         güncelleme oluşturmaya eşit; analitikteki yanıt süresi
         hesabı bunu böyle bekliyor. */
      const guncelleme = durum === 'YENI'
        ? olusturma
        : new Date(olusturma.getTime() + (0.5 + rnd() * 30) * 3600_000);

      const butceMin = rnd() < 0.5 ? Math.round(p.fiyatMin * (0.8 + rnd() * 0.3)) : null;
      const butceMax = butceMin ? Math.round(butceMin * (1.2 + rnd() * 0.6)) : null;

      const daire = p.daireTipleri.length && rnd() < 0.6
        ? p.daireTipleri[Math.floor(rnd() * p.daireTipleri.length)].id
        : null;

      let kod = 'TLP-';
      for (let k = 0; k < 6; k++) kod += KOD_ABECE[Math.floor(rnd() * KOD_ABECE.length)];

      const telefon = `5${Math.floor(rnd() * 4) + 3}${String(Math.floor(rnd() * 10_000_000)).padStart(7, '0')}`;

      try {
        const talep = await prisma.talep.create({
          data: {
            kod,
            projeId: p.id,
            daireTipiId: daire,
            ad,
            telefon,
            eposta,
            niyet,
            durum,
            butceMin, butceMax,
            odemeSekli: ODEMELER[Math.floor(rnd() * ODEMELER.length)],
            kaynak: 'tohumlama',
            ekipNotu: durum === 'ULASILAMADI' ? 'İki kez arandı, ulaşılamadı.'
              : durum === 'SATIS' ? 'Sözleşme imzalandı.'
                : durum === 'ILGILENMIYOR' ? 'Bütçe uyuşmadı.' : null,
            kvkkOnay: true,
            kvkkTarih: olusturma,
            olusturma,
            guncelleme,
          },
          select: { id: true },
        });
        await defter.yaz('Talep', talep.id);
      } catch {
        // Kod çakışması: bu satırı atla, parti devam etsin
      }
    }
  }

  const { partiId, sayim } = await defter.kapat();
  if (!sayim.Talep) {
    await prisma.tohumParti.delete({ where: { id: partiId } });
    return { tamam: false, hata: 'Talep üretilemedi.' };
  }
  return { tamam: true, partiId, sayim };
}

export async function tohumla(
  tur: TohumTuru,
  kullaniciId: string | null,
  secenek: { yayinda?: boolean; adet?: number } = {},
): Promise<TohumSonucu> {
  switch (tur) {
    case 'ORNEK_PROJE': return ornekProje(kullaniciId, secenek.yayinda ?? false);
    case 'DEMO_PROJE': return demoProje(kullaniciId, secenek.yayinda ?? false, secenek.adet ?? 12);
    case 'TALEP_GECMISI': return talepGecmisi(kullaniciId);
    default: return { tamam: false, hata: 'Bilinmeyen tohum türü.' };
  }
}

/* ============================================================
   Silme
   ============================================================ */

/**
 * Bu kaydı silmek gerçek veriyi de götürür mü?
 *
 * FK hatasına GÜVENİLEMEZ: `Konusma`, `FiyatAlarmi`, `DaireTipi`
 * projeye `onDelete: Cascade` ile bağlı — demo bir projeyi silmek
 * gerçek bir soruyu SESSİZCE götürür, hata vermez. O yüzden önden
 * bakılıyor.
 *
 * "Gerçek" = hiçbir tohum partisinin defterinde olmayan.
 */
async function engelSebebi(model: string, id: string): Promise<string | null> {
  const defterde = async (m: string, idler: string[]) => {
    if (idler.length === 0) return new Set<string>();
    const k = await prisma.tohumKayit.findMany({
      where: { model: m, kayitId: { in: idler } }, select: { kayitId: true },
    });
    return new Set(k.map((x) => x.kayitId));
  };

  if (model === 'Proje') {
    /* Talep projeye `SetNull` bağlı — FK engellemez, talep projesiz
       kalır. Satış ekibinin elindeki "bu kişi hangi projeyi sordu"
       bilgisini sessizce silmek, kaydı silmekten farksız. */
    const talep = await prisma.talep.findMany({ where: { projeId: id }, select: { id: true } });
    if (talep.length) {
      const talepDefter = await defterde('Talep', talep.map((t) => t.id));
      const gercek = talep.filter((t) => !talepDefter.has(t.id)).length;
      if (gercek) return `${gercek} gerçek satış talebi bağlı`;
      return `${talep.length} tohum talebi hâlâ duruyor — önce o parti geri alınmalı`;
    }

    const konusma = await prisma.konusma.count({ where: { projeId: id } });
    if (konusma) return `${konusma} ziyaretçi yazışması bağlı`;

    const alarm = await prisma.fiyatAlarmi.count({ where: { projeId: id } });
    if (alarm) return `${alarm} fiyat alarmı kurulmuş`;

    const pano = await prisma.panoOge.count({ where: { projeId: id } });
    if (pano) return `${pano} karşılaştırma panosunda yer alıyor`;

    const kontrol = await prisma.kontrolRaporu.count({ where: { projeId: id } });
    if (kontrol) return 'yerinde inceleme raporu var';
    return null;
  }

  if (model === 'Firma') {
    /* Ters sırada geldiğimiz için projeleri çoktan silinmiş olmalı.
       Duruyorsa ya gerçek projesi var ya da projesi korundu; ikisinde
       de firma silinemez. Defter üyeliğine bakıp geçmek FK hatasına
       düşerdi. */
    const proje = await prisma.proje.findMany({ where: { firmaId: id }, select: { id: true } });
    if (proje.length) {
      const projeDefter = await defterde('Proje', proje.map((p) => p.id));
      const kalan = proje.filter((p) => !projeDefter.has(p.id)).length;
      return kalan
        ? `${kalan} projesi defterde değil`
        : `${proje.length} projesi hâlâ duruyor (korundu)`;
    }

    const hesap = await prisma.kullanici.count({ where: { firmaId: id } });
    if (hesap) return 'panel hesabı bağlı';

    const basvuru = await prisma.firmaBasvuru.count({ where: { firmaId: id } });
    if (basvuru) return `${basvuru} başvuru kaydı bağlı`;
    return null;
  }

  if (model === 'Talep') {
    /* Talebe bağlı bildirim `Cascade`; gönderilmiş bildirimin
       silinmesi sorun değil — kuyruk kaydı, ticari belge değil. */
    return null;
  }

  return null;
}

export interface SilmeSonucu {
  tamam: boolean;
  hata?: string;
  silinen: number;
  korunan: { model: string; kayitId: string; sebep: string }[];
}

/**
 * Partiyi geri alır.
 *
 * Defterdeki kayıtlar oluşturulma sırasının TERSİNDEN siliniyor:
 * talep → proje → firma. Gerçek veriye bağlı olan korunuyor;
 * ebeveyni de doğal olarak korunuyor, çünkü çocuk hâlâ duruyor ve
 * bir sonraki kontrol onu yakalıyor.
 *
 * Korunan kayıtların defter satırı SİLİNMİYOR — hâlâ demo veri ve
 * engel kalkınca tekrar denenebilmeli.
 */
export async function partiyiSil(partiId: string): Promise<SilmeSonucu> {
  const parti = await prisma.tohumParti.findUnique({
    where: { id: partiId },
    select: { id: true, kayitlar: { orderBy: { sira: 'desc' }, select: { id: true, model: true, kayitId: true } } },
  });
  if (!parti) return { tamam: false, hata: 'Parti bulunamadı.', silinen: 0, korunan: [] };

  const korunan: SilmeSonucu['korunan'] = [];
  const silinenSatirlar: string[] = [];

  const sil: Record<string, (id: string) => Promise<unknown>> = {
    Talep: (id) => prisma.talep.delete({ where: { id } }),
    Proje: async (id) => {
      /* Medya satırları projeyle birlikte cascade ile gidiyor ama
         depodaki dosyalar gitmiyor — veritabanı onları bilmiyor.
         Satırlar silinmeden önce anahtarlar okunmalı. */
      const dosyalar = await prisma.medya.findMany({
        where: { projeId: id, depoAnahtar: { not: null } },
        select: { depoAnahtar: true },
      });
      /* Kat planları da depoda: daire tipi cascade ile gidiyor ama
         dosya kalıyor. Medyayla aynı gerekçe. */
      const planlar = await prisma.daireTipi.findMany({
        where: { projeId: id, katPlaniDepoAnahtar: { not: null } },
        select: { katPlaniDepoAnahtar: true },
      });
      const sonuc = await prisma.proje.delete({ where: { id } });
      const d = depo();
      if (d) {
        for (const f of dosyalar) await d.sil(f.depoAnahtar!).catch(() => {});
        for (const f of planlar) await d.sil(f.katPlaniDepoAnahtar!).catch(() => {});
      }
      return sonuc;
    },
    Firma: (id) => prisma.firma.delete({ where: { id } }),
  };

  for (const k of parti.kayitlar) {
    const sebep = await engelSebebi(k.model, k.kayitId);
    if (sebep) { korunan.push({ model: k.model, kayitId: k.kayitId, sebep }); continue; }

    const silici = sil[k.model];
    if (!silici) { korunan.push({ model: k.model, kayitId: k.kayitId, sebep: 'bilinmeyen model' }); continue; }

    try {
      await silici(k.kayitId);
      silinenSatirlar.push(k.id);
    } catch (e) {
      // Kayıt zaten yoksa defter satırını da kaldır; aksi hâlde parti
      // hiç kapanmaz.
      const yok = await kayitYokMu(k.model, k.kayitId);
      if (yok) { silinenSatirlar.push(k.id); continue; }
      korunan.push({
        model: k.model, kayitId: k.kayitId,
        sebep: e instanceof Error && 'code' in e ? `veritabanı reddetti (${(e as { code?: string }).code})` : 'veritabanı reddetti',
      });
    }
  }

  if (silinenSatirlar.length) {
    await prisma.tohumKayit.deleteMany({ where: { id: { in: silinenSatirlar } } });
  }

  if (korunan.length === 0) {
    await prisma.tohumParti.update({ where: { id: partiId }, data: { silinme: new Date() } });
  }

  return { tamam: true, silinen: silinenSatirlar.length, korunan };
}

/**
 * Bir türün defterinde duran, verilen modeldeki kayıt sayısı.
 *
 * Defterde satır kalması "geri alınmadı" demek; ayrıca parti
 * durumuna bakmak gerekmiyor. Panel bunu "Yenile" düğmesinin
 * varsayılan adedi için kullanıyor: geri alınacak kadar proje
 * basmak, envanteri olduğu boyutta tutuyor.
 */
export async function acikKayitSayisi(tur: TohumTuru, model: string): Promise<number> {
  return prisma.tohumKayit.count({ where: { model, parti: { tur } } });
}

export interface YenilemeSonucu {
  tamam: boolean;
  hata?: string;
  /** Geri alınan parti sayısı ve içlerinden silinen kayıt sayısı. */
  geriAlinanParti: number;
  geriAlinanKayit: number;
  /** Geri alınamayan kayıtlar: üzerine gerçek veri gelmiş demo kayıtlar. */
  korunan: { model: string; kayitId: string; sebep: string }[];
  partiId?: string;
  sayim?: Record<string, number>;
  notlar?: string[];
}

/**
 * Bir türün açık partilerini geri alıp yeniden basar.
 *
 * ÜRETİCİ DÜZELTİLDİĞİNDE gerekiyor: üretici düzeltiliyor ama
 * yayındaki kayıtlar eski üreticiden kalmaya devam ediyor. Üstüne
 * yeniden basmak da çözmüyor — numara kaldığı yerden sürdüğü için
 * bozuk olanların YANINA yenilerini ekliyor.
 *
 * Geri alma önce yapılıyor ve BAŞARISIZLIĞI basmayı durdurmuyor:
 * gerçek veri bağlanmış demo kayıtlar korunuyor (bu doğru davranış),
 * korunanlar sonuçta tek tek dönüyor. Yönetici hangi projelerin eski
 * üreticiden kaldığını görebilmeli.
 */
export async function turuYenile(
  tur: TohumTuru,
  kullaniciId: string | null,
  secenek: { yayinda?: boolean; adet?: number } = {},
): Promise<YenilemeSonucu> {
  /* YENİDEN eskiye: sonraki partiler öncekilere DAYANABİLİYOR.
     `demoProje` firmayı yalnızca ilk partide deftere yazıyor ve
     sonraki partilerin projeleri de ona bağlı. Eskiden yeniye
     gidildiğinde ilk partinin firması, ikinci partinin projeleri
     hâlâ dururken silinmeye çalışılıyor, veritabanı reddediyor ve
     kayıt "korunan" olarak geride kalıyordu. */
  const acik = await prisma.tohumParti.findMany({
    where: { tur, kayitlar: { some: {} } },
    orderBy: { olusturma: 'desc' },
    select: { id: true },
  });

  let geriAlinanKayit = 0;
  const korunan: YenilemeSonucu['korunan'] = [];
  for (const p of acik) {
    const s = await partiyiSil(p.id);
    geriAlinanKayit += s.silinen;
    korunan.push(...s.korunan);
  }

  const yeni = await tohumla(tur, kullaniciId, secenek);
  if (!yeni.tamam) {
    return {
      tamam: false,
      hata: yeni.hata ?? 'Yeniden basma başarısız.',
      geriAlinanParti: acik.length, geriAlinanKayit, korunan,
      notlar: yeni.notlar,
    };
  }

  return {
    tamam: true,
    geriAlinanParti: acik.length, geriAlinanKayit, korunan,
    partiId: yeni.partiId, sayim: yeni.sayim, notlar: yeni.notlar,
  };
}

async function kayitYokMu(model: string, id: string): Promise<boolean> {
  const bul: Record<string, () => Promise<unknown>> = {
    Talep: () => prisma.talep.findUnique({ where: { id }, select: { id: true } }),
    Proje: () => prisma.proje.findUnique({ where: { id }, select: { id: true } }),
    Firma: () => prisma.firma.findUnique({ where: { id }, select: { id: true } }),
  };
  const f = bul[model];
  return f ? (await f()) === null : false;
}

/* ============================================================
   Okuma
   ============================================================ */

export async function partiListesi() {
  const partiler = await prisma.tohumParti.findMany({
    orderBy: { olusturma: 'desc' },
    take: 100,
    select: {
      id: true, tur: true, etiket: true, ozet: true, olusturma: true, silinme: true,
      olusturan: { select: { ad: true } },
      _count: { select: { kayitlar: true } },
    },
  });
  return partiler.map((p) => ({
    ...p,
    /** Defterde satır kalmadıysa parti tamamen geri alınmış demektir. */
    kalanKayit: p._count.kayitlar,
  }));
}

/**
 * Sitede geri alınmamış demo veri var mı?
 *
 * Yönetim özetinde uyarı göstermek için: yayına çıkarken demo
 * projelerin unutulması en kolay hata.
 */
export async function acikDemoVeri(): Promise<{ parti: number; kayit: number }> {
  const kayit = await prisma.tohumKayit.count();
  if (kayit === 0) return { parti: 0, kayit: 0 };
  const parti = await prisma.tohumParti.count({ where: { kayitlar: { some: {} } } });
  return { parti, kayit };
}
