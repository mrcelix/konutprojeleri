import type { Metadata } from 'next';
import TipVitrini from '@/components/TipVitrini';
import { getProjelerByTip } from '@/lib/queries';
import { TLkisa } from '@/lib/bicim';
import { meta } from '@/lib/seo';
import { TIP_VITRINLERI } from '@/lib/tip-vitrin';

/* Konut projeleri vitrini.

   Gövde `components/TipVitrini.tsx` içinde: üç tip sayfası aynı
   iskeleti taşıyor, farkları metin ve sorgudaki tip.

   `revalidate` bölge iniş sayfalarıyla aynı: envanter gün içinde
   değişiyor ama saatte birden sık değişmiyor. */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const v = TIP_VITRINLERI.KONUT;
  const list = await getProjelerByTip('KONUT');
  const enDusuk = list.length ? Math.min(...list.map((p) => p.fiyatMin)) : 0;

  return meta({
    baslik: `${v.h1} — KonutProjeleri`,
    /* Sayı ve fiyat AÇIKLAMAYA giriyor: arama sonucunda "8 konut
       projesi, ₺3,10 milyon'dan başlayan" satırı jenerik bir tanıtım
       cümlesinden çok daha yüksek tıklanıyor. Envanter boşken ikisi
       de yazılmıyor — sıfır sayı vaat değil uyarı olurdu. */
    aciklama: list.length
      ? `${list.length} konut projesi.${enDusuk ? ` ${TLkisa(enDusuk)}'den başlayan fiyatlar.` : ''} `
        + v.metaOzet
      : v.metaOzet,
    yol: `/${v.slug}`,
    gorsel: list[0]?.foto[0],
    anahtar: v.anahtar,
  });
}

export default function KonutProjeleriSayfasi() {
  return <TipVitrini tip="KONUT" />;
}
