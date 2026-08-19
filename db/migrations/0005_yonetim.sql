-- ═══════════════════════════════════════════════════════════════
-- Yönetim paneli · kullanıcılar ve roller
--
-- Uygulama veritabanına servis rolüyle bağlanır; RLS o yolda devreye
-- girmez. Bu yüzden ASIL YETKİ KONTROLÜ UYGULAMADADIR ve dayanağı bu
-- tablodur. RLS politikaları (0002) ikinci savunma katmanı olarak
-- kalır — bir uygulama hatasında veriyi hâlâ korurlar.
--
-- Kimlik Supabase Auth'ta, yetki burada. İkisini ayırmak bilinçli:
-- Auth sağlayıcısı değişse bile rol modeli yerinde kalır.
-- ═══════════════════════════════════════════════════════════════

create table if not exists kullanici (
  -- auth.users.id ile aynı UUID. Yabancı anahtar aşağıda koşullu
  -- kuruluyor: auth şeması yalnızca Supabase'de var.
  id          uuid primary key,
  eposta      citext not null unique,
  ad          text,
  rol         text not null default 'firma'
                check (rol in ('admin', 'editor', 'firma')),
  -- Yalnızca rol = 'firma' için anlamlı; admin/editor için null.
  firma_id    bigint references firma on delete cascade,
  aktif       boolean not null default true,
  son_giris   timestamptz,
  olusturuldu timestamptz not null default now(),

  -- Firma kullanıcısı bir firmaya bağlı OLMAK ZORUNDA; admin bağlı
  -- OLMAMALI. Aksi halde yetki sorgusu sessizce yanlış cevap verir.
  constraint kullanici_rol_firma check (
    (rol = 'firma' and firma_id is not null)
    or (rol in ('admin', 'editor') and firma_id is null)
  )
);

create index if not exists kullanici_firma_ix on kullanici (firma_id) where firma_id is not null;

do $auth$
begin
  if to_regclass('auth.users') is not null then
    begin
      alter table kullanici
        add constraint kullanici_auth_fk
        foreign key (id) references auth.users (id) on delete cascade;
    exception when duplicate_object then
      null;
    end;
  else
    raise notice 'auth.users yok — kullanici.id yabanci anahtari atlandi (Supabase disi ortam)';
  end if;
end
$auth$;

-- ─────────────── Oturum günlüğü ───────────────
--
-- Panelde kim ne zaman giriş yaptı. Denetim günlüğünden ayrı tutuluyor:
-- o tablo salt-ekleme ve içerik değişikliklerine ayrılmış durumda,
-- giriş kayıtları onu gürültüyle doldurmamalı.
create table if not exists giris_kaydi (
  id       bigserial primary key,
  eposta   citext not null,
  basarili boolean not null,
  ip       inet,
  zaman    timestamptz not null default now()
);

create index if not exists giris_kaydi_ix on giris_kaydi (eposta, zaman desc);

-- Başarısız giriş denemeleri de kanıt: hesap kilitleme ve kötüye
-- kullanım incelemesi buna dayanır, silinemez.
revoke update, delete on giris_kaydi from public;

do $y$
begin
  if exists (select 1 from pg_roles where rolname = 'app_rw') then
    grant select, insert on giris_kaydi to app_rw;
    revoke update, delete on giris_kaydi from app_rw;
    grant select, insert, update, delete on kullanici to app_rw;
  end if;
  if exists (select 1 from pg_roles where rolname = 'app_admin') then
    grant select, insert on giris_kaydi to app_admin;
    revoke update, delete on giris_kaydi from app_admin;
    grant select, insert, update, delete on kullanici to app_admin;
  end if;
end
$y$;
