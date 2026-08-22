'use client';

import Link from 'next/link';
import { useActionState, useTransition } from 'react';
import Icon from '@/components/Icon';
import { konusmaDurumDegistir, mesajYanitla, type MesajSonucu } from '@/lib/panel-eylemler';

export interface MesajVeri {
  id: string;
  metin: string;
  soranMi: boolean;
  yazar: string | null;
  zaman: string;
}

export interface KonusmaVeri {
  id: string;
  konu: string;
  soranAd: string;
  soranEposta: string;
  projeAd: string;
  projeSlug: string;
  durum: string;
  okundu: boolean;
  zaman: string;
  mesajlar: MesajVeri[];
}

export default function MesajPaneli({
  konusmalar, secili, kok,
}: { konusmalar: KonusmaVeri[]; secili: KonusmaVeri | null; kok: string }) {
  const [durum, gonder, bekliyor] = useActionState<MesajSonucu | null, FormData>(mesajYanitla, null);
  const [gecis, basla] = useTransition();

  if (!konusmalar.length) {
    return (
      <div className="kart p-bos">
        <Icon n="share" s={30} />
        <p>Henüz mesaj yok.</p>
        <p className="tiny dim" style={{ marginTop: 6 }}>
          Ziyaretçiler proje sayfasındaki soru formundan yazdığında burada görünür.
        </p>
      </div>
    );
  }

  return (
    <div className="p-ikili" style={{ gridTemplateColumns: 'minmax(0, 320px) minmax(0, 1fr)' }}>
      {/* ---------- Konuşma listesi ---------- */}
      <section className="kart" style={{ padding: 10 }}>
        <div style={{ display: 'grid', gap: 4, maxHeight: 620, overflowY: 'auto' }}>
          {konusmalar.map((k) => (
            <Link key={k.id} href={`${kok}/mesajlar?k=${k.id}`}
              style={{
                display: 'block', padding: '12px 14px', borderRadius: 'var(--r-sm)',
                background: secili?.id === k.id ? 'var(--primary-100)'
                  : k.okundu ? 'transparent' : 'var(--surface-2)',
              }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <b style={{ fontSize: 13.6 }}>{k.soranAd}</b>
                {!k.okundu && <span className="durum durum-ACIK" style={{ height: 18, fontSize: 10 }}>yeni</span>}
                <span className="tiny dim" style={{ marginLeft: 'auto' }}>{k.zaman}</span>
              </div>
              <div className="tiny muted" style={{ marginTop: 3 }}>{k.projeAd}</div>
              <div className="tiny dim" style={{
                marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {k.mesajlar[k.mesajlar.length - 1]?.metin}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------- Seçili konuşma ---------- */}
      {secili ? (
        <section className="kart">
          <div className="kart-bas">
            <div>
              <h2>{secili.soranAd}</h2>
              <p>
                <Link href={`/proje/${secili.projeSlug}`} target="_blank">{secili.projeAd}</Link>
                {' · '}<a href={`mailto:${secili.soranEposta}`}>{secili.soranEposta}</a>
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`durum durum-${secili.durum}`}>{secili.durum}</span>
              {secili.durum !== 'KAPALI' && (
                <button type="button" className="btn btn-ghost btn-sm" disabled={gecis}
                  onClick={() => basla(() => { void konusmaDurumDegistir(secili.id, 'KAPALI'); })}>
                  Kapat
                </button>
              )}
            </div>
          </div>

          <div className="msj-dizi">
            {secili.mesajlar.map((m) => (
              <div key={m.id} className={'msj ' + (m.soranMi ? 'msj-soran' : 'msj-biz')}>
                <div className="msj-ust">
                  <b>{m.soranMi ? secili.soranAd : (m.yazar ?? 'Satış ekibi')}</b>
                  <span>{m.zaman}</span>
                </div>
                {m.metin}
              </div>
            ))}
          </div>

          <form action={gonder} style={{ marginTop: 18 }}>
            <input type="hidden" name="konusmaId" value={secili.id} />
            <div className="p-alan">
              <label htmlFor="metin">Yanıtınız</label>
              <textarea id="metin" name="metin" rows={4} required minLength={2}
                placeholder="Ziyaretçinin sorusuna yanıt yazın…" />
            </div>

            {durum?.hata && (
              <p className="form-hata" role="alert"><Icon n="x" s={16} sw={2.4} /> {durum.hata}</p>
            )}
            {durum?.tamam && (
              <p className="form-basarili" role="status"><Icon n="check" s={16} sw={2.4} /> Yanıt gönderildi.</p>
            )}

            <button className="btn btn-primary" type="submit" disabled={bekliyor}>
              {bekliyor ? 'Gönderiliyor…' : 'Yanıtla'}
            </button>
            <p className="tiny dim" style={{ marginTop: 10 }}>
              Yanıt hızınız ilan sayfanızda gösteriliyor — 4 saat içinde dönmek listelemede avantaj sağlıyor.
            </p>
          </form>
        </section>
      ) : (
        <section className="kart p-bos">
          <Icon n="share" s={30} />
          <p>Soldan bir konuşma seçin.</p>
        </section>
      )}
    </div>
  );
}
