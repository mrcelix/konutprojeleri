'use client';

import { useActionState, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { talepGonder } from '@/lib/talep-eylemler';
import { olayBildir } from '@/lib/iz-istemci';
import type { TalepSonucu } from '@/lib/talep';

/* ============================================================
   SATIŞ TALEBİ FORMU — sitenin tek dönüşüm hedefi.

   ZORUNLU ALAN İKİ TANE: ad ve telefon. Konut alıcısının büyük
   bölümü numarasını bırakıp kapatıyor; e-postayı zorunlu kılmak en
   yüksek dönüşümlü formu en çok terk edilen forma çevirirdi. Tek
   istisna katalog ve fiyat listesi — ikisi de e-postayla gidiyor ve
   orada adres zaten kendiliğinden veriliyor (sunucu da denetliyor).

   BÜTÇE VE ÖDEME ŞEKLİ KATLANMIŞ DURUYOR. Formu açar açmaz altı alan
   göstermek, iki alanla biten bir formu altı alanlık gibi
   gösteriyordu; açan kişi doldurmadan kapatıyordu. "Bütçemi
   belirteyim" bağlantısı isteyen için orada, istemeyen için yok.

   İKİ OLAY AYRI ÖLÇÜLÜYOR: `talep-basla` formu AÇAN, `talep-gonder`
   GÖNDEREN. Aradaki fark formun kendi terk edilme oranı — tek olayla
   ölçülseydi form mu yoksa sayfanın kendisi mi dönüştürmüyor
   ayrılamazdı.
   ============================================================ */

export type TalepNiyet = 'BILGI' | 'FIYAT_LISTESI' | 'KATALOG' | 'RANDEVU';

export interface DaireSecenegi {
  id: string;
  ad: string;
  brutM2: number;
}

export interface TalepFormuProps {
  projeSlug: string;
  projeAd: string;
  niyet?: TalepNiyet;
  /** Proje sayfasındaki daire tipleri — seçim satış ekibine gidiyor */
  daireler?: DaireSecenegi[];
  /** Açılışta seçili gelen daire tipi (tablodaki satırdan tıklandıysa) */
  seciliDaire?: string;
  dugmeSinifi?: string;
  dugmeMetni?: string;
}

const BASLIK: Record<TalepNiyet, string> = {
  BILGI: 'Bilgi alın',
  FIYAT_LISTESI: 'Fiyat listesi isteyin',
  KATALOG: 'Katalog isteyin',
  RANDEVU: 'Yerinde görün',
};

const DUGME: Record<TalepNiyet, string> = {
  BILGI: 'Bilgi alın',
  FIYAT_LISTESI: 'Fiyat listesi',
  KATALOG: 'Katalog isteyin',
  RANDEVU: 'Randevu alın',
};

const IKON: Record<TalepNiyet, 'phone' | 'wallet' | 'plan' | 'cal'> = {
  BILGI: 'phone', FIYAT_LISTESI: 'wallet', KATALOG: 'plan', RANDEVU: 'cal',
};

export default function TalepFormu({
  projeSlug, projeAd, niyet = 'BILGI', daireler = [], seciliDaire,
  dugmeSinifi, dugmeMetni,
}: TalepFormuProps) {
  const [acik, setAcik] = useState(false);
  const [detay, setDetay] = useState(false);
  const [durum, gonder, bekliyor] = useActionState<TalepSonucu | null, FormData>(
    talepGonder, null,
  );

  useEffect(() => {
    if (!acik) return undefined;
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') setAcik(false); };
    document.addEventListener('keydown', tus);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tus);
      document.body.style.overflow = '';
    };
  }, [acik]);

  const basarili = durum?.tamam === true;
  useEffect(() => { if (basarili) olayBildir('talep-gonder', projeSlug); }, [basarili, projeSlug]);

  /* E-posta yalnızca katalog/fiyat listesinde ZORUNLU. `required`
     istemcide de doğru işaretleniyor ki kişi göndermeden önce
     görsün — sunucuya gidip hata almak bir tur kaybettiriyor. */
  const epostaZorunlu = niyet === 'KATALOG' || niyet === 'FIYAT_LISTESI';

  const ac = () => { setAcik(true); olayBildir('talep-basla', projeSlug); };

  return (
    <>
      <button type="button" className={dugmeSinifi ?? 'btn btn-cta btn-block'} onClick={ac}>
        <Icon n={IKON[niyet]} s={16} sw={2.2} />
        {dugmeMetni ?? DUGME[niyet]}
      </button>

      {acik && typeof document !== 'undefined' && createPortal(
        <div
          className="modal open" role="dialog" aria-modal="true" aria-label={BASLIK[niyet]}
          onClick={(e) => { if (e.target === e.currentTarget) setAcik(false); }}
        >
          <div className="modal-box ara-kutu">
            <button type="button" className="ara-kapat" onClick={() => setAcik(false)} aria-label="Kapat">
              <Icon n="x" s={18} sw={2.4} />
            </button>

            {basarili ? (
              /* Başarıda form KALKIYOR: gönderilmiş bir formu ekranda
                 bırakmak, kullanıcıya "bir daha gönder" demek. */
              <div className="ara-tamam">
                <span className="ara-tik" aria-hidden="true"><Icon n="check" s={26} sw={2.6} /></span>
                <h2>Talebiniz alındı</h2>
                <p>
                  {niyet === 'RANDEVU'
                    ? 'Satış ekibi sizi arayıp uygun günü netleştirecek. Ziyaret ücretsiz, satın alma zorunluluğu yok.'
                    : 'Satış ekibi en kısa sürede sizi arayacak.'}
                </p>
                {durum?.kod && (
                  <p className="tiny">
                    Talep kodunuz: <b><code>{durum.kod}</code></b> — durumunu bu kodla sorgulayabilirsiniz.
                  </p>
                )}
                <button type="button" className="btn btn-ghost" onClick={() => setAcik(false)}>
                  Kapat
                </button>
              </div>
            ) : (
              <>
                <h2 className="ara-baslik">{BASLIK[niyet]}</h2>
                <p className="ara-alt">
                  <b>{projeAd}</b> için numaranızı bırakın; satış ekibi size dönsün.
                </p>

                <form action={gonder} className="rez-form">
                  <input type="hidden" name="proje" value={projeSlug} />
                  <input type="hidden" name="niyet" value={niyet} />
                  <fieldset disabled={bekliyor}>
                    <div className="alan-satir">
                      <div className="alan">
                        <label htmlFor="t-ad">Adınız</label>
                        <input
                          id="t-ad" name="ad" required minLength={2} maxLength={80}
                          autoComplete="name" placeholder="Ad soyad"
                          style={durum?.alan === 'ad' ? { borderColor: 'var(--danger)' } : undefined}
                        />
                      </div>
                      <div className="alan">
                        <label htmlFor="t-tel">Telefon</label>
                        <input
                          id="t-tel" name="telefon" required type="tel"
                          autoComplete="tel" inputMode="tel" placeholder="0532 111 22 33"
                          style={durum?.alan === 'telefon' ? { borderColor: 'var(--danger)' } : undefined}
                        />
                      </div>
                    </div>

                    <div className="alan">
                      <label htmlFor="t-eposta">
                        E-posta{' '}
                        <span className="dim">
                          {epostaZorunlu ? '(gönderim için gerekli)' : '(isteğe bağlı)'}
                        </span>
                      </label>
                      <input
                        id="t-eposta" name="eposta" type="email" autoComplete="email"
                        required={epostaZorunlu} maxLength={120} placeholder="ornek@eposta.com"
                        style={durum?.alan === 'eposta' ? { borderColor: 'var(--danger)' } : undefined}
                      />
                    </div>

                    {daireler.length > 0 && (
                      <div className="alan">
                        <label htmlFor="t-daire">
                          İlgilendiğiniz tip <span className="dim">(isteğe bağlı)</span>
                        </label>
                        <select id="t-daire" name="daireTipi" defaultValue={seciliDaire ?? ''}>
                          <option value="">Farketmez / henüz karar vermedim</option>
                          {daireler.map((d) => (
                            <option key={d.id} value={d.id}>{d.ad} · {d.brutM2} m²</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Katlanmış bölüm — gerekçesi dosya başlığında. */}
                    {!detay ? (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDetay(true)}>
                        <Icon n="plus" s={14} sw={2.4} /> Bütçemi ve ödeme tercihimi belirteyim
                      </button>
                    ) : (
                      <>
                        <div className="alan-satir">
                          <div className="alan">
                            <label htmlFor="t-bmin">Bütçe — alt sınır</label>
                            <input id="t-bmin" name="butceMin" inputMode="numeric"
                              placeholder="6.000.000"
                              style={durum?.alan === 'butceMin' ? { borderColor: 'var(--danger)' } : undefined} />
                          </div>
                          <div className="alan">
                            <label htmlFor="t-bmax">Üst sınır</label>
                            <input id="t-bmax" name="butceMax" inputMode="numeric"
                              placeholder="9.000.000"
                              style={durum?.alan === 'butceMax' ? { borderColor: 'var(--danger)' } : undefined} />
                          </div>
                        </div>
                        <div className="alan">
                          <label htmlFor="t-odeme">Ödeme şekli</label>
                          <select id="t-odeme" name="odemeSekli" defaultValue="BELIRTILMEDI">
                            <option value="BELIRTILMEDI">Belirtmek istemiyorum</option>
                            <option value="KREDI">Konut kredisi</option>
                            <option value="PESIN">Peşin</option>
                            <option value="TAKSIT">Firmadan taksit</option>
                            <option value="TAKAS">Takas</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="alan">
                      <label htmlFor="t-saat">
                        Ne zaman arayalım? <span className="dim">(isteğe bağlı)</span>
                      </label>
                      <input id="t-saat" name="saat" maxLength={60}
                        placeholder="Hafta içi 18.00’den sonra" />
                    </div>

                    <div className="alan">
                      <label htmlFor="t-not">Notunuz <span className="dim">(isteğe bağlı)</span></label>
                      <textarea id="t-not" name="not" rows={2} maxLength={500}
                        placeholder="Kredi kullanmayı düşünüyorum, ödeme planı hakkında bilgi alabilir miyim?" />
                    </div>

                    {/* KVKK açık rızası. Sunucu da denetliyor (form
                        doğrudan POST edilebiliyor) ama kutunun burada
                        olması rızanın gerçekten alındığı anlamına
                        geliyor — sunucu denetimi tek başına rıza değil. */}
                    <label className="onay-satir" htmlFor="t-kvkk">
                      <input id="t-kvkk" name="kvkkOnay" type="checkbox" required />
                      <span>
                        Ad, telefon ve e-posta bilgilerimin bu talep kapsamında
                        satış ekibiyle paylaşılmasına ve benimle iletişime
                        geçilmesine onay veriyorum.{' '}
                        <a href="/kvkk" target="_blank" rel="noopener">Aydınlatma metni</a>
                      </span>
                    </label>

                    {durum?.hata && (
                      <p className="form-hata" role="alert">
                        <Icon n="x" s={16} sw={2.4} /> {durum.hata}
                      </p>
                    )}

                    <button className="btn btn-primary" type="submit" disabled={bekliyor}>
                      {bekliyor ? 'Gönderiliyor…' : DUGME[niyet]}
                    </button>
                    <p className="tiny dim" style={{ marginTop: 10 }}>
                      Bilgileriniz yalnızca bu proje için sizinle iletişim kurmakta
                      kullanılıyor, üçüncü kişilerle paylaşılmıyor.
                    </p>
                  </fieldset>
                </form>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
