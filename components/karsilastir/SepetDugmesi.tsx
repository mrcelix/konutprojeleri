import Link from 'next/link';
import { SEPET_AZAMI, sepetYolu } from '@/lib/sepet';

/**
 * Karşılaştırma sepeti düğmeleri ve şerit.
 *
 * Tamamı form; JavaScript yok. Bağlantı kullanılsaydı Next'in ön
 * yüklemesi tıklanmadan sepete ekleyebilirdi.
 */

/** Tek projeyi sepete ekleyen/çıkaran düğme. */
export function SepetDugmesi({
  slug, don, sepette, kucuk,
}: {
  slug: string;
  don: string;
  /** Bilinmiyorsa (statik sayfa, çerez okunmadı) undefined bırakılır. */
  sepette?: boolean;
  kucuk?: boolean;
}) {
  return (
    <form method="post" action="/api/karsilastir" className="sp-form">
      <input type="hidden" name="ekle" value={slug} />
      <input type="hidden" name="don" value={don} />
      <button
        type="submit"
        className={`kp-btn is-ghost${kucuk ? ' is-small' : ''}${sepette ? ' is-selected' : ''}`}
        aria-pressed={sepette}
      >
        {sepette ? '✓ Karşılaştırmada' : 'Karşılaştır'}
      </button>
    </form>
  );
}

/**
 * Alt şerit — sepette proje varken her arama sayfasında görünür.
 *
 * Mockup'taki "sepet her sayfada birikiyor" davranışı: kullanıcı
 * gezinirken seçtiklerini unutmasın diye kalıcı olarak hatırlatılır.
 */
export function SepetSeridi({
  sluglar, adlar, don,
}: {
  sluglar: string[];
  /** slug → görünen ad. Bilinmeyen slug ham haliyle gösterilir. */
  adlar?: Record<string, string>;
  don: string;
}) {
  if (sluglar.length === 0) return null;

  return (
    <div className="sp-serit" role="region" aria-label="Karşılaştırma sepeti">
      <span className="sp-serit__sayi">
        <b>{sluglar.length}</b> / {SEPET_AZAMI} proje
      </span>

      <ul className="sp-serit__liste">
        {sluglar.map((s) => (
          <li key={s}>
            <span>{adlar?.[s] ?? s}</span>
            <form method="post" action="/api/karsilastir">
              <input type="hidden" name="cikar" value={s} />
              <input type="hidden" name="don" value={don} />
              <button type="submit" aria-label={`${adlar?.[s] ?? s} projesini çıkar`}>
                ×
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form method="post" action="/api/karsilastir" className="sp-serit__temizle">
        <input type="hidden" name="temizle" value="1" />
        <input type="hidden" name="don" value={don} />
        <button type="submit" className="kp-btn is-ghost is-small">Temizle</button>
      </form>

      {sluglar.length >= 2 ? (
        <Link href={sepetYolu(sluglar)} className="kp-btn is-small">
          Karşılaştır
        </Link>
      ) : (
        <span className="sp-serit__ipucu">Karşılaştırmak için en az iki proje seçin</span>
      )}
    </div>
  );
}
