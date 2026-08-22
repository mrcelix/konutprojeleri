'use client';

import { useActionState, useState } from 'react';
import Icon from '@/components/Icon';
import { tohumEkle, tohumSil, tohumYenile, type TohumEylemSonucu } from '@/lib/panel-eylemler';

/* ============================================================
   Tohumlama düğmeleri.

   Ekleme tek tık; silme YAZARAK onay istiyor. Sebep: ekleme geri
   alınabilir (parti defterde duruyor), silme alınamıyor.
   ============================================================ */

const BOS: TohumEylemSonucu = {};

function Sonuc({ s }: { s: TohumEylemSonucu }) {
  if (!s.hata && !s.mesaj) return null;
  return (
    <div role="status" className="tiny" style={{ marginTop: 8 }}>
      <p style={{ margin: 0, color: s.hata ? 'var(--danger)' : 'var(--success)' }}>
        {s.hata ?? s.mesaj}
      </p>
      {s.notlar?.length ? (
        <ul className="dim" style={{ margin: '4px 0 0', paddingLeft: 18 }}>
          {s.notlar.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

export function TohumEkle(
  { tur, ad, aciklama, yayindaSecimi, adetSecimi, acikKayit = 0 }:
  {
    tur: string; ad: string; aciklama: string;
    yayindaSecimi?: boolean; adetSecimi?: boolean;
    /** Bu türün geri alınabilir kayıt sayısı; sıfırsa "Yenile" gösterilmiyor. */
    acikKayit?: number;
  },
) {
  const [sonuc, gonder, bekliyor] = useActionState(tohumEkle, BOS);

  return (
    <div className="kart" style={{ padding: '14px 16px' }}>
    <form action={gonder}>
      <input type="hidden" name="tur" value={tur} />
      <h3 style={{ margin: '0 0 4px', fontSize: 'var(--t-sm)' }}>{ad}</h3>
      <p className="tiny muted" style={{ margin: '0 0 10px' }}>{aciklama}</p>

      {yayindaSecimi && (
        <label className="tiny" style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 10 }}>
          <input type="checkbox" name="yayinda" value="evet" />
          <span>
            <b>Yayında ekle.</b> İşaretlenmezse projeler yayın dışı açılır —
            ziyaretçiler görmez, panelde durur. Canlı sitede önce bunu
            işaretlemeden eklemek daha güvenli.
          </span>
        </label>
      )}

      {adetSecimi && (
        <label className="tiny" style={{ display: 'block', marginBottom: 10 }}>
          <span style={{ display: 'block', marginBottom: 4 }}>Kaç villa üretilsin?</span>
          <input type="number" name="adet" defaultValue={12} min={1} max={48}
            style={{ maxWidth: 110 }} />
        </label>
      )}

      <button className="btn btn-sm" type="submit" disabled={bekliyor}>
        {bekliyor ? 'Ekleniyor…' : <><Icon n="check" s={14} sw={2.2} /> Ekle</>}
      </button>
      <Sonuc s={sonuc} />
    </form>

    {/* "Ekle" var olanı DÜZELTMİYOR, yanına yenisini koyuyor. Üretici
        düzeltildiğinde gereken düğme bu ve aynı kartta duruyor. */}
    {acikKayit > 0 && <TohumYenile tur={tur} acikKayit={acikKayit} />}
    </div>
  );
}

/* ============================================================
   Yeniden basma.

   "Ekle" düzeltme yapmıyor: üretici düzeltildiğinde yayındaki eski
   projeler yerinde kalıyor, yenileri numarayı sürdürüp yanlarına
   ekleniyor. Bu düğme önce açık partileri geri alıyor, sonra basıyor.

   Kendi kartında değil, ilgili türün kartının içinde: aynı türün
   "ekle" ve "yenile" seçenekleri ayrı yerlerde dursaydı yanlış olanı
   seçmek kolaylaşırdı.
   ============================================================ */
export function TohumYenile(
  { tur, acikKayit }: { tur: string; acikKayit: number },
) {
  const [sonuc, gonder, bekliyor] = useActionState(tohumYenile, BOS);
  const [acik, setAcik] = useState(false);

  if (!acik) {
    return (
      <>
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => setAcik(true)}
          style={{ marginTop: 8 }}
          title={`${acikKayit} açık kaydı geri al ve yeniden bas`}>
          <Icon n="refresh" s={14} sw={2.2} /> Yenile ({acikKayit})
        </button>
        <Sonuc s={sonuc} />
      </>
    );
  }

  return (
    <form action={gonder} className="vt-karar" style={{ marginTop: 10 }}>
      <input type="hidden" name="tur" value={tur} />
      <p className="tiny" style={{ margin: 0 }}>
        Bu türün <b>{acikKayit} açık kaydı</b> geri alınacak, ardından yenisi
        basılacak. Üretici düzeltildiğinde gerekiyor: eskiler yerinde
        durduğu sürece düzeltme sitede görünmüyor.
      </p>
      <p className="tiny dim" style={{ margin: '6px 0 0' }}>
        Gerçek veri bağlanmış kayıtlar (talep gelmiş, soru
        yazılmış) korunur ve tek tek listelenir — onlar eski hâlleriyle kalır.
      </p>

      <label className="tiny" style={{ display: 'flex', gap: 6, alignItems: 'flex-start', margin: '10px 0' }}>
        <input type="checkbox" name="yayinda" value="evet" defaultChecked />
        <span><b>Yayında bas.</b> İşaretlenmezse yeni projeler yayın dışı açılır
          ve site geri alınanlar kadar boşalır.</span>
      </label>

      <label className="tiny" style={{ display: 'block', marginBottom: 10 }}>
        <span style={{ display: 'block', marginBottom: 4 }}>Kaç villa üretilsin?</span>
        <input type="number" name="adet" defaultValue={acikKayit || 12} min={1} max={48}
          style={{ maxWidth: 110 }} />
      </label>

      <label htmlFor={`yenile-${tur}`} className="tiny" style={{ display: 'block' }}>
        Onaylamak için <b>YENİLE</b> yazın
      </label>
      <input id={`yenile-${tur}`} name="onay" autoComplete="off" required
        style={{ maxWidth: 160 }} />

      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Yenileniyor…' : 'Geri al ve yeniden bas'}
        </button>
        <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
          onClick={() => setAcik(false)}>Vazgeç</button>
      </div>
      <Sonuc s={sonuc} />
    </form>
  );
}

export function TohumSil({ partiId, etiket }: { partiId: string; etiket: string }) {
  const [sonuc, gonder, bekliyor] = useActionState(tohumSil, BOS);
  const [acik, setAcik] = useState(false);

  if (!acik) {
    return (
      <>
        <button className="btn btn-quiet btn-sm" type="button" onClick={() => setAcik(true)}>
          Geri al
        </button>
        <Sonuc s={sonuc} />
      </>
    );
  }

  return (
    <form action={gonder} className="vt-karar">
      <input type="hidden" name="partiId" value={partiId} />
      <p className="tiny" style={{ margin: 0, color: 'var(--danger)' }}>
        <b>{etiket}</b> partisinin oluşturduğu kayıtlar silinecek. Araya
        gerçek veri karışmışsa (o projeye gerçek talep geldiyse,
        gerçek yorum yazıldıysa) o kayıt korunur ve sebebi listelenir.
      </p>
      <label htmlFor={`onay-${partiId}`} className="tiny" style={{ marginTop: 8, display: 'block' }}>
        Onaylamak için <b>SİL</b> yazın
      </label>
      <input id={`onay-${partiId}`} name="onay" autoComplete="off" required
        style={{ maxWidth: 140 }} />

      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-sm" type="submit" disabled={bekliyor}
          style={{ background: 'var(--danger)', color: '#fff' }}>
          {bekliyor ? 'Siliniyor…' : 'Sil'}
        </button>
        <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
          onClick={() => setAcik(false)}>Vazgeç</button>
      </div>
      <Sonuc s={sonuc} />
    </form>
  );
}
