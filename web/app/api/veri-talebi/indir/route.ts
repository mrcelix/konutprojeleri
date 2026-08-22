import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';
import { kisiselVeriTopla } from '@/lib/kisisel-veri';
import { site } from '@/lib/site';

/* Kişisel veri dökümü (KVKK md. 11/b–c).

   Yetki JETONLA: veri sahibinin hesabı yok, doğrulama bağlantısındaki
   jeton kimliğin kendisi. Jeton düz saklanmadığı için özetiyle
   aranıyor ve TALEP DOĞRULANMIŞ olmalı — yalnızca bağlantıya sahip
   olmak yetmiyor, bağlantıya tıklanmış olması gerekiyor.

   Yanıt önbelleklenmiyor ve arama motorlarına kapalı. */
export async function GET(istek: Request) {
  const jeton = new URL(istek.url).searchParams.get('jeton') ?? '';
  if (!jeton) return yanitsiz();

  const talep = await prisma.veriTalebi.findUnique({
    where: { jetonHash: createHash('sha256').update(jeton).digest('hex') },
    select: { eposta: true, tip: true, dogrulandi: true, jetonSonKullanma: true },
  });

  if (!talep || !talep.dogrulandi
    || talep.tip !== 'ERISIM'
    || talep.jetonSonKullanma < new Date()) {
    return yanitsiz();
  }

  const rapor = await kisiselVeriTopla(talep.eposta);
  const govde = {
    hakkinda: `${site.ad} — 6698 sayılı KVKK md. 11 kapsamında hazırlanan kişisel veri dökümü.`,
    veriSorumlusu: site.unvan || site.ad,
    ...rapor,
  };

  const tarih = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(govde, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="kisisel-veri-${tarih}.json"`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}

/** Geçersiz jetonda tek tip yanıt: hangi jetonun var olduğu sızmasın. */
const yanitsiz = () =>
  new Response('Bağlantı geçersiz veya süresi dolmuş.', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
