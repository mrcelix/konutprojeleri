/**
 * Yer tutucu görseller.
 *
 * R2 bağlanana kadar boş gri kutu yerine tanınabilir bir sahne
 * gösteriliyor. Bunlar GEÇİCİ değil ama ikincil: gerçek fotoğraf
 * geldiğinde altta kalır, gelmediğinde sayfa yine de tamamlanmış
 * görünür — envanterin bir kısmında fotoğraf hep eksik olacak.
 *
 * SVG olarak yazılıyorlar çünkü tek renkli bir dolgu bile bu boyutta
 * fotoğraftan hafif; ayrıca token'lara bağlı olmadıkları için koyu
 * temada da aynı manzara kalıyor (deniz koyu temada da mavidir).
 */

export function HeroGorseli() {
  return (
    <svg viewBox="0 0 1440 520" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="hr-gok" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7ec8e3" />
          <stop offset="55%" stopColor="#bfe4ef" />
          <stop offset="100%" stopColor="#e8f4f2" />
        </linearGradient>
        <linearGradient id="hr-deniz" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f9bb5" />
          <stop offset="100%" stopColor="#0f6b86" />
        </linearGradient>
      </defs>
      <rect width="1440" height="520" fill="url(#hr-gok)" />
      <circle cx="1180" cy="94" r="46" fill="#fff3d6" opacity="0.9" />
      <path d="M0 250 L180 186 L340 236 L520 178 L700 238 L880 190 L1080 244 L1260 196 L1440 240 L1440 300 L0 300Z" fill="#9dc3cd" opacity="0.65" />
      <path d="M0 268 L200 220 L400 264 L620 214 L840 266 L1060 224 L1280 268 L1440 232 L1440 320 L0 320Z" fill="#7fb0be" opacity="0.7" />
      <rect y="300" width="1440" height="128" fill="url(#hr-deniz)" />
      <g stroke="#bfe4ef" strokeWidth="2" opacity="0.45" fill="none">
        <path d="M60 336 q26 -9 52 0 t52 0" />
        <path d="M420 356 q26 -9 52 0 t52 0" />
        <path d="M900 330 q26 -9 52 0 t52 0" />
        <path d="M1180 362 q26 -9 52 0 t52 0" />
      </g>
      <path d="M0 428 Q360 404 720 428 T1440 416 L1440 520 L0 520Z" fill="#e9dcc2" />
      <rect x="560" y="286" width="320" height="146" rx="8" fill="#fdfdfb" />
      <rect x="560" y="272" width="320" height="20" rx="6" fill="#e6e2d8" />
      <rect x="596" y="312" width="70" height="66" rx="3" fill="#cfe6ee" />
      <rect x="684" y="312" width="70" height="66" rx="3" fill="#cfe6ee" />
      <rect x="774" y="312" width="52" height="120" rx="3" fill="#dceef4" />
      <rect x="560" y="424" width="320" height="10" fill="#ded9cd" />
      <rect x="600" y="446" width="240" height="46" rx="22" fill="#39a7c4" />
      <rect x="612" y="453" width="216" height="32" rx="16" fill="#63c3da" />
      <g fill="#3f7a52">
        <path d="M470 432 q8 -60 0 -92 q16 22 32 0 q6 40 -12 92Z" />
        <path d="M980 434 q8 -52 0 -80 q16 20 30 0 q6 34 -12 80Z" />
      </g>
      <g fill="#8a6a3a">
        <rect x="484" y="410" width="7" height="26" />
        <rect x="992" y="416" width="6" height="22" />
      </g>
    </svg>
  );
}

