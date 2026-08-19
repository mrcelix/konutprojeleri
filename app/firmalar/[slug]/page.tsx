import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sql } from '@/lib/db';
import { yuzde } from '@/lib/format';
import { Pill } from '@/components/ui/Pill';

/**
 * Firma karnesi — /firmalar/esat-insaat
 *
 * Sitenin asıl ayrıştırıcısı. Karne YALNIZCA doğrulanabilir dört veriden
 * hesaplanır (mv_firma_karne): teslim isabeti, deneyim hacmi, veri
 * şeffaflığı, yanıt süresi. Yorum, kullanıcı puanı, abonelik paketi
 * hesaba girmez.
 *
 * Sicil notu AggregateRating olarak İŞARETLENMEZ — o bir arama motoru
 * derecelendirmesi değil, bizim ürettiğimiz bir ölçüt. Yanlış işaretleme
 * manuel işlem riski doğurur.
 */

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

type Karne = {
  slug: string;
  ad: string;
  kurulus_yili: number | null;
  merkez_il: string | null;
  sicil: string | null;
  ort_gecikme: number | null;
  zamaninda_orani: number | null;
  tamamlanan: number | null;
  aktif: number | null;
};

async function karneGetir(slug: string): Promise<Karne | null> {
  const rows = await sql<Karne[]>`
    select f.slug, f.ad, f.kurulus_yili, f.merkez_il,
           k.sicil, k.ort_gecikme, k.zamaninda_orani, k.tamamlanan,
           (select count(*) from proje p
             where p.firma_id = f.id and p.yayinda
               and p.durum in ('lansman','satista')) as aktif
    from firma f
    left join mv_firma_karne k on k.firma_id = f.id
    where f.slug = ${slug}
    limit 1
  `;
  return rows[0] ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const f = await karneGetir(slug);
  if (!f) return {};

  return {
    title:
      `${f.ad} — ${f.tamamlanan ?? 0} Proje` +
      (f.sicil ? `, Sicil ${f.sicil}` : '') +
      (f.ort_gecikme != null ? `, Ort. Teslim Gecikmesi ${f.ort_gecikme.toFixed(1)} Ay` : ''),
    alternates: { canonical: `/firmalar/${slug}` },
  };
}

export default async function FirmaSayfasi({ params }: Params) {
  const { slug } = await params;
  const f = await karneGetir(slug);
  if (!f) notFound();

  // Eşik: 2 tamamlanmış projeden azı olan firmaya not verilmez.
  // Yetersiz veriyle not vermek, düşük not vermekten daha yanıltıcıdır.
  const notVerilebilir = (f.tamamlanan ?? 0) >= 2;

  return (
    <main className="kp-wrap" style={{ paddingBlock: 'var(--s-6)' }}>
      <h1 className="kp-h1">{f.ad}</h1>
      <p className="kp-lead">
        {f.kurulus_yili ? `${f.kurulus_yili}'de kuruldu · ` : ''}
        {f.merkez_il ?? ''} · {f.tamamlanan ?? 0} tamamlanmış, {f.aktif ?? 0} aktif proje
      </p>

      <div className="kp-row" style={{ marginBlock: 'var(--s-4)' }}>
        {notVerilebilir && f.sicil ? (
          <Pill durum="success">Sicil notu {f.sicil}</Pill>
        ) : (
          <Pill durum="brand">Yeni firma</Pill>
        )}
      </div>

      <section className="kp-card" style={{ padding: 'var(--s-5)' }}>
        <h2 className="kp-h2">Firma karnesi</h2>
        {notVerilebilir ? (
          <dl className="kp-lead" style={{ display: 'grid', gap: 8 }}>
            <div>
              <b>Ortalama teslim gecikmesi:</b>{' '}
              {f.ort_gecikme != null ? `${f.ort_gecikme.toFixed(1)} ay` : '—'}
              <span style={{ color: 'var(--text-muted)' }}> · sektör 2,7 ay</span>
            </div>
            <div>
              <b>Zamanında teslim oranı:</b>{' '}
              {f.zamaninda_orani != null ? yuzde(f.zamaninda_orani * 100) : '—'}
            </div>
            <div><b>Tamamlanan proje:</b> {f.tamamlanan ?? 0}</div>
          </dl>
        ) : (
          <p className="kp-lead">
            Bu firmanın not verilebilmesi için en az iki tamamlanmış projesi gerekiyor.
            Yetersiz veriyle not vermek yanıltıcı olurdu.
          </p>
        )}
        <p className="kp-label" style={{ marginTop: 'var(--s-4)' }}>
          Karne yalnızca doğrulanabilir veriden hesaplanır ·{' '}
          <a href="/firma-karnesi-metodoloji">Metodoloji</a>
        </p>
      </section>

      {/* TODO aşama 4: teslim performansı grafiği, portföy, itiraz durumu */}
    </main>
  );
}
