import Link from 'next/link';
import type { Metadata } from 'next';
import { sql } from '@/lib/db';
import { para, teslim } from '@/lib/format';

/**
 * Talep gönderildi — huninin tasarlanmamış son adımı.
 *
 * İki iş yapar: BEKLENTİ KURAR (ne zaman, kim arayacak) ve kullanıcıyı
 * siteden çıkarmaz.
 *
 * Yanıt süresi uydurma değil — firmanın panelde ölçülen gerçek ortalaması.
 * "En kısa sürede dönüş yapılacaktır" hiçbir şey söylemez; gerçek rakam
 * üç iş yapar: kullanıcı ne bekleyeceğini bilir, firma rakamın kamuya açık
 * olduğunu bildiği için hızlı döner, yavaş dönen firmalar zamanla ayrışır.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Talebiniz iletildi',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ t?: string; proje?: string }> };

export default async function TalepGonderildi({ searchParams }: Props) {
  const { t } = await searchParams;

  const kayit = t
    ? (
        await sql<
          {
            ad: string; telefon: string; daire_tipi: string | null;
            butce_min: number | null; butce_max: number | null;
            proje_ad: string | null; proje_slug: string | null;
            il: string | null; ilce: string | null; teslim_ceyrek: string | null;
            firma_ad: string | null; firma_slug: string | null;
            yanit_saat: number | null;
          }[]
        >`
          select
            t.ad, t.telefon, t.daire_tipi, t.butce_min, t.butce_max,
            p.ad as proje_ad, p.slug as proje_slug, p.il, p.ilce, p.teslim_ceyrek,
            f.ad as firma_ad, f.slug as firma_slug,
            (select round(avg(extract(epoch from (t2.acilma_zamani - t2.olusturuldu)) / 3600)::numeric, 1)
              from talep t2
              where t2.firma_id = t.firma_id
                and t2.acilma_zamani is not null
                and t2.olusturuldu > now() - interval '90 days') as yanit_saat
          from talep t
          left join proje p on p.id = t.proje_id
          left join firma f on f.id = t.firma_id
          where t.id = ${Number(t)}
          limit 1
        `
      )[0] ?? null
    : null;

  const maskeli = kayit?.telefon
    ? `${kayit.telefon.slice(0, 4)} *** ** ${kayit.telefon.slice(-2)}`
    : null;

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-8)', maxWidth: 620 }}>
      <div className="kp-card" style={{ padding: 'var(--s-6)', textAlign: 'center' }}>
        <span
          aria-hidden
          style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--success-bg)',
            display: 'grid', placeItems: 'center', margin: '0 auto var(--s-4)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <path d="M6 13.5 L11 18.5 L20 8" fill="none" stroke="var(--success)"
                  strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <h1 className="kp-h1" style={{ fontSize: 24 }}>Talebiniz iletildi</h1>
        <p className="kp-lead" style={{ margin: '0 auto var(--s-5)', maxWidth: '46ch' }}>
          {kayit?.firma_ad
            ? `${kayit.firma_ad} satış ekibi sizinle doğrudan iletişime geçecek.`
            : 'Satış ekibi sizinle doğrudan iletişime geçecek.'}{' '}
          Konutprojeleri.com aracı değildir, komisyon almaz.
        </p>

        {kayit && (
          <>
            <div
              style={{
                background: 'var(--surface-sunken)', borderRadius: 'var(--r-block)',
                padding: 'var(--s-4)', textAlign: 'left', marginBottom: 'var(--s-4)',
              }}
            >
              <p className="kp-label" style={{ marginBottom: 'var(--s-3)' }}>Gönderilen bilgiler</p>
              <Satir ad="Proje" deger={kayit.proje_ad} />
              <Satir ad="İlgilendiğiniz tip" deger={kayit.daire_tipi} />
              <Satir
                ad="Bütçe"
                deger={
                  kayit.butce_min && kayit.butce_max
                    ? `${para(kayit.butce_min)} – ${para(kayit.butce_max)}`
                    : null
                }
              />
              <Satir ad="Telefon" deger={maskeli} />
            </div>

            {/* Gerçek ölçüm. Firma bu rakamı değiştiremez. */}
            {kayit.yanit_saat != null && (
              <div
                style={{
                  background: 'var(--success-bg)', borderRadius: 'var(--r-block)',
                  padding: 'var(--s-4)', textAlign: 'left', marginBottom: 'var(--s-4)',
                  display: 'flex', gap: 'var(--s-4)', alignItems: 'center',
                }}
              >
                <b className="tabular" style={{ fontSize: 19, fontWeight: 800, color: 'var(--success)', whiteSpace: 'nowrap' }}>
                  {formatSure(kayit.yanit_saat)}
                </b>
                <span style={{ fontSize: 11.5, color: 'var(--success)', lineHeight: 1.5 }}>
                  {kayit.firma_ad}&apos;ın son 90 gündeki <b>ortalama yanıt süresi</b>.
                  Bu rakam firma karnesinde de görünür ve firmanın kendisi değiştiremez.
                </span>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 'var(--s-3)', textAlign: 'left' }}>
          {kayit?.il && kayit.ilce && (
            <Adim
              href={`/${kayit.il}/${kayit.ilce}-konut-projeleri`}
              baslik="Benzerlerine bakın"
              metin={`${kayit.ilce}'de diğer projeleri karşılaştırın`}
            />
          )}
          {kayit?.firma_slug && (
            <Adim
              href={`/firmalar/${kayit.firma_slug}`}
              baslik="Firma karnesi"
              metin="Teslim performansını ve geçmiş projeleri görün"
            />
          )}
          {kayit?.proje_slug && kayit.il && kayit.ilce && (
            <Adim
              href={`/${kayit.il}/${kayit.ilce}/${kayit.proje_slug}`}
              baslik="Projeye dön"
              metin={teslim(kayit.teslim_ceyrek) ? `${teslim(kayit.teslim_ceyrek)} teslim` : 'Detayları inceleyin'}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function Satir({ ad, deger }: { ad: string; deger: string | null }) {
  if (!deger) return null; // veri yoksa satır basılmaz
  return (
    <div className="kp-row" style={{ padding: '4px 0', fontSize: 12 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{ad}</span>
      <b style={{ marginLeft: 'auto' }}>{deger}</b>
    </div>
  );
}

function Adim({ href, baslik, metin }: { href: string; baslik: string; metin: string }) {
  return (
    <Link
      href={href}
      style={{
        border: '1.5px solid var(--border-strong)', borderRadius: 'var(--r-block)',
        padding: 'var(--s-4)', display: 'block',
      }}
    >
      <b style={{ display: 'block', fontSize: 12, marginBottom: 3 }}>{baslik}</b>
      <span style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.45 }}>{metin}</span>
    </Link>
  );
}

function formatSure(saat: number): string {
  if (saat < 1) return `${Math.round(saat * 60)} dk`;
  const s = Math.floor(saat);
  const dk = Math.round((saat - s) * 60);
  return dk ? `${s} sa ${dk} dk` : `${s} saat`;
}
