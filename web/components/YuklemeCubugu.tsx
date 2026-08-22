'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ============================================================
   Yükleme çubuğu.

   Başlıkla içerik arasında duran ince bir şerit. Sayfa yüklenirken
   renkli dolgu soldan sağa ilerliyor, yükleme bitince gri bir çizgi
   olarak KALIYOR — kaybolan bir çubuk, "bitti mi yoksa hâlâ mı
   yükleniyor?" sorusunu bırakıyor; kalan çizgi başlığı içerikten
   ayıran bir sınır olarak da iş görüyor.

   İlerleme UYDURULMUYOR ama gerçek yüzde de yok: tarayıcı "sayfanın
   %38'i indi" diye bir sayı vermiyor. Elde tek gerçek işaret var —
   `load` olayı. Oraya kadar olan süre YAVAŞLAYAN bir eğriyle
   dolduruluyor ve %92'yi hiç geçmiyor: dolu görünüp bekleyen bir
   çubuk, ilerlemeyen bir çubuktan daha çok yanıltıyor.

   İLK AÇILIŞ ON SANİYE SÜRÜYOR (`ILK_SURE_MS`). Sayfa daha erken
   hazır olsa bile çubuk süreyi tamamlıyor: açılış, hero'nun beş
   saniyelik sahnesiyle birlikte tek bir giriş anı olarak kurgulandı.
   Sayfa on saniyeden geç hazırlanırsa `load` beklenmeye devam
   ediyor — süre onun altına inmiyor, üstüne çıkabiliyor.

   Sayfa geçişlerinde çubuk BAĞLANTIYA TIKLANDIĞI AN başlıyor. Yeni
   yolun gelmesini beklemek, çubuğu ancak iş bittikten sonra
   gösterirdi. Bitiş: `usePathname` değişince.
   ============================================================ */

/** Asimptotik tavan: gerçek bitiş gelene kadar buranın ötesine geçilmiyor. */
const TAVAN = 92;
/** Eğrinin zaman sabiti: ilk saniyede hızlı, sonra yavaşlıyor. */
const SABIT_S = 1.6;
/* İLK AÇILIŞ 10 SANİYE. Sayfa daha erken hazır olsa da çubuk bu
   süreyi tamamlıyor: açılış, hero'nun sahnesiyle birlikte tek bir
   giriş anı olarak kurgulandı. Yalnızca ilk belge yüklemesinde
   geçerli — sayfalar arası geçişte çubuk işi bitince kapanıyor,
   yoksa her tıklama on saniyelik bir bekleme gibi görünürdü. */
const ILK_SURE_MS = 10000;
/** 10 saniyeye yayılmış eğri; 1,6'lık sabit ilk saniyelerde bitiriyordu. */
const SABIT_ILK_S = 3.4;
/** Gezinme bir yerde takılırsa çubuk sonsuza dek dolmasın. */
const EMNIYET_MS = 14000;
/** Dolgu sağ uca varsın, gri geçiş ondan sonra başlasın. */
const GRI_GECIKME_MS = 220;

