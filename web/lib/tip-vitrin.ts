import type { ProjeTipi } from './types';

/* ============================================================
   Tip vitrini metinleri — /konut-projeleri, /villa-projeleri,
   /ofis-projeleri.

   NEDEN AYRI SAYFA, ARAMA FİLTRESİ DEĞİL: "konut projeleri",
   "villa projeleri" ve "ofis projeleri" bu işin en yüksek hacimli
   üç araması. `/arama?tip=KONUT` bir sonuç listesi; başlığı,
   açıklaması ve içeriği olan bir sayfa değil — dizine de girmiyor
   (arama sayfası `robots` ile indekslenmiyor).

   NEDEN VERİTABANINDA DEĞİL: bölge ve kategori iniş sayfalarının
   metni panelden yönetiliyor çünkü sayıları değişken. Proje tipi
   ise şema düzeyinde SABİT: `ProjeTipi` üç değer artı KARMA. Üç
   sabit için ayrı bir yönetim ekranı kurmak, panelde hiç
   dokunulmayacak bir sayfa daha demekti.
   ============================================================ */

export interface TipVitrin {
  tip: Exclude<ProjeTipi, 'KARMA'>;
  slug: string;
  h1: string;
  ustBaslik: string;
  ozet: string;
  /** Meta açıklaması — 160 karakterin altında tutuluyor. */
  metaOzet: string;
  anahtar: string[];
  /** Sayfanın gövdesi: "bu tipte neye bakılır" */
  giris: string[];
  /** Alıcının bu tipte sorduğu somut sorular */
  sss: { s: string; c: string }[];
  /** Kartların altındaki not — listedeki fiyatın ne olduğu */
  not: string;
}

