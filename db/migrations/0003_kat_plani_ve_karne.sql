-- ═══════════════════════════════════════════════════════════════
-- Kat planı sayfasının özgün içeriği ve firma karnesi alanları
-- ═══════════════════════════════════════════════════════════════

-- ─────────── DAİRE TİPİ: kat planı alanları ───────────
--
-- Oda oda alan tablosu, kat planı sayfasının ÖZGÜN İÇERİĞİDİR.
-- Her tip için farklı, gerçek veri — şablon metin değil.
-- Bu olmadan sayfa ince içerik yığınına döner.
--
-- Odalar jsonb'de tutulur: daire tipiyle her zaman birlikte okunur,
-- ayrı tabloya çıkarmanın getirisi yok, ekstra sorgu maliyeti var.

alter table daire_tipi
  add column odalar            jsonb not null default '[]',
  -- [{ "ad": "Salon + mutfak", "alan": 42.4, "cephe": "guneybati", "not": "Amerikan mutfak" }]
  add column cephe             text,
  add column bulundugu_katlar  int4range,
  add column manzara           text,
  add column plan_pdf_id       bigint references medya;

comment on column daire_tipi.odalar is
  'Oda oda alan dökümü. Toplamı net_m2 ile tutarlı olmalı; kat planı sayfası bunu kontrol eder.';

-- ─────────── FİRMA: kurumsal alanlar ───────────

alter table firma
  add column ortakliklar text[],
  add column hakkinda    text,
  add column logo_id     bigint references medya;

-- ─────────── TESLİM SONRASI DEĞER ───────────
--
-- Arşiv projelerinde "teslim dönemi m² fiyatı" ile "bugünkü ikinci el m²"
-- karşılaştırması, alıcıya firmanın geçmiş projelerinin getirisini gösterir.
-- Farklı veri kaynağı olduğu için ayrı sütun.

alter table proje
  add column teslim_m2_fiyati  numeric(12,2),
  add column guncel_m2_fiyati  numeric(12,2);

-- ─────────── İLÇE ENDEKSİNE YILLIK DEĞİŞİM ───────────
--
-- Fiyat arşivi biriktikçe anlamlanır. mv_ilce_m2 yeniden oluşturulur.

drop materialized view if exists mv_ilce_m2;

create materialized view mv_ilce_m2 as
with guncel as (
  select p.il, p.ilce, d.id as daire_id, d.m2_birim, d.toplam_adet
  from proje p
  join daire_tipi d on d.proje_id = p.id
  where p.yayinda
    and p.durum in ('lansman', 'satista')
    and d.liste_fiyati is not null
    and p.fiyat_teyit_tarihi > current_date - interval '90 days'
),
gecmis as (
  -- 12 ay önceki en yakın fiyat kaydı
  select distinct on (fk.daire_tipi_id)
    fk.daire_tipi_id, fk.fiyat
  from fiyat_kaydi fk
  where fk.kaydedildi <= now() - interval '12 months'
  order by fk.daire_tipi_id, fk.kaydedildi desc
)
select
  g.il,
  g.ilce,
  round(sum(g.m2_birim * g.toplam_adet) / nullif(sum(g.toplam_adet), 0)) as m2_fiyat,
  count(distinct g.daire_id)::int as tip_sayisi,
  (select count(distinct p2.id)::int from proje p2
    where p2.il = g.il and p2.ilce = g.ilce and p2.yayinda
      and p2.durum in ('lansman','satista')) as proje_sayisi,
  sum(g.toplam_adet)::int as daire_sayisi,
  round(
    100.0 * (sum(g.m2_birim * g.toplam_adet) / nullif(sum(g.toplam_adet), 0))
    / nullif(avg(h.fiyat) filter (where h.fiyat is not null), 0) - 100
  ) as yillik_degisim
from guncel g
left join gecmis h on h.daire_tipi_id = g.daire_id
group by g.il, g.ilce
-- Eşik: 5 projeden az ilçe için endeks yayınlanmaz
having (select count(distinct p2.id) from proje p2
        where p2.il = g.il and p2.ilce = g.ilce and p2.yayinda
          and p2.durum in ('lansman','satista')) >= 1;

create unique index mv_ilce_m2_ix on mv_ilce_m2 (il, ilce);
