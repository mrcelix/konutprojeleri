import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { dilAlternatifleriEn } from '@/lib/i18n';
import { getFirma, getFirmalar } from '@/lib/queries';
import { getProjelerEn } from '@/lib/queries-en';
import { VARSAYILAN_OG } from '@/lib/seo';
import { site } from '@/lib/site';
import ProjeKartEn from '@/components/en/ProjeKartEn';

/* ============================================================
   İngilizce firma sayfası.

   FİRMANIN TÜRKÇE TANITIM METNİ BASILMIYOR. `ozet` ve `hakkinda`
   panelden Türkçe giriliyor ve çevirisi yok; İngilizce bir sayfada
   Türkçe paragraf, çevrilmemiş olduğunu göstermekten başka bir iş
   yapmıyor. Basılan her şey DİLDEN BAĞIMSIZ veri: kuruluş yılı,
   teslim edilmiş proje sayısı, iletişim ve proje listesi.

   Bu sayfanın tek işi ALICI KARARINI DESTEKLEMEK: "bu firma daha
   önce ne teslim etti, şu an ne satıyor". İkisi ayrı listede.
   ============================================================ */

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const firmalar = await getFirmalar();
  return firmalar.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFirma(slug);
  if (!f) return {};

  const projeler = (await getProjelerEn()).filter((p) => p.firmaSlug === slug);
  const baslik = `${f.ad} — Developments and Track Record`;
  const aciklama = `${f.ad}: `
    + `${f.tamamlanan > 0 ? `${f.tamamlanan} completed developments, ` : ''}`
    + `${projeler.length} listed on ${site.ad}.`
    + `${f.yil ? ` Founded ${f.yil}.` : ''}`;

  const alt = dilAlternatifleriEn(`/en/developer/${f.slug}`);
  return {
    title: baslik,
    description: aciklama,
    ...(alt ? { alternates: alt } : {}),
    openGraph: {
      type: 'website', siteName: site.ad, locale: 'en_GB',
      url: alt?.canonical, title: baslik, description: aciklama,
      images: [{
        url: f.logo ?? projeler[0]?.foto[0] ?? VARSAYILAN_OG,
        width: 1200, height: 630, alt: baslik,
      }],
    },
  };
}

export default async function EnFirmaSayfasi(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const f = await getFirma(slug);
  if (!f) notFound();

  /* İngilizce liste yalnızca ÇEVRİLMİŞ projeleri veriyor; firmanın
     Türkçe tarafta daha çok projesi olabilir ve bu sayfa onları
     saymıyor — çevrilmemiş bir projeye bağlantı vermek, İngilizce
     okuru Türkçe bir sayfaya düşürürdü. */
  const projeler = (await getProjelerEn()).filter((p) => p.firmaSlug === slug);

  const satista = projeler.filter(
    (p) => p.durum === 'YAKINDA' || p.durum === 'SATISTA' || p.durum === 'SON_DAIRELER',
  );
  const gecmis = projeler.filter(
    (p) => p.durum === 'TUKENDI' || p.durum === 'TESLIM_EDILDI',
  );

  return (
    <div className="wrap" style={{ paddingBlock: 32 }}>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: f.ad,
        url: `${site.url}/en/developer/${f.slug}`,
        ...(f.logo ? { logo: f.logo } : {}),
        ...(f.yil ? { foundingDate: String(f.yil) } : {}),
        ...(f.telefon ? { telephone: f.telefon } : {}),
        ...(f.eposta ? { email: f.eposta } : {}),
        ...(f.web ? { sameAs: [f.web] } : {}),
      }} />

      <Breadcrumbs items={[
        { ad: 'Home', yol: '/en' },
        { ad: f.ad, yol: `/en/developer/${f.slug}` },
      ]} />

      <h1 className="h1" style={{ marginTop: 12 }}>{f.ad}</h1>

      {/* KÜNYE SAYILARLA: "kaç yıldır" ve "kaç proje teslim etti"
          alıcının firmaya bakarken sorduğu iki soru. Teslim sayısı
          firmanın BEYANI ve bu açıkça yazılıyor. */}
      <div className="detail-kunye" style={{ marginTop: 14 }}>
        {f.yil && <span><Icon n="clock" s={15} /> Founded {f.yil}</span>}
        {f.tamamlanan > 0 && (
          <span><Icon n="building" s={15} /> {f.tamamlanan} completed developments</span>
        )}
        <span><Icon n="grid" s={15} /> {projeler.length} listed here</span>
      </div>

      <p className="tiny dim" style={{ marginTop: 10, maxWidth: '62ch' }}>
        The completed-development figure is the developer’s own statement. It is a
        track record, not a promise — we publish it because it is the number buyers
        ask about first.
      </p>

      {(f.telefon || f.eposta || f.web) && (
        <div className="chips" style={{ marginTop: 16 }}>
          {f.telefon && <a className="chip" href={`tel:${f.telefon}`}>{f.telefon}</a>}
          {f.eposta && <a className="chip" href={`mailto:${f.eposta}`}>{f.eposta}</a>}
          {f.web && (
            <a className="chip" href={f.web} target="_blank" rel="noopener noreferrer nofollow">
              Website
            </a>
          )}
        </div>
      )}

      <section style={{ marginTop: 36 }}>
        <h2 className="h2">On sale now</h2>
        {satista.length === 0 ? (
          <p className="muted" style={{ marginTop: 10 }}>
            No development from this developer is currently on sale with an English page.
          </p>
        ) : (
          <div className="grid-projeler cols-3" style={{ marginTop: 16 }}>
            {satista.map((p) => <ProjeKartEn key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {gecmis.length > 0 && (
        <section style={{ marginTop: 40 }}>
          {/* Teslim edilmiş projeler AYRI liste: aynı ızgarada
              gösterilseydi satın alınabilir gibi görünürlerdi. */}
          <h2 className="h2">Completed and sold out</h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Not available to buy — shown as a record of what has been delivered.
          </p>
          <div className="grid-projeler cols-3" style={{ marginTop: 16 }}>
            {gecmis.map((p) => <ProjeKartEn key={p.id} p={p} />)}
          </div>
        </section>
      )}

      <p style={{ marginTop: 34 }}>
        <Link className="btn btn-ghost" href="/en/search">
          <Icon n="search" s={15} /> All developments
        </Link>
      </p>
    </div>
  );
}