export const TIP_VITRINLERI: Record<Exclude<ProjeTipi, 'KARMA'>, TipVitrin> = {
  KONUT: {
    tip: 'KONUT',
    slug: 'konut-projeleri',
    h1: 'Konut Projeleri',
    ustBaslik: 'Yeni konut projeleri',
    ozet: 'Türkiye genelindeki yeni konut projeleri: kat planı, daire tipi, '
      + 'teslim tarihi ve fiyat aralığı bir arada.',
    metaOzet: 'Yeni konut projeleri: kat planı, daire tipleri, teslim tarihi ve '
      + 'fiyat aralığı bir arada. Form doldurmadan görebilirsiniz.',
    anahtar: [
      'konut projeleri', 'yeni konut projeleri', 'sıfır daire',
      'satılık daire projeleri', 'inşaat halindeki projeler', 'lansman projeleri',
    ],
    giris: [
      'Konut projesi, tek bir dairenin değil bir yaşam alanının satın alınması: '
      + 'aynı projede 1+1 ile 4+1 arasında birden çok daire tipi, her tipin ayrı '
      + 'metrekaresi ve ayrı fiyatı oluyor. Bu yüzden listedeki rakam projenin en '
      + 'düşük tipinin başlangıç fiyatı; kesin fiyat kata, cepheye ve ödeme planına '
      + 'göre değişiyor.',
      'Karşılaştırırken üç şey belirleyici: brüt ile net metrekare arasındaki fark, '
      + 'teslim tarihinin hangi çeyreğe verildiği ve peşinat–vade dengesi. Üçü de '
      + 'her proje sayfasında daire tipi tablosunda satır satır yazılı.',
    ],
    sss: [
      {
        s: 'Listedeki fiyat hangi daireye ait?',
        c: 'Projenin en düşük daire tipinin başlangıç fiyatı. Aynı projede 1+1 ile '
          + '4+1 arasında kat kat fark olabiliyor; tip tip fiyatlar proje sayfasındaki '
          + 'daire tipi tablosunda.',
      },
      {
        s: 'Brüt ve net metrekare arasındaki fark ne?',
        c: 'Brüt; ortak alan payını, duvarları ve balkonu içeriyor. Net, içinde '
          + 'yaşadığınız alan. Aradaki fark projeye göre %15 ile %35 arasında '
          + 'değişiyor ve alıcının en sık yanıldığı yer burası — tabloda ikisi de yazılı.',
      },
      {
        s: 'Teslim tarihi kesin mi?',
        c: 'Hayır. Teslim tarihi geliştirici firmanın beyanı ve çeyrek olarak '
          + 'veriliyor. Sözleşmede gecikme maddesinin ne dediğini satın alma öncesi '
          + 'firmadan yazılı isteyin.',
      },
      {
        s: 'Karma projeler neden konut listesinde de çıkıyor?',
        c: 'İçinde hem konut hem ofis bulunan projeler her iki listede de görünüyor. '
          + 'Konut arayan biri o projedeki daireleri de görmeli; yalnızca "karma" '
          + 'etiketine bakmak onu hiçbir listeye sokmuyordu.',
      },
    ],
    not: 'Fiyatlar başlangıç fiyatıdır ve geliştirici firmanın beyanına dayanıyor. '
      + 'Kat, cephe ve ödeme planına göre değişiyor.',
  },

  VILLA: {
    tip: 'VILLA',
    slug: 'villa-projeleri',
    h1: 'Villa Projeleri',
    ustBaslik: 'Müstakil ve sıralı villa projeleri',
    ozet: 'Müstakil, ikiz ve sıralı villa projeleri: arsa payı, bahçe alanı, '
      + 'kat planı ve teslim tarihiyle.',
    metaOzet: 'Villa projeleri: arsa payı, bahçe alanı, kat planı ve teslim tarihi '
      + 'bir arada. Müstakil, ikiz ve sıralı villa seçenekleri.',
    anahtar: [
      'villa projeleri', 'müstakil villa', 'satılık villa projeleri',
      'ikiz villa', 'sıralı villa', 'bahçeli villa projeleri',
    ],
    giris: [
      'Villada karar, dairede olduğundan farklı iki sayıya bakıyor: arsa payı ve '
      + 'bahçe alanı. Aynı kapalı alana sahip iki villanın arsası iki katı '
      + 'farklı olabiliyor ve fark hem fiyata hem yeniden satış değerine doğrudan '
      + 'yansıyor.',
      'İkinci ayrım tipoloji: müstakil villa dört cephesi açık ve tek parsel; '
      + 'ikiz villa bir duvarı paylaşıyor; sıralı villa iki komşuyla bitişik. Kat '
      + 'planı aynı görünse de mahremiyet, ışık ve bahçe kullanımı üçünde farklı.',
    ],
    sss: [
      {
        s: 'Arsa payı ne demek, neden önemli?',
        c: 'Villanın oturduğu parselden size düşen pay. Kapalı alan aynı olsa bile '
          + 'arsa payı büyük olan villa hem daha pahalı hem ikinci elde daha likit '
          + 'oluyor. Proje sayfasında arsa alanı yazılı.',
      },
      {
        s: 'Müstakil, ikiz ve sıralı villa arasındaki fark ne?',
        c: 'Müstakil villa kendi parselinde ve dört cephesi açık. İkiz villa bir '
          + 'duvarı komşusuyla paylaşıyor. Sıralı villa iki yanından bitişik. Fiyat '
          + 'sırası genelde aynı yönde: müstakil en yüksek.',
      },
      {
        s: 'Villa projelerinde site yönetimi ve aidat oluyor mu?',
        c: 'Kapalı site içindeki villalarda evet — güvenlik, peyzaj ve ortak tesis '
          + 'giderleri için. Aidat tutarı satın alma öncesi firmadan yazılı istenmeli; '
          + 'bahçeli villalarda daire aidatının üzerinde olabiliyor.',
      },
      {
        s: 'Deprem yönetmeliği villalarda da geçerli mi?',
        c: 'Evet. 2018 Türkiye Bina Deprem Yönetmeliği tüm yeni yapıları kapsıyor. '
          + 'Projenin ruhsat tarihi bu yönetmelik sonrasıysa proje sayfasında '
          + 'etiketle işaretli.',
      },
    ],
    not: 'Villa fiyatları arsa payı ve konuma göre aynı proje içinde de değişiyor. '
      + 'Listedeki rakam başlangıç fiyatıdır.',
  },

  OFIS: {
    tip: 'OFIS',
    slug: 'ofis-projeleri',
    h1: 'Ofis Projeleri',
    ustBaslik: 'Yeni ofis ve iş merkezi projeleri',
    ozet: 'Ofis ve iş merkezi projeleri: bölünebilir kat ofisi, açık plan ve '
      + 'tam kat seçenekleriyle metrekare ve teslim bilgisi.',
    metaOzet: 'Ofis projeleri: kat ofisi, açık plan ve tam kat seçenekleri, '
      + 'metrekare ve teslim tarihiyle. Yatırım ve kullanım amaçlı.',
    anahtar: [
      'ofis projeleri', 'satılık ofis', 'iş merkezi projeleri',
      'kat ofisi', 'plaza projeleri', 'yeni ofis projeleri',
    ],
    giris: [
      'Ofis alımı iki farklı amaçla yapılıyor ve ikisi farklı şeye bakıyor: '
      + 'kullanım için alan kişi ulaşımı, otoparkı ve bölünebilirliği; yatırım için '
      + 'alan kira çarpanını ve bölgedeki boşluk oranını önceliyor.',
      'Ofiste metrekare tanımı konuttan daha kritik: kiralanabilir alan ile brüt '
      + 'alan arasındaki fark (ortak alan katsayısı) doğrudan kira gelirini '
      + 'belirliyor. Proje sayfasındaki tabloda brüt ve net ayrı satırlarda.',
    ],
    sss: [
      {
        s: 'Kat ofisi ile bölünebilir ofis arasındaki fark ne?',
        c: 'Kat ofisi bir katın tamamı ve tek tapu. Bölünebilir ofis, katın '
          + 'projede tanımlı bölmelere ayrılabilmesi demek — ihtiyaç büyüdükçe yan '
          + 'birimi alıp birleştirmeye izin veriyor.',
      },
      {
        s: 'Ofis projelerinde otopark payı nasıl hesaplanıyor?',
        c: 'Genelde her belirli metrekare için bir araçlık pay veriliyor ve pay '
          + 'tapuya işlenmiyor, yönetim planında tanımlanıyor. Kaç araçlık olduğunu '
          + 'satın alma öncesi yazılı isteyin.',
      },
      {
        s: 'Ofis alırken KDV oranı ne?',
        c: 'Ofis ve iş yeri satışında KDV oranı konuttan farklı işliyor ve metrekare '
          + 'eşiğine bağlı değil. Güncel oranı ve istisnaları satın alma öncesi mali '
          + 'müşavirinize doğrulatın; bu sayfa vergi tavsiyesi vermiyor.',
      },
      {
        s: 'Karma projeler neden ofis listesinde de çıkıyor?',
        c: 'İçinde hem konut hem ofis bulunan projeler her iki listede de görünüyor — '
          + 'o projedeki ofis birimleri ofis arayanı da ilgilendiriyor.',
      },
    ],
    not: 'Ofis fiyatları kat, cephe ve bölünme seçeneğine göre değişiyor. Listedeki '
      + 'rakam başlangıç fiyatıdır.',
  },
};

export const TIP_VITRIN_LISTESI = Object.values(TIP_VITRINLERI);

/** Ana sayfadaki tip kartlarının ve menünün kullandığı yol. */
export function tipYolu(tip: ProjeTipi): string {
  return tip === 'KARMA' ? '/arama' : `/${TIP_VITRINLERI[tip].slug}`;
}
