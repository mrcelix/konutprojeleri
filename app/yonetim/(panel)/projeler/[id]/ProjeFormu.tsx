'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { projeKaydet, type KayitDurumu } from './eylem';
import { OZELLIKLER, DAIRE_TIPLERI } from '@/lib/filtre';
import { skorKalemleri } from '@/lib/veri-skoru';
import type { DuzenlenirProje } from '@/lib/queries/duzenleyici';

/**
 * Proje düzenleyici formu.
 *
 * Sunucu eylemi kullanır; JavaScript kapalıyken de kaydeder. İstemci
 * tarafı üç şey ekler: canlı tamamlanma skoru, canlı SEO önizlemesi ve
 * boş daire tipi satırı ekleme. Üçü de olmasa form yine çalışır.
 *
 * Daire tipleri AYNI FORMDA. Ayrı bir ekrana taşımak, fiyat girmeyi
 * ikinci bir adım haline getirirdi — panelde en sık yapılan iş fiyat
 * güncellemek ve en sık atlanan alan da o.
 */

const TIPLER = ['konut', 'villa', 'ofis', 'rezidans', 'kentsel_donusum', 'toki', 'emlak_konut'];
const DURUMLAR = ['taslak', 'lansman', 'satista', 'teslim_edildi', 'arsiv'];

function Kaydet({ etiket }: { etiket: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'Kaydediliyor…' : etiket}
    </button>
  );
}

type Props = {
  proje: DuzenlenirProje;
  admin: boolean;
  kaydedildi?: boolean;
};

