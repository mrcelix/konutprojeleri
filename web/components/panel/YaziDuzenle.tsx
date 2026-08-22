'use client';

import { useActionState, useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import BlokEditor from './BlokEditor';
import { yaziKaydet, yaziSil, yaziYayinDurumu, type IcerikSonucu } from '@/lib/panel-eylemler';
import { slugla } from '@/lib/turkce';

const BOS: IcerikSonucu | null = null;

export interface YaziVeri {
  id: string;
  slug: string;
  baslik: string;
  ozet: string;
  kapak: string | null;
  yazar: string | null;
  bolgeId: string | null;
  yayinda: boolean;
  govdeMetni: string;
}

export interface BolgeSecenek { id: string; ad: string }

/* Kurumsal sayfayla AYNI blok editörü kullanılıyor: iki ayrı içerik
   biçimi öğrenmek gerekmesin. */
export default function YaziDuzenle(
  { y, bolgeler }: { y?: YaziVeri; bolgeler: BolgeSecenek[] },
) {
  const [durum, gonder, bekliyor] = useActionState<IcerikSonucu | null, FormData>(yaziKaydet, BOS);
  const [baslik, setBaslik] = useState(y?.baslik ?? '');
  const [slug, setSlug] = useState(y?.slug ?? '');
  const [ozet, setOzet] = useState(y?.ozet ?? '');

  const stil = (alan: string) =>
    (durum?.alan === alan ? { borderColor: 'var(--danger)' } : undefined);

  return (
    <form action={gonder} className="p-form">
      {y && <input type="hidden" name="id" value={y.id} />}

      {durum?.hata && <p className="form-hata" role="alert">{durum.hata}</p>}
      {durum?.tamam && (
        <p className="tiny" style={{ color: 'var(--success)', margin: '0 0 10px' }}>
          <Icon n="check" s={14} sw={2.4} /> Kaydedildi. Adres: /rehber/{durum.slug}
        </p>
      )}

      <div className="form-izgara">
        <label>
          <span>Başlık <em>*</em></span>
          <input name="baslik" required minLength={8} maxLength={160} value={baslik}
            style={stil('baslik')}
            onChange={(e) => {
              setBaslik(e.target.value);
              // Yeni yazıda adres başlıktan türüyor; düzenlemede dokunulmuyor
              if (!y) setSlug(slugla(e.target.value));
            }} />
        </label>
        <label>
          <span>Adres (slug) <em>*</em></span>
          <input name="slug" required value={slug} style={stil('slug')}
            onChange={(e) => setSlug(slugla(e.target.value))} />
          <span className="tiny dim">/rehber/{slug || '…'}</span>
        </label>
        <label>
          <span>Bağlı bölge</span>
          <select name="bolgeId" defaultValue={y?.bolgeId ?? ''}>
            <option value="">Bölgesiz</option>
            {bolgeler.map((b) => <option key={b.id} value={b.id}>{b.ad}</option>)}
          </select>
          <span className="tiny dim">Seçilirse yazı o bölgenin iniş sayfasında görünür.</span>
        </label>
        <label>
          <span>Yazar</span>
          <input name="yazar" maxLength={80} defaultValue={y?.yazar ?? ''} placeholder="KonutProjeleri ekibi" />
        </label>
      </div>

      <label style={{ display: 'block', marginTop: 12 }}>
        <span className="tiny">Kapak görseli (tam adres)</span>
        <input name="kapak" maxLength={400} defaultValue={y?.kapak ?? ''}
          placeholder="https://images.unsplash.com/…" />
      </label>

      <label style={{ display: 'block', marginTop: 12 }}>
        <span className="tiny">Özet <em style={{ color: 'var(--danger)' }}>*</em></span>
        <textarea name="ozet" required rows={2} minLength={50} maxLength={200}
          value={ozet} onChange={(e) => setOzet(e.target.value)} style={stil('ozet')} />
        <span className="tiny" style={{ color: ozet.length > 200 || (ozet.length > 0 && ozet.length < 50) ? 'var(--danger)' : 'var(--ink-3)' }}>
          {ozet.length} karakter — liste kartında ve Google sonucunda görünüyor (50–200).
        </span>
      </label>

      <div style={{ marginTop: 16 }}>
        <span className="tiny" style={{ display: 'block', marginBottom: 6, fontWeight: 700 }}>Gövde</span>
        <BlokEditor baslangic={y?.govdeMetni ?? ''} hataStil={stil('govde')} />
      </div>

      <label className="tiny" style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 14 }}>
        <input type="checkbox" name="yayinda" value="evet" defaultChecked={y?.yayinda} />
        <span><b>Yayında.</b> İşaretlenmezse yalnızca panelde durur.</span>
      </label>

      <p className="tiny muted" style={{ margin: '8px 0 0' }}>
        Okuma süresi gövdeden hesaplanıyor; elle girilseydi güncellenen
        yazılarda eskirdi.
      </p>

      <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}
        style={{ marginTop: 12 }}>
        {bekliyor ? 'Kaydediliyor…' : <><Icon n="check" s={14} sw={2.2} /> Kaydet</>}
      </button>
    </form>
  );
}

/** Liste satırındaki yayın ve silme işlemleri. */
export function YaziEylem({ id, yayinda }: { id: string; yayinda: boolean }) {
  const [bekliyor, basla] = useTransition();
  const [onay, setOnay] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
        onClick={() => basla(() => { void yaziYayinDurumu(id, !yayinda); })}>
        {yayinda ? 'Yayından kaldır' : 'Yayına al'}
      </button>
      {!onay ? (
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => setOnay(true)}>Sil</button>
      ) : (
        <>
          <button className="btn btn-sm" type="button" disabled={bekliyor}
            style={{ background: 'var(--danger)', color: '#fff' }}
            onClick={() => basla(() => { void yaziSil(id); })}>Silmeyi onayla</button>
          <button className="btn btn-quiet btn-sm" type="button" onClick={() => setOnay(false)}>Vazgeç</button>
        </>
      )}
    </div>
  );
}
