import { aktifKullanici } from '@/lib/auth';
import { csvYaz } from '@/lib/csv';
import { sablonSatirlari } from '@/lib/ice-aktar';

/* Örnek içe aktarma dosyası.

   Şablon YETKİ İSTİYOR: içinde gerçek bölge ve firma adı geçmiyor
   ama panelin iç yapısını anlatıyor, herkese açık olmasına gerek yok.

   Noktalı virgül ayracı ve BOM ile yazılıyor: Türkçe Excel dosyayı
   çift tıklamayla açtığında sütunlara doğru bölsün ve Türkçe
   karakterler bozulmasın. */
export async function GET() {
  const k = await aktifKullanici();
  if (!k || k.rol !== 'ADMIN') {
    return new Response('Yetkisiz', { status: 401 });
  }

  return new Response(csvYaz(sablonSatirlari()), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="konutprojeleri-proje-sablon.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
