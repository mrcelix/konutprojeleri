'use client';

import { useActionState, useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { heroDurum, heroKaydet, heroSil, heroTasi, type IcerikSonucu } from '@/lib/panel-eylemler';

const BOS: IcerikSonucu | null = null;

export interface HeroVeri {
  id: string;
  url: string;
  alt: string;
  etiket: string | null;
  sira: number;
  aktif: boolean;
}

export default function HeroFormu({ h }: { h?: HeroVeri }) {
  const [durum, gonder, bekliyor] = useActionState<IcerikSonucu | null, FormData>(heroKaydet, BOS);
  const [acik, setAcik] = useState(!h);
  const [url, setUrl] = useState(h?.url ?? '');

  if (!acik) {
    return (
      <button className="btn btn-quiet btn-sm" type="button" onClick={() => setAcik(true)}>
        <Icon n="sliders" s={14} sw={2.2} /> Düzenle
      </button>
    );
  }

  return (
    <form action={gonder} className="p-form">
      {h && <input type="hidden" name="id" value={h.id} />}

      {durum?.hata && <p className="form-hata" role="alert">{durum.hata}</p>}
      {durum?.tamam && (
        <p className="tiny" style={{ color: 'var(--success)', margin: '0 0 10px' }}>
          <Icon n="check" s={14} sw={2.4} /> Kaydedildi.
        </p>
      )}

      <label style={{ display: 'block' }}>
        <span className="tiny">Görsel adresi <em style={{ color: 'var(--danger)' }}>*</em></span>
        <input name="url" required maxLength={600} value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://images.unsplash.com/photo-…?auto=format&fit=crop&w=2000&q=72" />
        <span className="tiny dim">
          Geniş bir görsel seçin (en az 2000 piksel). Bant çok geniş ve kısa;
          dikey fotoğrafın ortası kırpılıyor.
        </span>
      </label>

      {/* Adres girilir girilmez önizleme: yanlış ya da erişilemeyen bir
          adres kaydedilmeden önce görülüyor. */}
      {/^https?:\/\/\S+$/.test(url) && (
        <div className="hero-panel-kare" style={{ marginTop: 10 }}>
          {/* Panel içi önizleme; next/image alan adı izni gerektiriyor
              ve yönetici herhangi bir adres girebilir. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      <label style={{ display: 'block', marginTop: 10 }}>
        <span className="tiny">Alt metin <em style={{ color: 'var(--danger)' }}>*</em></span>
        <input name="alt" required minLength={10} maxLength={200} defaultValue={h?.alt}
          placeholder="Deniz manzaralı, özel havuzlu bir villanın havuz başı" />
        <span className="tiny dim">
          Fotoğrafta ne olduğunu anlatın. Erişilebilirlik denetimi bunu arıyor.
        </span>
      </label>

      <div className="form-izgara" style={{ marginTop: 10 }}>
        <label>
          <span>Etiket <span className="dim">(isteğe bağlı)</span></span>
          <input name="etiket" maxLength={60} defaultValue={h?.etiket ?? ''}
            placeholder="Kaş · Çukurbağ" />
        </label>
        <label>
          <span>Sıra</span>
          <input name="sira" type="number" defaultValue={h?.sira ?? 0} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
        <label className="tiny" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" name="aktif" value="evet" defaultChecked={h?.aktif ?? true} />
          <span>Yayında</span>
        </label>
        {/* Gizli alan onay kutusundan SONRA: `FormData.get` ilk eşleşmeyi
            döndürüyor; kutusuz bir onay alanı forma hiç girmiyor. */}
        <input type="hidden" name="aktif" value="hayir" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {h && (
          <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
            onClick={() => setAcik(false)}>Vazgeç</button>
        )}
      </div>
    </form>
  );
}

export function HeroEylem({ id, aktif }: { id: string; aktif: boolean }) {
  const [bekliyor, basla] = useTransition();
  const [onay, setOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Sıra komşuyla YER DEĞİŞTİRİYOR: sıra alanına elle sayı
          yazmak, iki görsele aynı sayı verildiğinde diziyi sessizce
          bozuyordu. */}
      <button className="icon-btn" type="button" disabled={bekliyor} aria-label="Yukarı taşı"
        onClick={() => basla(async () => { const r = await heroTasi(id, 'yukari'); setHata(r.hata ?? null); })}>
        <Icon n="chevU" s={15} sw={2.4} />
      </button>
      <button className="icon-btn" type="button" disabled={bekliyor} aria-label="Aşağı taşı"
        onClick={() => basla(async () => { const r = await heroTasi(id, 'asagi'); setHata(r.hata ?? null); })}>
        <Icon n="chevD" s={15} sw={2.4} />
      </button>
      {hata && <span className="tiny" style={{ color: 'var(--danger)' }}>{hata}</span>}
      <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
        onClick={() => basla(() => { void heroDurum(id, !aktif); })}>
        {aktif ? 'Yayından kaldır' : 'Yayına al'}
      </button>
      {!onay ? (
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => setOnay(true)}>Sil</button>
      ) : (
        <>
          <button className="btn btn-sm" type="button" disabled={bekliyor}
            style={{ background: 'var(--danger)', color: '#fff' }}
            onClick={() => basla(() => { void heroSil(id); })}>Silmeyi onayla</button>
          <button className="btn btn-quiet btn-sm" type="button" onClick={() => setOnay(false)}>Vazgeç</button>
        </>
      )}
    </div>
  );
}
