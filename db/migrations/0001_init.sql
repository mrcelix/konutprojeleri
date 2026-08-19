-- ═══════════════════════════════════════════════════════════════
-- Konutprojeleri.com — çekirdek şema
-- Supabase / PostgreSQL 15+ · bölge eu-central-1
--
-- Çalıştırma: DIRECT_URL (port 5432, session mode) üzerinden.
-- Uygulama bağlantısı (6543) DDL için kullanılmaz.
-- ═══════════════════════════════════════════════════════════════

create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists citext;
-- pg_cron her ortamda yok (Supabase'de var, düz Postgres ve CI'da olmayabilir).
-- Şemanın her yerde çalışabilmesi için koşullu kuruluyor; zamanlanmış işler
-- eklenti yoksa atlanır ve migration kırılmaz.
do $do$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  else
    raise notice 'pg_cron mevcut degil; zamanlanmis isler atlanacak';
  end if;
end
$do$;

-- ─────────────────────────── FİRMA ───────────────────────────

create table firma (
  id             bigserial primary key,
  slug           citext unique not null,
  ad             text not null,
  kurulus_yili   int,
  merkez_il      text,
  merkez_ilce    text,
  vergi_no       text,
  dogrulandi     boolean not null default false,
  paket          text not null default 'ucretsiz'
                   check (paket in ('ucretsiz','pro','kurumsal')),
  -- Sicili oturmuş firmalar onay kuyruğunu atlayabilir.
  -- Bu olmadan 318 firmanın her güncellemesini elle onaylamak
  -- sürüm 1'den sonra darboğaz olur.
  otomatik_onay  boolean not null default false,
  olusturuldu    timestamptz not null default now(),
  guncellendi    timestamptz not null default now()
);

-- ────────────────────────── PROJE ──────────────────────────

create table proje (
  id                 bigserial primary key,
  slug               citext unique not null,
  ad                 text not null,
  firma_id           bigint not null references firma,
  il                 text not null,
  ilce               text not null,
  mahalle            text,
  konum              geography(Point, 4326),
  tip                text not null
                       check (tip in ('konut','villa','ofis','rezidans',
                                      'kentsel_donusum','toki','emlak_konut')),
  durum              text not null default 'taslak'
                       check (durum in ('taslak','lansman','satista',
                                        'teslim_edildi','arsiv')),
  teslim_ceyrek      text,          -- '2027Q1'
  teslim_tarihi      date,          -- gerçekleşen; arşive alma bunu kullanır
  toplam_konut       int,
  ticari_birim       int,
  blok_sayisi        int,
  kat_sayisi         int,
  tavan_yuksekligi   numeric(3,2),
  aidat              numeric(12,2),
  pesinat_orani      numeric(4,1),
  vade_ay            int,
  faizsiz            boolean,
  santiye_yuzde      int check (santiye_yuzde between 0 and 100),
  -- 60+ filtre ölçütü tek sütunda; her biri ayrı kolon olsaydı
  -- şema her yeni filtrede değişirdi
  ozellikler         jsonb not null default '{}',
  aciklama           text,
  veri_skoru         int not null default 0,
  -- 90 gün tazelik kuralının dayanağı
  fiyat_teyit_tarihi date,
  fiyat_teyit_durumu text not null default 'teyitli'
                       check (fiyat_teyit_durumu in ('teyitli','teyit_edilmedi')),
  one_cikarma        int,           -- sponsorlu slot; sıralamayı belirlemez
  goruntulenme       bigint not null default 0,
  yayinda            boolean not null default false,
  olusturuldu        timestamptz not null default now(),
  guncellendi        timestamptz not null default now()
);

