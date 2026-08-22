import type { SayfaIcerigi } from './icerik';
import { site } from './site';

/* ============================================================
   Kurumsal sayfaların KODA GÖMÜLÜ hâli.

   İçerik `sayfa` tablosunda duruyor ve panelden düzenleniyor. Veri
   yalnızca tohum betiğinin içinde olsaydı, tohumlanmamış bir
   veritabanında (yeni kurulum, yeni yayın ortamı) `/hakkimizda`,
   `/iletisim`, `/gizlilik` gibi ON SAYFA birden 404 dönerdi —
   üstelik altbilgi hepsine bağlantı veriyor.

   Bu yüzden veri burada duruyor; hem tohum betiği hem de okuma
   katmanı aynı kaynağı kullanıyor. Veritabanındaki kayıt her zaman
   ÜSTÜN: burası yalnızca hiç kayıt yokken devreye giriyor.

   METİNLERDE SAYI YOK. Proje sayısı, ortalama yanıt süresi, "kaç
   bölgede" gibi rakamlar hızla eskiyen ve doğrulanması gereken
   şeyler; koda gömülü bir varsayılanda uydurulmuş bir rakam sitenin
   en zararlı yanlış bilgisi olurdu. Güncel sayılar veriden gelen
   bileşenlerde gösteriliyor.
   ============================================================ */

/** Tabloya yazılmamış içerik: `slug` anahtarda, `indexle` isteğe bağlı. */
export type VarsayilanSayfa = Omit<SayfaIcerigi, 'slug' | 'indexle'> & { indexle?: boolean };

