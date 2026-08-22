import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import TalepEylem from '@/components/panel/TalepEylem';
import { prisma } from '@/lib/db';
import { telefonBicim } from '@/lib/talep';
import { TLkisa } from '@/lib/bicim';
import { trTarihSaat, yonetimBaglam } from '@/lib/panel-baglam';
import { TALEP_DURUMLARI, TALEP_NIYETLERI } from '@/lib/kategori-sabit';

/* ============================================================
   Satış talepleri — panelin en çok kullanılan ekranı.

   Ekran tek bir soruya hizmet ediyor: BUGÜN KİMİ ARAYACAĞIZ?

   Bu yüzden sıralama duruma göre değil BEKLEME SÜRESİNE göre ve
   bekleyenler üstte. Aranmış kayıtlar listede kalıyor ama
   söndürülüyor — silmek, aynı kişinin ikinci kez aranmasına yol
   açardı.

   BEKLEME SÜRESİ HER SATIRDA. Konut satışında ilk temasın hızı
   belirleyici: alıcı aynı gün üç projeye form dolduruyor ve ilk
   arayan öne geçiyor. Dört saati geçen satır işaretli.
   ============================================================ */

export const dynamic = 'force-dynamic';

const DURUM_ADI: Record<string, string> = {
  YENI: 'Bekliyor',
  ARANDI: 'Arandı',
  ULASILAMADI: 'Ulaşılamadı',
  RANDEVU: 'Randevu',
  ILGILENMIYOR: 'İlgilenmiyor',
  SATIS: 'Satış',
  KAPANDI: 'Kapandı',
};

/* Niyet AYNI KUYRUKTA ama aynı iş değil: randevu isteyen kişi
   projeyi yerinde görmek istiyor ve arayan kişinin ofis/şantiye
   randevusu hazırlaması gerekiyor; katalog isteyen kişi henüz o
   aşamada değil. Ayırt edilemeden aynı listede duruyorlardı. */
const NIYET_ADI: Record<string, string> = {
  BILGI: 'Bilgi',
  FIYAT_LISTESI: 'Fiyat listesi',
  KATALOG: 'Katalog',
  RANDEVU: 'Randevu',
};

const ODEME_ADI: Record<string, string> = {
  BELIRTILMEDI: '', PESIN: 'Peşin', KREDI: 'Kredi',
  TAKSIT: 'Taksit', TAKAS: 'Takas',
};

