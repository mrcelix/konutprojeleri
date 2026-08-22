'use client';

import { useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { engelKaldirEylem } from '@/lib/panel-eylemler';

export interface EngelSatir {
  id: string;
  kanal: string;
  adres: string;
  sebep: string;
  sebepKod: string;
  detay: string | null;
  kaynak: string;
  tarih: string;
}

export default function EngelYonetim({ kayitlar }: { kayitlar: EngelSatir[] }) {
  const [bekliyor, basla] = useTransition();
  const [silinen, setSilinen] = useState<Set<string>>(new Set());
  const [hata, setHata] = useState<string | null>(null);

  function kaldir(k: EngelSatir) {
    setHata(null);
    basla(async () => {
      const s = await engelKaldirEylem(k.kanal, k.adres);
      if (s.hata) { setHata(s.hata); return; }
      setSilinen((o) => new Set(o).add(k.id));
    });
  }

  const gorunen = kayitlar.filter((k) => !silinen.has(k.id));

  if (gorunen.length === 0) {
    return <p className="dim small">Engellenmiş adres yok.</p>;
  }

  return (
    <>
      {hata && <p className="form-hata" role="alert">{hata}</p>}
      <div className="tablo-sar">
        <table className="p-tablo">
          <thead>
            <tr><th>Kanal</th><th>Adres</th><th>Sebep</th><th>Kaynak</th><th>Tarih</th><th /></tr>
          </thead>
          <tbody>
            {gorunen.map((k) => (
              <tr key={k.id}>
                <td>
                  <span className="badge">{k.kanal === 'SMS' ? 'SMS' : 'E-posta'}</span>
                </td>
                <td style={{ maxWidth: 260, overflowWrap: 'anywhere' }}>{k.adres}</td>
                <td>
                  <span
                    className="badge"
                    style={k.sebepKod === 'SIKAYET'
                      ? { background: 'var(--accent-100)', color: 'var(--accent)', borderColor: 'transparent' }
                      : undefined}
                  >
                    {k.sebep}
                  </span>
                  {k.detay && <div className="tiny dim" style={{ marginTop: 3 }}>{k.detay}</div>}
                </td>
                <td className="dim tiny">{k.kaynak}</td>
                <td className="tiny">{k.tarih}</td>
                <td>
                  <button
                    className="btn btn-quiet btn-sm" onClick={() => kaldir(k)} disabled={bekliyor}
                    title="Engeli kaldır — adresin düzeldiğinden eminseniz"
                  >
                    <Icon n="x" s={14} sw={2.4} /> Kaldır
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
