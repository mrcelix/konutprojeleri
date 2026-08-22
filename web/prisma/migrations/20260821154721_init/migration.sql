-- ═══════════════════════════════════════════════════════════════
-- Uzantılar
--
-- EN BAŞTA olmalı: `proje_arama_trgm_idx` gin_trgm_ops operatör
-- sınıfını kullanıyor ve o sınıf pg_trgm yüklenmeden var olmuyor.
-- Ayrı bir migration'a bırakmak, sıfırdan kurulan her veritabanında
-- init'in patlaması demekti.
-- ═══════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Türkçe metin arama yapılandırması.
--
-- PostgreSQL'in yerleşik 'turkish' yapılandırması gövdeleme yapıyor ama
-- aksanları korumuyor. Kullanıcılar "atasehir", "bahcesehir", "cekmekoy"
-- yazıyor; unaccent sözlüğünü zincirin başına koyarak ş→s, ğ→g, ı→i
-- eşlemesi sağlanıyor. Böylece "Ataşehir" ile "atasehir" aynı sözcüğe
-- indirgeniyor.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'tr_unaccent') THEN
    CREATE TEXT SEARCH CONFIGURATION tr_unaccent (COPY = turkish);
    ALTER TEXT SEARCH CONFIGURATION tr_unaccent
      ALTER MAPPING FOR hword, hword_part, word WITH unaccent, turkish_stem;
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "ProjeTipi" AS ENUM ('KONUT', 'VILLA', 'OFIS', 'KARMA');

-- CreateEnum
CREATE TYPE "ProjeDurumu" AS ENUM ('YAKINDA', 'SATISTA', 'SON_DAIRELER', 'TUKENDI', 'TESLIM_EDILDI');

-- CreateEnum
CREATE TYPE "TapuDurumu" AS ENUM ('KAT_MULKIYETI', 'KAT_IRTIFAKI', 'ARSA_TAPULU', 'HISSELI', 'TAHSIS');

-- CreateEnum
CREATE TYPE "MedyaTipi" AS ENUM ('DIS_CEPHE', 'IC_MEKAN', 'ORNEK_DAIRE', 'SOSYAL_TESIS', 'MANZARA', 'VAZIYET_PLANI', 'KAT_PLANI', 'INSAAT_DURUMU');

-- CreateEnum
CREATE TYPE "TalepDurumu" AS ENUM ('YENI', 'ARANDI', 'ULASILAMADI', 'RANDEVU', 'ILGILENMIYOR', 'SATIS', 'KAPANDI');

-- CreateEnum
CREATE TYPE "TalepNiyeti" AS ENUM ('BILGI', 'FIYAT_LISTESI', 'KATALOG', 'RANDEVU');

-- CreateEnum
CREATE TYPE "OdemeSekli" AS ENUM ('BELIRTILMEDI', 'PESIN', 'KREDI', 'TAKSIT', 'TAKAS');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'FIRMA', 'ZIYARETCI');

-- CreateEnum
CREATE TYPE "MesajDurumu" AS ENUM ('ACIK', 'YANITLANDI', 'KAPALI');

-- CreateEnum
CREATE TYPE "BildirimTipi" AS ENUM ('TALEP_ALINDI', 'TALEP_EKIP', 'RANDEVU_TEYIT', 'KATALOG_GONDERILDI', 'HESAP_OLUSTURULDU', 'PAROLA_SIFIRLANDI', 'YENI_SORU', 'SORU_YANITLANDI', 'KVKK_DOGRULAMA', 'BASVURU_ALINDI', 'BASVURU_ONAYLANDI', 'BASVURU_REDDEDILDI', 'ALARM_DOGRULAMA', 'ALARM_DUSUS', 'ALARM_SATISTA');

-- CreateEnum
CREATE TYPE "BildirimDurumu" AS ENUM ('KUYRUKTA', 'GONDERILDI', 'BASARISIZ', 'IPTAL');

-- CreateEnum
CREATE TYPE "Kanal" AS ENUM ('EPOSTA', 'SMS');

-- CreateEnum
CREATE TYPE "EngelSebebi" AS ENUM ('KALICI_HATA', 'SIKAYET', 'ABONELIKTEN_CIKMA', 'ELLE');

-- CreateEnum
CREATE TYPE "Dil" AS ENUM ('TR', 'EN', 'RU', 'AR');

-- CreateEnum
CREATE TYPE "MenuKonumu" AS ENUM ('BASLIK', 'YARDIMCI', 'ALTBILGI');

-- CreateEnum
CREATE TYPE "VeriTalebiTipi" AS ENUM ('ERISIM', 'SILME');

-- CreateEnum
CREATE TYPE "VeriTalebiDurumu" AS ENUM ('DOGRULAMA_BEKLIYOR', 'ISLEMDE', 'TAMAMLANDI', 'REDDEDILDI');

-- CreateEnum
CREATE TYPE "BasvuruDurumu" AS ENUM ('YENI', 'GORUSULDU', 'ONAYLANDI', 'REDDEDILDI');

-- CreateEnum
CREATE TYPE "TohumTuru" AS ENUM ('ORNEK_PROJE', 'DEMO_PROJE', 'TALEP_GECMISI');

