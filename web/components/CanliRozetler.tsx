'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

/* ============================================================
   Sosyal kanıt rozetleri.

   Sayfanın altında ortalanmış, üst üste iki küçük cam hap:
   "şu anda kaç kişi bakıyor" ve "bu hafta kaç talep geldi".

   SAYILAR GERÇEK — uydurulmuyor (gerekçe: `lib/canli.ts`). Sayı
   eşiğin altındaysa sunucu `null` dönüyor ve o rozet hiç basılmıyor;
   ikisi de yoksa bileşen hiçbir şey çizmiyor. Boş bir kutu ya da
   "0 kişi" yazan bir rozet, olmamasından kötü.

   Kapatma `sessionStorage`da: kalıcı olsaydı bir kez kapatan
   ziyaretçi aylar sonra da göremezdi, oysa bu bilgi o oturuma ait.
   ============================================================ */

interface Ozet { canli: number | null; talep: number | null }

const ANAHTAR = 'vn_kanit_kapali';

export default function CanliRozetler({
  yol, projeId, canliIlk = null, talepIlk = null,
}: {
  /** Sayının hangi sayfaya ait olduğu — sunucudaki sorgunun anahtarı */
  yol: string;
  projeId?: string;
  /** Sunucuda hesaplanmış ilk değerler: rozet boş açılıp dolmuyor */
  canliIlk?: number | null;
  talepIlk?: number | null;
}) {
  const [ozet, setOzet] = useState<Ozet>({ canli: canliIlk, talep: talepIlk });
  const [kapali, setKapali] = useState(true);
  /* Talep rozeti GECİKMELİ giriyor: iki hap aynı anda aşağıdan
     çıkınca sayfanın altında bir bildirim yığını gibi duruyor. */
  const [talepGirdi, setTalepGirdi] = useState(false);
  /* Canlı rozeti KENDİLİĞİNDEN çekiliyor. Bilgi bir kez okununca
     değerini veriyor; sayfanın altında kalıcı duran bir sayaç,
     onuncu saniyeden sonra yalnızca yer kaplıyor. Sayı tazelenmeye
     devam ediyor — rozet geri gelirse (yeni ziyaretçi) güncel
     olsun diye değil, ekranda talep rozeti kalmaya devam ettiği
     için. */
  const [canliGizli, setCanliGizli] = useState(false);

  useEffect(() => {
    try { setKapali(sessionStorage.getItem(ANAHTAR) === '1'); } catch { setKapali(false); }
  }, []);

  useEffect(() => {
    const z = setTimeout(() => setTalepGirdi(true), 3000);
    return () => clearTimeout(z);
  }, []);

  /* On saniye SAYI GELDİKTEN SONRA başlıyor: rozet sunucudan boş
     gelip sonra dolduysa, sayacın dolmasını beklemeden kapanırdı. */
  useEffect(() => {
    if (ozet.canli === null) return undefined;
    const z = setTimeout(() => setCanliGizli(true), 10_000);
    return () => clearTimeout(z);
  }, [ozet.canli]);

  /* Canlı sayı TAZELENİYOR: sayfa uzun süre açık kalıyor ve beş
     dakikalık pencere kayıyor. 30 saniye, ucun önbelleğiyle aynı. */
  useEffect(() => {
    if (kapali) return undefined;
    let iptal = false;
    const getir = async () => {
      try {
        const p = new URLSearchParams({ yol });
        if (projeId) p.set('proje', projeId);
        const c = await fetch(`/api/canli?${p}`, { cache: 'no-store' });
        if (!c.ok) return;
        const d = (await c.json()) as Ozet;
        if (!iptal) setOzet(d);
      } catch { /* sessiz: rozet süs, hata gösterecek yer değil */ }
    };
    const z = setInterval(getir, 30_000);
    /* Sunucudan ilk değer gelmediyse hemen sor. */
    if (canliIlk === null && talepIlk === null) void getir();
    return () => { iptal = true; clearInterval(z); };
  }, [yol, projeId, kapali, canliIlk, talepIlk]);

  const kapat = () => {
    setKapali(true);
    try { sessionStorage.setItem(ANAHTAR, '1'); } catch { /* özel kip */ }
  };

  const canliVar = ozet.canli !== null && !canliGizli;

  if (kapali) return null;
  if (!canliVar && ozet.talep === null) return null;

  return (
    <div className="kanit-yigin">
      {ozet.talep !== null && (
        <article className={'kanit kanit-talep' + (talepGirdi ? ' girdi' : '')}>
          <span className="kanit-halka" aria-hidden="true">
            <Icon n="flame" s={15} sw={2} />
          </span>
          <p aria-live="polite">
            Bu hafta <b>{ozet.talep} kişi</b> bu villa için talep oluşturdu
          </p>
        </article>
      )}

      {canliVar && (
        <article className="kanit kanit-canli girdi">
          <span className="kanit-nokta" aria-hidden="true" />
          <p aria-live="polite">
            Şu anda <b>{ozet.canli} kişi</b> bu sayfayı görüntülüyor
          </p>
        </article>
      )}

      {/* Kapatma YIĞININ kendisinde, rozetlerden birinde değil: talep
          rozeti eşiğin altında kalınca kapatma düğmesi de onunla
          birlikte kayboluyordu. */}
      <button type="button" className="kanit-x" onClick={kapat} aria-label="Bilgi rozetlerini kapat">
        <Icon n="x" s={13} sw={2.6} />
      </button>
    </div>
  );
}
