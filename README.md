# KonutProjeleri — Villa Kiralama Platformu

Türkiye villa kiralama pazarı analizine dayanan, görsel öncelikli ve **SEO odaklı** bir kiralama platformu.

- **Pazar analizi ve tasarım gerekçeleri:** [docs/pazar-analizi.md](docs/pazar-analizi.md)
- **SEO mimarisi ve kararlar:** [docs/seo.md](docs/seo.md)
- **Veri katmanı ve şema:** [docs/veritabani.md](docs/veritabani.md)
- **Rezervasyon akışı:** [docs/rezervasyon.md](docs/rezervasyon.md)
- **iyzico entegrasyonu:** [docs/iyzico.md](docs/iyzico.md)
- **Paneller (yönetim + ev sahibi):** [docs/panel.md](docs/panel.md)
- **Bildirimler ve zamanlanmış işler:** [docs/bildirimler.md](docs/bildirimler.md)
- **Dağıtım (Vercel, cron, DNS):** [docs/dagitim.md](docs/dagitim.md)
- **Güvenlik (2FA, engel listesi, SMS):** [docs/guvenlik.md](docs/guvenlik.md)
- **Arama ve harita:** [docs/arama.md](docs/arama.md)
- **Takvim senkronu ve hak edişler:** [docs/takvim.md](docs/takvim.md)
- **Çok dillilik ve büyüme:** [docs/cokdillilik.md](docs/cokdillilik.md)
- **İngilizce rezervasyon akışı:** [docs/ingilizce-akis.md](docs/ingilizce-akis.md)
- **İngilizce sürümün tamamlanması:** [docs/ingilizce-tamamlama.md](docs/ingilizce-tamamlama.md)
- **İngilizce takvim, yorumlar ve uzun kuyruk:** [docs/ingilizce-derinlik.md](docs/ingilizce-derinlik.md)
- **Yayına hazırlık (hız sınırı, ölçüm, yedek):** [docs/yayina-hazirlik.md](docs/yayina-hazirlik.md)
- **Erişilebilirlik:** [docs/erisilebilirlik.md](docs/erisilebilirlik.md)
- **Villa ekleme:** [docs/villa-ekleme.md](docs/villa-ekleme.md)
- **Ev sahibi kaydı:** [docs/ev-sahibi-kaydi.md](docs/ev-sahibi-kaydi.md)
- **İçerik yönetimi:** [docs/icerik-yonetimi.md](docs/icerik-yonetimi.md)
- **Villa düzenleme:** [docs/villa-duzenleme.md](docs/villa-duzenleme.md)
- **Toplu aktarma:** [docs/toplu-aktarma.md](docs/toplu-aktarma.md)
- **KVKK ve veri imhası:** [docs/kvkk.md](docs/kvkk.md)
- **Değerlendirme toplama:** [docs/yorum-toplama.md](docs/yorum-toplama.md)
- **Vergi ve mali özet:** [docs/vergi-mali.md](docs/vergi-mali.md)
- **Ev sahibi başvurusu:** [docs/ev-sahibi-basvurusu.md](docs/ev-sahibi-basvurusu.md)
- **Bildirim boşlukları:** [docs/bildirim-bosluklari.md](docs/bildirim-bosluklari.md)
- **Panelden tohumlama:** [docs/tohumlama.md](docs/tohumlama.md)
- **Fotoğraf yükleme:** [docs/fotograf-yukleme.md](docs/fotograf-yukleme.md)
- **Fotoğraf alt metni:** [docs/alt-metin.md](docs/alt-metin.md)
- **Tema:** [docs/tema.md](docs/tema.md)
- **Çeviri altyapısı:** [docs/ceviri-altyapisi.md](docs/ceviri-altyapisi.md)
- **Dil yayın kapısı:** [docs/dil-kapisi.md](docs/dil-kapisi.md)
- **Sayfa metinlerinde dil:** [docs/sayfa-metni-dili.md](docs/sayfa-metni-dili.md)
- **Trafik analitiği:** [docs/analitik.md](docs/analitik.md)

```
villa/
├── web/        → Next.js 15 + PostgreSQL uygulaması (aktif geliştirme)
├── mockup/     → onaylanan statik mockup (referans olarak duruyor)
└── docs/       → analiz ve mimari notları
```

## Çalıştırma

Makineye PostgreSQL kurmak gerekmiyor — gömülü binary'ler `npm install` ile geliyor.

```bash
cd C:\Tools\villa\web && npm install && npm run db:start && npm run db:migrate && npm run db:seed && npm run dev
```

Sonraki açılışlarda:

```bash
cd C:\Tools\villa\web && npm run db:start && npm run dev
```

Üretim derlemesi için:

```bash
cd C:\Tools\villa\web && npm run build && npm run start
```

| Komut | İş |
|---|---|
| `npm run db:start` / `db:stop` / `db:status` | Gömülü PostgreSQL (port 5433) |
| `npm run db:migrate` | Migration üret ve uygula |
| `npm run db:seed` | Editöryel veriyi yükle |
| `npm run db:seed-en` | İngilizce içeriği yükle |
| `npm run db:studio` | Prisma Studio ile veriyi gez |
| `npm run db:reset` | Veri dizinini tamamen sil |
| `npm test` | 41 sınama betiği, ~1500 test — **paralel** koşuyor (≈25 sn) |
| `npm test -- arac iz` | Yalnızca adı eşleşen betikler |
| `npm run test:hizli` | Çekirdek altküme (rezervasyon, panel, güvenlik, arama, silme) |
| `npm run test:seri` | Hepsi sırayla — hata ayıklarken |
| `npm run derle` | Doğrulama derlemesi; `.next-kontrol`a yazar, **çalışan dev sunucusunu bozmaz** |
| `npm run ekran -- --yol=/arama cikti.png` | Çalışan siteden ekran görüntüsü (`--tam`, `--genislik=390`, `--koyu`, `--oturum=`) |
| `npm run isler` | Zamanlanmış işler — kuyruk, tutmalar, oturum temizliği |
| `npm run dns:kontrol` | SPF/DKIM/DMARC kayıtlarını doğrula |
| `npm run yedek` | Veritabanı yedeği (pg_dump) |
| `npm run yedek:json` | Araçsız veri yedeği + geri yükleme |
| `npm run erisim` | Erişilebilirlik denetimi (çalışan sunucuya karşı) |
| `npm run seo` | SEO denetimi — title/description, h1, canonical, og:image, JSON-LD, hreflang, alt metni, sitemap |
| `npm run db:demo` | Demo veri üret (`-- villa` / `-- demo 16 --yeniden` / `-- yorum`); panelden geri alınabilir |
| `npm run iyzico:kontrol` | iyzico anahtarlarını ve istek biçimini doğrula (tahsilat yapmaz) |

## Teknoloji kararları

| Karar | Gerekçe |
|---|---|
| **Next.js 15 App Router + TypeScript** | Statik üretim (SSG) + ISR, `generateMetadata`, `sitemap.ts`/`robots.ts` gibi SEO ilkelerinin çerçeveye gömülü olması |
| **PostgreSQL 17 + Prisma 7** | Müsaitlik çakışması `daterange` + GiST exclusion constraint ile veritabanı seviyesinde engelleniyor; uygulama katmanı yarış koşuluna açık kalmıyor |
| **Gömülü PostgreSQL (yerel)** | Geliştiricinin makinesine kurulum gerektirmez; üretimdekiyle aynı PostgreSQL sürümü ve özellikleri |
| **Tailwind yok, token tabanlı CSS** | Onaylanan tasarım sistemi zaten CSS değişkenleriyle kurulmuştu; birebir korundu, runtime maliyeti sıfır |
| **Nunito (başlık) + Inter (gövde)** | `next/font/google` ile self-hosted, `latin-ext` alt kümesi. Harici font isteği yok |
| **Tüm indekslenebilir sayfalar statik** | Sabit TTFB, tarama bütçesi verimliliği |
| **`/arama` indekslenmiyor** | Faceted arama = indeks kirliliği. Detaylı gerekçe [docs/seo.md](docs/seo.md) |
| **iyzico Checkout Form** | Kart verisi hiçbir zaman bizim sunucumuza uğramaz; PCI-DSS yükümlülüğü büyük ölçüde iyzico’da kalır |

## Sayfa haritası

| Rota | Tip | İçerik |
|---|---|---|
| `/` | Statik | Hero, canlı öneri veren arama, kategoriler, öne çıkanlar, bölge keşfi, iç bağlantı ağı |
| `/bolgeler` | Statik | Bölge hub'ı, villa tipine göre çapraz linkler |
| `/villa-kiralama/[bolge]` | SSG × 9 | Bölge iniş sayfası: villa grid, sezon rehberi, SSS |
| `/villa-kiralama/[bolge]/[ozellik]` | SSG × 46 | Uzun kuyruk iniş sayfaları (yalnızca sonuç verenler) |
| `/villa/[slug]` | SSG × 12 | Galeri + lightbox, olanaklar, **fiyatlı müsaitlik takvimi**, rezervasyon kartı, yorumlar |
| `/arama` | Statik + API | Filtre çubuğu, **gerçek harita** (MapLibre), sunucu tarafı arama, sıralama |
| Kurumsal | SSG × 9 | Nasıl çalışır, kapora güvencesi, iptal koşulları, SSS… |
| `/rezervasyon/[slug]` | Dinamik | Rezervasyon formu, sunucu tarafı fiyat dökümü, müsaitlik kontrolü |
| `/rezervasyon/odeme/[kod]` | Dinamik | iyzico Checkout Form — kart verisi iyzico’da kalır |
| `/rezervasyon/onay/[kod]` | Dinamik | Rezervasyon detayı, ödeme planı, iptal (e-posta doğrulamalı) |
| `/giris` | Dinamik | Panel girişi |
| `/panel/*` | Dinamik | Ev sahibi paneli — 8 sayfa (oturum zorunlu) |
| `/yonetim/*` | Dinamik | Yönetim paneli — 13 sayfa, villa ekleme dahil (ADMIN zorunlu) |
| `/rezervasyon/bakiye/[kod]` | Dinamik | Bakiye ödeme sayfası (hatırlatma e-postasından gelinir) |
| `/api/odeme/callback` | Dinamik | Sağlayıcı geri dönüşü — sonuç iyzico’ya sorularak doğrulanır |
| `/api/isler` | Dinamik | Zamanlanmış işlerin HTTP tetikleyicisi (CRON_SECRET zorunlu) |
| `/api/bildirim/webhook` | Dinamik | Bounce/şikâyet geri bildirimi — Svix imzası doğrulanır |
| `/api/totp-qr` | Dinamik | 2FA kurulum QR kodu (oturum zorunlu) |
| `/api/arama` | Dinamik | Sunucu tarafı arama — filtre, yüz sayıları, coğrafi kutu |
| `/api/oneri` | Dinamik | Yazarken öneri (bölge, villa, özellik) |
| `/api/takvim/[anahtar]` | Dinamik | Villanın iCal müsaitlik beslemesi (Airbnb/Booking çeker) |
| `/api/olcum` | Dinamik | Core Web Vitals toplama (çerezsiz, IP saklanmıyor) |
| `/en` | SSG | İngilizce ana sayfa |
| `/en/regions` | SSG | İngilizce bölge hub'ı |
| `/en/villa-rental/[bolge]` | SSG × 9 | İngilizce bölge iniş sayfaları |
| `/en/villa-rental/[bolge]/[ozellik]` | SSG × 46 | İngilizce uzun kuyruk sayfaları |
| `/en/villa/[slug]` | SSG × 12 | İngilizce villa sayfaları — takvim + yorumlar |
| `/en/booking/[slug]` | Dinamik | İngilizce rezervasyon formu (noindex) |
| `/en/[sayfa]` | SSG × 6 | İngilizce kurumsal sayfalar |
| `/en/search` | Statik + API | İngilizce arama arayüzü (noindex) |
| `/indexnow-key.txt` | Dinamik | IndexNow anahtar dosyası |
| `/giris/dogrulama` | Dinamik | İki adımlı doğrulama ekranı |

