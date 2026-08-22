'use client';

import { useActionState, useState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { daireTipiKaydet, daireTipiSil, type ProjeSonucu } from '@/lib/panel-eylemler';
import { TLkisa, m2 } from '@/lib/bicim';

/* ============================================================
   Daire tipi yönetimi.

   PROJENİN GERÇEK SATIŞ BİRİMİ BU: ziyaretçi projeyi değil daire
   tipini soruyor ve talep formu bu tipe bağlanıyor.

   Form AYNI SAYFADA ve satır tıklanınca AÇILIYOR: ayrı bir "yeni tip"
   ekranına gitmek, sekiz tipin fiyatını güncelleyen kişiyi sekiz kez
   sayfa değiştirtiyordu.

   KALAN ADET SIFIR OLABİLİR ve sıfır anlamlı: "tükendi" rozeti ondan
   basılıyor. Boş bırakmak "bilinmiyor" demek — ikisi farklı şey ve
   form ikisini ayırt ediyor.
   ============================================================ */

export interface DaireTipiVeri {
  id: string;
  ad: string;
  odaSayisi: string;
  banyo: number;
  brutM2: number;
  netM2: number | null;
  nitelik: string | null;
  fiyatMin: number | null;
  fiyatMax: number | null;
  adet: number | null;
  kalanAdet: number | null;
  katPlaniUrl: string | null;
  katPlaniAlt: string | null;
  sira: number;
  yayinda: boolean;
}

const BOS: Omit<DaireTipiVeri, 'id'> = {
  ad: '', odaSayisi: '', banyo: 1, brutM2: 0, netM2: null, nitelik: null,
  fiyatMin: null, fiyatMax: null, adet: null, kalanAdet: null,
  katPlaniUrl: null, katPlaniAlt: null, sira: 0, yayinda: true,
};

export default function DaireTipYonetim({
  projeId, tipler,
}: {
  projeId: string;
  tipler: DaireTipiVeri[];
}) {
  const [acik, setAcik] = useState<string | 'yeni' | null>(null);
  const [durum, gonder, bekliyor] = useActionState<ProjeSonucu | null, FormData>(
    daireTipiKaydet, null,
  );
  const [silinen, setSilinen] = useState<string | null>(null);
  const [silHata, setSilHata] = useState<string | null>(null);
  const [siliyor, gecis] = useTransition();

  const seciliTip = acik === 'yeni' || acik === null
    ? { id: '', ...BOS, sira: tipler.length }
    : tipler.find((t) => t.id === acik) ?? { id: '', ...BOS };

  const sil = (id: string) => {
    setSilHata(null);
    gecis(async () => {
      const r = await daireTipiSil(id);
      if (r.hata) setSilHata(r.hata);
      else setSilinen(id);
    });
  };

  return (
    <section className="kart">
      <div className="kart-bas">
        <div>
          <h2>Daire tipleri</h2>
          <p>
            Proje sayfasındaki tablo buradan doluyor. Tip yoksa proje yayına
            alınamıyor.
          </p>
        </div>
        <button type="button" className="btn btn-primary btn-sm"
          onClick={() => setAcik(acik === 'yeni' ? null : 'yeni')}>
          <Icon n="plus" s={15} sw={2.2} /> Yeni tip
        </button>
      </div>

      {tipler.length === 0 && acik !== 'yeni' && (
        <p className="small muted">
          Henüz daire tipi eklenmedi. En az bir tip eklemeden proje yayına
          alınamaz — sayfası ziyaretçinin tek sorusuna cevap vermiyor.
        </p>
      )}

      {tipler.length > 0 && (
        <div className="p-tablo-kap">
          <table className="p-tablo">
            <thead>
              <tr>
                <th>Tip</th><th className="sayi">Brüt</th><th className="sayi">Net</th>
                <th className="sayi">Fiyat</th><th className="sayi">Kalan</th>
                <th>Durum</th><th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {tipler.filter((t) => t.id !== silinen).map((t) => (
                <tr key={t.id}>
                  <td>
                    <b>{t.ad}</b>
                    <div className="tiny dim">
                      {t.odaSayisi} · {t.banyo} banyo
                      {t.nitelik && ` · ${t.nitelik}`}
                      {t.katPlaniUrl && ' · kat planı var'}
                    </div>
                  </td>
                  <td className="sayi">{m2(t.brutM2)}</td>
                  <td className="sayi">{t.netM2 ? m2(t.netM2) : '—'}</td>
                  <td className="sayi">
                    {t.fiyatMin ? TLkisa(t.fiyatMin) : <span className="dim">görüşmeye tabi</span>}
                  </td>
                  <td className="sayi">
                    {t.kalanAdet == null
                      ? '—'
                      : t.kalanAdet === 0
                        ? <span className="durum durum-PASIF">tükendi</span>
                        : <>{t.kalanAdet}{t.adet ? <span className="dim"> / {t.adet}</span> : null}</>}
                  </td>
                  <td>
                    <span className={`durum durum-${t.yayinda ? 'YAYINDA' : 'PASIF'}`}>
                      {t.yayinda ? 'Yayında' : 'Gizli'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn btn-ghost btn-sm"
                        onClick={() => setAcik(acik === t.id ? null : t.id)}>
                        <Icon n="sliders" s={14} /> Düzenle
                      </button>
                      <button type="button" className="btn btn-quiet btn-sm"
                        disabled={siliyor} onClick={() => sil(t.id)}>
                        <Icon n="x" s={14} sw={2.4} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {silHata && (
        <p className="form-hata" role="alert"><Icon n="x" s={16} sw={2.4} /> {silHata}</p>
      )}

      {acik && (
        <form action={gonder} className="p-form" style={{ marginTop: 16 }}>
          <input type="hidden" name="projeId" value={projeId} />
          {acik !== 'yeni' && <input type="hidden" name="id" value={seciliTip.id} />}

          <div className="p-satir">
            <div className="p-alan">
              <label htmlFor="d-ad">Görünen ad</label>
              <input id="d-ad" name="ad" defaultValue={seciliTip.ad} required maxLength={60}
                placeholder="2+1 Standart"
                style={durum?.alan === 'ad' ? { borderColor: 'var(--danger)' } : undefined} />
            </div>
            <div className="p-alan">
              <label htmlFor="d-oda">Oda sayısı</label>
              <input id="d-oda" name="odaSayisi" defaultValue={seciliTip.odaSayisi} required
                placeholder="2+1"
                style={durum?.alan === 'odaSayisi' ? { borderColor: 'var(--danger)' } : undefined} />
              <span className="ipucu">&quot;2+1&quot;, &quot;4.5+1&quot; ya da &quot;stüdyo&quot;</span>
            </div>
            <div className="p-alan">
              <label htmlFor="d-banyo">Banyo</label>
              <input id="d-banyo" name="banyo" type="number" min={1} defaultValue={seciliTip.banyo} />
            </div>
            <div className="p-alan">
              <label htmlFor="d-nitelik">Nitelik</label>
              <input id="d-nitelik" name="nitelik" defaultValue={seciliTip.nitelik ?? ''}
                maxLength={60} placeholder="Bahçe dubleks" />
            </div>
          </div>

          <div className="p-satir">
            <div className="p-alan">
              <label htmlFor="d-brut">Brüt m²</label>
              <input id="d-brut" name="brutM2" type="number" min={15} required
                defaultValue={seciliTip.brutM2 || ''}
                style={durum?.alan === 'brutM2' ? { borderColor: 'var(--danger)' } : undefined} />
            </div>
            <div className="p-alan">
              <label htmlFor="d-net">Net m²</label>
              <input id="d-net" name="netM2" type="number" min={0}
                defaultValue={seciliTip.netM2 ?? ''}
                style={durum?.alan === 'netM2' ? { borderColor: 'var(--danger)' } : undefined} />
            </div>
            <div className="p-alan">
              <label htmlFor="d-fmin">Fiyat (₺)</label>
              <input id="d-fmin" name="fiyatMin" type="number" min={0}
                defaultValue={seciliTip.fiyatMin ?? ''} />
              <span className="ipucu">Boşsa &quot;görüşmeye tabi&quot; yazılıyor</span>
            </div>
            <div className="p-alan">
              <label htmlFor="d-fmax">Üst fiyat (₺)</label>
              <input id="d-fmax" name="fiyatMax" type="number" min={0}
                defaultValue={seciliTip.fiyatMax ?? ''}
                style={durum?.alan === 'fiyatMax' ? { borderColor: 'var(--danger)' } : undefined} />
            </div>
          </div>

          <div className="p-satir">
            <div className="p-alan">
              <label htmlFor="d-adet">Toplam adet</label>
              <input id="d-adet" name="adet" type="number" min={0}
                defaultValue={seciliTip.adet ?? ''} />
            </div>
            <div className="p-alan">
              <label htmlFor="d-kalan">Kalan adet</label>
              <input id="d-kalan" name="kalanAdet" type="number" min={0}
                defaultValue={seciliTip.kalanAdet ?? ''}
                style={durum?.alan === 'kalanAdet' ? { borderColor: 'var(--danger)' } : undefined} />
              <span className="ipucu">0 yazarsanız &quot;tükendi&quot; görünür; boş = bilinmiyor</span>
            </div>
            <div className="p-alan">
              <label htmlFor="d-sira">Sıra</label>
              <input id="d-sira" name="sira" type="number" min={0} defaultValue={seciliTip.sira} />
            </div>
          </div>

          <div className="p-satir">
            <div className="p-alan">
              <label htmlFor="d-plan">Kat planı adresi</label>
              <input id="d-plan" name="katPlaniUrl" defaultValue={seciliTip.katPlaniUrl ?? ''}
                placeholder="https://…"
                style={durum?.alan === 'katPlaniUrl' ? { borderColor: 'var(--danger)' } : undefined} />
            </div>
            <div className="p-alan">
              <label htmlFor="d-planalt">Kat planı alt metni</label>
              <input id="d-planalt" name="katPlaniAlt" defaultValue={seciliTip.katPlaniAlt ?? ''}
                maxLength={160} placeholder="2+1 daire kat planı, salon güney cepheli"
                style={durum?.alan === 'katPlaniAlt' ? { borderColor: 'var(--danger)' } : undefined} />
              <span className="ipucu">Plan varsa zorunlu — ekran okuyucu için tek bilgi</span>
            </div>
          </div>

          <label className="onay-satir">
            <input type="checkbox" name="yayinda" defaultChecked={seciliTip.yayinda} />
            <span>Sitede göster</span>
          </label>

          {durum?.hata && (
            <p className="form-hata" role="alert"><Icon n="x" s={16} sw={2.4} /> {durum.hata}</p>
          )}
          {durum?.tamam && (
            <p className="form-basarili" role="status">
              <Icon n="check" s={16} sw={2.4} /> Daire tipi kaydedildi.
            </p>
          )}

          <div className="p-form-alt">
            <button className="btn btn-primary" type="submit" disabled={bekliyor}>
              {bekliyor ? 'Kaydediliyor…' : acik === 'yeni' ? 'Tipi ekle' : 'Kaydet'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setAcik(null)}>
              Vazgeç
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
