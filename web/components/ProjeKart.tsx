'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useApp } from './AppState';
import Icon from './Icon';
import ProjeOnizleme from './ProjeOnizleme';
import { olayBildir } from '@/lib/iz-istemci';
import {
  DURUM_ADI, TIP_ADI, fiyatAraligi, m2Araligi, odaAraligi, teslimCeyrek,
} from '@/lib/bicim';
import type { Proje } from '@/lib/types';

interface Props {
  p: Proje;
  sorgu?: string;
  karsilastirilabilir?: boolean;
  oncelikli?: boolean;
  onHover?: (id: string | null) => void;
  vurgulu?: boolean;
}

/* ============================================================
   Proje kartı.

   Görsel kartın KENARINA kadar gidiyor: çerçeveli görsel, kartın
   içinde ikinci bir kutu gibi duruyordu ve ızgarada hizasız
   görünüyordu.

   Görsele tıklamak önizleme katmanını açıyor. Tek yol proje sayfasına
   gitmek olsaydı, geri dönen kullanıcı listeyi ve filtreleri
   kaybederdi.

   KARTTA NE VAR, NE YOK:
   · Fiyat ARALIĞI, tek fiyat değil — projede 1+1 ile 4+1 arasında kat
     kat fark var ve tek rakam yazmak yanıltıcı.
   · Oda ve m² ARALIĞI: alıcının ikinci sorusu "hangi tipler var".
   · TESLİM ÇEYREĞİ: üçüncü soru. Gün yazmak tutulmayacak bir söz.
   · Puan/yorum YOK — bu sitede kullanıcı değerlendirmesi toplanmıyor,
     boş yıldız basmak uydurma veri olurdu.
   ============================================================ */
