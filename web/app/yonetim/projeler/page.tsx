import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import YayinDugmesi from '@/components/panel/YayinDugmesi';
import SilmeOnay from '@/components/panel/SilmeOnay';
import { prisma } from '@/lib/db';
import { DURUM_ADI, TIP_ADI, TLkisa, teslimCeyrek } from '@/lib/bicim';
import { yonetimBaglam } from '@/lib/panel-baglam';
import { altRaporu } from '@/lib/alt-metin';
import { PROJE_DURUMLARI, PROJE_TIPLERI } from '@/lib/kategori-sabit';
import type { ProjeDurumu, ProjeTipi } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function YonetimProjeler(
  { searchParams }: {
    searchParams: Promise<{ ara?: string; durum?: string; firma?: string; tip?: string }>;
  },
) {
  const b = await yonetimBaglam();
  const { ara, durum, firma, tip } = await searchParams;

  const tipSuzgeci = (PROJE_TIPLERI as readonly string[]).includes(tip ?? '')
    ? (tip as ProjeTipi) : undefined;
  const durumSuzgeci = (PROJE_DURUMLARI as readonly string[]).includes(durum ?? '')
    ? (durum as ProjeDurumu) : undefined;

  const projeler = await prisma.proje.findMany({
    where: {
      // Firmalar listesinden "Projeleri" bağlantısıyla geliniyor
      ...(firma ? { firmaId: firma } : {}),
      ...(durum === 'pasif' ? { yayinda: false }
        : durum === 'yayinda' ? { yayinda: true }
          : durumSuzgeci ? { durum: durumSuzgeci } : {}),
      ...(tipSuzgeci ? { tip: tipSuzgeci } : {}),
      ...(ara ? {
        OR: [
          { ad: { contains: ara, mode: 'insensitive' } },
          { mahalle: { contains: ara, mode: 'insensitive' } },
          { bolge: { ad: { contains: ara, mode: 'insensitive' } } },
          { firma: { ad: { contains: ara, mode: 'insensitive' } } },
        ],
      } : {}),
    },
    orderBy: [{ yayinda: 'desc' }, { ad: 'asc' }],
    select: {
      id: true, slug: true, ad: true, tip: true, durum: true, yayinda: true,
      fiyatMin: true, fiyatMax: true, teslimTarihi: true, ilerlemeYuzde: true,
      mahalle: true,
      bolge: { select: { ad: true } },
      firma: { select: { ad: true, kullanici: { select: { eposta: true, aktif: true } } } },
      medya: {
        select: { url: true, alt: true, altOtomatik: true, sira: true },
        orderBy: { sira: 'asc' },
      },
      _count: { select: { talepler: true, daireTipleri: true, konusmalar: true } },
    },
  });

  const yayinda = projeler.filter((p) => p.yayinda).length;

  /* Alt metni eksik projeler. Yayına alma kapısı yalnızca kapağı şart
     koşuyor (bkz. `projeYayinDurumu`); geri kalanı burada görünüyor,
     yoksa kimse hangi projede ne eksik olduğunu bilmiyor. */
  const eksikler = projeler
    .map((p) => ({ p, r: altRaporu(p.medya) }))
    .filter((x) => x.r.otomatik > 0 || x.r.kopya > 0)
    .sort((a, b) => (b.r.otomatik + b.r.kopya) - (a.r.otomatik + a.r.kopya));

  /* Daire tipi olmayan projeler yayına ALINAMIYOR (bkz.
     `projeYayinDurumu`). Uyarı burada duruyor ki yönetici yayına
     almayı denemeden önce görsün. */
  const tipsizler = projeler.filter((p) => p._count.daireTipleri === 0);

  const suzgecYolu = (degis: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ durum, tip, firma, ara, ...degis })) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/yonetim/projeler${qs ? `?${qs}` : ''}`;
  };

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Projeler"
      aciklama={`${projeler.length} proje · ${yayinda} yayında`}
      eylem={(
        <>
          <form className="p-ara" action="/yonetim/projeler">
            {/* placeholder etiket yerine geçmez: odaklanınca kaybolur */}
            <label htmlFor="ara" className="sr">Projelerde ara</label>
            <Icon n="search" s={15} sw={2.2} />
            <input id="ara" name="ara" defaultValue={ara ?? ''} placeholder="Proje, mahalle, bölge, firma" />
            <button type="submit" aria-label="Ara"><Icon n="arrowR" s={14} sw={2.6} /></button>
          </form>
          <Link className="btn btn-ghost btn-sm" href="/yonetim/projeler/ice-aktar">
            <Icon n="grid" s={15} /> Toplu aktar
          </Link>
          <Link className="btn btn-primary btn-sm" href="/yonetim/projeler/yeni">
            <Icon n="plus" s={15} sw={2.2} /> Yeni proje
          </Link>
        </>
      )}
    >
      <div className="chips">
        {[['', 'Tümü'], ['yayinda', 'Yayında'], ['pasif', 'Pasif']].map(([k, etiket]) => (
          <Link key={k} href={suzgecYolu({ durum: k })}
            className={'chip' + ((durum ?? '') === k ? ' on' : '')}>{etiket}</Link>
        ))}
        <span className="chip-sep" />
        {[['', 'Her tip'], ...PROJE_TIPLERI.map((t) => [t, TIP_ADI[t]])].map(([k, etiket]) => (
          <Link key={`t-${k}`} href={suzgecYolu({ tip: k as string })}
            className={'chip' + ((tip ?? '') === k ? ' on' : '')}>{etiket}</Link>
        ))}
        {firma && (
          <Link href="/yonetim/projeler" className="chip on">
            {projeler[0]?.firma.ad ?? 'Firma'} · süzgeci kaldır
          </Link>
        )}
      </div>

      {tipsizler.length > 0 && (
        <div className="kart" style={{
          padding: '14px 16px', margin: '16px 0',
          borderColor: 'var(--accent)', background: 'var(--accent-100)',
        }}>
          <p className="small" style={{ margin: '0 0 8px' }}>
            <b>{tipsizler.length} projede daire tipi yok.</b> Daire tipi olmayan
            proje yayına alınamıyor: sayfası ziyaretçinin tek sorusuna
            (&quot;hangi tipler var, kaça?&quot;) cevap vermiyor ve talep formu
            boşa çalışıyor.
          </p>
          <ul className="tiny" style={{ margin: 0, paddingLeft: 18 }}>
            {tipsizler.slice(0, 8).map((p) => (
              <li key={p.id}><Link href={`/yonetim/projeler/${p.id}`}>{p.ad}</Link></li>
            ))}
            {tipsizler.length > 8 && <li className="dim">… {tipsizler.length - 8} proje daha</li>}
          </ul>
        </div>
      )}

      {eksikler.length > 0 && (
        <div className="kart" style={{
          padding: '14px 16px', margin: '16px 0',
          borderColor: 'var(--accent)', background: 'var(--accent-100)',
        }}>
          <p className="small" style={{ margin: '0 0 8px' }}>
            <b>{eksikler.length} projede görsel alt metni eksik.</b> Yüklenen
            görsellere makine geçici bir metin yazıyor; hepsinde aynı cümle
            olduğu için ekran okuyucu kullanan biri görselleri birbirinden
            ayırt edemiyor.
          </p>
          <ul className="tiny" style={{ margin: 0, paddingLeft: 18 }}>
            {eksikler.slice(0, 8).map(({ p, r }) => (
              <li key={p.id}>
                <Link href={`/yonetim/projeler/${p.id}`}>{p.ad}</Link>
                {' — '}
                {r.otomatik > 0 && `${r.otomatik} görsel yazılmadı`}
                {r.otomatik > 0 && r.kopya > 0 && ', '}
                {r.kopya > 0 && `${r.kopya} tekrar eden metin`}
                {!r.kapakHazir && ' · kapak eksik, yayına alınamaz'}
              </li>
            ))}
            {eksikler.length > 8 && <li className="dim">… {eksikler.length - 8} proje daha</li>}
          </ul>
        </div>
      )}

      <div className="p-tablo-kap">
        <table className="p-tablo">
          <thead>
            <tr>
              <th>Proje</th><th>Bölge</th><th>Firma</th>
              <th className="sayi">Fiyat</th><th className="sayi">Tip</th>
              <th className="sayi">Talep</th><th>Durum</th>
              <th className="p-sabit-sag">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {projeler.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {p.medya[0] && (
                      <Image src={p.medya[0].url} alt={p.medya[0].alt} width={58} height={44}
                        style={{ borderRadius: 6, objectFit: 'cover', flex: 'none' }} />
                    )}
                    <div>
                      <b style={{ fontSize: 13.4 }}>{p.ad}</b>
                      <div className="tiny dim">{p.mahalle} · {TIP_ADI[p.tip]}</div>
                    </div>
                  </div>
                </td>
                <td className="muted">{p.bolge.ad}</td>
                <td className="sarma">
                  {p.firma.ad}
                  <div className="tiny dim">
                    {p.firma.kullanici
                      ? `${p.firma.kullanici.eposta}${p.firma.kullanici.aktif ? '' : ' (kapalı)'}`
                      : 'panel hesabı yok'}
                  </div>
                </td>
                <td className="sayi">
                  {TLkisa(p.fiyatMin)}
                  <div className="tiny dim">
                    {p.fiyatMax && p.fiyatMax > p.fiyatMin ? `– ${TLkisa(p.fiyatMax)}` : 'başlangıç'}
                  </div>
                </td>
                {/* Daire tipi sayısı YAYIN KAPISI: sıfırsa proje yayına
                    alınamıyor, bu yüzden sayı tabloda görünüyor. */}
                <td className="sayi">
                  {p._count.daireTipleri === 0
                    ? <span className="durum durum-PASIF">yok</span>
                    : p._count.daireTipleri}
                </td>
                <td className="sayi">{p._count.talepler}</td>
                <td>
                  <span className={`durum durum-${p.yayinda ? 'YAYINDA' : 'PASIF'}`}>
                    {p.yayinda ? 'Yayında' : 'Pasif'}
                  </span>
                  <div className="tiny dim" style={{ marginTop: 3 }}>
                    {DURUM_ADI[p.durum]} · {teslimCeyrek(
                      p.teslimTarihi ? p.teslimTarihi.toISOString().slice(0, 10) : undefined,
                    )}
                  </div>
                </td>
                {/* İşlemler TEK SATIR. Sarmalı düzende dört denetim alt
                    alta diziliyor ve ekranda on iki projeden yalnızca
                    dördü görünüyordu. Silme yine iki adımlı — yanlışlıkla
                    tıklanmaya karşı koruma onay adımında, ayrı satırda
                    durmasında değildi. */}
                <td className="p-sabit-sag">
                  <div className="p-islem">
                    <Link className="btn btn-ghost btn-sm" href={`/yonetim/projeler/${p.id}`}>
                      <Icon n="sliders" s={14} /> Düzenle
                    </Link>
                    <YayinDugmesi projeId={p.id} yayinda={p.yayinda} projeAd={p.ad} />
                    <Link className="btn btn-quiet btn-sm p-islem-tek" href={`/proje/${p.slug}`} target="_blank"
                      aria-label={`${p.ad} sayfasını yeni sekmede aç`} title="Proje sayfasını aç">
                      <Icon n="arrowR" s={14} />
                    </Link>
                    <SilmeOnay tur="proje" id={p.id} ad={p.ad} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!projeler.length && (
        <div className="kart p-bos"><Icon n="building" s={30} /><p>Bu filtreyle proje bulunamadı.</p></div>
      )}
    </PanelKabuk>
  );
}
