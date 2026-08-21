import Link from 'next/link';
import {
  DAIRE_TIPLERI, OZELLIKLER, SANTIYE_DURUMLARI,
  degistir, type Filtre,
} from '@/lib/filtre';
import type { Fasetler } from '@/lib/queries/arama';
import { para } from '@/lib/format';

/**
 * Filtre paneli.
 *
 * İKİ KURAL:
 *
 * 1. Her seçenek gerçek bir <a href>. JavaScript yok — filtre paylaşılabilir,
 *    geri tuşu çalışır, arama motoru filtreli sayfaları görebilir.
 *
 * 2. Her seçeneğin yanında SONUÇ SAYISI var. 0 sonuçlu seçenek soluklaşır
 *    ama GİZLENMEZ; kullanıcı neyin var olmadığını da öğrenir.
 */

type Props = { taban: string; filtre: Filtre; fasetler: Fasetler };

export function FiltrePaneli({ taban, filtre: f, fasetler }: Props) {
  return (
    <aside className="kart" style={{ padding: 'var(--s-4) 0', alignSelf: 'start' }}>
      <Grup baslik="Daire tipi" secili={f.daireTipi?.length}>
        <div className="satir" style={{ gap: 5 }}>
          {DAIRE_TIPLERI.map((tip) => {
            const adet = fasetler.daireTipi[tip] ?? 0;
            return (
              <Link
                key={tip}
                href={degistir(taban, f, 'daireTipi', tip)}
                className={[
                  'chip',
                  f.daireTipi?.includes(tip) && 'is-selected',
                  adet === 0 && 'is-empty',
                ].filter(Boolean).join(' ')}
              >
                {tip}
                <span className="kp-chip__count">{adet}</span>
              </Link>
            );
          })}
        </div>
      </Grup>

      <Grup baslik="Fiyat" secili={f.minFiyat || f.maxFiyat ? 1 : 0}>
        <Histogram veri={fasetler.fiyatHistogram} />
        <div className="satir" style={{ gap: 6, marginTop: 'var(--s-3)' }}>
          {[4_000_000, 6_000_000, 9_000_000, 12_000_000, 20_000_000].map((v) => (
            <Link
              key={v}
              href={degistir(taban, f, 'maxFiyat', v)}
              className={`chip${f.maxFiyat === v ? ' is-selected' : ''}`}
            >
              {para(v)} altı
            </Link>
          ))}
        </div>
      </Grup>

      <Grup baslik="Aylık ödeme" secili={f.maxAylik ? 1 : 0}>
        <div className="satir" style={{ gap: 6 }}>
          {[60_000, 80_000, 100_000, 150_000].map((v) => (
            <Link
              key={v}
              href={degistir(taban, f, 'maxAylik', v)}
              className={`chip${f.maxAylik === v ? ' is-selected' : ''}`}
            >
              {para(v)} altı
            </Link>
          ))}
        </div>
      </Grup>

      <Grup baslik="Teslim" secili={f.teslimYili?.length}>
        <div className="satir" style={{ gap: 5 }}>
          {Object.entries(fasetler.teslimYili)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([yil, adet]) => (
              <Link
                key={yil}
                href={degistir(taban, f, 'teslimYili', Number(yil))}
                className={[
                  'chip',
                  f.teslimYili?.includes(Number(yil)) && 'is-selected',
                  adet === 0 && 'is-empty',
                ].filter(Boolean).join(' ')}
              >
                {yil}
                <span className="kp-chip__count">{adet}</span>
              </Link>
            ))}
        </div>
      </Grup>

      <Grup baslik="Şantiye durumu" secili={f.santiyeDurumu?.length}>
        {Object.entries(SANTIYE_DURUMLARI).map(([anahtar, ad]) => {
          const adet = fasetler.santiye[anahtar] ?? 0;
          return (
            <Secenek
              key={anahtar}
              href={degistir(taban, f, 'santiyeDurumu', anahtar)}
              secili={f.santiyeDurumu?.includes(anahtar) ?? false}
              adet={adet}
            >
              {ad}
            </Secenek>
          );
        })}
      </Grup>

      <Grup baslik="Özellikler" secili={f.ozellik?.length}>
        {Object.entries(OZELLIKLER).map(([anahtar, ad]) => {
          const adet = fasetler.ozellik[anahtar] ?? 0;
          return (
            <Secenek
              key={anahtar}
              href={degistir(taban, f, 'ozellik', anahtar)}
              secili={f.ozellik?.includes(anahtar) ?? false}
              adet={adet}
            >
              {ad}
            </Secenek>
          );
        })}
      </Grup>

      <Grup baslik="Firma">
        {['A+', 'A', 'B'].map((s) => (
          <Secenek
            key={s}
            href={degistir(taban, f, 'sicil', s)}
            secili={f.sicil === s}
          >
            Sicil notu {s}
          </Secenek>
        ))}
      </Grup>
    </aside>
  );
}

function Grup({
  baslik, secili, children,
}: { baslik: string; secili?: number; children: React.ReactNode }) {
  return (
    <section style={{ padding: 'var(--s-4) var(--s-5)', borderBottom: '1px solid var(--border)' }}>
      <h3 className="satir" style={{ fontSize: 12.5, fontWeight: 700, margin: '0 0 var(--s-3)' }}>
        {baslik}
        {secili ? (
          <span className="badge is-brand" style={{ marginLeft: 'auto' }}>{secili}</span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

function Secenek({
  href, secili, adet, children,
}: { href: string; secili: boolean; adet?: number; children: React.ReactNode }) {
  const bos = adet === 0;
  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '4.5px 0',
        fontSize: 12.5,
        color: secili ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: secili ? 650 : 400,
        opacity: bos ? 0.55 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 15, height: 15, borderRadius: 5, flexShrink: 0,
          border: '1.5px solid var(--border-strong)',
          background: secili ? 'var(--brand)' : 'var(--surface-card)',
          borderColor: secili ? 'var(--brand)' : 'var(--border-strong)',
        }}
      />
      {children}
      {adet != null && (
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }} className="sayi">
          {adet}
        </span>
      )}
    </Link>
  );
}

/** Fiyat dağılımı — kullanıcı aralığı seçmeden önce piyasayı görür. */
function Histogram({ veri }: { veri: number[] }) {
  const max = Math.max(1, ...veri);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 26 }} aria-hidden>
      {veri.map((v, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(6, (v / max) * 100)}%`,
            background: 'var(--brand-soft)',
            borderRadius: '2px 2px 0 0',
          }}
        />
      ))}
    </div>
  );
}