-- unaccent() STABLE'dır, IMMUTABLE değil: sözlük yapılandırmasına bağlı
-- olduğu için Postgres onu indeks ifadesinde kabul etmez. Sözlüğü açıkça
-- vererek IMMUTABLE bir sarmalayıcı tanımlıyoruz.
--
-- SORGULARDA DA BU FONKSİYON KULLANILMALI — düz unaccent() çağıran bir
-- sorgu indeksi kullanamaz ve tablo taramasına düşer.
--
-- UZANTI ŞEMASI SABİT YAZILAMAZ. Düz Postgres'te unaccent public'e kurulur,
-- Supabase'de panelden açıldığında "extensions" şemasına gider. Şema sabit
-- yazılırsa göç ortamlardan birinde patlar. Bu yüzden şema çalışma anında
-- katalogdan okunup fonksiyon dinamik olarak üretiliyor.
do $kur$
declare
  sema text;
begin
  select n.nspname into sema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
   where e.extname = 'unaccent';

  if sema is null then
    raise exception 'unaccent uzantısı bulunamadı';
  end if;

  execute format(
    'create or replace function tr_unaccent(text) '
    'returns text language sql immutable strict parallel safe '
    'as $govde$ select %I.unaccent(%L::regdictionary, $1) $govde$',
    sema, sema || '.unaccent'
  );
end
$kur$;

-- Coğrafi arama: haritada alan çizme, "metroya 10 dk"
create index proje_konum_ix   on proje using gist (konum);
-- 60 özellik filtresi için tek indeks
create index proje_ozellik_ix on proje using gin (ozellikler jsonb_path_ops);
-- Ad araması: "bagdat" → "Bağdat Yakası"
create index proje_ad_ix      on proje using gin (tr_unaccent(ad) gin_trgm_ops);
-- Liste sorgularının ana indeksi
create index proje_liste_ix   on proje (il, ilce, durum, teslim_ceyrek) where yayinda;

-- ─────────────────────── DAİRE TİPİ ───────────────────────

create table daire_tipi (
  id            bigserial primary key,
  proje_id      bigint not null references proje on delete cascade,
  tip           text not null,             -- '2+1'
  net_m2        numeric(6,1),
  brut_m2       numeric(6,1),
  liste_fiyati  numeric(14,2),
  -- Hesaplanan alan: elle girilemez. Formül tek olmazsa
  -- firmalar arası karşılaştırma mümkün olmaz.
  m2_birim      numeric generated always as
                  (liste_fiyati / nullif(net_m2, 0)) stored,
  toplam_adet   int,
  kalan_adet    int,
  kat_plani_id  bigint,
  unique (proje_id, tip)
);

create index daire_proje_ix on daire_tipi (proje_id);
create index daire_fiyat_ix on daire_tipi (liste_fiyati) where liste_fiyati is not null;

-- ─────────────────────── MEDYA ───────────────────────

create table medya (
  id         bigserial primary key,
  proje_id   bigint references proje on delete cascade,
  firma_id   bigint references firma on delete cascade,
  tur        text not null check (tur in ('gorsel','kat_plani','vaziyet',
                                          'santiye','video','tur360','belge')),
  key        text not null,        -- R2 anahtarı; dosyanın kendisi DB'de tutulmaz
  alt        text,
  sira       int not null default 0,
  -- Alt metni veya varyantı olmayan dosya yayınlanamaz
  varyant_hazir boolean not null default false,
  olusturuldu   timestamptz not null default now()
);

create index medya_proje_ix on medya (proje_id, tur, sira);

alter table daire_tipi
  add constraint daire_kat_plani_fk foreign key (kat_plani_id) references medya;

-- ─────────────── TESLİM KAYDI · karnenin %40'ı ───────────────

create table teslim_kaydi (
  id                bigserial primary key,
  firma_id          bigint not null references firma,
  proje_id          bigint references proje,
  ilan_edilen       text not null,     -- '2025Q2'
  gerceklesen       text,
  gecikme_ay        numeric(4,1),
  -- Kaynak ZORUNLU. Kaynaksız satır karneye dahil edilmez;
  -- itiraz durumunda tek dayanak budur.
  kaynak            text not null
                      check (kaynak in ('ilan_arsivi','haber','firma_teyidi')),
  kaynak_url        text,
  durum             text not null default 'teyitli'
                      check (durum in ('teyitli','itiraz','dogrulanmadi')),
  itiraz_aciklama   text,
  itiraz_son_tarih  date,
  olusturuldu       timestamptz not null default now()
);

