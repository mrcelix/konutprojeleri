# konutprojeleri.com

Next.js (App Router) · Supabase (PostgreSQL + PostGIS) · Cloudflare R2

Türkiye'nin yeni konut projelerini fiyat, kat planı, ödeme planı ve teslim
bilgisiyle listeleyen portal. Bu depo yeniden yazımın iskeletidir.

---

## Hızlı başlangıç

```bash
npm install
cp .env.example .env.local   # Supabase ve R2 bilgilerini doldurun
npm run dev
```

Ana sayfa açıldığında **bölge doğrulaması** görünür. Beklenen değer **3 ms altı**.
Üstündeyse Vercel bölgesi `fra1` ve Supabase bölgesi `eu-central-1` değildir —
düzeltmeden devam etmeyin, bu mimarinin tek kritik yapılandırması budur.

### Veritabanı

```bash
# DIRECT_URL (port 5432, session mode) üzerinden — 6543 DDL için kullanılmaz
psql "$DIRECT_URL" -f db/migrations/0001_init.sql
psql "$DIRECT_URL" -f db/migrations/0002_kurallar_ve_gorunumler.sql
```

---

## Mimarinin üç kuralı

**1. Bölge sabitlenir.** `vercel.json` içindeki `"regions": ["fra1"]` satırı
silinirse fonksiyonlar ABD'de çalışır ve her sorgu ~90 ms sürer.

**2. `prepare: false` kapatılmaz.** Supavisor transaction modunda (port 6543)
sunucu tarafı prepared statement çalışmaz. Ayar kaldırılırsa sorgular yük
altında rastgele hata verir — testte görünmez, canlıda patlar. Bkz. `lib/db.ts`.

**3. Yenileme hedeflidir.** Bir proje onaylandığında yalnızca ilgili etiketler
temizlenir (`lib/cache-tags.ts`). Geniş kapsamlı `revalidatePath('/', 'layout')`
5.000 sayfayı geçersiz kılar ve ISR'ın faydasını sıfırlar.

---

## Dizin yapısı

```
app/
  globals.css                    tasarım token'ları (açık + koyu tema)
  components.css                 bileşen katmanı · kp-{bileşen} / is-{durum}
  [il]/                          /istanbul-konut-projeleri
  [il]/[ilce]/                   /istanbul/kadikoy-konut-projeleri
  [il]/[ilce]/[slug]/            proje detay VEYA liste (bkz. lib/routing.ts)
  [il]/[ilce]/[slug]/[plan]/     /…/2-1-kat-plani
  firmalar/[slug]/               firma karnesi
  teslim-takvimi/                zaman ekseni · çeyrek bazlı teslim takvimi
  butce/                         ödeme kapasitesi ekseni · senetli plan eşleşmesi
  fiyat-endeksi/                 m² fiyat endeksi
  api/onay/                      onay kuyruğu → etiketli ISR yenilemesi
  api/cron/                      Vercel Cron uçları
lib/
  db.ts                          Supavisor bağlantısı
  routing.ts                     URL çözümleme (proje / liste ayrımı)
  format.ts                      veri gösterim kuralları
  cache-tags.ts                  ISR etiketleri
  queries/                       SQL — tek sorguda toplama esas
components/
  ui/                            Pill, Chip, Button…
db/migrations/                   şema, kurallar, materyalize görünümler
mockuplar/                       tasarım belgeleri (HTML)
```

---

## Veri kuralları

Bunlar tasarım tercihi değil, denetimde bulunan somut hataların tekrarını
önleyen maddeler.

- **Veri yoksa alan basılmaz.** `NULL`, `0`, `-`, "Belirtilmemiş" hiçbir koşulda
  render edilmez. `lib/format.ts` bu durumlarda `null` döner.
- **Fiyatı olmayan proje listeden düşmez**, "Fiyat isteyin" olarak görünür ve
  fiyat filtresi uygulandığında elenir.
- **Başlıklardaki yıl değişkenden gelir.** Sabit yazılmaz — eski sitedeki
  "2019 Teslim" hatası buradan doğmuştu.
