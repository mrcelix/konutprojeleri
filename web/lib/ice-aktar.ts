import 'server-only';
import { prisma } from './db';
import { basligiAnahtarla, csvNesneler, evetHayir, sayiCoz } from './csv';
import { benzersizSlug, slugla } from './turkce';
import { PROJE_DURUMLARI, PROJE_TIPLERI, TAPU_DURUMLARI } from './kategori-sabit';
import type { ProjeDurumu, ProjeTipi, TapuDurumu } from './types';

/* ============================================================
   Proje toplu içe aktarma.

   Portföy devralmada projeler tek tek forma girilmiyor: firmadan ya
   da başka platformdan gelen liste Excel'de duruyor.

   İKİ AŞAMALI. Önce ÖNİZLEME: hiçbir şey yazılmadan her satırın ne
   olacağı (yeni / güncelleme / hata) gösteriliyor. Sonra UYGULA.
   Yüz satırlık bir dosyayı görmeden yazmak, yanlış sütun eşlemesiyle
   envanteri bozmanın en kısa yolu.

   HER ZAMAN TASLAK. İçe aktarılan proje `yayinda: false` açılıyor;
   yayına alma yerinde incelemeden sonra ayrı bir adım.

   TEKRAR ÇALIŞTIRILABİLİR. Eşleştirme `slug` üzerinden: aynı dosya
   ikinci kez yüklendiğinde yeni kayıt açılmıyor, var olanlar
   güncelleniyor. Yarıda kalan bir aktarım tekrar denenebilmeli.

   DAİRE TİPLERİ BU DOSYADA YOK. Bir projenin altında beş-on tip var
   ve bunları tek satıra sıkıştırmak (ayraçlı bir sütun) hem okunmaz
   hem doğrulanamaz olurdu. Tipler ayrı ekrandan giriliyor; içe
   aktarma projenin iskeletini kuruyor.
   ============================================================ */

export type SatirDurumu = 'yeni' | 'guncelleme' | 'hata';

export interface SatirSonucu {
  /** Dosyadaki satır numarası (başlık 1) — hatayı bulmak için */
  satir: number;
  durum: SatirDurumu;
  ad: string;
  slug: string;
  hatalar: string[];
  /** Bilgilendirici notlar; aktarımı engellemiyor */
  uyarilar: string[];
}

export interface OnizlemeSonucu {
  sonuclar: SatirSonucu[];
  yeni: number;
  guncelleme: number;
  hatali: number;
  /** Tanınmayan sütun başlıkları — sessizce yok saymak yerine söyleniyor */
  bilinmeyenSutunlar: string[];
  eksikSutunlar: string[];
}

/** Zorunlu sütunlar; eksikse dosya hiç işlenmiyor. */
const ZORUNLU = ['ad', 'bolge', 'firma', 'mahalle', 'enlem', 'boylam', 'fiyatmin', 'ozet'] as const;

/** Tanınan tüm sütunlar. Bunların dışındakiler uyarıyla bildiriliyor. */
const TANINAN = [
  ...ZORUNLU,
  'tip', 'durum', 'fiyatmax', 'pesinatorani', 'taksitayi', 'krediyeuygun', 'takas',
  'aidat', 'tapudurumu', 'bloksayisi', 'katsayisi', 'toplambagimsizbolum',
  'arsam2', 'insaatalanim2', 'yesilalanorani', 'baslangictarihi', 'teslimtarihi',
  'ilerlemeyuzde', 'adres', 'ozellikler', 'fotograflar',
];

interface CozulmusSatir {
  satir: number;
  ad: string;
  slug: string;
  bolgeId: string;
  firmaId: string;
  mahalle: string;
  adres: string | null;
  lat: number;
  lng: number;
  tip: ProjeTipi;
  durum: ProjeDurumu;
  fiyatMin: number;
  fiyatMax: number | null;
  pesinatOrani: number;
  taksitAyi: number;
  krediyeUygun: boolean;
  takas: boolean;
  aidat: number | null;
  tapuDurumu: TapuDurumu | null;
  blokSayisi: number | null;
  katSayisi: number | null;
  toplamBagimsizBolum: number | null;
  arsaM2: number | null;
  insaatAlaniM2: number | null;
  yesilAlanOrani: number | null;
  baslangicTarihi: Date | null;
  teslimTarihi: Date | null;
  ilerlemeYuzde: number;
  ozet: string;
  ozellikKodlari: string[];
  fotograflar: { url: string; alt: string }[];
  mevcutId: string | null;
}

