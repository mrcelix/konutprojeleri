'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from './Icon';
import ProjeKart from './ProjeKart';
import { olayBildir } from '@/lib/iz-istemci';
import { TLkisa, teslimCeyrek } from '@/lib/bicim';
import type { AramaCevabi, Siralama } from '@/lib/arama';
import type { IkonAdi, Proje, ProjeDurumu, ProjeTipi } from '@/lib/types';

/* ============================================================
   Arama sonuçları — istemci tarafı.

   FİLTRELER ADRESTE. Durum bileşende tutulsaydı sonuç sayfası
   paylaşılamaz, geri tuşu filtreleri kaybederdi ve "şu aramayı bir
   bak" diye link atmak imkânsız olurdu.

   Sonuçlar `/api/arama` üzerinden geliyor: tüm envanteri istemciye
   yollayıp orada süzmek sekiz projeyle çalışıyordu, birkaç yüzle
   hem ilk yükleme hem bellek sorun olurdu.

   Yazarken DEĞİL, 350 ms sonra sorgulanıyor. Her tuş vuruşunda
   istek atmak hem hız sınırını dolduruyor hem sonuçları titretiyordu.
   ============================================================ */

export interface FiltreSecenegi {
  k: string;
  i: IkonAdi;
  t: string;
}

const SIRALAMA: { k: Siralama; ad: string }[] = [
  { k: 'onerilen', ad: 'Önerilen' },
  { k: 'ucuz', ad: 'Fiyat: artan' },
  { k: 'pahali', ad: 'Fiyat: azalan' },
  { k: 'teslim', ad: 'Teslime en yakın' },
  { k: 'ilerleme', ad: 'İnşaatı en ilerlemiş' },
  { k: 'yeni', ad: 'Yeni eklenen' },
];

const TIPLER: { k: ProjeTipi | ''; ad: string }[] = [
  { k: '', ad: 'Tüm tipler' },
  { k: 'KONUT', ad: 'Konut' },
  { k: 'VILLA', ad: 'Villa' },
  { k: 'OFIS', ad: 'Ofis' },
];

const DURUMLAR: { k: ProjeDurumu; ad: string }[] = [
  { k: 'YAKINDA', ad: 'Yakında' },
  { k: 'SATISTA', ad: 'Satışta' },
  { k: 'SON_DAIRELER', ad: 'Son daireler' },
];

/* Oda seçenekleri SABİT LİSTE, envanterden türetilmiyor: envanter
   değiştikçe filtre çubuğunun yeniden dizilmesi, kullanıcının az önce
   tıkladığı düğmenin yer değiştirmesi demekti. */
const ODALAR = ['stüdyo', '1+1', '2+1', '3+1', '4+1', '5+1'];

const TESLIM = [
  { yil: 0, ad: 'Farketmez' },
  { yil: 1, ad: '1 yıl içinde' },
  { yil: 2, ad: '2 yıl içinde' },
  { yil: 3, ad: '3 yıl içinde' },
];

/**
 * `baslik` İNGİLİZCE AĞAÇ İÇİN: bileşenin geri kalanı Türkçe ve iki
 * dil için ayrı bir arama arayüzü yazmak, filtre mantığını ikiye
 * bölerdi. Ekran okuyucunun okuduğu tek metin başlık olduğu için
 * yalnızca o dışarıdan veriliyor.
 */
