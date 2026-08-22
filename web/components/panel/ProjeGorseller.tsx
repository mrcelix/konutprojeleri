'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';
import {
  projeGorselAlt, projeGorselEkle, projeGorselSil, projeGorselTasi,
  projeGorselTip,
} from '@/lib/panel-eylemler';
import { ALT_EN_COK, altRaporu, MEDYA_TIPLERI } from '@/lib/alt-metin';

/* ============================================================
   Proje görseli yönetimi.

   SIRALAMA SÜRÜKLE-BIRAK DEĞİL, iki düğme. Sürükleme klavyeyle
   kullanılamıyor ve dokunmatikte sayfa kaydırmayla çakışıyor;
   düğmeler her girdi yöntemiyle çalışıyor.

   İlk sıradaki fotoğraf KAPAK: listede, arama sonucunda ve paylaşım
   görselinde o çıkıyor. Bu yüzden sırada rozetle işaretleniyor —
   yöneticinin hangi fotoğrafın nerede kullanıldığını tahmin etmesi
   gerekmesin.

   Yükleme `/api/yukleme` rota işleyicisine gidiyor, sunucu eylemine
   değil: sunucu eylemlerinin gövde sınırı 1 MB ve tek bir telefon
   fotoğrafı bunu aşıyor (bkz. docs/fotograf-yukleme.md).

   Depo yapılandırılmamışsa yükleme bloğu görünmüyor ve sebebi
   yazıyor; adres girme yolu her hâlükârda açık kalıyor.
   ============================================================ */

export interface Fotograf {
  id: string; url: string; alt: string; sira: number;
  tip: string; altOtomatik: boolean;
}

