import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { meta } from '@/lib/seo';
import { site } from '@/lib/site';
import { yazilar } from '@/lib/yazi';

export const metadata = meta({
  baslik: 'Konut alma rehberi',
  aciklama:
    'Bölge bölge konut alma rehberi: hangi ilçede ne tür arz var, '
    + 'ne yenir. Ekibimizin yerinde topladığı notlar.',
  yol: '/rehber',
  anahtar: ['konut alma rehberi', 'sıfır daire alırken', 'proje seçerken nelere dikkat'],
});

export const revalidate = 3600;

const trTarih = (d: Date) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);

export default async function Rehber() {
  const liste = await yazilar();

  return (
    <div className="wrap">
      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow eyebrow-hap"><Icon n="grid" s={14} sw={2} /> Rehber</span>
            <h1 className="h1" style={{ marginTop: 10 }}>Konut alma rehberi</h1>
            <p>
              Bölgeleri ziyaret ederken not ettiklerimiz: ne zaman gidilir,
              hangi mevkide kalınır, nerede ne yenir. {site.ad} ekibinin
              yerinde topladığı bilgiler.
            </p>
          </div>
        </div>

        {liste.length === 0 ? (
          <div className="p-bos">
            <Icon n="grid" s={26} />
            <p>Henüz yazı yayımlanmadı. Yakında burada olacak.</p>
          </div>
        ) : (
          <div className="yazi-grid">
            {liste.map((y, i) => (
              <article className="yazi-kart" key={y.slug}>
                <Link href={`/rehber/${y.slug}`}>
                  <div className="yazi-foto">
                    {y.kapak
                      ? (
                        <Image src={y.kapak} alt="" width={640} height={420}
                          sizes="(max-width: 900px) 100vw, 33vw"
                          priority={i < 3} style={{ objectFit: 'cover' }} />
                      )
                      : <span className="bakilan-bos" aria-hidden="true"><Icon n="grid" s={24} /></span>}
                  </div>
                  <div className="yazi-govde">
                    {y.bolge && <span className="yazi-bolge">{y.bolge.ad}</span>}
                    <h2>{y.baslik}</h2>
                    <p>{y.ozet}</p>
                    <span className="yazi-meta">
                      <Icon n="clock" s={13} /> {y.okumaDk} dk okuma
                      {' · '}{trTarih(y.yayinTarihi)}
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
