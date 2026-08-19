import Link from 'next/link';
import { FiltrePaneli } from './FiltrePaneli';
import { ProjeKarti } from '@/components/ProjeKarti';
import { ara, kurtarmaOnerileri } from '@/lib/queries/arama';
import {
  SIRALAMALAR, SAYFA_BOYUTU, OZELLIKLER, SANTIYE_DURUMLARI,
  filtreYaz, kaldir, seciliSayisi, type Filtre,
} from '@/lib/filtre';
import { para } from '@/lib/format';

/**
 * Arama sonuçları sayfası.
 *
 * Sol sabit filtre, sağ sonuç. Sonuçlar SUNUCUDAN HTML olarak gelir —
 * JavaScript ile sonradan basılmaz, aksi halde arama motoru göremez.
 */

type Props = { taban: string; baslik: string; filtre: Filtre; girisMetni?: string | null };

export async function AramaSayfasi({ taban, baslik, filtre, girisMetni }: Props) {
  const { sonuclar, toplam, fasetler } = await ara(filtre);
  const secili = seciliSayisi(filtre);
  const sonSayfa = Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU));
  const sayfa = filtre.sayfa ?? 1;

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-5)' }}>
      <h1 className="kp-h1">{baslik}</h1>
      {girisMetni && <p className="kp-lead" style={{ marginBottom: 'var(--s-4)' }}>{girisMetni}</p>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 274px) minmax(0, 1fr)',
          gap: 'var(--s-4)',
          alignItems: 'start',
        }}
      >
        <FiltrePaneli taban={taban} filtre={filtre} fasetler={fasetler} />

        <div className="kp-stack">
          {/* Araç çubuğu */}
          <div className="kp-card kp-row" style={{ padding: 'var(--s-3) var(--s-4)' }}>
            <span style={{ fontSize: 13 }}>
              <b>{toplam}</b> proje
            </span>
            <nav className="kp-row" style={{ marginLeft: 'auto', gap: 4 }} aria-label="Sıralama">
              {SIRALAMALAR.map((s) => (
                <Link
                  key={s.deger}
                  href={taban + filtreYaz({ ...filtre, siralama: s.deger, sayfa: 1 })}
                  className={`kp-chip${filtre.siralama === s.deger ? ' is-selected' : ''}`}
                >
                  {s.ad}
                </Link>
              ))}
            </nav>
          </div>

          {/* Aktif filtreler */}
          {secili > 0 && (
            <div className="kp-row" style={{ gap: 6 }}>
              {filtre.daireTipi?.map((t) => (
                <FiltreCipi key={t} href={kaldir(taban, filtre, 'daireTipi', t)}>{t}</FiltreCipi>
              ))}
              {filtre.maxFiyat && (
                <FiltreCipi href={kaldir(taban, filtre, 'maxFiyat')}>
                  {para(filtre.maxFiyat)} altı
                </FiltreCipi>
              )}
              {filtre.maxAylik && (
                <FiltreCipi href={kaldir(taban, filtre, 'maxAylik')}>
                  Aylık {para(filtre.maxAylik)} altı
                </FiltreCipi>
              )}
              {filtre.teslimYili?.map((y) => (
                <FiltreCipi key={y} href={kaldir(taban, filtre, 'teslimYili', y)}>{y} teslim</FiltreCipi>
              ))}
              {filtre.santiyeDurumu?.map((s) => (
                <FiltreCipi key={s} href={kaldir(taban, filtre, 'santiyeDurumu', s)}>
                  {SANTIYE_DURUMLARI[s] ?? s}
                </FiltreCipi>
              ))}
              {filtre.ozellik?.map((o) => (
                <FiltreCipi key={o} href={kaldir(taban, filtre, 'ozellik', o)}>
                  {OZELLIKLER[o] ?? o}
                </FiltreCipi>
              ))}
              <Link href={taban} style={{ fontSize: 11.5, color: 'var(--brand)', fontWeight: 650 }}>
                Tümünü temizle
              </Link>
            </div>
          )}

          {/* Sonuçlar */}
          {sonuclar.length > 0 ? (
            sonuclar.map((p) => (
              <ProjeKarti key={p.id} proje={p} daireTipleri={p.tipler} />
            ))
          ) : (
            <SonucYok taban={taban} filtre={filtre} />
          )}

          {/* Sayfalama — gerçek bağlantı, sonsuz kaydırma değil */}
          {sonSayfa > 1 && (
            <nav className="kp-row" style={{ justifyContent: 'center', gap: 6 }} aria-label="Sayfalar">
              {sayfa > 1 && (
                <Link href={taban + filtreYaz({ ...filtre, sayfa: sayfa - 1 })} className="kp-chip">
                  ‹ Önceki
                </Link>
              )}
              {sayfaNumaralari(sayfa, sonSayfa).map((n, i) =>
                n === null ? (
                  <span key={`bos-${i}`} style={{ color: 'var(--text-muted)' }}>…</span>
                ) : (
                  <Link
                    key={n}
                    href={taban + filtreYaz({ ...filtre, sayfa: n })}
                    className={`kp-chip${n === sayfa ? ' is-selected' : ''}`}
                  >
                    {n}
                  </Link>
                )
              )}
              {sayfa < sonSayfa && (
                <Link href={taban + filtreYaz({ ...filtre, sayfa: sayfa + 1 })} className="kp-chip">
                  Sonraki ›
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}

function FiltreCipi({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="kp-chip">
      {children} <span aria-hidden style={{ color: 'var(--text-muted)' }}>×</span>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>filtreyi kaldır</span>
    </Link>
  );
}

/**
 * 0 sonuç kurtarma.
 * Genel "filtrelerinizi genişletin" uyarısı işe yaramaz —
 * hangi filtreyi kaldırınca KAÇ sonuç geleceğini sayıyla söyleriz.
 */
async function SonucYok({ taban, filtre }: { taban: string; filtre: Filtre }) {
  const oneriler = await kurtarmaOnerileri(filtre);

  return (
    <div className="kp-card kp-empty">
      <p className="kp-empty__title">Bu filtrelerle sonuç yok</p>
      <p className="kp-empty__text">
        {seciliSayisi(filtre)} filtre birlikte hiçbir projeye uymuyor.
        {oneriler.length > 0 && ' Aşağıdakilerden biri sonuç getirir:'}
      </p>
      {oneriler.map((o) => (
        <Link key={`${o.alan}-${o.ad}`} href={taban + filtreYaz(o.yeni)} className="kp-empty__option">
          <b>{o.ad}</b> filtresini gevşetin → <b>{o.adet} sonuç</b>
        </Link>
      ))}
      <Link href={taban} className="kp-empty__option is-primary">
        Filtreleri temizle
      </Link>
    </div>
  );
}

function sayfaNumaralari(mevcut: number, son: number): (number | null)[] {
  if (son <= 7) return Array.from({ length: son }, (_, i) => i + 1);
  const set = new Set([1, 2, mevcut - 1, mevcut, mevcut + 1, son - 1, son]);
  const liste = [...set].filter((n) => n >= 1 && n <= son).sort((a, b) => a - b);
  const cikti: (number | null)[] = [];
  let onceki = 0;
  for (const n of liste) {
    if (onceki && n - onceki > 1) cikti.push(null);
    cikti.push(n);
    onceki = n;
  }
  return cikti;
}