export default async function YonetimTalepler(
  { searchParams }: {
    searchParams: Promise<{ durum?: string; niyet?: string; proje?: string }>;
  },
) {
  const b = await yonetimBaglam();
  const { durum, niyet, proje } = await searchParams;

  const durumGecerli = (TALEP_DURUMLARI as readonly string[]).includes(durum ?? '');
  const niyetGecerli = (TALEP_NIYETLERI as readonly string[]).includes(niyet ?? '');

  const talepler = await prisma.talep.findMany({
    where: {
      ...(durumGecerli ? { durum: durum as 'YENI' } : {}),
      ...(niyetGecerli ? { niyet: niyet as 'RANDEVU' } : {}),
      ...(proje ? { proje: { slug: proje } } : {}),
    },
    /* Bekleyenler önce, sonra EN ESKİSİ: liste "kimi arayacağım"
       sorusunun cevabı, arşiv değil. En uzun bekleyen en acil. */
    orderBy: [{ durum: 'asc' }, { olusturma: 'asc' }],
    take: 200,
    select: {
      id: true, kod: true, ad: true, telefon: true, eposta: true, saat: true, not: true,
      durum: true, niyet: true, ekipNotu: true, olusturma: true,
      butceMin: true, butceMax: true, odemeSekli: true, kaynak: true,
      atanan: { select: { ad: true } },
      daireTipi: { select: { ad: true, brutM2: true } },
      proje: { select: { slug: true, ad: true, fiyatMin: true, bolge: { select: { ad: true } } } },
    },
  });

  const bekleyen = talepler.filter((t) => t.durum === 'YENI').length;
  const dortSaat = Date.now() - 4 * 3600_000;
  const geciken = talepler.filter(
    (t) => t.durum === 'YENI' && t.olusturma.getTime() < dortSaat,
  ).length;

  const suzgecYolu = (degis: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ durum, niyet, proje, ...degis })) {
      if (v) p.set(k, v);
    }
    const qs = p.toString();
    return `/yonetim/talepler${qs ? `?${qs}` : ''}`;
  };

  const saatFarki = (t: Date) => Math.round((Date.now() - t.getTime()) / 3600_000);

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Satış talepleri"
      aciklama={`${talepler.length} kayıt · ${bekleyen} bekliyor`}
    >
      {geciken > 0 && (
        <div className="kart" style={{
          padding: '12px 16px', marginBottom: 14,
          borderColor: 'var(--accent)', background: 'var(--accent-100)',
        }}>
          <p className="small" style={{ margin: 0 }}>
            <b>{geciken} talep dört saattir aranmadı.</b> Alıcı aynı gün başka
            projelere de form dolduruyor; ilk arayan öne geçiyor.
          </p>
        </div>
      )}

      <div className="chips">
        <Link href={suzgecYolu({ durum: '' })}
          className={'chip' + (!durum ? ' on' : '')}>Tümü</Link>
        {TALEP_DURUMLARI.map((k) => (
          <Link key={k} href={suzgecYolu({ durum: k })}
            className={'chip' + (durum === k ? ' on' : '')}>{DURUM_ADI[k]}</Link>
        ))}
        <span className="chip-sep" />
        {TALEP_NIYETLERI.map((k) => (
          <Link key={`n-${k}`} href={suzgecYolu({ niyet: k })}
            className={'chip' + (niyet === k ? ' on' : '')}>{NIYET_ADI[k]}</Link>
        ))}
        {proje && (
          <Link href={suzgecYolu({ proje: '' })} className="chip on">
            {talepler[0]?.proje?.ad ?? 'Proje'} · süzgeci kaldır
          </Link>
        )}
      </div>

      {talepler.length === 0 ? (
        <div className="kart p-bos">
          <Icon n="phone" s={30} />
          <p>Bu filtreyle talep bulunamadı.</p>
        </div>
      ) : (
        <div className="p-tablo-kap">
          <table className="p-tablo">
            <thead>
              <tr>
                <th>Kişi</th><th>Proje</th><th>Talep</th>
                <th className="sayi">Bekleme</th><th>Durum</th>
                <th className="p-sabit-sag">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {talepler.map((t) => {
                const saat = saatFarki(t.olusturma);
                const gecikti = t.durum === 'YENI' && saat >= 4;
                const butce = t.butceMin && t.butceMax
                  ? `${TLkisa(t.butceMin)} – ${TLkisa(t.butceMax)}`
                  : t.butceMin ? `${TLkisa(t.butceMin)}+`
                    : t.butceMax ? `≤ ${TLkisa(t.butceMax)}` : null;

                return (
                  <tr key={t.id} className={t.durum === 'YENI' ? undefined : 'sonuk'}>
                    <td>
                      <b style={{ fontSize: 13.4 }}>{t.ad}</b>
                      <div className="tiny">
                        {/* Telefon TIKLANABİLİR: panelden çıkıp numarayı
                            elle çevirmek, aranana kadar geçen süreyi
                            uzatan tek gereksiz adımdı. */}
                        <a href={`tel:+90${t.telefon}`}>{telefonBicim(t.telefon)}</a>
                      </div>
                      {t.eposta && <div className="tiny dim">{t.eposta}</div>}
                      <div className="tiny dim">{t.kod}</div>
                    </td>

                    <td className="sarma">
                      {t.proje ? (
                        <>
                          <Link href={`/proje/${t.proje.slug}`} target="_blank">{t.proje.ad}</Link>
                          <div className="tiny dim">
                            {t.proje.bolge.ad} · {TLkisa(t.proje.fiyatMin)}’den
                          </div>
                        </>
                      ) : <span className="dim">genel talep</span>}
                      {t.daireTipi && (
                        <div className="tiny">
                          <b>{t.daireTipi.ad}</b> · {t.daireTipi.brutM2} m²
                        </div>
                      )}
                    </td>

                    <td className="sarma">
                      <span className="badge">{NIYET_ADI[t.niyet]}</span>
                      {butce && <div className="tiny dim">Bütçe: {butce}</div>}
                      {ODEME_ADI[t.odemeSekli] && (
                        <div className="tiny dim">{ODEME_ADI[t.odemeSekli]}</div>
                      )}
                      {t.saat && <div className="tiny dim">Uygun: {t.saat}</div>}
                      {t.not && <div className="tiny">{t.not}</div>}
                    </td>

                    <td className="sayi">
                      <span className={gecikti ? 'durum durum-PASIF' : 'tiny'}>
                        {saat < 1 ? '<1 sa' : saat < 48 ? `${saat} sa` : `${Math.round(saat / 24)} gün`}
                      </span>
                      <div className="tiny dim">{trTarihSaat(t.olusturma)}</div>
                    </td>

                    <td>
                      <span className={`durum durum-${t.durum}`}>{DURUM_ADI[t.durum]}</span>
                      {t.atanan && <div className="tiny dim">{t.atanan.ad}</div>}
                      {t.ekipNotu && <div className="tiny">{t.ekipNotu}</div>}
                    </td>

                    <td className="p-sabit-sag">
                      <TalepEylem id={t.id} durum={t.durum} ekipNotu={t.ekipNotu} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PanelKabuk>
  );
}
