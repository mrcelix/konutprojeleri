import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../lib/generated/prisma';
import { parolaHashle } from '../lib/auth';
import { BOLGELER, FIRMALAR, OZELLIKLER, PROJELER } from './seed-data';
import type { OzellikKey } from '../lib/types';

/* ============================================================
   Veritabanını seed-data.ts içindeki editöryel veriyle doldurur.
   Yeniden çalıştırılabilir: her tabloyu bağımlılık sırasına göre
   temizleyip baştan yazar.

   ÜRETİMDE ÇALIŞTIRILMAZ. `deleteMany()` gerçek satış taleplerini
   siler. Panelden basılan demo veri için `lib/tohum.ts` var — o
   hiçbir şey silmiyor ve geri alınabiliyor.
   ============================================================ */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/** Proje görsellerini içeriğe göre etiketle — alt metinleri SEO için anlamlı olsun. */
const MEDYA_TIPI = ['DIS_CEPHE', 'DIS_CEPHE', 'IC_MEKAN', 'ORNEK_DAIRE',
  'IC_MEKAN', 'SOSYAL_TESIS'] as const;
const MEDYA_ACIKLAMA = [
  'dış cephe görselleştirmesi', 'bahçe ve giriş aksı', 'örnek daire salon',
  'örnek daire mutfak', 'örnek daire ebeveyn banyosu', 'sosyal tesis ve peyzaj alanı',
];

