'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { numarayiGoster, durumDegistir, type TalepDurumu } from './eylem';
import { TALEP_DURUMLARI, type Talep } from '@/lib/talep-tipleri';
import { para } from '@/lib/format';

/**
 * Tek talep satırı.
 *
 * Telefon maskeli duruyor; "Numarayı göster" basıldığında sunucudan
 * gelir ve o an yanıt süresi damgalanır. Damga geri alınamaz, arayüz
 * bunu düğmenin altında yazıyor — sürpriz olmasın.
 */

function GosterDugmesi() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
      {pending ? 'Açılıyor…' : 'Numarayı göster'}
    </button>
  );
}

export function TalepSatiri({ t, admin }: { t: Talep; admin: boolean }) {
  const [ac, acEylem] = useActionState(numarayiGoster, null as TalepDurumu);
  const [, durumEylem] = useActionState(durumDegistir, null as TalepDurumu);

  const geciken = t.durum === 'yeni' && (t.saat ?? 0) >= 24;
  const numara = ac?.telefon;

  return (
    <li className={`tl-kart${geciken ? ' is-geciken' : ''}`}>
      <div className="tl-kim">
        <b>{t.ad}</b>
        {numara ? (
          <a href={`tel:${numara}`} className="tl-numara">{numara}</a>
        ) : (
          <span className="tl-maske">{t.telefon_maskeli}</span>
        )}
        <span className="yn-mini">{t.olusturuldu}</span>
      </div>

      <div className="tl-istek">
        {t.proje_ad ? (
          <Link href={`/yonetim/projeler/${t.proje_id}`}>{t.proje_ad}</Link>
        ) : (
          <span className="yn-mini">proje belirtilmemiş</span>
        )}
        <span className="yn-mini">
          {[
            t.daire_tipi,
            t.butce_min || t.butce_max
              ? `${para(t.butce_min) ?? ''}–${para(t.butce_max) ?? ''}`
              : null,
            t.tasinma,
            admin ? t.firma_ad : null,
          ].filter(Boolean).join(' · ') || '—'}
        </span>
      </div>

      <div className="tl-sure">
        {t.acilma_zamani ? (
          <>
            <b className="sayi">{t.saat}s</b>
            <span className="yn-mini">yanıt süresi</span>
          </>
        ) : (
          <>
            <b className={`sayi${geciken ? ' is-gec' : ''}`}>{t.saat}s</b>
            <span className="yn-mini">bekliyor</span>
          </>
        )}
      </div>

      <div className="tl-eylem">
        {ac?.hata && <span className="tl-hata">{ac.hata}</span>}

        {!t.acilma_zamani && !numara && (
          <form action={acEylem}>
            <input type="hidden" name="id" value={t.id} />
            <GosterDugmesi />
          </form>
        )}

        {!t.acilma_zamani && !numara && (
          <span className="tl-uyari">Numarayı görmek yanıt süresini başlatır.</span>
        )}

        <form action={durumEylem} className="tl-durum">
          <input type="hidden" name="id" value={t.id} />
          <select name="durum" defaultValue={t.durum}>
            {Object.entries(TALEP_DURUMLARI).map(([d, ad]) => (
              <option key={d} value={d}>{ad}</option>
            ))}
          </select>
          <button type="submit" className="btn btn-ghost btn-sm">Kaydet</button>
        </form>
      </div>
    </li>
  );
}
