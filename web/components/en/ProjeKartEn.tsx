import Link from 'next/link';
import Icon from '@/components/Icon';
import type { ProjeEnGorunum } from '@/lib/queries-en';

const TL = (n: number) =>
  `TRY ${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(n / 1_000_000)}M`;

/** Delivery is shown as a quarter, never a day — same rule as the Turkish side. */
function ceyrek(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
}

/**
 * İngilizce proje kartı.
 *
 * Türkçe `ProjeKart` yeniden kullanılmıyor: o bileşen istemci tarafı
 * (galeri, favori, karşılaştırma) ve etiketleri Türkçe basıyor.
 * Buradaki kart sunucuda çiziliyor ve aynı `vcard` biçimlerini
 * kullanıyor — görünüm ortak, metin ayrı.
 */
export default function ProjeKartEn({ p }: { p: ProjeEnGorunum }) {
  const teslim = ceyrek(p.teslimTarihi);
  const odalar = [...new Set(p.daireTipleri.map((d) => d.oda))];
  const oda = odalar.length > 1 ? `${odalar[0]} – ${odalar.at(-1)}` : odalar[0];

  return (
    <article className="vcard">
      <div className="vcard-media">
        <Link href={`/en/project/${p.slug}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.foto[0]} alt={p.fotoAlt[0] ?? p.ad} loading="lazy" />
        </Link>
      </div>

      <Link className="vcard-body" href={`/en/project/${p.slug}`}>
        <div className="vcard-head">
          <h3 className="vcard-title">{p.ad}</h3>
          <span className="vcard-firma">{p.firmaAd}</span>
        </div>

        <div className="vcard-loc"><Icon n="pin" s={13} /> {p.mahalle}, {p.bolge}</div>

        <div className="vcard-specs">
          {oda && <span><Icon n="home" s={13} /> {oda}</span>}
          {p.toplamBagimsizBolum && (
            <span><Icon n="building" s={13} /> {p.toplamBagimsizBolum} units</span>
          )}
        </div>

        <div className="vcard-tags">
          {teslim && <span className="badge"><Icon n="clock" s={11} /> {teslim}</span>}
          {/* İlerleme yalnızca ANLAMLI olduğunda: %0 "başlamadı" demek
              ve rozet olarak basmak kötü haber gibi duruyor. */}
          {p.ilerlemeYuzde > 0 && (
            <span className="badge"><Icon n="crane" s={11} /> {p.ilerlemeYuzde}% complete</span>
          )}
          {p.taksitAyi > 0 && (
            <span className="badge"><Icon n="percent" s={11} /> {p.taksitAyi} instalments</span>
          )}
        </div>
      </Link>

      <div className="vcard-alt">
        {/* Fiyat "…and up": projenin tek fiyatı yok, en küçük tipin
            fiyatı yazılıyor. */}
        <div className="vcard-price">
          <span className="vcard-fiyat-sol">
            <b>{TL(p.fiyatMin)}{p.fiyatMax ? ` – ${TL(p.fiyatMax)}` : ' and up'}</b>
          </span>
        </div>
        <Link className="btn btn-cta btn-sm vcard-detay" href={`/en/project/${p.slug}`}>
          Details <Icon n="arrowR" s={15} />
        </Link>
      </div>
    </article>
  );
}