/** Ad eşlemesi için: "Ataşehir" → id. Büyük/küçük ve Türkçe harf duyarsız. */
function adHaritasi(kayitlar: { id: string; ad: string }[]): Map<string, string> {
  const h = new Map<string, string>();
  for (const k of kayitlar) h.set(k.ad.toLocaleLowerCase('tr').trim(), k.id);
  return h;
}

/**
 * Tarih sütunu: "2027-03-01", "01.03.2027" ve "2027Q1" kabul ediliyor.
 *
 * ÇEYREK BİÇİMİ ("2027Q1") özellikle destekleniyor: sektörün kendi
 * dili bu ve firmadan gelen listede teslim çoğu zaman böyle yazılı.
 * Çeyreğin ilk gününe sabitleniyor — gün zaten uydurma olurdu.
 */
function tarihCoz(ham: string): Date | null | 'hata' {
  const s = ham.trim();
  if (!s) return null;

  const ceyrek = /^(\d{4})\s*[Qq]([1-4])$/.exec(s);
  if (ceyrek) {
    const yil = Number(ceyrek[1]);
    const ay = (Number(ceyrek[2]) - 1) * 3;
    return new Date(Date.UTC(yil, ay, 1));
  }

  const nokta = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s);
  if (nokta) {
    return new Date(Date.UTC(Number(nokta[3]), Number(nokta[2]) - 1, Number(nokta[1])));
  }

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) {
    return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  }

  return 'hata';
}

/**
 * CSV'yi çözer ve doğrular. Veritabanına HİÇBİR ŞEY YAZMAZ.
 * Uygulama aşaması aynı çözümlemeyi tekrar çalıştırıyor.
 */
