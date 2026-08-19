import Link from 'next/link';
import type { Metadata } from 'next';
import {
  takvimVerisi, takvimIlleri, eksenDisi, gecikenler, ceyrekListesi, ceyrekAdi,
} from '@/lib/queries/takvim';
import { Takvim, yogunCeyrek } from '@/components/takvim/Takvim';
import { DAIRE_TIPLERI, type Filtre } from '@/lib/filtre';

/**
 * /teslim-takvimi
 *
 * Sitenin dördüncü giriş kapısı: konum, fiyat ve harita değil ZAMAN.
 * "Eylül 2027'de taşınmam lazım" diyen kullanıcı için hiçbir Türk
 * portalında karşılığı olmayan bir başlangıç noktası.
 *
 * Sayfa tamamen sunucuda çizilir; JavaScript olmadan da çalışır.
 */

export const revalidate = 3600;

const CEYREK_SAYISI = 10; // ~2,5 yıl. Daha uzağı ilan değil temenni.

export const metadata: Metadata = {
  title: 'Teslim Takvimi — Hangi Proje Ne Zaman Teslim Ediliyor',
  description:
    'Satıştaki yeni konut projelerinin teslim tarihleri tek bir zaman ekseninde. ' +
    'Şantiye ilerlemesi, çeyrek başına teslim edilen daire sayısı ve arz ' +
    'yoğunluğuyla birlikte.',
  alternates: { canonical: '/teslim-takvimi' },
};

const IL_ADLARI: Record<string, string> = {
  istanbul: 'İstanbul', ankara: 'Ankara', izmir: 'İzmir',
  bursa: 'Bursa', antalya: 'Antalya', kocaeli: 'Kocaeli',
};
const ilAdi = (s: string) => IL_ADLARI[s] ?? s.charAt(0).toUpperCase() + s.slice(1);

const BUTCELER = [
  { deger: 3_000_000, ad: '3 milyon ₺ altı' },
  { deger: 5_000_000, ad: '5 milyon ₺ altı' },
  { deger: 8_000_000, ad: '8 milyon ₺ altı' },
];

/** Bu sayfada il de sorgu dizesinde taşınır; yol yardımcısı yerel. */
function yol(f: Filtre, degis: Partial<Filtre>): string {
  const y = { ...f, ...degis };
  const p = new URLSearchParams();
  if (y.il) p.set('il', y.il);
  if (y.daireTipi?.length) p.set('tip', y.daireTipi.join(','));
  if (y.maxFiyat) p.set('maxf', String(y.maxFiyat));
  const s = p.toString();
  return '/teslim-takvimi' + (s ? `?${s}` : '');
}

