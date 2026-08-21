/**
 * Fotoğraf yer tutucuları.
 *
 * SABİT RENK YOK. Önceki sürüm elle çizilmiş manzaralardı — bebek
 * mavisi gökyüzü, nane yeşili tepe, kum beji sahil; 69 adet sabit
 * renk kodu. Tasarım sistemi doğru uygulandığı halde sayfa pastel
 * görünüyordu, çünkü bu görseller sayfanın en büyük yüzeyini
 * kaplıyor: hero'nun tamamı, her proje kartı, her bölge kartı, her
 * süreç adımı. Tema tokenlardan geliyordu, GÖRSELLER GELMİYORDU.
 *
 * Şimdi hepsi `var(--...)` üzerinden çiziliyor. Yer tutucu bir
 * fotoğrafı TAKLİT ETMİYOR: nötr bir yüzey ve ince çizgili bir
 * yapı işareti. "Fotoğraf henüz yok" demek, kötü bir fotoğraf
 * uydurmaktan iyidir.
 *
 * Gerçek fotoğraf geldiğinde bunlar altta kalır; envanterin bir
 * kısmında fotoğraf her zaman eksik olacak.
 */

/**
 * Hero zemini.
 *
 * Fotoğraf yokken sistemin kendi `--hero-grad` lacivert degradesi
 * kullanılıyor: `.hero-canvas::after` perdesi ve `.hero-body`nin
 * beyaz metni bu zemin için tasarlanmış. Açık bir yer tutucu
 * koymak başlığı okunmaz yapardı.
 */
export function HeroGorseli() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute', inset: 0,
        background: 'var(--hero-grad)',
      }}
    >
      {/* Silüet: ölçeği belli etsin diye, tek renk ve çok düşük
          opaklıkta. Perdenin altında kaldığı için dokudan öteye
          geçmiyor. */}
      <svg
        viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <g fill="var(--primary)" opacity="0.16">
          <rect x="90" y="300" width="150" height="220" rx="6" />
          <rect x="270" y="358" width="118" height="162" rx="6" />
          <rect x="418" y="268" width="164" height="252" rx="6" />
          <rect x="612" y="342" width="132" height="178" rx="6" />
          <rect x="774" y="286" width="152" height="234" rx="6" />
          <rect x="956" y="352" width="122" height="168" rx="6" />
          <rect x="1108" y="310" width="158" height="210" rx="6" />
        </g>
        <g fill="var(--hero-vurgu)" opacity="0.2">
          <rect x="120" y="332" width="26" height="20" rx="3" />
          <rect x="184" y="332" width="26" height="20" rx="3" />
          <rect x="452" y="302" width="26" height="20" rx="3" />
          <rect x="516" y="302" width="26" height="20" rx="3" />
          <rect x="808" y="320" width="26" height="20" rx="3" />
          <rect x="872" y="320" width="26" height="20" rx="3" />
          <rect x="1142" y="344" width="26" height="20" rx="3" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Kart ve bölge yer tutucusu.
 *
 * Tek bileşen, üç işaret. Nötr yüzey + ince çizgi; kartın kendi
 * `aspect-ratio`suna oturuyor.
 */
function YerTutucu({ isaret }: { isaret: 'konut' | 'villa' | 'ofis' }) {
  const cizimler = {
    // Çok katlı blok
    konut: (
      <>
        <path d="M22 78V30h26v48M48 78V42h22v36" />
        <path d="M29 40h5M39 40h5M29 52h5M39 52h5M29 64h5M39 64h5" />
        <path d="M55 52h5M64 52h5M55 64h5M64 64h5" />
      </>
    ),
    // Tek katlı ev + havuz
    villa: (
      <>
        <path d="M20 50 46 30l26 20" />
        <path d="M27 47v31h38V47" />
        <path d="M38 78V60h12v18" />
        <path d="M16 84h60" />
      </>
    ),
    // Ofis bloğu
    ofis: (
      <>
        <path d="M26 78V26h40v52" />
        <path d="M34 34h8M50 34h8M34 46h8M50 46h8M34 58h8M50 58h8" />
        <path d="M42 78V68h8v10" />
      </>
    ),
  }[isaret];

  return (
    <svg
      viewBox="0 0 92 92" preserveAspectRatio="xMidYMid slice" aria-hidden
      style={{
        width: '100%', height: '100%', display: 'block',
        background: 'var(--surface-2)',
      }}
    >
      <g
        fill="none" stroke="var(--ink-3)" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.42"
      >
        {cizimler}
      </g>
    </svg>
  );
}

/** Bölge kartı. */
export function BolgeGorseli({ tur }: { sira: number; tur: 'sahil' | 'sehir' }) {
  return <YerTutucu isaret={tur === 'sahil' ? 'villa' : 'konut'} />;
}

/** Proje kartı — proje tipine göre işaret. */
export function KartGorseli({ tip }: { tip: string }) {
  const isaret =
    tip === 'ofis' ? 'ofis'
      : tip === 'rezidans' || tip === 'konut' ? 'konut'
        : 'villa';
  return <YerTutucu isaret={isaret} />;
}