Toplam **165 statik sayfa** (76’sı İngilizce) + 22 dinamik sayfa/uç nokta, sitemap’te **147 URL**.

## Ürün farklılaştırıcıları

- **Kart içi galeri** — listede sayfa değiştirmeden 5 fotoğraf gezilebiliyor
- **Uçtan uca fiyat tutarlılığı** — liste kartı, harita pini ve detay sayfası aynı `konaklama()` fonksiyonunu kullanıyor; "her şey dâhil" tutar üç yerde birebir aynı
- **Fiyatlı müsaitlik takvimi** — her günün gecelik fiyatı hücrede yazıyor, dolu günler kapalı, aralıkta dolu gün varsa seçim reddediliyor
- **Villaya özgü filtreler** — korunaklı, ısıtmalı havuz, denize mesafe (metre), çocuk havuzu, kalabalık grup, engelli erişimi, evcil hayvan, sauna
- **Karşılaştırma çubuğu** — 3 villaya kadar yan yana 14 satırlık tablo
- **Şeffaf ödeme** — kapora / kalan / depozito ayrımı rezervasyon kartında açık
- **Göz yormayan palet** — kum beyazı zemin, derin petrol vurgu; otomatik + manuel koyu tema

Favoriler, tema tercihi ve karşılaştırma seçimi `localStorage`'da kalıcı.

## Kod haritası

```
web/
├── app/
│   ├── layout.tsx              # fontlar, temel metadata, Organization + WebSite JSON-LD
│   ├── page.tsx                # ana sayfa
│   ├── globals.css             # tasarım sistemi (token'lar + bileşen stilleri)
│   ├── sitemap.ts, robots.ts   # SEO altyapısı
│   ├── opengraph-image.tsx     # dinamik OG görseli
│   ├── arama/                  # faceted arama (noindex)
│   ├── bolgeler/               # bölge hub'ı
│   ├── villa/[slug]/           # villa detay
│   ├── villa-kiralama/…        # SEO iniş sayfaları
│   ├── [sayfa]/                # kurumsal sayfalar (whitelist'li)
│   └── rezervasyon/            # form + onay (force-dynamic, noindex)
├── components/
│   ├── panel/                  # PanelKabuk, Grafik, TakvimDuzenleyici, MesajPaneli…
│   └── …                       # Header, VillaCard, VillaBooking, SearchClient…
├── prisma/
│   ├── schema.prisma           # 22 model
│   ├── migrations/             # init + exclusion constraint + rezervasyon akışı
│   ├── seed.ts                 # veritabanını doldurur
│   └── seed-data.ts, seed-icerik.ts   # editöryel kaynak (çalışma anında kullanılmaz)
├── scripts/                    # pg.mjs (gömülü PostgreSQL) + testler
└── lib/
    ├── db.ts                   # PrismaClient singleton + PrismaPg adaptörü
    ├── queries.ts              # veri erişimi — Prisma satırı → görünüm modeli
    ├── types.ts                # bileşenlerin gördüğü görünüm modelleri
    ├── pricing.ts              # istemci önizleme hesabı, tarih yardımcıları
    ├── fiyat.ts                # SUNUCU fiyat motoru — fiyat_kurali tablosu
    ├── rezervasyon.ts          # server action: oluştur / iptal / müsaitlik
    ├── iptal.ts                # iptal politikası motoru
    ├── odeme/                  # ödeme sağlayıcı soyutlaması: sahte, iyzico
    ├── bildirim/               # e-posta: sağlayıcılar, 13 şablon, kuyruk, bağlayıcı
    ├── auth.ts                 # scrypt parola, oturum, yetki kapıları, denetim
    ├── analitik.ts             # KPI, doluluk, villa/bölge performansı
    ├── panel-eylemler.ts       # panel server action'ları
    ├── panel-baglam.ts         # yetki + kapsam + menü tek yerde
    ├── silme.ts                # silmeden önce bağlı kayıtları sayar (Cascade sessiz)
    ├── bolge-yonet.ts          # bölge açma kuralları + içerik iskeleti
    ├── isler.ts                # zamanlanmış işler — CLI ve /api/isler ortak kaynağı
    ├── arama.ts                # Türkçe tam metin + trigram + coğrafi arama motoru
    ├── ical.ts                 # RFC 5545 ayrıştırma/üretme (bağımlılıksız)
    ├── takvim.ts               # iCal senkronu, SSRF koruması, dışa aktarım
    ├── hakedis.ts              # ev sahibi ödeme takvimi
    ├── i18n.ts                 # dil eşlemesi, sözlük, hreflang üretimi
    ├── queries-en.ts           # İngilizce içerik sorguları (çevirisi olan kayıtlar)
    ├── indexnow.ts             # Bing/Yandex anında bildirim
    ├── gorsel.ts               # görsel CDN soyutlaması
    ├── hiz-sinir.ts            # hız sınırı (veritabanı tabanlı, sunucusuz uyumlu)
    ├── olcum.ts                # Core Web Vitals raporlama (p75)
    ├── totp.ts                 # RFC 6238 iki adımlı doğrulama (bağımlılıksız)
    ├── sms/                    # SMS: sağlayıcılar (netgsm, iletimerkezi), şablonlar
    ├── turkce.ts               # ünlü uyumu / ünsüz benzeşmesi ile ek üretimi
    ├── seo.ts                  # metadata ve JSON-LD üreticileri
    └── site.ts                 # alan adı, marka, iletişim bilgileri
```

Bileşenler Prisma tiplerini görmez; `lib/queries.ts` satırları `lib/types.ts` içindeki
görünüm modellerine çevirir. Şema değişince yalnızca bu dosya güncellenir.

## Yol haritası

**Tamamlandı — Faz 1: Ürün iskeleti + SEO**
Next.js App Router, tasarım sisteminin taşınması, statik iniş sayfası mimarisi,
yapılandırılmış veri, sitemap/robots, görsel optimizasyonu, bölge içeriklerinin derinleştirilmesi.

**Tamamlandı — Faz 2: Veri katmanı**
PostgreSQL 17 + Prisma 7. 17 model, müsaitlik ve rezervasyon için GiST exclusion
constraint, veri bütünlüğü CHECK kısıtları, seed script'i ve gömülü yerel PostgreSQL.
Detaylar: [docs/veritabani.md](docs/veritabani.md)

**Tamamlandı — Faz 3: Rezervasyon akışı**
Sunucu tarafı fiyat motoru (`fiyat_kurali` tablosu), transaction içinde
`Rezervasyon` + `Musaitlik` + `Odeme` yazımı, iptal politikası motoru,
ödeme sağlayıcı adaptörü ve otomatik testler.
Detaylar: [docs/rezervasyon.md](docs/rezervasyon.md)

**Tamamlandı — Faz 4: iyzico entegrasyonu**
Checkout Form ile kart verisi sunucularımıza hiç uğramadan tahsilat. İki fazlı
akış: tarihler 30 dakika geçici tutulur, ödeme sonucu callback gövdesinden değil
iyzico'ya sorularak doğrulanır. Sağlayıcı soyutlaması sayesinde testler dış
servise bağımlı değil. Detaylar: [docs/iyzico.md](docs/iyzico.md)

> ⚠️ Akış mantığı 76 testle doğrulandı ancak **iyzico API'sine karşı
> çalıştırılmadı** — anahtar gerekiyor. `npm run iyzico:kontrol` ile
> kendi sandbox anahtarlarınızla doğrulayabilirsiniz.

**Tamamlandı — Faz 5: Paneller**
Kimlik doğrulama (scrypt + veritabanı oturumu), ev sahibi paneli (takvim, fiyatlandırma,
rezervasyon yönetimi, mesajlar, kazanç) ve yönetim paneli (analitik, villa/bölge/kullanıcı
yönetimi, yorum denetimi, ödemeler, denetim kaydı). Misafir ↔ ev sahibi mesajlaşması.
Detaylar: [docs/panel.md](docs/panel.md)

**Tamamlandı — Faz 6: Bildirimler**
Kuyruk tabanlı e-posta altyapısı (sahte / Resend / SMTP sağlayıcıları), 13 Türkçe şablon,
zamanlanmış iş çalıştırıcısı ve bakiye ödeme sayfası. Hatırlatmalar geleceğe planlanıyor,
mükerrer gönderim veritabanı seviyesinde engelleniyor.
Detaylar: [docs/bildirimler.md](docs/bildirimler.md)

**Tamamlandı — Faz 7: Dağıtım ve teslim edilebilirlik**
Vercel dağıtımı (kök dizin `web`), migration'ların derleme öncesi uygulanması,
zamanlanmış işlerin HTTP tetikleyicisi (`/api/isler`, CRON_SECRET korumalı) ve
SPF/DKIM/DMARC doğrulama scripti. İş mantığı `lib/isler.ts`'de toplandı; CLI ve
sunucusuz planlayıcı aynı kodu çağırıyor.
Detaylar: [docs/dagitim.md](docs/dagitim.md)

**Tamamlandı — Faz 8: Güvenlik ve bildirim olgunlaştırma**
İki adımlı doğrulama (TOTP, bağımlılıksız, RFC 6238 test vektörüyle doğrulandı),
gönderim engeli listesi, imza doğrulamalı bounce/şikâyet webhook'u ve SMS kanalı.
E-posta ile SMS aynı kuyruğu paylaşıyor.
Detaylar: [docs/guvenlik.md](docs/guvenlik.md)

