'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/Icon';

/* Sunucuya gitmeden ÖNCE küçültme sınırı. Sunucusuz platformlarda
   (Vercel) istek gövdesi 4,5 MB ile sınırlı ve telefon fotoğrafı
   rahatça 8–12 MB oluyor; sınırı aşan istek uygulamaya hiç
   ulaşmadan reddediliyor, yani bizim güzel hata mesajımız da
   çalışmıyor — kullanıcı yalnızca "Yükleme başarısız" görüyor.

   Tarayıcıda 2400 piksele indirmek hem sınırın altına iniyor hem de
   yüklemeyi hızlandırıyor. Sunucu yine de kendi işlemesini yapıyor
   (WebP'e çevirme, ölçü doğrulama); buradaki küçültme onun yerine
   geçmiyor, önüne geçiyor. */
const HEDEF_GENISLIK = 2400;
const KUCULT_ESIGI = 3 * 1024 * 1024;

async function kucult(dosya: File): Promise<File> {
  if (dosya.size <= KUCULT_ESIGI) return dosya;
  try {
    const kaynak = await createImageBitmap(dosya);
    const oran = Math.min(1, HEDEF_GENISLIK / kaynak.width);
    // Zaten hedeften darsa yeniden kodlamak KALİTE KAYBI: dokunma.
    if (oran === 1 && dosya.size <= KUCULT_ESIGI * 2) return dosya;

    const g = Math.round(kaynak.width * oran);
    const y = Math.round(kaynak.height * oran);
    const tuval = document.createElement('canvas');
    tuval.width = g; tuval.height = y;
    const ctx = tuval.getContext('2d');
    if (!ctx) return dosya;
    ctx.drawImage(kaynak, 0, 0, g, y);
    kaynak.close?.();

    const blob = await new Promise<Blob | null>((res) => {
      tuval.toBlob(res, 'image/jpeg', 0.88);
    });
    if (!blob || blob.size >= dosya.size) return dosya;
    return new File([blob], dosya.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    // Küçültme başarısızsa özgün dosya gönderiliyor; sunucu yine
    // kendi sınırlarını uyguluyor.
    return dosya;
  }
}

/* ============================================================
   Hero görselini BİLGİSAYARDAN yükleme.

   Panel şimdiye kadar yalnızca adres (URL) kabul ediyordu: yönetici
   fotoğrafı önce bir yere yükleyip adresini kopyalamak zorundaydı.

   Yükleme sunucu eylemiyle değil `/api/yukleme/hero` ile: sunucu
   eylemlerinin gövde sınırı 1 MB ve hero görseli büyük olmak
   zorunda — bant ilk ekranın tamamını kaplıyor.

   Alt metin dosyalarla BİRLİKTE soruluyor: yükledikten sonra
   istenirse boş geçiliyor ve hero'nun alt metni hiç yazılmıyordu.
   ============================================================ */

export default function HeroYukle() {
  const router = useRouter();
  const dosyaAlani = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState('');
  const [etiket, setEtiket] = useState('');
  const [secilen, setSecilen] = useState<File[]>([]);
  const [bekliyor, setBekliyor] = useState(false);
  const [durum, setDurum] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [tamam, setTamam] = useState<number | null>(null);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null); setTamam(null);
    if (secilen.length === 0) { setHata('Dosya seçin.'); return; }
    if (alt.trim().length < 10) { setHata('Alt metin en az 10 karakter olmalı.'); return; }

    setBekliyor(true);
    setDurum('Görseller hazırlanıyor…');
    const form = new FormData();
    for (const d of secilen) form.append('dosya', await kucult(d));
    form.append('alt', alt.trim());
    if (etiket.trim()) form.append('etiket', etiket.trim());

    setDurum('Yükleniyor…');
    try {
      const y = await fetch('/api/yukleme/hero', { method: 'POST', body: form });
      const v = await y.json().catch(() => null);
      if (!y.ok) {
        /* DOSYA BAŞINA sebepler `hatalar` dizisinde geliyor ve tek
           dosya da elenmiş olsa yanıt 400 dönüyor. Önceki sürüm
           yalnızca `hata` alanına bakıyordu; asıl sebep ("hero için
           dar", "depoya yazılamadı") ekrana hiç çıkmadan
           "Yükleme başarısız (HTTP 400)" yazıyordu.

           Gövde JSON değilse hata bizden gelmiyor: platform isteği
           uygulamaya ulaşmadan reddetmiş (çoğunlukla 413 — gövde
           sınırı). */
        const dosyaHatalari: string[] = Array.isArray(v?.hatalar) ? v.hatalar : [];
        setHata(dosyaHatalari.length
          ? dosyaHatalari.join(' · ')
          : v?.hata ?? (y.status === 413
            ? 'Dosya sunucu sınırını aştı (413). Daha küçük bir görsel deneyin.'
            : `Yükleme başarısız (HTTP ${y.status}).`));
        return;
      }
      const hatalar: string[] = v.hatalar ?? [];
      setTamam(v.eklenen?.length ?? 0);
      if (hatalar.length) setHata(hatalar.join(' · '));
      setSecilen([]); setAlt(''); setEtiket('');
      if (dosyaAlani.current) dosyaAlani.current.value = '';
      // Liste sunucuda üretiliyor; yükleme sonrası tazelenmeli
      router.refresh();
    } catch {
      setHata('Bağlantı kurulamadı.');
    } finally {
      setBekliyor(false);
      setDurum('');
    }
  }

  return (
    <form onSubmit={gonder} className="p-form">
      <label className="hero-birak">
        <input ref={dosyaAlani} type="file" accept="image/jpeg,image/png,image/webp"
          multiple onChange={(e) => setSecilen(Array.from(e.target.files ?? []))} />
        <span>
          <Icon n="cam" s={22} />
          <b>Bilgisayardan görsel seçin</b>
          <em>JPEG, PNG ya da WebP · en az 1600 piksel genişlik · büyük dosyalar tarayıcıda küçültülür</em>
        </span>
      </label>

      {secilen.length > 0 && (
        <ul className="hero-secilen">
          {secilen.map((d) => (
            <li key={d.name}>
              <Icon n="check" s={13} sw={2.4} /> {d.name}
              <span className="dim"> · {(d.size / 1048576).toFixed(1)} MB</span>
            </li>
          ))}
        </ul>
      )}

      <label style={{ display: 'block', marginTop: 10 }}>
        <span className="tiny">Alt metin <em style={{ color: 'var(--danger)' }}>*</em></span>
        <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200}
          placeholder="Deniz manzaralı, özel havuzlu bir villanın havuz başı" />
        <span className="tiny dim">
          Fotoğrafta ne olduğunu anlatın; hero sayfanın en büyük görseli.
          Birden çok dosya seçtiyseniz hepsine aynı metin yazılır, sonra tek tek
          düzenleyebilirsiniz.
        </span>
      </label>

      <label style={{ display: 'block', marginTop: 10 }}>
        <span className="tiny">Etiket <span className="dim">(isteğe bağlı)</span></span>
        <input value={etiket} onChange={(e) => setEtiket(e.target.value)} maxLength={60}
          placeholder="Kaş · Çukurbağ" />
      </label>

      {hata && <p className="form-hata" role="alert" style={{ marginTop: 10 }}>{hata}</p>}
      {tamam !== null && tamam > 0 && (
        <p className="tiny" style={{ color: 'var(--success)', margin: '10px 0 0' }} role="status">
          <Icon n="check" s={14} sw={2.4} /> {tamam} görsel yüklendi ve listeye eklendi.
        </p>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={bekliyor}>
          {bekliyor ? (durum || 'Yükleniyor…') : 'Yükle'}
        </button>
      </div>
    </form>
  );
}
