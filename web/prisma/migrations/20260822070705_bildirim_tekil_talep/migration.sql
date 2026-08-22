-- Aynı kişiye, aynı talep için, aynı kanaldan, aynı tip bildirim iki kez
-- gitmesin. `kuyrukla()` bu kısıtın adına bakıp ikinci kaydı sessizce
-- yutuyor (bkz. lib/bildirim/index.ts).
--
-- `alici` kısıtın içinde: TALEP_EKIP aynı talep için birden çok ekip
-- adresine gidiyor.
--
-- `talepId` NULL olan satırlar kısıta girmiyor — PostgreSQL'de NULL'lar
-- birbirinden farklı sayılıyor ve o bildirimlerin mükerrerlik kuralı yok.
CREATE UNIQUE INDEX "bildirim_tekil_talep"
  ON "bildirim" ("talepId", "kanal", "tip", "alici");