export default function YuklemeCubugu() {
  const yol = usePathname();
  const [oran, setOran] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(true);
  /* Sayfa suya inene kadar dolumu CSS yürütüyor (bkz. `yuk-dol`);
     bu bayrak kalkınca animasyon kapanıyor ve genişliği JS yazıyor. */
  const [js, setJs] = useState(false);

  const cubuk = useRef<HTMLDivElement>(null);
  const kare = useRef<number | null>(null);
  const emniyet = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gri = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** İlk açılışın on saniyelik asgari süresi. */
  const asgari = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ilkYol = useRef(yol);

  const dur = useCallback(() => {
    if (kare.current !== null) { cancelAnimationFrame(kare.current); kare.current = null; }
    if (emniyet.current) { clearTimeout(emniyet.current); emniyet.current = null; }
    if (gri.current) { clearTimeout(gri.current); gri.current = null; }
    if (asgari.current) { clearTimeout(asgari.current); asgari.current = null; }
  }, []);

  const bitir = useCallback(() => {
    dur();
    setOran(100);
    gri.current = setTimeout(() => setYukleniyor(false), GRI_GECIKME_MS);
  }, [dur]);

  /** CSS'in getirdiği yerden devam etsin diye o anki dolum oranı. */
  const olculenOran = useCallback(() => {
    const k = cubuk.current;
    const d = k?.querySelector<HTMLElement>('.yuk-dolgu');
    if (!k || !d) return 8;
    const genislik = k.getBoundingClientRect().width;
    if (!genislik) return 8;
    return Math.min(TAVAN, Math.max(8, (d.getBoundingClientRect().width / genislik) * 100));
  }, []);

  const basla = useCallback((baslangic?: number, sabit: number = SABIT_S) => {
    /* Zaten dolan bir çubuk baştan başlamıyor: hızlı hızlı tıklanan
       iki bağlantı çubuğu sıfıra döndürüp geri geri gitmiş
       gösterirdi. */
    if (kare.current !== null) return;
    dur();
    setYukleniyor(true);
    /* Devralma: JS bağlandığında CSS animasyonu bir yere kadar
       doldurmuş oluyor. Sıfırdan başlamak çubuğu GERİ atardı. */
    const bas = baslangic ?? 8;
    setOran(bas);
    const t0 = performance.now();
    /* Eğrinin devamı: `bas` oranına karşılık gelen sanal zamandan
       ilerliyor, yoksa devralma anında bir sıçrama oluyordu. */
    const kayma = -sabit * Math.log(1 - Math.min(0.999, (bas - 8) / (TAVAN - 8)));
    const adim = (t: number) => {
      const gecen = (t - t0) / 1000 + kayma;
      setOran(8 + (TAVAN - 8) * (1 - Math.exp(-gecen / sabit)));
      kare.current = requestAnimationFrame(adim);
    };
    kare.current = requestAnimationFrame(adim);
    emniyet.current = setTimeout(bitir, EMNIYET_MS);
  }, [bitir, dur]);

  /* İlk yükleme: çubuk ON SANİYE dolduktan sonra griye dönüyor.
     Sayfa daha erken hazır olsa bile bekleniyor; sayfa geç
     hazırlanırsa `load` beklenmeye devam ediyor — yani süre on
     saniyenin ALTINA inmiyor, üstüne çıkabiliyor. */
  useEffect(() => {
    const devir = olculenOran();
    setJs(true);
    basla(devir, SABIT_ILK_S);

    /* `performance.now()` gezinmenin başlangıcından beri geçen süre:
       CSS animasyonu da orada başladığı için ikisi aynı saati
       kullanıyor. Bileşen geç bağlanırsa kalan süre kendiliğinden
       kısalıyor. */
    const enAzOnSaniye = () => {
      const kalan = ILK_SURE_MS - performance.now();
      if (kalan <= 0) { bitir(); return; }
      asgari.current = setTimeout(bitir, kalan);
    };

    if (document.readyState === 'complete') enAzOnSaniye();
    else window.addEventListener('load', enAzOnSaniye);

    return () => { window.removeEventListener('load', enAzOnSaniye); dur(); };
  }, [basla, bitir, dur, olculenOran]);

  /* Gezinme: tıklama anında başlıyor. */
  useEffect(() => {
    const tik = (e: MouseEvent) => {
      // Yeni sekme, indirme ve değiştirici tuşlar gezinme sayılmıyor.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      const hedef = new URL(a.href, location.href);
      if (hedef.origin !== location.origin) return;
      // Aynı adres gezinme başlatmıyor; çubuk boşuna dolardı.
      if (hedef.pathname === location.pathname && hedef.search === location.search) return;

      basla();
    };

    const geri = () => basla();
    document.addEventListener('click', tik, true);
    window.addEventListener('popstate', geri);
    return () => {
      document.removeEventListener('click', tik, true);
      window.removeEventListener('popstate', geri);
    };
  }, [basla]);

  /* Yol değişti = gezinme bitti. İlk kurulumda çalışmıyor: o durumu
     yukarıdaki `load` dinleyicisi kapatıyor. */
  useEffect(() => {
    if (yol === ilkYol.current) return;
    ilkYol.current = yol;
    bitir();
  }, [yol, bitir]);

  useEffect(() => dur, [dur]);

  return (
    <div
      ref={cubuk}
      className={'yuk-cubuk' + (yukleniyor ? ' yukleniyor' : '') + (js ? ' js' : '')}
      /* Bitince erişilebilirlik ağacından çıkıyor: kalıcı olarak
         "%100" duyuran bir ilerleme çubuğu, her sayfada tekrarlanan
         bir gürültü olurdu. */
      {...(yukleniyor
        ? {
          role: 'progressbar' as const,
          'aria-label': 'Sayfa yükleniyor',
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': Math.round(oran),
        }
        : { 'aria-hidden': true })}
    >
      <span className="yuk-dolgu" style={{ width: `${oran}%` }} />

      {/* DOLUM GEZİNME ANINDAN İTİBAREN SAYILIYOR.

          CSS animasyonu, öge boyandığı anda başlıyor — oysa o ana
          kadar da yükleme sürüyordu: HTML'in inmesi ve ilk boyama
          arasındaki süre çubuğa hiç yansımıyor, bar her seferinde
          sıfırdan başlıyordu. Negatif gecikme animasyonu "gezinme
          başladığından beri geçen süre" kadar ileri sarıyor.

          Değer `<html>` üzerindeki bir DEĞİŞKENE yazılıyor, dolgunun
          kendi `style`'ına değil: dolgunun stilini React yazıyor ve
          sunucudaki HTML ile istemcideki özellik ayrışınca hidrasyon
          uyuşmazlığı hatası veriyordu. `<html>` React'in
          karşılaştırdığı ağacın dışında.

          Betik satır içi ve ögenin HEMEN ARDINDA: ayrıştırma
          sırasında, ilk boyamadan önce çalışıyor — bu yüzden sıçrama
          görünmüyor. */}
      <script
        dangerouslySetInnerHTML={{
          __html: 'try{document.documentElement.style.setProperty("--yuk-kayma",'
            + '"-"+Math.round(performance.now())+"ms")}catch(e){}',
        }}
      />
    </div>
  );
}
