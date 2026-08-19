# Kurulum — Supabase, R2 ve Vercel

Bu belge tek seferlik kurulum içindir. Sırayı bozmayın: Vercel'i
veritabanı hazır olmadan bağlarsanız ilk dağıtım hata verir.

> **Parolaları ve anahtarları sohbete yapıştırmayın.** Hepsi doğrudan
> `.env.local` dosyasına ve Vercel panelindeki ortam değişkenlerine
> girilir. Bu depoda `.env.local` `.gitignore` içindedir.

---

## 1. Supabase projesi

Supabase panelinde yeni proje açın.

| Alan | Değer | Neden |
|---|---|---|
| Region | **Central EU (Frankfurt) · `eu-central-1`** | Bu mimarinin tek kritik ayarı. Vercel `fra1`'de çalışacak; bölgeler eşleşmezse her sorgu ~90 ms sürer. |
| Postgres sürümü | 16 veya üzeri | Şema `generated always as stored` ve `json_agg ... order by` kullanıyor. |
| Database password | Güçlü, kaydedin | Bağlantı dizesinde geçecek, sonradan görüntülenemez. |

Bölge sonradan değiştirilemez. Yanlış seçilirse proje silinip yeniden
açılır — bu yüzden ilk adım budur.

## 2. Uzantılar

**Database → Extensions** altında şunları açın:

- `postgis` — konum, mesafe, "metroya 8 dk"
- `pg_trgm` — bulanık ad araması
- `unaccent` — "bagdat" → "Bağdat"
- `citext` — slug karşılaştırması
- `pg_cron` — materyalize görünüm tazelemesi

`pg_cron` **açılmazsa göç yine de geçer** (koşullu blokla korunuyor) ama
`mv_ilce_m2`, `mv_firma_karne` ve `mv_endeks_donem` hiç tazelenmez:
ilçe m² fiyatları, firma karneleri ve fiyat endeksi ilk hesaplandıkları
günde donar. Açmayı unutmayın.

## 3. Bağlantı dizeleri

**Project Settings → Database → Connection string** altında iki dize var.
İkisi de gerekli ve **farklı işler için**:

| Değişken | Port | Kullanım |
|---|---|---|
| `DATABASE_URL` | **6543** (Transaction pooler) | Uygulama. Sunucusuz fonksiyonlar için tek doğru seçenek. |
| `DIRECT_URL` | **5432** (Session pooler) | Göçler, `create index concurrently`, `pg_dump`. |

Transaction modunda hazırlanmış ifadeler (prepared statements)
çalışmadığı için `lib/db.ts` sürücüyü `prepare: false` ile açar. Portları
karıştırırsanız uygulama ilk sorguda hata verir.

Depo kökünde `.env.local` oluşturun — `.env.example` dosyasını kopyalayıp
doldurmak en kolayı:

```bash
cp .env.example .env.local
```

Doldurulacaklar:

- `DATABASE_URL`, `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **asla `NEXT_PUBLIC_` ile başlamaz.**
  Bu anahtar RLS'i tümüyle atlar; tarayıcıya sızarsa veritabanının
  tamamı herkese açılır.
- `CRON_SECRET`, `REVALIDATE_SECRET` — rastgele üretin:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Şemayı kurun

```bash
npm run kurulum
```

Bu sırayla çalışır: göçler → örnek veri → 28 doğrulama kontrolü.
Sadece şema isteniyorsa `npm run db:migrate` yeterli; örnek veriyi
**gerçek veriyi yüklemeden önce** temizlemeyi unutmayın.

Ardından gecikmeyi ölçün:

```bash
npm run db:gecikme
```

Yerelden 40–80 ms normaldir (Türkiye → Frankfurt). Asıl ölçüm Vercel
üzerinden yapılır; ana sayfadaki rozet onu gösterir ve **3 ms altı**
olmalıdır.

## 5. Cloudflare R2

1. R2 → bucket oluşturun: `konutprojeleri`
2. **Settings → Public access → Connect a domain**: `cdn.konutprojeleri.com`
3. R2 API token üretin (Object Read & Write)
4. `.env.local` içine: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `NEXT_PUBLIC_CDN_URL`

Görseller **Vercel'in resim optimizasyonundan geçmez** —
`next.config.ts` özel bir yükleyici kullanır. 20 GB medya Vercel'in
dönüşüm kotasını dakikalar içinde tüketirdi; R2'de çıkış trafiği zaten
ücretsiz.

Harita karoları için `NEXT_PUBLIC_HARITA_KARO` de doldurulmalı.
Üretimde OSM'in genel sunucusu kullanılamaz (kullanım politikası
yasaklıyor); en ucuz yol Protomaps PMTiles dosyasını aynı R2 kovasına
koymaktır.

## 6. Vercel

1. **Add New → Project → Import Git Repository** → `mrcelix/konutprojeleri`
2. Framework: Next.js (otomatik algılanır), kök dizin varsayılan
3. **Environment Variables**: `.env.local` içindeki tüm satırları
   Production ve Preview için girin. `DIRECT_URL` yalnızca göçler için
   gerekli; Vercel'de tanımlamak zorunda değilsiniz.
4. Deploy

Bölge ayarı `vercel.json` içinde `"regions": ["fra1"]` olarak sabit —
panelden değiştirmeyin.

> **Hobby planındaysanız:** Vercel en fazla **2 cron** işine izin verir,
> `vercel.json` içinde **3** tanımlı. Dağıtım hata verirse
> `yonlendirme-testi` girdisini silin ya da Pro'ya geçin.

## 7. Alan adı

1. Vercel → Project → **Settings → Domains** → `konutprojeleri.com` ekleyin
2. DNS kayıtlarını Vercel'in gösterdiği değerlerle güncelleyin
3. `NEXT_PUBLIC_SITE_URL` değerini `https://konutprojeleri.com` yapın

Eski sitedeki adresler için yönlendirme haritası `next.config.ts` içinde;
toplu harita hazır olduğunda middleware'e taşınacak. Geçiş günü **eski
siteyi hemen kapatmayın** — yönlendirmelerin çalıştığını doğrulayana
kadar açık kalsın.

## 8. Dağıtım sonrası kontrol listesi

- [ ] Ana sayfadaki gecikme rozeti **3 ms altı** gösteriyor
- [ ] `/istanbul-konut-projeleri` sonuç veriyor
- [ ] Bir proje detayında fiyat, kat planı ve taksit hesabı doğru
- [ ] `/fiyat-endeksi` seri çiziyor (pg_cron çalıştıysa)
- [ ] `/teslim-takvimi` ve `/butce` sonuç veriyor
- [ ] `/karsilastir` sepetle çalışıyor
- [ ] Talep formu gönderiliyor ve `talep` + `kvkk_onay` satırları oluşuyor
- [ ] `/sitemap.xml` proje adreslerini içeriyor
- [ ] Cron uçları `CRON_SECRET` olmadan **401** dönüyor

## 9. Kurulum öncesi bilinmesi gerekenler

**KVKK metni taslaktır.** `lib/kvkk.ts` içindeki metin bir avukat
tarafından onaylanmadan yayına alınmamalıdır. Yurt dışına aktarım
açık rızası metin sürümü ve özetiyle birlikte kaydediliyor; metin
değişirse sürüm numarası da değişmelidir.

**Fiyat endeksi liste fiyatlarına dayanır**, tapu değerlerine değil.
Sayfadaki metodoloji kutusu bunu yazıyor; kaldırmayın.

**Üç tablo salt-eklemedir** (`fiyat_kaydi`, `denetim_gunlugu`,
`kvkk_onay`). `update` ve `delete` yetkileri veritabanı seviyesinde geri
alınmıştır. Bir kayıt yanlışsa düzeltme yeni satırla yapılır.

**Örnek veri gerçek değildir.** Firma adları ve projeler gerçek
şirketlere benziyor olabilir; canlıya geçmeden `npm run db:seed` ile
gelen her şey silinmelidir.
