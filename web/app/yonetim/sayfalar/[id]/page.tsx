import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import PanelKabuk from '@/components/panel/PanelKabuk';
import SayfaDuzenle from '@/components/panel/SayfaDuzenle';
import SayfaVarsayilan from '@/components/panel/SayfaVarsayilan';
import { prisma } from '@/lib/db';
import { govdeMetne, sssMetne } from '@/lib/icerik';
import { yonetimBaglam } from '@/lib/panel-baglam';


export const dynamic = 'force-dynamic';

export default async function SayfaDuzenleme({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { kullanici, nav, kok } = await yonetimBaglam();

  const s = await prisma.sayfa.findUnique({ where: { id } });
  if (!s) notFound();

  const yol = s.dil === 'EN' ? `/en/${s.slug}` : `/${s.slug}`;

  return (
    <PanelKabuk
      kullanici={kullanici} nav={nav} kok={kok}
      baslik={s.h1}
      aciklama={`${yol} · ${s.dil === 'EN' ? 'İngilizce' : 'Türkçe'}`}
      eylem={
        <>
          {s.yayinda && (
            <Link className="btn btn-quiet btn-sm" href={yol} target="_blank">
              Sayfayı gör <Icon n="arrowR" s={14} />
            </Link>
          )}
          {/* Metin kodda güncellendiğinde yayındaki sayfa eski hâlinde
              kalıyor; tazelemenin tek yolu sunucudaki tohum betiğiydi. */}
          <SayfaVarsayilan id={s.id} />
          <Link className="btn btn-ghost btn-sm" href="/yonetim/sayfalar">
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
              <Icon n="arrowR" s={15} />
            </span>
            Sayfalar
          </Link>
        </>
      }
    >
      <SayfaDuzenle
        sayfa={{
          // Kurumsal sayfa şu an yalnızca TR/EN üretiliyor (Faz 20);
          // `Dil` enum'u dört değerli ama rota ağacı iki dilde.
          id: s.id, slug: s.slug, dil: s.dil as 'TR' | 'EN',
          baslik: s.baslik, h1: s.h1, aciklama: s.aciklama,
          // JSON sütunları düzenlenebilir düz metne çevriliyor
          govde: govdeMetne(Array.isArray(s.govde) ? s.govde as never : []),
          sss: sssMetne(Array.isArray(s.sss) ? s.sss as never : undefined),
          ctaMetin: s.ctaMetin ?? '', ctaYol: s.ctaYol ?? '',
          indexle: s.indexle, yayinda: s.yayinda,
        }}
      />
    </PanelKabuk>
  );
}
