import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { permanentRedirect, notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import DetailActions from '@/components/DetailActions';
import CanliRozetler from '@/components/CanliRozetler';
import KontrolBlok from '@/components/KontrolBlok';
import PanoyaEkle from '@/components/PanoyaEkle';
import Gallery from '@/components/Gallery';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import TalepFormu from '@/components/TalepFormu';
import FiyatAlarmi from '@/components/FiyatAlarmi';
import SonBakilan from '@/components/SonBakilan';
import SoruFormu from '@/components/SoruFormu';
import ProjeKart from '@/components/ProjeKart';
import DaireTablosu from '@/components/DaireTablosu';
import {
  getBenzerProjeler, getBolge, getOzellikler, getProje, getProjeler, guncelSlug,
} from '@/lib/queries';
import {
  DURUM_ADI, TAPU_ADI, TIP_ADI, TL, TLkisa, fiyatAraligi, m2, m2Araligi,
  odaAraligi, teslimCeyrek, teslimeKalan, trTamUTC, dUTC,
} from '@/lib/bicim';
import { breadcrumbLd, meta, projeLd } from '@/lib/seo';
import { canliOzet } from '@/lib/canli';
import { prisma } from '@/lib/db';
import { sonuclariAyikla } from '@/lib/kontrol-kayit';
import { bulunma, bulunmaKi } from '@/lib/turkce';
import type { OzellikKey } from '@/lib/types';

export const revalidate = 3600;

/* `dynamicParams` AÇIK: proje adı panelden değişince slug da değişiyor
   ve eski adres kalıcı yönlendirmeyle yenisine gidiyor. Kapalı olsaydı
   hem yeni slug hem eski slug yeniden dağıtıma kadar 404 verirdi.
   Tabloda karşılığı olmayan adres yine 404. */
export const dynamicParams = true;

/* ============================================================
   DERLEME KAPSAMI: yalnızca İLK 12 proje önceden üretiliyor.

   Envanterin tamamını derlemede üretmek dağıtımın en uzun adımı:
   her sayfa kendi sorgularını çalıştırıyor ve derleme binlerce
   veritabanı gidiş-dönüşü yapıyor.

   Kalan projeler KAYBOLMUYOR — `dynamicParams` açık: ilk ziyarette
   üretilip `revalidate` süresince önbellekte kalıyorlar. Site
   haritası kendi sorgusunu yaptığı için tarama kapsamı da aynı.
   ============================================================ */
const ON_URETILEN = 12;

export async function generateStaticParams() {
  const projeler = await getProjeler();
  return projeler.slice(0, ON_URETILEN).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProje(slug);
  if (!p) return {};

  const oda = odaAraligi(p);
  const tip = TIP_ADI[p.tip].toLocaleLowerCase('tr');

  return meta({
    baslik: `${p.ad} — ${p.bolge} ${TIP_ADI[p.tip]} Projesi`,
    aciklama: `${p.ad}: ${p.mahalle}, ${bulunma(p.bolge)} ${p.firma.ad} tarafından `
      + `geliştirilen ${tip} projesi.${oda ? ` ${oda} daire tipleri.` : ''} `
      + `${fiyatAraligi(p.fiyatMin, p.fiyatMax)}. ${teslimCeyrek(p.teslim)} teslim.`,
    yol: `/proje/${p.slug}`,
    gorsel: p.foto[0],
    yayin: p.yayin,
    guncelleme: p.guncelleme,
    anahtar: [
      p.ad, p.firma.ad,
      `${p.bolge} ${tip} projeleri`,
      `${p.mahalle} ${tip} projesi`,
      `${p.bolge} yeni proje`,
      ...(oda ? [`${p.bolge} ${oda} daire`] : []),
    ],
  });
}

export default async function ProjeSayfasi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProje(slug);

  /* Bulunamadıysa ÖNCE eski adres tablosuna bakılıyor: proje adı
     değişince slug da değişiyor ve eski adres paylaşılmış, dizine
     girmiş olabiliyor. 404 vermeden 301 ile yenisine gidiliyor. */
  if (!p) {
    const yeni = await guncelSlug(slug);
    if (yeni) permanentRedirect(`/proje/${yeni}`);
    notFound();
  }

  const [bolge, ozellikAdlari, benzer, canli, kontrol] = await Promise.all([
    getBolge(p.bolgeSlug),
    getOzellikler(),
    getBenzerProjeler(p.slug, 4),
    canliOzet(`/proje/${p.slug}`, p.id),
    prisma.kontrolRaporu.findUnique({
      where: { projeId: p.id },
      select: { ziyaret: true, kontrolEden: true, ozet: true, sonuclar: true, yayinda: true },
    }),
  ]);

  const oda = odaAraligi(p);
  const olcu = m2Araligi(p);
  const kalanSure = teslimeKalan(p.teslim);
  const alinamaz = p.durum === 'TUKENDI' || p.durum === 'TESLIM_EDILDI';

  /* Talep formuna geçirilen daire listesi: satış ekibi hangi tipe
     bakıldığını bilsin. Tükenmiş tipler LİSTEDE DEĞİL — seçilebilir
     bırakmak, satılamayacak bir daire için talep üretmek olurdu. */
  const secilebilirDaireler = p.daireTipleri
    .filter((d) => d.kalan !== 0)
    .map((d) => ({ id: d.id, ad: d.ad, brutM2: d.brutM2 }));

  const olanaklar = p.ozellik
    .map((k: OzellikKey) => ozellikAdlari[k])
    .filter(Boolean);

  const kirintilar = [
    { ad: 'Ana sayfa', yol: '/' },
    { ad: `${p.bolge} projeleri`, yol: `/projeler/${p.bolgeSlug}` },
    { ad: p.ad, yol: `/proje/${p.slug}` },
  ];

  return (
    <>
      <JsonLd data={[
        projeLd(p, { olanaklar: olanaklar.map((o) => o!.ad) }),
        breadcrumbLd(kirintilar),
      ]} />

      <Breadcrumbs items={kirintilar} />

      <Gallery foto={p.foto} fotoAlt={p.fotoAlt} ad={p.ad} />

      <div className="detay-kabuk">
        <main className="detay-ana">
          {/* ---------------- Başlık ---------------- */}
          <header className="detay-bas">
            <div className="detay-etiket">
              <span className={'badge' + (alinamaz ? '' : ' badge-solid')}>
                {DURUM_ADI[p.durum]}
              </span>
              <span className="badge">{TIP_ADI[p.tip]} projesi</span>
              {p.sec && <span className="badge"><Icon n="spark" s={12} /> {p.sec}</span>}
            </div>

            <h1>{p.ad}</h1>

            <p className="detay-konum">
              <Icon n="pin" s={15} /> {p.mahalle}, {p.bolge} · {p.il}
              {p.adres && <span className="dim"> · {p.adres}</span>}
            </p>

            <p className="detay-firma">
              <Icon n="building" s={15} />{' '}
              <Link href={`/firma/${p.firma.slug}`}>{p.firma.ad}</Link>
              {p.firma.tamamlanan > 0 && (
                <span className="dim"> · {p.firma.tamamlanan} proje teslim etti</span>
              )}
              {p.firma.yil && <span className="dim"> · {p.firma.yil}’den beri</span>}
            </p>

            <DetailActions id={p.id} ad={p.ad} />
            <CanliRozetler yol={`/proje/${p.slug}`} projeId={p.id}
              canliIlk={canli.canli} talepIlk={canli.talep} />
          </header>

          {/* ---------------- Künye şeridi ----------------
              Alıcının ilk üç sorusu tek şeritte: ne kadar, ne zaman,
              ne büyüklükte. Aşağı kaydırmadan görünmesi gerekiyor. */}
          <section className="detay-kunye" aria-label="Proje künyesi">
            <div className="kunye-oge">
              <span className="kunye-etiket">Fiyat aralığı</span>
              <b>{fiyatAraligi(p.fiyatMin, p.fiyatMax)}</b>
            </div>
            <div className="kunye-oge">
              <span className="kunye-etiket">Teslim</span>
              <b>{teslimCeyrek(p.teslim)}</b>
              {kalanSure && <span className="tiny dim">{kalanSure}</span>}
            </div>
            {oda && (
              <div className="kunye-oge">
                <span className="kunye-etiket">Daire tipleri</span>
                <b>{oda}</b>
                {olcu && <span className="tiny dim">{olcu}</span>}
              </div>
            )}
            {p.olcek.bagimsizBolum && (
              <div className="kunye-oge">
                <span className="kunye-etiket">Bağımsız bölüm</span>
                <b>{p.olcek.bagimsizBolum.toLocaleString('tr-TR')}</b>
                {p.olcek.blok && <span className="tiny dim">{p.olcek.blok} blok</span>}
              </div>
            )}
          </section>

          {/* ---------------- İnşaat ilerlemesi ----------------
              Yalnızca ilerleme VARSA basılıyor: %0 bir bilgi değil,
              lansman öncesi projede beklenen durum ve boş bir çubuk
              "geride kalmış" gibi okunuyor. */}
          {p.ilerleme > 0 && (
            <section className="detay-blok" aria-label="İnşaat durumu">
              <h2 className="h3"><Icon n="crane" s={18} /> İnşaat durumu</h2>
              <div className="ilerleme">
                <div className="ilerleme-cubuk">
                  <span style={{ width: `${p.ilerleme}%` }} />
                </div>
                <b>%{p.ilerleme}</b>
              </div>
              <p className="tiny dim">
                {p.baslangic && `İnşaat ${trTamUTC(dUTC(p.baslangic)!)} tarihinde başladı. `}
                İlerleme oranı firma beyanına dayanıyor ve panelden güncelleniyor.
              </p>
            </section>
          )}

          <section className="detay-blok">
            <h2 className="h3">Proje hakkında</h2>
            <p className="detay-ozet">{p.ozet}</p>
          </section>

          {/* ---------------- Daire tipleri ----------------
              Sayfanın ASIL İÇERİĞİ. Ziyaretçi projeyi değil daire
              tipini soruyor ve talep formu da buraya bağlanıyor. */}
          {p.daireTipleri.length > 0 && (
            <DaireTablosu
              projeSlug={p.slug} projeAd={p.ad} tipler={p.daireTipleri}
            />
          )}

          {/* ---------------- Ödeme koşulları ---------------- */}
          <section className="detay-blok" aria-label="Ödeme koşulları">
            <h2 className="h3"><Icon n="wallet" s={18} /> Ödeme koşulları</h2>
            <dl className="kosul-liste">
              {p.odeme.pesinat > 0 && (
                <div><dt>Peşinat</dt><dd>%{p.odeme.pesinat}</dd></div>
              )}
              {p.odeme.vade > 0 && (
                <div><dt>Vade</dt><dd>{p.odeme.vade} ay</dd></div>
              )}
              <div>
                <dt>Konut kredisi</dt>
                <dd>{p.odeme.krediyeUygun ? 'Krediye uygun' : 'Krediye uygun değil'}</dd>
              </div>
              {p.odeme.takas && <div><dt>Takas</dt><dd>Kabul ediliyor</dd></div>}
              {p.odeme.tapu && (
                <div><dt>Tapu durumu</dt><dd>{TAPU_ADI[p.odeme.tapu]}</dd></div>
              )}
              {p.odeme.aidat && (
                <div>
                  <dt>Aidat (tahmini)</dt>
                  <dd>{TL(p.odeme.aidat)} / ay</dd>
                </div>
              )}
            </dl>
            {/* Peşinat/vade bilgisi verilmemişse SESSİZ KALINMIYOR:
                boş bırakılan alan "peşinatsız" diye okunabiliyordu. */}
            {p.odeme.pesinat === 0 && p.odeme.vade === 0 && (
              <p className="tiny dim">
                Ödeme planı bu proje için yayımlanmadı; satış ekibinden isteyebilirsiniz.
              </p>
            )}
          </section>

          {/* ---------------- Proje ölçeği ---------------- */}
          {(p.olcek.arsaM2 || p.olcek.insaatM2 || p.olcek.kat || p.olcek.yesilOran) && (
            <section className="detay-blok" aria-label="Proje ölçeği">
              <h2 className="h3"><Icon n="building" s={18} /> Proje ölçeği</h2>
              <dl className="kosul-liste">
                {p.olcek.blok && <div><dt>Blok sayısı</dt><dd>{p.olcek.blok}</dd></div>}
                {p.olcek.kat && <div><dt>Kat sayısı</dt><dd>{p.olcek.kat}</dd></div>}
                {p.olcek.arsaM2 && <div><dt>Arsa alanı</dt><dd>{m2(p.olcek.arsaM2)}</dd></div>}
                {p.olcek.insaatM2 && <div><dt>İnşaat alanı</dt><dd>{m2(p.olcek.insaatM2)}</dd></div>}
                {p.olcek.yesilOran && (
                  <div><dt>Yeşil alan oranı</dt><dd>%{p.olcek.yesilOran}</dd></div>
                )}
              </dl>
            </section>
          )}

          {/* ---------------- Olanaklar ---------------- */}
          {olanaklar.length > 0 && (
            <section className="detay-blok" aria-label="Proje olanakları">
              <h2 className="h3">Proje olanakları</h2>
              <div className="olanak-agi">
                {olanaklar.map((o) => (
                  <span key={o!.ad}><Icon n={o!.ikon} s={16} /> {o!.ad}</span>
                ))}
              </div>
            </section>
          )}

          {/* ---------------- Yerinde inceleme ---------------- */}
          {kontrol?.yayinda && (
            <KontrolBlok
              ziyaret={kontrol.ziyaret.toISOString()}
              kontrolEden={kontrol.kontrolEden}
              ozet={kontrol.ozet}
              sonuclar={sonuclariAyikla(kontrol.sonuclar)}
            />
          )}

          {/* ---------------- Bölge ---------------- */}
          {bolge && (
            <section className="detay-blok" aria-label="Bölge hakkında">
              <h2 className="h3">{bulunmaKi(p.bolge)} yaşam</h2>
              <p>{bolge.ozet}</p>
              <Link className="btn btn-ghost btn-sm" href={`/projeler/${p.bolgeSlug}`}>
                {p.bolge} projelerinin tümü <Icon n="arrowR" s={14} />
              </Link>
            </section>
          )}

          {/* ---------------- Soru ---------------- */}
          <section className="detay-blok" aria-label="Soru sorun">
            <h2 className="h3">Aklınıza takılan bir şey mi var?</h2>
            <SoruFormu projeSlug={p.slug} firmaAd={p.firma.ad} />
          </section>
        </main>

        {/* ---------------- Yan sütun: dönüşüm ----------------
            Sayfanın var olma sebebi bu kutu. `sticky`: uzun sayfada
            aşağı inen kişi formu kaybetmemeli. */}
        <aside className="detay-yan">
          <div className="satis-kutu">
            <div className="satis-fiyat">
              <span className="kunye-etiket">Fiyatlar</span>
              <b>{fiyatAraligi(p.fiyatMin, p.fiyatMax)}</b>
            </div>

            {alinamaz ? (
              /* Tükenmiş projede TALEP FORMU YOK: satılamayacak bir
                 şey için numara toplamak, satış ekibini de arayan
                 kişiyi de boşa çıkarıyor. Yerine benzer projelere
                 yönlendiriliyor. */
              <div className="satis-kapali">
                <p>
                  <b>{DURUM_ADI[p.durum]}.</b> Bu projede satılık bağımsız bölüm kalmadı.
                </p>
                <Link className="btn btn-cta btn-block" href={`/projeler/${p.bolgeSlug}`}>
                  {p.bolge} projelerine bak <Icon n="arrowR" s={15} />
                </Link>
              </div>
            ) : (
              <>
                <TalepFormu
                  projeSlug={p.slug} projeAd={p.ad} niyet="BILGI"
                  daireler={secilebilirDaireler}
                  dugmeMetni="Bilgi ve fiyat alın"
                />
                <TalepFormu
                  projeSlug={p.slug} projeAd={p.ad} niyet="RANDEVU"
                  daireler={secilebilirDaireler}
                  dugmeSinifi="btn btn-ghost btn-block"
                  dugmeMetni="Yerinde görmek istiyorum"
                />
                <p className="tiny dim satis-not">
                  Ziyaret ücretsiz, satın alma zorunluluğu yok.
                </p>
              </>
            )}

            <PanoyaEkle projeSlug={p.slug} projeAdi={p.ad} />
          </div>

          {/* Lansman öncesi projede alarm "satışa çıkınca haber ver"
              olarak çalışıyor; hedef fiyat sorulmuyor. */}
          {!alinamaz && (
            <FiyatAlarmi projeSlug={p.slug} fiyat={p.fiyatMin} />
          )}
        </aside>
      </div>

      {/* ---------------- Benzer projeler ---------------- */}
      {benzer.length > 0 && (
        <section className="bolum" aria-label="Benzer projeler">
          <h2 className="h2">Benzer projeler</h2>
          <div className="grid-projeler cols-3">
            {benzer.map((b) => <ProjeKart key={b.id} p={b} />)}
          </div>
        </section>
      )}

      <SonBakilan
        kaydet={{
          slug: p.slug, ad: p.ad, bolge: p.bolge,
          fiyat: p.fiyatMin, gorsel: p.foto[0] ?? null,
        }}
      />
    </>
  );
}
