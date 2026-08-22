import { NextResponse } from 'next/server';
import { aktifKullanici } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { depoEksigi } from '@/lib/depo';
import { googleAcikMi } from '@/lib/google';

/* ============================================================
   Sağlık ucu.

   Üretimde kurumsal sayfalar 500 verirken ana sayfa 200 dönüyordu;
   sebebi anlamak için Vercel günlüklerine bakmak gerekiyordu. Bu uç,
   uygulamanın veritabanını GERÇEKTEN görüp göremediğini tek istekle
   söylüyor: statik HTML'den servis edilen bir sayfanın 200 dönmesi,
   veritabanının ayakta olduğu anlamına gelmiyor.

   Sayım döndürüyor ama İÇERİK döndürmüyor: uç herkese açık ve
   kimliği doğrulanmamış bir istek envanteri okuyamamalı.

   Bağlantı dizesi, kullanıcı adı ve sunucu adı ASLA yanıta girmiyor —
   teşhis ucu, sızıntı yüzeyi olmamalı.
   ============================================================ */

export const dynamic = 'force-dynamic';

/**
 * İsteğe bağlı entegrasyonların durumu — YALNIZCA YÖNETİCİYE.
 *
 * Ortam değişkeni eklenip yeniden dağıtım yapılmadığında ya da adı
 * yanlış yazıldığında hiçbir şey olmuyor: düğme çıkmıyor, yükleme
 * kapalı kalıyor ve sebebi Vercel günlüklerinden anlaşılmıyordu.
 * Burada yalnızca AÇIK/KAPALI bilgisi var; anahtarların kendisi
 * hiçbir koşulda yanıta girmiyor.
 */
async function entegrasyonlar() {
  const k = await aktifKullanici();
  if (k?.rol !== 'ADMIN') return undefined;

  const depoHata = depoEksigi();
  return {
    /* HANGİ DAĞITIM: değişken eklenip "hâlâ kapalı" görünmesinin en
       sık sebebi, bakılan adresin başka bir dağıtımı (Preview ya da
       ikinci bir proje) göstermesi. Ortam adı ve commit, panelde
       gördüğünüzle karşılaştırmayı tek bakışta mümkün kılıyor. */
    dagitim: {
      ortam: process.env.VERCEL_ENV ?? 'yerel',
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || '—',
      dal: process.env.VERCEL_GIT_COMMIT_REF ?? '—',
    },
    google: googleAcikMi() ? 'acik' : 'kapali (GOOGLE_ISTEMCI_ID / GOOGLE_ISTEMCI_GIZLI)',
    depo: depoHata ?? `acik (${(process.env.DEPO_SURUCU ?? '').trim().toLowerCase()})`,
    /* Bu ürün ödeme almıyor; sağlık raporunun ödeme satırı
       villahane'den kalmıştı. Yerine SESSİZCE bozulan asıl şey
       konuldu: satış talebi bildiriminin alıcısı. `EKIP_EPOSTA`
       yoksa aktif yönetici hesaplarına düşüyor; ikisi de yoksa
       gelen talep hiç kimseye ulaşmıyor. */
    bildirimAlicisi: process.env.EKIP_EPOSTA?.trim()
      ? 'acik (EKIP_EPOSTA)'
      : 'EKIP_EPOSTA yok — aktif yonetici hesaplarina dusuyor',
    eposta: process.env.RESEND_API_KEY || process.env.SMTP_HOST ? 'acik' : 'kapali',
    cron: process.env.CRON_SECRET ? 'acik' : 'kapali (CRON_SECRET)',
    /* Dağıtımda GERÇEKTEN hangi adların tanımlı olduğu — yalnızca AD,
       değer hiçbir koşulda değil.

       Sebep: "değişkeni ekledim ama kapalı görünüyor" durumunun en
       sinsi hâli, adın ufak farkla yazılmış olması. Türkçe klavyede
       `DEPO_SURUCU` yerine `DEPO_SÜRÜCÜ`, `GOOGLE_ISTEMCI_ID` yerine
       `GOOGLE_İSTEMCİ_ID` yazmak çok kolay ve hiçbir yerde hata
       vermiyor; değişken sessizce görünmez oluyor. Liste, yanlış adı
       tek bakışta gösteriyor. */
    tanimliAdlar: Object.keys(process.env)
      .filter((a) => /GOOGLE|DEPO|SUPABASE|CRON|SMTP|RESEND|POSTA|YONETICI/i.test(a))
      .sort(),
  };
}

export async function GET() {
  const basla = Date.now();
  try {
    const [proje, bolge, sayfa, ozellik] = await Promise.all([
      prisma.proje.count({ where: { yayinda: true } }),
      prisma.bolge.count({ where: { yayinda: true } }),
      prisma.sayfa.count({ where: { yayinda: true } }),
      prisma.ozellik.count(),
    ]);

    /* Bağlantı var ama tablolar boşsa sayfalar 404 üretir; "sağlıklı"
       demek yanıltıcı olurdu. */
    const eksik = [
      proje === 0 ? 'yayında proje yok' : null,
      bolge === 0 ? 'yayında bölge yok' : null,
      sayfa === 0 ? 'yayında kurumsal sayfa yok' : null,
    ].filter(Boolean);

    return NextResponse.json({
      durum: eksik.length ? 'eksik-veri' : 'saglikli',
      veritabani: 'baglanti-var',
      sayim: { proje, bolge, sayfa, ozellik },
      entegrasyon: await entegrasyonlar(),
      uyari: eksik.length ? eksik : undefined,
      sureMs: Date.now() - basla,
    }, { status: eksik.length ? 503 : 200, headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('Sağlık kontrolü başarısız:', e);
    return NextResponse.json({
      durum: 'hatali',
      veritabani: 'baglanti-yok',
      /* Sürücü mesajı ana sunucu adını ve kullanıcı adını içerebiliyor;
         yalnızca hata SINIFI dönüyor. */
      hataTipi: e instanceof Error ? e.name : 'Bilinmeyen',
      sureMs: Date.now() - basla,
    }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
