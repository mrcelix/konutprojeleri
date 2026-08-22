import 'server-only';
import type { DepoSurucu } from './index';

/* ============================================================
   Supabase Storage sürücüsü.

   Veritabanı zaten Supabase'de; depolama için ayrı hesap açmak
   gerekmiyor. SDK da kurulmuyor — REST arayüzü üç uç noktadan
   ibaret, `fetch` yetiyor.

   SERVIS ANAHTARI SUNUCUDA KALIR. `SUPABASE_SERVICE_ROLE` satır
   seviyesi güvenliğini (RLS) tümüyle atlıyor; `NEXT_PUBLIC_` ön eki
   ALMAMALI, istemciye sızarsa tüm veritabanı yazılabilir hâle gelir.
   Bu dosya `server-only` ile kilitli.

   Kova (bucket) HERKESE AÇIK OKUMA ile oluşturulmalı: görseller
   `next/image` tarafından imzasız çekiliyor. Yazma yalnızca servis
   anahtarıyla yapıldığı için açık okuma yazma yetkisi vermiyor.
   ============================================================ */

const KOVA = () => (process.env.SUPABASE_KOVA ?? 'proje-gorsel').trim();
const TABAN = () => (process.env.SUPABASE_URL ?? '').trim().replace(/\/$/, '');
const ANAHTAR = () => (process.env.SUPABASE_SERVICE_ROLE ?? '').trim();

export function supabaseSurucu(): DepoSurucu | null {
  if (!TABAN() || !ANAHTAR()) return null;

  return {
    ad: 'supabase',

    async yaz(anahtar, veri, icerikTipi) {
      const y = await fetch(`${TABAN()}/storage/v1/object/${KOVA()}/${anahtar}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ANAHTAR()}`,
          'Content-Type': icerikTipi,
          // Aynı anahtara ikinci kez yazmak hata değil; yeniden deneme
          // yarıda kalmış bir yüklemeyi tamamlayabilmeli.
          'x-upsert': 'true',
          'cache-control': 'public, max-age=31536000, immutable',
        },
        body: new Uint8Array(veri),
      });
      if (!y.ok) {
        const govde = await y.text().catch(() => '');
        // Anahtar gövdeye yansımıyor; mesaj günlüğe düşecek
        throw new Error(`Supabase yükleme başarısız (${y.status}): ${govde.slice(0, 200)}`);
      }
    },

    async sil(anahtar) {
      const y = await fetch(`${TABAN()}/storage/v1/object/${KOVA()}/${anahtar}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${ANAHTAR()}` },
      });
      // 404 sorun değil: satır silinmeli, kayıp dosya engel olmamalı
      if (!y.ok && y.status !== 404) {
        throw new Error(`Supabase silme başarısız (${y.status})`);
      }
    },

    url(anahtar) {
      return `${TABAN()}/storage/v1/object/public/${KOVA()}/${anahtar}`;
    },
  };
}
