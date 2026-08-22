/* ============================================================
   KONUTPROJELERI KONTROL RAPORU — madde kaydı.

   Ekip her projeyi yayına almadan önce şantiyede geziyor ama bu iş
   sitede GÖRÜNMÜYORDU: "her proje yerinde incelendi" cümlesi güven
   şeridinde bir vaat olarak duruyor, arkasında tarih, kim gezdi ve
   neye bakıldığı yoktu. Rapor o vaadi kanıta çeviriyor.

   MADDELER SATIŞ VAADİNİ DEĞİL BELGEYİ kovalıyor. Alıcının kendi
   başına doğrulayamadığı şeyler bunlar: ruhsat var mı, kat irtifakı
   kurulmuş mu, şantiyedeki ilerleme reklamdaki ilerlemeyle aynı mı,
   örnek daire gerçekten satılan tiple aynı ölçüde mi. "Manzara güzel
   mi" gibi bir madde yok — o alıcının kendi kararı ve bizim
   söyleyeceğimiz bir şey değil.

   Maddeler koda gömülü, veritabanına DEĞİL: liste ürünün standardı,
   proje başına değişmiyor. Yeni bir madde eklemek buraya bir satır
   yazmak; göç gerekmiyor ve eski raporlar "bakılmadı" olarak
   görünüyor — kendiliğinden "geçti" saymak, yapılmamış bir kontrolü
   yapılmış göstermek olurdu.
   ============================================================ */

export type KontrolDurum = 'gecti' | 'kalmadi' | 'uygulanmaz';

export interface KontrolMadde {
  kod: string;
  grup: string;
  ad: string;
  /** Yöneticiye ne aradığını söyleyen kısa açıklama */
  ipucu?: string;
}

export const KONTROL_MADDELERI: KontrolMadde[] = [
  /* ---------------- Ruhsat ve tapu ---------------- */
  { kod: 'yapi-ruhsati', grup: 'Ruhsat ve tapu', ad: 'Yapı ruhsatı görüldü', ipucu: 'Ruhsat tarihi ve numarasını nota yazın.' },
  { kod: 'tapu-durumu', grup: 'Ruhsat ve tapu', ad: 'Tapu durumu ilandakiyle aynı', ipucu: 'Kat irtifakı mı arsa tapusu mu — sitede yazan neyse o.' },
  { kod: 'imar', grup: 'Ruhsat ve tapu', ad: 'İmar durumu ve emsal teyit edildi' },
  { kod: 'iskan', grup: 'Ruhsat ve tapu', ad: 'İskân durumu soruldu', ipucu: 'Teslim edilmiş projede alınmış olmalı.' },

  /* ---------------- Şantiye ---------------- */
  { kod: 'ilerleme', grup: 'Şantiye', ad: 'İlerleme yüzdesi yerinde doğrulandı', ipucu: 'Sitede yazan oranla şantiyedeki durum karşılaştırıldı.' },
  { kod: 'blok-sayisi', grup: 'Şantiye', ad: 'Blok ve kat sayısı sayıldı' },
  { kod: 'is-guvenligi', grup: 'Şantiye', ad: 'İş güvenliği önlemleri yerinde' },
  { kod: 'calisma', grup: 'Şantiye', ad: 'Şantiye ziyaret günü fiilen çalışıyordu', ipucu: 'Duran şantiye teslim tarihi için en güçlü uyarı.' },

  /* ---------------- Örnek daire ---------------- */
  { kod: 'ornek-daire', grup: 'Örnek daire', ad: 'Örnek daire gezildi' },
  { kod: 'ornek-olcu', grup: 'Örnek daire', ad: 'Örnek dairenin ölçüsü kat planıyla aynı', ipucu: 'Metreyle ölçün; "temsilidir" denen daire sık sık büyük yapılıyor.' },
  { kod: 'malzeme', grup: 'Örnek daire', ad: 'Kullanılan malzeme sözleşme ekiyle aynı' },
  { kod: 'net-brut', grup: 'Örnek daire', ad: 'Net / brüt farkı açıkça soruldu', ipucu: 'Alıcının en sık yanıldığı yer burası.' },

  /* ---------------- Sosyal tesis ---------------- */
  { kod: 'tesis-var', grup: 'Sosyal tesis', ad: 'İlandaki sosyal tesisler projede karşılığı var' },
  { kod: 'tesis-teslim', grup: 'Sosyal tesis', ad: 'Tesislerin hangi etapta teslim edileceği soruldu', ipucu: 'Havuz üçüncü etapta teslim ediliyorsa alıcı bunu bilmeli.' },
  { kod: 'otopark', grup: 'Sosyal tesis', ad: 'Otopark hakkı daireye mi projeye mi bağlı' },
  { kod: 'aidat', grup: 'Sosyal tesis', ad: 'Aidat tahmini gerekçesiyle alındı' },

  /* ---------------- Konum ---------------- */
  { kod: 'ulasim', grup: 'Konum', ad: 'Metro / ana arter mesafesi yürüyerek ölçüldü', ipucu: 'Kaç dakika sürdüğünü nota yazın.' },
  { kod: 'cevre-parsel', grup: 'Konum', ad: 'Komşu parsellerin imar durumuna bakıldı', ipucu: 'Manzara vaadi ancak bu kontrolle anlam taşıyor.' },
  { kod: 'gurultu', grup: 'Konum', ad: 'Gürültü ve trafik yerinde gözlendi' },

  /* ---------------- Kayıt ---------------- */
  { kod: 'gorsel', grup: 'Kayıt', ad: 'Görseller bu ziyarette çekildi', ipucu: 'Render değil, şantiyenin bugünkü hâli.' },
  { kod: 'yetkili', grup: 'Kayıt', ad: 'Firma yetkilisiyle yüz yüze görüşüldü' },
];

export const KONTROL_GRUPLARI = [...new Set(KONTROL_MADDELERI.map((m) => m.grup))];

export const kontrolMaddesi = (kod: string) => KONTROL_MADDELERI.find((m) => m.kod === kod);

/** Rapordaki tek satır. `not` yalnızca doluysa gösteriliyor. */
export interface KontrolSonuc {
  kod: string;
  durum: KontrolDurum;
  not?: string;
}

/** JSON sütunu tip güvenli değil; okurken doğrulanıyor. */
export function sonuclariAyikla(ham: unknown): KontrolSonuc[] {
  if (!Array.isArray(ham)) return [];
  return ham.flatMap((x): KontrolSonuc[] => {
    if (!x || typeof x !== 'object') return [];
    const o = x as Record<string, unknown>;
    const kod = typeof o.kod === 'string' ? o.kod : '';
    const durum = o.durum === 'gecti' || o.durum === 'kalmadi' || o.durum === 'uygulanmaz'
      ? o.durum : null;
    if (!kod || !durum || !kontrolMaddesi(kod)) return [];
    const not = typeof o.not === 'string' && o.not.trim() ? o.not.trim() : undefined;
    return [{ kod, durum, ...(not ? { not } : {}) }];
  });
}

/** Rapor özeti: kaç madde geçti, kaç madde bakıldı. */
export function kontrolOzeti(sonuclar: KontrolSonuc[]) {
  const bakilan = sonuclar.filter((s) => s.durum !== 'uygulanmaz');
  const gecen = bakilan.filter((s) => s.durum === 'gecti').length;
  return {
    gecen,
    bakilan: bakilan.length,
    kalan: bakilan.length - gecen,
    toplam: KONTROL_MADDELERI.length,
    notlu: sonuclar.filter((s) => s.not).length,
  };
}
