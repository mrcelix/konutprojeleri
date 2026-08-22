'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useApp } from './AppState';
import { olayBildir } from '@/lib/iz-istemci';
import type { IkonAdi } from '@/lib/types';

/* ============================================================
   Sol alt hızlı menü (FAB).

   Sağ altta WhatsApp hattı var ama o TEK bir kanal. Ziyaretçinin
   talebe giden yolda ihtiyaç duyduğu araçlar sayfanın farklı
   yerlerine dağılmıştı: karşılaştırma listesi kart üstünde,
   favoriler başlıkta, talep formu proje sayfasında.

   Menü bir "faydalı bağlantı çekmecesi" değil, HUNİ: sırayla proje
   ara → biriktirdiklerini karşılaştır → panoyu paylaş → talep
   bırak. Sıralama bilerek bu; en üstteki madde en çok tıklanan
   olmalı diye değil, kullanıcının bulunduğu adımın bir sonrakini
   göstermeli diye.

   Sağdaki WhatsApp'ın SOLUNDA değil, karşı köşede: ikisi yan yana
   dursaydı dar ekranda üst üste binerlerdi.
   ============================================================ */

interface Madde {
  ad: string;
  alt: string;
  yol: string;
  ikon: IkonAdi;
  vurgu?: boolean;
  sayac?: number;
}

export default function HizliMenu({ dil = 'tr' }: { dil?: string }) {
  const [acik, setAcik] = useState(false);
  const kap = useRef<HTMLDivElement>(null);
  const { favoriler, karsilastir } = useApp();
  const en = dil === 'en';

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

  const maddeler: Madde[] = [
    {
      ad: en ? 'Find a development' : 'Proje ara',
      alt: en ? 'Filter by budget and rooms' : 'Bütçe ve oda sayısına göre filtrele',
      yol: en ? '/en/search' : '/arama', ikon: 'search',
    },
    {
      ad: en ? 'Compare' : 'Karşılaştır',
      alt: en ? 'Side by side' : 'Seçtiklerini yan yana gör',
      yol: en ? '/en/search' : '/arama', ikon: 'sliders', sayac: karsilastir.length,
    },
    {
      /* PANO favoriden ayrı: favori tek kişilik ve sessiz bir işaret,
         pano paylaşılıyor ve üzerinde oy veriliyor. Konut kararı tek
         kişilik olmadığı için burada vurgulu. */
      ad: en ? 'Compare board' : 'Karşılaştırma panom',
      alt: en ? 'Share and vote with family' : 'Paylaş, aileniz oylasın',
      yol: '/pano', ikon: 'grid', vurgu: true,
    },
    {
      ad: en ? 'Saved' : 'Favorilerim',
      alt: en ? 'Developments you liked' : 'Beğendiğin projeler',
      /* Artık gerçek liste sayfasına gidiyor; önce arama sayfasına
         götürüyordu ve beğenilenleri göstermiyordu. */
      yol: en ? '/en/search' : '/favoriler', ikon: 'heart', sayac: favoriler.length,
    },
    {
      ad: en ? 'Developers' : 'Geliştirici firmalar',
      alt: en ? 'Track record and projects' : 'Teslim geçmişi ve projeleri',
      yol: '/firmalar', ikon: 'building',
    },
    /* Bölge sayfaları İNGİLİZCEDE de var ama uzun kuyruk iniş
       sayfaları yalnızca Türkçe; menüde bölge hub'ına gönderiliyor. */
    {
      ad: en ? 'Districts' : 'Bölgeler',
      alt: en ? 'Where new stock is being built' : 'Yeni arzın çıktığı ilçeler',
      yol: en ? '/en/regions' : '/bolgeler', ikon: 'pin',
    },
    {
      ad: en ? 'How it works' : 'Nasıl çalışır',
      alt: en ? 'What we verify on site' : 'Yerinde neyi doğruluyoruz',
      yol: en ? '/en/how-it-works' : '/nasil-calisir', ikon: 'shield',
    },
  ];

  const bekleyen = favoriler.length + karsilastir.length;

  /* Sayfaya göre konum DEĞİŞMİYOR: hap her sayfada sağ kenarda,
     WhatsApp sekmesinin hemen üstünde. Arama sayfasında sol alt köşe
     filtre sütununun "Filtreleri temizle" düğmesiyle doluydu ve hap
     onun üstüne biniyordu; sağ kenarda böyle bir çakışma yok, o
     yüzden sayfaya özel dikey biçim kaldırıldı. */
  return (
    <div className={'hizli-menu' + (acik ? ' acik' : '')} ref={kap}>
      {acik && (
        <div className="hizli-liste" role="menu" aria-label={en ? 'Quick tools' : 'Hızlı araçlar'}>
          <div className="hizli-bas">
            <b>{en ? 'What would you like to do?' : 'Ne yapmak istersiniz?'}</b>
            <span>{en ? 'Enquiry takes two fields' : 'Talep bırakmak iki alan'}</span>
          </div>
          {maddeler.map((m) => (
            <Link key={m.ad} href={m.yol} role="menuitem"
              className={'hizli-oge' + (m.vurgu ? ' vurgu' : '')}
              onClick={() => { setAcik(false); olayBildir('filtre', `fab:${m.ad}`); }}>
              <i><Icon n={m.ikon} s={17} /></i>
              <span>
                <b>{m.ad}</b>
                <em>{m.alt}</em>
              </span>
              {!!m.sayac && m.sayac > 0 && <u>{m.sayac}</u>}
              <Icon n="chevR" s={15} sw={2.2} />
            </Link>
          ))}
        </div>
      )}

      <button type="button" className="hizli-dugme" onClick={() => setAcik((a) => !a)}
        aria-expanded={acik} aria-haspopup="menu"
        aria-label={en ? 'Quick tools' : 'Hızlı araçlar menüsü'}>
        <Icon n={acik ? 'x' : 'grid'} s={20} sw={2.2} />
        <span>{en ? 'Quick tools' : 'Hızlı işlemler'}</span>
        {/* Rozet YALNIZCA biriktirilmiş bir şey varken: menüyü açmadan
            "orada bir şeyim var" bilgisini veriyor. */}
        {!acik && bekleyen > 0 && <u>{bekleyen}</u>}
      </button>
    </div>
  );
}
