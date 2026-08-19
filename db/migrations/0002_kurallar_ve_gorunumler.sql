-- ═══════════════════════════════════════════════════════════════
-- Değişmezlik kuralları, materyalize görünümler, RLS ve pg_cron
-- 0001_init.sql'den sonra çalıştırılır.
-- ═══════════════════════════════════════════════════════════════

-- ─────────── DEĞİŞMEZ TABLOLAR ───────────
--
-- Bu iki tablo silinemez. Uygulama koduna bırakmayın — bir hatalı göç
-- betiği veya yanlış DELETE arşivi götürebilir. Yetki seviyesinde
-- kapatıldığında bu mümkün olmaz.
--
-- Firma "biz o fiyatı girmedik" dediğinde, karne itirazında ve endeksin
-- güvenilirliği sorgulandığında tek dayanak bu tablolardır.

create role app_rw    nologin;   -- uygulama
create role app_admin nologin;   -- yönetim paneli

grant usage on schema public to app_rw, app_admin;

grant select, insert, update, delete on all tables in schema public to app_rw;
grant usage, select on all sequences in schema public to app_rw;

-- Fiyat arşivi: yalnızca ekleme. Düzeltme yeni kayıt olarak eklenir.
revoke update, delete on fiyat_kaydi from app_rw, app_admin;
grant insert, select on fiyat_kaydi to app_rw, app_admin;

-- Denetim günlüğü: site sahibi dahil hiçbir rol yazamaz/silemez.
revoke update, delete on denetim_gunlugu from app_rw, app_admin;
grant insert, select on denetim_gunlugu to app_rw, app_admin;

-- KVKK onay kaydı da değişmez.
revoke update, delete on kvkk_onay from app_rw, app_admin;
grant insert, select on kvkk_onay to app_rw, app_admin;

-- ─────────── MATERYALİZE GÖRÜNÜMLER ───────────
--
-- Endeks, karne ve faset sayaçları ANLIK HESAPLANMAZ.
-- Sorgu sayısını düşürmek bu mimaride en önemli optimizasyon.

create materialized view mv_ilce_m2 as
select
  p.il,
  p.ilce,
  round(sum(d.m2_birim * d.toplam_adet) / nullif(sum(d.toplam_adet), 0)) as m2_fiyat,
  count(distinct p.id)::int as proje_sayisi,
  sum(d.toplam_adet)::int   as daire_sayisi,
  null::numeric             as yillik_degisim   -- fiyat_kaydi arşivi dolunca hesaplanır
from proje p
join daire_tipi d on d.proje_id = p.id
where p.yayinda
  and p.durum in ('lansman', 'satista')
  and d.liste_fiyati is not null
  -- Bayat fiyat endekse girmez
  and p.fiyat_teyit_tarihi > current_date - interval '90 days'
group by p.il, p.ilce
-- Eşik altı bölge yayınlanmaz: 5 projeden az ilçe için endeks anlamsız
having count(distinct p.id) >= 5;

create unique index mv_ilce_m2_ix on mv_ilce_m2 (il, ilce);

create materialized view mv_firma_karne as
select
  f.id as firma_id,
  avg(t.gecikme_ay) filter (where t.durum = 'teyitli')          as ort_gecikme,
  (count(*) filter (where t.gecikme_ay = 0 and t.durum = 'teyitli')::numeric
    / nullif(count(*) filter (where t.durum = 'teyitli'), 0))   as zamaninda_orani,
  count(*) filter (where t.gerceklesen is not null)::int        as tamamlanan,
  avg(p.veri_skoru) filter (where p.yayinda)                    as veri_skoru,
  -- Eşik: 2 tamamlanmış projeden azı olan firmaya not verilmez.
  -- Yetersiz veriyle not vermek, düşük not vermekten daha yanıltıcıdır.
  case
    when count(*) filter (where t.gerceklesen is not null) < 2 then null
    when avg(t.gecikme_ay) <= 1.0 then 'A+'
    when avg(t.gecikme_ay) <= 2.0 then 'A'
    when avg(t.gecikme_ay) <= 3.5 then 'B'
    when avg(t.gecikme_ay) <= 5.0 then 'C'
    else 'D'
  end as sicil
from firma f
left join teslim_kaydi t on t.firma_id = f.id
left join proje p        on p.firma_id = f.id
group by f.id;

create unique index mv_firma_karne_ix on mv_firma_karne (firma_id);

-- ─────────── RLS ───────────
--
-- İKİNCİ savunma katmanı. Sunucu bileşenleri servis rolüyle bağlandığında
-- RLS devreye girmez; asıl yetki kontrolü uygulamadadır. RLS, bir uygulama
-- hatası veya yanlış yapılandırılmış istemci çağrısında veriyi korur.

alter table proje enable row level security;
alter table talep enable row level security;

create policy firma_kendi_projesini_gorur on proje
  for select using (
    firma_id = (auth.jwt() ->> 'firma_id')::bigint
    or (auth.jwt() ->> 'rol') in ('admin', 'editor')
    or yayinda
  );

create policy firma_kendi_projesini_duzenler on proje
  for update using (
    firma_id = (auth.jwt() ->> 'firma_id')::bigint
  ) with check (
    -- Firma YAYINA ALAMAZ. Değişiklik onay kuyruğuna düşer.
    yayinda = false
  );

create policy talep_firma on talep
  for select using (
    firma_id = (auth.jwt() ->> 'firma_id')::bigint
    or (auth.jwt() ->> 'rol') in ('admin', 'editor')
  );

-- ─────────── pg_cron ───────────
--
-- Ağır veritabanı işleri Vercel fonksiyonlarında DEĞİL burada çalışır.
-- Fonksiyon süre sınırı, soğuk başlatma ve ağ hatası sorunları
-- bir anda ortadan kalkar.

select cron.schedule('mv-yenile', '0 2 * * *', $$
  refresh materialized view concurrently mv_ilce_m2;
  refresh materialized view concurrently mv_firma_karne;
$$);

-- 90 gün tazelik kuralı
select cron.schedule('tazelik', '0 * * * *', $$
  update proje
  set fiyat_teyit_durumu = 'teyit_edilmedi'
  where fiyat_teyit_tarihi < current_date - interval '90 days'
    and fiyat_teyit_durumu <> 'teyit_edilmedi';
$$);

-- Teslim edilen proje SİLİNMEZ, arşive geçer.
-- Fiyat geçmişi kalır; endeksin geçmiş serisi bu arşivde birikir.
select cron.schedule('arsivle', '30 2 * * *', $$
  update proje
  set durum = 'arsiv'
  where durum = 'teslim_edildi'
    and teslim_tarihi < current_date - interval '3 months';
$$);
