import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/Icon';
import SearchBar from '@/components/SearchBar';
import SonBakilan from '@/components/SonBakilan';
import ProjeKart from '@/components/ProjeKart';
import HeroGosteri from '@/components/HeroGosteri';
import GuvenSeridi from '@/components/GuvenSeridi';
import KanitSeridi from '@/components/KanitSeridi';
import { metinler } from '@/lib/icerik';
import { kanitOzeti } from '@/lib/kanit';
import { heroKareleri } from '@/lib/hero';
import { TLkisa, TIP_ADI, teslimCeyrek } from '@/lib/bicim';
import {
  getBolgeler, getFirmalar, getLandingKombinasyonlari, getLandingOzellikler,
  getProjeler, getVitrinProjeler,
} from '@/lib/queries';
import { meta } from '@/lib/seo';
import { site } from '@/lib/site';
import type { ProjeTipi } from '@/lib/types';
import { TIP_VITRIN_LISTESI } from '@/lib/tip-vitrin';

export const revalidate = 1800;

export const metadata = meta({
  baslik: `${site.ad} — ${site.slogan}`,
  aciklama: site.aciklama,
  yol: '/',
  anahtar: [
    'konut projeleri', 'yeni konut projeleri', 'sıfır daire', 'villa projeleri',
    'ofis projeleri', 'satılık daire', 'kat planı', 'teslim tarihi',
  ],
});

/** Vitrin tipleri — üç ayrı liste, karma projeler ikisinde birden. */
/* Yollar `lib/tip-vitrin.ts`ten: sayfanın kendisi, ana sayfadaki
   kart ve site haritası aynı listeyi okuyor. Burada elle yazılıydı
   ve karşılığı olan sayfa hiç yazılmadığı için vitrinin üç kartı da
   404 veriyordu. */
const TIPLER: { tip: ProjeTipi; yol: string }[] = TIP_VITRIN_LISTESI
  .map((v) => ({ tip: v.tip as ProjeTipi, yol: `/${v.slug}` }));

