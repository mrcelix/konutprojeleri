-- ═══════════════════════════════════════════════════════════════
-- m² Fiyat Endeksi
--
-- Endeksin veri kaynağı FİYAT ARŞİVİDİR (fiyat_kaydi). Arşiv append-only
-- olduğu için seri geriye dönük değiştirilemez — endeksin güvenilirliği
-- buna dayanır.
--
-- Ağır toplama; anlık hesaplanmaz, pg_cron ile yenilenir.
-- ═══════════════════════════════════════════════════════════════

create materialized view mv_endeks_donem as
with aylik as (
  -- Her daire tipi için o aydaki SON fiyat kaydı.
  -- Ay içinde birden çok güncelleme olduysa sonuncusu geçerlidir.
  select distinct on (fk.daire_tipi_id, date_trunc('month', fk.kaydedildi))
    date_trunc('month', fk.kaydedildi)::date as donem,
    fk.daire_tipi_id,
    fk.fiyat
  from fiyat_kaydi fk
  order by fk.daire_tipi_id, date_trunc('month', fk.kaydedildi), fk.kaydedildi desc
),
zengin as (
  select
    a.donem,
    p.il,
    p.id as proje_id,
    a.fiyat / d.net_m2 as m2,
    d.toplam_adet
  from aylik a
  join daire_tipi d on d.id = a.daire_tipi_id
  join proje p on p.id = d.proje_id
  where d.net_m2 > 0
    and d.toplam_adet > 0
    -- Aykırı değerler endekse girmez. Bebek'te 486.000 ₺/m² bir rezidans
    -- ortalamayı bozar; sınır dışı kayıtlar yayınlanan notta sayı olarak belirtilir.
    and (a.fiyat / d.net_m2) between 5000 and 400000
)
-- İl bazında
select
  donem,
  il,
  round(sum(m2 * toplam_adet) / nullif(sum(toplam_adet), 0)) as m2_fiyat,
  count(distinct proje_id)::int as proje_sayisi,
  sum(toplam_adet)::int          as daire_sayisi
from zengin
group by donem, il

union all

-- Türkiye geneli (il = null)
select
  donem,
  null::text,
  round(sum(m2 * toplam_adet) / nullif(sum(toplam_adet), 0)),
  count(distinct proje_id)::int,
  sum(toplam_adet)::int
from zengin
group by donem;

-- concurrently yenileme için benzersiz indeks şart; il null olabildiği için ifade indeksi
create unique index mv_endeks_donem_ix
  on mv_endeks_donem (donem, coalesce(il, '__TR__'));

create index mv_endeks_donem_il_ix on mv_endeks_donem (il, donem desc);

-- Her pazartesi 04:00'te yeniden hesaplanır.
-- Vercel fonksiyonunda değil burada: refresh süre sınırını aşabilir.
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('endeks-yenile', '0 4 * * 1', $job$
  refresh materialized view concurrently mv_endeks_donem;
$job$);
  end if;
end
$do$;
