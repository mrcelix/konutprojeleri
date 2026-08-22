'use client';

import { useActionState } from 'react';
import Icon from '@/components/Icon';
import { projeGuncelle, type ProjeSonucu } from '@/lib/panel-eylemler';
import { PROJE_DURUMLARI, TAPU_DURUMLARI } from '@/lib/kategori-sabit';
import { DURUM_ADI, TAPU_ADI } from '@/lib/bicim';

/* ============================================================
   Projenin TİCARİ alanlarını düzenleme formu.

   Kimlik ve konum burada YOK: ad, slug, bölge ve koordinat
   değiştirmek eski adresi yönlendirme tablosuna yazmayı gerektiriyor
   ve yalnızca yönetimde yapılabiliyor (`projeKimlikGuncelle`).
   Firma kendi projesinin fiyatını ve satış durumunu güncelliyor —
   asıl sık değişen alanlar bunlar.
   ============================================================ */

export interface ProjeVeri {
  id: string;
  ad: string;
  fiyatMin: number;
  fiyatMax: number | null;
  pesinatOrani: number;
  taksitAyi: number;
  krediyeUygun: boolean;
  takas: boolean;
  aidat: number | null;
  tapuDurumu: string | null;
  durum: string;
  ilerlemeYuzde: number;
  baslangicTarihi: string | null;
  teslimTarihi: string | null;
  ozet: string;
  sec: string | null;
  oneCikan: boolean;
  yayinda: boolean;
}

export default function ProjeDuzenle({ proje }: { proje: ProjeVeri }) {
  const [durum, gonder, bekliyor] = useActionState<ProjeSonucu | null, FormData>(projeGuncelle, null);

  const sayiAlan = (ad: string, etiket: string, deger: number | null, ipucu?: string, min = 0) => (
    <div className="p-alan">
      <label htmlFor={ad}>{etiket}</label>
      <input id={ad} name={ad} type="number" defaultValue={deger ?? ''} min={min}
        style={durum?.alan === ad ? { borderColor: 'var(--danger)' } : undefined} />
      {ipucu && <span className="ipucu">{ipucu}</span>}
    </div>
  );

  return (
    <form action={gonder} className="p-form">
      <input type="hidden" name="projeId" value={proje.id} />

      <section className="kart">
        <div className="kart-bas"><div><h2>Fiyat</h2></div></div>
        <div className="p-satir">
          {sayiAlan('fiyatMin', 'Başlangıç fiyatı (₺)', proje.fiyatMin,
            'En düşük daire tipinin fiyatı; kartta bu görünüyor', 1)}
          {sayiAlan('fiyatMax', 'Üst fiyat (₺)', proje.fiyatMax,
            'Boş bırakılabilir — "…’den başlayan" yazılır')}
          {sayiAlan('aidat', 'Aidat (₺/ay)', proje.aidat, 'Teslim sonrası tahmini')}
        </div>
      </section>

      <section className="kart">
        <div className="kart-bas"><div><h2>Ödeme koşulları</h2></div></div>
        <div className="p-satir">
          {sayiAlan('pesinatOrani', 'Peşinat oranı (%)', proje.pesinatOrani,
            '0 = bilgi verilmiyor, "peşinatsız" değil')}
          {sayiAlan('taksitAyi', 'Vade (ay)', proje.taksitAyi, '0 = firmadan taksit yok')}
          <div className="p-alan">
            <label htmlFor="tapuDurumu">Tapu durumu</label>
            <select id="tapuDurumu" name="tapuDurumu" defaultValue={proje.tapuDurumu ?? ''}>
              <option value="">Belirtilmedi</option>
              {TAPU_DURUMLARI.map((t) => (
                <option key={t} value={t}>{TAPU_ADI[t]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-onaylar">
          <label className="onay-satir">
            <input type="checkbox" name="krediyeUygun" defaultChecked={proje.krediyeUygun} />
            <span>Konut kredisine uygun</span>
          </label>
          <label className="onay-satir">
            <input type="checkbox" name="takas" defaultChecked={proje.takas} />
            <span>Takas kabul ediliyor</span>
          </label>
        </div>
      </section>

      <section className="kart">
        <div className="kart-bas">
          <div>
            <h2>Satış durumu ve takvim</h2>
            <p>
              Teslim tarihi sitede ÇEYREK olarak gösteriliyor; gün belirtmek
              tutulmayacak bir söz olurdu.
            </p>
          </div>
        </div>
        <div className="p-satir">
          <div className="p-alan">
            <label htmlFor="durum">Satış aşaması</label>
            <select id="durum" name="durum" defaultValue={proje.durum}>
              {PROJE_DURUMLARI.map((d) => (
                <option key={d} value={d}>{DURUM_ADI[d]}</option>
              ))}
            </select>
            <span className="ipucu">Tükendi ve teslim edildi vitrinden düşüyor</span>
          </div>
          <div className="p-alan">
            <label htmlFor="baslangicTarihi">İnşaat başlangıcı</label>
            <input id="baslangicTarihi" name="baslangicTarihi" type="date"
              defaultValue={proje.baslangicTarihi ?? ''} />
          </div>
          <div className="p-alan">
            <label htmlFor="teslimTarihi">Teslim tarihi</label>
            <input id="teslimTarihi" name="teslimTarihi" type="date"
              defaultValue={proje.teslimTarihi ?? ''}
              style={durum?.alan === 'teslimTarihi' ? { borderColor: 'var(--danger)' } : undefined} />
          </div>
          {sayiAlan('ilerlemeYuzde', 'İnşaat ilerlemesi (%)', proje.ilerlemeYuzde,
            'Sayfada çubuk olarak gösteriliyor')}
        </div>
      </section>

      <section className="kart">
        <div className="kart-bas"><div><h2>Tanıtım</h2></div></div>
        <div className="p-alan">
          <label htmlFor="ozet">Proje açıklaması</label>
          <textarea id="ozet" name="ozet" rows={4} defaultValue={proje.ozet}
            minLength={40} maxLength={600} required
            style={durum?.alan === 'ozet' ? { borderColor: 'var(--danger)' } : undefined} />
          <span className="ipucu">En az 40 karakter — kartta ve arama sonucunda görünüyor</span>
        </div>
        <div className="p-alan" style={{ marginTop: 14 }}>
          <label htmlFor="sec">Rozet metni</label>
          <input id="sec" name="sec" defaultValue={proje.sec ?? ''} maxLength={40}
            placeholder="Sahile 400 m" />
          <span className="ipucu">Boş bırakılırsa rozet basılmıyor</span>
        </div>
        <div className="p-onaylar">
          <label className="onay-satir">
            <input type="checkbox" name="oneCikan" defaultChecked={proje.oneCikan} />
            <span>Anasayfa vitrininde göster</span>
          </label>
          <label className="onay-satir">
            <input type="checkbox" name="yayinda" defaultChecked={proje.yayinda} />
            <span>Yayında</span>
          </label>
        </div>
      </section>

      {durum?.hata && (
        <p className="form-hata" role="alert">
          <Icon n="x" s={16} sw={2.4} /> {durum.hata}
        </p>
      )}
      {durum?.tamam && (
        <p className="form-basarili" role="status">
          <Icon n="check" s={16} sw={2.4} /> Değişiklikler kaydedildi.
        </p>
      )}

      <div className="p-form-alt">
        <button className="btn btn-primary" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
        </button>
      </div>
    </form>
  );
}