- **`m2_birim` hesaplanan sütundur**, elle girilemez. Formül tek olmazsa
  firmalar karşılaştırılamaz.
- **`fiyat_kaydi` ve `denetim_gunlugu` silinemez.** Yetki seviyesinde
  kapatılmıştır; düzeltme yeni kayıt olarak eklenir.
- **Firma yayına alamaz.** Panelden gelen değişiklik `onay_kaydi` tablosuna
  düşer, editör onaylayınca yayınlanır.

---

## Dağıtım

Vercel'in **Git entegrasyonu** kullanılır: `main`'e push → otomatik dağıtım.
CLI'dan elle deploy edilmez, böylece yayındaki sürüm her zaman depodaki
commit'e karşılık gelir.

**Tek seferlik bağlama:** [vercel.com/new](https://vercel.com/new) → bu depoyu
içe aktar → framework Next.js olarak algılanır → aşağıdaki ortam
değişkenlerini gir → Deploy.

`vercel.json` içindeki `"regions": ["fra1"]` ayarı **değiştirilmemeli**;
Supabase `eu-central-1` ile aynı şehirde olması gecikmeyi 1–2 ms'de tutar.

### Ortam değişkenleri

| Değişken | Nereden | Not |
|---|---|---|
| `DATABASE_URL` | Supabase → Connect → Transaction pooler | **Port 6543** |
| `DIRECT_URL` | Supabase → Connect → Session pooler | **Port 5432**, yalnızca göç |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project settings | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API keys | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API keys | `NEXT_PUBLIC_` **olmayacak** |
| `R2_*` | Cloudflare R2 → API tokens | |
| `NEXT_PUBLIC_CDN_URL` | R2 bucket'a bağlı alan adı | Medya buradan servis edilir |
| `NEXT_PUBLIC_SITE_URL` | `https://konutprojeleri.com` | Canonical ve şema için |
| `CRON_SECRET` | Rastgele üretin | Vercel Cron uçlarını korur |
| `REVALIDATE_SECRET` | Rastgele üretin | Onay kuyruğu → ISR yenileme |

Derleme veritabanı **gerektirmez** — `lib/db.ts` bağlantıyı tembel kurar ve
sayfalar veri çekemediğinde boş durumla üretilir. Bu sayede önizleme
dağıtımları ve CI, gizli anahtar olmadan da derlenir. CI bu toleransın
bozulmadığını her push'ta doğrular.

### İlk dağıtımdan sonra

1. `DIRECT_URL` ile göçleri çalıştırın: `npm run db:migrate`
2. Ana sayfayı açın — **bölge gecikmesi 3 ms'nin altında olmalı**.
   Üstündeyse Vercel bölgesi `fra1` veya Supabase bölgesi `eu-central-1` değildir.
3. Vercel → Settings → Cron Jobs bölümünde `vercel.json`'daki üç işin
   göründüğünü doğrulayın.

## Yol haritası

| Aşama | İş | Durum |
|---|---|---|
| 1 | Bölge ve bağlantı doğrulaması | iskelet hazır |
| 2 | Şema + veri göçü (1.240 proje, 318 firma, haber arşivi) | şema hazır |
| 3 | Tasarım sistemi + arama sayfası + proje detay | başlanacak |
| 4 | Kat planı, firma, şehir, kampanya, arşiv, haber, endeks | — |
| 5 | Yönetim paneli, onay kuyruğu, firma paneli | — |

Ekran tasarımlarının tamamı `mockuplar/` altında.

---

## Not

Tasarım sistemi sürüm 1.1 (`mockuplar/tasarim-sistemi.html`,
`mockuplar/koyu-tema.html`) bu depodaki token'ların kaynağıdır. Bileşen
dosyalarında düz renk kodu bulunmaz; hepsi `globals.css` içindeki
değişkenlerden okur. Yeni bir renk veya ölçek değeri gerekiyorsa önce
tasarım sistemine eklenir.
