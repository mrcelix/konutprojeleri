'use client';

import { useActionState, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { projeKimlikGuncelle, type ProjeKimlikSonucu } from '@/lib/panel-eylemler';
import { slugla } from '@/lib/turkce';
import { PROJE_TIPLERI } from '@/lib/kategori-sabit';
import { TIP_ADI } from '@/lib/bicim';
import type { Secenek } from './ProjeEkle';

/* ============================================================
   Projenin kimliği ve konumu — yalnızca yönetim.

   Firma kendi projesinin fiyatını, teslim tarihini ve daire tiplerini
   değiştirebiliyor ama adını, firmasını, bölgesini ve koordinatını
   değiştiremiyor: bunlar ekibin yerinde doğruladığı bilgiler ve
   bölge sayfalarının dayanağı. Firma projeyi "Kartal"dan
   "Ataşehir"e taşıyabilseydi bölge sayfaları anlamını yitirirdi.

   Ad değişince slug da değişiyor. Bu, YAYINDAKİ bir projede canlı
   adresi değiştirmek demek; form bunu önceden ve açıkça söylüyor,
   eski adres kalıcı yönlendirmeyle yenisine gidiyor. Reklam
   bağlantıları ve talep onay e-postaları o adresi taşıyor.
   ============================================================ */

export interface ProjeKimlikVerisi {
  id: string;
  ad: string;
  slug: string;
  bolgeId: string;
  firmaId: string;
  mahalle: string;
  adres: string | null;
  lat: number;
  lng: number;
  tip: string;
  yayinda: boolean;
}

export default function ProjeKimlik({
  proje, bolgeler, firmalar,
}: {
  proje: ProjeKimlikVerisi;
  bolgeler: Secenek[];
  firmalar: Secenek[];
}) {
  const [durum, gonder, bekliyor] = useActionState<ProjeKimlikSonucu | null, FormData>(
    projeKimlikGuncelle, null,
  );

  // React 19 eylem sonrası formu sıfırlıyor; hatada değerler geri veriliyor
  const d = durum?.degerler;
  const sonDurum = useRef(durum);
  const denemeRef = useRef(0);
  if (sonDurum.current !== durum) { sonDurum.current = durum; denemeRef.current++; }

  const [ad, setAd] = useState(d?.ad ?? proje.ad);
  const stil = (alan: string) =>
    (durum?.alan === alan ? { borderColor: 'var(--danger)' } : undefined);

  /* Slug önizlemesi: ad değişmediyse mevcut slug korunuyor, çünkü
     sunucu da yalnızca ad değiştiğinde yeniden üretiyor. Elle
     kısaltılmış bir slug her kayıtta geri alınmamalı. */
  const adDegisti = ad.trim() !== proje.ad;
  const yeniSlug = adDegisti ? slugla(ad) : proje.slug;

  return (
    <form action={gonder} key={denemeRef.current}>
      <fieldset disabled={bekliyor} style={{ border: 0, padding: 0, margin: 0 }}>
        <input type="hidden" name="projeId" value={proje.id} />

        <section className="p-kart">
          <h2 className="h3">Kimlik ve konum</h2>
          <p className="muted small" style={{ margin: '6px 0 14px' }}>
            Bu alanlar firma panelinden değiştirilemiyor; yerinde
            doğrulanan bilgiler.
          </p>

          <div className="ekle-izgara">
            <div className="p-alan" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="k-ad">Proje adı</label>
              <input id="k-ad" name="ad" required maxLength={80}
                value={ad} onChange={(e) => setAd(e.target.value)} style={stil('ad')} />
              <span className="ipucu">
                Adres: <code>/proje/{yeniSlug}</code>
              </span>
            </div>

            {adDegisti && yeniSlug !== proje.slug && (
              <p className="p-uyari" style={{ gridColumn: '1 / -1' }}>
                <Icon n="shield" s={16} />
                <span>
                  Adres <code>/proje/{proje.slug}</code> yerine{' '}
                  <code>/proje/{yeniSlug}</code> olacak.
                  {proje.yayinda
                    ? ' Proje yayında: eski adres kalıcı olarak (308) yenisine yönlendirilecek, reklamlardaki ve talep e-postalarındaki bağlantılar çalışmaya devam edecek.'
                    : ' Proje yayında değil, kimse etkilenmiyor.'}
                </span>
              </p>
            )}

            <div className="p-alan">
              <label htmlFor="k-firma">Geliştirici firma</label>
              <select id="k-firma" name="firmaId" required
                defaultValue={d?.firmaId ?? proje.firmaId} style={stil('firmaId')}>
                {firmalar.map((f) => (
                  <option key={f.id} value={f.id}>{f.ad}{f.alt ? ` · ${f.alt}` : ''}</option>
                ))}
              </select>
              {/* Ortak girişim ya da devir gerçek: projeyi başka firmaya
                  bağlamak, gelmiş talepleri projede bırakıyor — talep
                  projeye ait, firmaya değil. */}
              <span className="ipucu">
                Devir hâlinde değiştirin — gelmiş talepler projede kalır.
              </span>
            </div>

            <div className="p-alan">
              <label htmlFor="k-tip">Proje tipi</label>
              <select id="k-tip" name="tip" defaultValue={d?.tip ?? proje.tip}>
                {PROJE_TIPLERI.map((t) => (
                  <option key={t} value={t}>{TIP_ADI[t]}</option>
                ))}
              </select>
              <span className="ipucu">
                Tip, projenin hangi listelerde çıkacağını belirliyor.
              </span>
            </div>

            <div className="p-alan">
              <label htmlFor="k-bolge">Bölge</label>
              <select id="k-bolge" name="bolgeId" required
                defaultValue={d?.bolgeId ?? proje.bolgeId} style={stil('bolgeId')}>
                {bolgeler.map((b) => (
                  <option key={b.id} value={b.id}>{b.ad}{b.alt ? ` · ${b.alt}` : ''}</option>
                ))}
              </select>
              <span className="ipucu">
                Bölge değişimi iniş sayfalarını ve arama sonuçlarını etkiler.
              </span>
            </div>

            <div className="p-alan">
              <label htmlFor="k-mahalle">Mahalle</label>
              <input id="k-mahalle" name="mahalle" required maxLength={60}
                defaultValue={d?.mahalle ?? proje.mahalle} style={stil('mahalle')} />
            </div>

            <div className="p-alan" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="k-adres">Satış ofisi adresi <span className="dim">(isteğe bağlı)</span></label>
              <input id="k-adres" name="adres" maxLength={200}
                defaultValue={d?.adres ?? proje.adres ?? ''} style={stil('adres')} />
              <span className="ipucu">Randevu alan ziyaretçiye gösteriliyor.</span>
            </div>

            <div className="p-alan">
              <label htmlFor="k-lat">Enlem</label>
              <input id="k-lat" name="lat" type="number" step="0.000001" required
                defaultValue={d?.lat ?? proje.lat} style={stil('lat')} />
            </div>
            <div className="p-alan">
              <label htmlFor="k-lng">Boylam</label>
              <input id="k-lng" name="lng" type="number" step="0.000001" required
                defaultValue={d?.lng ?? proje.lng} style={stil('lng')} />
              <span className="ipucu">
                Haritada şantiyeye sağ tıklayıp koordinatı kopyalayabilirsiniz.
              </span>
            </div>
          </div>

          {durum?.hata && (
            <p className="form-hata" role="alert" style={{ marginTop: 16 }}>
              <Icon n="x" s={16} sw={2.4} /> {durum.hata}
            </p>
          )}
          {durum?.tamam && (
            <p className="small" style={{ marginTop: 16, color: 'var(--success)' }}>
              <Icon n="check" s={16} sw={2.4} /> Kaydedildi.
              {durum.eskiSlug && ` Eski adres /proje/${durum.eskiSlug} artık yenisine yönlendiriliyor.`}
            </p>
          )}

          <button className="btn btn-primary btn-lg" type="submit"
            style={{ marginTop: 18 }} disabled={bekliyor}>
            {bekliyor ? 'Kaydediliyor…' : 'Kimliği kaydet'}
          </button>
        </section>
      </fieldset>
    </form>
  );
}