export function ProjeFormu({ proje, admin, kaydedildi }: Props) {
  const [durum, eylem] = useActionState(projeKaydet, null as KayitDurumu);

  // Canlı skor için izlenen alanlar. Tamamı state'e alınsaydı form
  // kontrollü hale gelir ve JavaScript'siz çalışmazdı.
  const [ad, setAd] = useState(proje.ad);
  const [aciklama, setAciklama] = useState(proje.aciklama ?? '');
  const [ilce, setIlce] = useState(proje.ilce);
  const [ekSatir, setEkSatir] = useState(1);

  const satirlar = [
    ...proje.daire_tipleri,
    ...Array.from({ length: ekSatir }, () => null),
  ];

  const kalemler = skorKalemleri({
    ad,
    aciklama,
    teslim_ceyrek: proje.teslim_ceyrek,
    santiye_yuzde: proje.santiye_yuzde,
    aidat: proje.aidat,
    pesinat_orani: proje.pesinat_orani,
    vade_ay: proje.vade_ay,
    konum_var: proje.lat != null,
    gorsel_sayisi: proje.gorsel_sayisi,
    daire_tipleri: proje.daire_tipleri,
    fiyat_teyit_tarihi: proje.fiyat_teyit_tarihi,
  });
  const skor = Math.round(
    (kalemler.filter((x) => x.tamam).reduce((t, x) => t + x.puan, 0) /
      kalemler.reduce((t, x) => t + x.puan, 0)) * 100
  );
  const eksikler = kalemler.filter((x) => !x.tamam);

  const baslik = `${ad} — ${ilce.charAt(0).toUpperCase() + ilce.slice(1)}`;

  return (
    <form action={eylem} className="dz">
      <input type="hidden" name="id" value={proje.id} />

      {kaydedildi && !durum && (
        <p className="dz-bildirim is-ok" role="status">Değişiklikler kaydedildi.</p>
      )}
      {durum?.hata && <p className="dz-bildirim is-hata" role="alert">{durum.hata}</p>}
      {durum?.bilgi && <p className="dz-bildirim" role="status">{durum.bilgi}</p>}

      <div className="dz-duzen">
        <div className="dz-ana">

          {/* ── Genel bilgiler ── */}
          <section className="kart dz-blok">
            <h2 className="h3">Genel bilgiler</h2>

            <div className="dz-izgara">
              <label className="dz-alan dz-genis">
                <span className="eyebrow">Proje adı *</span>
                <input name="ad" defaultValue={proje.ad} required
                  onChange={(e) => setAd(e.target.value)} />
              </label>

              <label className="dz-alan dz-genis">
                <span className="eyebrow">Slug * <i>adres bu değerden üretilir</i></span>
                <input name="slug" defaultValue={proje.slug} required pattern="[a-z0-9][a-z0-9\-]*" />
              </label>

              <label className="dz-alan">
                <span className="eyebrow">İl *</span>
                <input name="il" defaultValue={proje.il} required />
              </label>

              <label className="dz-alan">
                <span className="eyebrow">İlçe *</span>
                <input name="ilce" defaultValue={proje.ilce} required
                  onChange={(e) => setIlce(e.target.value)} />
              </label>

              <label className="dz-alan">
                <span className="eyebrow">Mahalle</span>
                <input name="mahalle" defaultValue={proje.mahalle ?? ''} />
              </label>

              <label className="dz-alan">
                <span className="eyebrow">Tip</span>
                <select name="tip" defaultValue={proje.tip}>
                  {TIPLER.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </label>

              <label className="dz-alan">
                <span className="eyebrow">Durum</span>
                <select name="durum" defaultValue={proje.durum}>
                  {DURUMLAR.map((d) => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                </select>
              </label>

              <label className="dz-alan">
                <span className="eyebrow">Teslim çeyreği <i>2027Q2</i></span>
                <input name="teslim_ceyrek" defaultValue={proje.teslim_ceyrek ?? ''}
                  placeholder="2027Q2" pattern="\d{4}Q[1-4]" />
              </label>

              <label className="dz-alan">
                <span className="eyebrow">Şantiye ilerlemesi <i>%</i></span>
                <input name="santiye_yuzde" type="number" min={0} max={100}
                  defaultValue={proje.santiye_yuzde ?? ''} />
              </label>

              <label className="dz-alan">
                <span className="eyebrow">Enlem <i>lat</i></span>
                <input name="lat" defaultValue={proje.lat ?? ''} placeholder="41.0082" />
              </label>

              <label className="dz-alan">
                <span className="eyebrow">Boylam <i>lng</i></span>
                <input name="lng" defaultValue={proje.lng ?? ''} placeholder="28.9784" />
              </label>
            </div>
          </section>

          {/* ── Yapı ve ödeme ── */}
          <section className="kart dz-blok">
            <h2 className="h3">Yapı ve ödeme planı</h2>
            <div className="dz-izgara">
              <label className="dz-alan">
                <span className="eyebrow">Toplam konut</span>
                <input name="toplam_konut" type="number" defaultValue={proje.toplam_konut ?? ''} />
              </label>
              <label className="dz-alan">
                <span className="eyebrow">Ticari birim</span>
                <input name="ticari_birim" type="number" defaultValue={proje.ticari_birim ?? ''} />
              </label>
              <label className="dz-alan">
                <span className="eyebrow">Blok</span>
                <input name="blok_sayisi" type="number" defaultValue={proje.blok_sayisi ?? ''} />
              </label>
              <label className="dz-alan">
                <span className="eyebrow">Kat</span>
                <input name="kat_sayisi" type="number" defaultValue={proje.kat_sayisi ?? ''} />
              </label>
              <label className="dz-alan">
                <span className="eyebrow">Tavan yüksekliği <i>m</i></span>
                <input name="tavan_yuksekligi" defaultValue={proje.tavan_yuksekligi ?? ''} />
              </label>
              <label className="dz-alan">
                <span className="eyebrow">Aidat <i>₺/ay</i></span>
                <input name="aidat" defaultValue={proje.aidat ?? ''} />
              </label>
              <label className="dz-alan">
                <span className="eyebrow">Peşinat oranı <i>%</i></span>
                <input name="pesinat_orani" defaultValue={proje.pesinat_orani ?? ''} />
              </label>
              <label className="dz-alan">
                <span className="eyebrow">Vade <i>ay</i></span>
                <input name="vade_ay" type="number" defaultValue={proje.vade_ay ?? ''} />
              </label>
              <label className="dz-onay dz-genis">
                <input type="checkbox" name="faizsiz" defaultChecked={proje.faizsiz ?? false} />
                <span>Faizsiz senetli ödeme planı</span>
              </label>
            </div>
            <p className="dz-not">
              Peşinat oranı ve vade, bütçe eşleşmesi sayfasındaki aylık taksit
              hesabının girdisidir. Boş bırakılırsa proje o listeye hiç girmez.
            </p>
          </section>

          {/* ── Daire tipleri ── */}
          <section className="kart dz-blok">
            <h2 className="h3">Daire tipleri ve fiyatlar</h2>
            <p className="dz-not" style={{ marginTop: 0 }}>
              Fiyat değişikliği <b>fiyat arşivine kalıcı olarak</b> yazılır ve
              m² endeksine girer. Arşiv silinemez; yanlış girilen bir fiyat
              ancak yeni bir kayıtla düzeltilir.
            </p>

            <div className="dz-tablo-kaydir">
              <table className="dz-tablo">
                <thead>
                  <tr>
                    <th>Tip</th><th>Net m²</th><th>Brüt m²</th>
                    <th>Liste fiyatı ₺</th><th>Toplam</th><th>Kalan</th><th>Sil</th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map((d, i) => (
                    <tr key={d?.id ?? `yeni-${i}`}>
                      <td>
                        <input type="hidden" name={`dt_id_${i}`} value={d?.id ?? ''} />
                        <input name={`dt_tip_${i}`} defaultValue={d?.tip ?? ''}
                          list="daire-tipleri" placeholder="2+1" />
                      </td>
                      <td><input name={`dt_net_${i}`} defaultValue={d?.net_m2 ?? ''} /></td>
                      <td><input name={`dt_brut_${i}`} defaultValue={d?.brut_m2 ?? ''} /></td>
                      <td><input name={`dt_fiyat_${i}`} defaultValue={d?.liste_fiyati ?? ''} /></td>
                      <td><input name={`dt_toplam_${i}`} type="number" defaultValue={d?.toplam_adet ?? ''} /></td>
                      <td><input name={`dt_kalan_${i}`} type="number" defaultValue={d?.kalan_adet ?? ''} /></td>
                      <td className="dz-sil">
                        {d && <input type="checkbox" name={`dt_sil_${i}`} aria-label={`${d.tip} sil`} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <datalist id="daire-tipleri">
              {DAIRE_TIPLERI.map((t) => <option key={t} value={t} />)}
            </datalist>

            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => setEkSatir((n) => n + 1)}>
              + Satır ekle
            </button>
          </section>

          {/* ── Özellikler ── */}
          <section className="kart dz-blok">
            <h2 className="h3">Özellikler</h2>
            <div className="dz-ozellikler">
              {Object.entries(OZELLIKLER).map(([anahtar, ad2]) => (
                <label key={anahtar} className="dz-onay">
                  <input type="checkbox" name={`oz_${anahtar}`}
                    defaultChecked={!!proje.ozellikler?.[anahtar]} />
                  <span>{ad2}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ── Açıklama ── */}
          <section className="kart dz-blok">
            <h2 className="h3">Açıklama</h2>
            <textarea name="aciklama" rows={8} defaultValue={proje.aciklama ?? ''}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="Projenin kendi metni. Firmanın tanıtım broşüründen kopyalanmış metin arama motorunda kopya içerik sayılır." />
            <p className="dz-not">
              {aciklama.trim().length} karakter · en az 200 karakter özgün metin
              önerilir. Bölge sayfalarındaki 120 kelime eşiği ayrıdır.
            </p>
          </section>
        </div>

        {/* ── Yan sütun ── */}
        <aside className="dz-yan">
          <section className="kart dz-blok">
            <h2 className="h3">Tamamlanma</h2>
            <div className="dz-skor">
              <b className="sayi">{skor}</b>
              <span>/ 100</span>
            </div>
            <div className="dz-cubuk"><i style={{ width: `${skor}%` }} /></div>

            {eksikler.length === 0 ? (
              <p className="dz-not">Tüm alanlar dolu.</p>
            ) : (
              <ul className="dz-eksikler">
                {eksikler.map((e) => (
                  <li key={e.ad}>
                    <b>{e.ad}</b> <em>+{e.puan}</em>
                    <span>{e.neden}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="dz-not">
              Skor kaydettikten sonra güncellenir; buradaki değer form
              üzerindeki son hâli gösterir.
            </p>
          </section>

          <section className="kart dz-blok">
            <h2 className="h3">Arama sonucu önizlemesi</h2>
            <div className="dz-seo">
              <span className="dz-seo__url">
                konutprojeleri.com › {proje.il} › {ilce}
              </span>
              <b className="dz-seo__baslik">{baslik} | Konutprojeleri.com</b>
              <span className="dz-seo__metin">
                {(aciklama || 'Açıklama girilmediğinde arama motoru sayfadan kendi özetini üretir; ne göstereceğini siz belirlemezsiniz.').slice(0, 155)}
                {aciklama.length > 155 ? '…' : ''}
              </span>
            </div>
          </section>

          {admin && (
            <section className="kart dz-blok">
              <h2 className="h3">Yayın</h2>
              <label className="dz-onay">
                <input type="checkbox" name="yayinda" defaultChecked={proje.yayinda} />
                <span><b>Yayında</b></span>
              </label>
              <label className="dz-alan" style={{ marginTop: 'var(--s-3)' }}>
                <span className="eyebrow">Fiyat teyit tarihi</span>
                <input type="date" name="fiyat_teyit_tarihi"
                  defaultValue={proje.fiyat_teyit_tarihi ?? ''} />
              </label>
              <p className="dz-not">
                90 günden eski teyit tarihinde proje listede &ldquo;fiyat teyit
                edilmedi&rdquo; rozetiyle görünür.
              </p>
            </section>
          )}

          {!admin && (
            <p className="dz-not">
              Değişiklikleriniz <b>onay kuyruğuna</b> düşer. Onaylanana kadar
              sitede eski değerler görünmeye devam eder. Yayın durumunu
              yalnızca site yönetimi değiştirebilir.
            </p>
          )}
        </aside>
      </div>

      <div className="dz-kaydet">
        <Kaydet etiket={admin ? 'Kaydet' : 'Onaya gönder'} />
        <a href={`/${proje.il}/${proje.ilce}/${proje.slug}`} target="_blank"
          className="btn btn-ghost btn-sm" rel="noreferrer">
          Sitede gör
        </a>
      </div>
    </form>
  );
}
