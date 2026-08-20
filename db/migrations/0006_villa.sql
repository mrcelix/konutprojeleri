-- ═══════════════════════════════════════════════════════════════
-- Lüks konut ve villa segmenti
--
-- Site villa ve müstakil satışına odaklandı; şema apartman
-- varsayımıyla kurulmuştu. Villa alıcısının ilk sorduğu iki şey
-- şemada yoktu: ARSA BÜYÜKLÜĞÜ ve DENİZE MESAFE.
--
-- Arsa daire tipinde, denize mesafe projede: aynı sitede 640 m² ve
-- 1.100 m² arsalı iki villa tipi olabilir ama ikisi de denize aynı
-- uzaklıktadır.
-- ═══════════════════════════════════════════════════════════════

alter table daire_tipi
  add column if not exists arsa_m2 numeric(8,1);

comment on column daire_tipi.arsa_m2 is
  'Villa/müstakil için parsel alanı. Apartman dairesinde null kalır.';

alter table proje
  add column if not exists denize_mesafe_m int,
  add column if not exists havuz_tipi text
    check (havuz_tipi in ('ozel','ortak','yok'));

comment on column proje.denize_mesafe_m is
  'Kuş uçuşu metre. Konum ve sahil POI''sinden de hesaplanabilirdi ama
   firmanın beyanı pazarlama iddiasıdır ve ayrı tutulur; çelişki
   çıkarsa yönetim paneli işaretler.';

-- Yeni segmentler. Kısıt yeniden kurulmak zorunda: check kısıtları
-- ALTER ile genişletilemez.
alter table proje drop constraint if exists proje_tip_check;
alter table proje add constraint proje_tip_check check (
  tip in ('konut','villa','mustakil','yali','rezidans',
          'kentsel_donusum','toki','emlak_konut')
);

-- Sahil bölgeleri ilçe değil, pazarlama bölgesi: Yalıkavak Bodrum'un
-- mahallesi ama villa alıcısı "Bodrum" değil "Yalıkavak" arar.
-- Ayrı tablo, çünkü bir bölge birden çok ilçeye yayılabilir
-- (Kaş & Kalkan) ve sıralaması elle yönetilir.
create table if not exists sahil_bolgesi (
  id       bigserial primary key,
  slug     citext unique not null,
  ad       text not null,
  il       text not null,
  ilceler  text[] not null default '{}',
  sira     int not null default 0,
  yayinda  boolean not null default true
);

create index if not exists sahil_bolgesi_ix on sahil_bolgesi (sira) where yayinda;

do $y$
begin
  if exists (select 1 from pg_roles where rolname = 'app_rw') then
    grant select on sahil_bolgesi to app_rw;
  end if;
  if exists (select 1 from pg_roles where rolname = 'app_admin') then
    grant select, insert, update, delete on sahil_bolgesi to app_admin;
  end if;
end
$y$;
