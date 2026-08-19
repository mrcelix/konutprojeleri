/**
 * Veri tamamlanma skoru.
 *
 * Panelde "%88 tamamlandı" diye tek bir sayı göstermek işe yaramaz;
 * kullanıcı neyi eksik olduğunu bilmeden puanı yükseltemez. Bu yüzden
 * fonksiyon puanı DEĞİL, puanı oluşturan kalemleri döndürür — arayüz
 * eksikleri tek tek gösterir ve her biri tıklanabilir bir işe döner.
 *
 * Ağırlıklar kullanıcı kararına etkisine göre: fiyatsız bir ilan
 * kimsenin işine yaramaz, tavan yüksekliği ise hoş bir ayrıntıdır.
 *
 * BU DOSYA VERİTABANINA DOKUNMAZ; hem sunucuda hem istemcide çalışır.
 */

export type SkorGirdisi = {
  ad?: string | null;
  aciklama?: string | null;
  teslim_ceyrek?: string | null;
  santiye_yuzde?: number | null;
  toplam_konut?: number | null;
  aidat?: number | null;
  pesinat_orani?: number | null;
  vade_ay?: number | null;
  konum_var?: boolean;
  gorsel_sayisi?: number;
  daire_tipleri?: { liste_fiyati?: number | null; net_m2?: number | null; kalan_adet?: number | null }[];
  ozellik_sayisi?: number;
  fiyat_teyit_tarihi?: string | null;
};

export type SkorKalemi = {
  ad: string;
  puan: number;
  tamam: boolean;
  /** Neden önemli — kullanıcı "niye uğraşayım" diye sorduğunda cevabı. */
  neden: string;
};

const GUN = 864e5;

export function skorKalemleri(p: SkorGirdisi): SkorKalemi[] {
  const dt = p.daire_tipleri ?? [];
  const fiyatliTip = dt.filter((d) => d.liste_fiyati != null).length;
  const m2liTip = dt.filter((d) => d.net_m2 != null).length;
  const teyitli =
    !!p.fiyat_teyit_tarihi &&
    new Date(p.fiyat_teyit_tarihi).getTime() > Date.now() - 90 * GUN;

  return [
    {
      ad: 'Daire tipi ve fiyatı',
      puan: 25,
      tamam: dt.length > 0 && fiyatliTip === dt.length,
      neden: 'Fiyatsız ilan aramada en alta düşer ve talep almaz.',
    },
    {
      ad: 'Metrekare bilgisi',
      puan: 12,
      tamam: dt.length > 0 && m2liTip === dt.length,
      neden: 'm² birim fiyatı hesaplanamazsa proje karşılaştırmaya giremez.',
    },
    {
      ad: 'Görsel',
      puan: 15,
      tamam: (p.gorsel_sayisi ?? 0) >= 3,
      neden: 'Üç görselin altındaki kart listede belirgin biçimde geri planda kalır.',
    },
    {
      ad: 'Teslim çeyreği',
      puan: 10,
      tamam: !!p.teslim_ceyrek,
      neden: 'Teslim takviminde ve teslim yılı filtresinde hiç görünmez.',
    },
    {
      ad: 'Konum (koordinat)',
      puan: 10,
      tamam: !!p.konum_var,
      neden: 'Harita görünümünde ve "metroya yürüme" hesabında çıkmaz.',
    },
    {
      ad: 'Ödeme planı',
      puan: 10,
      tamam: p.pesinat_orani != null && !!p.vade_ay,
      neden: 'Bütçe eşleşmesi sayfasında hesaplanamaz, o listeye hiç girmez.',
    },
    {
      ad: 'Fiyat teyidi (90 gün)',
      puan: 8,
      tamam: teyitli,
      neden: 'Teyit edilmemiş fiyat listede rozetle işaretlenir.',
    },
    {
      ad: 'Açıklama metni',
      puan: 5,
      tamam: (p.aciklama ?? '').trim().length >= 200,
      neden: 'Arama motoru için özgün metin; 200 karakterin altı ince içerik sayılır.',
    },
    {
      ad: 'Şantiye ilerlemesi',
      puan: 3,
      tamam: p.santiye_yuzde != null,
      neden: 'Şantiye durumu filtresinde ve teslim takvimi çubuğunda kullanılır.',
    },
    {
      ad: 'Aidat',
      puan: 2,
      tamam: p.aidat != null,
      neden: 'Karşılaştırma tablosunda boş kalır.',
    },
  ];
}

export function veriSkoru(p: SkorGirdisi): number {
  const kalemler = skorKalemleri(p);
  const toplam = kalemler.reduce((t, k) => t + k.puan, 0);
  const alinan = kalemler.filter((k) => k.tamam).reduce((t, k) => t + k.puan, 0);
  return Math.round((alinan / toplam) * 100);
}