export async function iceAktarCozumle(csv: string): Promise<{
  onizleme: OnizlemeSonucu;
  cozulmus: CozulmusSatir[];
}> {
  const { basliklar, satirlar } = csvNesneler(csv);

  const anahtarlar = basliklar.map(basligiAnahtarla);
  const varOlan = new Set(anahtarlar);
  const eksikSutunlar = ZORUNLU.filter((z) => !varOlan.has(z));

  /* Tanınmayan başlıklar HAM hâlleriyle bildiriliyor. Sessizce yok
     saymak, "Fiyat (TL)" yazan bir sütunun neden hiç okunmadığını
     yöneticiye hiç göstermezdi. */
  const bilinmeyenSutunlar = basliklar.filter((_, i) =>
    anahtarlar[i] !== '' && !TANINAN.includes(anahtarlar[i]));

  if (eksikSutunlar.length || !satirlar.length) {
    return {
      onizleme: {
        sonuclar: [], yeni: 0, guncelleme: 0, hatali: 0,
        bilinmeyenSutunlar, eksikSutunlar: [...eksikSutunlar],
      },
      cozulmus: [],
    };
  }

  const [bolgeler, firmalar, ozellikler] = await Promise.all([
    prisma.bolge.findMany({ select: { id: true, ad: true } }),
    prisma.firma.findMany({ select: { id: true, ad: true } }),
    prisma.ozellik.findMany({ select: { kod: true } }),
  ]);
  const bolgeHaritasi = adHaritasi(bolgeler);
  const firmaHaritasi = adHaritasi(firmalar);
  const gecerliKodlar = new Set(ozellikler.map((o) => o.kod));

  const sonuclar: SatirSonucu[] = [];
  const cozulmus: CozulmusSatir[] = [];
  /* Dosya içi slug çakışması: aynı dosyada iki "Park Vadi" varsa
     ikincisi -2 almalı, ilkinin üzerine yazmamalı. */
  const dosyadakiSluglar = new Set<string>();

  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i];
    const satirNo = i + 2;                 // başlık 1. satır
    const hatalar: string[] = [];
    const uyarilar: string[] = [];

    const ad = (s.ad ?? '').trim();
    if (ad.length < 3) hatalar.push('Proje adı en az 3 karakter olmalı.');

    const bolgeId = bolgeHaritasi.get((s.bolge ?? '').toLocaleLowerCase('tr').trim());
    if (!bolgeId) hatalar.push(`Bölge bulunamadı: "${s.bolge ?? ''}"`);

    const firmaId = firmaHaritasi.get((s.firma ?? '').toLocaleLowerCase('tr').trim());
    if (!firmaId) hatalar.push(`Firma bulunamadı: "${s.firma ?? ''}"`);

    const mahalle = (s.mahalle ?? '').trim();
    if (mahalle.length < 2) hatalar.push('Mahalle/mevki gerekli.');

    const lat = sayiCoz(s.enlem ?? '');
    const lng = sayiCoz(s.boylam ?? '');
    if (lat === null || !(lat >= 35.5 && lat <= 42.5)) {
      hatalar.push(`Enlem 35,5–42,5 arasında olmalı: "${s.enlem ?? ''}"`);
    }
    if (lng === null || !(lng >= 25.5 && lng <= 45)) {
      hatalar.push(`Boylam 25,5–45 arasında olmalı: "${s.boylam ?? ''}"`);
    }

    const fiyatMin = sayiCoz(s.fiyatmin ?? '');
    if (fiyatMin === null || fiyatMin <= 0) {
      hatalar.push(`Başlangıç fiyatı okunamadı: "${s.fiyatmin ?? ''}"`);
    }

    const ozet = (s.ozet ?? '').trim();
    if (ozet.length < 40) hatalar.push(`Açıklama en az 40 karakter olmalı (şu an ${ozet.length}).`);

    /* İsteğe bağlı sayısal alanlar: boşsa null/varsayılan, DOLU AMA
       OKUNAMIYORSA hata. Sessizce varsayılana düşmek "18.500.000"
       yazılmış bir fiyatı 0 yapardı. */
    const sayiAlan = (anahtar: string, varsayilan: number, etiket: string): number => {
      const ham = (s[anahtar] ?? '').trim();
      if (!ham) return varsayilan;
      const n = sayiCoz(ham);
      if (n === null) { hatalar.push(`${etiket} okunamadı: "${ham}"`); return varsayilan; }
      return n;
    };
    const opsSayi = (anahtar: string, etiket: string): number | null => {
      const ham = (s[anahtar] ?? '').trim();
      if (!ham) return null;
      const n = sayiCoz(ham);
      if (n === null) { hatalar.push(`${etiket} okunamadı: "${ham}"`); return null; }
      return n;
    };

    const fiyatMax = opsSayi('fiyatmax', 'Üst fiyat');
    if (fiyatMin !== null && fiyatMax !== null && fiyatMax < fiyatMin) {
      hatalar.push('Üst fiyat, başlangıç fiyatından küçük olamaz.');
    }

    const pesinatOrani = sayiAlan('pesinatorani', 0, 'Peşinat oranı');
    const taksitAyi = sayiAlan('taksitayi', 0, 'Vade');
    const ilerlemeYuzde = sayiAlan('ilerlemeyuzde', 0, 'İnşaat ilerlemesi');
    const yesilAlanOrani = opsSayi('yesilalanorani', 'Yeşil alan oranı');

    if (pesinatOrani < 0 || pesinatOrani > 100) hatalar.push('Peşinat oranı %0–100 arasında olmalı.');
    if (taksitAyi < 0 || taksitAyi > 360) hatalar.push('Vade 0–360 ay arasında olmalı.');
    if (ilerlemeYuzde < 0 || ilerlemeYuzde > 100) hatalar.push('İnşaat ilerlemesi %0–100 arasında olmalı.');
    if (yesilAlanOrani !== null && (yesilAlanOrani < 0 || yesilAlanOrani > 100)) {
      hatalar.push('Yeşil alan oranı %0–100 arasında olmalı.');
    }

    /* Tip ve durum TANINMAYAN DEĞERDE HATA, sessizce varsayılana
       düşmüyor: "Ofis" yazılmış bir satırın konut olarak açılması,
       yanlış vitrine düşen bir proje demek ve kimse fark etmiyor. */
    const tipHam = (s.tip ?? '').trim().toLocaleUpperCase('tr').replace('İ', 'I');
    let tip: ProjeTipi = 'KONUT';
    if (tipHam) {
      if ((PROJE_TIPLERI as readonly string[]).includes(tipHam)) tip = tipHam as ProjeTipi;
      else hatalar.push(`Bilinmeyen proje tipi: "${s.tip}" (KONUT, VILLA, OFIS, KARMA)`);
    }

    const durumHam = (s.durum ?? '').trim().toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/ /g, '_');
    let durum: ProjeDurumu = 'SATISTA';
    if (durumHam) {
      if ((PROJE_DURUMLARI as readonly string[]).includes(durumHam)) durum = durumHam as ProjeDurumu;
      else hatalar.push(`Bilinmeyen satış durumu: "${s.durum}"`);
    }

    const tapuHam = (s.tapudurumu ?? '').trim().toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/ /g, '_');
    let tapuDurumu: TapuDurumu | null = null;
    if (tapuHam) {
      if ((TAPU_DURUMLARI as readonly string[]).includes(tapuHam)) tapuDurumu = tapuHam as TapuDurumu;
      else uyarilar.push(`Bilinmeyen tapu durumu atlandı: "${s.tapudurumu}"`);
    }

    const tarihAlan = (anahtar: string, etiket: string): Date | null => {
      const c = tarihCoz(s[anahtar] ?? '');
      if (c === 'hata') {
        hatalar.push(`${etiket} okunamadı: "${s[anahtar]}" (2027-03-01, 01.03.2027 ya da 2027Q1)`);
        return null;
      }
      return c;
    };
    const baslangicTarihi = tarihAlan('baslangictarihi', 'İnşaat başlangıcı');
    const teslimTarihi = tarihAlan('teslimtarihi', 'Teslim tarihi');
    if (baslangicTarihi && teslimTarihi && teslimTarihi < baslangicTarihi) {
      hatalar.push('Teslim tarihi, inşaat başlangıcından önce olamaz.');
    }

    const ozellikKodlari: string[] = [];
    for (const parca of (s.ozellikler ?? '').split(/[|,;]/)) {
      const kod = parca.trim().toLowerCase();
      if (!kod) continue;
      if (gecerliKodlar.has(kod)) ozellikKodlari.push(kod);
      else uyarilar.push(`Bilinmeyen özellik atlandı: "${parca.trim()}"`);
    }

    const fotograflar: { url: string; alt: string }[] = [];
    for (const parca of (s.fotograflar ?? '').split('|')) {
      const p = parca.trim();
      if (!p) continue;
      const ayrac = p.indexOf('>');
      const url = (ayrac < 0 ? p : p.slice(0, ayrac)).trim();
      const alt = ayrac < 0 ? '' : p.slice(ayrac + 1).trim();
      if (!/^https?:\/\//.test(url)) { uyarilar.push(`Geçersiz görsel adresi atlandı: "${p}"`); continue; }
      if (alt.length < 5) { uyarilar.push(`Alt metni eksik, görsel atlandı: "${url}"`); continue; }
      fotograflar.push({ url, alt });
    }
    if (!fotograflar.length) {
      uyarilar.push('Görsel yok — proje yayına alınamaz, önce görsel eklenmeli.');
    }

    /* Eşleştirme slug üzerinden. Var olan proje güncelleniyor;
       aynı dosya ikinci kez yüklenince kopya açılmıyor. */
    const tabanSlug = slugla(ad);
    const mevcut = tabanSlug
      ? await prisma.proje.findUnique({ where: { slug: tabanSlug }, select: { id: true } })
      : null;

    let slug = tabanSlug;
    if (!mevcut) {
      slug = await benzersizSlug(ad, async (aday) =>
        dosyadakiSluglar.has(aday)
        || (await prisma.proje.count({ where: { slug: aday } })) > 0
        || (await prisma.projeSlug.count({ where: { slug: aday } })) > 0);
      if (slug !== tabanSlug) {
        uyarilar.push(`Adres çakıştı, "${slug}" kullanılacak.`);
      }
    }
    dosyadakiSluglar.add(slug);

    sonuclar.push({
      satir: satirNo,
      durum: hatalar.length ? 'hata' : mevcut ? 'guncelleme' : 'yeni',
      ad: ad || '(adsız)',
      slug,
      hatalar,
      uyarilar,
    });

    if (!hatalar.length) {
      cozulmus.push({
        satir: satirNo, ad, slug,
        bolgeId: bolgeId!, firmaId: firmaId!, mahalle,
        adres: (s.adres ?? '').trim() || null,
        lat: lat!, lng: lng!,
        tip, durum,
        fiyatMin: fiyatMin!, fiyatMax,
        pesinatOrani, taksitAyi,
        /* Kredi uygunluğu VARSAYILAN OLARAK TRUE: yeni projelerin
           büyük çoğunluğu krediye uygun ve sütunu boş bırakan firma
           "uygun değil" demek istemiyor. */
        krediyeUygun: (s.krediyeuygun ?? '').trim() ? evetHayir(s.krediyeuygun!) !== false : true,
        takas: evetHayir(s.takas ?? '') === true,
        aidat: opsSayi('aidat', 'Aidat'),
        tapuDurumu,
        blokSayisi: opsSayi('bloksayisi', 'Blok sayısı'),
        katSayisi: opsSayi('katsayisi', 'Kat sayısı'),
        toplamBagimsizBolum: opsSayi('toplambagimsizbolum', 'Bağımsız bölüm sayısı'),
        arsaM2: opsSayi('arsam2', 'Arsa alanı'),
        insaatAlaniM2: opsSayi('insaatalanim2', 'İnşaat alanı'),
        yesilAlanOrani,
        baslangicTarihi, teslimTarihi, ilerlemeYuzde,
        ozet, ozellikKodlari, fotograflar,
        mevcutId: mevcut?.id ?? null,
      });
    }
  }

  return {
    onizleme: {
      sonuclar,
      yeni: sonuclar.filter((r) => r.durum === 'yeni').length,
      guncelleme: sonuclar.filter((r) => r.durum === 'guncelleme').length,
      hatali: sonuclar.filter((r) => r.durum === 'hata').length,
      bilinmeyenSutunlar,
      eksikSutunlar: [],
    },
    cozulmus,
  };
}

