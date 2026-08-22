'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import {
  projeIceAktarOnizle, projeIceAktarUygula, type IceAktarSonucu,
} from '@/lib/panel-eylemler';

/* ============================================================
   Toplu içe aktarma — iki aşamalı.

   1. ÖNİZLE: dosya çözümlenir, her satırın ne olacağı gösterilir.
      Veritabanına hiçbir şey yazılmaz.
   2. UYGULA: onaylanan dosya yazılır.

   Tek adımda yazmak, yanlış sütun eşlemesiyle envanteri sessizce
   bozmanın en kısa yolu. Önizleme "kaç satır yeni, kaç satır
   güncelleme, hangi satırda ne hatası" sorusunu yazmadan yanıtlıyor.

   Dosya seçimi VE yapıştırma birlikte: küçük listeler için Excel'den
   kopyalayıp yapıştırmak dosya kaydetmekten hızlı.
   ============================================================ */

const SUTUNLAR: [string, string][] = [
  ['ad', 'Proje adı — adres bundan üretilir'],
  ['bolge', 'Bölge ADI (Ataşehir, Bornova, Çankaya…) — tanımlı olmalı'],
  ['firma', 'Geliştirici firma ADI — önceden kayıtlı olmalı'],
  ['mahalle', 'Mahalle'],
  ['enlem, boylam', 'Koordinat — "40,987654" biçimi kabul ediliyor'],
  ['fiyatMin', 'Başlangıç fiyatı — "4.250.000" veya "4250000 TL"'],
  ['ozet', 'Açıklama, en az 40 karakter'],
];

const ISTEGE_BAGLI: [string, string][] = [
  ['tip, durum', 'Boşsa KONUT / SATISTA'],
  ['fiyatMax', 'Üst fiyat — boşsa "…’den başlayan" yazılır'],
  ['pesinatOrani, taksitAyi', 'Boşsa 0 — peşinat süzgecinde çıkmaz'],
  ['krediyeUygun, takas, aidat, tapuDurumu', 'Boşsa kredi açık, takas kapalı'],
  ['blokSayisi, katSayisi, toplamBagimsizBolum', 'Boşsa yazılmıyor'],
  ['arsaM2, insaatAlaniM2, yesilAlanOrani', 'Boşsa yazılmıyor'],
  ['baslangicTarihi, teslimTarihi', '"2027Q2", "30.06.2027" ya da "2027-06-30"'],
  ['ilerlemeYuzde, adres', 'Boşsa 0 / boş'],
  ['ozellikler', 'Kodlar, dikey çizgiyle: guvenlik|kapaliotopark'],
  ['fotograflar', 'adres>alt metni, dikey çizgiyle ayrılmış'],
];