async function main() {
  console.log('Seed başlıyor…');

  // Bağımlılık sırasına göre temizle
  await prisma.denetimKaydi.deleteMany();
  await prisma.mesaj.deleteMany();
  await prisma.konusma.deleteMany();
  await prisma.oturum.deleteMany();
  await prisma.bildirim.deleteMany();
  await prisma.talep.deleteMany();
  await prisma.kullanici.deleteMany();
  await prisma.fiyatAlarmi.deleteMany();
  await prisma.daireTipi.deleteMany();
  await prisma.medya.deleteMany();
  await prisma.projeOzellik.deleteMany();
  await prisma.projeSlug.deleteMany();
  await prisma.proje.deleteMany();
  await prisma.bolgeSss.deleteMany();
  await prisma.bolge.deleteMany();
  await prisma.firma.deleteMany();
  await prisma.ozellik.deleteMany();

  /* ---------------- Özellikler ---------------- */
  const ozellikKayit = new Map<string, string>();
  let sira = 0;
  for (const [kod, o] of Object.entries(OZELLIKLER) as [OzellikKey, (typeof OZELLIKLER)[OzellikKey]][]) {
    const kayit = await prisma.ozellik.create({
      data: {
        kod,
        ad: o.ad,
        ikon: o.ikon,
        landingSlug: o.landing?.slug ?? null,
        landingBaslik: o.landing?.baslik ?? null,
        landingAciklama: o.landing?.aciklama ?? null,
        sira: sira++,
      },
    });
    ozellikKayit.set(kod, kayit.id);
  }
  console.log(`  ${ozellikKayit.size} özellik`);

  /* ---------------- Bölgeler ---------------- */
  const bolgeKayit = new Map<string, string>();
  for (const [i, b] of BOLGELER.entries()) {
    const { sss, ...icerikGerisi } = b.icerik;
    const kayit = await prisma.bolge.create({
      data: {
        slug: b.slug,
        ad: b.ad,
        il: b.il,
        lat: b.lat,
        lng: b.lng,
        adet: b.adet,
        img: b.img,
        ozet: b.ozet,
        icerik: icerikGerisi,
        sira: i,
        sss: {
          create: sss.map((f, k) => ({ soru: f.s, cevap: f.c, sira: k })),
        },
      },
    });
    bolgeKayit.set(b.slug, kayit.id);
  }
  console.log(`  ${bolgeKayit.size} bölge + SSS`);

  /* ---------------- Firmalar ---------------- */
  const firmaKayit = new Map<string, string>();
  for (const [i, f] of FIRMALAR.entries()) {
    const kayit = await prisma.firma.create({
      data: {
        slug: f.slug,
        ad: f.ad,
        ozet: f.ozet,
        kurulusYili: f.kurulusYili,
        tamamlananProje: f.tamamlananProje,
        web: f.web ?? null,
        sira: i,
      },
    });
    firmaKayit.set(f.slug, kayit.id);
  }
  console.log(`  ${firmaKayit.size} firma`);

  /* ---------------- Projeler ---------------- */
  for (const p of PROJELER) {
    await prisma.proje.create({
      data: {
        slug: p.slug,
        ad: p.ad,
        tip: p.tip,
        durum: p.durum,
        bolgeId: bolgeKayit.get(p.bolgeSlug)!,
        firmaId: firmaKayit.get(p.firmaSlug)!,
        mahalle: p.mahalle,
        adres: p.adres ?? null,
        lat: p.lat,
        lng: p.lng,
        fiyatMin: p.fiyatMin,
        fiyatMax: p.fiyatMax ?? null,
        pesinatOrani: p.odeme.pesinat,
        taksitAyi: p.odeme.vade,
        krediyeUygun: p.odeme.krediyeUygun,
        takas: p.odeme.takas,
        aidat: p.odeme.aidat ?? null,
        tapuDurumu: p.odeme.tapu ?? null,
        blokSayisi: p.olcek.blok ?? null,
        katSayisi: p.olcek.kat ?? null,
        toplamBagimsizBolum: p.olcek.bagimsizBolum ?? null,
        arsaM2: p.olcek.arsaM2 ?? null,
        insaatAlaniM2: p.olcek.insaatM2 ?? null,
        yesilAlanOrani: p.olcek.yesilOran ?? null,
        baslangicTarihi: p.baslangic ? new Date(p.baslangic) : null,
        teslimTarihi: p.teslim ? new Date(p.teslim) : null,
        ilerlemeYuzde: p.ilerleme,
        ozet: p.ozet,
        sec: p.sec || null,
        yeni: p.yeni,
        oneCikan: p.oneCikan,
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
          create: p.ozellik.map((kod) => ({ ozellikId: ozellikKayit.get(kod)! })),
        },
        daireTipleri: {
          create: p.daireTipleri.map((t, i) => ({
            ad: t.ad,
            odaSayisi: t.oda,
            banyo: t.banyo,
            brutM2: t.brutM2,
            netM2: t.netM2 ?? null,
            nitelik: t.nitelik ?? null,
            fiyatMin: t.fiyatMin ?? null,
            fiyatMax: t.fiyatMax ?? null,
            adet: t.adet ?? null,
            kalanAdet: t.kalan ?? null,
            sira: i,
          })),
        },
      },
    });
  }
  const daireSayisi = await prisma.daireTipi.count();
  console.log(`  ${PROJELER.length} proje + medya + özellik + ${daireSayisi} daire tipi`);

  /* ---------------- Panel kullanıcıları ---------------- */
  // Geliştirme parolası. Üretimde bu seed çalıştırılmaz;
  // ilk yönetici hesabı elle ve güçlü bir parolayla açılır.
  const DEMO_PAROLA = process.env.SEED_PAROLA ?? 'konutprojeleri2026';
  const hash = await parolaHashle(DEMO_PAROLA);

  await prisma.kullanici.create({
    data: {
      ad: 'KonutProjeleri Yönetim',
      eposta: 'admin@konutprojeleri.com',
      rol: 'ADMIN',
      parolaHash: hash,
    },
  });

  // Her firmaya bir panel hesabı
  const firmalar = await prisma.firma.findMany({ select: { id: true, ad: true, slug: true } });
  for (const [i, f] of firmalar.entries()) {
    await prisma.kullanici.create({
      data: {
        ad: `${f.ad} Yetkilisi`,
        eposta: `${f.slug}@konutprojeleri.test`,
        rol: 'FIRMA',
        parolaHash: hash,
        firmaId: f.id,
      },
    });
  }
  console.log(`  1 yönetici + ${firmalar.length} firma hesabı (parola: ${DEMO_PAROLA})`);

  /* ---------------- Örnek talepler ---------------- */
  /* Talep tablosu BOŞ BIRAKILMIYOR: panelin talep ekranı ve analitik
     huni, veri olmadan tasarım açısından değerlendirilemiyor. Örnekler
     az sayıda ve elle yazılmış; hacimli demo veri için panelden
     `TALEP_GECMISI` tohumu basılıyor. */
  const ORNEK_TALEPLER: [string, string, string, string, string | null][] = [
    ['Ayşe Karaca', '5321114455', 'RANDEVU', 'YENI',
      'Örnek daireyi hafta sonu görmek istiyorum, cumartesi öğleden sonra uygun olur mu?'],
    ['Mehmet Öz', '5339876543', 'FIYAT_LISTESI', 'ARANDI',
      '3+1 tiplerin kat bazında fiyat listesini paylaşabilir misiniz?'],
    ['Zeynep Aydın', '5445556677', 'BILGI', 'RANDEVU',
      'Aidat teslim sonrası ne kadar olacak, otopark hakkı daireye mi tanımlı?'],
    ['Can Demirtaş', '5052223344', 'KATALOG', 'ILGILENMIYOR', null],
    ['Elif Şahin', '5367778899', 'BILGI', 'SATIS',
      'Konut kredisi için anlaşmalı bankanız var mı?'],
  ];

  const talepProjeleri = await prisma.proje.findMany({
    take: 5,
    select: { id: true, daireTipleri: { take: 1, select: { id: true } } },
  });

  for (const [i, p] of talepProjeleri.entries()) {
    const [ad, telefon, niyet, durum, not] = ORNEK_TALEPLER[i % ORNEK_TALEPLER.length];
    const gunOnce = (i + 1) * 3;
    const olusturma = new Date(Date.now() - gunOnce * 864e5);
    await prisma.talep.create({
      data: {
        kod: `TLP-ORNEK${i + 1}`,
        projeId: p.id,
        daireTipiId: p.daireTipleri[0]?.id ?? null,
        ad,
        telefon,
        /* KATALOG ve FIYAT_LISTESI e-posta zorunlu kılıyor
           (bkz. lib/talep.ts) — örnek veri de o kurala uyuyor. */
        eposta: niyet === 'KATALOG' || niyet === 'FIYAT_LISTESI'
          ? `${ad.split(' ')[0].toLocaleLowerCase('tr')}@ornek.test`
          : null,
        niyet: niyet as never,
        durum: durum as never,
        not,
        kaynak: 'seed',
        kvkkOnay: true,
        kvkkTarih: olusturma,
        olusturma,
      },
    });
  }
  console.log(`  ${talepProjeleri.length} örnek satış talebi`);

  /* ---------------- Örnek konuşmalar ---------------- */
  const ORNEK_SORULAR = [
    ['Ayşe Karaca', 'Kapalı havuz teslimle birlikte mi açılacak, yoksa sonraki etapta mı?'],
    ['Mehmet Öz', 'Okul servis güzergâhı site içine giriyor mu?'],
    ['Zeynep Aydın', 'Otopark hakkı daireye tahsisli mi, kaç araç için?'],
    ['Can Demirtaş', 'Kat planlarını PDF olarak paylaşabilir misiniz?'],
    ['Elif Şahin', 'Zemin etüdü raporunu inceleyebilir miyim?'],
  ];

  const konusmaProjeleri = await prisma.proje.findMany({ take: 5, select: { id: true, ad: true } });
  for (const [i, p] of konusmaProjeleri.entries()) {
    const [ad, soru] = ORNEK_SORULAR[i % ORNEK_SORULAR.length];
    await prisma.konusma.create({
      data: {
        projeId: p.id,
        soranAd: ad,
        soranEposta: `${ad.split(' ')[0].toLocaleLowerCase('tr')}@ornek.test`,
        konu: `${p.ad} hakkında soru`,
        durum: i === 0 ? 'YANITLANDI' : 'ACIK',
        okundu: i === 0,
        mesajlar: {
          create: i === 0
            ? [
              { soranMi: true, metin: soru },
              {
                soranMi: false,
                metin: 'Merhaba, kapalı havuz birinci etapla birlikte teslim ediliyor; '
                  + 'sosyal tesisin tamamı teslim tarihinde kullanıma açılıyor.',
              },
            ]
            : [{ soranMi: true, metin: soru }],
        },
      },
    });
  }
  console.log(`  ${konusmaProjeleri.length} örnek konuşma`);

  const sayim = {
    kullanici: await prisma.kullanici.count(),
    firma: await prisma.firma.count(),
    bolge: await prisma.bolge.count(),
    proje: await prisma.proje.count(),
    daireTipi: await prisma.daireTipi.count(),
    medya: await prisma.medya.count(),
    talep: await prisma.talep.count(),
    konusma: await prisma.konusma.count(),
  };
  console.log('Seed tamam:', sayim);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
