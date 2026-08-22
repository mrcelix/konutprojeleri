import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import HeroFormu, { HeroEylem } from '@/components/panel/HeroEylem';
import HeroYukle from '@/components/panel/HeroYukle';
import { VARSAYILAN_HERO, heroListesi } from '@/lib/hero';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YonetimHero() {
  const { kullanici, nav, kok } = await yonetimBaglam();
  const liste = await heroListesi();
  const aktif = liste.filter((h) => h.aktif);

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Hero görselleri"
      aciklama={aktif.length
        ? `${aktif.length} görsel yayında${aktif.length > 1 ? ' · geçişli gösteri' : ''}`
        : 'Varsayılan görsel kullanılıyor'}
      eylem={<Link className="btn btn-ghost btn-sm" href="/">Ana sayfayı gör</Link>}
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Ana sayfanın üstündeki bant. <b>Birden fazla görsel eklerseniz</b> hero
          yavaş geçişli bir gösteriye dönüşür; tek görselde geçiş olmaz.
          Liste boşken site aşağıdaki varsayılanı gösterir.
          Alt metin <b>zorunlu</b>: hero sayfanın en büyük görseli ve alt metni
          olmadan ekran okuyucu kullanan biri sayfanın ne anlattığını
          öğrenemiyor.
        </p>
      </div>

      {/* İKİ YOL: bilgisayardan yükleme ve adres girme. Yükleme
          önce duruyor çünkü artık olağan yol o; adres girme, hazır
          bir CDN bağlantısı olan durumlar için kalıyor. */}
      <section className="kart" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 12px' }}>Bilgisayardan yükle</h2>
        <HeroYukle />
      </section>

      <section className="kart" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 12px' }}>Adres girerek ekle</h2>
        <HeroFormu />
      </section>

      <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 10px' }}>Görseller</h2>

      {liste.length === 0 ? (
        <article className="kart">
          <div className="hero-panel-kare">
            <Image src={VARSAYILAN_HERO} alt="" width={480} height={200}
              sizes="480px" style={{ objectFit: 'cover' }} />
          </div>
          <p className="small muted" style={{ margin: '10px 0 0' }}>
            Şu an yayında olan <b>varsayılan görsel</b> — koddan geliyor.
            Yukarıdan bir görsel eklediğinizde yerini alır.
          </p>
        </article>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {liste.map((h, i) => (
            <article className="kart" key={h.id} style={{ opacity: h.aktif ? 1 : 0.55 }}>
              <div className="teklif-satir-bas">
                <div style={{ minWidth: 0 }}>
                  <span className="tiny dim">
                    {i + 1}. sıra{!h.aktif && ' · gizli'}{h.etiket && ` · etiket: ${h.etiket}`}
                  </span>
                  <div className="hero-panel-kare" style={{ marginTop: 6 }}>
                    <Image src={h.url} alt="" width={480} height={200}
                      sizes="480px" style={{ objectFit: 'cover' }} />
                  </div>
                  <p className="tiny dim" style={{ margin: '8px 0 0', wordBreak: 'break-all' }}>{h.url}</p>
                  <p className="tiny" style={{ margin: '4px 0 0' }}>{h.alt}</p>
                </div>
                <HeroEylem id={h.id} aktif={h.aktif} />
              </div>

              <div style={{ marginTop: 12 }}>
                <HeroFormu h={{
                  id: h.id, url: h.url, alt: h.alt, etiket: h.etiket,
                  sira: h.sira, aktif: h.aktif,
                }} />
              </div>
            </article>
          ))}
        </div>
      )}
    </PanelKabuk>
  );
}
