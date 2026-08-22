'use client';

import Image from 'next/image';
import { useState } from 'react';
import Icon from './Icon';
import TalepFormu from './TalepFormu';
import { TLkisa, m2 } from '@/lib/bicim';
import { olayBildir } from '@/lib/iz-istemci';
import type { DaireTipi } from '@/lib/types';

/* ============================================================
   DAİRE TİPİ TABLOSU — proje sayfasının asıl içeriği.

   Ziyaretçi projeyi değil daire tipini soruyor ("3+1 var mı, kaça?")
   ve talep formu da bu tipe bağlanıyor: satış ekibi telefonu açmadan
   önce hangi tipe bakıldığını biliyor.

   TABLO, KART DEĞİL. Sekiz tipi kart olarak dizmek karşılaştırmayı
   imkânsız kılıyordu — alıcı m² ve fiyatı yan yana okumak istiyor.
   Dar ekranda tablo yatay kaydırma yerine satır düzenine geçiyor
   (bkz. `.daire-tablo` medya sorgusu).

   KAT PLANI satır içinde açılıyor. Ayrı bir sayfaya götürmek, sekiz
   tipi karşılaştıran kişiyi sekiz kez geri getiriyordu.

   FİYATSIZ TİP "Görüşmeye tabi" yazıyor. Boş hücre "fiyat yok" diye
   okunuyordu; tam kat ofis gibi tipler gerçekten görüşmeye tabi
   satılıyor ve uydurma bir rakam yazmak alıcının ilk sorusuna
   yanlış cevap vermek olurdu.
   ============================================================ */

export default function DaireTablosu({
  projeSlug, projeAd, tipler,
}: {
  projeSlug: string;
  projeAd: string;
  tipler: DaireTipi[];
}) {
  const [acikPlan, setAcikPlan] = useState<string | null>(null);

  const secilebilir = tipler
    .filter((d) => d.kalan !== 0)
    .map((d) => ({ id: d.id, ad: d.ad, brutM2: d.brutM2 }));

  /* Net m² sütunu, EN AZ BİR tipte doluysa basılıyor. Hepsi boşken
     baştan sona boş bir sütun, tabloyu okunmaz yapıyordu. */
  const netVar = tipler.some((d) => d.netM2);
  const kalanVar = tipler.some((d) => d.kalan != null);

  return (
    <section className="detay-blok" aria-label="Daire tipleri" id="daire-tipleri">
      <h2 className="h3"><Icon n="home" s={18} /> Daire tipleri ve fiyatlar</h2>

      <div className="daire-sarmal">
        <table className="daire-tablo daire-tablo-genis">
          <thead>
            <tr>
              <th scope="col">Tip</th>
              <th scope="col">Brüt</th>
              {netVar && <th scope="col">Net</th>}
              <th scope="col">Banyo</th>
              <th scope="col">Fiyat</th>
              {kalanVar && <th scope="col">Kalan</th>}
              <th scope="col"><span className="gorsel-gizli">İşlem</span></th>
            </tr>
          </thead>
          <tbody>
            {tipler.map((d) => {
              const tukendi = d.kalan === 0;
              const planAcik = acikPlan === d.id;
              return (
                <>
                  <tr key={d.id} className={tukendi ? 'tukendi' : undefined}>
                    <th scope="row">
                      <b>{d.ad}</b>
                      {d.nitelik && <span className="tiny dim"> · {d.nitelik}</span>}
                      {tukendi && <span className="badge"> Tükendi</span>}
                    </th>
                    <td>{m2(d.brutM2)}</td>
                    {netVar && <td>{d.netM2 ? m2(d.netM2) : '—'}</td>}
                    <td>{d.banyo}</td>
                    <td>
                      {d.fiyatMin
                        ? (
                          <>
                            <b>{TLkisa(d.fiyatMin)}</b>
                            {d.fiyatMax && d.fiyatMax > d.fiyatMin && (
                              <span className="dim"> – {TLkisa(d.fiyatMax)}</span>
                            )}
                          </>
                        )
                        : <span className="dim">Görüşmeye tabi</span>}
                    </td>
                    {kalanVar && (
                      <td>
                        {d.kalan == null
                          ? '—'
                          : d.kalan === 0
                            ? <span className="dim">0</span>
                            : <>{d.kalan}{d.adet ? <span className="dim"> / {d.adet}</span> : null}</>}
                      </td>
                    )}
                    <td className="daire-eylem">
                      {d.katPlani && (
                        <button
                          type="button" className="btn btn-ghost btn-sm"
                          aria-expanded={planAcik}
                          aria-controls={`plan-${d.id}`}
                          onClick={() => {
                            setAcikPlan(planAcik ? null : d.id);
                            if (!planAcik) olayBildir('kat-plani', `${projeSlug}:${d.ad}`);
                          }}
                        >
                          <Icon n="plan" s={14} /> Kat planı
                        </button>
                      )}
                      {!tukendi && (
                        <TalepFormu
                          projeSlug={projeSlug} projeAd={projeAd} niyet="BILGI"
                          daireler={secilebilir} seciliDaire={d.id}
                          dugmeSinifi="btn btn-cta btn-sm"
                          dugmeMetni="Fiyat alın"
                        />
                      )}
                    </td>
                  </tr>

                  {/* Kat planı SATIRIN ALTINDA açılıyor: ayrı bir
                      katman, tabloya dönmek için kapatma gerektiriyor
                      ve karşılaştırmayı kesiyordu. */}
                  {planAcik && d.katPlani && (
                    <tr key={`${d.id}-plan`} className="daire-plan-satir">
                      <td colSpan={netVar ? (kalanVar ? 7 : 6) : (kalanVar ? 6 : 5)}>
                        <figure id={`plan-${d.id}`} className="daire-plan">
                          <Image
                            src={d.katPlani}
                            alt={d.katPlaniAlt ?? `${projeAd} ${d.ad} kat planı`}
                            width={900} height={640}
                            sizes="(max-width: 900px) 100vw, 720px"
                            style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
                          />
                          <figcaption className="tiny dim">
                            {d.ad} · {m2(d.brutM2)} brüt
                            {d.netM2 ? ` · ${m2(d.netM2)} net` : ''}
                            {' — '}Çizim temsilidir, uygulamada farklılık gösterebilir.
                          </figcaption>
                        </figure>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="tiny dim">
        Fiyatlar kat, cephe ve ödeme planına göre değişiyor; listedeki değerler
        başlangıç fiyatlarıdır. Güncel liste için satış ekibinden fiyat isteyin.
      </p>

      <TalepFormu
        projeSlug={projeSlug} projeAd={projeAd} niyet="FIYAT_LISTESI"
        daireler={secilebilir}
        dugmeSinifi="btn btn-ghost"
        dugmeMetni="Tüm tiplerin fiyat listesini isteyin"
      />
    </section>
  );
}
