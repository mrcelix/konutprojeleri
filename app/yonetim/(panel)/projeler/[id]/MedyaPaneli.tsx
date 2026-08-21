'use client';

import { useActionState, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import {
  yuklemeIzni, medyaKaydet, medyaGuncelle, medyaKaldir, type MedyaDurumu,
} from './medya-eylem';

/**
 * Medya paneli.
 *
 * Yükleme üç adımda ilerliyor ve üçü de kullanıcıya görünüyor:
 * izin alınıyor → dosya doğrudan R2'ye gidiyor → kayıt yazılıyor.
 * Tek bir "yükleniyor" çubuğu göstermek, ortadaki adım başarısız
 * olduğunda hangi aşamada takılındığını gizlerdi.
 *
 * ALT METİN ZORUNLU DEĞİL AMA YAYIN İÇİN GEREKLİ: alt metni olmayan
 * görsel varyant_hazir = false kalır ve sitede gösterilmez. Kural
 * şemadan geliyor; arayüz onu saklamak yerine söylüyor.
 */

export type MedyaOgesi = {
  id: number;
  key: string;
  alt: string | null;
  sira: number;
  varyant_hazir: boolean;
};

function Dugme({ etiket, calisiyor }: { etiket: string; calisiyor?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
      {pending ? (calisiyor ?? 'Kaydediliyor…') : etiket}
    </button>
  );
}

function Satir({
  m, projeId, cdn,
}: {
  m: MedyaOgesi;
  projeId: number;
  cdn: string;
}) {
  const [durum, guncelle] = useActionState(medyaGuncelle, null as MedyaDurumu);
  const [silDurum, kaldir] = useActionState(medyaKaldir, null as MedyaDurumu);

  if (silDurum?.bilgi) return null;

  return (
    <li className="my-satir">
      {/* Ham <img>: Next/Image burada gereksiz — panelde tek boyut
          yeterli ve yükleme sonrası CDN varyantı henüz üretilmemiş
          olabilir. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${cdn}/${m.key}`} alt="" className="my-onizleme" loading="lazy" />

      <form action={guncelle} className="my-form">
        <input type="hidden" name="medyaId" value={m.id} />
        <input type="hidden" name="projeId" value={projeId} />

        <label className="dz-alan">
          <span className="eyebrow">
            Alt metin
            {!m.varyant_hazir && <i> · boşken sitede gösterilmez</i>}
          </span>
          <input
            name="alt"
            defaultValue={m.alt ?? ''}
            placeholder="Görselde ne var? Örn. deniz manzaralı teras ve havuz"
          />
        </label>

        <label className="dz-alan my-sira">
          <span className="eyebrow">Sıra</span>
          <input name="sira" type="number" defaultValue={m.sira} min={0} />
        </label>

        <Dugme etiket="Kaydet" />
      </form>

      <form action={kaldir} className="my-sil">
        <input type="hidden" name="medyaId" value={m.id} />
        <input type="hidden" name="projeId" value={projeId} />
        <Dugme etiket="Sil" calisiyor="Siliniyor…" />
      </form>

      {durum?.hata && <p className="my-hata">{durum.hata}</p>}
      {silDurum?.hata && <p className="my-hata">{silDurum.hata}</p>}
    </li>
  );
}

export function MedyaPaneli({
  projeId, medya, cdn, r2Var,
}: {
  projeId: number;
  medya: MedyaOgesi[];
  cdn: string;
  r2Var: boolean;
}) {
  const [, izinAl] = useActionState(yuklemeIzni, null as MedyaDurumu);
  const [, kaydet] = useActionState(medyaKaydet, null as MedyaDurumu);
  const [durum, setDurum] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const girdi = useRef<HTMLInputElement>(null);

  async function yukle(dosya: File) {
    setHata(null);

    try {
      setDurum('İzin alınıyor…');
      const izinForm = new FormData();
      izinForm.set('projeId', String(projeId));
      izinForm.set('tip', dosya.type);
      izinForm.set('boyut', String(dosya.size));
      const izin = await yuklemeIzni(null, izinForm);
      if (!izin?.adres || !izin.anahtar) {
        throw new Error(izin?.hata ?? 'İzin alınamadı.');
      }

      setDurum('Dosya yükleniyor…');
      const cevap = await fetch(izin.adres, {
        method: 'PUT',
        headers: { 'content-type': dosya.type },
        body: dosya,
      });
      if (!cevap.ok) {
        throw new Error(`R2 yüklemeyi reddetti (${cevap.status}).`);
      }

      setDurum('Kayıt yazılıyor…');
      const kayitForm = new FormData();
      kayitForm.set('projeId', String(projeId));
      kayitForm.set('anahtar', izin.anahtar);
      const sonuc = await medyaKaydet(null, kayitForm);
      if (sonuc?.hata) throw new Error(sonuc.hata);

      setDurum(null);
      // Sunucu bileşeni yeniden çekilsin diye sayfayı tazele.
      window.location.reload();
    } catch (e) {
      setDurum(null);
      setHata((e as Error).message);
    }
  }

  return (
    <section className="kart dz-blok">
      <h2 className="h3">Görseller</h2>

      {!r2Var ? (
        <p className="dz-not" style={{ marginTop: 0 }}>
          <b>Medya deposu henüz yapılandırılmamış.</b> Görsel yükleyebilmek için
          <code> R2_ACCOUNT_ID</code>, <code>R2_ACCESS_KEY_ID</code> ve
          <code> R2_SECRET_ACCESS_KEY</code> ortam değişkenleri tanımlanmalı.
          Yapılandırma tamamlandığında bu bölüm kendiliğinden çalışır.
        </p>
      ) : (
        <>
          <p className="dz-not" style={{ marginTop: 0 }}>
            Dosya sunucudan geçmez, doğrudan depoya yüklenir. JPEG, PNG, WebP
            veya AVIF; en fazla 25 MB. <b>Alt metni olmayan görsel sitede
            gösterilmez</b> — yükledikten sonra doldurun.
          </p>

          <div className="my-yukle">
            <input
              ref={girdi}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => {
                const d = e.target.files?.[0];
                if (d) yukle(d);
                e.target.value = '';
              }}
              hidden
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => girdi.current?.click()}
              disabled={!!durum}
            >
              {durum ?? 'Görsel yükle'}
            </button>
            {hata && <span className="my-hata">{hata}</span>}
          </div>
        </>
      )}

      {medya.length === 0 ? (
        <p className="dz-not">
          Henüz görsel yok. Görselsiz proje listede belirgin biçimde geri planda
          kalır ve villa segmentinde fotoğraf en belirleyici unsurdur.
        </p>
      ) : (
        <ul className="my-liste">
          {medya.map((m) => (
            <Satir key={m.id} m={m} projeId={projeId} cdn={cdn} />
          ))}
        </ul>
      )}

      {/* Sunucu eylemleri istemciden doğrudan çağrılıyor; bu iki gizli
          form yalnızca JavaScript kapalıyken de en azından hata mesajı
          görünmesi için duruyor. */}
      <form action={izinAl} hidden />
      <form action={kaydet} hidden />
    </section>
  );
}
