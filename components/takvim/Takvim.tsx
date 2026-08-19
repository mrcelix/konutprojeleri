import Link from 'next/link';
import type { CSSProperties } from 'react';
import {
  ceyrekAdi, ceyrekSira, buCeyrek,
  type CeyrekOzet, type TakvimProjesi,
} from '@/lib/queries/takvim';
import { paraKisa } from '@/lib/format';

/**
 * Teslim takvimi — zaman ekseni birincil eksen.
 *
 * Konum ya da fiyatla değil, TAŞINMA TARİHİYLE başlayan tek görünüm.
 * Kirası biten, okul dönemi yaklaşan, kredisi belli tarihte çıkan alıcı
 * aslında bu soruyu soruyor.
 *
 * Alttaki arz histogramı bilinçli bir editoryal tercih: aynı çeyrekte
 * binlerce daire teslim ediliyorsa bu alıcının pazarlık gücüdür. Firmayı
 * rahatsız edebilir; bağımsızlığın kanıtı da odur.
 *
 * Tamamı sunucuda çizilir — grafik kütüphanesi yok, CSS grid yeterli.
 */

const bicim = new Intl.NumberFormat('tr-TR');

/** Bugünün, içinde bulunulan çeyreğin neresine denk geldiği (0–1). */
function ceyrekOrani(): number {
  const d = new Date();
  const bas = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).getTime();
  const son = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 1).getTime();
  return Math.min(1, Math.max(0, (d.getTime() - bas) / (son - bas)));
}

type Props = {
  ceyrekler: string[];
  projeler: TakvimProjesi[];
  histogram: CeyrekOzet[];
  /** Proje satırındaki bağlantıların tabanı; genelde '' */
  taban?: string;
};

export function Takvim({ ceyrekler, projeler, histogram, taban = '' }: Props) {
  const suSira = ceyrekSira(buCeyrek())!;
  const enBuyuk = Math.max(1, ...histogram.map((h) => h.daire));
  const sayimlar = new Map(histogram.map((h) => [h.ceyrek, h]));

  const stil = {
    '--n': ceyrekler.length,
    // Birimsiz: CSS hem sütun içi konumda hem tam boy çizgide çarpan olarak kullanır.
    '--bugun': ceyrekOrani().toFixed(3),
  } as CSSProperties;

  return (
    <div className="tk" style={stil}>
      <div className="tk-kaydir">
        <div className="tk-ic">

          {/* ── Çeyrek başlıkları ── */}
          <div className="tk-satir tk-baslik">
            <span className="tk-etiket tk-etiket--bos" aria-hidden />
            {ceyrekler.map((c, i) => (
              <span
                key={c}
                className={`tk-ceyrek${i === 0 ? ' is-simdi' : ''}`}
                style={{ gridColumn: i + 2 }}
              >
                <b>{c.slice(4)}</b>
                {(i === 0 || c.endsWith('Q1')) && <i>{c.slice(0, 4)}</i>}
              </span>
            ))}
            {/* Bugün çizgisi — eksen içinde bulunulan çeyrekle başlar */}
            <span className="tk-bugun" style={{ gridColumn: 2 }} aria-hidden>
              <em>bugün</em>
            </span>
          </div>

          {/* ── Proje çubukları ── */}
          {projeler.map((p) => {
            const idx = (ceyrekSira(p.teslim_ceyrek) ?? suSira) - suSira;
            const ilerleme = p.santiye_yuzde;
            const fiyat = paraKisa(p.min_fiyat);

            return (
              <div className="tk-satir tk-proje" key={p.id}>
                <Link
                  className="tk-etiket"
                  href={`${taban}/${p.il}/${p.ilce}/${p.slug}`}
                >
                  <b>{p.ad}</b>
                  <span>{p.firma_ad} · {p.ilce}</span>
                </Link>

                <div
                  className={`tk-cubuk${ilerleme == null ? ' is-bilinmiyor' : ''}`}
                  style={{ gridColumn: `2 / ${idx + 3}` }}
                >
                  {ilerleme != null && (
                    <span className="tk-dolgu" style={{ width: `${ilerleme}%` }} />
                  )}
                  <span className="tk-cubuk__yazi">
                    {ilerleme != null
                      ? `%${ilerleme} tamamlandı`
                      : 'ilerleme bildirilmedi'}
                    {fiyat && <em> · {fiyat}’den başlayan</em>}
                    {p.kalan != null && p.kalan > 0 && (
                      <em> · {bicim.format(p.kalan)} daire müsait</em>
                    )}
                  </span>
                </div>

                <span className="tk-nokta" style={{ gridColumn: idx + 2 }} aria-hidden />
              </div>
            );
          })}

          {/* ── Arz yoğunluğu ── */}
          <div className="tk-satir tk-histogram">
            <span className="tk-etiket tk-etiket--olcu">
              <b>Teslim edilen daire</b>
              <span>çeyrek başına toplam arz</span>
            </span>
            {ceyrekler.map((c, i) => {
              const h = sayimlar.get(c);
              const oran = h ? (h.daire / enBuyuk) * 100 : 0;
              return (
                <span key={c} className="tk-sutun" style={{ gridColumn: i + 2 }}>
                  <b style={{ height: `${Math.max(oran, h?.daire ? 4 : 0)}%` }} />
                  <i>{h?.daire ? bicim.format(h.daire) : '—'}</i>
                </span>
              );
            })}
          </div>

        </div>
      </div>

      <p className="tk-ipucu">
        Çubuk uzunluğu teslime kalan süreyi, koyu dolgu şantiyenin bildirilen
        ilerlemesini gösterir. İlerleme oranları firmanın beyanıdır;
        bağımsız denetimden geçmez.
      </p>
    </div>
  );
}

/** Arz yoğunluğu en yüksek çeyreği bulur — sayfa üstündeki okuma için. */
export function yogunCeyrek(histogram: CeyrekOzet[]): CeyrekOzet | null {
  if (histogram.length < 2) return null;
  const en = histogram.reduce((a, b) => (b.daire > a.daire ? b : a));
  const ortalama = histogram.reduce((t, h) => t + h.daire, 0) / histogram.length;
  // Yalnızca gerçekten sivrildiğinde söylenir; her çeyreğe "yoğun" demek anlamsız.
  return en.daire >= ortalama * 1.6 && en.daire > 0 ? en : null;
}

export { ceyrekAdi };
