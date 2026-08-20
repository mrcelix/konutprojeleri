import Link from 'next/link';
import { notFound } from 'next/navigation';
import { panelGerekli, yonetici } from '@/lib/yetki';
import { duzenlenirProje, sonIslemler } from '@/lib/queries/duzenleyici';
import { ProjeFormu } from './ProjeFormu';
import { MedyaPaneli } from './MedyaPaneli';
import { r2Hazir } from '@/lib/r2';

/**
 * /yonetim/projeler/[id] — proje düzenleyici.
 *
 * Formun kendisi istemci bileşeni (canlı skor ve SEO önizlemesi için);
 * yetki, veri ve geçmiş burada, sunucuda.
 */

export const dynamic = 'force-dynamic';

export default async function DuzenleyiciSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const k = await panelGerekli();
  const admin = yonetici(k);
  const { id } = await params;
  const q = await searchParams;

  const projeId = Number(id);
  if (!Number.isFinite(projeId)) notFound();

  const proje = await duzenlenirProje(projeId);
  if (!proje) notFound();

  // Firma kullanıcısı başka firmanın projesini AÇAMAZ da. Sadece
  // kaydetmeyi engellemek, verinin görülmesine izin vermek olurdu.
  if (!admin && proje.firma_id !== k.firma_id) notFound();

  const islemler = await sonIslemler(projeId).catch(() => []);

  return (
    <main className="yn-sayfa">
      <header className="yn-baslik">
        <div>
          <Link href="/yonetim/projeler" className="yn-mini">← Projeler</Link>
          <h1 className="kp-h2" style={{ marginTop: 2 }}>{proje.ad}</h1>
          <p className="kp-lead" style={{ fontSize: 13 }}>
            {proje.firma_ad} · {proje.ilce} · {proje.yayinda ? 'yayında' : 'yayında değil'}
          </p>
        </div>
      </header>

      <ProjeFormu
        proje={proje}
        admin={admin}
        kaydedildi={q.kaydedildi === '1'}
      />

      <div style={{ marginTop: 'var(--s-5)' }}>
        <MedyaPaneli
          projeId={proje.id}
          medya={proje.medya ?? []}
          cdn={process.env.NEXT_PUBLIC_CDN_URL ?? 'https://cdn.konutprojeleri.com'}
          r2Var={r2Hazir()}
        />
      </div>

      {islemler.length > 0 && (
        <section className="kp-card dz-blok" style={{ marginTop: 'var(--s-5)' }}>
          <h2 className="kp-h3">Son işlemler</h2>
          <p className="dz-not" style={{ marginTop: 0 }}>
            Denetim günlüğü salt-eklemedir; buradaki kayıtlar silinemez.
          </p>
          <ul className="dz-gecmis">
            {islemler.map((i, n) => (
              <li key={n}>
                <span className="tabular">{i.zaman}</span>
                <b>{i.kim}</b>
                <span>
                  {i.alan ? <em>{i.alan}</em> : null}
                  {i.eski_deger != null && (
                    <> <s>{kisalt(i.eski_deger)}</s> → </>
                  )}
                  {i.yeni_deger != null ? kisalt(i.yeni_deger) : i.islem}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function kisalt(s: string, n = 48): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