export default function ProjeKart({
  p, sorgu = '', karsilastirilabilir = true, oncelikli = false, onHover, vurgulu,
}: Props) {
  const { favoriler, toggleFavori, karsilastir, toggleKarsilastir } = useApp();
  const [i, setI] = useState(0);
  const [onizleme, setOnizleme] = useState<number | null>(null);

  const kareler = p.foto.slice(0, 5);
  const favori = favoriler.includes(p.id);
  const secili = karsilastir.includes(p.id);

  const oda = odaAraligi(p);
  const olcu = m2Araligi(p);
  /* TÜKENDİ ve TESLİM EDİLDİ dışındaki durumlar rozet basmıyor:
     "Satışta" her kartta yazınca hiçbir şey söylemiyor. */
  const durumRozeti = p.durum === 'SATISTA' ? null : DURUM_ADI[p.durum];
  const alinamaz = p.durum === 'TUKENDI' || p.durum === 'TESLIM_EDILDI';

  const kaydir = (d: number) => setI((k) => (k + d + kareler.length) % kareler.length);

  return (
    <article
      className={'vcard' + (vurgulu ? ' hot' : '') + (alinamaz ? ' pasif' : '')}
      data-id={p.id}
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="vcard-media">
        {/* Görsele tıklamak önizlemeyi o kareden açıyor. Buton:
            klavyeyle de erişilebilmeli. */}
        <button type="button" className="vcard-ac" onClick={() => setOnizleme(i)}
          aria-label={`${p.ad} görsellerini büyüt`}>
          <span className="slides" style={{ transform: `translateX(-${i * 100}%)` }}>
            {kareler.map((f, k) => (
              <Image
                key={f}
                src={f}
                alt={p.fotoAlt[k] ?? `${p.ad} — ${p.mahalle}, ${p.bolge} ${TIP_ADI[p.tip].toLocaleLowerCase('tr')} projesi`}
                width={800}
                height={600}
                sizes="(max-width: 620px) 100vw, (max-width: 1180px) 50vw, 25vw"
                priority={oncelikli && k === 0}
                loading={oncelikli && k === 0 ? undefined : 'lazy'}
                style={{ objectFit: 'cover' }}
              />
            ))}
          </span>
        </button>

        <div className="vcard-top">
          {p.sec && (
            <span className="badge badge-solid">
              <Icon n="spark" s={13} />{p.sec}
            </span>
          )}
          {durumRozeti && <span className="rozet-cam"><b>{durumRozeti}</b></span>}
          {!durumRozeti && p.yeni && <span className="rozet-cam"><b>Yeni</b></span>}

          <div className="vcard-ikonlar">
            {karsilastirilabilir && (
              <button
                type="button"
                className={'fav' + (secili ? ' on' : '')}
                onClick={() => { toggleKarsilastir(p.id); olayBildir('karsilastir', p.slug); }}
                aria-pressed={secili}
                aria-label={secili ? `${p.ad} karşılaştırmadan çıkar` : `${p.ad} karşılaştırmaya ekle`}
                title="Karşılaştır"
              >
                <Icon n="scale" s={16} />
              </button>
            )}
            <button
              type="button"
              className={'fav' + (favori ? ' on' : '')}
              onClick={() => { toggleFavori(p.id); olayBildir('favori', p.slug); }}
              aria-pressed={favori}
              aria-label={favori ? `${p.ad} favorilerden çıkar` : `${p.ad} favorilere ekle`}
              title="Favorilere ekle"
            >
              <Icon n="heart" s={16} />
            </button>
          </div>
        </div>

        {kareler.length > 1 && (
          <>
            <button type="button" className="gal-nav gal-prev" onClick={() => kaydir(-1)} aria-label="Önceki görsel">
              <Icon n="chevL" s={15} sw={2.2} />
            </button>
            <button type="button" className="gal-nav gal-next" onClick={() => kaydir(1)} aria-label="Sonraki görsel">
              <Icon n="chevR" s={15} sw={2.2} />
            </button>
            <div className="gal-dots" aria-hidden="true">
              {kareler.map((f, k) => <i key={f} className={k === i ? 'on' : ''} />)}
            </div>
          </>
        )}

        <button type="button" className="vcard-hizli"
          onClick={() => { setOnizleme(0); olayBildir('hizli-bakis', p.slug); }}>
          <Icon n="grid" s={14} sw={2.2} /> Hızlı bakış
        </button>
      </div>

      <Link className="vcard-body" href={`/proje/${p.slug}${sorgu}`} prefetch={false}>
        <div className="vcard-head">
          <h3 className="vcard-title">{p.ad}</h3>
          {/* Firma adı BAŞLIĞIN YANINDA: alıcının ilk sorduğu şey
              "kim yapıyor" ve kartta görünmediğinde her proje
              birbirinin aynı görünüyordu. */}
          <span className="vcard-firma">{p.firma.ad}</span>
        </div>

        <div className="vcard-loc">
          <Icon n="pin" s={13} /> {p.mahalle}, {p.bolge}
        </div>

        <div className="vcard-specs">
          {oda && <span><Icon n="home" s={13} /> {oda}</span>}
          {olcu && <span><Icon n="ruler" s={13} /> {olcu}</span>}
          {p.olcek.bagimsizBolum && (
            <span><Icon n="building" s={13} /> {p.olcek.bagimsizBolum} bölüm</span>
          )}
        </div>

        <div className="vcard-tags">
          <span className="badge"><Icon n="clock" s={11} /> {teslimCeyrek(p.teslim)}</span>
          {/* İlerleme yalnızca ANLAMLI olduğunda: %0 "başlamadı"
              demek ve rozet olarak basmak kötü haber gibi duruyor;
              lansman öncesi projede zaten beklenen durum. */}
          {p.ilerleme > 0 && (
            <span className="badge"><Icon n="crane" s={11} /> %{p.ilerleme} tamamlandı</span>
          )}
          {p.odeme.vade > 0 && (
            <span className="badge"><Icon n="percent" s={11} /> {p.odeme.vade} ay vade</span>
          )}
        </div>
      </Link>

      {/* Fiyat ve eylem satırı, gövde bağlantısının DIŞINDA: düğme
          bağlantının içinde olsaydı iç içe iki tıklanabilir öge olurdu
          (geçersiz HTML) ve ekran okuyucu ikisini tek bağlantı gibi
          okurdu. */}
      <div className="vcard-alt">
        <div className="vcard-price">
          <span className="vcard-fiyat-sol">
            <b>{fiyatAraligi(p.fiyatMin, p.fiyatMax)}</b>
          </span>
        </div>
        <Link className="btn btn-cta btn-shine btn-sm vcard-detay"
          href={`/proje/${p.slug}${sorgu}`} prefetch={false}
          onClick={() => olayBildir('proje-ac', p.slug, p.fiyatMin)}>
          Detaylı bilgi <Icon n="arrowR" s={15} />
        </Link>
      </div>

      <ProjeOnizleme
        p={p} acik={onizleme !== null} kapat={() => setOnizleme(null)}
        baslangic={onizleme ?? 0} sorgu={sorgu}
      />
    </article>
  );
}
