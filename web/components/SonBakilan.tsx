'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import KaydirRay from './KaydirRay';
import { TLkisa } from '@/lib/bicim';
import {
  bakilanlariSuz, sonBakilanKaydet, sonBakilanlariOku, sonBakilanlariSil,
  type BakilanProje,
} from '@/lib/son-bakilan';

/* ============================================================
   Son bakılan projeler.

   İki iş yapıyor: açık projeyi geçmişe yazmak (`kaydet` verilirse) ve
   geçmişi listelemek. Ayrı bileşen olsalardı proje sayfasının ikisini
   birden basması gerekirdi; kaydeden ile listeleyen aynı depoyu
   okuyor.

   Liste yalnızca istemcide okunuyor: sunucuda localStorage yok ve ilk
   render'ın boş olması hidrasyon uyuşmazlığını önlüyor.
   ============================================================ */

export default function SonBakilan(
  { kaydet, baslik = 'Son baktıklarınız', guncelFiyat }:
  {
    kaydet?: Omit<BakilanProje, 'zaman'>;
    baslik?: string;
    /**
     * slug → şu anki başlangıç fiyatı. Verilirse düşen fiyat işaretleniyor.
     * Satılık ilanlar buraya girmiyor: satış bedeli için "düştü"
     * rozeti hazırlayan bir mekanizma yok.
     */
    guncelFiyat?: Record<string, number>;
  },
) {
  const [liste, setListe] = useState<BakilanProje[]>([]);

  useEffect(() => {
    /* Önce OKU sonra yaz: aksi halde açık proje kendi listesinin
       başında çıkardı ve "son baktıklarınız" şu an bakılanı gösterirdi. */
    const onceki = sonBakilanlariOku();
    setListe(bakilanlariSuz(onceki, kaydet?.slug));
    if (kaydet) sonBakilanKaydet(kaydet);
    // `kaydet` her render'da yeni nesne; slug'a bağlanıyor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kaydet?.slug]);

  if (liste.length === 0) return null;

  /* FİYAT DÜŞTÜ Mü: bakılan andaki fiyat listeyle birlikte saklanıyor,
     şu anki fiyat sunucudan geliyor. İkisini karşılaştırmak için ne
     hesap ne de bildirim altyapısı gerekiyor — ziyaretçi döndüğünde
     farkı görüyor.

     Yükselen fiyat GÖSTERİLMİYOR: konut fiyatı zaten çıkıyor ve
     "bakarken 4,2 milyondu, şimdi 4,6" bilgisi kimseye yardımcı
     olmuyor, yalnızca caydırıyor. Düşüş ise gerçek bir haber:
     lansman indirimi ya da kampanya demek. */
  const dusus = (v: BakilanProje) => {
    const simdi = guncelFiyat?.[v.slug];
    return simdi !== undefined && simdi < v.fiyat ? v.fiyat - simdi : 0;
  };

  return (
    <section className="son-bakilan">
      <div className="son-arama-bas">
        <h2><Icon n="clock" s={15} /> {baslik}</h2>
        <button type="button" className="uyg-temizle"
          onClick={() => { sonBakilanlariSil(); setListe([]); }}>
          Geçmişi sil
        </button>
      </div>

      <KaydirRay className="bakilan-ray" etiket={baslik} yenile={liste.length}>
        {liste.map((v) => (
          <Link className="bakilan-kart" key={v.slug} href={`/proje/${v.slug}`}>
            {dusus(v) > 0 && (
              <span className="bakilan-dusus">
                <Icon n="spark" s={12} /> {TLkisa(dusus(v))} düştü
              </span>
            )}
            <div className="bakilan-foto">
              {v.gorsel
                ? <Image src={v.gorsel} alt="" width={240} height={160} sizes="200px" style={{ objectFit: 'cover' }} />
                : <span className="bakilan-bos" aria-hidden="true"><Icon n="home" s={20} /></span>}
            </div>
            <b>{v.ad}</b>
            <span className="bakilan-yer">{v.bolge}</span>
            {/* Fiyat "…’den başlayan": projenin tek fiyatı yok, en
                küçük daire tipininki basılıyor. Tek rakamı sabit fiyat
                gibi göstermek, üç odalıya bakan kişiye yanlış rakam
                vaat ederdi. */}
            {dusus(v) > 0 ? (
              <span className="bakilan-fiyat">
                {TLkisa(guncelFiyat![v.slug])}<span>’den</span>
                <s>{TLkisa(v.fiyat)}</s>
              </span>
            ) : (
              <span className="bakilan-fiyat">
                {TLkisa(guncelFiyat?.[v.slug] ?? v.fiyat)}<span>’den</span>
              </span>
            )}
          </Link>
        ))}
      </KaydirRay>
    </section>
  );
}