export const VARSAYILAN_SAYFALAR: Record<string, VarsayilanSayfa> = {
  'nasil-calisir': {
    baslik: 'Nasıl Çalışır?',
    h1: 'KonutProjeleri nasıl çalışır?',
    aciklama: `${site.ad}’nde proje arama, karşılaştırma ve satış ekibiyle temas süreci adım adım: filtreleme, daire tipi ve fiyat bilgisi, talep formu ve randevu.`,
    govde: [
      { p: `${site.ad}, Türkiye’deki yeni konut, villa ve ofis projelerini tek yerde toplayan bir tanıtım platformu. Burada bir şey satın almıyorsunuz: beğendiğiniz projenin satış ekibiyle doğrudan temas kuruyorsunuz. Aradaki farkımız basit — listelediğimiz her projeyi yayına almadan önce ekibimiz şantiyede yerinde inceliyor, ruhsat ve tapu durumunu kontrol ediyor, ilerleme oranını kendi gözüyle doğruluyor.` },
      { h: '1. Arama ve filtreleme', p: 'Bölge, proje tipi ve bütçeyle başlayın. Ardından alım kararını gerçekten belirleyen filtrelerle daraltın: oda sayısı, en az metrekare, teslim tarihi, peşinat oranı, vade, krediye uygunluk ve takas. Listede gördüğünüz her fiyat, projenin en küçük daire tipinin başlangıç fiyatı; “…’den başlayan” ifadesi tam olarak bunu anlatıyor.' },
      { h: '2. Daire tipleri ve gerçek fiyat', p: 'Proje sayfasında her daire tipi ayrı satır: oda sayısı, brüt ve net metrekare, banyo sayısı, kat planı ve o tipe ait fiyat aralığı. Net ile brüt arasındaki fark alıcının en sık yanıldığı yer olduğu için ikisi de yazılı. Kalan daire sayısı biliniyorsa o da gösteriliyor.' },
      { h: '3. Ödeme koşulları', liste: [
        'Peşinat oranı ve firmanın kendi vadesi proje sayfasında yazılı.',
        'Peşinat oranı %0 görünüyorsa “peşinatsız” değil “belirtilmemiş” demektir; filtrede de öyle işlenir.',
        'Krediye uygunluk ve takas kabulü ayrı ayrı belirtiliyor.',
        'Aidat tahmini varsa yazılı — teslim sonrası aylık gideriniz bu.',
      ] },
      { h: '4. Talep ve randevu', p: 'Formda yalnızca adınız ve telefon numaranız zorunlu. Talebiniz doğrudan projenin satış ekibine iletiliyor ve size bir talep kodu veriliyor; durumunu o kodla sorgulayabiliyorsunuz. Randevu isterseniz satış ofisinin adresi ve saati teyit e-postasıyla geliyor.' },
      { h: 'Ücret alıyor musunuz?', p: 'Alıcıdan hiçbir ücret alınmıyor. Satıştan da pay almıyoruz: hangi projenin öne çıkacağını komisyon oranı belirlemiyor.' },
    ],
    sss: [
      { s: 'Fiyatlar güncel mi?', c: 'Fiyatları geliştirici firma kendi panelinden güncelliyor ve her projede son güncelleme tarihi görünüyor. Yine de inşaat sektöründe fiyat sık değişiyor; görüşmede teyit etmenizi öneririz. Fiyat düştüğünde haber almak isterseniz proje sayfasından fiyat alarmı kurabilirsiniz.' },
      { s: 'Teslim tarihi kesin mi?', c: 'Teslim tarihi bir taahhüt ama sektörde sapma yaygın. Bu yüzden gün değil çeyrek gösteriyoruz — “2027 2. çeyrek” gibi. Kararınızı verirken firmanın daha önce teslim ettiği proje sayısına ve inşaatın bugünkü ilerleme oranına bakın; ikisi de sayfada yazılı.' },
      { s: 'Numaram başka firmalara veriliyor mu?', c: 'Hayır. Bilgileriniz yalnızca talep ettiğiniz projenin satış ekibine iletiliyor. Başka firmalara, veri satın alan üçüncü taraflara ya da reklam ağlarına aktarılmıyor.' },
    ],
  },

  'yerinde-inceleme': {
    baslik: 'Yerinde İnceleme',
    h1: 'Her projeyi yerinde inceliyoruz',
    aciklama: `${site.ad} ekibi her projeyi yayına almadan önce şantiyede geziyor: ruhsat, tapu durumu, ilerleme oranı ve örnek daire ölçüsü yerinde doğrulanıyor.`,
    govde: [
      { p: 'Proje tanıtımında alıcının kendi başına doğrulayamadığı çok şey var: ruhsat gerçekten alınmış mı, kat irtifakı kurulmuş mu, “%60 tamamlandı” denen şantiyede gerçekten ne yapılmış, örnek daire satılan tiple aynı ölçüde mi. Reklam bunların hiçbirini söylemiyor.' },
      { h: 'Neye bakıyoruz?', liste: [
        'Yapı ruhsatı, imar durumu ve tapu türü — sitede yazan neyse, belgede de o olmalı.',
        'İlerleme oranı: şantiyedeki durum ilanda yazan yüzdeyle karşılaştırılıyor.',
        'Örnek daire metreyle ölçülüyor; kat planındaki ölçüyle tutmuyorsa yazılıyor.',
        'Net ve brüt farkı açıkça soruluyor — alıcının en sık yanıldığı yer.',
        'İlandaki sosyal tesislerin projede karşılığı var mı, hangi etapta teslim ediliyor.',
        'Otopark hakkının daireye mi projeye mi bağlı olduğu.',
        'Metro ve ana arter mesafesi yürüyerek ölçülüyor.',
        'Komşu parsellerin imar durumu — manzara vaadi ancak bu kontrolle anlam taşıyor.',
      ] },
      { h: 'Raporu kim görüyor?', p: 'İnceleme raporu proje sayfasında herkese açık: ziyaret tarihi, incelemeyi yapan kişi ve madde madde sonuçlar. “Kaldı” işaretli maddeler de yayınlanıyor — yalnızca geçenleri göstermek raporu reklama çevirirdi.' },
      { h: 'Görseller', p: 'Şantiye görsellerini biz çekiyoruz. Firmadan gelen görselleştirmeler ayrı bir kategoride duruyor ve “render” olduğu belirtiliyor; bir görselleştirmeyi bugünkü hâl gibi göstermek en sık karşılaşılan yanıltma.' },
      { p: 'İnceleme yapılmamış bir proje yayına alınmıyor. Raporu olmayan bir kayıt görürseniz bize bildirin.' },
    ],
  },

  'firma-rehberi': {
    baslik: 'Firmalar İçin Rehber',
    h1: 'Geliştirici firmalar için rehber',
    aciklama: 'Proje tanıtımı, daire tipi ve fiyat yönetimi, doğrudan satış talebi. Yerinde inceleme ücretsiz, listeleme bedeli yok — süreç adım adım.',
    ctaMetin: 'Başvuru formunu doldurun',
    ctaYol: '/firma-basvuru',
    govde: [
      { p: `${site.ad} bir ilan sitesi değil: projeyi yayına almadan önce ekibimiz şantiyede yerinde inceliyor. Bu yüzden listeleme süreci bir formdan uzun ama listelenen proje de alıcı gözünde başka bir yerde duruyor.` },
      { h: 'Süreç nasıl işliyor?', liste: [
        'Başvuru formunu doldurursunuz; 2 iş günü içinde telefonla dönüyoruz.',
        'Ekibimiz şantiyeyi ziyaret eder, ruhsat ve tapu durumunu kontrol eder, görselleri çeker — ücretsiz.',
        'Panel hesabınız açılır; proje künyesini, daire tiplerini, kat planlarını ve fiyatları oradan yönetirsiniz.',
        'İnceleme raporu ve proje sayfası birlikte yayına girer.',
        'Gelen talepler doğrudan size düşer: telefon, bütçe, ilgilendiği daire tipi ve uygun görüşme saatiyle birlikte.',
      ] },
      { h: 'Ne ödüyorsunuz?', p: 'Listeleme bedeli yok, satıştan komisyon yok. Gelir modelimiz projelerin tanıtım bütçesine dayanıyor ve koşulları görüşmede net olarak konuşuluyor. Arama sıralaması satın alınamıyor — bunu bir gelir kalemi hâline getirmek, sitenin alıcı gözündeki tek değerini yok ederdi.' },
      { h: 'Panelde ne yapıyorsunuz?', liste: [
        'Daire tipi ekleme: oda sayısı, brüt/net metrekare, banyo, kat planı, fiyat aralığı ve kalan adet.',
        'Fiyat ve ödeme koşulu güncelleme: peşinat oranı, vade, krediye uygunluk, takas.',
        'İnşaat ilerleme oranını ve teslim tarihini güncelleme.',
        'Gelen talepleri görme, durum işaretleme ve ekip notu yazma.',
        'Ziyaretçi sorularını yanıtlama.',
      ] },
      { h: 'Proje adı ve konumu neden panelde kilitli?', p: 'Proje adı, bölgesi ve koordinatı yerinde doğruladığımız bilgiler ve bölge sayfalarının dayanağı. Bunları değiştirmek isterseniz bize yazın; ekip kontrol edip günceller.' },
      { p: 'Henüz lansmanı yapılmamış projeler de listelenebiliyor: “yakında” aşamasındaki bir projeye alarm kuran ziyaretçi, satışa çıktığı gün haber alıyor.' },
    ],
  },

  'sikca-sorulanlar': {
    baslik: 'Sıkça Sorulan Sorular',
    h1: 'Sıkça sorulan sorular',
    aciklama: 'Proje seçimi, daire tipleri, ödeme koşulları, teslim tarihi ve talep süreciyle ilgili en sık sorulan sorular ve yanıtları.',
    govde: [{ p: 'Aradığınız yanıtı burada bulamazsanız ekibimize yazabilirsiniz.' }],
    sss: [
      { s: 'Sitede yazan fiyat neyin fiyatı?', c: 'Projenin en küçük daire tipinin başlangıç fiyatı. Bir projenin tek fiyatı olmuyor: 1+1 ile 4+1 arasında ciddi fark var. Bu yüzden kartlarda “…’den başlayan” yazıyor ve tip bazlı fiyatlar proje sayfasındaki tabloda duruyor.' },
      { s: 'Net metrekare ile brüt metrekare farkı ne?', c: 'Brüt, duvarlar ve ortak alan payı dâhil toplam alan; net, dairenin içinde fiilen kullandığınız alan. Aradaki fark projeden projeye %15–25 arasında değişiyor. Karşılaştırma yaparken net üzerinden yapın; iki projede aynı brüt metrekare, farklı net alan anlamına gelebiliyor.' },
      { s: 'Peşinat oranı %0 yazıyor, peşinatsız mı?', c: 'Hayır — “belirtilmemiş” demek. Firma peşinat oranını girmemişse sıfır görünüyor ve peşinat filtresinde çıkmıyor. Peşinatsız satış iddiası varsa proje sayfasında açıkça yazar.' },
      { s: 'Teslim tarihi neden gün olarak yazmıyor?', c: 'Hiçbir projede teslim güne kadar kesin değil ve gün yazmak tutulamayacak bir söz vermek olurdu. Bu yüzden çeyrek gösteriyoruz. İnşaat ilerleme oranıyla birlikte okursanız gerçekçi bir aralık çıkıyor.' },
      { s: 'Aidat neye göre belirleniyor?', c: 'En büyük iki kalem kapalı havuz ve fitness gibi sosyal tesisler ile güvenlik. Aidatı metrekareye göre değil, sosyal tesis listesine bakarak tahmin edin. Sitede yazan tutar firmanın beyanı ve teslim sonrası değişebiliyor.' },
      { s: 'Talep formunu doldurursam ne oluyor?', c: 'Bilgileriniz yalnızca o projenin satış ekibine iletiliyor ve size bir talep kodu veriliyor. Ekip genellikle aynı gün içinde arıyor. Aranmak istemediğiniz bir saat varsa formda belirtebilirsiniz.' },
      { s: 'Numaram başka firmalara satılıyor mu?', c: 'Hayır. Talebiniz yalnızca ilgilendiğiniz projeye gidiyor. Kişisel verilerinizin silinmesini istediğinizde KVKK sayfamızdaki formu doldurmanız yeterli.' },
      { s: 'Yabancıyım, konut alabilir miyim?', c: 'Türkiye’de yabancıların konut edinmesi mümkün ve pek çok projede yabancı alıcıya satış yapılıyor; askeri yasak bölge sorgusu ve tapu işlemleri için firmanın satış ekibi yönlendirme yapıyor. Biz hukuki danışmanlık vermiyoruz.' },
      { s: 'Proje sayfasındaki görseller gerçek mi?', c: 'Şantiye görsellerini ekibimiz çekiyor. Firmadan gelen üç boyutlu görselleştirmeler ayrı kategoride ve “render” olarak işaretli; ikisi karıştırılmıyor.' },
    ],
  },

  hakkimizda: {
    baslik: 'Hakkımızda',
    h1: `${site.ad} hakkında`,
    aciklama: `${site.ad}, Türkiye’deki yeni konut, villa ve ofis projelerini yerinde inceleyerek listeleyen bir tanıtım platformudur.`,
    govde: [
      { p: `${site.ad}, yeni proje satışındaki üç kronik sorunu çözmek için kuruldu: görsellerin bugünkü şantiyeyi yansıtmaması, fiyatın “bilgi alın” arkasına saklanması ve teslim tarihinin belirsiz bırakılması.` },
      { h: 'Ne yapıyoruz?', p: 'Konut, villa ve ofis projelerini tek yerde topluyoruz ve her birini yayına almadan önce şantiyede yerinde inceliyoruz. İnceleme raporu — geçen ve kalan maddeleriyle birlikte — proje sayfasında açık duruyor.' },
      { h: 'Ne yapmıyoruz?', p: 'Emlak danışmanlığı yapmıyoruz, satışa aracılık etmiyoruz ve satıştan pay almıyoruz. Sitede gördüğünüz sıralama satın alınamıyor. Yatırım tavsiyesi de vermiyoruz: sayfalardaki bölge notları genel düzeyde bilgi, getiri vaadi değil.' },
      { h: 'Nasıl kazanıyoruz?', p: 'Gelirimiz geliştirici firmaların tanıtım bütçesinden geliyor. Bu ilişki alıcıya gösterilen bilgiyi değiştirmiyor: fiyat, teslim tarihi ve inceleme raporu her projede aynı biçimde yayınlanıyor.' },
    ],
  },

  iletisim: {
    baslik: 'İletişim',
    h1: 'İletişim',
    aciklama: `${site.ad} ekibine ulaşın: proje soruları, firma başvuruları ve KVKK talepleri için e-posta, telefon ve adres bilgileri.`,
    govde: [
      { p: 'Mesajlarınızı bir kişi okuyor ve yanıtlıyor.' },
      /* Adres satırı BOŞSA HİÇ BASILMIYOR: `site.adres` alanları
         yayına almadan önce doldurulacak ve boş bırakıldığında liste
         boş bir madde işaretiyle çıkıyordu. */
      { liste: [
        `E-posta: ${site.eposta}`,
        `Telefon: ${site.telefon}`,
        [site.adres.sokak, [site.adres.ilce, site.adres.il].filter(Boolean).join(' / ')]
          .filter(Boolean).join(', '),
      ].filter(Boolean) },
      { h: 'Bir proje hakkında yazıyorsanız', p: 'Talep kodunuzu (TLP- ile başlıyor) ekleyin; talebin hangi projeye ait olduğunu ve hangi aşamada olduğunu hemen görebiliyoruz.' },
      { h: 'Projenizi listelemek istiyorsanız', p: 'Başvuru formunu doldurun ya da doğrudan yazın. Yerinde incelemediğimiz bir projeyi listelemiyoruz.' },
    ],
  },

  gizlilik: {
    baslik: 'KVKK ve Gizlilik Politikası',
    h1: 'KVKK ve gizlilik politikası',
    aciklama: `${site.ad} kişisel verilerin korunması, çerez kullanımı, veri saklama süreleri ve KVKK kapsamındaki haklarınız — başvuru yolları dâhil.`,
    indexle: false,
    govde: [
      { p: 'Bu sayfa, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında hazırlanmıştır ve demo sürümde örnek metin içermektedir.' },
    ],
  },
};