export default function ProjeGorseller(
  { projeId, fotograflar, depoEksik }:
  { projeId: string; fotograflar: Fotograf[]; depoEksik?: string | null },
) {
  const [bekliyor, basla] = useTransition();
  const yonlendirici = useRouter();
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yuklemeHata, setYuklemeHata] = useState<string[]>([]);
  const [suruklu, setSuruklu] = useState(false);

  const yukle = async (dosyalar: FileList | File[] | null) => {
    const liste = [...(dosyalar ?? [])];
    if (liste.length === 0) return;

    setYukleniyor(true);
    setYuklemeHata([]);
    try {
      const govde = new FormData();
      govde.set('projeId', projeId);
      for (const d of liste) govde.append('dosya', d);

      const y = await fetch('/api/yukleme', { method: 'POST', body: govde });
      const veri = await y.json().catch(() => ({ hata: 'Sunucu yanıtı okunamadı.' }));

      const hatalar: string[] = [
        ...(veri.hata ? [veri.hata] : []),
        ...(Array.isArray(veri.hatalar) ? veri.hatalar : []),
      ];
      setYuklemeHata(hatalar);
      // Bir kısmı geçtiyse de tazele: geçenler listede görünmeli
      if (veri.eklenen?.length) yonlendirici.refresh();
    } catch {
      setYuklemeHata(['Yükleme tamamlanamadı — bağlantıyı kontrol edin.']);
    } finally {
      setYukleniyor(false);
      if (dosyaRef.current) dosyaRef.current.value = '';
    }
  };
  const [hata, setHata] = useState<string | null>(null);
  const [yeniUrl, setYeniUrl] = useState('');
  const [yeniAlt, setYeniAlt] = useState('');
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [altTaslak, setAltTaslak] = useState('');
  const [silOnay, setSilOnay] = useState<string | null>(null);

  const cagir = (f: () => Promise<{ hata?: string }>) =>
    basla(async () => { setHata((await f()).hata ?? null); });

  const rapor = altRaporu(fotograflar);

  return (
    <section className="p-kart">
      <h2 className="h3">Fotoğraflar</h2>
      <p className="muted small" style={{ margin: '6px 0 14px' }}>
        {fotograflar.length} fotoğraf. İlk sıradaki <b>kapak</b> olarak
        kullanılıyor — listede, arama sonucunda ve paylaşım görselinde.
      </p>

      {(rapor.otomatik > 0 || rapor.kopya > 0) && (
        <p className="small" style={{
          margin: '0 0 14px', padding: '10px 12px', borderRadius: 8,
          background: 'var(--accent-100)', border: '1px solid var(--accent)',
        }}>
          {rapor.otomatik > 0 && (
            <>
              <b>
                {rapor.otomatik === 1
                  ? 'Bir fotoğrafın alt metnini makine yazdı.'
                  : `${rapor.otomatik} fotoğrafın alt metnini makine yazdı.`}
              </b>{' '}
              {rapor.otomatik === 1
                ? 'Görselde ne olduğunu yazın; şu hâliyle projenin adını tekrarlıyor.'
                : 'Hepsinde aynı cümle var; ekran okuyucu kullanan biri fotoğrafları birbirinden ayırt edemiyor.'}{' '}
            </>
          )}
          {rapor.kopya > 0 && <><b>{rapor.kopya} fotoğrafta alt metin tekrar ediyor.</b>{' '}</>}
          {!rapor.kapakHazir && <>Proje yayına alınamaz: <b>önce kapak görselinin</b> alt metnini yazın.</>}
        </p>
      )}

      {hata && (
        <p className="form-hata" role="alert" style={{ marginBottom: 12 }}>
          <Icon n="x" s={16} sw={2.4} /> {hata}
        </p>
      )}

      {fotograflar.length === 0 ? (
        <p className="muted small">
          Henüz görsel yok. Görseli olmayan proje yayına alınamıyor.
        </p>
      ) : (
        <ul className="foto-liste">
          {fotograflar.map((f, i) => (
            <li key={f.id} className="foto-satir">
              <Image src={f.url} alt={f.alt} width={104} height={74}
                style={{ borderRadius: 8, objectFit: 'cover', flex: 'none' }} />

              <div className="foto-govde">
                {i === 0 && <span className="metin-rozet">kapak</span>}
                {f.altOtomatik && (
                  <span className="metin-rozet uyari">alt metni yazılmadı</span>
                )}

                {duzenlenen === f.id ? (
                  <div className="foto-alt-duzenle">
                    <label htmlFor={`alt-${f.id}`} className="sr">Alt metni</label>
                    <input
                      id={`alt-${f.id}`} value={altTaslak} maxLength={ALT_EN_COK}
                      onChange={(e) => setAltTaslak(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setDuzenlenen(null); }}
                    />
                    <button className="btn btn-primary btn-sm" type="button" disabled={bekliyor}
                      onClick={() => cagir(async () => {
                        const s = await projeGorselAlt(f.id, altTaslak);
                        if (!s.hata) setDuzenlenen(null);
                        return s;
                      })}>
                      Kaydet
                    </button>
                    <button className="btn btn-quiet btn-sm" type="button"
                      onClick={() => setDuzenlenen(null)}>Vazgeç</button>
                  </div>
                ) : (
                  <p className="foto-alt">{f.alt}</p>
                )}

                <span className="tiny dim foto-url">{f.url}</span>

                <label className="tiny dim" style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  Tür
                  <select value={f.tip} disabled={bekliyor}
                    aria-label={`${f.alt} — fotoğraf türü`}
                    onChange={(e) => cagir(() => projeGorselTip(f.id, e.target.value))}
                    style={{ fontSize: 12, padding: '2px 6px' }}>
                    {MEDYA_TIPLERI.map(([kod, ad]) => (
                      <option key={kod} value={kod}>{ad}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="foto-eylem">
                <button className="btn btn-quiet btn-sm" type="button"
                  disabled={bekliyor || i === 0}
                  aria-label={`${f.alt} — bir sıra yukarı taşı`}
                  onClick={() => cagir(() => projeGorselTasi(f.id, 'yukari'))}>
                  <Icon n="chevU" s={14} sw={2.2} />
                </button>
                <button className="btn btn-quiet btn-sm" type="button"
                  disabled={bekliyor || i === fotograflar.length - 1}
                  aria-label={`${f.alt} — bir sıra aşağı taşı`}
                  onClick={() => cagir(() => projeGorselTasi(f.id, 'asagi'))}>
                  <Icon n="chevD" s={14} sw={2.2} />
                </button>
                <button className="btn btn-ghost btn-sm" type="button" disabled={bekliyor}
                  onClick={() => { setDuzenlenen(f.id); setAltTaslak(f.alt); }}>
                  Alt metni
                </button>
                {silOnay === f.id ? (
                  <>
                    <button className="btn btn-sm" type="button" disabled={bekliyor}
                      style={{ background: 'var(--danger)', color: '#fff' }}
                      onClick={() => cagir(async () => {
                        const s = await projeGorselSil(f.id);
                        setSilOnay(null);
                        return s;
                      })}>
                      Evet, sil
                    </button>
                    <button className="btn btn-quiet btn-sm" type="button"
                      onClick={() => setSilOnay(null)}>Vazgeç</button>
                  </>
                ) : (
                  <button className="btn btn-quiet btn-sm" type="button" disabled={bekliyor}
                    aria-label={`${f.alt} fotoğrafını sil`}
                    onClick={() => setSilOnay(f.id)}>Sil</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {depoEksik ? (
        <p className="tiny dim" style={{ marginTop: 18 }}>
          <b>Yükleme kapalı.</b> {depoEksik}
        </p>
      ) : (
        <div
          className={'foto-birak' + (suruklu ? ' uzerinde' : '')}
          onDragOver={(e) => { e.preventDefault(); setSuruklu(true); }}
          onDragLeave={() => setSuruklu(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSuruklu(false);
            void yukle(e.dataTransfer.files);
          }}
        >
          <label htmlFor="foto-dosya" className="btn btn-primary btn-sm"
            style={{ cursor: yukleniyor ? 'progress' : 'pointer' }}>
            <Icon n="plus" s={15} sw={2.2} />
            {yukleniyor ? 'Yükleniyor…' : 'Fotoğraf yükle'}
          </label>
          <input id="foto-dosya" ref={dosyaRef} type="file" multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={yukleniyor}
            className="sr"
            onChange={(e) => void yukle(e.target.files)} />
          <span className="tiny dim">
            JPEG, PNG veya WebP · en çok 12 MB · sürükleyip bırakabilirsiniz.
            Konum bilgisi (EXIF) yüklemede siliniyor.
          </span>
        </div>
      )}

      {yuklemeHata.length > 0 && (
        <ul className="form-hata" role="alert" style={{ marginTop: 10, paddingLeft: 20 }}>
          {yuklemeHata.map((h, i) => <li key={i}>{h}</li>)}
        </ul>
      )}

      <details style={{ marginTop: 18 }}>
        <summary className="tiny dim" style={{ cursor: 'pointer' }}>
          Adres girerek ekle (dış CDN)
        </summary>
      <div className="ekle-izgara" style={{ marginTop: 12 }}>
        <div className="p-alan">
          <label htmlFor="foto-url">Yeni fotoğraf adresi</label>
          <input id="foto-url" value={yeniUrl} onChange={(e) => setYeniUrl(e.target.value)}
            placeholder="https://cdn.konutprojeleri.com/kas-meltem-3.jpg"
            style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }} />
        </div>
        <div className="p-alan">
          <label htmlFor="foto-alt">Alt metni</label>
          <input id="foto-alt" value={yeniAlt} maxLength={140}
            onChange={(e) => setYeniAlt(e.target.value)}
            placeholder="Havuzdan denize bakan teras" />
          <span className="ipucu">
            Görme engelli kullanıcılar ve arama motorları için zorunlu.
          </span>
        </div>
      </div>

      <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 12 }}
        disabled={bekliyor || !yeniUrl.trim() || !yeniAlt.trim()}
        onClick={() => cagir(async () => {
          const s = await projeGorselEkle(projeId, yeniUrl, yeniAlt);
          if (!s.hata) { setYeniUrl(''); setYeniAlt(''); }
          return s;
        })}>
        <Icon n="plus" s={15} sw={2.2} /> Fotoğrafı ekle
      </button>
      </details>
    </section>
  );
}
