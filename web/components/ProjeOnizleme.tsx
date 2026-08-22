'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import {
  DURUM_ADI, TIP_ADI, TLkisa, fiyatAraligi, teslimCeyrek,
} from '@/lib/bicim';
import type { IkonAdi, OzellikKey, Proje } from '@/lib/types';

/* ============================================================
   Proje hızlı bakış.

   Kart listeden ayrılmadan karar verdirmeye çalışıyor ama üstünde
   birkaç görsel ve beş satır bilgi taşıyabiliyor. Projeye gitmek de
   listeyi ve filtreleri kaybettiriyordu — geri gelen kullanıcı
   aramayı yeniden kuruyordu.

   Tek bir katman iki işi birden görüyor: solda büyük galeri, sağda
   künye ve DAİRE TİPİ TABLOSU. Tablo burada olmasaydı hızlı bakış
   ziyaretçinin asıl sorusunu ("hangi tipler var, kaça?") yanıtsız
   bırakıp yine proje sayfasına göndermek zorunda kalırdı.
   ============================================================ */

const OZELLIK_ADI: Partial<Record<OzellikKey, string>> = {
  guvenlik: '7/24 güvenlik', kapalisite: 'Kapalı site', akillEv: 'Akıllı ev',
  kapaliotopark: 'Kapalı otopark', sarj: 'Elektrikli şarj',
  yuzmehavuzu: 'Yüzme havuzu', kapalihavuz: 'Kapalı havuz', fitness: 'Fitness',
  sauna: 'Sauna', spa: 'SPA', cocukoyun: 'Çocuk oyun alanı', tenis: 'Tenis kortu',
  basketbol: 'Basketbol', kosuparkuru: 'Koşu parkuru', sosyaltesis: 'Sosyal tesis',
  peyzaj: 'Geniş peyzaj', manzara: 'Manzara', denizemesafe: 'Denize yakın',
  metroyakin: 'Metroya yakın', okulyakin: 'Okula yakın', avmyakin: 'AVM’ye yakın',
  hastaneyakin: 'Hastaneye yakın', merkez: 'Merkezi konum', doga: 'Doğayla iç içe',
  depremyonetmelik: '2018 yönetmeliği', yerdenisitma: 'Yerden ısıtma',
  sesyalitim: 'Ses yalıtımı', isiyalitim: 'Isı yalıtımı', jeneratör: 'Jeneratör',
  engelli: 'Engelli erişimi',
};

const OZELLIK_IKON: Partial<Record<OzellikKey, IkonAdi>> = {
  guvenlik: 'shield', kapalisite: 'kapali', akillEv: 'spark',
  kapaliotopark: 'car', sarj: 'flame', yuzmehavuzu: 'pool', kapalihavuz: 'droplet',
  fitness: 'spark', sauna: 'steam', spa: 'droplet', cocukoyun: 'baby',
  tenis: 'game', basketbol: 'game', kosuparkuru: 'agac', sosyaltesis: 'coffee',
  peyzaj: 'agac', manzara: 'manzara', denizemesafe: 'waves', metroyakin: 'pin',
  okulyakin: 'grid', avmyakin: 'magaza', hastaneyakin: 'shield', merkez: 'pin',
  doga: 'agac', depremyonetmelik: 'shield', yerdenisitma: 'flame',
  sesyalitim: 'perde', isiyalitim: 'snow', jeneratör: 'flame', engelli: 'access',
};

