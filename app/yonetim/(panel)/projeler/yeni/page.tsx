import Link from 'next/link';
import { yoneticiGerekli } from '@/lib/yetki';
import { firmaSecenekleri } from '@/lib/queries/duzenleyici';
import { YeniFormu } from './YeniFormu';

/**
 * /yonetim/projeler/yeni
 *
 * Yalnızca yönetim. Firma kullanıcısı yeni proje AÇAMAZ; açabilseydi
 * onay kuyruğunu atlayarak siteye içerik sokmuş olurdu.
 */

export const dynamic = 'force-dynamic';

export default async function YeniProjeSayfasi() {
  await yoneticiGerekli();
  const firmalar = await firmaSecenekleri().catch(() => []);

  return (
    <main className="yn-sayfa">
      <header className="yn-baslik">
        <div>
          <Link href="/yonetim/projeler" className="yn-mini">← Projeler</Link>
          <h1 className="h2" style={{ marginTop: 2 }}>Yeni proje</h1>
        </div>
      </header>

      {firmalar.length === 0 ? (
        <div className="kart empty">
          <p className="kp-empty__title">Önce firma eklenmeli</p>
          <p className="kp-empty__text">
            Her proje bir firmaya bağlıdır. Firma kaydı olmadan proje açılamaz.
          </p>
        </div>
      ) : (
        <YeniFormu firmalar={firmalar} />
      )}
    </main>
  );
}