-- CreateTable
CREATE TABLE "bolge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "adet" INTEGER NOT NULL DEFAULT 0,
    "img" TEXT NOT NULL,
    "ozet" TEXT NOT NULL,
    "icerik" JSONB NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "yayinda" BOOLEAN NOT NULL DEFAULT true,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bolge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolge_sss" (
    "id" TEXT NOT NULL,
    "bolgeId" TEXT NOT NULL,
    "soru" TEXT NOT NULL,
    "cevap" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bolge_sss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ozellik" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "ikon" TEXT NOT NULL,
    "landingSlug" TEXT,
    "landingBaslik" TEXT,
    "landingAciklama" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ozellik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firma" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "logo" TEXT,
    "ozet" TEXT NOT NULL,
    "hakkinda" JSONB,
    "kurulusYili" INTEGER,
    "tamamlananProje" INTEGER NOT NULL DEFAULT 0,
    "telefon" TEXT,
    "eposta" TEXT,
    "web" TEXT,
    "yayinda" BOOLEAN NOT NULL DEFAULT true,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "firma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proje" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" "ProjeTipi" NOT NULL DEFAULT 'KONUT',
    "durum" "ProjeDurumu" NOT NULL DEFAULT 'SATISTA',
    "firmaId" TEXT NOT NULL,
    "bolgeId" TEXT NOT NULL,
    "mahalle" TEXT NOT NULL,
    "adres" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "fiyatMin" INTEGER NOT NULL,
    "fiyatMax" INTEGER,
    "paraBirimi" TEXT NOT NULL DEFAULT 'TRY',
    "pesinatOrani" INTEGER NOT NULL DEFAULT 0,
    "taksitAyi" INTEGER NOT NULL DEFAULT 0,
    "krediyeUygun" BOOLEAN NOT NULL DEFAULT true,
    "takas" BOOLEAN NOT NULL DEFAULT false,
    "aidat" INTEGER,
    "tapuDurumu" "TapuDurumu",
    "blokSayisi" INTEGER,
    "katSayisi" INTEGER,
    "toplamBagimsizBolum" INTEGER,
    "arsaM2" INTEGER,
    "insaatAlaniM2" INTEGER,
    "yesilAlanOrani" INTEGER,
    "baslangicTarihi" DATE,
    "teslimTarihi" DATE,
    "ilerlemeYuzde" INTEGER NOT NULL DEFAULT 0,
    "ozet" TEXT NOT NULL,
    "aciklama" JSONB,
    "sec" TEXT,
    "yeni" BOOLEAN NOT NULL DEFAULT false,
    "oneCikan" BOOLEAN NOT NULL DEFAULT false,
    "yayinda" BOOLEAN NOT NULL DEFAULT true,
    "yayinTarihi" TIMESTAMP(3) NOT NULL,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daire_tipi" (
    "id" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "odaSayisi" TEXT NOT NULL,
    "banyo" INTEGER NOT NULL DEFAULT 1,
    "brutM2" INTEGER NOT NULL,
    "netM2" INTEGER,
    "nitelik" TEXT,
    "fiyatMin" INTEGER,
    "fiyatMax" INTEGER,
    "adet" INTEGER,
    "kalanAdet" INTEGER,
    "katPlaniUrl" TEXT,
    "katPlaniAlt" TEXT,
    "katPlaniDepoAnahtar" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "yayinda" BOOLEAN NOT NULL DEFAULT true,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daire_tipi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proje_arama" (
    "projeId" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "vektor" tsvector NOT NULL,
    "guncelleme" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proje_arama_pkey" PRIMARY KEY ("projeId")
);

-- CreateTable
CREATE TABLE "proje_ozellik" (
    "projeId" TEXT NOT NULL,
    "ozellikId" TEXT NOT NULL,

    CONSTRAINT "proje_ozellik_pkey" PRIMARY KEY ("projeId","ozellikId")
);

