import 'server-only';
import { site } from './site';

/* ============================================================
   IndexNow — Bing, Yandex, Naver ve Seznam'a anında bildirim.

   Google IndexNow'ı KULLANMIYOR; onun için sitemap ve tarama bütçesi
   geçerli. Ama Bing ve Yandex Türkiye'de yok sayılacak paylara sahip
   değil, üstelik IndexNow tek bir HTTP isteği — maliyeti sıfıra yakın.

   Doğrulama: `INDEXNOW_ANAHTAR` değeri hem istekte gönderiliyor hem de
   `/{anahtar}.txt` adresinde yayınlanıyor. Sunucular anahtarı o
   adresten okuyup isteğin gerçekten alan adı sahibinden geldiğini
   doğruluyor.

   Anahtar tanımlı değilse bildirim sessizce atlanıyor.
   ============================================================ */

const UC_NOKTA = 'https://api.indexnow.org/indexnow';

export interface BildirimSonucu {
  gonderildi: boolean;
  adet: number;
  durum?: number;
  hata?: string;
}

export const indexNowAnahtari = () => process.env.INDEXNOW_ANAHTAR?.trim() ?? '';

/**
 * URL listesini bildirir.
 *
 * Tek seferde en fazla 10.000 URL kabul ediliyor; biz zaten çok daha
 * azını gönderiyoruz. Bildirim başarısız olursa çağıran akış
 * etkilenmiyor — bu bir optimizasyon, kritik yol değil.
 */
export async function indexNowBildir(yollar: string[]): Promise<BildirimSonucu> {
  const anahtar = indexNowAnahtari();
  if (!anahtar) return { gonderildi: false, adet: 0, hata: 'INDEXNOW_ANAHTAR tanımlı değil' };

  const temiz = [...new Set(yollar)].filter(Boolean).slice(0, 9_000);
  if (temiz.length === 0) return { gonderildi: false, adet: 0, hata: 'Bildirilecek URL yok' };

  const host = new URL(site.url).host;

  try {
    const yanit = await fetch(UC_NOKTA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: anahtar,
        // Varsayılan `/{anahtar}.txt` yerine sabit yol: Next dinamik
        // segmenti `[anahtar].txt` biçiminde ayrıştırmıyor.
        keyLocation: `${site.url.replace(/\/$/, '')}/indexnow-key.txt`,
        urlList: temiz.map((y) => (y.startsWith('http') ? y : new URL(y, site.url).toString())),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    // 200 ve 202 başarı; 422 "URL'ler host ile eşleşmiyor"
    return {
      gonderildi: yanit.ok,
      adet: temiz.length,
      durum: yanit.status,
      hata: yanit.ok ? undefined : `HTTP ${yanit.status}`,
    };
  } catch (e) {
    return {
      gonderildi: false, adet: temiz.length,
      hata: e instanceof Error ? e.message : 'ağ hatası',
    };
  }
}

/** Bir projenin güncellendiğini bildirir (TR + varsa EN). */
export async function projeBildir(slug: string, ingilizceVar = false): Promise<BildirimSonucu> {
  const yollar = [`/proje/${slug}`];
  if (ingilizceVar) yollar.push(`/en/project/${slug}`);
  return indexNowBildir(yollar);
}
