import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import SayfaEylem from '@/components/panel/SayfaEylem';
import { prisma } from '@/lib/db';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YonetimSayfalar() {
  const b = await yonetimBaglam();

  const sayfalar = await prisma.sayfa.findMany({
    orderBy: [{ dil: 'asc' }, { slug: 'asc' }],
    select: {
      id: true, slug: true, dil: true, baslik: true, h1: true,
      yayinda: true, indexle: true, guncelleme: true,
      guncelleyen: { select: { ad: true } },
    },
  });

  const yayinda = sayfalar.filter((s) => s.yayinda).length;

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Kurumsal sayfalar"
      aciklama={`${sayfalar.length} sayfa · ${yayinda} yayında`}
      eylem={
        <>
          <Link className="btn btn-ghost btn-sm" href="/yonetim/metinler">
            <Icon n="sliders" s={15} /> Sayfa metinleri
          </Link>
          <Link className="btn btn-primary btn-sm" href="/yonetim/sayfalar/yeni">
            <Icon n="plus" s={15} sw={2.2} /> Yeni sayfa
          </Link>
        </>
      }
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Nasıl çalışır, KVKK, iletişim gibi metin sayfaları. Villa ve bölge
          sayfaları buradan yönetilmiyor — onlar envanterden geliyor.
          Yeni açılan bir sayfanın <b>diğer dildeki karşılığı otomatik
          bağlanmıyor</b>; hreflang için geliştiriciye haber verin.
        </p>
      </div>

      <div className="p-tablo-kap">
        <table className="p-tablo">
          <thead>
            <tr>
              <th>Sayfa</th><th>Adres</th><th>Dil</th>
              <th>Dizin</th><th>Son güncelleme</th><th>Durum</th><th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {sayfalar.map((s) => {
              const yol = s.dil === 'EN' ? `/en/${s.slug}` : `/${s.slug}`;
              return (
                <tr key={s.id}>
                  <td>
                    <b style={{ fontSize: 13.4 }}>{s.h1}</b>
                    <div className="tiny dim">{s.baslik}</div>
                  </td>
                  <td className="tiny">
                    <code>{yol}</code>
                  </td>
                  <td className="tiny">{s.dil === 'EN' ? 'İngilizce' : 'Türkçe'}</td>
                  <td className="tiny muted">
                    {s.indexle ? 'açık' : <span style={{ color: 'var(--danger)' }}>noindex</span>}
                  </td>
                  <td className="tiny muted">
                    {trTarihSaat(s.guncelleme)}
                    <div className="dim">{s.guncelleyen?.ad ?? 'sistem'}</div>
                  </td>
                  <td>
                    <span className={`durum durum-${s.yayinda ? 'YAYINDA' : 'PASIF'}`}>
                      {s.yayinda ? 'Yayında' : 'Taslak'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <Link className="btn btn-ghost btn-sm" href={`/yonetim/sayfalar/${s.id}`}>
                        <Icon n="sliders" s={14} /> Düzenle
                      </Link>
                      <SayfaEylem id={s.id} yayinda={s.yayinda} baslik={s.h1} />
                      {s.yayinda && (
                        <Link className="btn btn-quiet btn-sm" href={yol} target="_blank"
                          aria-label={`${s.h1} sayfasını yeni sekmede aç`}>
                          <Icon n="arrowR" s={14} />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PanelKabuk>
  );
}
