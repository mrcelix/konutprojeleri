'use client';

import { useState } from 'react';

/**
 * Hero arama kutusu.
 *
 * Üç sekme, ÜÇ AYRI FORM. Sekmeler yalnızca hangisinin görüneceğini
 * değiştiriyor; her biri kendi hedefine GET ile gidiyor. Tek forma
 * sıkıştırıp JavaScript ile hedef değiştirmek, JS kapalıyken kutuyu
 * çalışmaz hale getirirdi.
 *
 * İkinci ve üçüncü sekme yeni sayfa değil: /butce ve /teslim-takvimi
 * zaten yazılmıştı, ana sayfa onlara kapı açıyor.
 */

type Secenek = { deger: string; ad: string; n?: number };

const SEKMELER = [
  { id: 'klasik', ad: 'Klasik arama', alt: 'şehir, tip, bütçe' },
  { id: 'butce', ad: 'Bütçeye göre', alt: 'peşinat + aylık' },
  { id: 'teslim', ad: 'Teslime göre', alt: 'ne zaman taşınacaksınız' },
] as const;

const BUTCELER = [
  { deger: '15000000', ad: '15 milyon ₺ altı' },
  { deger: '30000000', ad: '30 milyon ₺ altı' },
  { deger: '60000000', ad: '60 milyon ₺ altı' },
  { deger: '', ad: 'Farketmez' },
];

export function AramaKutusu({
  iller, segmentler,
}: {
  iller: Secenek[];
  segmentler: Secenek[];
}) {
  const [aktif, setAktif] = useState<string>('klasik');

  return (
    <div className="ak">
      <div className="ak-sekmeler" role="tablist" aria-label="Arama biçimi">
        {SEKMELER.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={aktif === s.id}
            className={`ak-sekme${aktif === s.id ? ' is-aktif' : ''}`}
            onClick={() => setAktif(s.id)}
          >
            {s.ad}
            <small>{s.alt}</small>
          </button>
        ))}
      </div>

      {/* ── Klasik ── */}
      <form method="get" action="/ara" hidden={aktif !== 'klasik'} className="ak-alanlar">
        <label className="ak-alan">
          <span>Nerede</span>
          <select name="il" defaultValue="">
            <option value="">Tüm şehirler</option>
            {iller.map((i) => (
              <option key={i.deger} value={i.deger}>
                {i.ad}{i.n ? ` (${i.n})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="ak-alan">
          <span>Proje tipi</span>
          <select name="tip" defaultValue="">
            <option value="">Hepsi</option>
            {segmentler.map((s) => (
              <option key={s.deger} value={s.deger}>{s.ad}</option>
            ))}
          </select>
        </label>

        <label className="ak-alan">
          <span>Bütçe</span>
          <select name="maxf" defaultValue="">
            {BUTCELER.map((b) => (
              <option key={b.ad} value={b.deger}>{b.ad}</option>
            ))}
          </select>
        </label>

        <label className="ak-alan">
          <span>Teslim</span>
          <select name="teslim" defaultValue="">
            <option value="">Farketmez</option>
            <option value="2026">2026 sonuna kadar</option>
            <option value="2027">2027 sonuna kadar</option>
            <option value="2028">2028 sonuna kadar</option>
          </select>
        </label>

        <div className="ak-git">
          <button type="submit" className="kp-btn">Ara</button>
        </div>
      </form>

      {/* ── Bütçe ── */}
      <form method="get" action="/butce" hidden={aktif !== 'butce'} className="ak-alanlar">
        <label className="ak-alan">
          <span>Peşinat olarak ayırabileceğiniz</span>
          <input name="pesinat" inputMode="numeric" placeholder="5.000.000" autoComplete="off" />
        </label>
        <label className="ak-alan">
          <span>Aylık ödeyebileceğiniz</span>
          <input name="aylik" inputMode="numeric" placeholder="350.000" autoComplete="off" />
        </label>
        <label className="ak-alan">
          <span>Şehir</span>
          <select name="il" defaultValue="">
            <option value="">Farketmez</option>
            {iller.map((i) => (
              <option key={i.deger} value={i.deger}>{i.ad}</option>
            ))}
          </select>
        </label>
        <div className="ak-git ak-git--genis">
          <button type="submit" className="kp-btn">Bütçeme uyanları göster</button>
        </div>
      </form>

      {/* ── Teslim ── */}
      <form method="get" action="/teslim-takvimi" hidden={aktif !== 'teslim'} className="ak-alanlar">
        <label className="ak-alan">
          <span>Şehir</span>
          <select name="il" defaultValue="">
            <option value="">Tüm şehirler</option>
            {iller.map((i) => (
              <option key={i.deger} value={i.deger}>{i.ad}</option>
            ))}
          </select>
        </label>
        <div className="ak-git ak-git--genis">
          <button type="submit" className="kp-btn">Teslim takvimini aç</button>
        </div>
        <p className="ak-not">
          Projeler teslim çeyreklerine göre tek eksende; hangi dönemde kaç
          konutun piyasaya çıkacağıyla birlikte.
        </p>
      </form>
    </div>
  );
}