export default function ProjeIceAktar() {
  const [onizleme, onizle, onizleniyor] = useActionState<IceAktarSonucu | null, FormData>(
    projeIceAktarOnizle, null,
  );
  const [uygulama, uygula, uygulaniyor] = useActionState<IceAktarSonucu | null, FormData>(
    projeIceAktarUygula, null,
  );
  const [dosyaAdi, setDosyaAdi] = useState<string | null>(null);
  const [yardim, setYardim] = useState(false);

  /* ---------- Uygulandı: rapor ---------- */
  if (uygulama?.rapor) {
    const r = uygulama.rapor;
    return (
      <section className="p-kart">
        <h2 className="h3" style={{ color: 'var(--success)' }}>İçe aktarma tamamlandı</h2>
        <ul className="ia-rapor">
          <li><b>{r.eklenen}</b> proje eklendi</li>
          <li><b>{r.guncellenen}</b> proje güncellendi</li>
          {r.atlanan > 0 && (
            <li style={{ color: 'var(--danger)' }}>
              <b>{r.atlanan}</b> satır yazılamadı
            </li>
          )}
          {(uygulama.onizleme?.hatali ?? 0) > 0 && (
            <li style={{ color: 'var(--danger)' }}>
              <b>{uygulama.onizleme!.hatali}</b> satır hatalı olduğu için atlandı
            </li>
          )}
        </ul>
        <p className="muted small" style={{ margin: '12px 0 16px' }}>
          Eklenen projeler <b>taslak</b> olarak açıldı ve yayında değil.
          Güncellenen projelerın yayın durumuna dokunulmadı.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary btn-sm" href="/yonetim/projeler?durum=pasif">
            Taslak projelerı gör
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/yonetim/projeler/ice-aktar">
            Yeni dosya aktar
          </Link>
        </div>
      </section>
    );
  }

  const o = onizleme?.onizleme;

  return (
    <>
      <section className="p-kart">
        <h2 className="h3">Dosya</h2>
        <p className="muted small" style={{ margin: '6px 0 14px' }}>
          Excel&apos;den <b>CSV</b> olarak kaydedin. Noktalı virgül ayracı,
          ondalık virgül ve Türkçe karakterler destekleniyor —
          Excel&apos;in ürettiği dosyayı olduğu gibi yükleyebilirsiniz.
        </p>

        <form action={onizle}>
          <fieldset disabled={onizleniyor} style={{ border: 0, padding: 0, margin: 0 }}>
            <div className="p-alan">
              <label htmlFor="ia-dosya">CSV dosyası</label>
              <input id="ia-dosya" name="dosya" type="file" accept=".csv,text/csv,text/plain"
                onChange={(e) => setDosyaAdi(e.target.files?.[0]?.name ?? null)} />
              {dosyaAdi && <span className="ipucu">{dosyaAdi}</span>}
            </div>

            <div className="p-alan" style={{ marginTop: 14 }}>
              <label htmlFor="ia-csv">…veya içeriği yapıştırın</label>
              <textarea id="ia-csv" name="csv" rows={6}
                placeholder={'ad;bolge;firma;mahalle;enlem;boylam;fiyatMin;ozet\nMeltem Rezidans;Ataşehir;Örnek İnşaat;Barbaros;40,9876;29,1234;4.250.000;Metroya 400 metre…'}
                style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }} />
              <span className="ipucu">Dosya seçildiyse yapıştırılan metin yok sayılır.</span>
            </div>

            {onizleme?.hata && (
              <p className="form-hata" role="alert" style={{ marginTop: 14 }}>
                <Icon n="x" s={16} sw={2.4} /> {onizleme.hata}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" type="submit" disabled={onizleniyor}>
                {onizleniyor ? 'Çözümleniyor…' : 'Önizle'}
              </button>
              <a className="btn btn-ghost btn-lg" href="/api/proje-sablon" download>
                <Icon n="grid" s={16} /> Örnek dosyayı indir
              </a>
              <button className="btn btn-quiet btn-lg" type="button"
                onClick={() => setYardim((y) => !y)} aria-expanded={yardim}>
                Sütunlar
              </button>
            </div>
          </fieldset>
        </form>

        {yardim && (
          <div className="ia-yardim">
            <h3 className="h3" style={{ fontSize: 14 }}>Zorunlu sütunlar</h3>
            <dl>
              {SUTUNLAR.map(([k, a]) => (
                <div key={k}><dt><code>{k}</code></dt><dd>{a}</dd></div>
              ))}
            </dl>
            <h3 className="h3" style={{ fontSize: 14, marginTop: 14 }}>İsteğe bağlı</h3>
            <dl>
              {ISTEGE_BAGLI.map(([k, a]) => (
                <div key={k}><dt><code>{k}</code></dt><dd>{a}</dd></div>
              ))}
            </dl>
            <p className="tiny dim" style={{ marginTop: 12 }}>
              Sütun sırası önemli değil; başlıklardaki büyük/küçük harf ve
              Türkçe karakterler yok sayılıyor (&quot;Proje Adı&quot; = <code>ad</code>).
            </p>
          </div>
        )}
      </section>

      {/* ---------- Önizleme ---------- */}
      {o && o.sonuclar.length > 0 && (
        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">Önizleme</h2>
          <p className="muted small" style={{ margin: '6px 0 12px' }}>
            <b>{o.yeni}</b> yeni · <b>{o.guncelleme}</b> güncelleme
            {o.hatali > 0 && <> · <b style={{ color: 'var(--danger)' }}>{o.hatali} hatalı</b></>}
            . Henüz hiçbir şey kaydedilmedi.
          </p>

          {o.bilinmeyenSutunlar.length > 0 && (
            <p className="p-uyari" style={{ marginBottom: 12 }}>
              <Icon n="shield" s={16} />
              <span>
                Tanınmayan sütunlar yok sayılacak:{' '}
                {o.bilinmeyenSutunlar.map((b) => <code key={b}>{b}</code>)
                  .reduce((a, b) => <>{a}, {b}</>)}
              </span>
            </p>
          )}

          <div className="p-tablo-kap">
            <table className="p-tablo">
              <thead>
                <tr>
                  <th className="sayi">Satır</th><th>Proje</th>
                  <th>Adres</th><th>Durum</th><th>Notlar</th>
                </tr>
              </thead>
              <tbody>
                {o.sonuclar.map((r) => (
                  <tr key={r.satir}>
                    <td className="sayi tiny">{r.satir}</td>
                    <td><b style={{ fontSize: 13.4 }}>{r.ad}</b></td>
                    <td className="tiny"><code>/proje/{r.slug}</code></td>
                    <td>
                      {/* PASIF kırmızı basıyor; güncelleme hata değil */}
                      <span className={`durum durum-${
                        r.durum === 'hata' ? 'IPTAL' : r.durum === 'yeni' ? 'YAYINDA' : 'TALEP'}`}>
                        {r.durum === 'hata' ? 'Hatalı' : r.durum === 'yeni' ? 'Yeni' : 'Güncelleme'}
                      </span>
                    </td>
                    <td className="tiny sarma">
                      {r.hatalar.map((h) => (
                        <div key={h} style={{ color: 'var(--danger)' }}>{h}</div>
                      ))}
                      {r.uyarilar.map((u) => <div key={u} className="dim">{u}</div>)}
                      {!r.hatalar.length && !r.uyarilar.length && <span className="dim">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {uygulama?.hata && (
            <p className="form-hata" role="alert" style={{ marginTop: 14 }}>
              <Icon n="x" s={16} sw={2.4} /> {uygulama.hata}
            </p>
          )}

          <form action={uygula} style={{ marginTop: 18 }}>
            <input type="hidden" name="csv" value={onizleme?.csv ?? ''} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-primary btn-lg" type="submit"
                disabled={uygulaniyor || o.yeni + o.guncelleme === 0}>
                {uygulaniyor
                  ? 'Aktarılıyor…'
                  : `${o.yeni + o.guncelleme} satırı aktar`}
              </button>
              <Link className="btn btn-ghost btn-lg" href="/yonetim/projeler">Vazgeç</Link>
            </div>
            {o.hatali > 0 && (
              <p className="tiny dim" style={{ marginTop: 10 }}>
                Hatalı {o.hatali} satır atlanacak, kalanı aktarılacak. Hepsini
                aktarmak için dosyayı düzeltip yeniden önizleyin.
              </p>
            )}
          </form>
        </section>
      )}
    </>
  );
}
