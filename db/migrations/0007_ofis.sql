-- ============================================================
-- 0007 — 'ofis' tipini geri getir
--
-- 0001 kısıtında 'ofis' VARDI. 0006 yeni villa segmentlerini
-- eklerken kısıtı baştan yazdı ve 'ofis'i listeye almayı atladı:
--
--   0001: konut villa OFIS rezidans kentsel_donusum toki emlak_konut
--   0006: konut villa mustakil yali rezidans kentsel_donusum toki
--         emlak_konut          ^-- düştü
--
-- check kısıtları ALTER ile genişletilemediği için tamamen yeniden
-- yazılıyor; bir öğeyi listeden düşürmek sessiz bir kayıp oluyor.
--
-- Sonuç: uygulama katmanı ofisi TANIYORDU — gezinmede "Satılık Ofis",
-- SEGMENT_ADLARI'nda karşılığı, /ara?tip=ofis süzgeci — ama tabloya
-- tek bir ofis projesi yazılamıyordu. Arama boş dönüyor, hata
-- görünmüyordu.
-- ============================================================

alter table proje drop constraint if exists proje_tip_check;
alter table proje add constraint proje_tip_check check (
  tip in ('konut','villa','mustakil','yali','ofis','rezidans',
          'kentsel_donusum','toki','emlak_konut')
);