export default function ProjeOnizleme({
  p, acik, kapat, baslangic = 0, sorgu = '',
}: {
  p: Proje;
  acik: boolean;
  kapat: () => void;
  baslangic?: number;
  sorgu?: string;
}) {
  const [i, setI] = useState(baslangic);
  /* Portal yalnızca istemcide kurulabiliyor; sunucu render'ında
     `document` yok. */
  const [gomulu, setGomulu] = useState(false);
  useEffect(() => { setGomulu(true); }, []);
  const kareler = p.foto;

  useEffect(() => { if (acik) setI(baslangic); }, [acik, baslangic]);

  const kaydir = useCallback(
    (d: number) => setI((k) => (k + d + kareler.length) % kareler.length),
    [kareler.length],
  );

  useEffect(() => {
    if (!acik) return undefined;
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') kapat();
      if (e.key === 'ArrowLeft') kaydir(-1);
      if (e.key === 'ArrowRight') kaydir(1);
    };
    document.addEventListener('keydown', tus);
    /* Arka plan kaydırması kilitleniyor: katman açıkken tekerlek
       altındaki listeyi kaydırıyor ve kapanınca kullanıcı bambaşka
       bir yerde buluyordu kendini. */
    const eskiTasma = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tus);
      document.body.style.overflow = eskiTasma;
    };
  }, [acik, kapat, kaydir]);

  if (!acik || !gomulu) return null;

  const ozellikler = p.ozellik.filter((o) => OZELLIK_ADI[o]).slice(0, 10);

  /* Katman BODY'ye taşınıyor.

     Kart `transform` taşıyor (hover'da 2 px kalkıyor) ve
     `overflow: hidden`. Transform uygulanmış bir ata,
     `position: fixed` için KAPSAYICI BLOK oluyor: katman ekranın
     değil kartın içine konumlanıp kırpılıyordu. Portal, hiçbir
     atanın konumlandırmayı ele geçiremeyeceği tek çözüm. */
  return createPortal(
    <div className="onizleme" role="dialog" aria-modal="true" aria-label={`${p.ad} önizleme`}
      onClick={(e) => { if (e.target === e.currentTarget) kapat(); }}>
      <div className="onizleme-kutu">
        <button type="button" className="onizleme-x" onClick={kapat} aria-label="Kapat">
          <Icon n="x" s={18} sw={2.4} />
        </button>

        <div className="onizleme-galeri">
          <div className="onizleme-sahne">
            <Image
              key={kareler[i]}
              src={kareler[i]}
              alt={p.fotoAlt[i] ?? `${p.ad} — ${p.mahalle}, ${p.bolge}`}
              fill sizes="(max-width: 900px) 100vw, 60vw" style={{ objectFit: 'cover' }} priority
            />
            {kareler.length > 1 && (
              <>
                <button type="button" className="gal-nav gal-prev" onClick={() => kaydir(-1)}
                  aria-label="Önceki görsel"><Icon n="chevL" s={18} sw={2.2} /></button>
                <button type="button" className="gal-nav gal-next" onClick={() => kaydir(1)}
                  aria-label="Sonraki görsel"><Icon n="chevR" s={18} sw={2.2} /></button>
                <span className="onizleme-sayac">{i + 1} / {kareler.length}</span>
              </>
            )}
          </div>

          {/* Küçük kareler: hangi görselin nerede olduğunu ok tuşuyla
              aramak yerine doğrudan seçtiriyor. */}
          {kareler.length > 1 && (
            <div className="onizleme-serit">
              {kareler.map((f, k) => (
                <button type="button" key={f} className={'onizleme-kare' + (k === i ? ' on' : '')}
                  onClick={() => setI(k)} aria-label={`${k + 1}. görsel`}>
                  <Image src={f} alt="" width={120} height={80} sizes="120px" style={{ objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="onizleme-kunye">
          <div className="onizleme-bas">
            <div style={{ minWidth: 0 }}>
              {p.sec && <span className="badge badge-solid">{p.sec}</span>}
              <h2>{p.ad}</h2>
              <p className="vcard-loc">
                <Icon n="pin" s={14} /> {p.mahalle}, {p.bolge}
              </p>
              <p className="tiny dim">{TIP_ADI[p.tip]} projesi · {p.firma.ad}</p>
            </div>
            <span className="badge">{DURUM_ADI[p.durum]}</span>
          </div>

          <div className="vsatir-kunye">
            <span><Icon n="clock" s={15} /> {teslimCeyrek(p.teslim)}</span>
            {p.olcek.bagimsizBolum && (
              <span><Icon n="building" s={15} /> {p.olcek.bagimsizBolum} bölüm</span>
            )}
            {p.odeme.pesinat > 0 && (
              <span><Icon n="wallet" s={15} /> %{p.odeme.pesinat} peşinat</span>
            )}
            {p.odeme.vade > 0 && (
              <span><Icon n="percent" s={15} /> {p.odeme.vade} ay vade</span>
            )}
          </div>

          <p className="onizleme-ozet">{p.ozet}</p>

          {/* DAİRE TİPİ TABLOSU: ziyaretçinin asıl sorusu.
              Fiyatı girilmemiş tip "Görüşmeye tabi" yazıyor — boş
              hücre bırakmak "fiyat yok" gibi okunuyordu. */}
          {p.daireTipleri.length > 0 && (
            <div className="onizleme-olanak">
              <h3>Daire tipleri</h3>
              <table className="daire-tablo">
                <thead>
                  <tr><th>Tip</th><th>Brüt</th><th>Fiyat</th></tr>
                </thead>
                <tbody>
                  {p.daireTipleri.slice(0, 6).map((t) => (
                    <tr key={t.id} className={t.kalan === 0 ? 'tukendi' : undefined}>
                      <td>{t.ad}{t.kalan === 0 && <span className="badge"> Tükendi</span>}</td>
                      <td>{t.brutM2} m²</td>
                      <td>{t.fiyatMin ? TLkisa(t.fiyatMin) : 'Görüşmeye tabi'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ozellikler.length > 0 && (
            <div className="onizleme-olanak">
              <h3>Öne çıkanlar</h3>
              <div>
                {ozellikler.map((o) => (
                  <span key={o}><Icon n={OZELLIK_IKON[o] ?? 'check'} s={15} /> {OZELLIK_ADI[o]}</span>
                ))}
              </div>
            </div>
          )}

          <div className="onizleme-alt">
            <div className="vsatir-fiyat">
              <b>{fiyatAraligi(p.fiyatMin, p.fiyatMax)}</b>
            </div>
            <Link className="btn btn-cta btn-lg" href={`/proje/${p.slug}${sorgu}`}>
              Projeyi incele <Icon n="arrowR" s={16} />
            </Link>
          </div>
        </aside>
      </div>
    </div>,
    document.body,
  );
}
