import Link from 'next/link';
import Image from 'next/image';
import { Pill, SantiyePill, StokPill } from '@/components/ui/Pill';
import { para, paraKisa, m2Birim, teslim, alan } from '@/lib/format';
import { projeYolu } from '@/lib/routing';
import { SepetDugmesi } from '@/components/karsilastir/SepetDugmesi';

/**
 * Proje kartı · liste boyutu.
 *
 * Kartın asıl fikri DAİRE TİPİ TABLOSU: kullanıcı detaya girmeden
 * 1+1'in kaç metrekare ve kaç lira olduğunu görüyor. Tıklama düşer,
 * nitelikli tıklama artar.
 *
 * Zorunlu alanlar (boyut ne olursa olsun): fiyat, teslim, firma.
 * Fiyatı olmayan proje listeden DÜŞMEZ, farklı görünür.
 */

type Props = {
  proje: {
    id: number;
    slug: string;
    ad: string;
    il: string;
    ilce: string;
    mahalle: string | null;
    teslim_ceyrek: string | null;
    santiye_yuzde: number | null;
    aidat: number | null;
    firma_ad: string;
    firma_slug: string;
    min_fiyat: number | null;
    min_m2_birim: number | null;
    kalan_toplam: number | null;
    kapak: string | null;
    metro_dk?: number | null;
  };
  /** Karşılaştırma düğmesi için dönüş adresi. Verilmezse düğme çıkmaz. */
  don?: string;
  sepette?: boolean;
  daireTipleri?: {
    tip: string;
    net_m2: number | null;
    liste_fiyati: number | null;
  }[];
};

export function ProjeKarti({ proje: p, daireTipleri = [], don, sepette }: Props) {
  const yol = projeYolu(p);
  const fiyat = para(p.min_fiyat);

  return (
    <article className="kp-project">
      <div className="kp-project__media">
        {p.kapak && (
          <Image
            src={p.kapak}
            alt={`${p.ad} — ${p.ilce}, ${p.il}`}
            fill
            sizes="(max-width: 767px) 100vw, 212px"
            style={{ objectFit: 'cover' }}
          />
        )}
        <span className="kp-project__flag">
          <SantiyePill yuzde={p.santiye_yuzde} />
        </span>
      </div>

      <div className="kp-project__body">
        <div className="kp-project__firm">
          <Link href={`/firmalar/${p.firma_slug}`} style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {p.firma_ad}
          </Link>
        </div>

        <h3 className="kp-project__title">
          <Link href={yol}>{p.ad}</Link>
        </h3>

        <p className="kp-project__loc">
          {p.il} / {p.ilce}
          {p.mahalle ? ` / ${p.mahalle}` : ''}
          {p.metro_dk != null && (
            <> {' · '}<b style={{ color: 'var(--success)' }}>metroya {p.metro_dk} dk</b></>
          )}
        </p>

        <div className="kp-project__tags">
          {teslim(p.teslim_ceyrek) && <Pill durum="info">{teslim(p.teslim_ceyrek)}</Pill>}
          <StokPill kalan={p.kalan_toplam} />
        </div>

        {/* Kartın asıl değeri: detaya girmeden tip karşılaştırması */}
        {daireTipleri.length > 0 && (
          <dl className="kp-unittable">
            {daireTipleri.slice(0, 4).map((d) => (
              <div className="kp-unittable__cell" key={d.tip}>
                <dt className="kp-unittable__type">{d.tip}</dt>
                <dd style={{ margin: 0 }}>
                  <b className="kp-unittable__price">
                    {paraKisa(d.liste_fiyati) ?? 'Fiyat isteyin'}
                  </b>
                  <span className="kp-unittable__area">{alan(d.net_m2) ?? ''}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="kp-project__aside">
        {fiyat ? (
          <>
            <span className="kp-label">Fiyatlar</span>
            <span className="kp-project__price">{fiyat}</span>
            <span className="kp-project__unit">
              {m2Birim(p.min_fiyat, daireTipleri[0]?.net_m2)}
              {p.aidat ? ` · aidat ${para(p.aidat)}` : ''}
            </span>
          </>
        ) : (
          /* Uydurma fiyat gösterilmez — eylem gösterilir */
          <>
            <span className="kp-label">Fiyat</span>
            <span className="kp-project__unit">Firma henüz açıklamadı</span>
          </>
        )}

        <div className="kp-project__cta">
          <Link href={yol} className="kp-btn is-small">
            {fiyat ? 'Projeyi incele' : 'Fiyat isteyin'}
          </Link>
          {don && <SepetDugmesi slug={p.slug} don={don} sepette={sepette} kucuk />}
        </div>
      </div>
    </article>
  );
}
