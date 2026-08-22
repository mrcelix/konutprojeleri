'use client';

import { useActionState, useState } from 'react';
import Icon from '@/components/Icon';
import { bolgeOlustur, type ProjeSonucu } from '@/lib/panel-eylemler';
import { slugla } from '@/lib/turkce';

/* ============================================================
   Yeni bölge.

   Bölge, iniş sayfası ağacının kökü: `/villa-kiralama/<slug>` ve
   altındaki her özellik kombinasyonu buradan üretiliyor. Slug
   sonradan değiştirilmiyor — yayındaki adresi kırardı — bu yüzden
   formda bir kez ve dikkatle giriliyor.

   Bölge YAYIN DIŞI açılıyor: editöryel içeriği boş bir iniş
   sayfasının arama motoruna açılması, zayıf sayfa üretmek demek.
   ============================================================ */
export default function BolgeEkle() {
  const [durum, gonder, bekliyor] = useActionState<ProjeSonucu | null, FormData>(bolgeOlustur, null);
  const [ad, setAd] = useState('');
  const [slug, setSlug] = useState('');
  const [acik, setAcik] = useState(false);

  if (!acik) {
    return (
      <button className="btn btn-primary btn-sm" type="button" onClick={() => setAcik(true)}>
        <Icon n="plus" s={15} sw={2.4} /> Yeni bölge
      </button>
    );
  }

  return (
    <form action={gonder} className="p-form">
      {durum?.hata && <p className="form-hata" role="alert">{durum.hata}</p>}
      {durum?.tamam && (
        <p className="tiny" style={{ color: 'var(--success)', margin: '0 0 10px' }}>
          <Icon n="check" s={14} sw={2.4} /> Bölge açıldı — <b>yayın dışı</b>.
          İçeriğini doldurup aşağıdan yayına alın.
        </p>
      )}

      <div className="form-izgara">
        <label>
          <span>Bölge adı <em>*</em></span>
          <input name="ad" required minLength={2} maxLength={60} value={ad}
            onChange={(e) => { setAd(e.target.value); setSlug(slugla(e.target.value)); }}
            placeholder="Ölüdeniz" />
        </label>
        <label>
          <span>İl <em>*</em></span>
          <input name="il" required minLength={2} maxLength={40} placeholder="Muğla" />
        </label>
        <label>
          <span>Adres (slug) <em>*</em></span>
          <input name="slug" required value={slug} onChange={(e) => setSlug(slugla(e.target.value))} />
          <span className="tiny dim">
            /villa-kiralama/{slug || '…'} — <b>sonradan değiştirilmiyor</b>.
          </span>
        </label>
        <label>
          <span>Envanter sayısı</span>
          <input name="adet" type="number" min={0} defaultValue={0} />
          <span className="tiny dim">Pazarlama sayısı; listelenen villa sayısından farklı olabilir.</span>
        </label>
        <label>
          <span>Enlem <em>*</em></span>
          <input name="lat" type="number" step="0.0001" required placeholder="36.5500" />
        </label>
        <label>
          <span>Boylam <em>*</em></span>
          <input name="lng" type="number" step="0.0001" required placeholder="29.1200" />
        </label>
      </div>

      <p className="tiny muted" style={{ margin: '8px 0 0' }}>
        Koordinat harita aramasının temeli; yanlış girilirse bölgenin projelerı
        haritada başka yerde çıkar.
      </p>

      <label style={{ display: 'block', marginTop: 10 }}>
        <span className="tiny">Bölge görseli <em style={{ color: 'var(--danger)' }}>*</em></span>
        <input name="img" required maxLength={600} placeholder="https://images.unsplash.com/photo-…" />
      </label>

      <label style={{ display: 'block', marginTop: 10 }}>
        <span className="tiny">Özet <em style={{ color: 'var(--danger)' }}>*</em></span>
        <textarea name="ozet" required rows={3} minLength={40} maxLength={400}
          placeholder="Bölgeyi bir paragrafta anlatın: nereye yakın, kimin için uygun, hangi mevsimde." />
      </label>

      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Açılıyor…' : 'Bölgeyi aç'}
        </button>
        <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
          onClick={() => setAcik(false)}>Vazgeç</button>
      </div>
    </form>
  );
}
