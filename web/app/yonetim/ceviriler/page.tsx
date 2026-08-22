import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import CeviriDuzenle from '@/components/panel/CeviriDuzenle';
import { prisma } from '@/lib/db';
import { yonetimBaglam } from '@/lib/panel-baglam';
import { tumDillerinKapsami, type DilEnum } from '@/lib/ceviri';
import { DIL_ETIKET, DILLER, DIL_YON, TUM_DILLER, type Dil } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const CEVRILEBILIR: DilEnum[] = TUM_DILLER.filter((d) => d !== 'tr')
  .map((d) => d.toUpperCase() as DilEnum);

/** Rota ağacı olan diller — sayfa gerçekten üretiliyor mu. */
const ROTA_VAR = new Set<DilEnum>(DILLER.map((d) => d.toUpperCase() as DilEnum));

export default async function YonetimCeviriler(
  { searchParams }: { searchParams: Promise<{ dil?: string; varlik?: string }> },
) {
  const b = await yonetimBaglam();
  const { dil: dilParam, varlik } = await searchParams;

  const dil = (CEVRILEBILIR.includes((dilParam ?? '').toUpperCase() as DilEnum)
    ? (dilParam ?? '').toUpperCase()
    : 'EN') as DilEnum;
  const secilenVarlik = ['bolge', 'proje', 'ozellik'].includes(varlik ?? '')
    ? varlik as 'bolge' | 'proje' | 'ozellik'
    : 'proje';

  const kapsamlar = await tumDillerinKapsami(CEVRILEBILIR);
  const kapsam = kapsamlar.find((k) => k.dil === dil)!;

  const [bolgeler, projeler, ozellikler] = await Promise.all([
    secilenVarlik === 'bolge'
      ? prisma.bolge.findMany({
        where: { yayinda: true }, orderBy: { sira: 'asc' },
        select: { id: true, ad: true, il: true, ceviri: { where: { dil }, select: { ozet: true } } },
      })
      : Promise.resolve([]),
    secilenVarlik === 'proje'
      ? prisma.proje.findMany({
        where: { yayinda: true }, orderBy: { ad: 'asc' },
        select: {
          id: true, ad: true, bolge: { select: { ad: true } },
          ceviri: { where: { dil }, select: { ozet: true } },
        },
      })
      : Promise.resolve([]),
    secilenVarlik === 'ozellik'
      ? prisma.ozellik.findMany({
        orderBy: { sira: 'asc' },
        select: {
          id: true, ad: true, kod: true, landingSlug: true,
          ceviri: { where: { dil }, select: { ad: true, landingSlug: true, landingBaslik: true, landingAciklama: true } },
        },
      })
      : Promise.resolve([]),
  ]);

  const bag = (d: DilEnum, v: string) => `/yonetim/ceviriler?dil=${d.toLowerCase()}&varlik=${v}`;
  const dilAdi = (d: DilEnum) => DIL_ETIKET[d.toLowerCase() as Dil] ?? d;

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Çeviriler"
      aciklama={`${dilAdi(dil)} · ${kapsam.proje.cevrili}/${kapsam.proje.toplam} proje, `
        + `${kapsam.bolge.cevrili}/${kapsam.bolge.toplam} bölge`}
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Çevirisi olmayan kayıt o dilde <b>görünmez</b> — yarı Türkçe bir
          sayfa hem kullanıcı hem arama motoru için kötü. Türkçe içerik
          burada değil, ilgili kaydın kendi sayfasından düzenleniyor.
        </p>
      </div>

      {/* ---------- Dil kapsamı ---------- */}
      <div className="tohum-izgara" style={{ marginBottom: 20 }}>
        {kapsamlar.map((k) => {
          const rota = ROTA_VAR.has(k.dil);
          return (
            <div key={k.dil} className="kart" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 'var(--t-md)' }}>{dilAdi(k.dil)}</h3>
                <span className="tiny dim">{k.dil}</span>
                {DIL_YON[k.dil.toLowerCase() as Dil] === 'rtl' && (
                  <span className="metin-rozet">sağdan sola</span>
                )}
              </div>
              <p className="tiny" style={{ margin: '0 0 8px' }}>
                {k.proje.cevrili}/{k.proje.toplam} proje · {k.bolge.cevrili}/{k.bolge.toplam} bölge
                {' · '}{k.ozellik.cevrili}/{k.ozellik.toplam} özellik
                {' · '}{k.sayfaMetni.cevrili}/{k.sayfaMetni.toplam} sayfa metni
              </p>
              <p className="tiny dim" style={{ margin: '0 0 10px' }}>
                {!rota
                  ? 'Rota ağacı yok — içerik girilebiliyor, sayfa üretilmiyor.'
                  : k.hazir ? 'Sayfalar üretiliyor.'
                    : k.sayfaMetni.cevrili < k.sayfaMetni.toplam
                      ? `Sayfa metinleri eksik (${k.sayfaMetni.toplam - k.sayfaMetni.cevrili} anahtar) — Sayfa metinleri ekranından girilir.`
                      : 'İçerik yetersiz, sayfa üretilmiyor.'}
              </p>
              {/* Kartın tek eylemi: sessiz düğme burada düz metin gibi
                  okunuyordu, çerçeveli olan tıklanabilirliği gösteriyor. */}
              <Link className="btn btn-ghost btn-sm" href={bag(k.dil, secilenVarlik)}>
                {k.dil === dil ? 'Seçili' : 'Düzenle'}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="chips" style={{ marginBottom: 14 }}>
        {([['proje', 'Projeler'], ['bolge', 'Bölgeler'], ['ozellik', 'Özellikler']] as const)
          .map(([k, e]) => (
            <Link key={k} href={bag(dil, k)}
              className={'chip' + (secilenVarlik === k ? ' on' : '')}>{e}</Link>
          ))}
      </div>

      {/* ---------- Kayıtlar ---------- */}
      <div className="p-tablo-kap">
        <table className="p-tablo">
          <thead>
            <tr>
              <th>Kayıt</th><th>Durum</th><th style={{ width: '55%' }}>{dilAdi(dil)}</th>
            </tr>
          </thead>
          <tbody>
            {secilenVarlik === 'proje' && projeler.map((v) => (
              <tr key={v.id}>
                <td>
                  <b style={{ fontSize: 13 }}>{v.ad}</b>
                  <div className="tiny dim">{v.bolge.ad}</div>
                </td>
                <td>
                  <span className={`durum durum-${v.ceviri[0]?.ozet ? 'YAYINDA' : 'BEKLIYOR'}`}>
                    {v.ceviri[0]?.ozet ? 'Çevrildi' : 'Eksik'}
                  </span>
                </td>
                <td>
                  <CeviriDuzenle varlik="proje" varlikId={v.id} dil={dil}
                    alanlar={[{ ad: 'ozet', etiket: 'Özet', satir: 4, deger: v.ceviri[0]?.ozet ?? '' }]} />
                </td>
              </tr>
            ))}

            {secilenVarlik === 'bolge' && bolgeler.map((x) => (
              <tr key={x.id}>
                <td>
                  <b style={{ fontSize: 13 }}>{x.ad}</b>
                  <div className="tiny dim">{x.il}</div>
                </td>
                <td>
                  <span className={`durum durum-${x.ceviri[0]?.ozet ? 'YAYINDA' : 'BEKLIYOR'}`}>
                    {x.ceviri[0]?.ozet ? 'Çevrildi' : 'Eksik'}
                  </span>
                </td>
                <td>
                  <CeviriDuzenle varlik="bolge" varlikId={x.id} dil={dil}
                    alanlar={[{ ad: 'ozet', etiket: 'Özet', satir: 4, deger: x.ceviri[0]?.ozet ?? '' }]} />
                </td>
              </tr>
            ))}

            {secilenVarlik === 'ozellik' && ozellikler.map((o) => (
              <tr key={o.id}>
                <td>
                  <b style={{ fontSize: 13 }}>{o.ad}</b>
                  <div className="tiny dim">{o.kod}</div>
                  {o.landingSlug && <div className="tiny dim">iniş: /{o.landingSlug}</div>}
                </td>
                <td>
                  <span className={`durum durum-${o.ceviri[0]?.ad ? 'YAYINDA' : 'BEKLIYOR'}`}>
                    {o.ceviri[0]?.ad ? 'Çevrildi' : 'Eksik'}
                  </span>
                </td>
                <td>
                  <CeviriDuzenle varlik="ozellik" varlikId={o.id} dil={dil}
                    alanlar={[
                      { ad: 'ad', etiket: 'Ad', satir: 1, deger: o.ceviri[0]?.ad ?? '' },
                      ...(o.landingSlug ? [
                        { ad: 'landingSlug', etiket: 'İniş yolu', satir: 1, deger: o.ceviri[0]?.landingSlug ?? '' },
                        { ad: 'landingBaslik', etiket: 'İniş başlığı', satir: 1, deger: o.ceviri[0]?.landingBaslik ?? '' },
                        { ad: 'landingAciklama', etiket: 'İniş açıklaması', satir: 3, deger: o.ceviri[0]?.landingAciklama ?? '' },
                      ] : []),
                    ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {((secilenVarlik === 'proje' && !projeler.length)
        || (secilenVarlik === 'bolge' && !bolgeler.length)
        || (secilenVarlik === 'ozellik' && !ozellikler.length)) && (
        <div className="kart p-bos"><Icon n="grid" s={30} /><p>Kayıt yok.</p></div>
      )}
    </PanelKabuk>
  );
}
