'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { DIL_ETIKET, dilYolu, turkceYol, VARSAYILAN_DIL, type Dil } from '@/lib/i18n';

/**
 * Dil değiştirici.
 *
 * Karşılığı olan sayfada AYNI sayfaya geçiyor; karşılığı yoksa o dilin
 * ana sayfasına. Kullanıcıyı her seferinde ana sayfaya atmak dil
 * değiştirmeyi işe yaramaz kılıyor, ama olmayan bir sayfaya göndermek
 * 404 demek — bu yüzden iki durum ayrı ele alınıyor.
 *
 * `diller` SUNUCUDAN geliyor (`yayindakiDiller()`): içeriği girilmemiş
 * bir dili burada göstermek, tıklayanı boş bir siteye götürürdü.
 * Liste sabit yazılsaydı, çeviri paneline girilen içerik gezinmeye
 * yansımaz; kaldırılan içerik de kırık bağlantı bırakırdı.
 */
export default function DilSecici(
  { dil, diller = ['tr', 'en'] }: { dil: Dil; diller?: Dil[] },
) {
  const yol = usePathname() ?? '/';
  const digerleri = diller.filter((d) => d !== dil);
  if (digerleri.length === 0) return null;

  /* Hedef yol Türkçe üzerinden hesaplanıyor: eşleme tek yönlü
     tanımlı (tr → diğerleri), ve iki çeviri arasında doğrudan eşleme
     tutmak diller arttıkça kombinatoryal olurdu. */
  const trKarsilik = dil === VARSAYILAN_DIL ? yol : (turkceYol(yol) ?? '/');

  return <DilMenu dil={dil} digerleri={digerleri} trKarsilik={trKarsilik} />;
}

/* ============================================================
   Açılır dil menüsü.

   Önceden yalnızca "EN" bağlantısıydı: tek karşı dil varken yeterli
   ama üçüncü dil eklenince yan yana iki rozet oluyor ve hangisinin
   AKTİF olduğu görünmüyordu. Menüde geçerli dil işaretli duruyor.

   `z-index` üst çubuğunkinden yüksek: menü aşağı doğru açılıyor ve
   altındaki yapışkan başlığın üstüne düşüyor.
   ============================================================ */
function DilMenu(
  { dil, digerleri, trKarsilik }:
  { dil: Dil; digerleri: Dil[]; trKarsilik: string },
) {
  const [acik, setAcik] = useState(false);
  const kap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const kapat = (e: MouseEvent) => {
      if (kap.current && !kap.current.contains(e.target as Node)) setAcik(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAcik(false); };
    document.addEventListener('click', kapat);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('click', kapat);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const hedefi = (d: Dil) => (d === VARSAYILAN_DIL
    ? trKarsilik
    : (dilYolu(trKarsilik, d) ?? dilYolu('/', d) ?? '/'));

  return (
    <div className="dil-kap" ref={kap}>
      <button type="button" className="dil-secici" onClick={() => setAcik((a) => !a)}
        aria-expanded={acik} aria-haspopup="menu"
        aria-label={`Dil: ${DIL_ETIKET[dil]}. Değiştirmek için açın`}>
        {dil.toLocaleUpperCase('tr')}
        <Icon n="chevD" s={12} sw={2.6} />
      </button>

      {acik && (
        <div className="dil-menu" role="menu">
          <span className="dil-menu-bas">Dil</span>
          <span className="dil-oge on" role="menuitem" aria-current="true">
            {DIL_ETIKET[dil]}
            <Icon n="check" s={14} sw={2.6} />
          </span>
          {digerleri.map((d) => (
            <Link key={d} className="dil-oge" role="menuitem" href={hedefi(d)} hrefLang={d}
              onClick={() => setAcik(false)}>
              {DIL_ETIKET[d]}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
