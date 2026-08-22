import Link from 'next/link';
import Icon from '@/components/Icon';
import { getBolgeler } from '@/lib/queries';
import type { Bolge } from '@/lib/types';

export const metadata = { title: 'Sayfa bulunamadı', robots: { index: false, follow: true } };

/* ============================================================
   404 sayfası.

   Bölge listesi VERİTABANINDAN geliyor ama sorgu try/catch içinde:
   404 sayfası, veritabanı erişilemezken de çalışmak ZORUNDA. Aksi
   halde zincir şöyle kırılıyordu — sayfa bulunamıyor → `notFound()`
   → 404 sayfası veritabanına gidiyor → sorgu patlıyor → kullanıcı
   404 yerine **500** görüyor.

   Üretimde tam olarak bu oldu: ana sayfa derleme anında üretilmiş
   statik HTML'den 200 dönerken, çalışma anında üretilen her sayfa
   500 veriyordu.
   ============================================================ */
export default async function NotFound() {
  let bolgeler: Bolge[] = [];
  try {
    bolgeler = await getBolgeler();
  } catch (e) {
    console.error('404 sayfası bölge listesini okuyamadı:', e);
  }

  return (
    <div className="wrap" style={{ padding: '90px 0 70px', textAlign: 'center' }}>
      <span className="eyebrow">404</span>
      <h1 className="h1" style={{ marginTop: 10 }}>Aradığınız sayfa burada değil</h1>
      <p className="muted" style={{ margin: '14px auto 26px', maxWidth: '52ch' }}>
        Bağlantı eskimiş olabilir ya da proje yayından kaldırılmış olabilir.
        Bölgelerden devam ederek benzer evleri bulabilirsiniz.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" href="/"><Icon n="home" s={17} /> Ana sayfa</Link>
        <Link className="btn btn-ghost" href="/bolgeler">Tüm bölgeler</Link>
        <Link className="btn btn-ghost" href="/arama">Proje ara</Link>
      </div>

      {/* Liste okunamadıysa hiç basılmıyor: boş başlıklarla dolu bir
          ızgara, hatanın kendisinden daha kafa karıştırıcı. */}
      {bolgeler.length > 0 && (
        <div className="seo-links" style={{ marginTop: 54, textAlign: 'left' }}>
          {[0, 1, 2, 3].map((k) => (
            <div key={k}>
              <h2 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--ink-3)', marginBottom: 12 }}>
                {k === 0 ? 'Popüler bölgeler' : k === 1 ? 'Ege' : k === 2 ? 'Akdeniz' : 'Diğer'}
              </h2>
              {bolgeler.slice(k * 2, k * 2 + 3).map((b) => (
                <Link key={b.slug} href={`/projeler/${b.slug}`}>{b.ad} projeleri</Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