export default function SearchClient(
  { filtreler, baslik = 'Proje arama' }: { filtreler: FiltreSecenegi[]; baslik?: string },
) {
  const router = useRouter();
  const params = useSearchParams();

  const [cevap, setCevap] = useState<AramaCevabi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [gelismis, setGelismis] = useState(false);
  const sonIstek = useRef(0);

  /* Adres çubuğu TEK KAYNAK. Filtre değişimi önce adresi yazıyor,
     sorgu adresteki değerden kuruluyor — iki ayrı durum tutmak,
     geri tuşunda ikisinin ayrışmasına yol açıyordu. */
  const sorguDizesi = params.toString();

  const yaz = useCallback((degis: Record<string, string | null>) => {
    const p = new URLSearchParams(sorguDizesi);
    for (const [k, v] of Object.entries(degis)) {
      if (v === null || v === '') p.delete(k);
      else p.set(k, v);
    }
    // Filtre değişince sayfa başa dönüyor; ikinci sayfada kalmak boş sonuç verirdi
    p.delete('sayfa');
    router.replace(`/arama?${p.toString()}`, { scroll: false });
  }, [router, sorguDizesi]);

  useEffect(() => {
    const damga = Date.now();
    sonIstek.current = damga;
    setYukleniyor(true);
    setHata(null);

    const zaman = setTimeout(() => {
      fetch(`/api/arama?${sorguDizesi}`)
        .then(async (y) => {
          if (!y.ok) throw new Error((await y.json()).hata ?? 'Arama yapılamadı');
          return y.json() as Promise<AramaCevabi>;
        })
        .then((d) => {
          /* Yarış koşulu: yavaş bir istek, sonradan atılan hızlı bir
             isteğin sonucunu ezebiliyordu. Yalnızca EN SON istek
             ekrana yazıyor. */
          if (sonIstek.current !== damga) return;
          setCevap(d);
          setYukleniyor(false);
        })
        .catch((e: Error) => {
          if (sonIstek.current !== damga) return;
          setHata(e.message);
          setYukleniyor(false);
        });
    }, 350);

    return () => clearTimeout(zaman);
  }, [sorguDizesi]);

  const secili = useMemo(
    () => new Set((params.get('f') ?? '').split(',').filter(Boolean)),
    [params],
  );
  const seciliOda = useMemo(
    () => new Set((params.get('oda') ?? '').split(',').filter(Boolean)),
    [params],
  );
  const seciliDurum = useMemo(
    () => new Set((params.get('durum') ?? '').split(',').filter(Boolean)),
    [params],
  );

  const cokluAc = (ad: string, kume: Set<string>, deger: string) => {
    const yeni = new Set(kume);
    if (yeni.has(deger)) yeni.delete(deger); else yeni.add(deger);
    yaz({ [ad]: [...yeni].join(',') });
    olayBildir('filtre', `${ad}:${deger}`);
  };

  const sonuclar = cevap?.sonuclar ?? [];
  const toplam = cevap?.toplam ?? 0;
  const sayfa = Number(params.get('sayfa') ?? 1);
  const limit = cevap?.limit ?? 24;
  const sonSayfa = Math.max(1, Math.ceil(toplam / limit));

  /* Arama sonucundaki satır, kart bileşeninin beklediği `Proje`
     şekline çevriliyor. İki ayrı kart tutmak (biri arama, biri liste)
     aynı projeyi iki farklı yüzeyde tarif etmek olurdu. */
  const karta = (s: AramaCevabi['sonuclar'][number]): Proje => ({
    id: s.id, slug: s.slug, ad: s.ad, tip: s.tip, durum: s.durum,
    bolgeSlug: s.bolgeSlug, bolge: s.bolge, il: s.il, mahalle: s.mahalle,
    lat: s.lat, lng: s.lng,
    fiyatMin: s.fiyatMin, fiyatMax: s.fiyatMax ?? undefined,
    olcek: {},
    odeme: {
      pesinat: s.pesinatOrani, vade: s.taksitAyi,
      krediyeUygun: s.krediyeUygun, takas: false,
    },
    teslim: s.teslimTarihi ? String(s.teslimTarihi).slice(0, 10) : undefined,
    ilerleme: s.ilerlemeYuzde,
    ozellik: s.ozellikler as Proje['ozellik'],
    /* Daire tipleri arama sonucunda TAM GELMİYOR — yalnızca oda
       adları var. Kart oda aralığını bunlardan kuruyor; m² aralığı
       burada basılmıyor, proje sayfasında gerçek tablodan geliyor. */
    daireTipleri: s.odalar.map((oda, i) => ({
      id: `${s.id}-${i}`, ad: oda, oda, banyo: 1, brutM2: 0,
    })),
    foto: s.foto, fotoAlt: s.fotoAlt,
    ozet: s.ozet, sec: s.sec ?? '', yeni: s.yeni, oneCikan: false,
    firma: { slug: s.firmaSlug, ad: s.firmaAd, tamamlanan: 0, ozet: '' },
    yayin: '', guncelleme: '',
  });

  return (
    <div className="wrap arama-sayfa">
      {/* GÖRÜNMEZ H1: sayfa filtre çubuğuyla başlıyor ve görsel bir
          başlığa yeri yok, ama ekran okuyucu kullanan biri sayfaya
          girdiğinde "neredeyim" sorusunun cevabını başlıktan alıyor.
          Başlıksız bir sayfa, başlık listesinde hiç görünmüyor. */}
      <h1 className="sr">{baslik}</h1>

      {/* ---------- Filtre çubuğu ---------- */}
      <div className="filtre-cubuk">
        <select
          aria-label="Proje tipi"
          value={params.get('tip') ?? ''}
          onChange={(e) => yaz({ tip: e.target.value })}
        >
          {TIPLER.map((t) => <option key={t.k} value={t.k}>{t.ad}</option>)}
        </select>

        <div className="filtre-grup" role="group" aria-label="Daire tipi">
          {ODALAR.map((o) => (
            <button
              key={o} type="button"
              className={'arama-cip' + (seciliOda.has(o) ? ' on' : '')}
              aria-pressed={seciliOda.has(o)}
              onClick={() => cokluAc('oda', seciliOda, o)}
            >{o}</button>
          ))}
        </div>

        <select
          aria-label="Sıralama"
          value={params.get('sirala') ?? 'onerilen'}
          onChange={(e) => yaz({ sirala: e.target.value })}
        >
          {SIRALAMA.map((s) => <option key={s.k} value={s.k}>{s.ad}</option>)}
        </select>

        <button type="button" className="btn btn-ghost btn-sm"
          aria-expanded={gelismis} onClick={() => setGelismis((g) => !g)}>
          <Icon n="sliders" s={15} /> Gelişmiş
        </button>
      </div>

      {/* ---------- Gelişmiş filtreler ---------- */}
      {gelismis && (
        <div className="filtre-gelismis">
          <div className="filtre-alan">
            <label htmlFor="f-max">Bütçe üst sınırı</label>
            <input
              id="f-max" inputMode="numeric" placeholder="Örn. 9.000.000"
              defaultValue={params.get('maxFiyat') ?? ''}
              onBlur={(e) => yaz({ maxFiyat: e.target.value.replace(/\D/g, '') })}
            />
            {/* Üst sınır aralığın ALT ucuna bakıyor (bkz. lib/arama.ts):
                "5 milyona kadar" diyen kişi, 1+1'i 4 milyon olan bir
                projeyi görmeli. */}
            <span className="tiny dim">
              Projenin en düşük daire tipine göre süzülüyor.
            </span>
          </div>

          <div className="filtre-alan">
            <label htmlFor="f-m2">En az brüt m²</label>
            <input
              id="f-m2" inputMode="numeric" placeholder="Örn. 120"
              defaultValue={params.get('minM2') ?? ''}
              onBlur={(e) => yaz({ minM2: e.target.value.replace(/\D/g, '') })}
            />
          </div>

          <div className="filtre-alan">
            <label htmlFor="f-teslim">Teslim</label>
            <select
              id="f-teslim"
              value={params.get('teslim') ?? ''}
              onChange={(e) => yaz({ teslim: e.target.value })}
            >
              {TESLIM.map((t) => {
                if (t.yil === 0) return <option key="0" value="">{t.ad}</option>;
                const d = new Date();
                d.setUTCFullYear(d.getUTCFullYear() + t.yil);
                return (
                  <option key={t.yil} value={d.toISOString().slice(0, 10)}>{t.ad}</option>
                );
              })}
            </select>
          </div>

          <div className="filtre-alan">
            <label htmlFor="f-pesinat">En fazla peşinat</label>
            <select
              id="f-pesinat"
              value={params.get('maxPesinat') ?? ''}
              onChange={(e) => yaz({ maxPesinat: e.target.value })}
            >
              <option value="">Farketmez</option>
              <option value="20">%20 ve altı</option>
              <option value="30">%30 ve altı</option>
              <option value="40">%40 ve altı</option>
            </select>
            {/* Peşinat 0 "bilgi verilmedi" demek, "peşinatsız" değil —
                filtre onları dışarıda bırakıyor (bkz. lib/arama.ts). */}
            <span className="tiny dim">
              Peşinat bilgisi yayımlanmamış projeler bu filtrede çıkmıyor.
            </span>
          </div>

          <div className="filtre-alan">
            <label htmlFor="f-vade">En az vade</label>
            <select
              id="f-vade"
              value={params.get('minVade') ?? ''}
              onChange={(e) => yaz({ minVade: e.target.value })}
            >
              <option value="">Farketmez</option>
              <option value="12">12 ay+</option>
              <option value="24">24 ay+</option>
              <option value="48">48 ay+</option>
            </select>
          </div>

          <div className="filtre-alan">
            <span className="filtre-baslik">Satış aşaması</span>
            <div className="filtre-grup">
              {DURUMLAR.map((d) => (
                <button
                  key={d.k} type="button"
                  className={'arama-cip' + (seciliDurum.has(d.k) ? ' on' : '')}
                  aria-pressed={seciliDurum.has(d.k)}
                  onClick={() => cokluAc('durum', seciliDurum, d.k)}
                >{d.ad}</button>
              ))}
            </div>
          </div>

          <label className="onay-satir">
            <input
              type="checkbox" checked={params.get('kredi') === '1'}
              onChange={(e) => yaz({ kredi: e.target.checked ? '1' : null })}
            />
            <span>Konut kredisine uygun</span>
          </label>

          <label className="onay-satir">
            <input
              type="checkbox" checked={params.get('takas') === '1'}
              onChange={(e) => yaz({ takas: e.target.checked ? '1' : null })}
            />
            <span>Takas kabul ediyor</span>
          </label>

          {/* Özellik filtreleri: yüz sayıları API'den geliyor ve
              KULLANICI "3 sonuç" yazan bir filtreye tıklayıp boş sayfa
              görmemeli. */}
          <div className="filtre-alan filtre-alan-genis">
            <span className="filtre-baslik">Özellikler</span>
            <div className="filtre-grup">
              {filtreler.map((f) => {
                const yuz = cevap?.yuzler.find((y) => y.kod === f.k);
                const sayi = yuz?.sayi ?? 0;
                const on = secili.has(f.k);
                if (!on && sayi === 0) return null;
                return (
                  <button
                    key={f.k} type="button"
                    className={'arama-cip' + (on ? ' on' : '')}
                    aria-pressed={on}
                    onClick={() => cokluAc('f', secili, f.k)}
                  >
                    <Icon n={f.i} s={14} /> {f.t}
                    {sayi > 0 && <span className="tiny dim"> {sayi}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Sonuç özeti ---------- */}
      <div className="sonuc-bar">
        <p className="sonuc-sayi">
          {yukleniyor && !cevap
            ? 'Projeler yükleniyor…'
            : <><b>{toplam}</b> proje bulundu{cevap?.sureMs != null && ` · ${cevap.sureMs} ms`}</>}
        </p>
        {sorguDizesi && (
          <button type="button" className="btn btn-quiet btn-sm"
            onClick={() => router.replace('/arama', { scroll: false })}>
            <Icon n="x" s={14} sw={2.4} /> Filtreleri temizle
          </button>
        )}
      </div>

      {hata && <p className="form-hata" role="alert"><Icon n="x" s={16} sw={2.4} /> {hata}</p>}

      {/* ---------- Öneri ---------- */}
      {cevap?.oneri && toplam === 0 && (
        <p className="arama-oneri-satir">
          Bunu mu demek istediniz:{' '}
          <button type="button" className="link" onClick={() => yaz({ q: cevap.oneri! })}>
            {cevap.oneri}
          </button>?
        </p>
      )}

      {/* ---------- Sonuçlar ---------- */}
      {!yukleniyor && toplam === 0 && !cevap?.oneri && (
        <div className="fav-bos">
          <Icon n="search" s={30} sw={1.6} />
          <h2>Bu filtrelerle proje bulunamadı</h2>
          <p>
            Bütçe üst sınırını yükseltmeyi ya da daire tipi seçimini
            genişletmeyi deneyin.
          </p>
          <Link className="btn btn-cta" href="/bolgeler">
            Bölgelere göz atın <Icon n="arrowR" s={16} />
          </Link>
        </div>
      )}

      <div className={'grid-projeler cols-3' + (yukleniyor ? ' yukleniyor' : '')}>
        {sonuclar.map((s, i) => (
          <ProjeKart key={s.id} p={karta(s)} oncelikli={i < 2} sorgu={`?${sorguDizesi}`} />
        ))}
      </div>

      {/* ---------- Sayfalama ---------- */}
      {sonSayfa > 1 && (
        <nav className="sayfalama" aria-label="Sayfalar">
          <button type="button" className="btn btn-ghost btn-sm" disabled={sayfa <= 1}
            onClick={() => yaz({ sayfa: String(sayfa - 1) })}>
            <Icon n="chevL" s={15} /> Önceki
          </button>
          <span className="tiny dim">{sayfa} / {sonSayfa}</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={sayfa >= sonSayfa}
            onClick={() => yaz({ sayfa: String(sayfa + 1) })}>
            Sonraki <Icon n="chevR" s={15} />
          </button>
        </nav>
      )}
    </div>
  );
}
