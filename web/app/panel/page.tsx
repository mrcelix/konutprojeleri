import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { KpiKart, OranListesi, SutunGrafik } from '@/components/panel/Grafik';
import { aylikSeri, degisim, huni, kpiHesapla, projePerformansi } from '@/lib/analitik';
import { prisma } from '@/lib/db';
import { TLkisa, teslimCeyrek } from '@/lib/bicim';
import { telefonBicim } from '@/lib/talep';
import { donemAraligi, firmaBaglam, trGun } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

const DONEMLER = [['30g', '30 gün'], ['90g', '90 gün'], ['12a', '12 ay']] as const;

export default async function PanelGenelBakis(
  { searchParams }: { searchParams: Promise<{ d?: string }> },
) {
  const b = await firmaBaglam();
  const { d } = await searchParams;
  const donem = d ?? '30g';
  const { baslangic, bitis, onceki, ad } = donemAraligi(donem);

  const kapsam = b.projeIdler;
  const projeFiltre = kapsam ? { projeId: { in: kapsam } } : {};

  const [simdiki, gecmis, seri, huniAdimlari, projeler, bekleyen, sonMesajlar]
    = await Promise.all([
      kpiHesapla(baslangic, bitis, kapsam),
      kpiHesapla(onceki, baslangic, kapsam),
      aylikSeri(12, kapsam),
      huni(baslangic, bitis, kapsam),
      projePerformansi(baslangic, bitis, kapsam),
      /* Bekleyen talepler: EN ESKİSİ ÜSTTE. Yeniden eskiye sıralamak,
         en uzun bekleyen kişiyi listenin dibine atıyordu — oysa
         aranması en acil olan o. */
      prisma.talep.findMany({
        where: { ...projeFiltre, durum: { in: ['YENI', 'ARANDI'] } },
        orderBy: { olusturma: 'asc' }, take: 6,
        select: {
          id: true, kod: true, ad: true, telefon: true, niyet: true, durum: true,
          olusturma: true, saat: true,
          proje: { select: { ad: true } },
          daireTipi: { select: { ad: true } },
        },
      }),
      prisma.konusma.findMany({
        where: { ...(kapsam ? { projeId: { in: kapsam } } : {}), durum: { not: 'KAPALI' } },
        orderBy: { guncelleme: 'desc' }, take: 4,
        select: {
          id: true, soranAd: true, konu: true, okundu: true, guncelleme: true,
          proje: { select: { ad: true } },
        },
      }),
    ]);

  const saatFarki = (t: Date) => Math.round((Date.now() - t.getTime()) / 3600_000);

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik={`Merhaba, ${b.kullanici.ad.split(' ')[0]}`}
      aciklama={kapsam ? `${kapsam.length} proje · ${ad}` : `Tüm envanter · ${ad} (yönetici görünümü)`}
      eylem={(
        <div className="chips" style={{ gap: 6 }}>
          {DONEMLER.map(([k, etiket]) => (
            <Link key={k} href={`/panel?d=${k}`} className={'chip btn-sm' + (donem === k ? ' on' : '')}
              style={{ height: 34 }}>{etiket}</Link>
          ))}
        </div>
      )}
    >
      {/* Dört saati geçen talep TEK GERÇEK UYARI: konut satışında ilk
          temasın hızı belirleyici ve alıcı aynı gün üç projeye form
          dolduruyor. */}
      {b.isler.gecikenTalep > 0 && (
        <div className="kart" style={{
          padding: '12px 16px', marginBottom: 14,
          borderColor: 'var(--accent)', background: 'var(--accent-100)',
        }}>
          <p className="small" style={{ margin: 0 }}>
            <b>{b.isler.gecikenTalep} talep dört saattir aranmadı.</b> Alıcı
            aynı gün başka projelere de form dolduruyor; ilk arayan öne
            geçiyor. <Link href="/panel/talepler">Talepleri aç</Link>.
          </p>
        </div>
      )}

      <div className="kpi-izgara">
        <KpiKart baslik="Talep" deger={String(simdiki.talep)}
          degisim={degisim(simdiki.talep, gecmis.talep)} alt="önceki döneme göre" />
        <KpiKart baslik="Satışa dönüşen" deger={String(simdiki.satis)}
          degisim={degisim(simdiki.satis, gecmis.satis)} alt="panele işlediğiniz kadar" />
        <KpiKart baslik="Dönüşüm oranı" deger={`%${simdiki.donusumOrani}`}
          degisim={degisim(simdiki.donusumOrani, gecmis.donusumOrani)} alt="satış / talep" />
        <KpiKart baslik="Randevu" deger={String(simdiki.randevu)}
          degisim={degisim(simdiki.randevu, gecmis.randevu)} alt="yerinde görme talebi" />
        <KpiKart baslik="Ulaşılamama" deger={`%${simdiki.ulasilamamaOrani}`}
          degisim={degisim(simdiki.ulasilamamaOrani, gecmis.ulasilamamaOrani)}
          tersMi alt="düşük olması iyi" />
        <KpiKart baslik="Yanıt süresi (yaklaşık)"
          deger={simdiki.ortYanitSaati != null ? `${simdiki.ortYanitSaati} sa` : '—'}
          alt="talepten ilk temasa" />
        <KpiKart baslik="Ortalama bütçe"
          deger={simdiki.ortButce ? TLkisa(simdiki.ortButce) : '—'}
          alt="bütçesini belirtenler" />
      </div>

      <section className="kart">
        <div className="kart-bas">
          <div>
            <h2>Son 12 ay</h2>
            <p>Aylık talep (sütun) ve satışa dönüşen (çizgi).</p>
          </div>
        </div>
        <SutunGrafik
          seri={seri.map((s) => ({ etiket: s.ay, deger: s.talep, ikincil: s.satis }))}
          ikincilAd="Satış" yukseklik={200}
        />
      </section>

      <div className="p-ikili">
        {/* ---------- Bekleyen talepler ---------- */}
        <section className="kart">
          <div className="kart-bas">
            <div><h2>Aranmayı bekleyenler</h2><p>En uzun bekleyen üstte.</p></div>
            <Link className="link-more" href="/panel/talepler">Tümü <Icon n="arrowR" s={15} /></Link>
          </div>
          {bekleyen.length ? (
            <div className="p-tablo-kap" style={{ border: 0 }}>
              <table className="p-tablo">
                <thead>
                  <tr><th>Ad</th><th>Telefon</th><th>Proje</th><th>Bekleme</th></tr>
                </thead>
                <tbody>
                  {bekleyen.map((t) => {
                    const saat = saatFarki(t.olusturma);
                    return (
                      <tr key={t.id}>
                        <td>
                          <b>{t.ad}</b>
                          <div className="tiny dim">
                            {t.niyet === 'RANDEVU' ? 'Randevu istiyor' : t.kod}
                            {t.daireTipi && ` · ${t.daireTipi.ad}`}
                          </div>
                        </td>
                        <td className="tiny">
                          <a href={`tel:+90${t.telefon}`}>{telefonBicim(t.telefon)}</a>
                          {t.saat && <div className="dim">{t.saat}</div>}
                        </td>
                        <td className="muted">{t.proje?.ad ?? <span className="dim">genel</span>}</td>
                        <td className="sayi">
                          <span className={saat >= 4 ? 'durum durum-PASIF' : 'tiny'}>
                            {saat < 1 ? '<1 sa' : `${saat} sa`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="muted small">Bekleyen talep yok.</p>}
        </section>

        {/* ---------- Huni ---------- */}
        <section className="kart">
          <div className="kart-bas">
            <div><h2>Satış hunisi</h2><p>{ad}</p></div>
          </div>
          <OranListesi paraMi={false} satirlar={huniAdimlari.map((h) => ({
            ad: h.ad, deger: h.sayi, alt: `%${h.gecis} geçiş`,
          }))} bos="Bu dönemde talep yok." />
        </section>
      </div>

      <div className="p-ikili">
        {/* ---------- Proje performansı ---------- */}
        <section className="kart">
          <div className="kart-bas">
            <div><h2>Projelerinizin talep dağılımı</h2><p>{ad}</p></div>
            <Link className="link-more" href="/panel/projeler">Tümü <Icon n="arrowR" s={15} /></Link>
          </div>
          {projeler.length ? (
            <div className="p-tablo-kap" style={{ border: 0 }}>
              <table className="p-tablo">
                <thead>
                  <tr>
                    <th>Proje</th><th className="sayi">Talep</th>
                    <th className="sayi">Satış</th><th className="sayi">Dönüşüm</th>
                  </tr>
                </thead>
                <tbody>
                  {projeler.slice(0, 6).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/panel/projeler?v=${p.slug}`}>{p.ad}</Link>
                        <div className="tiny dim">{p.durum} · {p.yayindaGun} gündür yayında</div>
                      </td>
                      <td className="sayi"><b>{p.talep}</b></td>
                      <td className="sayi">{p.satis}</td>
                      <td className="sayi">%{p.donusumOrani}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted small">Henüz projeniz yok.</p>}
        </section>

        {/* ---------- Sorular ---------- */}
        <section className="kart">
          <div className="kart-bas">
            <div><h2>Yanıt bekleyen sorular</h2></div>
            <Link className="link-more" href="/panel/mesajlar">Tümü <Icon n="arrowR" s={15} /></Link>
          </div>
          {sonMesajlar.length ? (
            <ul className="p-liste">
              {sonMesajlar.map((k) => (
                <li key={k.id}>
                  <Link href={`/panel/mesajlar?k=${k.id}`}>
                    <b>{k.soranAd}</b>
                    {!k.okundu && <span className="badge badge-solid">Yeni</span>}
                    <div className="tiny dim">{k.proje.ad} · {trGun(k.guncelleme)}</div>
                    <div className="tiny">{k.konu}</div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="muted small">Yanıt bekleyen soru yok.</p>}
        </section>
      </div>
    </PanelKabuk>
  );
}
