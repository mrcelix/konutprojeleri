import Link from 'next/link';
import type { Metadata } from 'next';
import {
  karsilastirVerisi, tipSecenekleri, aylikSenet, gerekenPesinat,
  sicilPuani, ceyrekPuani, kazananIndeks, AZAMI,
  type KarsiProje, type Yon,
} from '@/lib/queries/karsilastir';
import { daireTipiCoz, daireTipiSlug } from '@/lib/routing';
import { OZELLIKLER } from '@/lib/filtre';
import { para, alan, teslim, m2Birim, yurumeSuresi } from '@/lib/format';
import { sepetOku } from '@/lib/sepet';

/**
 * /karsilastir/proje-a+proje-b+proje-c
 *
 * Bugünkü sitede karşılaştırma var ama arayüzde görünmüyor. Burada
 * kalıcı bir adres: bağlantı paylaşılabilir, geri tuşu çalışır.
 *
 * ARAMA MOTORUNA KAPALI. Kombinasyon sayısı kombinatoryal; her permütasyon
 * indekslenirse aynı içerik binlerce adreste görünür. Faceted arama için
 * kurulan beyaz liste mantığının aynısı burada da geçerli — fark şu ki
 * burada indekslenmeye değer tek bir kombinasyon bile yok.
 */

export const revalidate = 900;

const AYIRICI = '+';