/** Bölge kartı — sahil ve şehir için iki ayrı manzara. */
export function BolgeGorseli({ sira, tur }: { sira: number; tur: 'sahil' | 'sehir' }) {
  // Sıraya göre ton kayması: altı kart yan yana dururken hepsi aynı
  // maviyse ızgara tek bir bloğa dönüşüyor.
  const sahilTonlari = [
    ['#bfe4ef', '#8fbfcd', '#2f9bb5'],
    ['#cfe8e0', '#8fbfa8', '#3f9b86'],
    ['#d8e8f2', '#93b3cb', '#2f7f9b'],
    ['#dcefe2', '#7fae74', '#4f7a49'],
    ['#c9e6ee', '#84b8c6', '#2e94ad'],
    ['#e4eaf2', '#9aaec6', '#42708c'],
  ];
  const [gok, tepe, su] = sahilTonlari[sira % sahilTonlari.length]!;

  if (tur === 'sehir') {
    return (
      <svg viewBox="0 0 200 158" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="200" height="158" fill={gok} />
        <path d="M0 158 L0 74 L38 74 L38 44 L82 44 L82 84 L126 84 L126 54 L172 54 L172 78 L200 78 L200 158Z" fill={tepe} />
        <g fill={gok} opacity="0.55">
          <rect x="48" y="58" width="10" height="12" /><rect x="64" y="58" width="10" height="12" />
          <rect x="92" y="96" width="10" height="12" /><rect x="108" y="96" width="10" height="12" />
          <rect x="136" y="68" width="10" height="12" /><rect x="152" y="68" width="10" height="12" />
        </g>
        <rect y="140" width="200" height="18" fill={su} opacity="0.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 158" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="200" height="158" fill={gok} />
      <path d="M0 92 L48 66 L96 90 L146 62 L200 88 L200 158 L0 158Z" fill={tepe} />
      <rect y="112" width="200" height="46" fill={su} />
      <path d="M0 148 Q50 138 100 148 T200 142 L200 158 L0 158Z" fill="#e9dcc2" />
      <rect x="78" y="86" width="46" height="28" rx="3" fill="#fdfdfb" />
      <rect x="78" y="80" width="46" height="8" rx="3" fill="#e6e2d8" />
    </svg>
  );
}

/** Proje kartı — proje tipine göre manzara. */
export function KartGorseli({ tip }: { tip: string }) {
  if (tip === 'rezidans' || tip === 'konut') {
    return (
      <svg viewBox="0 0 380 212" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="380" height="212" fill="#e2eef4" />
        <circle cx="326" cy="42" r="22" fill="#d8e8f2" />
        <path d="M0 212 L0 150 L380 138 L380 212Z" fill="#9fb6c6" />
        <rect x="52" y="58" width="86" height="98" rx="4" fill="#fdfdfb" />
        <rect x="152" y="82" width="76" height="74" rx="4" fill="#f2f6f8" />
        <rect x="242" y="68" width="88" height="88" rx="4" fill="#fdfdfb" />
        <g fill="#c4d4de">
          <rect x="66" y="74" width="22" height="17" /><rect x="102" y="74" width="22" height="17" />
          <rect x="66" y="102" width="22" height="17" /><rect x="102" y="102" width="22" height="17" />
          <rect x="166" y="100" width="20" height="17" /><rect x="196" y="100" width="20" height="17" />
          <rect x="256" y="86" width="22" height="17" /><rect x="292" y="86" width="22" height="17" />
        </g>
        <path d="M14 158 q7 -32 0 -48 q12 13 21 0 q5 22 -6 48Z" fill="#6f9a63" />
      </svg>
    );
  }

  if (tip === 'mustakil') {
    return (
      <svg viewBox="0 0 380 212" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="380" height="212" fill="#dcefe2" />
        <circle cx="58" cy="34" r="20" fill="#f7f0e6" />
        <path d="M0 104 L64 72 L128 106 L200 70 L272 108 L380 78 L380 212 L0 212Z" fill="#6f9a63" />
        <path d="M0 158 Q95 146 190 158 T380 150 L380 212 L0 212Z" fill="#4f7a49" />
        <rect x="126" y="96" width="140" height="74" rx="5" fill="#fdfdfb" />
        <path d="M118 98 L196 60 L274 98Z" fill="#8a6a3a" />
        <rect x="146" y="118" width="34" height="32" rx="2" fill="#d8ece0" />
        <rect x="192" y="118" width="34" height="32" rx="2" fill="#d8ece0" />
        <rect x="150" y="180" width="96" height="18" rx="9" fill="#39a7c4" />
      </svg>
    );
  }

  // villa ve yalı
  return (
    <svg viewBox="0 0 380 212" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect width="380" height="212" fill="#bfe4ef" />
      <circle cx="322" cy="36" r="24" fill="#fff3d6" />
      <path d="M0 118 L70 92 L140 116 L216 88 L300 118 L380 96 L380 212 L0 212Z" fill="#8fbfcd" />
      <rect y="146" width="380" height="42" fill="#2f9bb5" />
      <path d="M0 186 Q95 176 190 186 T380 180 L380 212 L0 212Z" fill="#e9dcc2" />
      <rect x="120" y="96" width="150" height="70" rx="5" fill="#fdfdfb" />
      <rect x="120" y="86" width="150" height="13" rx="4" fill="#e6e2d8" />
      <rect x="138" y="114" width="36" height="34" rx="2" fill="#cfe6ee" />
      <rect x="184" y="114" width="36" height="34" rx="2" fill="#cfe6ee" />
      <rect x="230" y="114" width="26" height="52" rx="2" fill="#dceef4" />
      <rect x="140" y="176" width="110" height="22" rx="11" fill="#39a7c4" />
    </svg>
  );
}

/** İki güven bloğunun görselleri — token'lara bağlı, temayla döner. */
export function ArsivGorseli() {
  return (
    <svg viewBox="0 0 116 96" aria-hidden>
      <rect width="116" height="96" rx="10" fill="var(--brand-soft)" />
      <rect x="16" y="58" width="14" height="24" rx="2" fill="var(--brand)" opacity="0.45" />
      <rect x="38" y="46" width="14" height="36" rx="2" fill="var(--brand)" opacity="0.62" />
      <rect x="60" y="34" width="14" height="48" rx="2" fill="var(--brand)" opacity="0.8" />
      <rect x="82" y="20" width="14" height="62" rx="2" fill="var(--brand-strong)" />
      <path d="M16 52 L88 18" stroke="var(--text-primary)" strokeWidth="2" fill="none" />
      <circle cx="88" cy="18" r="4" fill="var(--eylem)" />
    </svg>
  );
}

export function KarneGorseli() {
  return (
    <svg viewBox="0 0 116 96" aria-hidden>
      <rect width="116" height="96" rx="10" fill="var(--success-bg)" />
      <rect x="20" y="22" width="76" height="54" rx="6" fill="var(--surface-card)" />
      <rect x="30" y="34" width="36" height="6" rx="3" fill="var(--success)" opacity="0.32" />
      <rect x="30" y="46" width="52" height="6" rx="3" fill="var(--success)" opacity="0.22" />
      <rect x="30" y="58" width="26" height="6" rx="3" fill="var(--success)" opacity="0.22" />
      <circle cx="86" cy="62" r="14" fill="var(--success)" />
      <path d="M79 62l5 5 9-10" stroke="var(--surface-card)" strokeWidth="2.6"
        fill="none" strokeLinecap="round" />
    </svg>
  );
}
