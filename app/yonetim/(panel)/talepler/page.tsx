import Link from 'next/link';
import { panelGerekli, yonetici } from '@/lib/yetki';
import {
  talepListesi, talepOzeti, talepDurumSayimlari,
  TALEP_SAYFA, TALEP_DURUMLARI,
} from '@/lib/queries/talepler';
import { TalepSatiri } from './TalepSatiri';

/**
 * /yonetim/talepler
 *
 * Sitenin gelir tarafı burada. Sıralama TARİHE göre değil ACİLİYETE
 * göre olsaydı daha "akıllı" görünürdü ama yanlış olurdu: en yeni
 * talep en değerlisidir, 24 saat sonra değeri düşer. Gecikenler ayrıca
 * işaretleniyor, üste taşınmıyor — taşımak yeni talebi gölgede bırakır.
 */

export const dynamic = 'force-dynamic';

type Arama = Record<string, string | string[] | undefined>;
const tek = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function yol(q: Arama, degis: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...q, sayfa: undefined, ...degis })) {
    const d = Array.isArray(v) ? v[0] : v;
    if (d) p.set(k, d);
  }
  const s = p.toString();
  return '/yonetim/talepler' + (s ? `?${s}` : '');
}

export default async function TaleplerSayfasi({
  searchParams,
}: {
  searchParams: Promise<Arama>;
}) {
  const k = await panelGerekli();
  const admin = yonetici(k);
  const q = await searchParams;
  const kapsam = admin ? null : k.firma_id;

  const suzgec = {
    durum: tek(q.durum),
    sorun: tek(q.sorun),
    firmaId: kapsam,
    sayfa: Number(tek(q.sayfa)) || 1,
  };

  const [{ satirlar, toplam }, ozet, durumlar] = await Promise.all([
    talepListesi(suzgec),
    talepOzeti(kapsam),
    talepDurumSayimlari(kapsam),
  ]);

  const sonSayfa = Math.max(1, Math.ceil(toplam / TALEP_SAYFA));
  const sayfa = Math.min(suzgec.sayfa, sonSayfa);
  const suzgecVar = !!(suzgec.durum || suzgec.sorun);

  return (
    <main className="yn-sayfa">
      <header className="yn-baslik">
        <div>
          <h1 className="h2">Talepler</h1>
          <p className="prose" style={{ fontSize: 13 }}>
            {toplam} talep{suzgecVar && ' (süzülmüş)'}
          </p>
        </div>
      </header>

      {/* ── Özet ── */}
      <div className="yn-sayimlar">
        <span className="yn-sayim">
          <b className="sayi">{ozet.yeni}</b>
          <span>açılmamış</span>
        </span>
        <Link href={yol(q, { sorun: 'geciken', durum: undefined })} className="yn-sayim">
          <b className="sayi" style={ozet.geciken > 0 ? { color: 'var(--danger)' } : undefined}>
            {ozet.geciken}
          </b>
          <span>24 saati aştı</span>
        </Link>
        <span className="yn-sayim">
          <b className="sayi">
            {ozet.ortYanitSaat != null ? `${ozet.ortYanitSaat}s` : '—'}
          </b>
          <span>ort. yanıt süresi</span>
        </span>
        <span className="yn-sayim">
          <b className="sayi">{ozet.bu_ay}</b>
          <span>bu ay</span>
        </span>
        <span className="yn-sayim">
          <b className="sayi">{ozet.satis}</b>
          <span>satışa dönen</span>
        </span>
      </div>

      <p className="dz-not">
        Ortalama yanıt süresi yalnızca <b>açılmış</b> taleplerden hesaplanır.
        Açılmamışları dahil etmek ortalamayı firma ne yaparsa yapsın
        düzelmeyecek biçimde büyütürdü; o bilgi zaten &ldquo;24 saati aştı&rdquo;
        sayısında var. Bu ölçüm firma karnesine işler.
      </p>

      {/* ── Süzgeçler ── */}
      <div className="yn-cipler" style={{ marginTop: 'var(--s-4)' }}>
        <span className="eyebrow">Durum</span>
        {durumlar.map((d) => (
          <Link
            key={d.durum}
            href={yol(q, {
              durum: suzgec.durum === d.durum ? undefined : d.durum,
              sorun: undefined,
            })}
            className={`chip${suzgec.durum === d.durum ? ' is-selected' : ''}`}
          >
            {TALEP_DURUMLARI[d.durum] ?? d.durum} <em>{d.n}</em>
          </Link>
        ))}
        {suzgecVar && (
          <Link href="/yonetim/talepler" className="chip">Süzgeçleri temizle</Link>
        )}
      </div>

      {/* ── Liste ── */}
      {satirlar.length === 0 ? (
        <div className="kart empty">
          <p className="kp-empty__title">
            {suzgecVar ? 'Bu süzgeçlerle talep yok' : 'Henüz talep yok'}
          </p>
          <p className="kp-empty__text">
            Talepler proje sayfalarındaki fiyat isteme formundan gelir.
          </p>
          {suzgecVar && (
            <Link href="/yonetim/talepler" className="kp-empty__option is-primary">
              Süzgeçleri temizle
            </Link>
          )}
        </div>
      ) : (
        <ul className="tl-liste">
          {satirlar.map((t) => (
            <TalepSatiri key={t.id} t={t} admin={admin} />
          ))}
        </ul>
      )}

      {sonSayfa > 1 && (
        <nav className="yn-sayfalar" aria-label="Sayfalar">
          {sayfa > 1 && (
            <Link href={yol(q, { sayfa: String(sayfa - 1) })} className="chip">
              ← Önceki
            </Link>
          )}
          <span className="eyebrow">{sayfa} / {sonSayfa}</span>
          {sayfa < sonSayfa && (
            <Link href={yol(q, { sayfa: String(sayfa + 1) })} className="chip">
              Sonraki →
            </Link>
          )}
        </nav>
      )}

      <p className="yn-not">
        Telefon numaraları kişisel veridir ve maskeli gösterilir. Numarayı
        görüntüleyen kişi, zaman ve IP denetim günlüğüne yazılır; o kayıt
        silinemez. KVKK aydınlatma metni talep formunda onaylanmıştır ve
        onayın sürümü <code>kvkk_onay</code> tablosunda saklanır.
      </p>
    </main>
  );
}
