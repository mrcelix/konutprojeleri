'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';
import { useApp } from './AppState';
import type { IkonAdi } from '@/lib/types';

/* ============================================================
   Mobil alt panel (sekme çubuğu).

   Telefonda gezinme başlıktaki menüye sıkışmıştı: mega menü dar
   ekranda açılmıyor, kalan yol arama kutusu ve altbilgiydi.
   Uygulama benzeri bir alt çubuk, sitenin dört ana yolunu her
   ekranda parmağın doğal olarak durduğu yere getiriyor.

   YALNIZCA DAR EKRANDA: geniş ekranda başlık zaten hepsini
   gösteriyor, ikinci bir gezinme fazlalık olurdu (CSS ile
   gizleniyor, bkz. `.alt-panel`).

   Türkçe ağaçta çıkıyor: İngilizce tarafta talep ve hesap
   sayfaları yok, beş sekmenin ikisi ölü bağlantı olurdu.
   ============================================================ */

interface Sekme {
  ad: string;
  yol: string;
  ikon: IkonAdi;
  /** Bu yolla başlayan sayfalarda da sekme etkin sayılıyor */
  onek?: string;
  /** Rozet: biriktirilen favori sayısı gibi */
  sayac?: number;
  /** Ortadaki çağrı düğmesi: sitenin birincil eylemi */
  vurgu?: boolean;
}

export default function AltPanel({ dil = 'tr' }: { dil?: string }) {
  const yol = usePathname();
  const { favoriler } = useApp();

  if (dil !== 'tr') return null;

  const sekmeler: Sekme[] = [
    { ad: 'Keşfet', yol: '/', ikon: 'home' },
    { ad: 'Bölgeler', yol: '/bolgeler', ikon: 'pin', onek: '/projeler' },
    /* ORTADAKI SEKME SITENIN BIRINCIL EYLEMI: proje aramak.
       Önceden `/teklif-al` yazıyordu ama öyle bir sayfa hiç
       yazılmamıştı — dar ekranın en vurgulu düğmesi 404 veriyordu.
       Bu üründe genel bir teklif formu da yok: talep HER ZAMAN bir
       projeye bağlı ve proje sayfasındaki formdan gidiyor. Alıcının
       önce projeyi seçmesi gerekiyor, o yüzden yol arama. */
    { ad: 'Proje ara', yol: '/arama', ikon: 'search', vurgu: true },
    { ad: 'Pano', yol: '/pano', ikon: 'grid', onek: '/pano' },
    /* Favori sayısı burada rozet olarak duruyor: başlıktaki kalp
       dar ekranda gizli ve biriktirdiğini gösteren tek yer kalmıyordu. */
    { ad: 'Hesabım', yol: '/hesap', ikon: 'users', onek: '/panel', sayac: favoriler.length },
  ];

  const etkinMi = (s: Sekme) => (s.yol === '/'
    ? yol === '/'
    : yol === s.yol || yol.startsWith(`${s.yol}/`) || (!!s.onek && yol.startsWith(s.onek)));

  return (
    <nav className="alt-panel" aria-label="Mobil gezinme">
      {sekmeler.map((s) => {
        const etkin = etkinMi(s);
        return (
          <Link
            key={s.yol}
            href={s.yol}
            className={'alt-oge' + (etkin ? ' etkin' : '') + (s.vurgu ? ' vurgu' : '')}
            aria-current={etkin ? 'page' : undefined}
          >
            <span className="alt-ikon">
              <Icon n={s.ikon} s={20} sw={etkin ? 2.2 : 1.8} />
              {!!s.sayac && s.sayac > 0 && <em>{s.sayac > 9 ? '9+' : s.sayac}</em>}
            </span>
            <span className="alt-ad">{s.ad}</span>
          </Link>
        );
      })}
    </nav>
  );
}
