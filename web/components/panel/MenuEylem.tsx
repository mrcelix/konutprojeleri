'use client';

import { useActionState, useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import {
  menuDurum, menuKaydet, menuSil, menuTasi, menuVarsayilaniYukle,
  type IcerikSonucu,
} from '@/lib/panel-eylemler';

const BOS: IcerikSonucu | null = null;

export interface MenuOgeVeri {
  id: string;
  ad: string;
  yol: string | null;
  ikon: string | null;
  not: string | null;
  sira: number;
  aktif: boolean;
  mega: boolean;
  yeniSekme: boolean;
  ustId: string | null;
  tanitimBaslik: string | null;
  tanitimMetin: string | null;
  tanitimDugme: string | null;
  tanitimYol: string | null;
  seritBaslik: string | null;
}

export interface UstSecenek { id: string; ad: string; duzey: number }

/* ============================================================
   Menü ögesi formu.

   Üç düzey var: menü ögesi → mega sütunu → sütun bağlantısı. Düzey,
   "üst öge" seçimiyle belirleniyor; ayrı bir "düzey" alanı, aynı
   bilgiyi iki yerden sormak olurdu.
   ============================================================ */
export default function MenuFormu(
  { o, ustler }: { o?: MenuOgeVeri; ustler: UstSecenek[] },
) {
  const [durum, gonder, bekliyor] = useActionState<IcerikSonucu | null, FormData>(menuKaydet, BOS);
  const [mega, setMega] = useState(o?.mega ?? false);
  const [ustId, setUstId] = useState(o?.ustId ?? '');
  const [acik, setAcik] = useState(!o);

  if (!acik) {
    return (
      <button className="btn btn-quiet btn-sm" type="button" onClick={() => setAcik(true)}>
        <Icon n="sliders" s={14} sw={2.2} /> Düzenle
      </button>
    );
  }

  const ustDuzey = !ustId;

  return (
    <form action={gonder} className="p-form">
      {o && <input type="hidden" name="id" value={o.id} />}

      {durum?.hata && <p className="form-hata" role="alert">{durum.hata}</p>}
      {durum?.tamam && (
        <p className="tiny" style={{ color: 'var(--success)', margin: '0 0 10px' }}>
          <Icon n="check" s={14} sw={2.4} /> Kaydedildi.
        </p>
      )}

      <div className="form-izgara">
        <label>
          <span>Görünen ad <em>*</em></span>
          <input name="ad" required minLength={2} maxLength={60} defaultValue={o?.ad} />
        </label>
        <label>
          <span>Adres {ustDuzey && !mega && <em>*</em>}</span>
          <input name="yol" maxLength={300} defaultValue={o?.yol ?? ''} placeholder="/arama" />
          <span className="tiny dim">
            {mega ? 'Panel açılmadan tıklanırsa gidilecek yer.' : 'Sütun başlıkları boş bırakılabilir.'}
          </span>
        </label>
        <label>
          <span>Üst öge</span>
          <select name="ustId" value={ustId} onChange={(e) => setUstId(e.target.value)}>
            <option value="">— Üst düzey (menü ögesi)</option>
            {ustler.filter((u) => u.id !== o?.id).map((u) => (
              <option key={u.id} value={u.id}>
                {'— '.repeat(u.duzey)}{u.ad}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Sıra</span>
          <input name="sira" type="number" defaultValue={o?.sira ?? 0} />
        </label>
      </div>

      {!ustDuzey && (
        <div className="form-izgara" style={{ marginTop: 10 }}>
          <label>
            <span>İkon</span>
            <input name="ikon" maxLength={30} defaultValue={o?.ikon ?? ''} placeholder="pin" />
            <span className="tiny dim">Icon bileşenindeki ad (pin, heart, flame…).</span>
          </label>
          <label>
            <span>Küçük not</span>
            <input name="not" maxLength={60} defaultValue={o?.not ?? ''} placeholder="214 villa" />
          </label>
        </div>
      )}

      {ustDuzey && (
        <label className="tiny" style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginTop: 12 }}>
          <input type="checkbox" name="mega" value="evet" checked={mega}
            onChange={(e) => setMega(e.target.checked)} />
          <span>
            <b>Mega panel.</b> İşaretlenirse bu ögenin altına eklenen kayıtlar
            panel sütunu, onların altındakiler sütun bağlantısı olur.
            Sütunu olmayan mega öge düz bağlantı gibi davranır.
          </span>
        </label>
      )}

      {ustDuzey && mega && (
        <>
          <div className="form-izgara" style={{ marginTop: 12 }}>
            <label>
              <span>Tanıtım başlığı</span>
              <input name="tanitimBaslik" maxLength={80} defaultValue={o?.tanitimBaslik ?? ''} />
            </label>
            <label>
              <span>Tanıtım düğmesi</span>
              <input name="tanitimDugme" maxLength={40} defaultValue={o?.tanitimDugme ?? ''} />
            </label>
            <label>
              <span>Tanıtım düğme adresi</span>
              <input name="tanitimYol" maxLength={300} defaultValue={o?.tanitimYol ?? ''} placeholder="/arama" />
            </label>
            <label>
              <span>Kısayol şeridi başlığı</span>
              <input name="seritBaslik" maxLength={60} defaultValue={o?.seritBaslik ?? ''}
                placeholder="En çok tercih edilenler" />
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 10 }}>
            <span className="tiny">Tanıtım metni</span>
            <textarea name="tanitimMetin" rows={2} maxLength={200} defaultValue={o?.tanitimMetin ?? ''} />
          </label>
          <p className="tiny muted" style={{ margin: '8px 0 0' }}>
            Kısayol şeridi ayrı girilmiyor: her sütunun ilk iki bağlantısından
            oluşuyor. Aynı bağlantıyı iki kez girmenizi istemek gereksiz olurdu.
          </p>
        </>
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>
        <label className="tiny" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" name="yeniSekme" value="evet" defaultChecked={o?.yeniSekme} />
          <span>Yeni sekmede aç</span>
        </label>
        <label className="tiny" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" name="aktif" value="evet" defaultChecked={o?.aktif ?? true} />
          <span>Menüde görünsün</span>
        </label>
        {/* Gizli alan onay kutusundan SONRA: `FormData.get` ilk eşleşmeyi
            döndürüyor. Kutu işaretliyse 'evet', değilse yalnızca bu
            kalıyor ve 'hayir' okunuyor. Kutusuz bir onay alanı,
            işaretlenmediğinde forma hiç girmiyor. */}
        <input type="hidden" name="aktif" value="hayir" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {o && (
          <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
            onClick={() => setAcik(false)}>Vazgeç</button>
        )}
      </div>
    </form>
  );
}

/** Sıra, aç/kapat ve sil. */
export function MenuEylem(
  { id, aktif, ilkMi, sonMu }:
  { id: string; aktif: boolean; ilkMi: boolean; sonMu: boolean },
) {
  const [bekliyor, basla] = useTransition();
  const [onay, setOnay] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
      <button className="icon-btn" type="button" disabled={bekliyor || ilkMi}
        aria-label="Yukarı taşı" onClick={() => basla(() => { void menuTasi(id, 'yukari'); })}>
        <Icon n="chevU" s={15} sw={2.4} />
      </button>
      <button className="icon-btn" type="button" disabled={bekliyor || sonMu}
        aria-label="Aşağı taşı" onClick={() => basla(() => { void menuTasi(id, 'asagi'); })}>
        <Icon n="chevD" s={15} sw={2.4} />
      </button>
      <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
        onClick={() => basla(() => { void menuDurum(id, !aktif); })}>
        {aktif ? 'Gizle' : 'Göster'}
      </button>
      {!onay ? (
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => setOnay(true)}>Sil</button>
      ) : (
        <>
          <button className="btn btn-sm" type="button" disabled={bekliyor}
            style={{ background: 'var(--danger)', color: '#fff' }}
            onClick={() => basla(() => { void menuSil(id); })}>
            Alt ögelerle sil
          </button>
          <button className="btn btn-quiet btn-sm" type="button" onClick={() => setOnay(false)}>Vazgeç</button>
        </>
      )}
    </div>
  );
}

/** Koddaki menüyü tabloya aktarır — boş panelde başlangıç noktası. */
export function MenuVarsayilan() {
  const [bekliyor, basla] = useTransition();
  const [sonuc, setSonuc] = useState<string | null>(null);

  return (
    <div>
      <button className="btn btn-primary btn-sm" type="button" disabled={bekliyor}
        onClick={() => basla(async () => {
          const r = await menuVarsayilaniYukle();
          setSonuc(r.hata ?? 'Menü kuruldu.');
        })}>
        {bekliyor ? 'Kuruluyor…' : <><Icon n="plus" s={14} sw={2.4} /> Mevcut menüyü tabloya aktar</>}
      </button>
      {sonuc && <p className="tiny" style={{ margin: '6px 0 0' }}>{sonuc}</p>}
    </div>
  );
}
