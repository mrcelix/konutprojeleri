import type { BolgeIcerik } from '../lib/types';

/* ============================================================
   Bölgeye özgü editöryel içerik.

   Her bölge kendi metnine sahip — şablon cümle yok. Amaç:
   (1) bölge sayfalarının birbirinin kopyası olmaması,
   (2) uzun kuyruk sorgulara ("ataşehir mi kartal mı", "başakşehir
       metro") gerçek yanıt veren derinlik.

   METİNLER GENEL DÜZEYDE DOĞRU tutuluyor: bir ilçenin karakteri,
   ulaşım hatları ve çevresindeki yapılar. Fiyat, arsa değeri ve
   getiri oranı gibi hızla eskiyen ve doğrulanması gereken sayılar
   BİLEREK YOK — tohum verisinde uydurulmuş bir yatırım getirisi,
   sitenin en zararlı yanlış bilgisi olurdu.
   ============================================================ */

export const BOLGE_ICERIK: Record<string, BolgeIcerik> = {
  /* ------------------------------------------------- ATAŞEHİR */
  atasehir: {
    giris: [
      'Ataşehir, İstanbul’un Anadolu yakasında planlı olarak kurulmuş nadir ilçelerden. Sokak dokusu ve ada büyüklükleri baştan çizildiği için parseller büyük; bu da bölgedeki projelerin site ölçeğinde, sosyal donatılı ve çok bloklu olmasının temel sebebi.',
      'İlçenin bugünkü çekim gücünü belirleyen şey Finans Merkezi hattı. Kurumsal ofis yoğunluğu, konut talebini "işe yakın oturmak" ekseninde topluyor ve bölgedeki karma projelerin (konut + ofis) oranını Türkiye ortalamasının belirgin üstüne çıkarıyor.',
      'Ataşehir’i komşularından ayıran ikinci özellik ulaşım çeşitliliği. Metro, metrobüs bağlantısı ve TEM/E-5 arasındaki konumu sayesinde ilçe hem Avrupa yakasına hem Sabiha Gökçen’e makul sürelerde bağlanıyor — proje seçiminde "hangi kapıya yakın" sorusu burada gerçekten anlamlı.',
    ],
    mevkiler: [
      { ad: 'Barbaros', metin: 'Finans Merkezi’ne en yakın mahalle. Yeni projelerin çoğu burada ve fiyat aralığı ilçenin üst bandında. Ofis yoğunluğu yüksek olduğu için hafta içi trafik akşam saatlerinde yoğunlaşıyor.' },
      { ad: 'Ataşehir Bulvarı çevresi (Küçükbakkalköy)', metin: 'Karma kullanımın en yoğun olduğu hat. Zemin katları ticari, üstü konut olan projeler burada toplanıyor; markete ve kafeye inmek için araca ihtiyaç duyulmuyor.' },
      { ad: 'İçerenköy', metin: 'Görece daha eski yapı stoku, dönüşüm projelerinin yoğunlaştığı bölge. Yeni proje sayısı Barbaros’a göre az ama parsel başına birim sayısı daha düşük — daha az komşulu site arayanların baktığı yer.' },
      { ad: 'Yenisahra', metin: 'Metro hattına yürüme mesafesi en kısa mahallelerden. Konut ağırlıklı, ticari yoğunluk düşük; ilçenin daha sakin tarafı.' },
    ],
    yatirim: [
      { baslik: 'Kiracı profili', not: 'Finans Merkezi ve çevresindeki kurumsal ofisler, bölgede beyaz yakalı kiracı talebini sürekli kılıyor. 1+1 ve 2+1 tipler bu talebin ana hedefi; 4+1 ve üzeri tiplerde kiracı havuzu belirgin daralıyor.' },
      { baslik: 'Karma proje etkisi', not: 'Aynı parselde ofis ve konutun birlikte olması aidatı yukarı çekiyor ama sosyal tesis kalitesini de yükseltiyor. Aidatı proje bütçenize dâhil edin: burada aidat, benzer m²’li tek fonksiyonlu projelerin üstünde seyrediyor.' },
      { baslik: 'Teslim dönemi yoğunluğu', not: 'Aynı çeyrekte teslim edilecek proje sayısı yüksekse, teslim sonrası kiralama rekabeti de yüksek oluyor. Teslim takvimini yalnızca kendi projeniz için değil, çevredeki projeler için de kontrol edin.' },
    ],
    ulasim: [
      { yol: 'Sabiha Gökçen Havalimanı (SAW)', sure: '30 km · 35–50 dk' },
      { yol: 'İstanbul Havalimanı (IST)', sure: '55 km · 60–90 dk' },
      { yol: 'Kadıköy', sure: '12 km · 25–40 dk' },
      { yol: 'Metro (M4 / M8 bağlantıları)', sure: 'Mahalleye göre 5–15 dk yürüme' },
    ],
    cevre: [
      { ad: 'Alışveriş merkezleri', metin: 'İlçe sınırları içinde ve hemen komşusunda birden çok büyük AVM var; çoğu projeden araçla 10 dakikanın altında.' },
      { ad: 'Eğitim', metin: 'Özel okul yoğunluğu yüksek, birkaç üniversite kampüsü ilçeye komşu. Okul servis güzergâhları site yönetimleriyle koordineli çalışıyor.' },
      { ad: 'Sağlık', metin: 'Bölgede ve komşu ilçelerde çok sayıda özel hastane bulunuyor; acil erişim süresi çoğu mahalleden 15 dakikanın altında.' },
      { ad: 'Yeşil alan', metin: 'Planlı yapılaşma sayesinde park ve koru alanları ilçe geneline dağılmış; proje içi peyzaj oranları da bölge ortalamasında yüksek.' },
    ],
    ipuclari: [
      'Finans Merkezi hattındaki projelerde manzara katı ile alt katlar arasındaki fiyat farkı belirgin; bütçeniz sınırlıysa cepheden ödün vermek m²’den ödün vermekten daha ekonomik.',
      'Karma projelerde ofis ve konut girişlerinin ayrı olup olmadığını sorun — ayrık giriş, hafta içi lobi yoğunluğunu doğrudan etkiliyor.',
      'Aidat tahminini yalnızca m² üzerinden değil, sosyal tesis listesi üzerinden değerlendirin: kapalı havuz ve fitness, aidatın en büyük iki kalemi.',
      'Otopark hakkının daireye mi projeye mi bağlı olduğunu sözleşmede kontrol edin; ikisi farklı şey.',
      'Metro istasyonuna "yürüme mesafesi" ifadesi projeden projeye değişiyor; dakikayı kendiniz ölçün.',
    ],
    sss: [
      { s: 'Ataşehir’de yeni projeler hangi mahallelerde yoğunlaşıyor?', c: 'Yeni proje arzının büyük bölümü Barbaros ve Küçükbakkalköy hattında. Barbaros, Finans Merkezi’ne yakınlığı sebebiyle fiyat aralığının üst bandında; Küçükbakkalköy karma kullanımın (zemin ticari + üst konut) yoğun olduğu yer. İçerenköy tarafında dönüşüm projeleri var ve parsel başına birim sayısı daha düşük.' },
      { s: 'Ataşehir’de aidatlar neden yüksek?', c: 'İki sebep var: proje ölçeği ve sosyal tesis yoğunluğu. İlçedeki projeler planlı yapılaşma nedeniyle büyük parsellerde ve çok bloklu; kapalı havuz, fitness, güvenlik ve peyzaj gibi kalemler aidatın büyük bölümünü oluşturuyor. Karma projelerde ortak alan yönetimi daha karmaşık olduğu için aidat bir miktar daha yukarıda seyrediyor. Proje bütçenizi kurarken aidatı ayrı bir kalem olarak hesaplayın.' },
      { s: 'Yatırım için hangi daire tipi daha mantıklı?', c: 'Kiracı havuzunun en geniş olduğu tipler 1+1 ve 2+1. Bölgedeki kurumsal ofis yoğunluğu beyaz yakalı kiracı talebini sürekli kılıyor ve bu profil çoğunlukla küçük tiplerde yoğunlaşıyor. 3+1 ve üzeri tiplerde kiracı bulma süresi uzuyor, buna karşılık satışta değer artışı daha istikrarlı olabiliyor. Kararı beklediğiniz elde tutma süresine göre verin.' },
      { s: 'Teslim tarihi gerçekten tutuyor mu?', c: 'Teslim tarihi bir taahhüt ama sapma sektörde yaygın. Bakılması gereken üç şey var: firmanın daha önce teslim ettiği proje sayısı, inşaatın bugünkü ilerleme yüzdesi ve sözleşmedeki gecikme maddesi. Site üzerindeki her projede firmanın tamamladığı proje sayısını ve güncel ilerleme oranını gösteriyoruz; sözleşme maddesini satış görüşmesinde mutlaka sorun.' },
      { s: 'Kat irtifakı mı kat mülkiyeti mi olmalı?', c: 'İnşaatı devam eden projelerde tapu kat irtifakı olarak veriliyor; bina tamamlanıp iskân alındıktan sonra kat mülkiyetine çevriliyor. Kat irtifakı geçerli ve krediye uygun bir tapu türü, ancak kat mülkiyetine geçişin ne zaman yapılacağını ve masrafın kime ait olduğunu sözleşmede görmek gerekiyor.' },
    ],
  },

  /* ---------------------------------------------- BAŞAKŞEHİR */
  basaksehir: {
    giris: [
      'Başakşehir, İstanbul’un Avrupa yakasında sıfırdan planlanmış en büyük yerleşim alanlarından. Etaplar hâlinde geliştiği için sokak genişlikleri, park alanları ve okul-cami-market yerleşimi baştan tanımlı; ilçenin en belirgin özelliği bu düzenli doku.',
      'Bölgedeki konut arzı geniş metrekareye ve aile kullanımına eğilimli. 3+1 ve 4+1 tiplerin toplam arz içindeki payı İstanbul ortalamasının üstünde; küçük tip arayan alıcı için seçenek daha sınırlı.',
      'İlçenin son dönemdeki dönüşümünü belirleyen iki yapı var: büyük ölçekli şehir hastanesi ve metro hattının uzaması. İkisi birlikte, bölgeyi "uzak ama ucuz" konumundan çıkarıp ulaşım süresiyle rekabet eden bir yerleşime taşıdı.',
    ],
    mevkiler: [
      { ad: 'Kayaşehir', metin: 'İlçenin en yeni ve en büyük ölçekli gelişim alanı. Toplu projeler ve geniş peyzajlı siteler burada; metro bağlantısı bölgenin talebini doğrudan belirliyor.' },
      { ad: 'Başakşehir etapları', metin: 'İlçenin ilk kurulan bölümü. Yapı stoku daha oturmuş, ağaçlanma tamamlanmış. Yeni proje sayısı sınırlı, ağırlıklı olarak boşluk parsellerde tekil projeler çıkıyor.' },
      { ad: 'Ziya Gökalp / Şahintepe', metin: 'Fiyat aralığının alt bandı. Dönüşüm ve yeni proje aynı anda ilerliyor; bölge içi farklılık yüksek olduğu için parsel bazında değerlendirme gerekiyor.' },
      { ad: 'Bahçeşehir sınırı', metin: 'İlçenin batı ucu. Bahçeşehir’in yerleşik dokusuna komşu olduğu için sosyal donatı erişimi güçlü; projeler görece küçük ölçekli.' },
    ],
    yatirim: [
      { baslik: 'Metro etkisi', not: 'Hat uzamaları bölgede ulaşım süresini kısaltan tek gerçek değişken. Bir projenin istasyona yürüme mesafesi, aynı ilçedeki iki proje arasındaki en belirleyici fark olabiliyor.' },
      { baslik: 'Arz yoğunluğu', not: 'Büyük ölçekli gelişim alanlarında aynı dönemde çok sayıda birim teslim ediliyor. Bu, teslim sonrası kiralamada rekabeti artırıyor; teslim takviminin sıkışık olduğu dönemlerden kaçınmak kiraya verme süresini kısaltıyor.' },
      { baslik: 'Aile kullanımı', not: 'Bölgenin talebi ağırlıklı olarak oturum amaçlı ve aile odaklı. Bu, büyük tiplerde satış likiditesini destekliyor ama küçük tiplerde kiracı havuzunu daraltıyor — Ataşehir’in tam tersi bir denge.' },
    ],
    ulasim: [
      { yol: 'İstanbul Havalimanı (IST)', sure: '30 km · 30–45 dk' },
      { yol: 'Metro (M3 hattı ve uzantıları)', sure: 'Mahalleye göre 5–20 dk' },
      { yol: 'TEM bağlantısı', sure: '3–8 km · 5–15 dk' },
      { yol: 'Mecidiyeköy', sure: '30 km · 45–70 dk' },
    ],
    cevre: [
      { ad: 'Sağlık', metin: 'İlçede büyük ölçekli bir şehir hastanesi bulunuyor; bölgedeki projelerin çoğundan araçla 15 dakikanın altında.' },
      { ad: 'Eğitim', metin: 'Planlı yerleşim sayesinde okul dağılımı dengeli. Devlet ve özel okul seçeneği etap içlerinde yürüme mesafesinde.' },
      { ad: 'Yeşil alan ve göletler', metin: 'İlçenin planında park ve gölet alanları baştan ayrılmış; kişi başına düşen yeşil alan İstanbul ortalamasının üstünde.' },
      { ad: 'Spor tesisleri', metin: 'Bölgede büyük ölçekli spor kompleksleri ve stadyum bulunuyor; hafta sonu erişimi araçla kolay.' },
    ],
    ipuclari: [
      'Etaplar arasında yapı yaşı ve doku farkı büyük; "Başakşehir" tek bir yer değil, hangi etap olduğunu mutlaka sorun.',
      'Metro istasyonuna mesafe bu ilçede fiyatı en çok etkileyen tek değişken; 10 dakikalık yürüme farkı bütçenizde ciddi karşılık buluyor.',
      'Büyük tip arzı fazla olduğu için 3+1 ve 4+1’de pazarlık alanı, küçük tiplere göre daha geniş olabiliyor.',
      'Site içi otopark oranını birim sayısına bölerek kontrol edin; büyük projelerde misafir otoparkı hızlıca yetersiz kalıyor.',
      'Teslim çeyreği aynı olan komşu projeleri de listeleyin — aynı anda teslim, kiralama rekabeti demek.',
    ],
    sss: [
      { s: 'Başakşehir ulaşım açısından uzak mı?', c: 'İlçe merkeze uzak ama ulaşım altyapısı bu mesafeyi kısmen dengeliyor. İstanbul Havalimanı’na 30–45 dakika, TEM bağlantısına 5–15 dakika. Belirleyici olan metro istasyonuna yürüme mesafeniz: istasyona yakın bir projede merkeze ulaşım süresi, daha merkezi ama hatta uzak bir konumdan daha kısa olabiliyor. Proje seçerken kilometre değil, kapıdan kapıya süre hesaplayın.' },
      { s: 'Neden küçük daire seçeneği az?', c: 'Bölgenin talebi ağırlıklı olarak oturum amaçlı ve aile odaklı; geliştiriciler de arzı bu talebe göre kuruyor. 3+1 ve 4+1 tiplerin payı İstanbul ortalamasının üstünde. 1+1 ve 2+1 arıyorsanız seçenek var ama sınırlı, ve bu tipler genellikle karma projelerde ya da ilçenin Bahçeşehir sınırına yakın bölümünde çıkıyor.' },
      { s: 'Kayaşehir ile Başakşehir etapları arasındaki fark ne?', c: 'Başakşehir etapları ilçenin ilk kurulan bölümü: yapı stoku oturmuş, ağaçlanma tamamlanmış, yeni proje sayısı sınırlı. Kayaşehir ise en yeni ve en büyük ölçekli gelişim alanı; arz burada yoğun, peyzaj alanları geniş ama doku henüz olgunlaşma aşamasında. Hazır bir çevre istiyorsanız etaplar, yeni yapı ve daha geniş seçenek istiyorsanız Kayaşehir.' },
      { s: 'Bu bölgede yatırım getirisi nasıl değerlendirilir?', c: 'Getiri hesabı iki kalemden oluşuyor: kira geliri ve değer artışı. Kira tarafında bölgenin aile odaklı profili büyük tipleri destekliyor, küçük tiplerde kiracı havuzu daha dar. Değer artışında en belirleyici değişken ulaşım yatırımları. Size somut bir getiri oranı vermiyoruz — bölgeye ve döneme göre çok değişken ve tahmin olarak sunulan her rakam yanıltıcı olur. Satış ekibiyle görüşürken bölgedeki gerçekleşmiş kira sözleşmelerini isteyin.' },
      { s: 'Aynı anda çok proje teslim ediliyorsa bu sorun mu?', c: 'Oturum amaçlıysanız değil. Kiraya verecekseniz evet: aynı çeyrekte teslim edilen yüzlerce birim, kiralama döneminde arzı bir anda yükseltiyor ve ilk kiracıyı bulma süresi uzuyor. Projeyi seçerken teslim çeyreğini yalnızca kendi projeniz için değil, aynı bölgedeki diğer projeler için de kontrol edin — site üzerinde bölge bazlı teslim takvimini görebilirsiniz.' },
    ],
  },

  /* --------------------------------------------------- KARTAL */
  kartal: {
    giris: [
      'Kartal, Anadolu yakasının sahil hattında, eski sanayi alanlarının konuta dönüştüğü en geniş bölgelerden. İlçenin bugünkü proje arzı büyük ölçüde bu dönüşümün ürünü: geniş parseller, yüksek bloklar ve deniz görüşü üzerine kurulu bir konumlandırma.',
      'Sahil ile D-100 arasındaki bant, ilçedeki fiyat farkını belirleyen ana eksen. Denize yakınlık burada manzara demek ve manzara katı ile alt katlar arasındaki fark, aynı projede bile belirgin.',
      'Metro hattının ilçeyi boydan boya geçmesi, Kartal’ı Kadıköy ve merkez hattına bağlayan asıl unsur. Marmaray ve deniz otobüsü seçenekleriyle birlikte ilçe, Avrupa yakasına birden fazla alternatifle bağlanıyor.',
    ],
    mevkiler: [
      { ad: 'Kordonboyu', metin: 'Sahil hattının en yoğun proje bölgesi. Deniz görüşü olan yüksek bloklar burada; fiyat aralığı ilçenin üst bandında ve manzara katı primi yüksek.' },
      { ad: 'Cevizli', metin: 'Metro istasyonlarına yakın, dönüşümün hızlı ilerlediği bölge. Sahil kadar pahalı değil ama ulaşım avantajı güçlü.' },
      { ad: 'Yakacık', metin: 'İlçenin iç kesimi, kot olarak daha yüksek. Deniz görüşü sınırlı ama şehir manzarası ve daha geniş yeşil alan var; fiyat aralığı alt bantta.' },
      { ad: 'Soğanlık', metin: 'E-5 ve TEM bağlantısına yakın, ticari yoğunluğu yüksek bölge. Karma projeler burada toplanıyor.' },
    ],
    yatirim: [
      { baslik: 'Manzara primi', not: 'Deniz görüşü bu ilçede ölçülebilir bir fiyat kalemi. Ama görüşün kalıcı olup olmadığı ayrı bir soru: önünüzdeki parselin imar durumu, bugünkü manzaranın beş yıl sonra duracağını garanti etmiyor.' },
      { baslik: 'Dönüşüm alanları', not: 'Eski sanayi parsellerinde zemin etüdü ve altyapı yenileme geçmişi önemli. Projenin zemin raporunu ve deprem yönetmeliği uyumunu satış görüşmesinde isteyin.' },
      { baslik: 'Ulaşım çeşitliliği', not: 'Metro, Marmaray ve deniz yolu aynı ilçede. Bu, tek bir hatta bağımlı bölgelere göre ulaşım riskini dağıtıyor ve kiracı profilini genişletiyor.' },
    ],
    ulasim: [
      { yol: 'Sabiha Gökçen Havalimanı (SAW)', sure: '18 km · 20–35 dk' },
      { yol: 'Kadıköy (metro ile)', sure: '20 km · 30–40 dk' },
      { yol: 'Marmaray bağlantısı', sure: 'Mahalleye göre 5–15 dk' },
      { yol: 'TEM / D-100', sure: '2–6 km · 5–15 dk' },
    ],
    cevre: [
      { ad: 'Sahil ve yürüyüş parkuru', metin: 'İlçenin sahil şeridi boyunca uzanan park ve yürüyüş hattı, bölgenin en çok kullanılan ortak alanı.' },
      { ad: 'Sağlık', metin: 'İlçede ve komşu ilçelerde büyük ölçekli hastaneler bulunuyor; sahil hattından erişim araçla 15 dakika civarında.' },
      { ad: 'Alışveriş', metin: 'D-100 ve sahil hattında birden çok AVM var; çoğu projeye yürüme ya da kısa araç mesafesinde.' },
      { ad: 'Marina', metin: 'İlçedeki marina, sahil hattındaki projelerin sosyal çekim noktalarından biri.' },
    ],
    ipuclari: [
      'Deniz görüşü satın alıyorsanız, önünüzdeki parselin imar durumunu belediyeden sorgulayın — manzara kalıcı bir özellik değil.',
      'Sahil hattı ile iç kesim arasındaki fiyat farkı büyük; bütçeniz sınırlıysa metroya yakın iç mahalleler daha iyi denge sunuyor.',
      'Eski sanayi parselinde yükselen projelerde zemin etüdü raporunu isteyin.',
      'Yüksek bloklarda asansör sayısını birim sayısına bölün; sabah yoğunluğu bu orana bağlı.',
      'Rüzgâr sahil hattında belirgin; balkon kullanımı düşündüğünüz cepheyi mevsim koşullarıyla birlikte değerlendirin.',
    ],
    sss: [
      { s: 'Kartal’da deniz manzarası kalıcı mı?', c: 'Garanti değil. Sahil hattı yoğun dönüşüm altında ve bugün boş görünen bir parsel yarın yükselebilir. Manzara için ödeme yapıyorsanız, önünüzdeki parsellerin imar durumunu belediyeden sorgulayın; imar planında yükseklik sınırı varsa manzaranın korunma ihtimali yüksek. Satış görüşmesinde "manzara garantisi" sözlü verilir ama sözleşmeye girmez — plan bilgisi tek güvenilir kaynak.' },
      { s: 'Eski sanayi bölgesinde konut almak riskli mi?', c: 'Kendiliğinden riskli değil ama sorulması gereken sorular farklı. Zemin etüdü raporu, varsa zemin ıslahı çalışması ve altyapı yenileme durumu önemli. Ayrıca parselin geçmiş kullanımına bağlı kirlilik incelemesi yapılmışsa raporu isteyin. Bu belgeler geliştiricide bulunuyor ve talep edilmesi olağan.' },
      { s: 'Kartal mı Ataşehir mi?', c: 'İkisi farklı ihtiyaca cevap veriyor. Ataşehir kurumsal ofis yoğunluğu sebebiyle işe yakınlık ve beyaz yakalı kiracı talebi üzerine kurulu; Kartal ise sahil, manzara ve ulaşım çeşitliliği sunuyor ve fiyat aralığı genel olarak daha erişilebilir. İş yeriniz Finans Merkezi hattındaysa Ataşehir, deniz ve daha geniş metrekare önceliğinizse Kartal daha mantıklı.' },
      { s: 'Yüksek katlı blokta oturmak nasıl?', c: 'Pratik farklar var: asansör bekleme süresi, rüzgâr etkisi ve tahliye planı. Asansör sayısını birim sayısına bölerek kontrol edin — sabah saatlerindeki yoğunluk bu orana bağlı. Yüksek katlarda balkon kullanımı rüzgâr sebebiyle sahil hattında sınırlanabiliyor. Yangın merdiveni ve tahliye planını da projeden isteyin.' },
      { s: 'Metroya yakınlık fiyatı ne kadar etkiliyor?', c: 'Bu ilçede sahile yakınlıktan sonraki en belirleyici ikinci değişken. İstasyona yürüme mesafesindeki bir proje ile aynı mahallede 15 dakika uzaktaki bir proje arasında hem satış fiyatı hem kira farkı oluşuyor. Site üzerindeki her projede konum bilgisi var; mesafeyi harita üzerinden kendiniz doğrulayın, "yürüme mesafesi" ifadesi projeden projeye değişiyor.' },
    ],
  },

  /* -------------------------------------------------- ÇANKAYA */
  cankaya: {
    giris: [
      'Çankaya, Ankara’nın yerleşik merkezi ve şehrin en oturmuş konut dokusuna sahip ilçesi. Boş parsel az olduğu için buradaki yeni proje arzı büyük ölçüde kentsel dönüşümden geliyor: eski apartmanların yerine, daha az birimli ve daha nitelikli projeler çıkıyor.',
      'İlçenin karakteri bu yüzden diğer gelişim bölgelerinden farklı. Yüzlerce birimli site yerine, 30–80 birimlik butik projeler yaygın; sosyal tesis listesi daha kısa ama konum ve çevre olgunluğu güçlü.',
      'Elçilikler, bakanlıklar ve üniversite kampüsleri ilçe içine dağılmış durumda. Bu, kiracı profilini çeşitlendiriyor ve talebi tek bir sektöre bağımlı olmaktan çıkarıyor.',
    ],
    mevkiler: [
      { ad: 'Çukurambar', metin: 'İlçenin en yeni ve en yoğun proje bölgesi. Yüksek bloklar ve karma kullanım burada; Çankaya’nın diğer mahallelerinden dokusuyla belirgin ayrışıyor.' },
      { ad: 'Oran', metin: 'Planlı, düşük yoğunluklu ve yeşil alanı geniş bölge. Yeni proje sayısı sınırlı, fiyat aralığı üst bantta.' },
      { ad: 'Gaziosmanpaşa / Kavaklıdere', metin: 'Elçilik bölgesi. Dönüşüm projeleri küçük ölçekli ve butik; yapı yaşı ortalaması yüksek, ağaçlanma tamamlanmış.' },
      { ad: 'Ümitköy / Çayyolu hattı', metin: 'İlçenin batı ucu, metro hattı boyunca uzanan yerleşik bölge. Aile odaklı, site kültürü yerleşmiş.' },
    ],
    yatirim: [
      { baslik: 'Dönüşüm ölçeği', not: 'Buradaki projeler küçük birim sayılı. Bu, aidatı birim başına yükseltebiliyor (ortak gider daha az kişiye bölünüyor) ama site içi yoğunluğu da düşürüyor.' },
      { baslik: 'Kiracı çeşitliliği', not: 'Kamu, üniversite ve diplomatik misyon talebi aynı ilçede bir arada. Tek bir sektöre bağımlı bölgelere göre kiralama riski daha dağınık.' },
      { baslik: 'Arsa kısıtı', not: 'Boş parsel azlığı yeni arzı sınırlıyor. Bu, mevcut stokun değerini destekleyen ama seçenek çeşitliliğini daraltan bir denge.' },
    ],
    ulasim: [
      { yol: 'Esenboğa Havalimanı (ESB)', sure: '35 km · 40–55 dk' },
      { yol: 'Kızılay', sure: '3–10 km · 10–25 dk' },
      { yol: 'Metro (M2 hattı)', sure: 'Mahalleye göre 5–15 dk' },
      { yol: 'ODTÜ / Bilkent kampüsleri', sure: '5–15 km · 15–25 dk' },
    ],
    cevre: [
      { ad: 'Üniversiteler', metin: 'Birden çok büyük üniversite kampüsü ilçe içinde ya da hemen komşusunda; akademik kiracı talebi sürekli.' },
      { ad: 'Sağlık', metin: 'Şehrin en büyük hastanelerinin önemli bölümü ilçe sınırları içinde ya da yakınında.' },
      { ad: 'Kültür ve sanat', metin: 'Tiyatro, konser salonu ve sanat galerisi yoğunluğu şehir ortalamasının belirgin üstünde.' },
      { ad: 'Parklar', metin: 'Büyük şehir parkları ilçe içine dağılmış; yürüme mesafesinde yeşil alan erişimi çoğu mahallede mümkün.' },
    ],
    ipuclari: [
      'Dönüşüm projelerinde arsa payı ve müteahhit-mal sahibi paylaşımını sorun; satın aldığınız dairenin hangi paya karşılık geldiği önemli.',
      'Küçük birimli projelerde aidat, birim başına daha yüksek çıkabiliyor — birim sayısını ortak gider listesiyle birlikte değerlendirin.',
      'Çukurambar ile ilçenin geri kalanı çok farklı iki doku; "Çankaya" diye tek bir beklenti kurmayın.',
      'Yerleşik mahallelerde otopark en kritik kalem; daireye tahsisli kapalı otopark olup olmadığını netleştirin.',
      'Ağaçlanmış mahallelerde yeni projenin peyzaj vaadi ile çevrenin mevcut dokusunu karşılaştırın.',
    ],
    sss: [
      { s: 'Çankaya’da neden az sayıda büyük proje var?', c: 'İlçe Ankara’nın yerleşik merkezi ve boş parsel neredeyse kalmadı. Yeni arzın tamamına yakını kentsel dönüşümden geliyor: eski apartmanların yerine 30–80 birimlik butik projeler çıkıyor. Yüzlerce birimli site arıyorsanız Çukurambar dışında seçenek çok sınırlı; buna karşılık konum olgunluğu ve çevre kalitesi gelişim bölgelerine göre yüksek.' },
      { s: 'Kentsel dönüşüm projesinde alıcı olarak nelere dikkat etmeliyim?', c: 'Üç şey: arsa payı, paylaşım oranı ve ruhsat durumu. Aldığınız dairenin hangi arsa payına karşılık geldiğini, müteahhit ile mal sahipleri arasındaki paylaşımın nasıl yapıldığını ve yapı ruhsatının alınmış olup olmadığını sorun. Ruhsatsız satış yapılan projelerde teslim riski belirgin artıyor.' },
      { s: 'Aidat neden küçük projelerde daha yüksek olabiliyor?', c: 'Ortak giderler (güvenlik, temizlik, asansör bakımı, peyzaj) birim sayısına bölünüyor. Otuz birimli bir projede aynı hizmet, üç yüz birimli bir projeye göre birim başına daha pahalıya geliyor. Küçük projenin avantajı düşük yoğunluk ve daha az komşu; dezavantajı birim başına ortak gider. Hangi hizmetin sunulduğunu ve maliyetin nasıl paylaşıldığını yönetim planında görün.' },
      { s: 'Ankara’da yatırım için Çankaya mı yeni gelişim bölgeleri mi?', c: 'Çankaya yerleşik ve arsa arzı kısıtlı bir ilçe; bu, mevcut stokun değerini destekleyen bir yapı. Yeni gelişim bölgelerinde ise giriş fiyatı daha düşük ve arz bol. Kiracı tarafında Çankaya’nın avantajı çeşitlilik: kamu, üniversite ve diplomatik misyon talebi aynı anda var, tek sektöre bağımlı değil. Karar, elde tutma süreniz ve risk toleransınıza bağlı — size tek bir doğru cevap veremeyiz.' },
      { s: 'Metro hattına yakınlık burada da belirleyici mi?', c: 'Evet ama İstanbul kadar keskin değil. Çankaya’da araç kullanımı yaygın ve mesafeler daha kısa; metro yakınlığı özellikle Çayyolu-Ümitköy hattında ve öğrenci/akademik kiracı hedefleyen yatırımlarda öne çıkıyor. Merkezi mahallelerde otopark, metro yakınlığından daha kritik bir kalem olabiliyor.' },
    ],
  },

  /* -------------------------------------------------- BORNOVA */
  bornova: {
    giris: [
      'Bornova, İzmir’in en kalabalık ilçelerinden ve şehrin akademik merkezi. Büyük üniversite kampüsünün ilçe içinde olması, konut talebini öğrenci ve akademik personel ekseninde şekillendiriyor — küçük tiplerin payı İzmir ortalamasının üstünde.',
      'İlçenin yapı stoku karışık: merkezde yerleşik apartman dokusu, çeperlerde yeni proje alanları. Dönüşüm merkez mahallelerde ilerliyor ve çıkan projeler çoğunlukla orta ölçekli.',
      'Metro hattının ilçeyi geçmesi, Bornova’yı Konak ve sahil hattına bağlayan asıl unsur. Bu, ilçeyi hem öğrenci hem çalışan kiracı için erişilebilir kılıyor.',
    ],
    mevkiler: [
      { ad: 'Kazımdirik', metin: 'Üniversite kampüsüne en yakın mahalle. Öğrenci talebi yoğun, küçük tip arzı fazla. Kira dönüşü hızlı ama kiracı sirkülasyonu da yüksek.' },
      { ad: 'Erzene / Evka bölgesi', metin: 'Yerleşik site dokusu. Aile odaklı, yeşil alan oranı yüksek; yeni proje sayısı sınırlı.' },
      { ad: 'Bornova merkez', metin: 'Ticari yoğunluğun en yüksek olduğu bölge. Dönüşüm projeleri burada çıkıyor; ulaşım ve alışveriş erişimi güçlü.' },
      { ad: 'Işıkkent / Pınarbaşı', metin: 'Sanayi ve lojistik alanlarına komşu bölge. Fiyat aralığı alt bantta; yeni proje arzı artıyor.' },
    ],
    yatirim: [
      { baslik: 'Öğrenci talebi', not: 'Kampüs yakınlığı 1+1 ve 2+1 tiplerde kiralama süresini kısaltıyor. Buna karşılık kiracı sirkülasyonu yüksek ve dönem dışı boşluk riski var — akademik takvimle uyumlu bir kiralama planı gerekiyor.' },
      { baslik: 'Metro hattı', not: 'İlçedeki istasyonlar, kiracı havuzunu öğrenci dışına da genişletiyor. İstasyona yakın projeler bu yüzden tek profile bağımlı olmuyor.' },
      { baslik: 'Dönüşüm hızı', not: 'Merkez mahallelerdeki yapı stoku yaşlı ve dönüşüm ilerliyor. Bu, çevredeki yapılaşmanın önümüzdeki yıllarda değişeceği anlamına geliyor — bugünkü manzara ve yoğunluk kalıcı olmayabilir.' },
    ],
    ulasim: [
      { yol: 'Adnan Menderes Havalimanı (ADB)', sure: '25 km · 30–40 dk' },
      { yol: 'Konak / sahil hattı', sure: '10 km · 20–30 dk (metro)' },
      { yol: 'Metro (İzmir Metrosu)', sure: 'Mahalleye göre 5–15 dk' },
      { yol: 'Üniversite kampüsü', sure: '1–5 km · 5–15 dk' },
    ],
    cevre: [
      { ad: 'Üniversite', metin: 'Büyük bir üniversite kampüsü ilçe sınırları içinde; akademik ve öğrenci nüfusu bölgenin karakterini belirliyor.' },
      { ad: 'Sağlık', metin: 'Üniversite hastanesi ve çok sayıda özel hastane ilçede veya komşu ilçelerde.' },
      { ad: 'Alışveriş', metin: 'İlçede birden çok büyük AVM ve yoğun cadde ticareti bulunuyor.' },
      { ad: 'Yeşil alan', metin: 'Kampüs alanı ve çevresindeki parklar, ilçenin yeşil alan dengesini yukarı çekiyor.' },
    ],
    ipuclari: [
      'Öğrenci kiracı hedefliyorsanız akademik takvimi planınıza katın; dönem dışı boşluk gerçek bir maliyet.',
      'Kampüse çok yakın projelerde gece gürültüsü ve sirkülasyon oturum konforunu etkileyebiliyor — oturum amaçlıysanız bir mahalle uzağa bakın.',
      'Metro istasyonuna yakınlık, kiracı havuzunu öğrenci dışına açan tek değişken.',
      'Merkez mahallelerde dönüşüm sürüyor; komşu parsellerin durumunu sorun.',
      'İzmir’de zemin özellikleri bölgeye göre değişiyor; zemin etüdü raporunu isteyin.',
    ],
    sss: [
      { s: 'Bornova öğrenci yatırımı için uygun mu?', c: 'Kampüs ilçe içinde olduğu için 1+1 ve 2+1 tiplerde kiracı bulma süresi kısa. Ama iki noktayı hesaba katın: kiracı sirkülasyonu yüksek (yıllık değişim yaygın) ve akademik takvim dışında boşluk riski var. Kampüse yakın ama aynı zamanda metro istasyonuna yakın bir konum, kiracı havuzunu öğrenci dışına da açtığı için bu riski dengeliyor.' },
      { s: 'Oturmak için Bornova nasıl?', c: 'İlçe kalabalık ve merkez bölgelerde yoğun. Aile odaklı oturum için Erzene ve Evka hattındaki yerleşik site dokusu daha uygun: yeşil alan oranı yüksek, sirkülasyon düşük. Kampüse çok yakın mahallelerde gece hareketliliği ve kiracı değişimi oturum konforunu etkileyebiliyor.' },
      { s: 'Merkez mahallelerde dönüşüm ne anlama geliyor?', c: 'Yapı stoku yaşlı ve yenileme sürüyor. Alıcı için iki sonucu var: yeni proje arzı artıyor, ama çevrenizdeki parseller de önümüzdeki yıllarda şantiyeye dönüşebilir. Satın almadan önce komşu parsellerin durumunu ve bölgedeki dönüşüm planlarını sorun — bugünkü manzara ve yoğunluk kalıcı olmayabilir.' },
      { s: 'Bornova mı Karşıyaka mı?', c: 'Bornova akademik merkez ve küçük tip arzı fazla; Karşıyaka sahil hattında, yerleşik ve aile odaklı bir doku. Öğrenci ya da genç çalışan kiracı hedefliyorsanız Bornova, oturum ve sahil önceliğinizse Karşıyaka daha uygun. Fiyat aralığı genel olarak Bornova’da daha erişilebilir.' },
      { s: 'İzmir’de zemin etüdü neden önemli?', c: 'Şehrin bazı bölgelerinde zemin yapısı deprem davranışını doğrudan etkiliyor ve bu, ilçe içinde bile parselden parsele değişebiliyor. Yeni projelerde zemin etüdü raporu zorunlu; geliştiriciden isteyin ve yapının hangi deprem yönetmeliğine göre projelendirildiğini sorun. Bu iki belge, satın alma kararının teknik tarafındaki en önemli girdiler.' },
    ],
  },

  /* -------------------------------------------------- NİLÜFER */
  nilufer: {
    giris: [
      'Nilüfer, Bursa’nın planlı olarak gelişmiş ilçesi ve şehrin yeni konut arzının büyük bölümünün toplandığı yer. Geniş bulvarlar, düzenli ada yapısı ve yüksek yeşil alan oranı ilçenin en belirgin özellikleri.',
      'Konut dokusu ağırlıklı olarak site ölçeğinde. Parseller büyük olduğu için projeler sosyal donatılı ve çok bloklu; aile odaklı kullanım ilçenin ana talebini oluşturuyor.',
      'Sanayi ve organize sanayi bölgelerine yakınlık, ilçedeki kiracı profilinin önemli bir bölümünü belirliyor. Üniversite kampüsünün de ilçeye komşu olması talebi çeşitlendiriyor.',
    ],
    mevkiler: [
      { ad: 'Görükle', metin: 'Üniversite kampüsüne komşu bölge. Öğrenci talebi yoğun, küçük tip arzı fazla. İlçenin diğer bölgelerinden karakter olarak ayrışıyor.' },
      { ad: 'Özlüce / Beşevler', metin: 'Yerleşik site dokusu, aile odaklı. Sosyal donatı erişimi güçlü, yeni proje arzı orta düzeyde.' },
      { ad: 'İhsaniye', metin: 'İlçenin en yoğun yeni proje bölgelerinden. Geniş parseller ve büyük ölçekli siteler burada.' },
      { ad: 'Ürünlü / Balat', metin: 'İlçenin gelişen çeperi. Fiyat aralığı alt bantta, arz artıyor; altyapı olgunlaşma aşamasında.' },
    ],
    yatirim: [
      { baslik: 'Sanayi yakınlığı', not: 'Organize sanayi bölgelerine yakınlık, çalışan kiracı talebini sürekli kılıyor. Bu profil çoğunlukla 2+1 ve 3+1 tiplerde yoğunlaşıyor.' },
      { baslik: 'Planlı doku', not: 'İlçenin baştan planlanmış olması, altyapı ve donatı sorunlarını azaltıyor. Buna karşılık gelişen çeper mahallelerde altyapı henüz olgunlaşmamış olabiliyor — mahalle bazında değerlendirin.' },
      { baslik: 'İstanbul bağlantısı', not: 'Yüksek hızlı ulaşım yatırımları bölgenin erişilebilirliğini etkileyen ana değişken. Bu tür projelerin takvimi sık değişiyor; kararınızı bugünkü ulaşım süresine göre verin, vaat edilene göre değil.' },
    ],
    ulasim: [
      { yol: 'Yenişehir Havalimanı (YEI)', sure: '55 km · 50–70 dk' },
      { yol: 'Bursa merkez (Osmangazi)', sure: '8–15 km · 15–30 dk' },
      { yol: 'Metro (Bursaray)', sure: 'Mahalleye göre 5–20 dk' },
      { yol: 'Organize sanayi bölgeleri', sure: '5–15 km · 10–25 dk' },
    ],
    cevre: [
      { ad: 'Üniversite', metin: 'Büyük bir üniversite kampüsü ilçeye komşu; Görükle hattındaki talebi doğrudan belirliyor.' },
      { ad: 'Sağlık', metin: 'İlçede ve komşu ilçelerde çok sayıda hastane bulunuyor.' },
      { ad: 'Alışveriş', metin: 'Bulvar hattı boyunca AVM ve cadde ticareti yoğun; çoğu siteden kısa araç mesafesinde.' },
      { ad: 'Yeşil alan', metin: 'Planlı yapılaşma sayesinde park ve rekreasyon alanı oranı şehir ortalamasının üstünde.' },
    ],
    ipuclari: [
      'Görükle ile ilçenin geri kalanı farklı iki pazar; öğrenci mi aile mi hedeflediğinizi baştan netleştirin.',
      'Gelişen çeper mahallelerde altyapı ve toplu taşıma durumunu yerinde kontrol edin.',
      'Büyük ölçekli sitelerde aidat kalemlerini ve yönetim planını satın almadan önce okuyun.',
      'Bursa’da bazı bölgelerde zemin özellikleri belirleyici; zemin etüdü raporunu isteyin.',
      'Ulaşım yatırımı vaadi üzerine kurulu fiyatlandırmalara dikkat; takvimler sık değişiyor.',
    ],
    sss: [
      { s: 'Nilüfer’de aile için hangi mahalleler uygun?', c: 'Özlüce ve Beşevler hattındaki yerleşik site dokusu aile kullanımı için en oturmuş bölge: sosyal donatı erişimi güçlü, okul dağılımı dengeli, yeşil alan oranı yüksek. İhsaniye tarafında yeni ve büyük ölçekli projeler var; sosyal tesis listesi daha geniş ama doku henüz olgunlaşıyor. Görükle öğrenci ağırlıklı olduğu için aile kullanımında farklı bir karakter sunuyor.' },
      { s: 'Görükle yatırım için mantıklı mı?', c: 'Üniversite kampüsüne komşu olduğu için küçük tiplerde kiracı bulma süresi kısa. Ama Bornova’daki gibi burada da iki risk var: yüksek kiracı sirkülasyonu ve akademik takvim dışı boşluk. Bölgedeki arz da yoğun; aynı profile hitap eden çok sayıda birim var. Getiri beklentinizi bu rekabeti hesaba katarak kurun.' },
      { s: 'İstanbul’a ulaşım yatırımları fiyatı etkiler mi?', c: 'Etkileyebilir ama bu tür projelerin takvimi sık değişiyor ve fiyatlandırmanın vaat üzerine kurulduğu durumlar oluyor. Kararınızı bugünkü ulaşım süresine göre verin; gelecekteki iyileşme gerçekleşirse bir kazanç, gerçekleşmezse zaten ödemediğiniz bir prim olur. Satış görüşmesinde "hat gelince şu kadar artacak" cümlesi bir taahhüt değil.' },
      { s: 'Planlı ilçe olması ne kazandırıyor?', c: 'Somut olarak: geniş bulvarlar, düzenli ada yapısı, önceden ayrılmış park ve donatı alanları, daha az altyapı sorunu. Bu, plansız gelişen bölgelerde sonradan çözülmeye çalışılan otopark, yol genişliği ve yeşil alan sorunlarının burada baştan çözülmüş olması demek. Ancak gelişen çeper mahallelerde altyapı henüz tamamlanmamış olabiliyor — planlı olmak, her mahallenin aynı olgunlukta olduğu anlamına gelmiyor.' },
      { s: 'Bursa’da deprem açısından nelere bakmalıyım?', c: 'İki belge: zemin etüdü raporu ve yapının hangi deprem yönetmeliğine göre projelendirildiği. 2018 yönetmeliği öncesi ve sonrası projeler arasında tasarım kriterleri açısından fark var. Zemin özellikleri Bursa’da bölgeden bölgeye değişiyor, bu yüzden ilçe geneli için verilen bilgiler yeterli değil — parsele özgü raporu isteyin. Her iki belge de geliştiricide bulunuyor ve talep edilmesi olağan.' },
    ],
  },
};