type Arama = Record<string, string | string[] | undefined>;
const tek = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TakvimSayfasi({
  searchParams,
}: {
  searchParams: Promise<Arama>;
}) {
  const q = await searchParams;
  const tipHam = tek(q.tip);
  const maxfHam = Number(tek(q.maxf));

  const filtre: Filtre = {
    il: tek(q.il),
    daireTipi: tipHam
      ? tipHam.split(',').filter((t) => DAIRE_TIPLERI.includes(t))
      : undefined,
    maxFiyat: Number.isFinite(maxfHam) && maxfHam > 0 ? maxfHam : undefined,
  };

  const ceyrekler = ceyrekListesi(CEYREK_SAYISI);

  const [veri, iller, disarida, geciken] = await Promise.all([
    takvimVerisi(filtre, CEYREK_SAYISI).catch(() => null),
    takvimIlleri(CEYREK_SAYISI).catch(() => []),
    eksenDisi(filtre, CEYREK_SAYISI).catch(() => 0),
    gecikenler(filtre).catch(() => []),
  ]);

  const yogun = veri ? yogunCeyrek(veri.histogram) : null;
  const bicim = new Intl.NumberFormat('tr-TR');
  const temiz = !filtre.il && !filtre.daireTipi && !filtre.maxFiyat;

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-5)' }}>
      <header style={{ maxWidth: 640, marginBottom: 'var(--s-5)' }}>
        <h1 className="kp-h1">Teslim takvimi</h1>
        <p className="kp-lead">
          Konumdan değil tarihten başlayın. Satıştaki projeler teslim
          çeyreklerine göre tek eksende; şantiye ilerlemeleri ve her çeyrekte
          piyasaya çıkan daire sayısıyla birlikte.
        </p>
      </header>

      {/* ── Süzgeçler ── */}
      <nav className="tk-suzgec" aria-label="Takvim süzgeçleri">
        <div className="tk-suzgec__grup">
          <span className="kp-label">Şehir</span>
          {iller.map((i) => (
            <Link
              key={i.il}
              href={yol(filtre, { il: filtre.il === i.il ? undefined : i.il })}
              className={`kp-chip${filtre.il === i.il ? ' is-selected' : ''}`}
            >
              {ilAdi(i.il)} <em>{i.n}</em>
            </Link>
          ))}
        </div>

        <div className="tk-suzgec__grup">
          <span className="kp-label">Daire tipi</span>
          {DAIRE_TIPLERI.map((t) => {
            const secili = filtre.daireTipi?.includes(t) ?? false;
            const yeni = secili
              ? filtre.daireTipi!.filter((x) => x !== t)
              : [...(filtre.daireTipi ?? []), t];
            return (
              <Link
                key={t}
                href={yol(filtre, { daireTipi: yeni.length ? yeni : undefined })}
                className={`kp-chip${secili ? ' is-selected' : ''}`}
              >
                {t}
              </Link>
            );
          })}
        </div>

        <div className="tk-suzgec__grup">
          <span className="kp-label">Bütçe</span>
          {BUTCELER.map((b) => (
            <Link
              key={b.deger}
              href={yol(filtre, {
                maxFiyat: filtre.maxFiyat === b.deger ? undefined : b.deger,
              })}
              className={`kp-chip${filtre.maxFiyat === b.deger ? ' is-selected' : ''}`}
            >
              {b.ad}
            </Link>
          ))}
          {!temiz && (
            <Link href="/teslim-takvimi" className="kp-chip tk-temizle">
              Süzgeçleri temizle
            </Link>
          )}
        </div>
      </nav>

      {/* ── Okuma ── */}
      {veri && veri.toplamProje > 0 && (
        <p className="tk-ozet">
          <b>{bicim.format(veri.toplamProje)} proje</b> ·{' '}
          {bicim.format(veri.toplamDaire)} daire · {ceyrekAdi(ceyrekler[0]!)} –{' '}
          {ceyrekAdi(ceyrekler.at(-1)!)}
          {disarida > 0 && <> · {disarida} proje daha uzak tarihli, eksene sığmıyor</>}
        </p>
      )}

      {yogun && (
        <div className="tk-okuma">
          <b>{ceyrekAdi(yogun.ceyrek)}</b> bu eksenin en yoğun çeyreği:{' '}
          {bicim.format(yogun.proje)} projede {bicim.format(yogun.daire)} daire
          aynı dönemde teslim ediliyor. Arzın yoğunlaştığı çeyreklerde alıcının
          pazarlık gücü artar — teslim tarihiniz esnekse dikkate değer.
        </div>
      )}

      {/* ── Eksen ── */}
      {!veri || veri.projeler.length === 0 ? (
        <div className="kp-card kp-empty">
          <p className="kp-empty__title">
            Bu süzgeçlerle önümüzdeki {CEYREK_SAYISI} çeyrekte teslim edilecek
            proje bulunamadı
          </p>
          <p className="kp-empty__text">
            Süzgeçleri gevşetin ya da tüm projeleri listede inceleyin.
            {disarida > 0 && ` ${disarida} proje daha uzak tarihli.`}
          </p>
          <Link href="/teslim-takvimi" className="kp-empty__option is-primary">
            Süzgeçleri temizle
          </Link>
        </div>
      ) : (
        <Takvim
          ceyrekler={ceyrekler}
          projeler={veri.projeler}
          histogram={veri.histogram}
        />
      )}

      {/* ── Teslim tarihi geçmiş projeler ── */}
      {geciken.length > 0 && (
        <section style={{ marginTop: 'var(--s-6)' }}>
          <h2 className="kp-h3">Teslim tarihi geçmiş, hâlâ satışta</h2>
          <p className="kp-body" style={{ maxWidth: '68ch', marginBottom: 'var(--s-3)' }}>
            Bu projelerin beyan edilen teslim çeyreği geride kaldı ama ilanları
            sürüyor. Eksene sığmadıkları için ayrı listeleniyorlar — takvimden
            düşürmek, gecikmeyi görünmez kılmak olurdu.
          </p>
          <ul className="tk-geciken">
            {geciken.map((p) => (
              <li key={p.id}>
                <Link href={`/${p.il}/${p.ilce}/${p.slug}`}>
                  <b>{p.ad}</b>
                  <span>{p.firma_ad} · {p.ilce}</span>
                </Link>
                <span className="kp-pill is-danger">
                  {p.gecikme_ay} ay geçti
                </span>
                <em>beyan: {ceyrekAdi(p.teslim_ceyrek)}</em>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Not ── */}
      <section className="kp-card" style={{ marginTop: 'var(--s-6)', maxWidth: 720 }}>
        <h2 className="kp-h3">Teslim tarihleri neye göre</h2>
        <p className="kp-body">
          Tarihler firmanın satış sözleşmesinde ya da tanıtımında beyan ettiği
          teslim çeyreğidir; taahhüt değildir. Bir firmanın geçmişte bu tarihlere
          ne kadar uyduğunu <Link href="/firmalar">firma karnelerinde</Link>{' '}
          görebilirsiniz — sektör ortalaması <b>2,7 ay</b> gecikmedir.
        </p>
        <p className="kp-body">
          Teslim tarihi değişen projelerde eski tarih arşivde tutulur ve karneye
          işlenir. Yanlış gördüğünüz bir tarihi{' '}
          <Link href="/duzeltme">düzeltme formundan</Link> bildirebilirsiniz.
        </p>
      </section>
    </main>
  );
}