export interface UygulamaSonucu {
  eklenen: number;
  guncellenen: number;
  atlanan: number;
  hata?: string;
}

/**
 * Çözülmüş satırları yazar.
 *
 * HATALI SATIRLAR ATLANIYOR, tüm dosya reddedilmiyor: yüz satırlık bir
 * listede iki satır yüzünden doksan sekizini beklemek pratikte
 * dosyanın hiç aktarılmaması demek. Rapor neyin atlandığını söylüyor.
 *
 * Her proje KENDİ İŞLEMİNDE yazılıyor. Tek dev işlem, ortadaki bir
 * hatada yüz satırı birden geri alırdı; ayrıca uzun süren işlem
 * bağlantı havuzunu tıkıyor.
 */
export async function iceAktarUygula(cozulmus: CozulmusSatir[]): Promise<UygulamaSonucu> {
  let eklenen = 0, guncellenen = 0, atlanan = 0;

  const ozellikIdleri = new Map(
    (await prisma.ozellik.findMany({ select: { id: true, kod: true } }))
      .map((o) => [o.kod, o.id]),
  );

  for (const c of cozulmus) {
    try {
      await prisma.$transaction(async (tx) => {
        const ortak = {
          ad: c.ad, bolgeId: c.bolgeId, firmaId: c.firmaId,
          mahalle: c.mahalle, adres: c.adres, lat: c.lat, lng: c.lng,
          tip: c.tip, durum: c.durum,
          fiyatMin: c.fiyatMin, fiyatMax: c.fiyatMax,
          pesinatOrani: c.pesinatOrani, taksitAyi: c.taksitAyi,
          krediyeUygun: c.krediyeUygun, takas: c.takas,
          aidat: c.aidat, tapuDurumu: c.tapuDurumu,
          blokSayisi: c.blokSayisi, katSayisi: c.katSayisi,
          toplamBagimsizBolum: c.toplamBagimsizBolum,
          arsaM2: c.arsaM2, insaatAlaniM2: c.insaatAlaniM2,
          yesilAlanOrani: c.yesilAlanOrani,
          baslangicTarihi: c.baslangicTarihi, teslimTarihi: c.teslimTarihi,
          ilerlemeYuzde: c.ilerlemeYuzde,
          ozet: c.ozet,
        };

        let projeId: string;
        if (c.mevcutId) {
          /* Güncellemede `yayinda` DEĞİŞTİRİLMİYOR: yayındaki bir
             projeyi içe aktarma taslağa düşürmemeli. */
          await tx.proje.update({ where: { id: c.mevcutId }, data: ortak });
          projeId = c.mevcutId;
          guncellenen++;
        } else {
          const v = await tx.proje.create({
            data: { ...ortak, slug: c.slug, yayinda: false, yayinTarihi: new Date() },
            select: { id: true },
          });
          projeId = v.id;
          eklenen++;
        }

        if (c.fotograflar.length) {
          // Görsel listesi dosyadakiyle DEĞİŞTİRİLİYOR: dosya
          // kaynağın son hâli, birleştirmek kopya üretirdi
          await tx.medya.deleteMany({ where: { projeId } });
          await tx.medya.createMany({
            data: c.fotograflar.map((f, i) => ({ projeId, url: f.url, alt: f.alt, sira: i })),
          });
        }

        if (c.ozellikKodlari.length) {
          await tx.projeOzellik.deleteMany({ where: { projeId } });
          await tx.projeOzellik.createMany({
            data: c.ozellikKodlari
              .map((k) => ozellikIdleri.get(k))
              .filter((id): id is string => !!id)
              .map((ozellikId) => ({ projeId, ozellikId })),
          });
        }
      });
    } catch (e) {
      console.error(`İçe aktarma satır ${c.satir} yazılamadı:`, e);
      atlanan++;
    }
  }

  return { eklenen, guncellenen, atlanan };
}

