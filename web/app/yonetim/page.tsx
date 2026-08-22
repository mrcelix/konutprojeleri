import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { KpiKart, OranListesi, SutunGrafik } from '@/components/panel/Grafik';
import {
  aylikSeri, bolgePerformansi, degisim, huni, kpiHesapla, projePerformansi,
} from '@/lib/analitik';
import { prisma } from '@/lib/db';
import { TLkisa } from '@/lib/bicim';
import { telefonBicim } from '@/lib/talep';
import { donemAraligi, trGun, yonetimBaglam } from '@/lib/panel-baglam';
import { acikDemoVeri } from '@/lib/tohum';

export const dynamic = 'force-dynamic';

const DONEMLER = [['7g', '7 gün'], ['30g', '30 gün'], ['90g', '90 gün'], ['12a', '12 ay']] as const;

export default async function YonetimAnalitik(
  { searchParams }: { searchParams: Promise<{ d?: string }> },
) {
  const b = await yonetimBaglam();
  const { d } = await searchParams;
  const donem = d ?? '30g';
  const { baslangic, bitis, onceki, ad } = donemAraligi(donem);

  const [simdiki, gecmis, seri, huniAdimlari, projeler, bolgeler, sonTalepler, envanter]
    = await Promise.all([
      kpiHesapla(baslangic, bitis),
      kpiHesapla(onceki, baslangic),
      aylikSeri(12),
      huni(baslangic, bitis),
      projePerformansi(baslangic, bitis),
      bolgePerformansi(baslangic, bitis),
      prisma.talep.findMany({
        orderBy: { olusturma: 'desc' }, take: 8,
        select: {
          id: true, kod: true, ad: true, telefon: true, durum: true, niyet: true,
          olusturma: true,
          proje: { select: { ad: true, slug: true } },
        },
      }),
      prisma.$transaction([
        prisma.proje.count({ where: { yayinda: true } }),
        prisma.proje.count({ where: { yayinda: false } }),
        prisma.firma.count(),
        prisma.konusma.count({ where: { durum: 'ACIK' } }),
        prisma.daireTipi.count({ where: { yayinda: true } }),
      ]),
    ]);

  const [yayinda, pasif, firma, acikKonusma, daireTipi] = envanter;

  /* Yayına çıkarken en kolay unutulan şey demo veri: rakamlar dolu
     göründüğü için fark edilmiyor. Açık parti varsa üstte duruyor. */
  const demo = await acikDemoVeri();

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Analitik"
      aciklama={`${ad} · tüm envanter`}
      eylem={(
        <div className="chips" style={{ gap: 6 }}>
          {DONEMLER.map(([k, etiket]) => (
            <Link key={k} href={`/yonetim?d=${k}`} className={'chip btn-sm' + (donem === k ? ' on' : '')}
              style={{ height: 34 }}>
              {etiket}
            </Link>
          ))}
        </div>
      )}
    >
      {demo.kayit > 0 && (
        <div className="kart" style={{
          padding: '12px 16px', marginBottom: 14,
          borderColor: 'var(--accent)', background: 'var(--accent-100)',
        }}>
          <p className="small" style={{ margin: 0 }}>
            <b>Bu rakamlarda demo veri var.</b> {demo.parti} tohumlama partisi
            geri alınmamış ({demo.kayit} kayıt).{' '}
            <Link href="/yonetim/tohum">Demo veri sayfasından geri alın</Link>.
          </p>
        </div>
      )}

      {/* ---------- KPI ----------
          CİRO YOK: satış firmanın kendi ofisinde kapanıyor ve tutar
          bize hiç ulaşmıyor. Ölçülen tek şey huni. */}
      <div className="kpi-izgara">
        <KpiKart baslik="Talep" deger={String(simdiki.talep)}
          degisim={degisim(simdiki.talep, gecmis.talep)} alt="önceki döneme göre" />
        <KpiKart baslik="Satışa dönüşen" deger={String(simdiki.satis)}
          degisim={degisim(simdiki.satis, gecmis.satis)} alt="firma panele işlediği kadar" />
        <KpiKart baslik="Dönüşüm oranı" deger={`%${simdiki.donusumOrani}`}
          degisim={degisim(simdiki.donusumOrani, gecmis.donusumOrani)} alt="satış / talep" />
        <KpiKart baslik="Randevu" deger={String(simdiki.randevu)}
          degisim={degisim(simdiki.randevu, gecmis.randevu)} alt="yerinde görme talebi" />
        <KpiKart baslik="Ulaşılamama" deger={`%${simdiki.ulasilamamaOrani}`}
          degisim={degisim(simdiki.ulasilamamaOrani, gecmis.ulasilamamaOrani)}
          tersMi alt="düşük olması iyi" />
        {/* Yanıt süresi YAKLAŞIK: ayrı bir "ilk temas" damgası yok,
            `guncelleme` üzerinden ölçülüyor (bkz. lib/analitik.ts). */}
        <KpiKart baslik="Yanıt süresi (yaklaşık)"
          deger={simdiki.ortYanitSaati != null ? `${simdiki.ortYanitSaati} sa` : '—'}
          alt="talepten ilk temasa" />
        <KpiKart baslik="Tekil ziyaretçi" deger={simdiki.ziyaretci.toLocaleString('tr-TR')}
          degisim={degisim(simdiki.ziyaretci, gecmis.ziyaretci)} alt={`${simdiki.ziyaret} sayfa`} />
        <KpiKart baslik="Form dönüşümü" deger={`%${simdiki.formDonusumu}`}
          degisim={degisim(simdiki.formDonusumu, gecmis.formDonusumu)}
          alt="talep / tekil ziyaretçi" />
      </div>

      {/* ---------- Zaman serisi ---------- */}
      <section className="kart">
        <div className="kart-bas">
          <div>
            <h2>Son 12 ay</h2>
            <p>Aylık talep (sütun) ve satışa dönüşen (çizgi).</p>
          </div>
        </div>
        <SutunGrafik
          seri={seri.map((s) => ({ etiket: s.ay, deger: s.talep, ikincil: s.satis }))}
          ikincilAd="Satış" yukseklik={220}
        />
      </section>

      <div className="p-ikili">
        {/* ---------- Huni ---------- */}
        <section className="kart">
          <div className="kart-bas">
            <div>
              <h2>Satış hunisi</h2>
              <p>
                {ad} · adımlar KÜMÜLATİF: bir talep randevuya uğramadan da
                satışa dönüşebiliyor.
              </p>
            </div>
          </div>
          <OranListesi paraMi={false} satirlar={huniAdimlari.map((h) => ({
            ad: h.ad, deger: h.sayi, alt: `%${h.gecis} geçiş`,
          }))} bos="Bu dönemde talep yok." />
        </section>

        {/* ---------- Bölge kırılımı ---------- */}
        <section className="kart">
          <div className="kart-bas"><div><h2>Bölge kırılımı</h2><p>{ad} · talep</p></div></div>
          <OranListesi
            paraMi={false}
            satirlar={bolgeler.filter((x) => x.talep > 0).map((x) => ({
              ad: x.ad, deger: x.talep,
              alt: `${x.projeSayisi} proje · proje başına ${x.projeBasinaTalep}`,
            }))}
            bos="Bu dönemde bölgelerde talep yok."
          />
        </section>
      </div>

      <div className="p-ikili">
        {/* ---------- Proje performansı ---------- */}
        <section className="kart">
          <div className="kart-bas">
            <div>
              <h2>En çok talep alan projeler</h2>
              <p>
                {ad} · &quot;yayında gün&quot; ile birlikte okuyun: iki ay önce
                açılan bir projenin 40 talebi, iki yıllık bir projenin 60
                talebinden iyidir.
              </p>
            </div>
            <Link className="link-more" href="/yonetim/projeler">Tümü <Icon n="arrowR" s={15} /></Link>
          </div>
          {projeler.some((p) => p.talep > 0) ? (
            <div className="p-tablo-kap" style={{ border: 0 }}>
              <table className="p-tablo">
                <thead>
                  <tr>
                    <th>Proje</th><th>Bölge</th>
                    <th className="sayi">Talep</th><th className="sayi">Satış</th>
                    <th className="sayi">Dönüşüm</th><th className="sayi">Yayında</th>
                  </tr>
                </thead>
                <tbody>
                  {projeler.filter((p) => p.talep > 0).slice(0, 8).map((p) => (
                    <tr key={p.id}>
                      <td><Link href={`/proje/${p.slug}`} target="_blank">{p.ad}</Link></td>
                      <td className="muted">{p.bolge}</td>
                      <td className="sayi"><b>{p.talep}</b></td>
                      <td className="sayi">{p.satis}</td>
                      <td className="sayi">%{p.donusumOrani}</td>
                      <td className="sayi">{p.yayindaGun} gün</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted small">Bu dönemde talep yok.</p>}
        </section>

        {/* ---------- Son talepler ---------- */}
        <section className="kart">
          <div className="kart-bas">
            <div><h2>Son talepler</h2></div>
            <Link className="link-more" href="/yonetim/talepler">Tümü <Icon n="arrowR" s={15} /></Link>
          </div>
          {sonTalepler.length ? (
            <div className="p-tablo-kap" style={{ border: 0 }}>
              <table className="p-tablo">
                <thead>
                  <tr><th>Kod</th><th>Ad</th><th>Proje</th><th>Telefon</th><th>Durum</th></tr>
                </thead>
                <tbody>
                  {sonTalepler.map((t) => (
                    <tr key={t.id}>
                      <td><Link href="/yonetim/talepler">{t.kod}</Link></td>
                      <td>{t.ad}<div className="tiny dim">{trGun(t.olusturma)}</div></td>
                      <td className="muted">{t.proje?.ad ?? <span className="dim">genel</span>}</td>
                      <td className="tiny">{telefonBicim(t.telefon)}</td>
                      <td><span className={`durum durum-${t.durum}`}>{t.durum.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted small">Henüz talep yok.</p>}
        </section>
      </div>

      {/* ---------- Envanter ---------- */}
      <section className="kart">
        <div className="kart-bas"><div><h2>Envanter</h2></div></div>
        <OranListesi paraMi={false} satirlar={[
          { ad: 'Yayındaki proje', deger: yayinda },
          { ad: 'Pasif proje', deger: pasif },
          { ad: 'Yayındaki daire tipi', deger: daireTipi },
          { ad: 'Firma', deger: firma },
          { ad: 'Açık soru', deger: acikKonusma },
          { ad: 'Dört saati geçen talep', deger: b.isler.gecikenTalep },
          { ad: 'Bekleyen randevu', deger: b.isler.bekleyenRandevu },
        ]} />
        <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
          <Link className="btn btn-ghost btn-sm" href="/yonetim/projeler">
            <Icon n="building" s={15} /> Projeler
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/yonetim/talepler">
            <Icon n="phone" s={15} /> Talepler
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/yonetim/kullanicilar">
            <Icon n="users" s={15} /> Kullanıcılar
          </Link>
        </div>
      </section>
    </PanelKabuk>
  );
}
