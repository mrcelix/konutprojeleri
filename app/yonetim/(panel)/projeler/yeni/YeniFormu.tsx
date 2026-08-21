'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { projeOlustur, type YeniDurum } from './eylem';
import { slugla } from '@/lib/slug';

const TIPLER = ['konut', 'villa', 'ofis', 'rezidans', 'kentsel_donusum', 'toki', 'emlak_konut'];

function Dugme() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'Oluşturuluyor…' : 'Taslak oluştur ve düzenle'}
    </button>
  );
}

export function YeniFormu({ firmalar }: { firmalar: { id: number; ad: string }[] }) {
  const [durum, eylem] = useActionState(projeOlustur, null as YeniDurum);
  const [ad, setAd] = useState('');
  const [slug, setSlug] = useState('');

  // Slug ada göre önerilir ama kilitlenmez: aynı adı taşıyan iki
  // proje olabiliyor ve adres sonradan değiştirilemez (301 borcu doğar).
  const oneri = slugla(ad);

  return (
    <form action={eylem} className="dz">
      {durum?.hata && <p className="dz-bildirim is-hata" role="alert">{durum.hata}</p>}

      <section className="kart dz-blok" style={{ maxWidth: 620 }}>
        <div className="dz-izgara">
          <label className="dz-alan dz-genis">
            <span className="eyebrow">Proje adı *</span>
            <input name="ad" required autoFocus value={ad}
              onChange={(e) => setAd(e.target.value)} />
          </label>

          <label className="dz-alan dz-genis">
            <span className="eyebrow">
              Slug <i>boş bırakılırsa addan üretilir</i>
            </span>
            <input name="slug" value={slug} placeholder={oneri}
              pattern="[a-z0-9][a-z0-9\-]*"
              onChange={(e) => setSlug(e.target.value)} />
            {oneri && !slug && (
              <span className="dz-not" style={{ marginTop: 4 }}>
                Adres: /{'{il}'}/{'{ilçe}'}/<b>{oneri}</b>
              </span>
            )}
          </label>

          <label className="dz-alan dz-genis">
            <span className="eyebrow">Firma *</span>
            <select name="firma_id" required defaultValue="">
              <option value="" disabled>Seçin</option>
              {firmalar.map((f) => (
                <option key={f.id} value={f.id}>{f.ad}</option>
              ))}
            </select>
          </label>

          <label className="dz-alan">
            <span className="eyebrow">İl * <i>istanbul</i></span>
            <input name="il" required placeholder="istanbul" />
          </label>

          <label className="dz-alan">
            <span className="eyebrow">İlçe * <i>kadikoy</i></span>
            <input name="ilce" required placeholder="kadikoy" />
          </label>

          <label className="dz-alan">
            <span className="eyebrow">Tip</span>
            <select name="tip" defaultValue="konut">
              {TIPLER.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </label>
        </div>

        <p className="dz-not">
          Proje <b>taslak</b> olarak açılır ve sitede görünmez. Fiyat, görsel
          ve teslim bilgisi düzenleyicide girilir; yayına alma ayrı bir adımdır.
          İl ve ilçe adreste geçtiği için küçük harf ve Türkçe karaktersiz
          yazılmalıdır.
        </p>
      </section>

      <div className="dz-kaydet" style={{ maxWidth: 620 }}>
        <Dugme />
      </div>
    </form>
  );
}