type Props = {
  params: Promise<{ dilim?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function sluglariCoz(dilim: string[] | undefined): string[] {
  if (!dilim?.length) return [];
  // Hem /a+b+c hem /a/b/c kabul edilir; ikisi de aynı sayfaya çıkar.
  return dilim
    .flatMap((d) => decodeURIComponent(d).split(AYIRICI))
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sluglar = sluglariCoz((await params).dilim);
  if (sluglar.length === 0) {
    return {
      title: 'Proje Karşılaştırma',
      description:
        'Dört projeye kadar yan yana karşılaştırın: fiyat, m² birim fiyatı, ' +
        'aylık taksit, teslim tarihi, şantiye durumu, aidat ve firma sicili.',
      alternates: { canonical: '/karsilastir' },
    };
  }
  const projeler = await karsilastirVerisi(sluglar).catch(() => []);
  return {
    title: projeler.length
      ? `${projeler.map((p) => p.ad).join(' · ')} karşılaştırması`
      : 'Proje Karşılaştırma',
    // Kombinasyon uzayı sonsuz; hiçbiri indekslenmemeli.
    robots: { index: false, follow: true },
  };
}

/** Bir ölçüt satırı. Değerler ham (sıralanabilir), gösterim ayrı. */
type Satir = {
  ad: string;
  yon: Yon;
  ham: (number | null)[];
  goster: (string | null)[];
  not?: string;
  tik?: boolean; // var/yok satırı
};

export default async function KarsilastirSayfasi({ params, searchParams }: Props) {
  const yoldan = sluglariCoz((await params).dilim);
  const q = await searchParams;
  const tipHam = Array.isArray(q.tip) ? q.tip[0] : q.tip;

  // Adreste proje yoksa sepete düşülür: /karsilastir tek başına da anlamlı.
  const sluglar = yoldan.length ? yoldan : await sepetOku();

  const projeler = sluglar.length
    ? await karsilastirVerisi(sluglar).catch(() => [])
    : [];

  if (projeler.length === 0) {
    return (
      <main className="kp-wrap" style={{ paddingBlock: 'var(--s-6)' }}>
        <h1 className="kp-h1">Proje karşılaştırma</h1>
        <p className="kp-lead" style={{ maxWidth: 620 }}>
          Dört projeye kadar yan yana koyabilirsiniz: fiyat, m² birim fiyatı,
          aylık taksit, teslim tarihi, şantiye durumu, aidat, metroya yürüme
          süresi ve firmanın teslim sicili tek tabloda.
        </p>
        <div className="kp-card kp-empty" style={{ marginTop: 'var(--s-4)' }}>
          <p className="kp-empty__title">
            {sluglar.length > 0
              ? 'Bu adreslerdeki projeler bulunamadı'
              : 'Henüz karşılaştırmaya proje eklenmedi'}
          </p>
          <p className="kp-empty__text">
            Arama sonuçlarındaki ve proje sayfalarındaki “Karşılaştır”
            bağlantısıyla proje ekleyin.
          </p>
          <Link href="/istanbul-konut-projeleri" className="kp-empty__option is-primary">
            Projelere göz atın
          </Link>
        </div>
      </main>
    );
  }

  const secenekler = tipSecenekleri(projeler);
  const secili = (tipHam ? daireTipiCoz(tipHam) : null) ?? secenekler[0] ?? null;

  /** Seçili daire tipinin o projedeki karşılığı; yoksa null. */
  const tipi = (p: KarsiProje) => p.tipler.find((t) => t.tip === secili) ?? null;

  const fiyatlar = projeler.map((p) => tipi(p)?.liste_fiyati ?? null);
  const yol = (liste: KarsiProje[]) =>
    `/karsilastir/${liste.map((p) => p.slug).join(AYIRICI)}` +
    (secili ? `?tip=${daireTipiSlug(secili)}` : '');

  const ozellikSatirlari: Satir[] = Object.entries(OZELLIKLER)
    // Yalnızca en az bir projede bulunan özellikler gösterilir; hepsinde
    // yok olan 14 satır tabloyu şişirir, hiçbir karar değiştirmez.
    .filter(([k]) => projeler.some((p) => p.ozellikler?.[k]))
    .map(([k, ad]) => ({
      ad,
      yon: 'yok' as Yon,
      ham: projeler.map(() => null),
      goster: projeler.map((p) => (p.ozellikler?.[k] ? 'Var' : 'Yok')),
      tik: true,
    }));

  const satirlar: Satir[] = [
    {
      ad: secili ? `${secili} başlangıç fiyatı` : 'Başlangıç fiyatı',
      yon: 'kucuk',
      ham: fiyatlar,
      goster: fiyatlar.map((f) => para(f)),
      not: 'Liste fiyatı; harç, KDV farkı ve demirbaş hariç.',
    },
    {
      ad: 'm² birim fiyatı',
      yon: 'kucuk',
      ham: projeler.map((p) => tipi(p)?.m2_birim ?? null),
      goster: projeler.map((p) => {
        const t = tipi(p);
        return m2Birim(t?.liste_fiyati ?? null, t?.net_m2 ?? null);
      }),
    },
    {
      ad: 'Net alan',
      yon: 'buyuk',
      ham: projeler.map((p) => tipi(p)?.net_m2 ?? null),
      goster: projeler.map((p) => alan(tipi(p)?.net_m2 ?? null)),
    },
    {
      ad: 'Peşinat',
      yon: 'kucuk',
      ham: projeler.map((p, i) => gerekenPesinat(p, fiyatlar[i] ?? null)),
      goster: projeler.map((p, i) => para(gerekenPesinat(p, fiyatlar[i] ?? null))),
      not: 'Firmanın beyan ettiği peşinat oranına göre.',
    },
    {
      ad: 'Aylık taksit',
      yon: 'kucuk',
      ham: projeler.map((p, i) => aylikSenet(p, fiyatlar[i] ?? null)),
      goster: projeler.map((p, i) => {
        const s = aylikSenet(p, fiyatlar[i] ?? null);
        return s == null ? null : `${para(s)} × ${p.vade_ay} ay`;
      }),
      not: 'Senetli plan; faiz eklenmez, banka kredisi değildir.',
    },
    {
      ad: 'Teslim',
      yon: 'kucuk',
      ham: projeler.map((p) => ceyrekPuani(p.teslim_ceyrek)),
      goster: projeler.map((p) => teslim(p.teslim_ceyrek)),
    },
    {
      ad: 'Şantiye durumu',
      yon: 'buyuk',
      ham: projeler.map((p) => p.santiye_yuzde),
      goster: projeler.map((p) => (p.santiye_yuzde == null ? null : `%${p.santiye_yuzde}`)),
    },
    {
      ad: 'Aidat',
      yon: 'kucuk',
      ham: projeler.map((p) => p.aidat),
      goster: projeler.map((p) => (p.aidat == null ? null : `${para(p.aidat)} / ay`)),
    },
    {
      ad: 'Metroya yürüme',
      yon: 'kucuk',
      ham: projeler.map((p) => p.metro_m),
      goster: projeler.map((p) => yurumeSuresi(p.metro_m)),
    },
    {
      ad: 'Firma sicili',
      yon: 'buyuk',
      ham: projeler.map((p) => sicilPuani(p.sicil)),
      goster: projeler.map((p) => (p.sicil ? `${p.firma_ad} · ${p.sicil}` : p.firma_ad)),
      not: 'İki tamamlanmış projeden azı olan firmaya not verilmez.',
    },
    {
      ad: 'Ort. teslim gecikmesi',
      yon: 'kucuk',
      ham: projeler.map((p) => p.ort_gecikme),
      goster: projeler.map((p) =>
        p.ort_gecikme == null
          ? null
          : `${p.ort_gecikme.toFixed(1).replace('.', ',')} ay`
      ),
      not: 'Sektör ortalaması 2,7 ay.',
    },
    {
      ad: secili ? `Kalan daire (${secili})` : 'Kalan daire',
      yon: 'buyuk',
      ham: projeler.map((p) => tipi(p)?.kalan_adet ?? null),
      goster: projeler.map((p) => {
        const k = tipi(p)?.kalan_adet;
        return k == null ? null : String(k);
      }),
    },
    ...ozellikSatirlari,
  ];

  const stil = { '--k': projeler.length } as React.CSSProperties;
  const eksikTip = projeler.filter((p) => secili && !tipi(p));

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-5)' }}>
      <header style={{ maxWidth: 660, marginBottom: 'var(--s-4)' }}>
        <h1 className="kp-h1">Karşılaştırma</h1>
        <p className="kp-lead">
          {projeler.length} proje yan yana. Her satırda en avantajlı değer
          işaretlendi — ama “en iyi” sizin önceliğinize göre değişir.
        </p>
      </header>

      {/* Daire tipi seçimi — karşılaştırma ancak aynı tip üzerinden anlamlı */}
      {secenekler.length > 1 && (
        <div className="ks-tipler">
          <span className="kp-label">Daire tipi</span>
          {secenekler.map((t) => (
            <Link
              key={t}
              href={`/karsilastir/${projeler.map((p) => p.slug).join(AYIRICI)}?tip=${daireTipiSlug(t)}`}
              className={`kp-chip${t === secili ? ' is-selected' : ''}`}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      {eksikTip.length > 0 && (
        <p className="tk-ozet">
          <b>{eksikTip.map((p) => p.ad).join(', ')}</b> projesinde {secili} tipi
          bulunmuyor; o sütunlarda fiyat ve alan satırları boş kalır.
        </p>
      )}

      <div className="ks-kaydir">
        <div className="ks" style={stil}>

          {/* ── Sütun başlıkları ── */}
          <div className="ks-satir ks-basliklar">
            <div className="ks-etiket ks-etiket--bos">
              <span className="kp-label">{projeler.length} proje karşılaştırılıyor</span>
            </div>
            {projeler.map((p) => (
              <div className="ks-hucre ks-kart" key={p.id}>
                <Link href={`/${p.il}/${p.ilce}/${p.slug}`} className="ks-kart__ad">
                  <b>{p.ad}</b>
                  <span>{p.ilce}{p.mahalle ? ` / ${p.mahalle}` : ''}</span>
                </Link>
                {projeler.length > 1 && (
                  <Link
                    href={yol(projeler.filter((x) => x.id !== p.id))}
                    className="ks-cikar"
                  >
                    × Karşılaştırmadan çıkar
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* ── Ölçüt satırları ── */}
          {satirlar.map((s) => {
            const kazanan = kazananIndeks(s.ham, s.yon);
            return (
              <div className="ks-satir" key={s.ad}>
                <div className="ks-etiket">
                  {s.ad}
                  {s.not && <i>{s.not}</i>}
                </div>
                {s.goster.map((g, i) => (
                  <div
                    key={i}
                    className={
                      'ks-hucre' +
                      (i === kazanan ? ' is-kazanan' : '') +
                      (s.tik ? (g === 'Var' ? ' is-var' : ' is-yok') : '')
                    }
                  >
                    {g ?? <span className="ks-bos">—</span>}
                  </div>
                ))}
              </div>
            );
          })}

          {/* ── Eylem satırı ── */}
          <div className="ks-satir ks-eylem">
            <div className="ks-etiket ks-etiket--bos" />
            {projeler.map((p) => (
              <div className="ks-hucre" key={p.id}>
                <Link href={`/${p.il}/${p.ilce}/${p.slug}#bilgi`} className="kp-btn is-small">
                  Bilgi iste
                </Link>
              </div>
            ))}
          </div>

        </div>
      </div>

      <p className="ks-uyari">
        İşaretler tek tek satır bazındadır ve öneri değildir: en ucuz projenin
        teslimi en uzak, teslimi en yakın projenin m² fiyatı en yüksek olabilir.
        Öncelik sırasını siz belirlersiniz. Boş hücreler veri girilmediğini
        gösterir; “yok” anlamına gelmez.
        {projeler.length < AZAMI && (
          <>
            {' '}Karşılaştırmaya {AZAMI - projeler.length} proje daha
            ekleyebilirsiniz.
          </>
        )}
      </p>

      <p className="kp-body" style={{ marginTop: 'var(--s-3)' }}>
        Bu sayfa yazdırmaya uygundur; tarayıcınızın yazdır menüsünden
        (Ctrl/⌘ + P) PDF olarak kaydedebilirsiniz. Adres kalıcıdır, olduğu
        gibi paylaşabilirsiniz.
      </p>
    </main>
  );
}