export const VARSAYILAN_SAYFALAR_EN: Record<string, VarsayilanSayfa> = {
  'how-it-works': {
    baslik: 'How It Works',
    h1: `How ${site.ad} works`,
    aciklama: `Searching, comparing and contacting a developer’s sales team — the whole process at ${site.ad}, step by step.`,
    govde: [
      { p: `${site.ad} brings together new residential, villa and office developments across Türkiye. You do not buy anything here: you make direct contact with the sales team of the development you are interested in. What makes us different is simple — our team visits every development on site before it goes live, checks the building permit and title status, and verifies the stated construction progress with its own eyes.` },
      { h: '1. Search and filter', p: 'Start with the district, the type of development and a budget. Then narrow with the filters that actually decide a purchase: number of rooms, minimum floor area, delivery date, down-payment share, instalment term, mortgage eligibility and part-exchange. Every price you see in a listing is the starting price of the smallest unit type — that is what "from" means.' },
      { h: '2. Unit types and the real price', p: 'On the development page each unit type is a separate row: room count, gross and net square metres, bathrooms, floor plan and the price range for that type. The difference between net and gross is where buyers most often go wrong, so both are shown. Where the number of remaining units is known, that is shown too.' },
      { h: '3. Payment terms', liste: [
        'The down-payment share and the developer’s own instalment term are stated on the page.',
        'A down payment shown as 0% means "not stated", not "no deposit required".',
        'Mortgage eligibility and part-exchange are listed separately.',
        'Where a service-charge estimate exists it is shown — that is your monthly cost after handover.',
      ] },
      { h: '4. Enquiry and appointment', p: 'Only your name and phone number are required. Your enquiry goes straight to that development’s sales team and you receive an enquiry code you can use to check its status. If you ask for an appointment, the sales office address and time arrive by email.' },
      { h: 'Do you charge buyers?', p: 'No. We also take no commission on sales, so no commission rate decides which development gets shown first.' },
    ],
    sss: [
      { s: 'Are the prices current?', c: 'Developers update prices from their own panel and each development shows when it was last updated. Construction prices move quickly, so confirm the figure in your conversation. You can also set a price alert on any development.' },
      { s: 'Is the delivery date firm?', c: 'It is a commitment, but slippage is common in the sector. That is why we show a quarter rather than a day. Read it alongside the developer’s completed-project count and the current construction progress — both are on the page.' },
      { s: 'Will my number be passed to other companies?', c: 'No. Your details go only to the sales team of the development you asked about — never to other developers, data brokers or ad networks.' },
    ],
  },

  'site-inspection': {
    baslik: 'Site Inspection',
    h1: 'We inspect every development on site',
    aciklama: `Before a development goes live, the ${site.ad} team visits the construction site: permit, title status, progress and show-flat dimensions are all verified in person.`,
    govde: [
      { p: 'There is a lot a buyer cannot verify alone: whether the building permit has actually been issued, whether the title has been converted, what "60% complete" really means on that particular site, whether the show flat matches the unit being sold. Marketing material answers none of this.' },
      { h: 'What we check', liste: [
        'Building permit, zoning status and title type — the page must say what the document says.',
        'Construction progress: what is on site, compared with the percentage in the listing.',
        'The show flat is measured against the floor plan.',
        'The net-versus-gross difference is asked explicitly.',
        'Whether the listed amenities exist in the plans, and in which phase they are delivered.',
        'Whether the parking right belongs to the unit or to the development.',
        'Walking distance to the metro and main roads, timed on foot.',
        'The zoning status of neighbouring plots — a view claim means nothing without this.',
      ] },
      { h: 'Who sees the report?', p: 'The inspection report is public on the development page: visit date, who carried it out, and the results item by item. Items marked as failed are published too — showing only the passes would turn the report into advertising.' },
      { h: 'Photographs', p: 'We take the site photographs ourselves. Developer-supplied renders are kept in a separate category and labelled as such; presenting a render as the current state is the most common form of misdirection in this market.' },
    ],
  },

  'list-your-development': {
    baslik: 'List Your Development',
    h1: `List your development on ${site.ad}`,
    aciklama: 'For developers: present your project, manage unit types and prices, and receive enquiries directly. Site inspection is free and there is no listing fee.',
    ctaMetin: 'Fill in the application form',
    ctaYol: '/firma-basvuru',
    govde: [
      { p: `${site.ad} is not a classifieds site: our team inspects the site before a development goes live. That makes listing slower than filling in a form — and it is also why a listed development carries more weight with buyers.` },
      { h: 'How it works', liste: [
        'You fill in the application form; we call you back within two working days.',
        'Our team visits the site, checks the permit and title status and takes the photographs — free of charge.',
        'Your panel account is opened; you manage the development details, unit types, floor plans and prices from there.',
        'The inspection report and the development page go live together.',
        'Enquiries come straight to you, with phone number, budget, the unit type of interest and preferred call times.',
      ] },
      { h: 'What does it cost?', p: 'No listing fee and no sales commission. Our revenue comes from developers’ marketing budgets, on terms agreed in conversation. Search ranking cannot be bought — turning that into a revenue line would destroy the only thing the site is worth to a buyer.' },
      { h: 'Why are the name and location locked?', p: 'A development’s name, district and coordinates are what we verified on site and what the district pages are built on. If they need to change, write to us and the team will check and update them.' },
    ],
  },

  faq: {
    baslik: 'Frequently Asked Questions',
    h1: 'Frequently asked questions',
    aciklama: 'Common questions about choosing a development in Türkiye: unit types, payment terms, delivery dates and what happens after you enquire.',
    govde: [
      { p: 'If your question is not answered here, email us — a person replies, in English.' },
    ],
    sss: [
      { s: 'What price is shown in the listing?', c: 'The starting price of the smallest unit type. A development does not have a single price: the gap between a one-bedroom and a four-bedroom is substantial. That is why cards say "from", with per-type prices in the table on the development page.' },
      { s: 'What is the difference between net and gross area?', c: 'Gross includes walls and a share of common areas; net is what you actually use inside the flat. The gap runs between 15% and 25% depending on the development. Compare on net — the same gross figure can mean noticeably different living space.' },
      { s: 'The down payment shows 0%. Is there no deposit?', c: 'No — it means "not stated". Where the developer has not entered a figure it shows as zero and the development does not appear in down-payment filters. Genuine no-deposit terms are stated explicitly on the page.' },
      { s: 'Why is the delivery date not an exact day?', c: 'No development is precise to the day, and quoting one would be a promise that cannot be kept. We show a quarter instead. Read it together with the construction progress figure for a realistic range.' },
      { s: 'How is the service charge set?', c: 'The two largest items are amenities — indoor pool, gym — and security. Estimate from the amenity list rather than the floor area. The figure on the page is the developer’s own estimate and can change after handover.' },
      { s: 'Can foreigners buy property in Türkiye?', c: 'Yes, and most developments sell to international buyers. The developer’s sales team handles the military-zone check and the title process. We do not provide legal advice.' },
      { s: 'What happens after I enquire?', c: 'Your details go to that development’s sales team and you get an enquiry code. The team usually calls the same day. If there are hours you would rather not be called, say so in the form.' },
      { s: 'Are the photographs real?', c: 'The site photographs are ours. Developer renders sit in a separate category and are labelled as renders; the two are never mixed.' },
    ],
  },

  about: {
    baslik: `About ${site.ad}`,
    h1: `About ${site.ad}`,
    aciklama: `${site.ad} lists new residential, villa and office developments in Türkiye that our team has inspected on site. How we verify listings and how we make money.`,
    govde: [
      { p: `${site.ad} exists to fix three chronic problems in new-build sales: photographs that do not show the current site, prices hidden behind "request information", and delivery dates left vague.` },
      { h: 'What we do', p: 'We bring residential, villa and office developments together in one place and inspect each one on site before it goes live. The inspection report — including the items that failed — stays public on the development page.' },
      { h: 'What we are not', p: 'We are not estate agents, we do not broker sales and we take no cut of one. Ranking cannot be bought. We also give no investment advice: the district notes on this site are general context, not a promise of returns.' },
      { h: 'How we make money', p: 'From developers’ marketing budgets. That relationship does not change what a buyer sees: price, delivery date and inspection report are published the same way for every development.' },
    ],
  },

  contact: {
    baslik: 'Contact',
    h1: 'Contact us',
    aciklama: `How to reach the ${site.ad} team: email, phone and address, plus what to include when you write about an enquiry or about listing your own development.`,
    govde: [
      { p: 'A person reads every message. We reply in English, usually within a few hours during Turkish working hours (UTC+3).' },
      { h: 'Get in touch', liste: [
        `Email: ${site.eposta}`,
        `Phone: ${site.telefon}`,
        [site.adres.sokak, [site.adres.ilce, site.adres.il].filter(Boolean).join(' / ')]
          .filter(Boolean).join(', '),
      ].filter(Boolean) },
      { h: 'About an existing enquiry', p: 'Include your enquiry code (it starts with TLP-). That lets us see which development it relates to and where it stands.' },
      { h: 'Listing your development', p: 'Write to us with the location and a few photographs, or use the application form. We do not list developments we have not visited.' },
    ],
  },
};

/** Koda gömülü sayfaları okuma katmanının beklediği biçime çevirir. */
export function varsayilanSayfalar(dil: 'TR' | 'EN'): SayfaIcerigi[] {
  const kayit = dil === 'EN' ? VARSAYILAN_SAYFALAR_EN : VARSAYILAN_SAYFALAR;
  return Object.entries(kayit)
    .map(([slug, s]) => ({ ...s, slug, indexle: s.indexle ?? true }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
