'use client';

import { useState } from 'react';

/**
 * Hero arama kutusu — tasarım sisteminin `.searchbar` bloğu.
 *
 * Üç sekme, ÜÇ AYRI FORM. Sekmeler yalnızca hangisinin görüneceğini
 * değiştiriyor; her biri kendi hedefine GET ile gidiyor. Tek forma
 * sıkıştırıp JavaScript ile hedef değiştirmek, JS kapalıyken kutuyu
 * çalışmaz hale getirirdi.
 *
 * İkinci ve üçüncü sekme yeni sayfa değil: /butce ve /teslim-takvimi
 * zaten yazılmıştı, ana sayfa onlara kapı açıyor.
 *
 * Arama düğmesi ALTIN (`.sf-ara`), sekmeler nötr: sayfanın tek asıl
 * eylemi arama ve rengi bunu söylüyor.
 */

type Secenek = { deger: string; ad: string; n?: number };

const SEKMELER = [
  { id: 'klasik', ad: 'Klasik arama' },
  { id: 'butce', ad: 'Bütçeye göre' },
  { id: 'teslim', ad: 'Teslime göre' },
] as const;

const BUTCELER = [
  { deger: '', ad: 'Bütçe farketmez' },
  { deger: '15000000', ad: '15 milyon ₺ altı' },
  { deger: '30000000', ad: '30 milyon ₺ altı' },
  { deger: '60000000', ad: '60 milyon ₺ altı' },
];

export function AramaKutusu({
  iller, segmentler, toplam = 0, bolgeSayisi = 0,
}: {
  iller: Secenek[];
  segmentler: Secenek[];
  /** Kutunun altındaki özet — sayılar veritabanından. */
  toplam?: number;
  bolgeSayisi?: number;
}) {
  const bicim = new Intl.NumberFormat('tr-TR');
  const [aktif, setAktif] = useState<string>('klasik');

  return (
    <div>
      <div className="arama-sekme" role="tablist" aria-label="Arama biçimi">
        {SEKMELER.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={aktif === s.id}
            onClick={() => setAktif(s.id)}
          >
            {s.ad}
          </button>
        ))}
      </div>

      {/* ── Klasik ── */}
      <form
        method="get" action="/ara"
        hidden={aktif !== 'klasik'} className="searchbar"
      >
        <label className="sf sf-yer">
          <Pin />
          <select name="il" defaultValue="" aria-label="Şehir">
            <option value="">Tüm şehirler</option>
            {iller.map((i) => (
              <option key={i.deger} value={i.deger}>
                {i.ad}{i.n ? ` (${i.n})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="sf">
          <select name="tip" defaultValue="" aria-label="Proje tipi">
            <option value="">Tüm tipler</option>
            {segmentler.map((s) => (
              <option key={s.deger} value={s.deger}>{s.ad}</option>
            ))}
          </select>
        </label>

        <label className="sf">
          <select name="maxf" defaultValue="" aria-label="Bütçe">
            {BUTCELER.map((b) => (
              <option key={b.ad} value={b.deger}>{b.ad}</option>
            ))}
          </select>
        </label>

        <label className="sf">
          <select name="teslim" defaultValue="" aria-label="Teslim">
            <option value="">Teslim farketmez</option>
            <option value="2026">2026 sonuna kadar</option>
            <option value="2027">2027 sonuna kadar</option>
            <option value="2028">2028 sonuna kadar</option>
          </select>
        </label>

        <button type="submit" className="sf-ara">
          <Buyutec />
          Ara
        </button>
      </form>

      {/* ── Bütçe ── */}
      <form
        method="get" action="/butce"
        hidden={aktif !== 'butce'} className="searchbar"
      >
        <label className="sf sf-yer">
          <input
            name="pesinat" inputMode="numeric" autoComplete="off"
            placeholder="Peşinat — 5.000.000" aria-label="Peşinat"
          />
        </label>
        <label className="sf sf-yer">
          <input
            name="aylik" inputMode="numeric" autoComplete="off"
            placeholder="Aylık — 350.000" aria-label="Aylık ödeme"
          />
        </label>
        <label className="sf">
          <select name="il" defaultValue="" aria-label="Şehir">
            <option value="">Şehir farketmez</option>
            {iller.map((i) => (
              <option key={i.deger} value={i.deger}>{i.ad}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="sf-ara">Bütçeme uyanlar</button>
      </form>

      {/* ── Teslim ── */}
      <form
        method="get" action="/teslim-takvimi"
        hidden={aktif !== 'teslim'} className="searchbar"
      >
        <label className="sf sf-yer">
          <Pin />
          <select name="il" defaultValue="" aria-label="Şehir">
            <option value="">Tüm şehirler</option>
            {iller.map((i) => (
              <option key={i.deger} value={i.deger}>{i.ad}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="sf-ara">Teslim takvimini aç</button>
      </form>

      {toplam > 0 && (
        <div className="arama-hizli">
          <span className="arama-hizli-bas">Kayıtta</span>
          <span className="arama-cip">
            <b className="sayi">{bicim.format(toplam)}</b> doğrulanmış proje
          </span>
          {bolgeSayisi > 0 && (
            <span className="arama-cip">
              <b className="sayi">{bicim.format(bolgeSayisi)}</b> şehir
            </span>
          )}
          <span className="arama-cip">Fiyatlar haftalık teyitli</span>
        </div>
      )}
    </div>
  );
}

function Pin() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function Buyutec() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
