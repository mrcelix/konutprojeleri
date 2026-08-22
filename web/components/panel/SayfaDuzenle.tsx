'use client';

import { useActionState, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import BlokEditor from './BlokEditor';
import { sayfaKaydet, type IcerikSonucu } from '@/lib/panel-eylemler';
import { slugla } from '@/lib/turkce';

/* ============================================================
   Kurumsal sayfa düzenleyici.

   Gövde zengin metin editörü DEĞİL, daraltılmış bir biçim:

     ## Alt başlık
     Düz satır → paragraf
     - Liste maddesi
     ---        → yeni blok

   Sebep: zengin editör HTML üretir, HTML'i sayfaya basmak
   `dangerouslySetInnerHTML` demek ve panele erişen herkes siteye
   script yazabilir hâle gelir. Bu biçim yalnızca başlık, paragraf ve
   liste üretiyor; bağlantı ve etiket kabul etmiyor.
   ============================================================ */

export interface SayfaVerisi {
  id?: string;
  slug: string;
  dil: 'TR' | 'EN';
  baslik: string;
  h1: string;
  aciklama: string;
  govde: string;
  sss: string;
  ctaMetin: string;
  ctaYol: string;
  indexle: boolean;
  yayinda: boolean;
}

export default function SayfaDuzenle({ sayfa }: { sayfa: SayfaVerisi }) {
  const [durum, gonder, bekliyor] = useActionState<IcerikSonucu | null, FormData>(
    sayfaKaydet, null,
  );

  // React 19 eylem sonrası formu sıfırlıyor; hatada değerler geri veriliyor
  const d = durum?.degerler;
  const sonDurum = useRef(durum);
  const denemeRef = useRef(0);
  if (sonDurum.current !== durum) { sonDurum.current = durum; denemeRef.current++; }

  const [aciklama, setAciklama] = useState(d?.aciklama ?? sayfa.aciklama);
  const stil = (alan: string) =>
    (durum?.alan === alan ? { borderColor: 'var(--danger)' } : undefined);

  const dil = (d?.dil as 'TR' | 'EN') ?? sayfa.dil;
  const onEk = dil === 'EN' ? '/en/' : '/';
  /* Önizleme YAZILANI değil KAYDEDİLECEĞİ hâli gösteriyor: sunucuda
     `slugla()` uygulanıyor, "Çalışma Saatlerimiz" yazan yönetici
     adresin `/calisma-saatlerimiz` olacağını burada görmeli. */
  const [slugGirdi, setSlugGirdi] = useState(d?.slug ?? sayfa.slug);
  const slugOnizleme = slugla(slugGirdi);

  if (durum?.tamam && durum.slug) {
    return (
      <section className="p-kart">
        <h2 className="h3" style={{ color: 'var(--success)' }}>Sayfa kaydedildi</h2>
        <p className="muted small" style={{ margin: '10px 0 16px' }}>
          Değişiklik birkaç saniye içinde yayına giriyor.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary btn-sm" href="/yonetim/sayfalar">Sayfalara dön</Link>
          <Link className="btn btn-ghost btn-sm" href={`${onEk}${durum.slug}`} target="_blank">
            Sayfayı gör <Icon n="arrowR" s={14} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={gonder} key={denemeRef.current}>
      <fieldset disabled={bekliyor} style={{ border: 0, padding: 0, margin: 0 }}>
        {sayfa.id && <input type="hidden" name="id" value={sayfa.id} />}

        <section className="p-kart">
          <h2 className="h3">Adres ve arama görünümü</h2>
          <div className="ekle-izgara" style={{ marginTop: 14 }}>
            <div className="p-alan">
              <label htmlFor="s-dil">Dil</label>
              <select id="s-dil" name="dil" defaultValue={dil} disabled={!!sayfa.id}>
                <option value="TR">Türkçe</option>
                <option value="EN">İngilizce</option>
              </select>
              {sayfa.id && (
                <span className="ipucu">
                  Var olan bir sayfanın dili değiştirilemiyor; diğer dilde ayrı
                  sayfa açın.
                </span>
              )}
            </div>

            <div className="p-alan">
              <label htmlFor="s-slug">Adres</label>
              <input id="s-slug" name="slug" required maxLength={60}
                value={slugGirdi} onChange={(e) => setSlugGirdi(e.target.value)}
                placeholder="yerinde-inceleme"
                style={{ fontFamily: 'ui-monospace, monospace', ...stil('slug') }} />
              <span className="ipucu">
                Yayına giren adres: <code>{onEk}{slugOnizleme || '…'}</code>
                {sayfa.id && ' — değiştirmek eski bağlantıları kırar.'}
              </span>
            </div>

            <div className="p-alan" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="s-baslik">Arama başlığı (title)</label>
              <input id="s-baslik" name="baslik" required maxLength={70}
                defaultValue={d?.baslik ?? sayfa.baslik} style={stil('baslik')} />
              <span className="ipucu">Google sonuç listesinde ve tarayıcı sekmesinde görünür.</span>
            </div>

            <div className="p-alan" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="s-h1">Sayfa başlığı (H1)</label>
              <input id="s-h1" name="h1" required maxLength={90}
                defaultValue={d?.h1 ?? sayfa.h1} style={stil('h1')} />
            </div>

            <div className="p-alan" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="s-aciklama">Meta açıklaması</label>
              <textarea id="s-aciklama" name="aciklama" rows={2} required
                value={aciklama} onChange={(e) => setAciklama(e.target.value)}
                style={stil('aciklama')} />
              <span className="ipucu" style={{
                color: aciklama.length < 50 || aciklama.length > 160
                  ? 'var(--danger)' : undefined,
              }}>
                {aciklama.length} karakter — Google 50–160 arasını kırpmadan gösteriyor.
              </span>
            </div>
          </div>
        </section>

        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">Gövde</h2>
          <p className="muted small" style={{ margin: '6px 0 12px' }}>
            Her blok sayfada ayrı bir bölüm olarak çıkıyor. Sırayı ok
            düğmeleriyle değiştirin. Uzun metni yapıştırmak için
            “Metin olarak düzenle”ye geçebilirsiniz.
            Bağlantı ve HTML kabul edilmiyor.
          </p>
          <div className="p-alan">
            <label htmlFor="s-govde">Sayfa içeriği</label>
            <BlokEditor baslangic={d?.govde ?? sayfa.govde} hataStil={stil('govde')} />
          </div>
        </section>

        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">Sık sorulan sorular <span className="dim">(isteğe bağlı)</span></h2>
          <p className="muted small" style={{ margin: '6px 0 12px' }}>
            Her satıra bir soru: <code>soru | cevap</code>. Girilirse sayfaya
            SSS bölümü ve arama motorları için FAQ şeması ekleniyor.
          </p>
          <div className="p-alan">
            <label htmlFor="s-sss">SSS</label>
            <textarea id="s-sss" name="sss" rows={6}
              defaultValue={d?.sss ?? sayfa.sss}
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }} />
          </div>
        </section>

        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">Çağrı düğmesi <span className="dim">(isteğe bağlı)</span></h2>
          <p className="muted small" style={{ margin: '6px 0 12px' }}>
            Sayfanın altında görünen düğme. Boş bırakılırsa tüm sayfalarda
            ortak olan varsayılan düğme çıkıyor. Gövde bağlantı kabul
            etmediği için sayfanın kendi hedefine yönlendirmesinin tek yolu
            bu — örneğin &quot;firmalar için rehber&quot; sayfasından başvuru formuna.
          </p>
          <div className="ekle-izgara">
            <div className="p-alan">
              <label htmlFor="s-ctaMetin">Düğme metni</label>
              <input id="s-ctaMetin" name="ctaMetin" maxLength={60}
                defaultValue={d?.ctaMetin ?? sayfa.ctaMetin}
                placeholder="Başvuru formunu doldurun" />
            </div>
            <div className="p-alan">
              <label htmlFor="s-ctaYol">Hedef adres</label>
              <input id="s-ctaYol" name="ctaYol" maxLength={200}
                defaultValue={d?.ctaYol ?? sayfa.ctaYol}
                placeholder="/ev-sahibi-basvuru"
                style={{ fontFamily: 'ui-monospace, monospace' }} />
              <span className="ipucu">Site içi adres; `/` ile başlamalı.</span>
            </div>
          </div>
        </section>

        <section className="p-kart" style={{ marginTop: 16 }}>
          <h2 className="h3">Yayın</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
            <label className="ozellik-kutu" style={{ maxWidth: 320 }}>
              <input type="checkbox" name="yayinda"
                defaultChecked={d ? d.yayinda === 'on' : sayfa.yayinda} />
              <span>Yayında</span>
            </label>
            <label className="ozellik-kutu" style={{ maxWidth: 380 }}>
              <input type="checkbox" name="indexle"
                defaultChecked={d ? d.indexle === 'on' : sayfa.indexle} />
              <span>Arama motorları dizine alsın</span>
            </label>
          </div>
          <p className="tiny dim" style={{ marginTop: 10, maxWidth: 620 }}>
            Yayında değilse adres 404 veriyor — sayfa taslak hâlde yazılabilir.
            Dizine alma kapatılırsa <code>noindex</code> basılıyor; teşekkür ve
            sonuç sayfaları için.
          </p>
        </section>

        {durum?.hata && (
          <p className="form-hata" role="alert" style={{ marginTop: 16 }}>
            <Icon n="x" s={16} sw={2.4} /> {durum.hata}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" type="submit" disabled={bekliyor}>
            {bekliyor ? 'Kaydediliyor…' : sayfa.id ? 'Değişiklikleri kaydet' : 'Sayfayı oluştur'}
          </button>
          <Link className="btn btn-ghost btn-lg" href="/yonetim/sayfalar">Vazgeç</Link>
        </div>
      </fieldset>
    </form>
  );
}