/** İndirilebilir örnek dosyanın satırları. */
export function sablonSatirlari(): string[][] {
  return [
    ['ad', 'bolge', 'firma', 'mahalle', 'adres', 'enlem', 'boylam',
      'tip', 'durum', 'fiyatMin', 'fiyatMax', 'pesinatOrani', 'taksitAyi',
      'krediyeUygun', 'takas', 'aidat', 'tapuDurumu', 'blokSayisi', 'katSayisi',
      'toplamBagimsizBolum', 'arsaM2', 'insaatAlaniM2', 'yesilAlanOrani',
      'baslangicTarihi', 'teslimTarihi', 'ilerlemeYuzde', 'ozet',
      'ozellikler', 'fotograflar'],
    ['Park Vadi Ataşehir', 'Ataşehir', 'Örnek İnşaat', 'Barbaros',
      'Halk Cad. No: 12', '40,992134', '29,127456',
      'KONUT', 'SATISTA', '6.750.000', '18.400.000', '25', '60',
      'Evet', 'Hayır', '3.100', 'KAT_IRTIFAKI', '4', '18',
      '312', '14.800', '46.500', '65',
      '2025Q2', '2027Q4', '62',
      'Ataşehir Barbaros’ta, metroya yürüme mesafesinde dört bloklu konut projesi. '
      + 'Kapalı otopark, güvenlik ve 65% yeşil alan oranıyla planlandı.',
      'kapaliotopark|guvenlik|fitness|cocukoyun',
      'https://cdn.konutprojeleri.com/parkvadi-1.jpg>Vadiye bakan dış cephe görseli'
      + '|https://cdn.konutprojeleri.com/parkvadi-2.jpg>Örnek daire salon görünümü'],
  ];
}
