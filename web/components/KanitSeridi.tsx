import Link from 'next/link';
import Icon from './Icon';
import type { MetinOkuyucu } from '@/lib/icerik';
import type { MetinAnahtari } from '@/lib/metin-kayit';
import type { KanitOzeti } from '@/lib/kanit';

/* ============================================================
   Kanıt şeridi — hero'nun hemen altında.

   Üst çubuktaki güven şeridi ve hero'daki cam şerit birer VAAT
   söylüyor. Vaat tekrarlandıkça değil kanıtlandıkça güven
   kazanıyor; bu üç kutu aynı sözleri TARİHLİ SAYILARLA söylüyor ve
   her biri kanıtın durduğu sayfaya bağlanıyor.

   Kontrol kutusu ORAN gösteriyor, "hepsi" demiyor: raporsuz proje
   varsa cümle "12'nin 9'u" oluyor. Daha az etkileyici ama doğru —
   ve tersi fark edildiğinde sayfadaki bütün rakamları şüpheli hâle
   getiriyor.
   ============================================================ */

const ayYil = (iso: string | null) => (iso
  ? new Date(iso).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
  : '—');

export default function KanitSeridi({
  ozet, m,
}: {
  ozet: KanitOzeti;
  /** Metin kaydından okuyan çözücü (`lib/icerik.ts`) */
  m: MetinOkuyucu;
}) {
  /* Hiç proje yoksa şerit boş bir vaat kutusuna dönüşürdü. */
  if (ozet.proje === 0) return null;

  /* Yer tutucuları METİN OKUYUCUSU dolduruyor, burada elle değil:
     `m()` zaten `{marka}` gibi site geneli değişkenleri çözüyor ve
     sayfaya özgü olanlar ona geçiriliyor. `{proje}` adı BİLEREK
     kullanılmıyor — o, site geneli pazarlama rakamına bağlı. */
  const dgs = (tarih: string | null) => ({
    toplam: ozet.proje,
    kontrollu: ozet.kontrollu,
    madde: ozet.madde,
    tarih: ayYil(tarih),
  });

  const kutular = [
    {
      k: 'kontrol' as const,
      ikon: 'shield' as const,
      tarih: ozet.sonKontrol,
      yol: '/yerinde-inceleme',
      bag: 'İnceleme nasıl işliyor?',
      /* Rapor hiç yoksa kutu vaat kutusuna dönüyordu: sayı yerine
         "0 proje incelendi" yazmak da doğru ama sayfada iyi
         durmuyor — kutu tamamen düşüyor. */
      goster: ozet.kontrollu > 0,
    },
    {
      k: 'plan' as const,
      ikon: 'plan' as const,
      tarih: null,
      yol: '/nasil-calisir',
      bag: 'Fiyat ve tip tablosunu görün',
      goster: true,
    },
    {
      k: 'firma' as const,
      ikon: 'building' as const,
      tarih: ozet.sonCekim,
      yol: '/firmalar',
      bag: 'Firmaları inceleyin',
      goster: true,
    },
  ].filter((x) => x.goster);

  return (
    <section className="kanit-serit" aria-label="KonutProjeleri güvencesi">
      <div className="wrap kanit-izgara">
        {kutular.map((x) => (
          <article className="kanit-kutu" key={x.k}>
            <span className="kanit-ikon" aria-hidden="true">
              <Icon n={x.ikon} s={19} sw={1.9} />
            </span>
            <h2>{m(`anasayfa.kanit.${x.k}.baslik` as MetinAnahtari, dgs(x.tarih))}</h2>
            <p>{m(`anasayfa.kanit.${x.k}.metin` as MetinAnahtari, dgs(x.tarih))}</p>
            <Link href={x.yol}>
              {x.bag} <Icon n="arrowR" s={14} sw={2.2} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