-- CreateTable
CREATE TABLE "proje_slug" (
    "slug" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proje_slug_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "medya" (
    "id" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "tip" "MedyaTipi" NOT NULL DEFAULT 'DIS_CEPHE',
    "sira" INTEGER NOT NULL DEFAULT 0,
    "genislik" INTEGER,
    "yukseklik" INTEGER,
    "depoAnahtar" TEXT,
    "bayt" INTEGER,
    "altOtomatik" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "medya_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talep" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "projeId" TEXT,
    "daireTipiId" TEXT,
    "ad" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "eposta" TEXT,
    "niyet" "TalepNiyeti" NOT NULL DEFAULT 'BILGI',
    "butceMin" INTEGER,
    "butceMax" INTEGER,
    "odemeSekli" "OdemeSekli" NOT NULL DEFAULT 'BELIRTILMEDI',
    "saat" TEXT,
    "not" TEXT,
    "kaynak" TEXT,
    "durum" "TalepDurumu" NOT NULL DEFAULT 'YENI',
    "ekipNotu" TEXT,
    "atananId" TEXT,
    "kvkkOnay" BOOLEAN NOT NULL DEFAULT false,
    "kvkkTarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "talep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kullanici" (
    "id" TEXT NOT NULL,
    "eposta" TEXT NOT NULL,
    "parolaHash" TEXT,
    "ad" TEXT NOT NULL,
    "googleAlt" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'FIRMA',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "sonGiris" TIMESTAMP(3),
    "totpGizli" TEXT,
    "totpAktif" BOOLEAN NOT NULL DEFAULT false,
    "yedekKodlar" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,
    "firmaId" TEXT,

    CONSTRAINT "kullanici_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oturum" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "dogrulamaBekliyor" BOOLEAN NOT NULL DEFAULT false,
    "kullaniciId" TEXT NOT NULL,
    "sonKullanma" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "tarayici" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oturum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denetim_kaydi" (
    "id" TEXT NOT NULL,
    "kullaniciId" TEXT,
    "eylem" TEXT NOT NULL,
    "varlik" TEXT NOT NULL,
    "varlikId" TEXT,
    "detay" JSONB,
    "ip" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "denetim_kaydi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "konusma" (
    "id" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "dil" "Dil" NOT NULL DEFAULT 'TR',
    "soranAd" TEXT NOT NULL,
    "soranEposta" TEXT NOT NULL,
    "konu" TEXT NOT NULL,
    "durum" "MesajDurumu" NOT NULL DEFAULT 'ACIK',
    "okundu" BOOLEAN NOT NULL DEFAULT false,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "konusma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesaj" (
    "id" TEXT NOT NULL,
    "konusmaId" TEXT NOT NULL,
    "yazarId" TEXT,
    "soranMi" BOOLEAN NOT NULL DEFAULT true,
    "metin" TEXT NOT NULL,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mesaj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gonderim_engeli" (
    "id" TEXT NOT NULL,
    "kanal" "Kanal" NOT NULL,
    "adres" TEXT NOT NULL,
    "sebep" "EngelSebebi" NOT NULL,
    "detay" TEXT,
    "kaynak" TEXT NOT NULL,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gonderim_engeli_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bildirim" (
    "id" TEXT NOT NULL,
    "kanal" "Kanal" NOT NULL DEFAULT 'EPOSTA',
    "tip" "BildirimTipi" NOT NULL,
    "durum" "BildirimDurumu" NOT NULL DEFAULT 'KUYRUKTA',
    "alici" TEXT NOT NULL,
    "aliciAd" TEXT NOT NULL,
    "konu" TEXT NOT NULL,
    "govdeHtml" TEXT NOT NULL,
    "govdeMetin" TEXT NOT NULL,
    "talepId" TEXT,
    "konusmaId" TEXT,
    "kullaniciId" TEXT,
    "saglayici" TEXT NOT NULL,
    "referans" TEXT,
    "hataMesaji" TEXT,
    "denemeSayisi" INTEGER NOT NULL DEFAULT 0,
    "planlanan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gonderim" TIMESTAMP(3),
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bildirim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sayfa" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dil" "Dil" NOT NULL DEFAULT 'TR',
    "baslik" TEXT NOT NULL,
    "h1" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "govde" JSONB NOT NULL,
    "sss" JSONB,
    "ctaMetin" TEXT,
    "ctaYol" TEXT,
    "indexle" BOOLEAN NOT NULL DEFAULT true,
    "yayinda" BOOLEAN NOT NULL DEFAULT true,
    "guncelleyenId" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sayfa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metin" (
    "id" TEXT NOT NULL,
    "anahtar" TEXT NOT NULL,
    "dil" "Dil" NOT NULL DEFAULT 'TR',
    "deger" TEXT NOT NULL,
    "guncelleyenId" TEXT,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yazi" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dil" "Dil" NOT NULL DEFAULT 'TR',
    "baslik" TEXT NOT NULL,
    "ozet" TEXT NOT NULL,
    "kapak" TEXT,
    "govde" JSONB NOT NULL,
    "bolgeId" TEXT,
    "yazar" TEXT,
    "okumaDk" INTEGER NOT NULL DEFAULT 3,
    "yayinda" BOOLEAN NOT NULL DEFAULT false,
    "yayinTarihi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yazi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_ogesi" (
    "id" TEXT NOT NULL,
    "konum" "MenuKonumu" NOT NULL DEFAULT 'BASLIK',
    "dil" "Dil" NOT NULL DEFAULT 'TR',
    "ustId" TEXT,
    "ad" TEXT NOT NULL,
    "yol" TEXT,
    "ikon" TEXT,
    "not" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "mega" BOOLEAN NOT NULL DEFAULT false,
    "yeniSekme" BOOLEAN NOT NULL DEFAULT false,
    "tanitimBaslik" TEXT,
    "tanitimMetin" TEXT,
    "tanitimDugme" TEXT,
    "tanitimYol" TEXT,
    "seritBaslik" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_ogesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_gorsel" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "etiket" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "depoAnahtar" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_gorsel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kampanya" (
    "id" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "cagriAd" TEXT,
    "cagriYol" TEXT,
    "geriSayim" BOOLEAN NOT NULL DEFAULT false,
    "baslangic" TIMESTAMP(3) NOT NULL,
    "bitis" TIMESTAMP(3) NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kampanya_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_ayar" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "unvan" TEXT,
    "telefon" TEXT,
    "whatsapp" TEXT,
    "eposta" TEXT,
    "slogan" TEXT,
    "aciklama" TEXT,
    "adresSokak" TEXT,
    "adresIlce" TEXT,
    "adresIl" TEXT,
    "adresPosta" TEXT,
    "tursab" TEXT,
    "bakanlik" TEXT,
    "etbis" TEXT,
    "mersis" TEXT,
    "sosyal" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "guncelleyenId" TEXT,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_ayar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiyat_alarmi" (
    "id" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "eposta" TEXT NOT NULL,
    "hedef" INTEGER NOT NULL DEFAULT 0,
    "kurulusFiyati" INTEGER NOT NULL,
    "jeton" TEXT NOT NULL,
    "dogrulandi" BOOLEAN NOT NULL DEFAULT false,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "sonBildirim" TIMESTAMP(3),
    "sonFiyat" INTEGER,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiyat_alarmi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pano" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "butceMin" INTEGER,
    "butceMax" INTEGER,
    "sahipKimlik" TEXT NOT NULL,
    "sahipId" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pano_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pano_oge" (
    "id" TEXT NOT NULL,
    "panoId" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "ekleyen" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pano_oge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pano_oy" (
    "id" TEXT NOT NULL,
    "ogeId" TEXT NOT NULL,
    "kimlik" TEXT NOT NULL,
    "yon" INTEGER NOT NULL,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pano_oy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pano_yorum" (
    "id" TEXT NOT NULL,
    "panoId" TEXT NOT NULL,
    "ogeId" TEXT,
    "ad" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pano_yorum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kontrol_raporu" (
    "id" TEXT NOT NULL,
    "projeId" TEXT NOT NULL,
    "ziyaret" TIMESTAMP(3) NOT NULL,
    "kontrolEden" TEXT NOT NULL,
    "ozet" TEXT,
    "sonuclar" JSONB NOT NULL,
    "yayinda" BOOLEAN NOT NULL DEFAULT true,
    "guncelleyenId" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kontrol_raporu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veri_talebi" (
    "id" TEXT NOT NULL,
    "tip" "VeriTalebiTipi" NOT NULL,
    "durum" "VeriTalebiDurumu" NOT NULL DEFAULT 'DOGRULAMA_BEKLIYOR',
    "eposta" TEXT NOT NULL,
    "jetonHash" TEXT NOT NULL,
    "jetonSonKullanma" TIMESTAMP(3) NOT NULL,
    "dogrulandi" TIMESTAMP(3),
    "tamamlanma" TIMESTAMP(3),
    "not" TEXT,
    "sonuc" JSONB,
    "ip" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "veri_talebi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "firma_basvuru" (
    "id" TEXT NOT NULL,
    "durum" "BasvuruDurumu" NOT NULL DEFAULT 'YENI',
    "ad" TEXT NOT NULL,
    "eposta" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "firmaAd" TEXT NOT NULL,
    "bolge" TEXT NOT NULL,
    "projeSayisi" INTEGER NOT NULL DEFAULT 1,
    "mesaj" TEXT,
    "not" TEXT,
    "firmaId" TEXT,
    "ip" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncelleme" TIMESTAMP(3) NOT NULL,
    "sonuclanma" TIMESTAMP(3),

    CONSTRAINT "firma_basvuru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tohum_parti" (
    "id" TEXT NOT NULL,
    "tur" "TohumTuru" NOT NULL,
    "etiket" TEXT NOT NULL,
    "ozet" JSONB,
    "olusturanId" TEXT,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "silinme" TIMESTAMP(3),

    CONSTRAINT "tohum_parti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tohum_kayit" (
    "id" TEXT NOT NULL,
    "partiId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "kayitId" TEXT NOT NULL,
    "sira" INTEGER NOT NULL,

    CONSTRAINT "tohum_kayit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolge_ceviri" (
    "bolgeId" TEXT NOT NULL,
    "dil" "Dil" NOT NULL,
    "ozet" TEXT,
    "icerik" JSONB,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bolge_ceviri_pkey" PRIMARY KEY ("bolgeId","dil")
);

-- CreateTable
CREATE TABLE "proje_ceviri" (
    "projeId" TEXT NOT NULL,
    "dil" "Dil" NOT NULL,
    "ozet" TEXT,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proje_ceviri_pkey" PRIMARY KEY ("projeId","dil")
);

-- CreateTable
CREATE TABLE "ozellik_ceviri" (
    "ozellikId" TEXT NOT NULL,
    "dil" "Dil" NOT NULL,
    "ad" TEXT,
    "landingSlug" TEXT,
    "landingBaslik" TEXT,
    "landingAciklama" TEXT,
    "guncelleme" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ozellik_ceviri_pkey" PRIMARY KEY ("ozellikId","dil")
);

-- CreateTable
CREATE TABLE "hiz_sinir" (
    "anahtar" TEXT NOT NULL,
    "sayac" INTEGER NOT NULL DEFAULT 0,
    "pencere" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "engelBitis" TIMESTAMP(3),

    CONSTRAINT "hiz_sinir_pkey" PRIMARY KEY ("anahtar")
);

-- CreateTable
CREATE TABLE "ziyaret" (
    "id" TEXT NOT NULL,
    "yol" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "kaynak" TEXT,
    "kanal" TEXT NOT NULL,
    "motor" TEXT,
    "kampanya" TEXT,
    "bot" BOOLEAN NOT NULL DEFAULT false,
    "botAdi" TEXT,
    "cihaz" TEXT NOT NULL,
    "dil" TEXT,
    "ulke" TEXT,
    "ziyaretci" TEXT NOT NULL,
    "oturum" TEXT NOT NULL,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ziyaret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olay" (
    "id" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "hedef" TEXT,
    "yol" TEXT NOT NULL,
    "deger" INTEGER,
    "ziyaretci" TEXT NOT NULL,
    "oturum" TEXT NOT NULL,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "olay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "olcum_cwv" (
    "id" TEXT NOT NULL,
    "yol" TEXT NOT NULL,
    "metrik" TEXT NOT NULL,
    "deger" DOUBLE PRECISION NOT NULL,
    "derece" TEXT NOT NULL,
    "cihaz" TEXT NOT NULL,
    "olusturma" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "olcum_cwv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bolge_slug_key" ON "bolge"("slug");

-- CreateIndex
CREATE INDEX "bolge_yayinda_sira_idx" ON "bolge"("yayinda", "sira");

-- CreateIndex
CREATE INDEX "bolge_sss_bolgeId_sira_idx" ON "bolge_sss"("bolgeId", "sira");

-- CreateIndex
CREATE UNIQUE INDEX "ozellik_kod_key" ON "ozellik"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "ozellik_landingSlug_key" ON "ozellik"("landingSlug");

-- CreateIndex
CREATE INDEX "ozellik_sira_idx" ON "ozellik"("sira");

-- CreateIndex
CREATE UNIQUE INDEX "firma_slug_key" ON "firma"("slug");

-- CreateIndex
CREATE INDEX "firma_yayinda_sira_idx" ON "firma"("yayinda", "sira");

-- CreateIndex
CREATE UNIQUE INDEX "proje_slug_key" ON "proje"("slug");

-- CreateIndex
CREATE INDEX "proje_bolgeId_yayinda_idx" ON "proje"("bolgeId", "yayinda");

-- CreateIndex
CREATE INDEX "proje_yayinda_fiyatMin_idx" ON "proje"("yayinda", "fiyatMin");

-- CreateIndex
CREATE INDEX "proje_yayinda_teslimTarihi_idx" ON "proje"("yayinda", "teslimTarihi");

-- CreateIndex
CREATE INDEX "proje_firmaId_yayinda_idx" ON "proje"("firmaId", "yayinda");

-- CreateIndex
CREATE INDEX "proje_tip_durum_yayinda_idx" ON "proje"("tip", "durum", "yayinda");

-- CreateIndex
CREATE INDEX "proje_yayinda_oneCikan_idx" ON "proje"("yayinda", "oneCikan");

-- CreateIndex
CREATE INDEX "daire_tipi_projeId_sira_idx" ON "daire_tipi"("projeId", "sira");

-- CreateIndex
CREATE INDEX "daire_tipi_projeId_yayinda_idx" ON "daire_tipi"("projeId", "yayinda");

-- CreateIndex
CREATE INDEX "proje_arama_vektor_idx" ON "proje_arama" USING GIN ("vektor");

-- CreateIndex
CREATE INDEX "proje_arama_trgm_idx" ON "proje_arama" USING GIN ("metin" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "proje_ozellik_ozellikId_idx" ON "proje_ozellik"("ozellikId");

-- CreateIndex
CREATE INDEX "proje_slug_projeId_idx" ON "proje_slug"("projeId");

-- CreateIndex
CREATE INDEX "medya_projeId_sira_idx" ON "medya"("projeId", "sira");

-- CreateIndex
CREATE INDEX "medya_projeId_tip_idx" ON "medya"("projeId", "tip");

-- CreateIndex
CREATE UNIQUE INDEX "talep_kod_key" ON "talep"("kod");

-- CreateIndex
CREATE INDEX "talep_durum_olusturma_idx" ON "talep"("durum", "olusturma");

-- CreateIndex
CREATE INDEX "talep_olusturma_idx" ON "talep"("olusturma");

-- CreateIndex
CREATE INDEX "talep_projeId_idx" ON "talep"("projeId");

-- CreateIndex
CREATE INDEX "talep_eposta_idx" ON "talep"("eposta");

-- CreateIndex
CREATE INDEX "talep_niyet_durum_idx" ON "talep"("niyet", "durum");

-- CreateIndex
CREATE UNIQUE INDEX "kullanici_eposta_key" ON "kullanici"("eposta");

-- CreateIndex
CREATE UNIQUE INDEX "kullanici_googleAlt_key" ON "kullanici"("googleAlt");

-- CreateIndex
CREATE UNIQUE INDEX "kullanici_firmaId_key" ON "kullanici"("firmaId");

-- CreateIndex
CREATE INDEX "kullanici_rol_aktif_idx" ON "kullanici"("rol", "aktif");

-- CreateIndex
CREATE UNIQUE INDEX "oturum_tokenHash_key" ON "oturum"("tokenHash");

-- CreateIndex
CREATE INDEX "oturum_kullaniciId_idx" ON "oturum"("kullaniciId");

-- CreateIndex
CREATE INDEX "oturum_sonKullanma_idx" ON "oturum"("sonKullanma");

-- CreateIndex
CREATE INDEX "denetim_kaydi_varlik_varlikId_idx" ON "denetim_kaydi"("varlik", "varlikId");

-- CreateIndex
CREATE INDEX "denetim_kaydi_olusturma_idx" ON "denetim_kaydi"("olusturma");

-- CreateIndex
CREATE INDEX "konusma_projeId_durum_idx" ON "konusma"("projeId", "durum");

-- CreateIndex
CREATE INDEX "konusma_durum_guncelleme_idx" ON "konusma"("durum", "guncelleme");

-- CreateIndex
CREATE INDEX "mesaj_konusmaId_olusturma_idx" ON "mesaj"("konusmaId", "olusturma");

-- CreateIndex
CREATE INDEX "gonderim_engeli_olusturma_idx" ON "gonderim_engeli"("olusturma");

-- CreateIndex
CREATE INDEX "gonderim_engeli_kanal_idx" ON "gonderim_engeli"("kanal", "sebep");

-- CreateIndex
CREATE UNIQUE INDEX "gonderim_engeli_kanal_adres_key" ON "gonderim_engeli"("kanal", "adres");

-- CreateIndex
CREATE INDEX "bildirim_durum_planlanan_idx" ON "bildirim"("durum", "planlanan");

-- CreateIndex
CREATE INDEX "bildirim_talepId_idx" ON "bildirim"("talepId");

-- CreateIndex
CREATE INDEX "bildirim_olusturma_idx" ON "bildirim"("olusturma");

-- CreateIndex
CREATE INDEX "bildirim_kanal_idx" ON "bildirim"("kanal", "durum");

-- CreateIndex
CREATE INDEX "sayfa_dil_yayinda_idx" ON "sayfa"("dil", "yayinda");

-- CreateIndex
CREATE UNIQUE INDEX "sayfa_slug_dil_key" ON "sayfa"("slug", "dil");

-- CreateIndex
CREATE UNIQUE INDEX "metin_anahtar_dil_key" ON "metin"("anahtar", "dil");

-- CreateIndex
CREATE UNIQUE INDEX "yazi_slug_key" ON "yazi"("slug");

-- CreateIndex
CREATE INDEX "yazi_yayinda_yayinTarihi_idx" ON "yazi"("yayinda", "yayinTarihi");

-- CreateIndex
CREATE INDEX "yazi_bolgeId_idx" ON "yazi"("bolgeId");

-- CreateIndex
CREATE INDEX "menu_ogesi_konum_dil_aktif_sira_idx" ON "menu_ogesi"("konum", "dil", "aktif", "sira");

-- CreateIndex
CREATE INDEX "menu_ogesi_ustId_idx" ON "menu_ogesi"("ustId");

-- CreateIndex
CREATE INDEX "hero_gorsel_aktif_sira_idx" ON "hero_gorsel"("aktif", "sira");

-- CreateIndex
CREATE INDEX "kampanya_aktif_baslangic_bitis_idx" ON "kampanya"("aktif", "baslangic", "bitis");

-- CreateIndex
CREATE UNIQUE INDEX "fiyat_alarmi_jeton_key" ON "fiyat_alarmi"("jeton");

-- CreateIndex
CREATE INDEX "fiyat_alarmi_aktif_dogrulandi_idx" ON "fiyat_alarmi"("aktif", "dogrulandi");

-- CreateIndex
CREATE UNIQUE INDEX "fiyat_alarmi_projeId_eposta_key" ON "fiyat_alarmi"("projeId", "eposta");

-- CreateIndex
CREATE UNIQUE INDEX "pano_kod_key" ON "pano"("kod");

-- CreateIndex
CREATE INDEX "pano_sahipKimlik_idx" ON "pano"("sahipKimlik");

-- CreateIndex
CREATE INDEX "pano_oge_panoId_sira_idx" ON "pano_oge"("panoId", "sira");

-- CreateIndex
CREATE UNIQUE INDEX "pano_oge_panoId_projeId_key" ON "pano_oge"("panoId", "projeId");

-- CreateIndex
CREATE UNIQUE INDEX "pano_oy_ogeId_kimlik_key" ON "pano_oy"("ogeId", "kimlik");

-- CreateIndex
CREATE INDEX "pano_yorum_panoId_olusturma_idx" ON "pano_yorum"("panoId", "olusturma");

-- CreateIndex
CREATE UNIQUE INDEX "kontrol_raporu_projeId_key" ON "kontrol_raporu"("projeId");

-- CreateIndex
CREATE UNIQUE INDEX "veri_talebi_jetonHash_key" ON "veri_talebi"("jetonHash");

-- CreateIndex
CREATE INDEX "veri_talebi_durum_olusturma_idx" ON "veri_talebi"("durum", "olusturma");

-- CreateIndex
CREATE INDEX "veri_talebi_eposta_idx" ON "veri_talebi"("eposta");

-- CreateIndex
CREATE INDEX "firma_basvuru_durum_olusturma_idx" ON "firma_basvuru"("durum", "olusturma");

-- CreateIndex
CREATE INDEX "firma_basvuru_eposta_idx" ON "firma_basvuru"("eposta");

-- CreateIndex
CREATE INDEX "firma_basvuru_firmaId_idx" ON "firma_basvuru"("firmaId");

-- CreateIndex
CREATE INDEX "tohum_parti_olusturma_idx" ON "tohum_parti"("olusturma");

-- CreateIndex
CREATE INDEX "tohum_kayit_partiId_sira_idx" ON "tohum_kayit"("partiId", "sira");

-- CreateIndex
CREATE UNIQUE INDEX "tohum_kayit_model_kayitId_key" ON "tohum_kayit"("model", "kayitId");

-- CreateIndex
CREATE UNIQUE INDEX "ozellik_ceviri_dil_landingSlug_key" ON "ozellik_ceviri"("dil", "landingSlug");

-- CreateIndex
CREATE INDEX "hiz_sinir_pencere_idx" ON "hiz_sinir"("pencere");

-- CreateIndex
CREATE INDEX "ziyaret_olusturma_idx" ON "ziyaret"("olusturma");

-- CreateIndex
CREATE INDEX "ziyaret_bot_olusturma_idx" ON "ziyaret"("bot", "olusturma");

-- CreateIndex
CREATE INDEX "ziyaret_kanal_olusturma_idx" ON "ziyaret"("kanal", "olusturma");

-- CreateIndex
CREATE INDEX "ziyaret_yol_olusturma_idx" ON "ziyaret"("yol", "olusturma");

-- CreateIndex
CREATE INDEX "ziyaret_ziyaretci_idx" ON "ziyaret"("ziyaretci");

-- CreateIndex
CREATE INDEX "olay_tur_olusturma_idx" ON "olay"("tur", "olusturma");

-- CreateIndex
CREATE INDEX "olay_olusturma_idx" ON "olay"("olusturma");

-- CreateIndex
CREATE INDEX "olcum_cwv_metrik_olusturma_idx" ON "olcum_cwv"("metrik", "olusturma");

-- CreateIndex
CREATE INDEX "olcum_cwv_yol_metrik_idx" ON "olcum_cwv"("yol", "metrik");

-- AddForeignKey
ALTER TABLE "bolge_sss" ADD CONSTRAINT "bolge_sss_bolgeId_fkey" FOREIGN KEY ("bolgeId") REFERENCES "bolge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proje" ADD CONSTRAINT "proje_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firma"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proje" ADD CONSTRAINT "proje_bolgeId_fkey" FOREIGN KEY ("bolgeId") REFERENCES "bolge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daire_tipi" ADD CONSTRAINT "daire_tipi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proje_arama" ADD CONSTRAINT "proje_arama_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proje_ozellik" ADD CONSTRAINT "proje_ozellik_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proje_ozellik" ADD CONSTRAINT "proje_ozellik_ozellikId_fkey" FOREIGN KEY ("ozellikId") REFERENCES "ozellik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proje_slug" ADD CONSTRAINT "proje_slug_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medya" ADD CONSTRAINT "medya_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talep" ADD CONSTRAINT "talep_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talep" ADD CONSTRAINT "talep_daireTipiId_fkey" FOREIGN KEY ("daireTipiId") REFERENCES "daire_tipi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talep" ADD CONSTRAINT "talep_atananId_fkey" FOREIGN KEY ("atananId") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kullanici" ADD CONSTRAINT "kullanici_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oturum" ADD CONSTRAINT "oturum_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denetim_kaydi" ADD CONSTRAINT "denetim_kaydi_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "konusma" ADD CONSTRAINT "konusma_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesaj" ADD CONSTRAINT "mesaj_konusmaId_fkey" FOREIGN KEY ("konusmaId") REFERENCES "konusma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesaj" ADD CONSTRAINT "mesaj_yazarId_fkey" FOREIGN KEY ("yazarId") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bildirim" ADD CONSTRAINT "bildirim_talepId_fkey" FOREIGN KEY ("talepId") REFERENCES "talep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bildirim" ADD CONSTRAINT "bildirim_konusmaId_fkey" FOREIGN KEY ("konusmaId") REFERENCES "konusma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bildirim" ADD CONSTRAINT "bildirim_kullaniciId_fkey" FOREIGN KEY ("kullaniciId") REFERENCES "kullanici"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sayfa" ADD CONSTRAINT "sayfa_guncelleyenId_fkey" FOREIGN KEY ("guncelleyenId") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metin" ADD CONSTRAINT "metin_guncelleyenId_fkey" FOREIGN KEY ("guncelleyenId") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yazi" ADD CONSTRAINT "yazi_bolgeId_fkey" FOREIGN KEY ("bolgeId") REFERENCES "bolge"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_ogesi" ADD CONSTRAINT "menu_ogesi_ustId_fkey" FOREIGN KEY ("ustId") REFERENCES "menu_ogesi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_ayar" ADD CONSTRAINT "site_ayar_guncelleyenId_fkey" FOREIGN KEY ("guncelleyenId") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiyat_alarmi" ADD CONSTRAINT "fiyat_alarmi_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pano" ADD CONSTRAINT "pano_sahipId_fkey" FOREIGN KEY ("sahipId") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pano_oge" ADD CONSTRAINT "pano_oge_panoId_fkey" FOREIGN KEY ("panoId") REFERENCES "pano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pano_oge" ADD CONSTRAINT "pano_oge_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pano_oy" ADD CONSTRAINT "pano_oy_ogeId_fkey" FOREIGN KEY ("ogeId") REFERENCES "pano_oge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pano_yorum" ADD CONSTRAINT "pano_yorum_panoId_fkey" FOREIGN KEY ("panoId") REFERENCES "pano"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pano_yorum" ADD CONSTRAINT "pano_yorum_ogeId_fkey" FOREIGN KEY ("ogeId") REFERENCES "pano_oge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kontrol_raporu" ADD CONSTRAINT "kontrol_raporu_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kontrol_raporu" ADD CONSTRAINT "kontrol_raporu_guncelleyenId_fkey" FOREIGN KEY ("guncelleyenId") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "firma_basvuru" ADD CONSTRAINT "firma_basvuru_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "firma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tohum_parti" ADD CONSTRAINT "tohum_parti_olusturanId_fkey" FOREIGN KEY ("olusturanId") REFERENCES "kullanici"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tohum_kayit" ADD CONSTRAINT "tohum_kayit_partiId_fkey" FOREIGN KEY ("partiId") REFERENCES "tohum_parti"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolge_ceviri" ADD CONSTRAINT "bolge_ceviri_bolgeId_fkey" FOREIGN KEY ("bolgeId") REFERENCES "bolge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proje_ceviri" ADD CONSTRAINT "proje_ceviri_projeId_fkey" FOREIGN KEY ("projeId") REFERENCES "proje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ozellik_ceviri" ADD CONSTRAINT "ozellik_ceviri_ozellikId_fkey" FOREIGN KEY ("ozellikId") REFERENCES "ozellik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- Türkçe arama altyapısı
--
-- İndeksi uygulama kodu değil VERİTABANI güncelliyor. Panelden yapılan
-- düzenleme, tohumlama, elle SQL — hangisi olursa olsun indeks tutarlı
-- kalıyor. Bu, ayrı bir arama servisinde (Meilisearch vb.) senkron
-- gecikmesi olarak yaşanan sınıfın tamamını ortadan kaldırıyor.
-- ═══════════════════════════════════════════════════════════════

-- ── Arama satırını üreten fonksiyon ────────────────────────────
--
-- Ağırlıklar: A proje adı, B bölge/mahalle, C firma + özellikler,
-- D özet. ts_rank bu ağırlıkları kullanıyor; "Ataşehir" araması bölge
-- eşleşmesini özet içinde geçen kelimeden öne çıkarıyor.
--
-- FİRMA ADI 'C' AĞIRLIĞINDA: alıcıların önemli bir kısmı projeyi değil
-- müteahhidi arıyor ("Emlak Konut projeleri"). Firma adını hiç
-- eklememek o sorguları karşılıksız bırakıyordu; 'A' vermek ise tek bir
-- firmanın tüm projelerini her aramada öne çıkarırdı.
CREATE OR REPLACE FUNCTION proje_arama_yenile(p_proje_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_ad text; v_mahalle text; v_ozet text; v_tip text;
  v_bolge text; v_il text; v_firma text; v_ozellikler text;
  v_daireler text; v_yayinda boolean;
BEGIN
  SELECT p.ad, p.mahalle, p.ozet, p.tip::text, b.ad, b.il, f.ad, p.yayinda
    INTO v_ad, v_mahalle, v_ozet, v_tip, v_bolge, v_il, v_firma, v_yayinda
  FROM proje p
    JOIN bolge b ON b.id = p."bolgeId"
    JOIN firma f ON f.id = p."firmaId"
  WHERE p.id = p_proje_id;

  IF NOT FOUND THEN
    DELETE FROM proje_arama WHERE "projeId" = p_proje_id;
    RETURN;
  END IF;

  -- Yayında olmayan proje aranabilir olmamalı
  IF NOT v_yayinda THEN
    DELETE FROM proje_arama WHERE "projeId" = p_proje_id;
    RETURN;
  END IF;

  SELECT coalesce(string_agg(o.ad, ' '), '')
    INTO v_ozellikler
  FROM proje_ozellik po JOIN ozellik o ON o.id = po."ozellikId"
  WHERE po."projeId" = p_proje_id;

  -- Daire tipleri aranabilir: "3+1 Ataşehir" gerçek bir sorgu.
  SELECT coalesce(string_agg(DISTINCT d."odaSayisi", ' '), '')
    INTO v_daireler
  FROM daire_tipi d
  WHERE d."projeId" = p_proje_id AND d.yayinda;

  INSERT INTO proje_arama ("projeId", metin, vektor, guncelleme)
  VALUES (
    p_proje_id,
    concat_ws(' ', v_ad, v_bolge, v_mahalle, v_il, v_firma, v_ozellikler, v_daireler, v_tip, v_ozet),
    setweight(to_tsvector('tr_unaccent', coalesce(v_ad, '')), 'A') ||
    setweight(to_tsvector('tr_unaccent', concat_ws(' ', v_bolge, v_mahalle, v_il)), 'B') ||
    setweight(to_tsvector('tr_unaccent', concat_ws(' ', v_firma, v_ozellikler, v_daireler, v_tip)), 'C') ||
    setweight(to_tsvector('tr_unaccent', coalesce(v_ozet, '')), 'D'),
    now()
  )
  ON CONFLICT ("projeId") DO UPDATE
    SET metin = EXCLUDED.metin, vektor = EXCLUDED.vektor, guncelleme = now();
END $$;

-- ── Tetikleyiciler ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION proje_arama_tetik() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM proje_arama_yenile(NEW.id);
  RETURN NEW;
END $$;

CREATE TRIGGER proje_arama_ai AFTER INSERT ON proje
  FOR EACH ROW EXECUTE FUNCTION proje_arama_tetik();

-- Yalnızca aramayı etkileyen sütunlar değişince tazele
CREATE TRIGGER proje_arama_au
  AFTER UPDATE OF ad, mahalle, ozet, tip, "bolgeId", "firmaId", yayinda ON proje
  FOR EACH ROW EXECUTE FUNCTION proje_arama_tetik();

CREATE OR REPLACE FUNCTION proje_ozellik_arama_tetik() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM proje_arama_yenile(COALESCE(NEW."projeId", OLD."projeId"));
  RETURN NULL;
END $$;

CREATE TRIGGER proje_ozellik_arama_aiud
  AFTER INSERT OR UPDATE OR DELETE ON proje_ozellik
  FOR EACH ROW EXECUTE FUNCTION proje_ozellik_arama_tetik();

-- Daire tipi eklenip çıkınca "3+1" araması tazelenmeli
CREATE OR REPLACE FUNCTION daire_tipi_arama_tetik() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM proje_arama_yenile(COALESCE(NEW."projeId", OLD."projeId"));
  RETURN NULL;
END $$;

CREATE TRIGGER daire_tipi_arama_aiud
  AFTER INSERT OR UPDATE OR DELETE ON daire_tipi
  FOR EACH ROW EXECUTE FUNCTION daire_tipi_arama_tetik();

-- Bölge adı değişirse o bölgedeki tüm projelerin indeksi tazelenmeli
CREATE OR REPLACE FUNCTION bolge_arama_tetik() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  IF NEW.ad IS DISTINCT FROM OLD.ad OR NEW.il IS DISTINCT FROM OLD.il THEN
    FOR r IN SELECT id FROM proje WHERE "bolgeId" = NEW.id LOOP
      PERFORM proje_arama_yenile(r.id);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER bolge_arama_au AFTER UPDATE ON bolge
  FOR EACH ROW EXECUTE FUNCTION bolge_arama_tetik();

-- Firma adı değişirse o firmanın tüm projelerinin indeksi tazelenmeli
CREATE OR REPLACE FUNCTION firma_arama_tetik() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  IF NEW.ad IS DISTINCT FROM OLD.ad THEN
    FOR r IN SELECT id FROM proje WHERE "firmaId" = NEW.id LOOP
      PERFORM proje_arama_yenile(r.id);
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER firma_arama_au AFTER UPDATE ON firma
  FOR EACH ROW EXECUTE FUNCTION firma_arama_tetik();

-- ── Harita indeksi ─────────────────────────────────────────────
-- Harita görünümü sorgusu: sınır kutusu ön filtresi
CREATE INDEX proje_konum_idx ON proje (lat, lng) WHERE yayinda = true;
