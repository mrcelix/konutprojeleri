import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import MetinDuzenle from '@/components/panel/MetinDuzenle';
import { prisma } from '@/lib/db';
import {
  METIN_ANAHTARLARI, METIN_GRUPLARI, metinTanimi, varsayilanMetin,
} from '@/lib/metin-kayit';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YonetimMetinler(
  { searchParams }: { searchParams: Promise<{ dil?: string; grup?: string }> },
) {
  const b = await yonetimBaglam();
  const { dil: dilParam, grup } = await searchParams;
  const dil = dilParam === 'EN' ? 'EN' as const : 'TR' as const;

  const uzerineYazmalar = await prisma.metin.findMany({
    where: { dil },
    select: { anahtar: true, deger: true },
  });
  const harita = new Map(uzerineYazmalar.map((m) => [m.anahtar, m.deger]));

  const gruplar = grup ? METIN_GRUPLARI.filter((g) => g === grup) : METIN_GRUPLARI;
  const ozelSayisi = METIN_ANAHTARLARI.filter((a) => harita.has(a)).length;

  const bag = (yeniDil: 'TR' | 'EN', yeniGrup?: string) => {
    const p = new URLSearchParams();
    if (yeniDil === 'EN') p.set('dil', 'EN');
    if (yeniGrup) p.set('grup', yeniGrup);
    const qs = p.toString();
    return `/yonetim/metinler${qs ? `?${qs}` : ''}`;
  };

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Sayfa metinleri"
      aciklama={`${METIN_ANAHTARLARI.length} metin · ${ozelSayisi} tanesi düzenlenmiş`}
      eylem={
        <Link className="btn btn-ghost btn-sm" href="/yonetim/sayfalar">
          <Icon n="grid" s={15} /> Kurumsal sayfalar
        </Link>
      }
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Buradaki metinler sayfalara serpiştirilmiş kısa parçalar (hero
          başlığı, bölüm spotu, alt bilgi). Her birinin kod içinde bir
          varsayılanı var; <b>varsayılana dön</b> düzenlemeyi siliyor.
          Kaydettiğiniz metin birkaç saniye içinde yayına giriyor.
        </p>
      </div>

      <div className="chips">
        {(['TR', 'EN'] as const).map((d) => (
          <Link key={d} href={bag(d, grup)} className={'chip' + (dil === d ? ' on' : '')}>
            {d === 'TR' ? 'Türkçe' : 'İngilizce'}
          </Link>
        ))}
      </div>

      <div className="chips" style={{ marginTop: 8 }}>
        <Link href={bag(dil)} className={'chip' + (!grup ? ' on' : '')}>Tümü</Link>
        {METIN_GRUPLARI.map((g) => (
          <Link key={g} href={bag(dil, g)} className={'chip' + (grup === g ? ' on' : '')}>{g}</Link>
        ))}
      </div>

      {gruplar.map((g) => (
        <section className="p-kart" key={g} style={{ marginTop: 16 }}>
          <h2 className="h3">{g}</h2>
          <div className="metin-liste">
            {METIN_ANAHTARLARI.filter((a) => metinTanimi(a).grup === g).map((a) => (
              <MetinDuzenle
                key={`${a}-${dil}`}
                dil={dil}
                satir={{
                  anahtar: a,
                  etiket: metinTanimi(a).etiket,
                  ipucu: metinTanimi(a).ipucu,
                  tip: metinTanimi(a).tip,
                  varsayilan: varsayilanMetin(a, dil === 'EN' ? 'en' : 'tr'),
                  deger: harita.get(a) ?? null,
                }}
              />
            ))}
          </div>
        </section>
      ))}
    </PanelKabuk>
  );
}