export default async function AnaSayfa() {
  const [BOLGELER, LANDING_OZELLIKLER, PROJELER, VITRIN, FIRMALAR, m, heroKare, KOMBINASYONLAR, kanit]
    = await Promise.all([
      getBolgeler(), getLandingOzellikler(), getProjeler(), getVitrinProjeler(4),
      getFirmalar(), metinler('tr'), heroKareleri(), getLandingKombinasyonlari(), kanitOzeti(),
    ]);

  /* Tema bağlantıları VAR OLAN kombinasyona gitmeli. Her özellik
     "en çok projesi olan bölge" ile eşleştirilseydi, o bölgede o
     özellik yoksa iniş sayfası hiç üretilmiyor ve bağlantı 404
     veriyordu. Her özellik için gerçekten sonuç veren ilk bölge
     seçiliyor; hiç yoksa tema basılmıyor. */
  const temaBolgesi = new Map<string, string>();
  for (const k of KOMBINASYONLAR) {
    if (!temaBolgesi.has(k.ozellik)) temaBolgesi.set(k.ozellik, k.bolge);
  }
  /* Basılabilir çipler ÖNCEDEN süzülüyor: bölüm başlığının koşulu da
     bu listeye bakıyor, yoksa hepsi elenirken başlık ayakta kalıyor. */
  const temaCipleri = LANDING_OZELLIKLER
    .map((o) => ({ o, bolgeSlug: temaBolgesi.get(o.slug) }))
    .filter((x): x is { o: typeof x.o; bolgeSlug: string } => !!x.bolgeSlug);

  // Hero başlığında satır kırma yöneticiye bırakılıyor: tek "|" karakteri
  const heroSatirlari = m('anasayfa.hero.baslik').split('|');

  /* Güven şeridi ÜST ÇUBUKTAKİYLE AYNI kayıttan: iki ayrı liste
     tutmak, birini güncelleyip diğerini unutmak demekti. */
  const guvenMaddeleri = m('baslik.guven')
    .split('·').map((x) => x.trim()).filter(Boolean);

  const oneriler = [
    ...BOLGELER.map((b) => ({
      ad: b.ad, alt: `${b.il} · ${b.adet} proje`, ikon: 'pin' as const,
      yol: `/projeler/${b.slug}`, bolgeSlug: b.slug, il: b.il, adet: b.adet,
    })),
    ...PROJELER.map((p) => ({
      ad: p.ad, alt: `${p.mahalle}, ${p.bolge}`, ikon: 'building' as const,
      yol: `/proje/${p.slug}`,
    })),
  ];

  /* Lansman öncesi bölüm: YAKINDA aşamasındaki projeler. Boşsa bölüm
     hiç basılmıyor — "yakında proje yok" yazan bir bölüm, sayfada yer
     kaplayan bir olumsuzluk. */
  const lansmanOncesi = PROJELER.filter((p) => p.durum === 'YAKINDA').slice(0, 4);

  /* Teslime en yakın projeler: "ne zaman oturabilirim" sorusunun
     doğrudan cevabı. Tarihi açıklanmamış projeler LİSTEDE DEĞİL —
     sıralamada en sona düşüp bölümü anlamsız yapıyorlardı. */
  const yakinTeslim = PROJELER
    .filter((p) => p.teslim)
    .sort((a, b) => (a.teslim! < b.teslim! ? -1 : 1))
    .slice(0, 4);

  const enPopulerBolgeler = [...BOLGELER].sort((a, b) => b.adet - a.adet).slice(0, 6);

  /* Hero çipleri: en çok aranan dört tema. Tümünü basmak hero'yu
     ikinci bir kategori şeridine çeviriyordu.

     Bunlar BAĞLANTI değil, arama kutusunun filtreleri: tıklanınca
     kutuya işleniyor ve tek "Ara" ile bölge/bütçe seçimiyle
     birleşiyor. İniş sayfasına giden bağlantı, seçilen filtreleri
     kaybettiriyordu. */
  const hizliTemalar = LANDING_OZELLIKLER
    .filter((o) => ['metroyakin', 'kapaliotopark', 'yuzmehavuzu', 'depremyonetmelik'].includes(o.key))
    .map((o) => ({
      kod: o.key,
      ad: o.baslik.replace(' Projeleri', '').replace(' Projeler', ''),
      ikon: o.ikon,
    }));

  /* Tip başına sayı: karma projeler iki listede birden görünüyor,
     bu yüzden toplam proje sayısından fazla çıkabiliyor. */
  const tipSayilari = TIPLER.map(({ tip, yol }) => ({
    tip,
    yol,
    adet: PROJELER.filter((p) => p.tip === tip || p.tip === 'KARMA').length,
  })).filter((x) => x.adet > 0);

  return (
    <>
      {/* Hero: görsel tam görünür, koyulaştırma yalnızca metnin
          oturduğu sol alt köşede. Arama tek parça beyaz hap. */}
      <section className="hero">
        <HeroGosteri kareler={heroKare} />

        <div className="hero-icerik">
          <h1 className="hero-mujde">
            {heroSatirlari.map((satir, i) => (
              <span key={satir} className={i === 0 ? undefined : 'hero-alt-satir'}>{satir}</span>
            ))}
          </h1>

          <SearchBar oneriler={oneriler} temalar={hizliTemalar} />

          {/* Açıklama arama kutusunun ALTINDA: hero'nun tek eylemi
              arama ve kutu ilk göze çarpan şey olmalı. Üstte
              duruyorken göz önce iki satır metni okuyup sonra kutuya
              iniyordu; sayaç rozeti de aynı yolu bir adım daha
              uzatıyordu, o yüzden kaldırıldı. */}
          <p className="hero-alt">
            {m('anasayfa.hero.alt', { proje: kanit.proje, bolge: BOLGELER.length })}
          </p>
        </div>

        {/* Güven şeridi hero'nun İÇİNDE: `position: absolute` ile
            fotoğrafın son şeridine oturuyor ve cam yüzeyi ancak
            arkasında fotoğraf varken cam gibi duruyor. Kardeş öğe
            olarak yazıldığında konumlanmış bir atası kalmıyor ve
            şerit aşağıdaki bölümlerin üstüne biniyordu. */}
        <GuvenSeridi maddeler={guvenMaddeleri} />
      </section>

      {/* Kanıt şeridi: üstteki vaatleri tarihli sayılarla söylüyor. */}
      <KanitSeridi ozet={kanit} m={m} />

      {/* ---------------- Proje tipi ---------------- */}
      {tipSayilari.length > 1 && (
        <section className="section" style={{ marginTop: 34 }}>
          <div className="section-head">
            <div>
              <h2 className="h2">{m('anasayfa.tip.baslik')}</h2>
              <p>{m('anasayfa.tip.spot')}</p>
            </div>
          </div>
          <div className="tip-serit">
            {tipSayilari.map((t) => (
              <Link key={t.tip} className="tip-kart" href={t.yol}>
                <Icon n={t.tip === 'OFIS' ? 'building' : t.tip === 'VILLA' ? 'home' : 'grid'} s={22} />
                <b>{TIP_ADI[t.tip]} projeleri</b>
                <span className="dim">{t.adet} proje</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Öne çıkanlar ---------------- */}
      {VITRIN.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="eyebrow">{m('anasayfa.secki.ustbaslik')}</span>
              <h2 className="h2" style={{ marginTop: 6 }}>{m('anasayfa.secki.baslik')}</h2>
              <p>{m('anasayfa.secki.spot')}</p>
            </div>
            <Link className="link-more" href="/arama">
              Tüm projeler <Icon n="arrowR" s={16} />
            </Link>
          </div>
          <div className="grid-projeler cols-3">
            {VITRIN.map((p, i) => <ProjeKart key={p.id} p={p} oncelikli={i < 2} />)}
          </div>
        </section>
      )}

      {/* ---------------- Nasıl çalışır ---------------- */}
      <section className="section section-cokuk">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">{m('anasayfa.adim.ustbaslik')}</span>
              <h2 className="h2" style={{ marginTop: 10 }}>{m('anasayfa.adim.baslik')}</h2>
              <p>{m('anasayfa.adim.spot')}</p>
            </div>
          </div>
          <ol className="adim-liste">
            <li>
              <span className="adim-no">1</span>
              <b>Projeyi inceleyin</b>
              <p>
                Kat planı, daire tipleri, brüt/net m², başlangıç fiyatı ve kalan
                adet sayfada açık. Form doldurmadan görüyorsunuz.
              </p>
            </li>
            <li>
              <span className="adim-no">2</span>
              <b>Numaranızı bırakın</b>
              <p>
                İki alanlık form: ad ve telefon. İlgilendiğiniz daire tipini
                seçerseniz satış ekibi telefonu açmadan önce biliyor.
              </p>
            </li>
            <li>
              <span className="adim-no">3</span>
              <b>Satış ekibi arasın</b>
              <p>
                Talebiniz doğrudan projenin satış ekibine gidiyor. Yerinde görmek
                isterseniz randevu ücretsiz, satın alma zorunluluğu yok.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* ---------------- Teslime yakın ---------------- */}
      {yakinTeslim.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2 className="h2">Teslime en yakın projeler</h2>
              <p>
                Bekleme süresi kısa olanlar önce. Teslim tarihi çeyrek olarak
                yazılıyor — gün belirtmek tutulmayacak bir söz.
              </p>
            </div>
          </div>
          <div className="grid-projeler cols-3">
            {yakinTeslim.map((p) => <ProjeKart key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ---------------- Lansman öncesi ---------------- */}
      {lansmanOncesi.length > 0 && (
        <section className="section section-cokuk">
          <div className="wrap">
            <div className="section-head">
              <div>
                <h2 className="h2">{m('anasayfa.firsat.baslik')}</h2>
                <p>{m('anasayfa.firsat.spot')}</p>
              </div>
            </div>
            <div className="grid-projeler cols-3">
              {lansmanOncesi.map((p) => <ProjeKart key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Bölgeler ---------------- */}
      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">{m('anasayfa.bolge.ustbaslik')}</span>
            <h2 className="h2" style={{ marginTop: 6 }}>{m('anasayfa.bolge.baslik')}</h2>
            <p>{m('anasayfa.bolge.spot')}</p>
          </div>
          <Link className="link-more" href="/bolgeler">
            Tüm bölgeler <Icon n="arrowR" s={16} />
          </Link>
        </div>
        <div className="bolge-agi">
          {enPopulerBolgeler.map((b) => (
            <Link key={b.slug} className="bolge-kart" href={`/projeler/${b.slug}`}>
              <Image
                src={b.img} alt={`${b.ad}, ${b.il} — konut projeleri`}
                width={520} height={380} sizes="(max-width: 900px) 50vw, 25vw"
                style={{ objectFit: 'cover' }}
              />
              <div className="bolge-kart-alt">
                <b>{b.ad}</b>
                <span>{b.il} · {b.adet} proje</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- Neden buradan ---------------- */}
      <section className="section section-cokuk">
        <div className="wrap">
          <div className="section-head">
            <div>
              <h2 className="h2">{m('anasayfa.neden.baslik')}</h2>
              <p>{m('anasayfa.neden.spot')}</p>
            </div>
          </div>
          <div className="kart-agi">
            <article className="bilgi-kart">
              <h3><Icon n="shield" s={18} /> {m('guven.inceleme.baslik')}</h3>
              <p>{m('guven.inceleme.metin')}</p>
            </article>
            <article className="bilgi-kart">
              <h3><Icon n="wallet" s={18} /> {m('guven.fiyat.baslik')}</h3>
              <p>{m('guven.fiyat.metin')}</p>
            </article>
            <article className="bilgi-kart">
              <h3><Icon n="scale" s={18} /> {m('guven.tarafsiz.baslik')}</h3>
              <p>{m('guven.tarafsiz.metin')}</p>
            </article>
            <article className="bilgi-kart">
              <h3><Icon n="check" s={18} /> {m('guven.kvkk.baslik')}</h3>
              <p>{m('guven.kvkk.metin')}</p>
            </article>
          </div>
          <p className="serit-not">{m('anasayfa.neden.serit')}</p>
        </div>
      </section>

      {/* ---------------- Özelliğe göre ---------------- */}
      {/* Koşul, BASILABILIR cip sayisina bakiyor. Onceden
          `LANDING_OZELLIKLER.length > 0` yeterliydi ama her cip
          `temaBolgesi`den bir bolge bulamayinca `null` donuyor:
          envanter bosaldiginda otuz dort ozellik hala tanimliydi,
          kombinasyon ise sifirdi ve sayfada basligi olan ama
          altinda hicbir sey olmayan bir bolum kaliyordu. */}
      {temaCipleri.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2 className="h2">{m('anasayfa.tema.baslik')}</h2>
              <p>{m('anasayfa.tema.spot')}</p>
            </div>
          </div>
          <div className="etiket-serit">
            {temaCipleri.map(({ o, bolgeSlug }) => (
              <Link key={o.slug} className="badge" href={`/projeler/${bolgeSlug}/${o.slug}`}>
                <Icon n={o.ikon} s={14} /> {o.baslik}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Firmalar ---------------- */}
      {FIRMALAR.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2 className="h2">{m('anasayfa.firma.baslik')}</h2>
              <p>{m('anasayfa.firma.spot')}</p>
            </div>
            <Link className="link-more" href="/firmalar">
              Tüm firmalar <Icon n="arrowR" s={16} />
            </Link>
          </div>
          <div className="firma-serit">
            {FIRMALAR.slice(0, 6).map((f) => (
              <Link key={f.slug} className="firma-kart" href={`/firma/${f.slug}`}>
                <b>{f.ad}</b>
                <span className="dim">
                  {f.tamamlanan > 0 && `${f.tamamlanan} teslim`}
                  {f.tamamlanan > 0 && f.projeSayisi > 0 && ' · '}
                  {f.projeSayisi > 0 && `${f.projeSayisi} proje`}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------------- Firma başvurusu ---------------- */}
      <section className="section section-cokuk">
        <div className="wrap cta-blok">
          <div>
            <h2 className="h2">{m('anasayfa.firmabasvuru.baslik')}</h2>
            <p>{m('anasayfa.firmabasvuru.spot')}</p>
          </div>
          <Link className="btn btn-cta btn-lg" href="/firma-basvuru">
            {m('anasayfa.firmabasvuru.dugme')} <Icon n="arrowR" s={16} />
          </Link>
        </div>
      </section>

      <SonBakilan />
    </>
  );
}
