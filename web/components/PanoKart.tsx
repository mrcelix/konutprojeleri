'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import Icon from './Icon';
import { panoNotYaz, panoOyVer, panodanCikar } from '@/lib/pano-eylemler';
import { DURUM_ADI, fiyatAraligi, teslimCeyrek } from '@/lib/bicim';
import type { PanoOgeGorunum } from '@/lib/pano';

/* ============================================================
   Pano kartı — oy, not ve çıkarma.

   Oylar ANINDA görünüyor (iyimser güncelleme): sunucu cevabını
   beklemek, arka arkaya oy veren bir grupta her tıklamayı yarım
   saniyelik donmaya çeviriyordu. Sunucu hata dönerse sayfa
   tazelenince gerçek değere dönüyor.
   ============================================================ */

export default function PanoKart(
  { kod, oge, sahipMi }:
  { kod: string; oge: PanoOgeGorunum; sahipMi: boolean },
) {
  const [oy, setOy] = useState(oge.benimOyum);
  const [begeni, setBegeni] = useState(oge.begeni);
  const [begenmeme, setBegenmeme] = useState(oge.begenmeme);
  const [notAcik, setNotAcik] = useState(false);
  const [bekliyor, gecis] = useTransition();

  const oyla = (yon: 1 | -1) => {
    // Aynı yöne ikinci basış oyu geri alıyor — sunucu da böyle davranıyor.
    const yeni = oy === yon ? 0 : yon;
    setBegeni((n) => n - (oy === 1 ? 1 : 0) + (yeni === 1 ? 1 : 0));
    setBegenmeme((n) => n - (oy === -1 ? 1 : 0) + (yeni === -1 ? 1 : 0));
    setOy(yeni);
    gecis(() => { void panoOyVer(kod, oge.id, yon); });
  };

  return (
    <article className={'pano-kart' + (oge.alinamaz ? ' dolu' : '')}>
      <Link className="pano-foto" href={`/proje/${oge.projeSlug}`} target="_blank">
        {oge.foto
          ? <Image src={oge.foto} alt="" width={320} height={200} sizes="320px" style={{ objectFit: 'cover' }} />
          : <span className="pano-bos" aria-hidden="true"><Icon n="building" s={22} /></span>}
        {/* Pano günlerce açık duruyor; üzerinde konuşulan projenin
            çoktan tükendiğini son adımda öğrenmek grup kararında en
            sinir bozucu şey. */}
        {oge.alinamaz && <span className="pano-dolu-rozet">{DURUM_ADI[oge.durum]}</span>}
      </Link>

      <div className="pano-govde">
        <div className="pano-ust">
          <div style={{ minWidth: 0 }}>
            <h3>
              <Link href={`/proje/${oge.projeSlug}`} target="_blank">{oge.ad}</Link>
            </h3>
            <span className="tiny muted">
              {oge.mahalle}, {oge.bolge} · {oge.firmaAd}
              {oge.odalar.length > 0 && <> · {oge.odalar.join(', ')}</>}
            </span>
          </div>
          {sahipMi && (
            <button type="button" className="pano-sil" title="Panodan çıkar"
              aria-label={`${oge.ad} panodan çıkar`}
              onClick={() => gecis(() => { void panodanCikar(kod, oge.id); })}>
              <Icon n="x" s={15} sw={2.4} />
            </button>
          )}
        </div>

        <div className="pano-fiyat">
          <b>{fiyatAraligi(oge.fiyatMin, oge.fiyatMax ?? undefined)}</b>
          <span>
            {teslimCeyrek(oge.teslim ?? undefined)} teslim
            {oge.ilerleme > 0 && ` · %${oge.ilerleme} tamamlandı`}
          </span>
          {/* Bütçe panoda tanımlıysa uyum rozeti basılıyor: grubun
              konuştuğu şey zaten "bu bizim bütçemize uyuyor mu". */}
          {oge.butceyeUygun === false && (
            <span className="pano-butce-uyari">Pano bütçesinin dışında</span>
          )}
        </div>

        <div className="pano-oy">
          <button type="button" className={'pano-oy-dugme' + (oy === 1 ? ' secili' : '')}
            onClick={() => oyla(1)} disabled={bekliyor} aria-pressed={oy === 1}
            aria-label={`${oge.ad} beğen`}>
            <Icon n="heart" s={15} sw={2.2} /> {begeni}
          </button>
          <button type="button" className={'pano-oy-dugme' + (oy === -1 ? ' secili eksi' : '')}
            onClick={() => oyla(-1)} disabled={bekliyor} aria-pressed={oy === -1}
            aria-label={`${oge.ad} beğenme`}>
            <Icon n="x" s={15} sw={2.4} /> {begenmeme}
          </button>
          <button type="button" className="pano-not-ac" onClick={() => setNotAcik((a) => !a)}
            aria-expanded={notAcik}>
            <Icon n="share" s={14} sw={2} /> Not
            {oge.notlar.length > 0 && <em>{oge.notlar.length}</em>}
          </button>
          {oge.ekleyen && <span className="tiny muted pano-ekleyen">{oge.ekleyen} ekledi</span>}
        </div>

        {oge.notlar.length > 0 && (
          <ul className="pano-notlar">
            {oge.notlar.map((n) => (
              <li key={n.id}><b>{n.ad}:</b> {n.metin}</li>
            ))}
          </ul>
        )}

        {notAcik && (
          <form className="pano-not-form" action={(f) => { gecis(() => { void panoNotYaz(f); }); setNotAcik(false); }}>
            <input type="hidden" name="kod" value={kod} />
            <input type="hidden" name="ogeId" value={oge.id} />
            <input type="text" name="ad" placeholder="Adınız" maxLength={40} aria-label="Adınız" />
            <input type="text" name="metin" placeholder="Havuz küçük görünüyor…" maxLength={400} required aria-label="Not" />
            <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>Ekle</button>
          </form>
        )}
      </div>
    </article>
  );
}
