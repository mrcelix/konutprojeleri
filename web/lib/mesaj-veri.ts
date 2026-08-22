import 'server-only';
import { prisma } from './db';
import { trTarihSaat } from './panel-baglam';
import type { KonusmaVeri } from '@/components/panel/MesajPaneli';

/**
 * Konuşmaları panel bileşeninin beklediği biçime çevirir.
 * Hem firma hem yönetim paneli aynı fonksiyonu kullanır;
 * kapsam `projeIdler` ile daraltılır (null = tüm envanter).
 */
export async function konusmalariGetir(projeIdler: string[] | null, seciliId?: string) {
  const konusmalar = await prisma.konusma.findMany({
    where: projeIdler ? { projeId: { in: projeIdler } } : {},
    orderBy: [{ okundu: 'asc' }, { guncelleme: 'desc' }],
    take: 60,
    select: {
      id: true, konu: true, soranAd: true, soranEposta: true, durum: true, okundu: true,
      guncelleme: true,
      proje: { select: { ad: true, slug: true } },
      mesajlar: {
        orderBy: { olusturma: 'asc' },
        select: {
          id: true, metin: true, soranMi: true, olusturma: true,
          yazar: { select: { ad: true } },
        },
      },
    },
  });

  const veri: KonusmaVeri[] = konusmalar.map((k) => ({
    id: k.id,
    konu: k.konu,
    soranAd: k.soranAd,
    soranEposta: k.soranEposta,
    projeAd: k.proje.ad,
    projeSlug: k.proje.slug,
    durum: k.durum,
    okundu: k.okundu,
    zaman: trTarihSaat(k.guncelleme),
    mesajlar: k.mesajlar.map((m) => ({
      id: m.id, metin: m.metin, soranMi: m.soranMi,
      yazar: m.yazar?.ad ?? null, zaman: trTarihSaat(m.olusturma),
    })),
  }));

  const secili = veri.find((x) => x.id === seciliId) ?? veri[0] ?? null;

  // Açılan konuşma okundu işaretlenir — panelde rozet düşer
  if (secili && !secili.okundu) {
    await prisma.konusma.update({ where: { id: secili.id }, data: { okundu: true } });
    secili.okundu = true;
  }

  return { veri, secili };
}