create index teslim_firma_ix on teslim_kaydi (firma_id);

-- ───────────── FİYAT ARŞİVİ · append-only ─────────────

create table fiyat_kaydi (
  id             bigserial primary key,
  daire_tipi_id  bigint not null references daire_tipi,
  fiyat          numeric(14,2) not null,
  kalan_adet     int,
  kaynak         text not null check (kaynak in ('panel','yonetim','duzeltme')),
  kaydeden       text not null,
  duzeltilen_id  bigint references fiyat_kaydi,   -- düzeltme YENİ kayıttır
  kaydedildi     timestamptz not null default now()
);

create index fiyat_tip_ix on fiyat_kaydi (daire_tipi_id, kaydedildi desc);

-- ───────────── DENETİM GÜNLÜĞÜ · append-only ─────────────

create table denetim_gunlugu (
  id          bigserial primary key,
  kim         text not null,
  islem       text not null,
  varlik      text not null,
  varlik_id   bigint,
  alan        text,
  eski_deger  text,
  yeni_deger  text,
  ip          inet,
  zaman       timestamptz not null default now()
);

create index denetim_zaman_ix  on denetim_gunlugu (zaman desc);
create index denetim_varlik_ix on denetim_gunlugu (varlik, varlik_id);

-- ───────────── ONAY KUYRUĞU ─────────────

create table onay_kaydi (
  id          bigserial primary key,
  firma_id    bigint not null references firma,
  varlik      text not null,
  varlik_id   bigint not null,
  degisiklik  jsonb not null,              -- {alan: {eski, yeni}}
  -- %20'den büyük fiyat değişimi, stok ARTIŞI, bölge ortalamasından
  -- sapma ve ilk yayın başvurusu otomatik işaretlenir
  isaretler   text[] not null default '{}',
  durum       text not null default 'bekliyor'
                check (durum in ('bekliyor','onaylandi','reddedildi')),
  gerekce     text,                        -- ret gerekçesi zorunlu
  gonderildi  timestamptz not null default now(),
  karar_veren text,
  karar_zaman timestamptz
);

create index onay_bekleyen_ix on onay_kaydi (gonderildi) where durum = 'bekliyor';

-- ───────────── TALEP ve KVKK ─────────────

create table talep (
  id            bigserial primary key,
  proje_id      bigint references proje,
  firma_id      bigint references firma,
  ad            text not null,
  telefon       text not null,
  daire_tipi    text,
  butce_min     numeric(14,2),
  butce_max     numeric(14,2),
  tasinma       text,
  kaynak_sayfa  text,
  site_yolu     jsonb,                     -- kullanıcının site içindeki yolu
  uyum_skoru    int,
  durum         text not null default 'yeni'
                  check (durum in ('yeni','iletildi','acildi','randevu','satis','kayip','spam')),
  acilma_zamani timestamptz,               -- yanıt süresi ölçümü buradan
  olusturuldu   timestamptz not null default now()
);

-- KVKK madde 9: yurt dışına aktarım için açık rıza kaydı.
-- Supabase Frankfurt'ta olduğu için bu tablo şart. Sonradan eklemek çok zor.
create table kvkk_onay (
  id            bigserial primary key,
  talep_id      bigint references talep,
  metin_surumu  text not null,             -- 'v1.2 · 2026-08-01'
  metin_hash    text not null,
  onay_zamani   timestamptz not null default now(),
  ip            inet,
  user_agent    text
);

-- ───────────── BÖLGE SAYFASI ─────────────

create table bolge_sayfasi (
  id      bigserial primary key,
  il      text not null,
  ilce    text,
  mahalle text,
  metin   text,
  sss     jsonb default '[]',
  unique (il, ilce, mahalle)
);

-- ───────────── POI · konum verisi ─────────────

create table poi (
  id    bigserial primary key,
  tip   text not null check (tip in ('metro','metrobus','okul','hastane','avm','sahil')),
  ad    text not null,
  konum geography(Point, 4326) not null
);

create index poi_konum_ix on poi using gist (konum);