**Tamamlandı — Faz 9: Arama altyapısı**
PostgreSQL tabanlı Türkçe tam metin arama (aksan duyarsız), trigram yazım hatası
toleransı, yüz (facet) sayıları, coğrafi kutu ve yarıçap filtresi. Filtreleme
istemciden veritabanına taşındı. Gerçek harita (MapLibre) ve viewport'a göre
sonuç güncelleme. Ayrı arama servisi yerine Postgres tercih edildi — gerekçesi
dokümanda.
Detaylar: [docs/arama.md](docs/arama.md)

**Tamamlandı — Faz 10: Ev sahibi paneli genişletmeleri**
İki yönlü iCal senkronu (Airbnb/Booking) — çakışmalar çift rezervasyon uyarısı
olarak raporlanıyor, SSRF koruması var. Tarih aralıklı fiyat kuralları ve
ev sahibi ödeme takvimi (hak ediş kaydı, IBAN, dekontlu ödeme işaretleme).
Detaylar: [docs/takvim.md](docs/takvim.md)

**Tamamlandı — Faz 11: Çok dillilik ve büyüme**
İngilizce sürüm (ayrı rota ağacı, çevrilmiş slug'lar), karşılıklı `hreflang`,
IndexNow, arama motoru doğrulama ve görsel CDN soyutlaması. Çevirisi olmayan
kayıt İngilizce sürümde görünmüyor; hreflang yalnızca gerçek karşılığı olan
sayfada yayınlanıyor.
Detaylar: [docs/cokdillilik.md](docs/cokdillilik.md)

**Tamamlandı — Faz 12: İngilizce rezervasyon akışı**
Rezervasyon dili kayıtta saklanıyor; İngilizce form, İngilizce iyzico ödeme
ekranı ve 8 İngilizce e-posta şablonu. Ev sahibine giden bildirimler Türkçe
kalıyor. Yazılmamış İngilizce kurumsal sayfalar Türkçesine yönlendiriliyor.
Detaylar: [docs/ingilizce-akis.md](docs/ingilizce-akis.md)

**Tamamlandı — Faz 13: İngilizce sürümün tamamlanması**
6 İngilizce kurumsal sayfa (çeviri değil, İngilizce okurun sorularına göre
yazıldı) ve İngilizce arama arayüzü. Yönlendirmeler kaldırıldı, hreflang
karşılıklı hale geldi.
Detaylar: [docs/ingilizce-tamamlama.md](docs/ingilizce-tamamlama.md)

**Tamamlandı — Faz 14: İngilizce sürümün derinleşmesi**
İngilizce müsaitlik takvimi (fiyatlar Türkçesiyle birebir aynı kaynaktan),
yorumlar (metin çevrilmiyor — misafirin kendi sözleri) ve 46 uzun kuyruk
iniş sayfası. Özellik slug'ları arama hacmine göre seçildi, hreflang
eşlemesi veritabanından geliyor.
Detaylar: [docs/ingilizce-derinlik.md](docs/ingilizce-derinlik.md)

**Tamamlandı — Faz 15: Yayına hazırlık**
Hız sınırı (Faz 8'de açık kalan delik), Core Web Vitals ölçümü ve
yedekleme/geri yükleme. Geri yükleme gerçekten denendi — ilk seferde
veriyi bozdu, işlem sarmalayıcısıyla düzeltildi.
Detaylar: [docs/yayina-hazirlik.md](docs/yayina-hazirlik.md)

**Tamamlandı — Faz 16: Erişilebilirlik**
Tekrarlanabilir denetim aracı (`npm run erisim`), 3 kontrast düzeltmesi ve
footer başlık hiyerarşisi. 9 sayfa 0 hata/0 uyarı, 24 renk çifti WCAG AA.
Detaylar: [docs/erisilebilirlik.md](docs/erisilebilirlik.md)

**Tamamlandı — Faz 17: Klavye gezinmesi ve panel denetimi**
Takvimde roving tabindex + ok tuşları (61 sekme durağı → 1), denetime 13
panel sayfası eklendi, iki gerçek sorun düzeltildi. 22 sayfa 0 hata/0 uyarı.

**Tamamlandı — Faz 18: Villa ekleme**
Envanter panelden açılabiliyor. Villa taslak olarak kaydediliyor, yayına
alma ayrı ve kontrollü bir adım (fotoğrafsız veya açıklamasız villa
yayınlanamıyor). Slug Türkçe adlardan otomatik üretiliyor.
Detaylar: [docs/villa-ekleme.md](docs/villa-ekleme.md)

**Tamamlandı — Faz 19: Ev sahibi kaydı**
Villa eklemenin son ön koşulu kapandı: ev sahipleri panelden açılıyor,
panel hesabı isteğe bağlı ve aynı işlemde oluşturuluyor. React 19'un
form sıfırlaması yüzünden doğrulama hatasında girilen değerler siliniyordu;
hem bu formda hem villa formunda düzeltildi.
Detaylar: [docs/ev-sahibi-kaydi.md](docs/ev-sahibi-kaydi.md)

**Tamamlandı — Faz 20: İçerik yönetimi**
Sayfa metinleri koddan panele taşındı. Kurumsal sayfalar tam CRUD
(`/yonetim/sayfalar`), sayfalara serpiştirilmiş 48 kısa metin düzenlenebilir
ve varsayılana döndürülebilir (`/yonetim/metinler`). Sitemap artık gerçek
sayfa listesinden üretiliyor — önceden 3 sayfa listeleniyordu, şimdi 8.
Detaylar: [docs/icerik-yonetimi.md](docs/icerik-yonetimi.md)

**Tamamlandı — Faz 21: Villa düzenleme**
Villa yaşam döngüsü kapandı. Ad, bölge, konum ve ev sahibi
`/yonetim/villalar/<id>` üzerinden değiştirilebiliyor; fotoğraflar
sıralanabiliyor (ilk sıradaki kapak), alt metinleri düzenlenebiliyor,
özellikler toplu kaydediliyor. Ad değişince eski adres kalıcı olarak
yeni adrese yönlendiriliyor — mevcut bağlantılar kırılmıyor.
Detaylar: [docs/villa-duzenleme.md](docs/villa-duzenleme.md)

**Tamamlandı — Faz 22: Toplu villa aktarma**
Portföy devralma Excel listesinden yapılabiliyor. Önce önizleme (hiçbir
şey yazılmadan her satırın ne olacağı), sonra uygulama. Türkçe Excel'in
noktalı virgül ayracı, ondalık virgülü ve BOM'u destekleniyor; bölge ve
ev sahibi ada göre eşleşiyor. Aynı dosya ikinci kez yüklenince kopya
açılmıyor.
Detaylar: [docs/toplu-aktarma.md](docs/toplu-aktarma.md)

**Tamamlandı — Faz 23: KVKK veri hakları ve imha**
Misafir hakkında tutulan veriyi görebiliyor ve silinmesini
isteyebiliyor (`/veri-talebi`). Silme = anonimleştirme: ticari belge
saklama yükümlülüğü (TTK md. 82) nedeniyle kayıt silinemiyor ama
yasanın gerektirmediği her alan siliniyor. Saklama süresi dolan veri
her gece otomatik imha ediliyor.
Detaylar: [docs/kvkk.md](docs/kvkk.md)

**Tamamlandı — Faz 24: Değerlendirme toplama**
Misafir konaklamasını değerlendirebiliyor. Davet e-postasındaki düğme
artık gerçek bir forma gidiyor; yorum rezervasyona bağlanıyor ve villa
puanı yayındaki yorumlardan türetiliyor. Öncesinde puan elle yazılıyordu
ve moderasyonun ona hiç etkisi yoktu.
Detaylar: [docs/yorum-toplama.md](docs/yorum-toplama.md)

**Tamamlandı — Faz 25: Yorum yanıtı ve İngilizce form**
Ev sahibi yoruma herkese açık yanıt yazabiliyor (`/panel/yorumlar`);
yanıt villa sayfasında yorumun altında görünüyor. İngilizce
değerlendirme formu açıldı — İngilizce davet e-postası önceden yanlış
sayfaya, yanlış dilde gidiyordu.
Detaylar: [docs/yorum-toplama.md](docs/yorum-toplama.md)

**Tamamlandı — Faz 26: Vergi hesabı ve mali özet**
Site her yerde "vergiler dâhil" diyordu ama arkasında hiçbir hesap
yoktu. KDV (%10) ve konaklama vergisi (%2) artık brütün içinden
ayrılıyor, oranlar rezervasyona donduruluyor, misafire dökümü
gösteriliyor. `/yonetim/mali` dönem bazlı özet ve müşavire
gönderilecek CSV üretiyor.
Detaylar: [docs/vergi-mali.md](docs/vergi-mali.md)

**Tamamlandı — Faz 27: Ev sahibi başvurusu**
`/ev-sahibi-ol` çıkmaz sokaktı — platformun ana kazanım hunisi
"ekibimize ulaşabilirsiniz" deyip bitiyordu. Artık başvuru formu var
(`/ev-sahibi-basvuru`), yönetim onayı ev sahibi kaydına dönüştürüyor ve
oradan villa ekleniyor. Kurumsal sayfalara sayfaya özel çağrı düğmesi
eklendi.
Detaylar: [docs/ev-sahibi-basvurusu.md](docs/ev-sahibi-basvurusu.md)

**Tamamlandı — Faz 28: Bildirim boşlukları**
Faz 25 ve 27'de sınır olarak yazdığım üç eksik kapandı: başvuru
geldiğinde ekibe, sonuçlandığında başvurana, yoruma yanıt yazıldığında
misafire bildirim gidiyor. Anonimleştirilmiş adrese ve rezervasyon bağı
olmayan yoruma gönderilmiyor.
Detaylar: [docs/bildirim-bosluklari.md](docs/bildirim-bosluklari.md)

**Tamamlandı — Faz 29: Panelden tohumlama ve geri alma**
Demo veri artık **Yönetim → Demo veri** sayfasından ekleniyor ve geri
alınıyor. `npm run db:seed` panele konulmadı: o betik 16 tabloyu
boşaltıyor. Buradaki tohumlama hiçbir şeyi silmiyor, ne eklediğini
deftere yazıyor, geri alma yalnızca o deftere bakıyor — gerçek
kayıtlar defterde olmadığı için silinemiyor. Demo villaya gerçek
rezervasyon veya yorum bağlanmışsa kayıt korunuyor ve sebebi
yazılıyor.
Detaylar: [docs/tohumlama.md](docs/tohumlama.md)

**Tamamlandı — Faz 30: Fotoğraf yükleme**
Villa düzenleme sayfasından sürükle-bırak yükleme. Her dosyanın türü
içerikten okunuyor, dosya yeniden kodlanıyor ve **EXIF siliniyor** —
telefon fotoğrafındaki GPS koordinatı ev sahibinin evinin tam yerini
veriyor. Depo `DEPO_SURUCU` ile seçiliyor: geliştirmede disk,
üretimde Supabase Storage (veritabanı zaten orada).
Detaylar: [docs/fotograf-yukleme.md](docs/fotograf-yukleme.md)

**Tamamlandı — Faz 31: Fotoğraf alt metni**
Faz 30'da yükleme her fotoğrafa aynı cümleyi yazıyordu; ekran okuyucu
kullanan biri galeriyi gezerken dokuz fotoğrafı birbirinden ayırt
edemiyordu. Metni makinenin yazdığı artık işaretleniyor, kopya metin
engelleniyor ve **kapak fotoğrafının alt metni yazılmadan villa yayına
alınamıyor**. `npm run erisim` denetimi veritabanına da bakıyor.
Detaylar: [docs/alt-metin.md](docs/alt-metin.md)

**Tamamlandı — Faz 32: Tema**
Tasarım dili Servis.NET'e göre yeniden kuruldu: beyaz zemin, lacivert
metin, indigo marka, amber çağrı düğmesi, Nunito 800 başlık, sıkı
köşeler. Amber metin rengi olarak okunmadığı için `--cta` ayrı token
oldu; denetime yeni kontrast çifti eklendi. Her iki temada 0 hata.
Detaylar: [docs/tema.md](docs/tema.md)

**Tamamlandı — Faz 33: Çeviri altyapısı**
Dil artık veri, şema değil. Çeviriler dil başına sütun olmaktan çıkıp
varlık başına tabloya taşındı; RU ve AR açıldı (içerik girilebiliyor,
rota ağacı henüz yok). Türkçe çeviri tablosuna yazılamıyor — kural
veritabanı kısıtında. Panelde **Yönetim → Çeviriler**.
Detaylar: [docs/ceviri-altyapisi.md](docs/ceviri-altyapisi.md)

**Tamamlandı — Faz 34: Dil yayın kapısı**
Bir dil ancak rota ağacı **ve** içeriği varsa yayında sayılıyor; site
haritası, hreflang ve dil değiştirici aynı listeye bakıyor. Rusça
arayüz sözlüğü ve yol eşlemesi hazır, ağaç kapalı olduğu için
duyurulmuyor. Rusça ağacı bu fazda açılmadı: içerik sıfırken boş bir
site kurmak olurdu.
Detaylar: [docs/dil-kapisi.md](docs/dil-kapisi.md)

**Tamamlandı — Faz 35: Deniz mavisi + orman yeşili palet**
Servis.NET şablonu korundu (beyaz zemin, Nunito 800 başlık, sıkı
köşeler); renkler kıyıya çevrildi — deniz mavisi marka, orman yeşili
çağrı düğmesi. Denetim bir kontrast düşüşü yakaladı ve düzeltildi.
Detaylar: [docs/tema.md](docs/tema.md)

**Tamamlandı — Faz 36: Sayfa metinlerinde dil**
`anasayfa-en.*` anahtarları dili adında taşıyordu ve `tr`/`en`
değerleri aynı İngilizce metindi. Aile `int.*` oldu, Türkçeler gerçek
Türkçe yazıldı, üzerine yazmalar göçle taşındı. Yayın kapısına üçüncü
koşul eklendi: sayfa metinleri. Kapsam raporu panele konunca Arapça'nın
sessizce Türkçeye düştüğü ortaya çıktı ve kapatıldı.
Detaylar: [docs/sayfa-metni-dili.md](docs/sayfa-metni-dili.md)

**Tamamlandı — Faz 37: Sayfa metinleri kayda taşındı**
`/en` ağacındaki sabit İngilizce metinler (meta başlık/açıklama, giriş
paragrafı, villa rezervasyon kuralları) panelden düzenlenebilir kayda
geçti; form etiketleri kodda kaldı. Sayfa dosyalarında artık İngilizce
cümle yok — Rusça ağaç açıldığında kopyalanacak dosya dile bağımlı
değil.
Detaylar: [docs/sayfa-metni-dili.md](docs/sayfa-metni-dili.md)

**Tamamlandı — Faz 38: Yerleşim Servis.NET düzenine çekildi**
Hero koyu bloğa döndü ve arama kutusu içine alındı; kartlar
çerçevelendi; bölümler dönüşümlü çökük bant aldı; altbilgiden önce
koyu çağrı şeridi eklendi; altbilgi koyu lacivert oldu. Koyu blok
renkleri tokenlara çevrilip denetime bağlandı — sabit yazılan renk
denetlenmeyen renk demek.
Detaylar: [docs/tema.md](docs/tema.md)

**Tamamlandı — Faz 39: Tema sıfırdan yazıldı**
Stil katmanı silinip baştan kuruldu. Faz 32/35/38'de mevcut tasarımın
üstüne yama yapılmıştı; sonuç ne eski tasarımdı ne referans.
servis.net, gotatil ve cozycozy'nin ortak omurgası alındı: arama
öncelikli kompakt hero, kategori şeridi, kart rayları, koyu altbilgi.
Tek yazı ailesi (Plus Jakarta Sans), ölçülü başlıklar. 358 sınıfın
tamamı kapsam denetiminden geçirildi.
Detaylar: [docs/tema.md](docs/tema.md)

**Tamamlandı — Faz 40: Tema TrendMatik sisteminden taşındı**
Faz 32-39 arası referans beş kez soyutlanıp sıfırdan türetildi ve her
seferinde "benziyor ama o değil" çıktı. Oysa istenen sistem aynı
makinedeki TrendMatik projesinde zaten yazılıydı (o da servis.net'in
birebir uyarlaması). Palet, tipografi, gölge ve yarıçap ölçeği, hero
efektleri olduğu gibi alındı; yalnızca iki semantik renk okunurluk
için koyulaştırıldı.
Detaylar: [docs/tema.md](docs/tema.md)

**Tamamlandı — Faz 41: Bileşen katmanı da taşındı**
Faz 40 yalnızca token ve hero'yu taşımıştı; şablonun kendisi bileşen
katmanındaydı. Üç katlı başlık (yardımcı şerit + yapışkan ana başlık +
kayan güven şeridi), düğme hiyerarşisi, kart davranışı, bölümlü sekme
denetimi ve rozet aileleri alındı.
Detaylar: [docs/tema.md](docs/tema.md)

**Tamamlandı — Faz 42: Altbilgi, panel ve ana sayfa**
Altbilgi koyu bloktan aydınlık iki sütuna, panel tam boy kenar
sütunundan yüzen karta geçti. Hero fotoğraf bandı + tek parça beyaz
hap arama çubuğu oldu (cozycozy düzeni); ana sayfa bölümleri
ovillam.com sırasına alındı: süreç, son dakika fırsatları, seçki,
neden biz, bölgeler, kısa süreli villalar, misafir yorumları.
Kısa konaklama sayıları uydurulmuyor, villaların dolu aralıklarından
hesaplanıyor (`lib/kisa-konaklama.ts`, 24 test). Faz 41'de kırılma
noktası yazılmamış üç katlı başlığın dar ekran taşması da giderildi.
Detaylar: [docs/tema.md](docs/tema.md)

**Tamamlandı — Faz 43-47: Listeleme, mega menü, gelişmiş arama**
Listeleme sayfaları yatay sonuç satırına geçti; başlık mega panel
oldu; ana sayfaya tatil temaları ızgarası ve fotoğraflı süreç bölümü
eklendi. Faz 39'un sıfırdan yazımında CSS'i düşen sınıflar (favori
düğmesi, bildirim balonu, takvim günü, iniş sayfası başlığı, gelişmiş
filtre paneli) geri getirildi — `.landing-hero` ölçüsüz kaldığı için
bölge sayfalarında hero görseli sayfanın tamamına yayılıyordu.
Rakip taraması sonrası banyo, alan, puan ve esnek tarih filtreleri
eklendi. Boşluk raporu: [docs/rakip-analizi.md](docs/rakip-analizi.md)

**Tamamlandı — Faz 48-52: Rakip boşlukları kapatıldı**
Beş yeni özellik kodu (kapalı havuz, deniz manzaralı, doğa içinde,
merkeze yakın, muhafazakâr) ve her birine iniş sayfası; WhatsApp hattı
ile acente belge satırı; uygulanan filtre çipleri ve mobil filtre
çekmecesi; sınırsız basılabilen demo villa üreticisi; **teklif
yönetimi** (misafir formu → panel kuyruğu → e-posta → kabul/red);
ev sahibi düzenleme ekranı; sayfa editörüne canlı önizleme.
Detaylar: [docs/rakip-analizi.md](docs/rakip-analizi.md)

**Tamamlandı — Faz 53-57: Yol haritası kapatıldı**
Yetişkin/çocuk ayrımı ve çift kaydırıcılı fiyat aralığı; kahvaltı
dâhil iniş sayfası; girişsiz rezervasyon sorgulama (`/rezervasyonlarim`);
menü ve katman açılınca arka planın kararıp bulanıklaşması; kabul
edilen teklifin tek düğmeyle rezervasyona dönüşmesi; son aramalar;
kurumsal sayfalar için blok editörü.

**Tamamlandı — Faz 58-61: Rapordaki son maddeler**
Sonuç iskeleti, son bakılan villalar, arama sayfasında SSS ve 404
sağlamlaştırma (`/api/saglik` teşhis ucu); tarihe bağlı kampanya
şeridi; çift onaylı fiyat alarmı; bölgeye bağlanabilen rehber
yazıları (`/rehber`).

**Tamamlandı — Faz 62-67: Panelden yönetim, kart ve arama düzeni**
Referans veri dağıtımda otomatik yükleniyor (üretim veritabanı boş
kalmıştı); başlık menüsü, hero görselleri, kampanyalar ve rehber
yazıları panelden CRUD ile yönetiliyor; villa kartı kutuya tam oturan
görsele, tek satır fiyata ve "hızlı bakış" katmanına kavuştu; arama
sayfası sol filtre sütunu + liste/ızgara/harita görünümlerine geçti.
Detaylar: [docs/panel.md](docs/panel.md)

**Tamamlandı — Faz 68: Bölge açma/silme, villa silme**
Panelden bölge açılıyor ve siliniyor, villa siliniyor — **iki adımda**:
önce bağlı kayıtlar sayılıyor, sonra onay isteniyor. Şema yorumları ve
yazışmayı `Cascade` ile sessizce götürdüğü için tek adımlı bir silme
düğmesi yöneticiye ne kaybettiğini söylemiyordu. Rezervasyonu olan
villa ve villası olan bölge silinemiyor; villada ayrıca "SİL" yazmak
gerekiyor. Hızlı bakış katmanı `createPortal` ile gövdeye taşındı
(kartın `transform`u onu kartın içine hapsediyordu), arama satırlarına
da eklendi; dil menüsü hero'nun arkasında kalmıyor; hero'ya hızlı
arama çipleri geldi.
Detaylar: [docs/silme.md](docs/silme.md)

**Tamamlandı — Faz 69: Demo veri tutarlılığı, "Yeni" rozeti**
Demo villalar yeniden basıldı ve üretici üç çelişkiden arındırıldı:
havuz metniyle olanaklar listesi artık aynı havuzu anlatıyor, alan
kapasiteden türetiliyor ("8 kişi · 120 m²" bitti), Sapanca gibi iç
bölgelere denize mesafe verilmiyor. `npm run db:demo -- demo 16
--yeniden` eskileri geri alıp yeniden basıyor. Ayrıca yorumu olmayan
villa "0.00" göstermiyor: kartta, listede ve villa sayfasında "Yeni"
yazıyor, JSON-LD'ye sıfır değerlendirmeli `aggregateRating`
yazılmıyor — bu demo veriye değil panelden girilen her yeni villaya
uygulanıyor.
Detaylar: [docs/tohumlama.md](docs/tohumlama.md)

**Tamamlandı — Faz 70: Ortalı hero, tek tıkla arama, panelden yenileme**
Hero cozycozy düzenine geçti: ortalı tek satır başlık, tek parça
**beyaz** arama kutusu, misafir seçimi açılır panelde artı/eksi ve
evcil hayvan anahtarıyla. Buzlu cam denendi ve bırakıldı — yarı saydam
kutuda alanların nerede bittiği belirsiz kalıyordu. Tarih ("bu hafta
sonu") ve tema ("jakuzili") çipleri artık bağlantı değil kutunun
filtreleri; tek "Ara" hepsini birleştiriyor
(`?g=…&c=…&k=4&c6=2&f=denizesifir,evcil`). Varsayılan hero üç kareye
ve `w=2400&q=80` çözünürlüğe çıktı. Panele **Yenile** düğmesi eklendi:
açık demo partilerini geri alıp yeniden basıyor, çünkü canlıda komut
satırı yok ve "Ekle" eskiyi düzeltmiyor. Üç hata da kapandı: arama
alanları genel form kuralı yüzünden beyaz kutu görünüyordu, `/arama`
çoklu `f` filtresini bölmediği için sıfır sonuç dönüyordu, ve demo
partileri eskiden yeniye geri alındığında ortak ev sahibi silinemiyor,
sonraki basış defter satırına takılıp düşüyordu.
Detaylar: [docs/tema.md](docs/tema.md) · [docs/tohumlama.md](docs/tohumlama.md)

**Tamamlandı — Faz 77: Trafik analitiği**
Yönetim → Trafik analitiği: ziyaretler, gezinmeler, tıklamalar ve
arama motoru robotlarının taramaları. Üçüncü taraf araca veri
gönderilmiyor. **Çerez yok, IP saklanmıyor**; ziyaretçi ayrımı her
gece dönen bir tuzla üretilen geri çevrilemez özetle yapılıyor —
aynı kişi ertesi gün yeni ziyaretçi sayılıyor. Bedeli kişi bazlı
huni analizinin yapılamaması.

Ölçüm İKİ kaynaktan: middleware her sayfa isteğini **botlar dâhil**
kaydediyor (robotlar JavaScript çalıştırmıyor, yalnızca istemci
ölçümü kullanılsaydı Googlebot'un taradığı sayfalar hiç
görünmezdi), istemci ise sunucuya uğramayan tıklamaları
`sendBeacon` ile bildiriyor. Bot trafiği her sorguda insan
trafiğinden ayrı.
Detaylar: [docs/analitik.md](docs/analitik.md)

**Tamamlandı — Faz 78-80: Tema denetimi, arama düzeni, kategoriler**
CDP üzerinden çalışan bir tarayıcı denetimi yazıldı: her rotayı gerçek
tarayıcıda açıp hesaplanmış renkleri okuyor ve metnin gerçek zeminini
DOM ağacında bularak kontrast ölçüyor. 37 sayfada 153 sorun buldu;
dördü sistemikti (`--ink-3` 4.14:1, WhatsApp yeşili 2.87:1, logo
degradesi görünmez kalabiliyordu, panel mobilde 114 px yatay
kayıyordu). Arama sayfasında görünüm ve sıralama üst banda alındı,
villa kartında fiyat ile düğme üst üste binmesi giderildi, ızgara
3 sütuna indi. Sol alta hızlı işlemler menüsü (huni: ara → teklif →
karşılaştır → rezervasyon) eklendi.

**Kategoriler panelden yönetiliyor** (Yönetim → Kategoriler): ekleme,
düzenleme, sıralama ve silme. `Ozellik` tablosu arama filtrelerini,
villa etiketlerini ve iniş sayfalarını birden besliyor; yeni bir
kategori açmak eskiden kod değişikliği ve dağıtım gerektiriyordu.
Detaylar: [docs/panel.md](docs/panel.md)

**Tamamlandı — Faz 81: SEO denetimi, sıralama, güven şeridi, altbilgi**
`npm run seo` eklendi: çalışan sunucuya karşı her indekslenebilir
sayfada title/description uzunluğu, tek h1, canonical, og:image,
JSON-LD, hreflang, alt metni ve noindex tutarlılığını sınıyor.
İlk tarama **11 sayfada og:image olmadığını** buldu — `meta()` görsel
verilmediğinde alanı boş bırakıyordu ve kurumsal sayfalar
paylaşıldığında kartta hiç görsel çıkmıyordu. 18 uyarı → 5, hata 0.

Bölge sıralaması panele geldi (kategorilerdeki gibi komşuyla takas).
Güven şeridi maddeleri metin kaydına taşındı — kodda sabitken bir
vaadi geri almak dağıtım bekliyordu. Altbilgiye **villa sahibi
kutusu**: "Villanı kiraya ver" ve "Villa sahibi girişi". Giriş aynı
kapıdan; yönetici EV_SAHIBI rolü verdiğinde kullanıcı `/panel`
altında yalnızca kendi villalarını görüyor.
Detaylar: [docs/seo.md](docs/seo.md)

**Tamamlandı — Faz 82-84: Villa detay sayfası ve tam ekran galeri**
Detay sayfasının düzeni ovillam.com referans alınarak yeniden
kuruldu: galeri en üstte, hemen altında başlık, puan/konum ve künye
(kişi, yatak odası, banyo, m², havuz, denize mesafe), ardından
gezinme şeridi ve yapışkan fiyat kartı. Galeri oranı `16/6.6` ve
tavanı `62vh` — beşinin birden ilk ekrana sığması için. Kırıntı yolu
görsel olarak kaldırıldı, `BreadcrumbList` JSON-LD kaldı.

Fotoğrafa tıklamak **tam ekran galeriyi** açıyor: kalan alanın
tamamını kaplayan sahne, küçük kare şeridi (aktif kare görünür alana
çekiliyor), sayaç, ok tuşları ve `Esc`.

Perdenin hiç açılmamasının sebebi genel bir yardımcı sınıftı:
`.open { display: block }`, `class="lightbox open"` yazan perdeyi
ızgaradan block'a düşürüyor ve `1fr` sahne satırı 0 piksele iniyordu;
aynı hata karşılaştırma penceresinin ortalamasını da bozuyordu.
Yardımcıdan `.open` çıkarıldı — durum sınıfı yerleşim kurmamalı.
Detaylar: [docs/villa-detay.md](docs/villa-detay.md)

**Tamamlandı — Faz 85: Araç kiralama**
Villa rezervasyonunun **ek hizmeti**: misafir rezervasyonu
tamamlarken tek kutucukla araç ekliyor, araç konaklama kadar gün
kiralanıyor. `/arac-kiralama` sayfası, ana sayfada şerit, altbilgi ve
hızlı işlemler menüsünde bağlantı, panelde tam CRUD (Yönetim →
Araç kiralama: ekleme, düzenleme, sıra, yayın durumu).

Araç bedeli **kaporaya girmiyor** — kapora villanın tarihlerini tutmak
için alınıyor, araç teslimde ödeniyor. Tutar yine de rezervasyona
donduruluyor: liste sonradan değişse de misafire verilen fiyat
değişmemeli. Sunucu tutarı araç kaydından yeniden hesaplıyor;
istemciden gelen fiyata güvenilmiyor.

Rezervasyona bağlı araç silinemiyor (yayından kaldırılıyor): silmek,
geçmiş bir rezervasyonun "hangi araç" bilgisini sessizce boşaltırdı.
Detaylar: [docs/arac-kiralama.md](docs/arac-kiralama.md)

Ayrıca: villa detay galerisinde büyük karenin üzerinde **sıvı cam**
(liquid glass) villa adı; logoda "i" harfinin noktası altın rengi
(harf noktasız `ı`, nokta ayrı katman — yazı tipi tittle'ı gövdeyle
aynı glifte çiziyor); galeriye `width: 100%` — `aspect-ratio` ile
`max-height` birlikteyken tarayıcı alçak pencerelerde genişliği de
kısıyor ve galeri sayfa genişliğinden dar kalıyordu.

**Tamamlandı — Faz 86: Oturum menüsü ve profil**
Başlıktaki "Giriş yap" düğmesi, oturum varken adın baş harfiyle bir
düğmeye dönüşüyor ve altında **Profil / Panel / Güvenlik / Çıkış**
menüsü açılıyor. Oturum durumu `app/layout.tsx`te okunmuyor — çerezi
orada okumak 238 statik sayfayı dinamikleştirirdi; başlık statik
basılıyor, istemci `/api/oturum`dan öğreniyor.

**`/panel/profil`** açıldı: kullanıcı kendi adını ve parolasını
değiştiriyor. Şimdiye kadar ikisi de yalnızca yöneticide vardı; villa
sahibi parolasını yenilemek için destek istemek zorundaydı ve yönetici
geçici parola üretip güvensiz bir kanaldan iletiyordu. Parola en az 10
karakter, mevcut parola soruluyor ve değişiklikten sonra **diğer**
oturumlar düşüyor — bu oturum kalıyor.
Detaylar: [docs/guvenlik.md](docs/guvenlik.md)

**Tamamlandı — Faz 87: Detay sayfası düzeni, gelişmiş görüntüleyici, yumuşak kenarlar**
Villa detay sayfasında her bölüm artık **kendi kartında**: yüzey,
ince çerçeve, yumuşak köşe ve bölümler arası eşit boşluk. Önceden
bölümler yalnızca ince bir çizgiyle ayrılıyordu ve sayfa üst üste
yığılmış metin gibi okunuyordu. Başlık ritmi tek kurala bağlandı,
ad-hoc negatif marjlar kaldırıldı; fiyat kartı da aynı dili konuşuyor
(fiyat satırı ayırıcılı başlık, çerçeveli tarih alanları, yumuşak
zeminli kapora notu).

**Tam ekran görüntüleyici** basit bir büyük fotoğraf olmaktan çıktı:
yakınlaştırma (tekerlek, düğme, çift tık — imlecin altındaki nokta
sabit kalıyor), yakınken sürükleme, yakın değilken kaydırma
hareketiyle fotoğraf değiştirme, **ızgara görünümü**, açıklama
satırı, tam ekran ve klavye kısayolları (`← →`, `+ − 0`, `G`, `F`,
`Esc`).

**Yumuşak kenar kuralı**: sitede hiçbir görsel, form, tablo, kutu ya
da bölüm keskin köşeli değil. CDP denetimi 13 sayfada **307 keskin
öğe** buldu; taban kural yazıldıktan sonra **0**.

Galerideki villa adı artık arkası bulanık şeffaf bir kutuda ve
**altın degradeyle** yazılıyor. `.wrap.section` yazan bölümler sayfa
kenarına yapışıyordu: `.section`ın `margin`/`padding` kısaltmaları
`.wrap`ın ortalamasını siliyordu — uzun yazıma geçildi.
Detaylar: [docs/villa-detay.md](docs/villa-detay.md) ·
[docs/tema.md](docs/tema.md)

**Tamamlandı — Faz 88: Hero görselleri bilgisayardan yükleniyor**
Yönetim → Hero görselleri artık dosya kabul ediyor: sürükle-bırak
görünümlü seçici, çoklu dosya, 2400 piksele indirip WebP'e çevirme,
**1600 pikselden dar görseli reddetme** (hero bandı geniş ve kısa,
dar fotoğrafın ortası kırpılıyor). Alt metin dosyayla birlikte
soruluyor.

Silme artık **dosyayı da siliyor** (`HeroGorsel.depoAnahtar`); adresle
eklenmiş görselin dosyasına dokunulmuyor — o dosya bizim değil.
Sıralama komşuyla yer değiştirmeye geçti: sıra alanına elle sayı
yazmak, iki görsele aynı sayı verildiğinde gösteriyi sessizce
bozuyordu.
Detaylar: [docs/fotograf-yukleme.md](docs/fotograf-yukleme.md)

**Tamamlandı — Faz 89: Misafir hesabı, giriş penceresi, Google ile giriş**
Ziyaretçi artık **kendi hesabını açabiliyor** (rol `MISAFIR`):
`/hesap` altında kendi rezervasyonlarını, profilini ve güvenlik
ayarlarını görüyor. Yönetici EV_SAHIBI rolü verdiğinde **aynı hesap**
villa panelini görmeye başlıyor.

Rezervasyonlar hesap kimliğine değil **e-postaya** bağlı: hesap
açmadan önce yapılmış rezervasyonlar da hesapta görünüyor.

Başlıktaki "Giriş yap" düğmesi artık **pencere** açıyor: giriş/kayıt
sekmeleri, Google düğmesi, `Esc` ile kapanma. `/giris` ve `/kayit`
sayfaları duruyor — JavaScript olmadan da giriş yapılabilmeli. Pencere
portal ile `body`ye basılıyor: başlıktaki `backdrop-filter`, içindeki
`position: fixed` perde için kapsayıcı blok oluyor ve pencerenin altı
kırpılıyordu.

**Google ile giriş** kütüphanesiz yazıldı (PKCE + state, `sub` ile
eşleşme, doğrulanmamış e-posta reddi, TOTP es geçilmiyor) ve
**yapılandırma yoksa tümüyle kapalı**. Açmak için Google Cloud
Console'da bir OAuth istemcisi ve Vercel'de iki ortam değişkeni
gerekiyor.
Detaylar: [docs/guvenlik.md](docs/guvenlik.md)

**Tamamlandı — Faz 90: Geliştirme döngüsü hızlandırıldı**
Bir fazın süresini kod yazmak değil **beklemek** belirliyordu; üç
darboğaz ölçülüp kaldırıldı.

**Sınamalar paralel koştu: 8–12 dakika → ~25 saniye.** Kırk betik
`&&` ile zincirlenmişti; her biri kendi Node sürecini açıp `tsx` ve
Prisma istemcisini kuruyor, yani sınamalar başlamadan betik başına
4–6 saniye gidiyordu. `scripts/testler.mjs` betikleri altı eşzamanlı
çalıştırıyor. Veritabanının tamamını sayan ya da **tek olan bildirim
kuyruğunu** işleyen dokuz betik seri grupta: paralel koşarken
başkasının yazdığı kayıt yüzünden kendi hatası olmadan kalıyorlardı
(bu, koşucu yazılırken gerçekten yaşandı ve `test-bildirim` seri
gruba alındı).

**`npm run derle` artık dev sunucusunu bozmuyor.** `next build`,
`next dev` ile aynı `.next` klasörüne yazıyor ve dev sunucusunun
yüklediği parçaları silince sunucu her isteğe *Cannot find module
'./5873.js'* diyerek 500 dönüyordu — tek bir oturumda dört kez
yaşandı, her seferinde yeniden başlatma ve yeniden derleme.
Doğrulama derlemesi artık `.next-kontrol` klasörüne gidiyor;
dağıtımdaki `npm run build` dokunulmadan duruyor.

**`npm run ekran`**: çalışan siteden ekran görüntüsü. Görsel kontrol
her seferinde elle yazılan geçici bir CDP betiği gerektiriyordu;
tarayıcı açma, bekleme ve kırpma tek yerde toplandı
(`--tam`, `--genislik=390`, `--koyu`, `--oturum=`).

**Tamamlandı — Faz 91: Başlık stili C, kırıntı yolu kaldırıldı, arama kutusu**
Bölüm başlıkları **C stiline** geçti: solda altın→indigo degrade
çubuk, üstünde küçük kategori satırı, sola hizalı başlık ve
sağda "tümünü gör". Ortalı B sürümünde art arda gelen bölümlerde göz
sürekli merkeze dönmek zorunda kalıyordu.

**Görsel kırıntı yolu site genelinde kaldırıldı.** `BreadcrumbList`
JSON-LD duruyor — Google arama sonucundaki kırıntı yolunu ondan
üretiyor. Bileşen tek yerden kapatıldı; çağıran on yedi sayfa
değişmedi.

**Metin altı çizgileri kaldırıldı** (site geneli kural): vurgu artık
renk ve ağırlıkla. `<u>` öğesi fiyat dökümünde ipucu taşıyor, altı
çizgi için değil.

**Arama kutusunda seçili tarih görünmüyordu:** `.sf-bolme > b` kendi
rengini vermiyor, hero'daki beyaz metni miras alıyordu — boş
hâldeki yer tutucu görünüyor, dolu hâl beyaz zeminde beyaz kalıyordu.
"Ara" düğmesi de 4 piksel yukarıdaydı (`align-items: stretch` +
sabit yükseklik).

Villa detay sayfasında başlık ile altındaki puan/konum satırı
birbirine yapışıktı; h1'e alt boşluk verildi.

**Tamamlandı — Faz 92: Derleme kapsamı daraltıldı**
Dağıtımın en uzun adımı sayfa ön üretimiydi. `/villa/[slug]` artık
**ilk 12 villayı**, `/en/*` ağacı ise **hiçbir sayfayı** önceden
üretmiyor. Yerel veritabanıyla **186 → 113 sayfa**; üretimde villa
sayısı altı kat fazla olduğu için fark çok daha büyük.

Sayfalar kaybolmuyor: `dynamicParams` açık, önceden üretilmeyen adres
ilk ziyarette üretilip önbelleğe giriyor. Üretim derlemesi ayağa
kaldırılıp doğrulandı (`/en/villa/...`, `/villa/...` ve İngilizce uzun
kuyruk adresleri 200). Site haritası kendi sorgusunu yaptığı için
Google'ın gördüğü adres kümesi aynı.

`/api/saglik` ayrıca hangi dağıtımda olduğunuzu söylüyor
(`ortam`, `commit`, `dal`) — "değişkeni ekledim ama kapalı görünüyor"
durumunun en sık sebebi, bakılan adresin başka bir dağıtım olması.
Detaylar: [docs/dagitim.md](docs/dagitim.md)

**Tamamlandı — Faz 93: Hero ekranı dolduruyor, marka satırı, altbilgi**
Hero'nun altında ilk ekranda 100–150 piksellik beyaz bir şerit
kalıyordu (78vh tavanı); bant artık üst çubuk ve başlık düşülerek
ekranı tam dolduruyor (`100svh` — mobil tarayıcı çubuğu için).

Marka satırı **"Tatilin Şahane Olsun, Adresin KonutProjeleri"** oldu ve
arama kutusunun altına, hero'nun en sonuna taşındı; altın–beyaz
degrade harflerin üzerinden yavaşça geçiyor.

**Altbilgi** sitenin diline getirildi. İki görünmez öğe vardı: logonun
ikinci hecesi ("hane") ve villa sahibi kutusunun başlığıyla giriş
düğmesi — üçü de koyu altbilgi döneminden kalma beyaz renkteydi,
aydınlık altbilgide beyaz zeminde kayboluyorlardı. Villa sahibi kutusu
tam genişlikte bir karta alındı, on iki bağlantılık "Kurumsal" sütunu
konuya göre ikiye bölündü (dört dengeli sütun), belge + iletişim +
telif üç ayrı şerit olmaktan çıkıp tek banda girdi.

**Tamamlandı — Faz 94: Arama panelleri, mobil denetim, yumuşak çerçeve**
Arama kutusunun panelleri **boş görünüyordu**: panel hero'nun içinde
duruyor ve oradan `color: #fff` miras alıyor; misafir sayaçları,
seçili olmayan segment düğmeleri ve özellik çipleri beyaz zeminde
beyaz kalıyordu. Panele kendi metin rengi verildi, hero için yazılan
yarı saydam çip/sekme stilleri panel içinde normal kart görünümüne
döndürüldü. Misafir sayacı satırlarının **hiç kuralı yoktu** —
"Çocuklar0–12 yaş" diye okunuyordu; satırlar, ayraçlar ve 34 pikselik
yuvarlak −/+ düğmeleri eklendi.

**Arama türü sekmeleri** (Tam tarih / Esnek tarih / Haritada gez)
kutunun üstünden **Gelişmiş panelin içine** taşındı; arama kutusu
hero'da biraz yukarı alındı.

**Mobil denetim** (`scratchpad/mobil.js`, 13 sayfa × 390 px): yumuşak
kenar kuralı yazılırken tablo sarmalları `overflow: hidden` olmuştu ve
**geniş tablolar dar ekranda kaydırılamıyordu** — sezon fiyatlarının
sağ sütunlarına ulaşmanın yolu yoktu; `overflow-x: auto`ya döndü.
Dokunma hedefleri (dil seçici 26, ikon düğmeleri 28 px) 38 piksele,
takvimdeki gecelik fiyat 9,5 pikselden 10,5'e çıkarıldı.

Kart içindeki görsellere **paspartu**: ince bir iç boşluk görseli
çerçevenin içine alıyor, kartın yuvarlaklığı kesintisiz kalıyor.

**Tamamlandı — Faz 95-97: Denetimler, başlıkta arama, dönen ziyaretçi**
Bağlantı denetimi ana sayfadan ve altbilgiden **on altı ölü bağlantı**
çıkardı (bölge × özellik çarpımı körlemesine basılıyordu); artık
yalnızca sonuç veren kombinasyonlar basılıyor. Mega menüde bölgeler
"0 villa" görünüyordu — sayı sabit sütundan geliyordu, canlı sayıma
geçti. Arama sayfasında görünüm/sıralama sonuç başlığına taşındı.

**Başlıktaki arama** artık sayfa değiştirmiyor: yerinde gelişmiş bir
perde açıyor (tarih, misafir, gelişmiş daraltmalar) ve sağında
**sesli arama** var — tarayıcının konuşma tanıma arayüzü, ses cihazdan
çıkmıyor, desteklemeyen tarayıcıda düğme hiç görünmüyor.

**Dönen ziyaretçi**: baktığı villalar ana sayfada "Kaldığınız yerden
devam edin" olarak çıkıyor ve bakıldığı andaki fiyat şimdikiyle
karşılaştırılıyor — **indirim yapılmışsa yeşil rozetle** gösteriliyor,
eski fiyat üstü çizili. Yükselen fiyat gösterilmiyor.

Mega menü ikonları **suluboya lekesine** dönüştü: görsel dosyası yok,
leke SVG'de üretiliyor (`feTurbulence` ile dalgalı kenar), rengi
konuya bağlı ve sabit.

**Tamamlandı — Faz 98: Hero açılış sahnesi, mega menü, kurumsal sayfalar**
Ana sayfa açıldığında hero **beş saniye yalnızca fotoğrafı** gösteriyor;
fotoğraf bu sürede yavaşça yaklaşıp kayıyor (Ken Burns), sonra arama
kutusu, sayı satırı, bölge çipleri ve marka satırı **sırayla** giriyor.
Aynı sekmede ikinci ziyarette sahne atlanıyor — ana sayfaya her
dönüşünde beş saniye beklemek, efekti süsten çıkarıp engele çevirirdi.
Hareket tercihi kapalıysa sahne hiç oynamıyor; dar ekranda bekleme
yerine kısa bir sıralama var (metin fotoğrafın altında, boş beyaz ekran
olmasın diye).

**Mega menü imleç dışarı çıkınca kapanıyor.** Yana ve yukarı çıkınca
kapanıyor, aşağı çıkınca kapanmıyordu: panelin altındaki karartma
perdesi bir sözde öge (`.mega-panel::before`) ve vuruş sınamasında
kendi ögesi sayılıyor — tarayıcı imlecin hâlâ panelin üzerinde
olduğunu bildiriyor, `mouseleave` hiç tetiklenmiyordu. Perde artık
imlece görünmez.

**Sekiz kurumsal sayfa yayında 404 dönüyordu** (`/hakkimizda`,
`/iletisim`, `/gizlilik`, `/iptal-kosullari`…): içerik Faz 20'de
veritabanına taşınmış, veri yalnızca tohum betiğinde kalmıştı. Artık
`lib/icerik-varsayilan.ts` içinde ve tabloda hiç kayıt yoksa okuma
katmanı onu kullanıyor — panelden düzenleme yine tabloyu üstün
tutuyor. Ayrıntı: [docs/icerik-yonetimi.md](docs/icerik-yonetimi.md).

**SEO denetimi** iki kural kazandı: `hreflang` yalnızca gerçekten
karşılığı olan sayfada bekleniyor ve **canonical'ın ana bilgisayar
adı** sunulan adresle karşılaştırılıyor — yayında `konutprojeleri.com` ile
`www.konutprojeleri.com` ikisi de 200 dönüyor, canonical `www` olmayanı
gösteriyor. Ayrıntı: [docs/seo.md](docs/seo.md).

**Tamamlandı — Faz 99: Yükleme çubuğu**
Başlıkla içerik arasında ince bir şerit: sayfa yüklenirken renkli
dolgu ilerliyor, bitince **gri çizgi olarak kalıyor**. Dolum CSS ile
başlıyor — JavaScript'e bağlansaydı paket inene kadar çubuk %0'da
dururdu; sayfa suya inince JS ölçülen orandan devralıyor. Sayfa
geçişlerinde bağlantıya tıklandığı an başlıyor, yol değişince
tamamlanıyor. Ayrıntı: [docs/tema.md](docs/tema.md).

**Tamamlandı — Faz 100-101: Arama görünümleri, harita, kenar araçları**
Arama sayfasına **Akıllı görünüm** eklendi: sonuçlar bütçe, puan,
denize mesafe, anında onay ve kapasite şeritlerine ayrılıyor, her
şerit neden orada olduğunu söylüyor. **Harita görünümünde liste
kalktı**, harita sütunun tamamını kaplıyor; işaretçiler fiyat taşıyan
konum iğnesi oldu ve tıklanınca hızlı bakış kartı haritanın üstünde
açılıyor. Ayrıntı: [docs/arama.md](docs/arama.md).

Hero'daki açılan paneller ekran dışına taşmıyor (yükseklik kalan
boşluğa göre ölçülüyor), **"Nereye" önerisi artık sayfaya götürmüyor**
kutuyu dolduruyor, hero açılış sahnesi **günde bir kez** oynuyor.
Yatay şeritler kaydırma çubuğu yerine oklarla geziliyor
(`KaydirRay`), tatil temalarının zemini saydam ve simgeleri suluboya,
WhatsApp düğmesinin üstünde başa dön düğmesi var, hızlı işlemler
arama sayfasında sol kenara yapışık dikey bir sekme.

**Tamamlandı — Faz 102: Açılış müjdesi**
Hero'nun fotoğrafı tek başına gösterdiği beş saniyenin ortasında —
üçüncü saniyede — marka satırı ekranın ortasında beliriyor ve arama
kutusu girmeye başladığı anda kayboluyor. Arama kutusunun altındaki
**kalıcı marka satırı kaldırıldı**: müjde göründükten sonra hero'da
metin kalmıyor, ekranda yalnızca fotoğraf ve arama kutusu var. Sayfanın
`h1`'i artık o açılış satırı — belgede duruyor, dar ekranda ve sahne
atlandığında ekran okuyucuya açık biçimde gizleniyor. Yükleme
çubuğunun dolumu artık ilk boyamadan değil **gezinme anından**
itibaren sayılıyor. Ayrıntı: [docs/tema.md](docs/tema.md).

**Tamamlandı — Faz 103: Mobil denetim**
On iki sayfa 390 pikselde tarandı: yatay kaydırma hiçbir yerde yok,
36 pikselin altındaki sekiz dokunma hedefi büyütüldü (hero noktaları,
görünüm anahtarı, favori, logo, "Tümünü gör", künye bağlantıları,
bölge çipleri) ve 10–10,5 piksellik mikro etiketler 11,5'e çıkarıldı.
Ayrıntı: [docs/erisilebilirlik.md](docs/erisilebilirlik.md).

**Tamamlandı — Faz 104: Mobil alt panel**
Telefonda uygulama benzeri bir alt sekme çubuğu: Keşfet · Ara ·
**Teklif al** · Rezervasyon · Hesabım. Ortadaki sekme sitenin birincil
eylemi ve düğme gibi duruyor; hesap sekmesinde favori sayısı rozet
olarak çıkıyor. Hızlı işlemler menüsü dar ekranda kaldırıldı — aynı
yolları çubuk gösteriyor. Ayrıntı:
[docs/erisilebilirlik.md](docs/erisilebilirlik.md).

**Tamamlandı — Faz 105: Alanlı arama kutusu**
Arama kutusu simge + etiket + değer düzenine geçti, tarih iki ayrı
alana bölündü ve "Gelişmiş arama" çerçeveli bir kutu oldu. **Bölge
paneli il başlığı altında ilçe onay kutuları taşıyor ve çoklu seçim
yapılıyor** — seçilen bölgeler `bolge=kalkan,kas` olarak gidiyor,
arama katmanı `ANY(...)` ile okuyor. Ayrıntı:
[docs/arama.md](docs/arama.md).

**Tamamlandı — Faz 106: Yönetim paneli kapsamı**
Fiyat alarmları da panele geldi (`/yonetim/alarmlar`): villa kırılımında
bekleyen sayısı, beklenen en yüksek hedef ve "hedefe ulaşmış ama
bildirimi bekleyen" sayacı.
Yönetim menüsü **gruplandı** (Genel · Operasyon · Envanter · İçerik ·
Finans · Sistem) ve üstüne süzme kutusu geldi (`/` ile odaklanıyor).
**Site bilgileri panele taşındı**: unvan, telefon, WhatsApp, e-posta,
adres, belge numaraları ve sosyal hesaplar koda gömülüydü, artık
`/yonetim/ayarlar` üzerinden yönetiliyor — boş bırakılan alan koddaki
varsayılana dönüyor. Araç kiralama, bölgeler ve teklif sayfalarının
gömülü başlıkları metin kaydına alındı. Ayrıntı:
[docs/panel.md](docs/panel.md).

**Tamamlandı — Faz 107-108: Tam ekran gösteri ve tersine arama**
Tam ekran fotoğraf gösterisinde **bütün metinler üst çubuğa** taşındı
(villa adı · açıklama · sayaç · klavye ipucu tek satırda), küçük
fotoğraflar sağda dikey: fotoğraf 749 pikselden **838 piksele** çıktı.

**"Bu tarihlerde nereye gidebilirim?"** (`/nereye`): tarih, kişi ve
bütçe veriliyor, cevap bölgeler oluyor. Tutarlar vergiler ve temizlik
dâhil toplam. Ayrıntı: [docs/arama.md](docs/arama.md).

**Tamamlandı — Faz 109: Seyahat panosu**
Beğenilen villalar bir panoda toplanıp bağlantısıyla paylaşılıyor;
açan herkes **giriş yapmadan** oy veriyor ve not bırakıyor. Kartlarda
panonun tarihleri için toplam tutar ve doluluk canlı görünüyor,
sıralama oya göre. Panodaki müsait villalar için tek tuşla toplu
teklif isteniyor. Ayrıntı: [docs/pano.md](docs/pano.md).

**Tamamlandı — Faz 110: KonutProjeleri kontrol raporu**
"Her villa yerinde görüldü" vaadi tarihli ve maddeli bir kanıta
dönüştü: 22 maddelik kontrol listesi panelden dolduruluyor, villa
sayfasında ziyaret tarihi, kontrolü yapan kişi ve sonuçlarla
görünüyor. **Sorunlu maddeler gizlenmiyor** — tamamı yeşil bir rapora
kimse inanmıyor. Site simgesi de mavi V oldu. Ayrıntı:
[docs/kontrol-raporu.md](docs/kontrol-raporu.md).

**Tamamlandı — Faz 111: Konsiyerj hizmetleri**
Şef, tekne, transfer gibi hizmetler panelden yönetilen bir katalogda;
rezervasyon formunda isteğe bağlı eklenti olarak çıkıyor ve seçim
tutarı dondurularak rezervasyona yazılıyor. Tutar her zaman sunucuda
hesaplanıyor, bedel kaporaya katılmıyor. Ayrıntı:
[docs/hizmetler.md](docs/hizmetler.md).

**Tamamlandı — Faz 112: Panel kabuğu ve görünüm denetimi**
Yönetim ve ev sahibi panelleri müşteri başlığının altında açılıyordu:
kampanya şeridi, mega menü, WhatsApp balonu, hızlı işlemler ve mobil
sekme çubuğu panelin üstüne biniyordu. Panel artık **kendi kabuğunda**;
vitrin sorguları orada hiç çalışmıyor ve yönetim ziyaretleri gerçek
kullanıcı ölçümünü kirletmiyor. Her yerden **Ctrl/⌘ + K** ile açılan
komut paleti eklendi. `globals.css` ile `panel.css` arasında ikiye
ayrılmış kart/KPI tanımları tek takımda birleşti, tablo işlem sütunu
sağa yapıştı, dar ekranda kırılan menü şeridi ve takvim ızgarası
düzeldi. `/yonetim/performans` sayfasını 500'e düşüren ham sorgu hatası
da giderildi. Ayrıntı: [docs/panel.md](docs/panel.md).

**Tamamlandı — Faz 113: Harita araması, favoriler ve arayüz turu**
Haritada aynı koydaki villalar artık **kümeleniyor** (sayı + en düşük
fiyat, tıklayınca gruba sığdırıyor); haritayı oynatınca **"Bu alanda
ara"** düğmesi çıkıyor ve yanında **"Sonuçlara sığdır"** duruyor.
Başlıktaki kalp artık **/favoriler** sayfasını açıyor. Arama perdesi
sıkılaştı ve mikrofon "Ara" düğmesinin soluna geçti. WhatsApp sağ
kenarda dikey sekme oldu, logo %20 büyüdü, tam ekran gösteride
fotoğrafın köşeleri yumuşadı. Form alanları arasındaki boşluk,
rezervasyon kutusundaki misafir satırı ve fiyat dökümü puntoları
düzeltildi. Ayrıntı: [docs/arama.md](docs/arama.md).

**Tamamlandı — Faz 114: Cam güven şeridi ve sosyal kanıt rozetleri**
Hero fotoğrafının alt kenarına, villa detayındaki cam kutuyla aynı
dilde **kayan altın güven şeridi** eklendi. Villa sayfasının altında
iki **sosyal kanıt rozeti** var: canlı ziyaretçi (yeşil ping) ve
haftalık talep (konik gradyan halka + glow). **Sayılar gerçek** —
ziyaret ve teklif/rezervasyon tablolarından; eşiğin altındaysa rozet
hiç basılmıyor. Hero ve perde arama kutusu sıkılaştı, hero'ya da sesli
arama eklendi (mikrofon "Ara"nın solunda, duyulan metin ekranda).
Ayrıntı: [docs/sosyal-kanit.md](docs/sosyal-kanit.md).

**Tamamlandı — Faz 115: Perde halosu**
Açılan perdelerin çevresinde nefes alan çok renkli bir ışık: arama
perdesi, komut paleti, giriş penceresi, karşılaştırma penceresi, villa
önizlemesi, haritadaki hızlı bakış kartı ve silme onayı. `box-shadow`
değil `filter: drop-shadow` — kutuların çoğu `overflow: hidden` ve
drop-shadow kutunun gerçek alfa şeklini izliyor. Ayrıntı:
[docs/tema.md](docs/tema.md).

**Tamamlandı — Faz 116: Ana sayfa kanıt şeridi**
Hero'nun hemen altında üç kutu: yerinde kontrol oranı ve son kontrol
tarihi, kapora güvencesinin somut cümlesi, fotoğraf vaadi ve son çekim
tarihi. Üstteki şeritler vaadi söylüyor, burası aynı vaadi **tarihli
sayılarla** kanıtlıyor — oran gösteriliyor, "hepsi" denmiyor. Metinler
panelden düzenlenebiliyor. Canlı ziyaretçi rozeti on saniye sonra
kendiliğinden çekiliyor; rozetlere halo, perde içindeki birincil
düğmelere glow + ping eklendi. Ayrıntı:
[docs/sosyal-kanit.md](docs/sosyal-kanit.md).

**Tamamlandı — Faz 117: Satılık villa**
Villa artık **kiralık ya da satılık** olabiliyor. Satılık ilanda
gecelik fiyat, takvim ve rezervasyon yerine satış bedeli, ₺/m², tapu
durumu, arsa alanı, bina yaşı, aidat, kredi/takas bilgisi ve "yerinde
görme randevusu" var. İki envanter birbirine karışmıyor: kiralık arama
satılık ilanı, satılık listesi kiralık villayı göstermiyor. Başlığa
**Satılık Villa** menüsü, `/satilik` listesi ve panele **tipe göre
yönetim** (tip süzgeci + satış alanları) eklendi. Ayrıntı:
[docs/satilik.md](docs/satilik.md).

**Tamamlandı — Faz 118: Satılık ilanda iletişim yolları**
Satış kutusunda fiyatın altına üç eylem geldi: randevu, **"Sizi
arayalım"** perdesi (yalnızca ad ve telefon; e-posta istenmiyor) ve
maskeli telefon (**"Numarayı göster"**). Talepler ayrı bir tabloda ve
**/yonetim/aramalar** ekranında durum + not ile yönetiliyor. Kırıntı
yolu, metadata, JSON-LD (`SingleFamilyResidence`), fiyat alarmı,
rezervasyon rotası ve site haritası da satılık tipine göre güncellendi.
Ayrıntı: [docs/satilik.md](docs/satilik.md).

**Tamamlandı — Faz 119: Ev sahibi sayfaları iki ilan türüne ayrıldı**
`/ev-sahibi-ol` yalnızca kiralamayı anlatıyordu; satmak için gelen kişi
komisyon, iCal senkronu ve "ödemeniz misafir girişinden sonra"
cümlelerini okuyordu. Sayfa **kiraya vermek / satmak / ikisinde de
aynı** olarak üçe ayrıldı ve kendi CTA'sını aldı. Başvuru sayfasında
adımlar ve "Ne sağlıyoruz?" listesi hangi vaadin hangi ilan türünde
geçerli olduğunu yazıyor; form niyeti açıkça soruyor. Tohumlama
betiğine **`--sayfa=slug`** ve CTA alanları eklendi. Ayrıntı:
[docs/satilik.md](docs/satilik.md).

**Tamamlandı — Faz 120: İlan gövdesi de satılık tipine ayrıldı**
Satış kutusu ayrılmıştı ama ilan gövdesi hâlâ kiralık ilanın
gövdesiydi: sezonluk fiyat tablosu, ev kuralları, iptal politikası,
"ev sahibine soru sorun", "misafir kapasitesi" ve gecelik fiyatlı
benzer villa kartları duruyordu. Her bölüm artık tipe bakıyor; benzer
ilanlar da tip içinde aranıyor. Ayrıntı:
[docs/satilik.md](docs/satilik.md).

**Tamamlandı — Faz 121: Yüzen araçlar sağ kenarda tek sütunda**
Hızlı işlemler sol altta yatay bir hap, WhatsApp sağ kenarda dikey bir
sekmeydi; ekranın iki köşesi birden doluydu ve hap arama sayfasında
sayfaya özel dikey bir biçime dönüşüyordu. İkisi de sağ kenarda tek
sütuna alındı: hap WhatsApp sekmesinin hemen üstünde, konum tek bir
`--wa-yukseklik` değişkeninden besleniyor. Menü artık yukarı değil
yana açılıyor — dikey ortada bir hapın üstünde açılan 560 pikselik
liste ekranın üst kenarından taşıyordu. Ayrıntı:
[docs/tema.md](docs/tema.md).

**Tamamlandı — Faz 122: Satılık ilanın çevresindeki boşluklar**
İlan sayfası tipe göre ayrılmıştı, ilanın DIŞINDAKİ yüzeyler
ayrılmamıştı. En görünürü: "Yerinde görmek için randevu" düğmesi
kiralık teklif formuna gidiyor, alıcıya misafir sayısı ve giriş
tarihi soruyordu — artık aynı perde randevu niyetiyle açılıyor ve
talep ekibe bildirim atıyor (hiç atmıyordu). Ayrıca: favoriler
satılık ilanı sessizce kaybediyordu, "son baktıklarınız" satış
bedelini "/ gece" diye yazıyordu, pano satılık ilan alıyordu, bölge
sayaçları iki envanteri topluyordu, yeni villa formu satılık kayıt
açamıyordu. Bulunabilirlik: altbilgi, hızlı işlemler, başlık arama
önerileri, bölge sayfası bağlantısı, /satilik bölge süzgeci ve
sıralama. Ayrıntı: [docs/satilik.md](docs/satilik.md).

**Tamamlandı — Faz 123: Göç zinciri boş veritabanında oynatılabilir**
`prisma migrate deploy` boş bir veritabanında kırılıyordu: 
20260814140000_ceviri_tablolari dosya adında yanlış sırada — okuduğu
`*En` sütunlarını 17 ve 19 Ağustos göçleri oluşturuyor. Üretim
etkilenmiyordu (göçler yazıldıkça uygulanmıştı) ama sıfırdan bir ortam
kurulamıyor ve `migrate dev` çalışmıyordu. Klasörü yeniden
adlandırmak üretimi kilitliyor (denendi); yerine göç sıradan bağımsız
hâle getirildi ve düşürme işi zincirin sonuna taşındı. Üretime
dokunulmuyor. Yan düzeltme: üç şema sapması kapandı. Ayrıntı:
[docs/veritabani.md](docs/veritabani.md).

**Sırada**
Rakip raporundaki maddelerin tamamı kapatıldı. Yayına almadan önce
gereken adımlar ve sonraki fikirler:
[docs/rakip-analizi.md](docs/rakip-analizi.md)

Rusça rota ağacını açmak (`/ru` dosyaları + `ROTA_AGACI.ru`), ardından
Arapça + RTL yerleşim.
Görselleri CDN önüne almak (soyutlama hazır, hesap gerekiyor).
Ekran okuyucuyla gerçek kullanım testi bir kullanıcı gerektiriyor.
Kanal yöneticisi entegrasyonu sizin hesap bilgilerinizi bekliyor.
KVKK tarafında VERBİS kaydı ve imha politikası belgesi kurumsal
adımlar — kod hazır, evrak sizde.

## Notlar

- Görseller Unsplash'ten örnek amaçlı çekiliyor; yayına almadan önce kendi CDN'imize taşınacak.
- Fiyatlar, yorumlar ve villalar temsilîdir; gerçek bir hizmet değildir.
- Alan adı `lib/site.ts` içinde tanımlı; `NEXT_PUBLIC_SITE_URL` ile geçersiz kılınabilir.
