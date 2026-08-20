import { yoneticiGerekli } from '@/lib/yetki';
import { bekleyenOnaylar } from '@/lib/queries/onay';
import { OnayKarti } from './OnayKarti';

/**
 * /yonetim/onay — onay kuyruğu.
 *
 * Yalnızca yönetim. Firma kendi gönderdiği kaydı burada göremez;
 * göreceği yer proje düzenleyicisidir ("onay bekliyor" bilgisi).
 * Kuyruğu firmaya açmak, karar sürecini pazarlığa dönüştürürdü.
 *
 * İşaretli kayıtlar üstte: incelenmesi gereken asıl kayıtlar onlar.
 */

export const dynamic = 'force-dynamic';

export default async function OnaySayfasi() {
  await yoneticiGerekli();
  const kayitlar = await bekleyenOnaylar().catch(() => []);

  return (
    <main className="yn-sayfa">
      <header className="yn-baslik">
        <div>
          <h1 className="kp-h2">Onay kuyruğu</h1>
          <p className="kp-lead" style={{ fontSize: 13 }}>
            {kayitlar.length > 0
              ? `${kayitlar.length} değişiklik bekliyor. Onaylanana kadar sitede eski değerler görünüyor.`
              : 'Bekleyen değişiklik yok.'}
          </p>
        </div>
      </header>

      {kayitlar.length === 0 ? (
        <div className="kp-card kp-empty">
          <p className="kp-empty__title">Kuyruk boş</p>
          <p className="kp-empty__text">
            Firma panelinden gelen değişiklikler burada birikir. Yönetim
            hesabıyla yapılan düzenlemeler onaya girmez, doğrudan uygulanır.
          </p>
        </div>
      ) : (
        <ul className="on-liste">
          {kayitlar.map((kayit) => (
            <OnayKarti key={kayit.id} kayit={kayit} />
          ))}
        </ul>
      )}
    </main>
  );
}
