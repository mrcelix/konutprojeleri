import Link from 'next/link';
import { panelGerekli, yonetici } from '@/lib/yetki';
import {
  panelProjeleri, durumSayimlari, PANEL_SAYFA,
  DURUM_ADLARI, SORUN_ADLARI,
} from '@/lib/queries/yonetim';
import { para, teslim, tarih } from '@/lib/format';

/**
 * /yonetim/projeler — toplu yönetim.
 *
 * Liste, düzenleyiciye giden yol değil BAŞLI BAŞINA BİR ARAÇ: hangi
 * projenin nesi eksik buradan görünür. "Eksik" sütunu bilinçli olarak
 * en sağda değil göz hizasında — asıl iş orada.
 *
 * Süzgeçler adreste taşınır; kontrol panelindeki kuyruk satırları
 * doğrudan buraya bağlanabilsin diye.
 */

export const dynamic = 'force-dynamic';

type Arama = Record<string, string | string[] | undefined>;
const tek = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function yol(q: Arama, degis: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  // sayfa önce sıfırlanır, sonra degis onu geri koyabilir: süzgeç
  // değişince 1. sayfaya dönmeli ama sayfalama bağlantısı çalışmalı.
  for (const [k, v] of Object.entries({ ...q, sayfa: undefined, ...degis })) {
    const d = Array.isArray(v) ? v[0] : v;
    if (d) p.set(k, d);
  }
  const s = p.toString();
  return '/yonetim/projeler' + (s ? `?${s}` : '');
}

/** Bir projede ne eksik — listede tek bakışta görünmesi gereken şey. */
function eksikler(p: {
  gorsel_sayisi: number;
  daire_tipi_sayisi: number;
  min_fiyat: number | null;
  fiyat_teyit_tarihi: string | null;
  santiye_yuzde: number | null;
}): string[] {
  const e: string[] = [];
  if (p.gorsel_sayisi === 0) e.push('görsel');
  if (p.daire_tipi_sayisi === 0) e.push('daire tipi');
  else if (p.min_fiyat == null) e.push('fiyat');
  if (p.santiye_yuzde == null) e.push('şantiye');
  if (
    !p.fiyat_teyit_tarihi ||
    new Date(p.fiyat_teyit_tarihi) < new Date(Date.now() - 90 * 864e5)
  ) e.push('fiyat teyidi');
  return e;
}

export default async function ProjelerSayfasi({
  searchParams,
}: {
  searchParams: Promise<Arama>;
}) {
  const k = await panelGerekli();
  const admin = yonetici(k);
  const q = await searchParams;

  const suzgec = {
    ara: tek(q.ara),
    durum: tek(q.durum),
    sorun: tek(q.sorun),
    firmaId: admin ? null : k.firma_id,
    sayfa: Number(tek(q.sayfa)) || 1,
  };

  const [{ satirlar, toplam }, durumlar] = await Promise.all([
    panelProjeleri(suzgec),
    durumSayimlari(admin ? null : k.firma_id),
  ]);

  const sonSayfa = Math.max(1, Math.ceil(toplam / PANEL_SAYFA));
  const sayfa = Math.min(suzgec.sayfa, sonSayfa);
  const suzgecVar = !!(suzgec.ara || suzgec.durum || suzgec.sorun);

  return (
    <main className="yn-sayfa">
      <header className="yn-baslik">
        <div>
          <h1 className="h2">Projeler</h1>
          <p className="prose" style={{ fontSize: 13 }}>
            {toplam} proje{suzgecVar && ' (süzülmüş)'}
          </p>
        </div>
        {admin && (
          <Link href="/yonetim/projeler/yeni" className="btn btn-primary btn-sm">
            Yeni proje
          </Link>
        )}
      </header>

      {/* ── Süzgeçler ── */}
      <form method="get" action="/yonetim/projeler" className="yn-suzgec">
        <input
          type="search"
          name="ara"
          defaultValue={suzgec.ara ?? ''}
          placeholder="Proje adı ya da slug"
          className="yn-arama"
        />
        {suzgec.durum && <input type="hidden" name="durum" value={suzgec.durum} />}
        {suzgec.sorun && <input type="hidden" name="sorun" value={suzgec.sorun} />}
        <button type="submit" className="btn btn-primary btn-sm">Ara</button>
      </form>

      <div className="yn-cipler">
        <span className="eyebrow">Durum</span>
        {durumlar.map((d) => (
          <Link
            key={d.durum}
            href={yol(q, { durum: suzgec.durum === d.durum ? undefined : d.durum })}
            className={`chip${suzgec.durum === d.durum ? ' is-selected' : ''}`}
          >
            {DURUM_ADLARI[d.durum] ?? d.durum} <em>{d.n}</em>
          </Link>
        ))}
      </div>

      <div className="yn-cipler">
        <span className="eyebrow">Eksik</span>
        {Object.entries(SORUN_ADLARI).map(([anahtar, ad]) => (
          <Link
            key={anahtar}
            href={yol(q, { sorun: suzgec.sorun === anahtar ? undefined : anahtar })}
            className={`chip${suzgec.sorun === anahtar ? ' is-selected' : ''}`}
          >
            {ad}
          </Link>
        ))}
        {suzgecVar && (
          <Link href="/yonetim/projeler" className="chip">Süzgeçleri temizle</Link>
        )}
      </div>

      {/* ── Liste ── */}
      {satirlar.length === 0 ? (
        <div className="kart empty">
          <p className="kp-empty__title">Bu süzgeçlerle proje yok</p>
          <Link href="/yonetim/projeler" className="kp-empty__option is-primary">
            Süzgeçleri temizle
          </Link>
        </div>
      ) : (
        <div className="yn-tablo-kaydir">
          <table className="yn-tablo">
            <thead>
              <tr>
                <th>Proje</th>
                <th>Durum</th>
                <th>Teslim</th>
                <th>Fiyat</th>
                <th>Eksik</th>
                <th>Güncellendi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {satirlar.map((p) => {
                const eksik = eksikler(p);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/yonetim/projeler/${p.id}`} className="yn-ad">
                        <b>{p.ad}</b>
                        <span>{p.firma_ad} · {p.ilce}</span>
                      </Link>
                    </td>
                    <td>
                      <span className={`badge${p.yayinda ? ' is-success' : ''}`}>
                        {DURUM_ADLARI[p.durum] ?? p.durum}
                      </span>
                      {!p.yayinda && <em className="yn-mini">yayında değil</em>}
                    </td>
                    <td className="sayi">{teslim(p.teslim_ceyrek) ?? '—'}</td>
                    <td className="sayi">{para(p.min_fiyat) ?? '—'}</td>
                    <td>
                      {eksik.length === 0 ? (
                        <span className="yn-tam">tam</span>
                      ) : (
                        <span className="yn-eksik">{eksik.join(', ')}</span>
                      )}
                    </td>
                    <td className="sayi yn-mini">{tarih(p.guncellendi) ?? '—'}</td>
                    <td>
                      <Link
                        href={`/${p.il}/${p.ilce}/${p.slug}`}
                        className="yn-mini"
                        target="_blank"
                      >
                        Sitede gör
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sonSayfa > 1 && (
        <nav className="yn-sayfalar" aria-label="Sayfalar">
          {sayfa > 1 && (
            <Link href={yol(q, { sayfa: String(sayfa - 1) })} className="chip">
              ← Önceki
            </Link>
          )}
          <span className="eyebrow">{sayfa} / {sonSayfa}</span>
          {sayfa < sonSayfa && (
            <Link href={yol(q, { sayfa: String(sayfa + 1) })} className="chip">
              Sonraki →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
