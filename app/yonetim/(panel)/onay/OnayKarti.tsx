'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { kararVer, type OnayDurumu } from './eylem';
import { ISARET_ADLARI, type BekleyenOnay } from '@/lib/onay-tipleri';
import { para } from '@/lib/format';

/**
 * Tek bir onay kaydı.
 *
 * ESKİ ve YENİ yan yana. Yalnızca yeni değeri göstermek, karar vereni
 * "bu değişmiş mi, ne kadar değişmiş" diye başka sekmeye bakmaya
 * zorlardı — o bakış yapılmaz ve onay mühür basmaya döner.
 *
 * Ret gerekçesi alanı ret seçilene kadar görünmez ama ZORUNLU:
 * gerekçesiz ret, firmanın aynı hatayı tekrarlamasına yol açar.
 */

const ALAN_ADLARI: Record<string, string> = {
  ad: 'Proje adı', mahalle: 'Mahalle', teslim_ceyrek: 'Teslim çeyreği',
  toplam_konut: 'Toplam konut', ticari_birim: 'Ticari birim',
  blok_sayisi: 'Blok', kat_sayisi: 'Kat', tavan_yuksekligi: 'Tavan yüksekliği',
  aidat: 'Aidat', pesinat_orani: 'Peşinat oranı', vade_ay: 'Vade',
  faizsiz: 'Faizsiz', santiye_yuzde: 'Şantiye ilerlemesi',
  aciklama: 'Açıklama', durum: 'Durum',
};

function goster(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'evet' : 'hayır';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  return s.length > 120 ? s.slice(0, 120) + '…' : s;
}

function Dugmeler({ retAcik, ac }: { retAcik: boolean; ac: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="on-eylem">
      <button type="submit" name="karar" value="onayla"
        className="kp-btn is-small" disabled={pending}>
        {pending ? 'İşleniyor…' : 'Onayla ve uygula'}
      </button>

      {/* İlk tıklama gerekçe alanını AÇAR, göndermez. Boş gerekçeyle
          gönderip sunucudan hata almak, alanı görünür kılmanın en kötü
          yoluydu. */}
      {retAcik ? (
        <button type="submit" name="karar" value="reddet"
          className="kp-btn is-ghost is-small" disabled={pending}>
          {pending ? 'İşleniyor…' : 'Reddi gönder'}
        </button>
      ) : (
        <button type="button" className="kp-btn is-ghost is-small" onClick={ac}>
          Reddet
        </button>
      )}
    </div>
  );
}

export function OnayKarti({ kayit }: { kayit: BekleyenOnay }) {
  const [durum, eylem] = useActionState(kararVer, null as OnayDurumu);
  const [retAcik, setRetAcik] = useState(false);

  const alanlar = Object.entries(kayit.degisiklik?.alanlar ?? {});
  const daireler = kayit.degisiklik?.daireler ?? [];

  if (durum?.bilgi) {
    return (
      <li className="kp-card on-kart">
        <p className="dz-bildirim is-ok" role="status">
          <b>{kayit.proje_ad}</b> · {durum.bilgi}
        </p>
      </li>
    );
  }

  return (
    <li className="kp-card on-kart">
      <header className="on-ust">
        <div>
          <Link href={`/yonetim/projeler/${kayit.proje_id}`} className="on-ad">
            {kayit.proje_ad}
          </Link>
          <span className="yn-mini">
            {kayit.firma_ad} · {kayit.ilce} · {kayit.gonderildi}
          </span>
        </div>
        <div className="on-isaretler">
          {(kayit.isaretler ?? []).map((i) => (
            <span key={i} className="kp-pill is-danger">
              {ISARET_ADLARI[i] ?? i}
            </span>
          ))}
        </div>
      </header>

      {durum?.hata && <p className="dz-bildirim is-hata" role="alert">{durum.hata}</p>}

      {alanlar.length > 0 && (
        <table className="on-fark">
          <thead>
            <tr><th>Alan</th><th>Şu anki</th><th>Önerilen</th></tr>
          </thead>
          <tbody>
            {alanlar.map(([alan, d]) => (
              <tr key={alan}>
                <td>{ALAN_ADLARI[alan] ?? alan}</td>
                <td className="on-eski">{goster(d.eski)}</td>
                <td className="on-yeni">{goster(d.yeni)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {daireler.length > 0 && (
        <>
          <h3 className="kp-label" style={{ marginTop: 'var(--s-4)' }}>Daire tipleri</h3>
          <table className="on-fark">
            <thead>
              <tr><th>Tip</th><th>Net m²</th><th>Fiyat</th><th>Toplam</th><th>Kalan</th></tr>
            </thead>
            <tbody>
              {daireler.map((d, i) => (
                <tr key={d.id ?? `y${i}`}>
                  <td>{d.tip}{d.id == null && <em className="yn-mini"> yeni</em>}</td>
                  <td className="tabular">{d.net_m2 ?? '—'}</td>
                  <td className="tabular on-yeni">{para(d.liste_fiyati) ?? '—'}</td>
                  <td className="tabular">{d.toplam_adet ?? '—'}</td>
                  <td className="tabular">{d.kalan_adet ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="dz-not">
            Onaylanan fiyatlar <b>fiyat arşivine kalıcı olarak</b> yazılır ve
            m² endeksine girer.
          </p>
        </>
      )}

      {alanlar.length === 0 && daireler.length === 0 && (
        <p className="dz-not">Bu kayıtta uygulanabilir değişiklik yok.</p>
      )}

      <form action={eylem} className="on-form">
        <input type="hidden" name="id" value={kayit.id} />

        <label className="dz-alan" hidden={!retAcik}>
          <span className="kp-label">Ret gerekçesi <i>firmaya görünür</i></span>
          <textarea name="gerekce" rows={2}
            placeholder="Neden reddedildiğini yazın; firma aynı hatayı tekrarlamasın." />
        </label>

        <Dugmeler retAcik={retAcik} ac={() => setRetAcik(true)} />
      </form>
    </li>
  );
}
