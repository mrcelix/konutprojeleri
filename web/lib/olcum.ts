import 'server-only';
import { prisma } from './db';

/* ============================================================
   Core Web Vitals raporlama.

   Google sıralamada ORTALAMAYI değil 75. YÜZDELİK DİLİMİ kullanıyor.
   Ortalamaya bakmak yanıltıcı: birkaç çok hızlı ziyaret, yavaş
   çoğunluğu gizler. Burada da p75 hesaplanıyor.

   Eşikler Google'ın tanımı:
     LCP  ≤ 2500 ms iyi, ≤ 4000 ms orta
     INP  ≤  200 ms iyi, ≤  500 ms orta
     CLS  ≤ 0.10    iyi, ≤ 0.25   orta
   ============================================================ */

export const ESIKLER: Record<string, { iyi: number; orta: number; birim: string }> = {
  LCP: { iyi: 2500, orta: 4000, birim: 'ms' },
  INP: { iyi: 200, orta: 500, birim: 'ms' },
  CLS: { iyi: 0.1, orta: 0.25, birim: '' },
  FCP: { iyi: 1800, orta: 3000, birim: 'ms' },
  TTFB: { iyi: 800, orta: 1800, birim: 'ms' },
};

export interface MetrikOzet {
  metrik: string;
  p75: number;
  orneklem: number;
  derece: 'good' | 'needs-improvement' | 'poor';
  iyiOran: number;
}

function derecele(metrik: string, p75: number): MetrikOzet['derece'] {
  const e = ESIKLER[metrik];
  if (!e) return 'poor';
  if (p75 <= e.iyi) return 'good';
  if (p75 <= e.orta) return 'needs-improvement';
  return 'poor';
}

/**
 * Son N gün için metrik özeti.
 *
 * p75 veritabanında `percentile_cont` ile hesaplanıyor — tüm satırları
 * uygulamaya çekip orada sıralamak, ölçüm sayısı büyüdükçe belleği
 * boşuna doldurur.
 *
 * `yol` verilirse özet tek bir sayfaya daralıyor: "bu şablonun p75'i
 * ne?" sorusu site geneli ortalamayla cevaplanamıyor.
 */
export async function cwvOzet(
  gun = 28, cihaz?: 'mobil' | 'masaustu', yol?: string,
): Promise<MetrikOzet[]> {
  const sinir = new Date(Date.now() - gun * 864e5);

  /* Koşullu filtreler `Prisma.sql` parçası olarak eklenmiyor.
     Parça birleştirme Next.js paketinde çalışmıyordu: derlenmiş
     sunucu bloğunda parça bir Sql nesnesi olarak tanınmayıp sıradan
     bir değere düşüyor ve sorguya `$2` olarak giriyordu — sayfa
     `syntax error at or near "$2"` ile 500 veriyordu. Filtre yerine
     "parametre NULL ise koşul yok" kalıbı: tek şablon, üç düz
     parametre, her ortamda aynı davranış. */
  const cihazF = cihaz ?? null;
  const yolF = yol ?? null;

  const satirlar = await prisma.$queryRaw<{
    metrik: string; p75: number; orneklem: bigint; iyi: bigint;
  }[]>`
    SELECT metrik,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY deger) AS p75,
           count(*) AS orneklem,
           count(*) FILTER (WHERE derece = 'good') AS iyi
    FROM olcum_cwv
    WHERE olusturma >= ${sinir}
      AND (${cihazF}::text IS NULL OR cihaz = ${cihazF})
      AND (${yolF}::text IS NULL OR yol = ${yolF})
    GROUP BY metrik
  `;

  return satirlar
    .map((r) => {
      const p75 = Number(r.p75);
      const orneklem = Number(r.orneklem);
      return {
        metrik: r.metrik,
        p75: r.metrik === 'CLS' ? Math.round(p75 * 1000) / 1000 : Math.round(p75),
        orneklem,
        derece: derecele(r.metrik, p75),
        iyiOran: orneklem ? Math.round((Number(r.iyi) / orneklem) * 100) : 0,
      };
    })
    .sort((a, b) => ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].indexOf(a.metrik)
      - ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].indexOf(b.metrik));
}

/** En yavaş sayfalar — hangi şablonun sorunlu olduğunu gösterir. */
export async function enYavasSayfalar(metrik = 'LCP', gun = 28, limit = 12) {
  const sinir = new Date(Date.now() - gun * 864e5);

  const satirlar = await prisma.$queryRaw<{
    yol: string; p75: number; orneklem: bigint;
  }[]>`
    SELECT yol,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY deger) AS p75,
           count(*) AS orneklem
    FROM olcum_cwv
    WHERE olusturma >= ${sinir} AND metrik = ${metrik}
    GROUP BY yol
    -- Az örneklemli sayfalar gürültü; en az 5 ölçüm istiyoruz
    HAVING count(*) >= 5
    ORDER BY p75 DESC
    LIMIT ${limit}
  `;

  return satirlar.map((r) => ({
    yol: r.yol,
    p75: Math.round(Number(r.p75)),
    orneklem: Number(r.orneklem),
    derece: derecele(metrik, Number(r.p75)),
  }));
}

/** Cihaz kırılımı — mobil neredeyse her zaman daha yavaş. */
export async function cihazKirilimi(gun = 28) {
  const [mobil, masaustu] = await Promise.all([
    cwvOzet(gun, 'mobil'),
    cwvOzet(gun, 'masaustu'),
  ]);
  return { mobil, masaustu };
}

/** Eski ölçümleri siler — KVKK saklama ilkesi ve tablo boyutu. */
export async function eskiOlcumleriTemizle(gun = 90): Promise<number> {
  const { count } = await prisma.olcumCWV.deleteMany({
    where: { olusturma: { lt: new Date(Date.now() - gun * 864e5) } },
  });
  return count;
}
