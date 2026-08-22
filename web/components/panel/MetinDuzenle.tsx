'use client';

import { useActionState, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { metinKaydet, type IcerikSonucu } from '@/lib/panel-eylemler';
import type { MetinTipi } from '@/lib/metin-kayit';

/* ============================================================
   Tek bir metnin satır içi düzenleyicisi.

   Her metin AYRI form: tek "kaydet" düğmesiyle 49 alanı birden
   göndermek, bir alandaki hatanın hepsini bloke etmesi demek.
   Ayrı formlar aynı zamanda "hangi metni değiştirdim" sorusunu
   denetim kaydında da net tutuyor.

   Alan varsayılandan farklıysa rozet çıkıyor; "varsayılana dön"
   satırı silip kod içindeki metne geri dönüyor.
   ============================================================ */

export interface MetinSatiri {
  anahtar: string;
  etiket: string;
  ipucu?: string;
  tip: MetinTipi;
  varsayilan: string;
  /** Veritabanındaki üzerine yazma; yoksa varsayılan geçerli */
  deger: string | null;
}

export default function MetinDuzenle({ satir, dil }: { satir: MetinSatiri; dil: 'TR' | 'EN' }) {
  const [durum, gonder, bekliyor] = useActionState<IcerikSonucu | null, FormData>(
    metinKaydet, null,
  );
  const [deger, setDeger] = useState(satir.deger ?? satir.varsayilan);

  /* "Kaydet" yalnızca değişiklik varken açık. Karşılaştırma AÇILIŞTAKİ
     değere değil SON KAYDEDİLENE göre yapılıyor: aksi hâlde bir metni
     kaydettikten sonra aynı oturumda varsayılana döndürmek imkânsız
     oluyordu — düğme "değişiklik yok" sanıp kapalı kalıyordu. */
  const kayitli = useRef(satir.deger ?? satir.varsayilan);
  const gonderilen = useRef<string | null>(null);
  if (durum?.tamam && gonderilen.current !== null) {
    kayitli.current = gonderilen.current;
    gonderilen.current = null;
  }

  const ozel = deger !== satir.varsayilan;
  const degisti = deger !== kayitli.current;

  return (
    <form
      action={gonder} className="metin-satir"
      onSubmit={() => { gonderilen.current = deger; }}
    >
      <input type="hidden" name="anahtar" value={satir.anahtar} />
      <input type="hidden" name="dil" value={dil} />

      <div className="metin-bas">
        <label htmlFor={`m-${satir.anahtar}-${dil}`}>{satir.etiket}</label>
        {ozel && <span className="metin-rozet">düzenlendi</span>}
        <code className="metin-anahtar">{satir.anahtar}</code>
      </div>

      {satir.tip === 'paragraf' ? (
        <textarea
          id={`m-${satir.anahtar}-${dil}`} name="deger" rows={3} maxLength={1000}
          value={deger} onChange={(e) => setDeger(e.target.value)}
        />
      ) : (
        <input
          id={`m-${satir.anahtar}-${dil}`} name="deger" maxLength={200}
          value={deger} onChange={(e) => setDeger(e.target.value)}
        />
      )}

      {satir.ipucu && <span className="ipucu">{satir.ipucu}</span>}

      <div className="metin-eylem">
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor || !degisti}>
          {bekliyor ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
        {ozel && (
          <button
            className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
            onClick={() => setDeger(satir.varsayilan)}
          >
            Varsayılana dön
          </button>
        )}
        {durum?.tamam && !degisti && (
          <span className="tiny" style={{ color: 'var(--success)' }}>
            <Icon n="check" s={14} sw={2.4} /> Kaydedildi
          </span>
        )}
        {durum?.hata && (
          <span className="tiny" role="alert" style={{ color: 'var(--danger)' }}>{durum.hata}</span>
        )}
      </div>
    </form>
  );
}
