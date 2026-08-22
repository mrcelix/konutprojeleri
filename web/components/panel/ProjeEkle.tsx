'use client';

import { useActionState, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { projeOlustur, type ProjeOlusturSonucu } from '@/lib/panel-eylemler';
import { PROJE_TIPLERI, PROJE_DURUMLARI, TAPU_DURUMLARI } from '@/lib/kategori-sabit';
import { TIP_ADI, DURUM_ADI, TAPU_ADI } from '@/lib/bicim';

/* ============================================================
   Proje ekleme formu.

   Görseller URL olarak giriliyor, dosya yükleme yok. Sebep: yükleme
   bir depolama servisi ve görsel işleme hattı gerektiriyor; ikisi de
   henüz kurulmadı. Ekip görselleri firmadan alıp CDN'e yüklüyor,
   buraya adresi giriyor. Yükleme geldiğinde bu alan değişir, kayıt
   modeli değişmez.

   ALT METNİ ZORUNLU. "Sonra ekleriz" diye bırakılan alt metni hiç
   eklenmiyor; formda zorunlu tutmak tek çalışan yöntem.

   DAİRE TİPİ BURADA SORULMUYOR. Projenin gerçek satış birimi o ama
   lansman öncesinde çoğu zaman henüz belli değil; kayıt açmayı daire
   tipine bağlamak "yakında" aşamasındaki projeyi hiç açtırmazdı.
   Tipler kayıt açıldıktan sonra düzenleme ekranından ekleniyor ve
   yayına alma kapısı en az bir tip arıyor.
   ============================================================ */

export interface Secenek { id: string; ad: string; alt?: string }
export interface OzellikSecenegi { kod: string; ad: string }

export default function ProjeEkle({
  bolgeler, firmalar, ozellikler,
}: {
  bolgeler: Secenek[];
  firmalar: Secenek[];
  ozellikler: OzellikSecenegi[];
}) {
  const [durum, gonder, bekliyor] = useActionState<ProjeOlusturSonucu | null, FormData>(
    projeOlustur, null,
  );

  /* React 19 eylem bitince formu SIFIRLIYOR. Hatada eylem girilen
     değerleri geri veriyor; `key` her denemede değiştiği için alanlar
     yeni defaultValue ile baştan kuruluyor. Yoksa tek bir hatalı
     koordinat yirmi alanı birden siliyor. */
  const d = durum?.degerler;
  const isaretli = new Set(durum?.ozellikler ?? []);
  const sonDurum = useRef(durum);
  const denemeRef = useRef(0);
  if (sonDurum.current !== durum) { sonDurum.current = durum; denemeRef.current++; }

  const [gorselSayisi, setGorselSayisi] = useState(
    (d?.fotograflar ?? '').split('\n').filter((x) => x.trim()).length,
  );

  /* SATIŞ DURUMU formun üstünde: "yakında" olan bir projede teslim
     tarihi tahmini, "teslim edildi" olanda ilerleme yüzdesi anlamsız.
     Alanlar gizlenmiyor ama ipucu metinleri duruma göre değişiyor —
     gizlemek, sonradan durumu değiştiren kişiye alanın var olduğunu
     hiç göstermezdi. */
  const [projeDurumu, setProjeDurumu] = useState<string>(d?.durum ?? 'SATISTA');
  const insaatSuruyor = projeDurumu !== 'TESLIM_EDILDI';

  const stil = (alan: string) =>
    (durum?.alan === alan ? { borderColor: 'var(--danger)' } : undefined);

  if (durum?.slug) {
    return (
      <section className="p-kart">
        <h2 className="h3" style={{ color: 'var(--success)' }}>Proje kaydı açıldı</h2>
        <p className="muted small" style={{ margin: '10px 0 16px' }}>
          Proje <b>taslak</b> olarak kaydedildi ve <b>henüz yayında değil</b>.
          Yayına alabilmek için en az bir <b>daire tipi</b> girilmesi gerekiyor:
          tipi ve fiyatı olmayan bir sayfa ziyaretçinin tek sorusuna
          (&quot;hangi tipler var, kaça?&quot;) cevap vermiyor ve talep formu
          boşa çalışıyor.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary btn-sm" href="/yonetim/projeler">
            Projeler listesine dön
          </Link>
          <Link className="btn btn-ghost btn-sm" href={`/proje/${durum.slug}`} target="_blank">
            Sayfayı gör
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={gonder} key={denemeRef.current}>
      <fieldset disabled={bekliyor} style={{ border: 0, padding: 0, margin: 0 }}>

        {/* ---------- Kimlik ---------- */}
        <section className="p-kart">
          <h2 className="h3">Proje kimliği</h2>
          <div className="ekle-izgara" style={{ marginTop: 14 }}>
            <div className="p-alan" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="p-ad">Proje adı</label>
              <input id="p-ad" name="ad" required maxLength={80}
                defaultValue={d?.ad} style={stil('ad')}
                placeholder="Örnek Rezidans" />
              <span className="ipucu">Adres proje adından üretiliyor.</span>
            </div>

            <div className="p-alan">
              <label htmlFor="p-firma">Geliştirici firma</label>
              <select id="p-firma" name="firmaId" required
                defaultValue={d?.firmaId} style={stil('firmaId')}>
                <option value="">Seçin…</option>
                {firmalar.map((f) => (
                  <option key={f.id} value={f.id}>{f.ad}{f.alt ? ` · ${f.alt}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="p-alan">
              <label htmlFor="p-tip">Proje tipi</label>
              <select id="p-tip" name="tip" defaultValue={d?.tip ?? 'KONUT'}>
                {PROJE_TIPLERI.map((t) => (
                  <option key={t} value={t}>{TIP_ADI[t]}</option>
                ))}
              </select>
              {/* KARMA hem konut hem ofis listesinde çıkıyor; bunu
                  seçen kişinin bilmesi gerekiyor. */}
              <span className="ipucu">
                Karma seçilirse proje hem konut hem ofis listelerinde görünür.
              </span>
            </div>

            <div className="p-alan">
              <label htmlFor="p-durum">Satış durumu</label>
              <select id="p-durum" name="durum" value={projeDurumu}
                onChange={(e) => setProjeDurumu(e.target.value)}>
                {PROJE_DURUMLARI.map((s) => (
                  <option key={s} value={s}>{DURUM_ADI[s]}</option>
                ))}
              </select>
              <span className="ipucu">
                {projeDurumu === 'TUKENDI'
                  ? 'Tükenen proje listelerde çıkmıyor, sayfası açık kalıyor.'
                  : 'Listelerde ve kartlarda rozet olarak görünüyor.'}
              </span>
            </div>

            <div className="p-alan">
              <label htmlFor="p-bolge">Bölge</label>
              <select id="p-bolge" name="bolgeId" required
                defaultValue={d?.bolgeId} style={stil('bolgeId')}>
                <option value="">Seçin…</option>
                {bolgeler.map((b) => (
                  <option key={b.id} value={b.id}>{b.ad}{b.alt ? ` · ${b.alt}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="p-alan">
              <label htmlFor="p-mahalle">Mahalle</label>
              <input id="p-mahalle" name="mahalle" required maxLength={60}
                defaultValue={d?.mahalle} style={stil('mahalle')} />
            </div>

            <div className="p-alan" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="p-adres">Açık adres <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-adres" name="adres" maxLength={200}
                defaultValue={d?.adres} style={stil('adres')} />
              <span className="ipucu">Satış ofisinin adresi — randevu veren ziyaretçiye gösteriliyor.</span>
            </div>

            <div className="p-alan">
              <label htmlFor="p-lat">Enlem</label>
              <input id="p-lat" name="lat" type="number" step="0.000001" required
                defaultValue={d?.lat} style={stil('lat')} placeholder="40.987654" />
            </div>
            <div className="p-alan">
              <label htmlFor="p-lng">Boylam</label>
              <input id="p-lng" name="lng" type="number" step="0.000001" required
                defaultValue={d?.lng} style={stil('lng')} placeholder="29.123456" />
              <span className="ipucu">
                Haritada şantiyeye sağ tıklayıp koordinatı kopyalayabilirsiniz.
              </span>
            </div>
          </div>
        </section>

        {/* ---------- Fiyat ve ödeme ---------- */}
        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">Fiyat ve ödeme</h2>
          {/* Sitedeki her kart ve her arama süzgeci başlangıç fiyatını
              kullanıyor; bu yüzden zorunlu. Üst fiyat boşsa kart
              "…’den başlayan fiyatlarla" diyor. */}
          <div className="ekle-izgara" style={{ marginTop: 14 }}>
            <div className="p-alan">
              <label htmlFor="p-fmin">Başlangıç fiyatı (₺)</label>
              <input id="p-fmin" name="fiyatMin" type="number" min={1} required
                defaultValue={d?.fiyatMin} style={stil('fiyatMin')} />
              <span className="ipucu">En küçük daire tipinin fiyatı.</span>
            </div>
            <div className="p-alan">
              <label htmlFor="p-fmax">Üst fiyat (₺) <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-fmax" name="fiyatMax" type="number" min={0}
                defaultValue={d?.fiyatMax} style={stil('fiyatMax')} />
              <span className="ipucu">Boş bırakılırsa &quot;…’den başlayan&quot; yazılıyor.</span>
            </div>

            <div className="p-alan">
              <label htmlFor="p-pesinat">Peşinat oranı (%)</label>
              <input id="p-pesinat" name="pesinatOrani" type="number" min={0} max={100}
                defaultValue={d?.pesinatOrani ?? 0} style={stil('pesinatOrani')} />
              {/* Sıfır "peşinatsız" değil, "belirtilmemiş" demek —
                  peşinat süzgeci sıfırları dışarıda bırakıyor. */}
              <span className="ipucu">0 = belirtilmedi; peşinat süzgecinde çıkmaz.</span>
            </div>
            <div className="p-alan">
              <label htmlFor="p-taksit">Vade (ay)</label>
              <input id="p-taksit" name="taksitAyi" type="number" min={0} max={360}
                defaultValue={d?.taksitAyi ?? 0} style={stil('taksitAyi')} />
              <span className="ipucu">Firmanın kendi taksitlendirmesi.</span>
            </div>

            <div className="p-alan">
              <label htmlFor="p-aidat">Aidat (₺/ay) <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-aidat" name="aidat" type="number" min={0}
                defaultValue={d?.aidat} style={stil('aidat')} />
            </div>
            <div className="p-alan">
              <label htmlFor="p-tapu">Tapu durumu <span className="dim">(isteğe bağlı)</span></label>
              <select id="p-tapu" name="tapuDurumu" defaultValue={d?.tapuDurumu ?? ''}>
                <option value="">Belirtilmedi</option>
                {TAPU_DURUMLARI.map((t) => (
                  <option key={t} value={t}>{TAPU_ADI[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14 }}>
            <label className="ozellik-kutu">
              <input type="checkbox" name="krediyeUygun" defaultChecked />
              <span>Konut kredisine uygun</span>
            </label>
            <label className="ozellik-kutu">
              <input type="checkbox" name="takas" defaultChecked={d?.takas === 'on'} />
              <span>Takas kabul ediliyor</span>
            </label>
          </div>
        </section>

        {/* ---------- İnşaat ---------- */}
        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">İnşaat ve teslim</h2>
          <div className="ekle-izgara" style={{ marginTop: 14 }}>
            <div className="p-alan">
              <label htmlFor="p-basla">İnşaat başlangıcı <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-basla" name="baslangicTarihi" type="date"
                defaultValue={d?.baslangicTarihi} style={stil('baslangicTarihi')} />
            </div>
            <div className="p-alan">
              <label htmlFor="p-teslim">Teslim tarihi <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-teslim" name="teslimTarihi" type="date"
                defaultValue={d?.teslimTarihi} style={stil('teslimTarihi')} />
              {/* Sitede gün değil ÇEYREK gösteriliyor: teslim tarihi
                  hiçbir projede güne kadar kesin değil ve gün yazmak
                  tutulamayacak bir söz veriyor. */}
              <span className="ipucu">Sitede &quot;2027 2. çeyrek&quot; biçiminde gösteriliyor.</span>
            </div>
            <div className="p-alan">
              <label htmlFor="p-ilerleme">İnşaat ilerlemesi (%)</label>
              <input id="p-ilerleme" name="ilerlemeYuzde" type="number" min={0} max={100}
                defaultValue={d?.ilerlemeYuzde ?? 0} style={stil('ilerlemeYuzde')} />
              <span className="ipucu">
                {insaatSuruyor
                  ? 'Şantiye ziyaretinde güncelleniyor.'
                  : 'Teslim edilmiş projede 100 girin.'}
              </span>
            </div>

            <div className="p-alan">
              <label htmlFor="p-blok">Blok sayısı <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-blok" name="blokSayisi" type="number" min={0} defaultValue={d?.blokSayisi} />
            </div>
            <div className="p-alan">
              <label htmlFor="p-kat">Kat sayısı <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-kat" name="katSayisi" type="number" min={0} defaultValue={d?.katSayisi} />
            </div>
            <div className="p-alan">
              <label htmlFor="p-bagimsiz">Toplam bağımsız bölüm <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-bagimsiz" name="toplamBagimsizBolum" type="number" min={0}
                defaultValue={d?.toplamBagimsizBolum} />
            </div>
            <div className="p-alan">
              <label htmlFor="p-arsa">Arsa alanı (m²) <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-arsa" name="arsaM2" type="number" min={0} defaultValue={d?.arsaM2} />
            </div>
            <div className="p-alan">
              <label htmlFor="p-insaat">İnşaat alanı (m²) <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-insaat" name="insaatAlaniM2" type="number" min={0}
                defaultValue={d?.insaatAlaniM2} />
            </div>
            <div className="p-alan">
              <label htmlFor="p-yesil">Yeşil alan oranı (%) <span className="dim">(isteğe bağlı)</span></label>
              <input id="p-yesil" name="yesilAlanOrani" type="number" min={0} max={100}
                defaultValue={d?.yesilAlanOrani} />
            </div>
          </div>
        </section>

        {/* ---------- Tanıtım ---------- */}
        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">Tanıtım</h2>
          <div className="p-alan" style={{ marginTop: 14 }}>
            <label htmlFor="p-ozet">Açıklama</label>
            <textarea id="p-ozet" name="ozet" rows={4} required maxLength={600}
              defaultValue={d?.ozet} style={stil('ozet')}
              placeholder="Proje nerede, kime hitap ediyor, ayırt edici yanı ne?" />
            <span className="ipucu">En az 40 karakter. Kartlarda ve arama sonuçlarında görünüyor.</span>
          </div>

          <div className="p-alan" style={{ marginTop: 12 }}>
            <label htmlFor="p-sec">Öne çıkan cümle <span className="dim">(isteğe bağlı)</span></label>
            <input id="p-sec" name="sec" maxLength={90} defaultValue={d?.sec} />
            <span className="ipucu">Kartın üstünde tek satır: &quot;Metroya 400 m&quot; gibi.</span>
          </div>

          <div className="p-alan" style={{ marginTop: 12 }}>
            <label htmlFor="p-gorseller">Görseller</label>
            <textarea id="p-gorseller" name="fotograflar" rows={5} required
              defaultValue={d?.fotograflar} style={stil('fotograflar')}
              onChange={(e) => setGorselSayisi(
                e.target.value.split('\n').filter((x) => x.trim()).length,
              )}
              placeholder={'https://cdn.example.com/1.jpg|Projenin dış cephesi, akşam ışığında\nhttps://cdn.example.com/2.jpg|Örnek dairenin salonu'} />
            <span className="ipucu">
              Her satırda <code>adres|alt metni</code>. İlk satır kapak görseli
              olarak kullanılıyor. {gorselSayisi > 0 && <b>{gorselSayisi} görsel</b>}
            </span>
          </div>
        </section>

        {/* ---------- Özellikler ---------- */}
        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">Proje özellikleri</h2>
          <p className="muted small" style={{ margin: '6px 0 12px' }}>
            Arama süzgeçlerinin ve bölge iniş sayfalarının kaynağı.
            Daireye değil <b>projeye</b> ait olanlar işaretleniyor.
          </p>
          <div className="ozellik-izgara">
            {ozellikler.map((o) => (
              <label key={o.kod} className="ozellik-kutu">
                <input type="checkbox" name="ozellik" value={o.kod}
                  defaultChecked={isaretli.has(o.kod)} />
                <span>{o.ad}</span>
              </label>
            ))}
          </div>
        </section>

        {durum?.hata && (
          <p className="form-hata" role="alert" style={{ marginTop: 16 }}>
            <Icon n="x" s={16} sw={2.4} /> {durum.hata}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" type="submit" disabled={bekliyor}>
            {bekliyor ? 'Kaydediliyor…' : 'Projeyi kaydet'}
          </button>
          <Link className="btn btn-ghost btn-lg" href="/yonetim/projeler">Vazgeç</Link>
        </div>
      </fieldset>
    </form>
  );
}
