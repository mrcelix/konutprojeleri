import Image from 'next/image';
import Link from 'next/link';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import { prisma } from '@/lib/db';
import { ziyaretciBaglam, trGun } from '@/lib/panel-baglam';
import { TLkisa } from '@/lib/bicim';
import { telefonBicim } from '@/lib/talep';
import { meta } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = meta({
  baslik: 'Taleplerim',
  aciklama: 'Gönderdiğiniz satış talepleri ve durumları.',
  yol: '/hesap',
  indexle: false,
});

const DURUM: Record<string, { ad: string; renk: string }> = {
  YENI: { ad: 'Yeni', renk: 'var(--primary)' },
  ARANDI: { ad: 'Arandı', renk: 'var(--ink-2)' },
  ULASILAMADI: { ad: 'Ulaşılamadı', renk: 'var(--accent)' },
  RANDEVU: { ad: 'Randevu verildi', renk: 'var(--success)' },
  ILGILENMIYOR: { ad: 'Kapandı', renk: 'var(--ink-3)' },
  SATIS: { ad: 'Satışa dönüştü', renk: 'var(--success)' },
  KAPANDI: { ad: 'Kapandı', renk: 'var(--ink-3)' },
};

/* ============================================================
   Ziyaretçinin kendi talepleri.

   Talepler hesaba değil E-POSTAYA bağlı: form dolduranların çoğu
   hesap açmıyor ve sonradan kaydolan biri o talepleri de görmeli.
   Eşleşme `Talep.eposta` üzerinden.

   Bu, e-postasını doğrulamamış birinin başkasının talebini görmesi
   anlamına GELMİYOR: hesabın e-postası giriş kimliği ve parolayı
   bilen kişi zaten o adresin sahibi sayılıyor; Google ile açılan
   hesapta adresi Google doğruluyor.

   YALNIZCA TELEFON BIRAKAN TALEPLER BURADA GÖRÜNMÜYOR. Form
   e-postayı zorunlu tutmuyor ve talep sahiplerinin büyük bölümü
   sadece numara bırakıyor. Bu sınır sayfada AÇIKÇA yazılı; sessizce
   eksik liste göstermek "talebim kaybolmuş" izlenimi verirdi.
   ============================================================ */
export default async function HesapSayfasi() {
  const { kullanici, nav, kok } = await ziyaretciBaglam();

  const talepler = await prisma.talep.findMany({
    where: { eposta: kullanici.eposta },
    orderBy: { olusturma: 'desc' },
    take: 50,
    select: {
      id: true, kod: true, durum: true, niyet: true, olusturma: true,
      telefon: true, butceMin: true, butceMax: true,
      daireTipi: { select: { ad: true, brutM2: true } },
      proje: {
        select: {
          ad: true, slug: true, mahalle: true, fiyatMin: true,
          bolge: { select: { ad: true } },
          firma: { select: { ad: true } },
          medya: { select: { url: true, alt: true }, orderBy: { sira: 'asc' }, take: 1 },
        },
      },
    },
  });

  const acik = talepler.filter((t) => ['YENI', 'ARANDI', 'RANDEVU'].includes(t.durum));

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik="Taleplerim"
      aciklama={talepler.length
        ? `${talepler.length} talep · ${acik.length} tanesi açık`
        : 'Henüz talebiniz yok'}
      eylem={<Link className="btn btn-primary btn-sm" href="/arama">Proje ara</Link>}
    >
      {talepler.length === 0 ? (
        <div className="kart" style={{ padding: 24, textAlign: 'center' }}>
          <p className="muted" style={{ margin: '0 0 16px' }}>
            <b>{kullanici.eposta}</b> adresiyle gönderilmiş bir talep bulunamadı.
            Formu yalnızca telefon numarası bırakarak doldurduysanız talebiniz
            burada görünmez — satış ekibi yine sizi arayacak.
          </p>
          <Link className="btn btn-primary btn-sm" href="/arama">Proje ara</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 12 }}>
            {talepler.map((t) => {
              const d = DURUM[t.durum] ?? { ad: t.durum, renk: 'var(--ink-2)' };
              return (
                <article className="kart hesap-rez" key={t.id}>
                  {t.proje?.medya[0] && (
                    <Image src={t.proje.medya[0].url} alt={t.proje.medya[0].alt}
                      width={132} height={96} sizes="132px" style={{ objectFit: 'cover' }} />
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="hesap-rez-bas">
                      {t.proje
                        ? <Link href={`/proje/${t.proje.slug}`}><b>{t.proje.ad}</b></Link>
                        : <b>Genel bilgi talebi</b>}
                      <span className="badge" style={{ color: d.renk }}>{d.ad}</span>
                    </div>

                    <div className="tiny dim" style={{ marginTop: 4 }}>
                      {t.proje && `${t.proje.mahalle}, ${t.proje.bolge.ad} · ${t.proje.firma.ad}`}
                    </div>

                    <div className="hesap-rez-satir">
                      <span><Icon n="clock" s={14} /> {trGun(t.olusturma)}</span>
                      <span><Icon n="phone" s={14} /> {telefonBicim(t.telefon)}</span>
                      {t.daireTipi && (
                        <span><Icon n="home" s={14} /> {t.daireTipi.ad} · {t.daireTipi.brutM2} m²</span>
                      )}
                      {(t.butceMin || t.butceMax) && (
                        <span>
                          <Icon n="wallet" s={14} />{' '}
                          {t.butceMin ? TLkisa(t.butceMin) : ''}
                          {t.butceMin && t.butceMax ? ' – ' : ''}
                          {t.butceMax ? TLkisa(t.butceMax) : ''}
                        </span>
                      )}
                    </div>

                    <div className="tiny dim" style={{ marginTop: 6 }}>
                      Talep kodu: <code>{t.kod}</code>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="tiny dim" style={{ marginTop: 16 }}>
            Bu listede yalnızca <b>{kullanici.eposta}</b> adresiyle gönderilen
            talepler var. E-posta bırakmadan yalnızca telefonla gönderdiğiniz
            talepler burada görünmüyor.
          </p>
        </>
      )}
    </PanelKabuk>
  );
}
