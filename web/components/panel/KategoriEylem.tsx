'use client';

import { useActionState, useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { KATEGORI_IKONLARI } from '@/lib/kategori-sabit';
import {
  kategoriKaydet, kategoriOlustur, kategoriSil, kategoriTasi,
  type ProjeSonucu,
} from '@/lib/panel-eylemler';
import type { IkonAdi } from '@/lib/types';

/* ============================================================
   Kategori (özellik) formu.

   KOD alanı yalnızca YENİ kayıtta açık. Projelera `villa_ozellik`
   üzerinden bağlı ve iniş sayfası adresleri ondan üretiliyor;
   değiştirmek hem bağları hem yayındaki adresleri kırardı.

   İniş sayfası alanları BİRLİKTE isteniyor: adres verilip başlık
   verilmezse arama motoruna başlıksız bir sayfa açılıyor.
   ============================================================ */

export interface KategoriSatiri {
  id: string;
  kod: string;
  ad: string;
  ikon: string;
  landingSlug: string | null;
  landingBaslik: string | null;
  landingAciklama: string | null;
  projeSayisi: number;
}

function IkonSecici({ ad, secili }: { ad: string; secili: string }) {
  const [deger, setDeger] = useState(secili);
  return (
    <label>
      <span>İkon</span>
      <div className="ikon-secim">
        <span className="ikon-onizleme"><Icon n={deger as IkonAdi} s={18} /></span>
        <select name={ad} value={deger} onChange={(e) => setDeger(e.target.value)}>
          {KATEGORI_IKONLARI.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
    </label>
  );
}

export function KategoriForm(
  { satir, kapat }: { satir?: KategoriSatiri; kapat?: () => void },
) {
  const yeni = !satir;
  const [durum, gonder, bekliyor] = useActionState<ProjeSonucu | null, FormData>(
    yeni ? kategoriOlustur : kategoriKaydet, null,
  );
  const [inis, setInis] = useState(!!satir?.landingSlug);

  return (
    <form action={gonder} className="p-form">
      {satir && <input type="hidden" name="id" value={satir.id} />}
      {durum?.hata && <p className="form-hata" role="alert">{durum.hata}</p>}
      {durum?.tamam && (
        <p className="tiny" style={{ color: 'var(--success)', margin: '0 0 10px' }}>
          <Icon n="check" s={14} sw={2.4} /> Kaydedildi.
        </p>
      )}

      <div className="form-izgara">
        <label>
          <span>Kod {yeni && <em>*</em>}</span>
          <input name="kod" required={yeni} defaultValue={satir?.kod} disabled={!yeni}
            pattern="[a-z0-9]{2,24}" placeholder="isitmali" />
          <span className="tiny dim">
            {yeni
              ? 'Küçük harf ve rakam. Sonradan değiştirilemiyor.'
              : 'Projelera bağlı — değiştirilemiyor.'}
          </span>
        </label>
        <label>
          <span>Görünen ad <em>*</em></span>
          <input name="ad" required minLength={2} maxLength={60} defaultValue={satir?.ad}
            placeholder="Isıtmalı havuz" />
        </label>
        <IkonSecici ad="ikon" secili={satir?.ikon ?? 'spark'} />
      </div>

      <label className="p-onay" style={{ marginTop: 12 }}>
        <input type="checkbox" checked={inis} onChange={(e) => setInis(e.target.checked)} />
        <span>
          <b>İniş sayfası aç.</b> Bu kategori için her bölgede
          <code> /villa-kiralama/&lt;bölge&gt;/&lt;adres&gt;</code> sayfası üretilir.
          Yalnızca sonuç veren bölgelerde basılır.
        </span>
      </label>

      {inis && (
        <div className="form-izgara" style={{ marginTop: 10 }}>
          <label>
            <span>Adres (slug) <em>*</em></span>
            <input name="landingSlug" defaultValue={satir?.landingSlug ?? ''}
              pattern="[a-z0-9-]{3,60}" placeholder="isitmali-havuzlu-projeler" />
          </label>
          <label>
            <span>Sayfa başlığı <em>*</em></span>
            <input name="landingBaslik" defaultValue={satir?.landingBaslik ?? ''}
              maxLength={80} placeholder="Isıtmalı Havuzlu Projeler" />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span>Sayfa açıklaması <em>*</em></span>
            <textarea name="landingAciklama" rows={2} maxLength={300}
              defaultValue={satir?.landingAciklama ?? ''}
              placeholder="Nisan–Kasım arası ısıtılabilen havuzlu projeler; sezonu uzatan seçenekler." />
          </label>
        </div>
      )}
      {!inis && (
        <>
          <input type="hidden" name="landingSlug" value="" />
          <input type="hidden" name="landingBaslik" value="" />
          <input type="hidden" name="landingAciklama" value="" />
        </>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : (yeni ? 'Kategoriyi aç' : 'Kaydet')}
        </button>
        {kapat && (
          <button className="btn btn-quiet btn-sm" type="button" onClick={kapat} disabled={bekliyor}>
            Vazgeç
          </button>
        )}
      </div>
    </form>
  );
}

export function KategoriEkle() {
  const [acik, setAcik] = useState(false);
  if (!acik) {
    return (
      <button className="btn btn-primary btn-sm" type="button" onClick={() => setAcik(true)}>
        <Icon n="plus" s={15} sw={2.4} /> Yeni kategori
      </button>
    );
  }
  return <KategoriForm kapat={() => setAcik(false)} />;
}

export function KategoriSatirEylem({ satir }: { satir: KategoriSatiri }) {
  const [bekliyor, basla] = useTransition();
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [silindi, setSilindi] = useState(false);

  if (silindi) return <span className="tiny" style={{ color: 'var(--success)' }}>Silindi</span>;

  return (
    <>
      <div className="kategori-eylem">
        <button className="icon-btn" type="button" disabled={bekliyor}
          aria-label="Yukarı taşı"
          onClick={() => basla(async () => {
            const r = await kategoriTasi(satir.id, 'yukari');
            setHata(r.hata ?? null);
          })}>
          <Icon n="chevU" s={15} sw={2.4} />
        </button>
        <button className="icon-btn" type="button" disabled={bekliyor}
          aria-label="Aşağı taşı"
          onClick={() => basla(async () => {
            const r = await kategoriTasi(satir.id, 'asagi');
            setHata(r.hata ?? null);
          })}>
          <Icon n="chevD" s={15} sw={2.4} />
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAcik((a) => !a)}>
          <Icon n="sliders" s={14} /> {acik ? 'Kapat' : 'Düzenle'}
        </button>
        {/* Silme, villaya bağlıysa sunucuda reddediliyor; düğme yine de
            görünüyor ki sebep okunabilsin. */}
        <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
          onClick={() => basla(async () => {
            const r = await kategoriSil(satir.id);
            if (r.hata) setHata(r.hata); else setSilindi(true);
          })}>
          Sil
        </button>
      </div>
      {hata && <p className="form-hata tiny" role="alert" style={{ marginTop: 6 }}>{hata}</p>}
      {acik && (
        <div style={{ marginTop: 10 }}>
          <KategoriForm satir={satir} kapat={() => setAcik(false)} />
        </div>
      )}
    </>
  );
}
