import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import MenuFormu, { MenuEylem, MenuVarsayilan, type UstSecenek } from '@/components/panel/MenuEylem';
import { menuListesi } from '@/lib/menu-kayit';
import { yonetimBaglam } from '@/lib/panel-baglam';

export const dynamic = 'force-dynamic';

export default async function YonetimMenu() {
  const { kullanici, nav, kok } = await yonetimBaglam();
  const ogeler = await menuListesi('BASLIK');

  /* Ağaç sırayla düzleştiriliyor: liste ekranda hiyerarşiyi girinti
     ile gösteriyor, ayrı bir iç içe bileşen kurmak gerekmiyor. */
  const altlar = new Map<string, typeof ogeler>();
  for (const o of ogeler) {
    if (!o.ustId) continue;
    altlar.set(o.ustId, [...(altlar.get(o.ustId) ?? []), o]);
  }
  const ustler = ogeler.filter((o) => !o.ustId);

  type Satir = (typeof ogeler)[number] & { duzey: number; ilkMi: boolean; sonMu: boolean };
  const duz: Satir[] = [];
  const yerlestir = (liste: typeof ogeler, duzey: number) => {
    liste.forEach((o, i) => {
      duz.push({ ...o, duzey, ilkMi: i === 0, sonMu: i === liste.length - 1 });
      yerlestir(altlar.get(o.id) ?? [], duzey + 1);
    });
  };
  yerlestir(ustler, 0);

  /* Üst öge seçeneği: kendisi ve altları hariç tutulmuyor çünkü form
     zaten kendini eliyor; iki düzeyden derin ağaç desteklenmiyor. */
  const ustSecenekler: UstSecenek[] = duz
    .filter((o) => o.duzey < 2)
    .map((o) => ({ id: o.id, ad: o.ad, duzey: o.duzey }));

  const DUZEY_ADI = ['Menü ögesi', 'Panel sütunu', 'Sütun bağlantısı'];

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Başlık menüsü"
      aciklama={ogeler.length ? `${ogeler.length} öge` : 'Menü tabloya aktarılmamış'}
      eylem={<Link className="btn btn-ghost btn-sm" href="/">Siteyi gör</Link>}
    >
      <div className="kart" style={{ padding: '14px 16px', marginBottom: 16 }}>
        <p className="small muted" style={{ margin: 0 }}>
          Üç düzey var: <b>menü ögesi</b> → <b>panel sütunu</b> →{' '}
          <b>sütun bağlantısı</b>. Düzeyi “üst öge” seçimi belirliyor.
          Bir ögeyi <b>mega panel</b> işaretlerseniz altına eklediğiniz kayıtlar
          sütun, onların altındakiler bağlantı olur.
          {ogeler.length === 0 && (
            <> <b>Tablo boşken site koddaki varsayılan menüyü gösteriyor</b> —
              düzenlemeye başlamak için aşağıdan aktarın.</>
          )}
        </p>
      </div>

      {ogeler.length === 0 && (
        <div className="kart" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 6px' }}>Başlangıç</h2>
          <p className="small muted" style={{ margin: '0 0 12px' }}>
            Şu an yayında olan menü koddan geliyor. Aşağıdaki düğme onu olduğu
            gibi tabloya yazar; sonrasında her ögeyi buradan düzenleyebilirsiniz.
          </p>
          <MenuVarsayilan />
        </div>
      )}

      <section className="kart" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 'var(--t-md)', margin: '0 0 12px' }}>Yeni öge</h2>
        <MenuFormu ustler={ustSecenekler} />
      </section>

      {duz.length > 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          {duz.map((o) => (
            <article className="kart" key={o.id}
              style={{ marginLeft: o.duzey * 24, opacity: o.aktif ? 1 : 0.55 }}>
              <div className="teklif-satir-bas">
                <div style={{ minWidth: 0 }}>
                  <span className="tiny dim">
                    {DUZEY_ADI[o.duzey] ?? 'Bağlantı'}
                    {o.mega && ' · mega panel'}
                    {!o.aktif && ' · gizli'}
                  </span>
                  <b style={{ display: 'block', fontSize: 'var(--t-sm)' }}>{o.ad}</b>
                  <div className="tiny dim">
                    {o.yol ?? <span>adres yok (başlık)</span>}
                    {o.ikon && ` · ikon: ${o.ikon}`}
                    {o.not && ` · not: ${o.not}`}
                  </div>
                </div>
                <MenuEylem id={o.id} aktif={o.aktif} ilkMi={o.ilkMi} sonMu={o.sonMu} />
              </div>

              <div style={{ marginTop: 10 }}>
                <MenuFormu ustler={ustSecenekler} o={o} />
              </div>
            </article>
          ))}
        </div>
      )}

      {duz.length === 0 && (
        <div className="p-bos">
          <Icon n="sliders" s={26} />
          <p>Menü tablosu boş. Site koddaki varsayılanı gösteriyor.</p>
        </div>
      )}
    </PanelKabuk>
  );
}
