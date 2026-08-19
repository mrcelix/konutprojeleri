import { sql } from '@/lib/db';

/**
 * m² Fiyat Endeksi.
 *
 * Veri kaynağı FİYAT ARŞİVİDİR (fiyat_kaydi → mv_endeks_donem).
 * Arşiv append-only olduğu için seri geriye dönük değiştirilemez;
 * endeksin güvenilirliği buna dayanır.
 *
 * TEK SORGU: 60 aylık seri, tüm iller ve Türkiye geneli birlikte gelir
 * (~600 satır). Değişim oranları JS'te hesaplanır — her il için ayrı
 * sorgu atmak bu mimaride 10 kat ağ gecikmesi demek olurdu.
 *
 * SINIR: Endeks firmaların beyan ettiği LİSTE FİYATLARINA dayanır,
 * tapu devir bedellerine değil. Pazarlık payı yansımaz. Bu sınır
 * sayfada açıkça yazılıdır — yazılmazsa ilk ciddi eleştiride
 * endeksin tamamı tartışmaya açılır.
 */

export const TURKIYE = '__TR__';

export type Nokta = { donem: string; m2: number };

export type BolgeEndeks = {
  il: string;
  m2: number;
  projeSayisi: number;
  daireSayisi: number;
  aylik: number | null;
  yillik: number | null;
  seri: Nokta[];
};

export type EndeksVerisi = {
  guncelDonem: string | null;
  turkiye: {
    m2: number | null;
    projeSayisi: number;
    daireSayisi: number;
    aylik: number | null;
    yillik: number | null;
    besYillik: number | null;
    seri: Nokta[];
  };
  bolgeler: BolgeEndeks[];
};

type Satir = {
  donem: string;
  il: string | null;
  m2_fiyat: number;
  proje_sayisi: number;
  daire_sayisi: number;
};

/** Yüzde değişim; kıyas noktası yoksa null döner (uydurulmaz). */
function degisim(seri: Nokta[], geriAy: number): number | null {
  if (seri.length < 2) return null;
  const son = seri[seri.length - 1]!;
  const hedefIndeks = seri.length - 1 - geriAy;
  if (hedefIndeks < 0) return null;
  const onceki = seri[hedefIndeks];
  if (!onceki || !onceki.m2) return null;
  return Math.round((son.m2 / onceki.m2 - 1) * 1000) / 10;
}

export async function endeksVerisi(): Promise<EndeksVerisi> {
  const satirlar = await sql<Satir[]>`
    select
      to_char(donem, 'YYYY-MM') as donem,
      il,
      m2_fiyat::float8   as m2_fiyat,
      proje_sayisi,
      daire_sayisi
    from mv_endeks_donem
    where donem >= date_trunc('month', current_date) - interval '60 months'
    order by donem
  `;

  const gruplar = new Map<string, Satir[]>();
  for (const s of satirlar) {
    const anahtar = s.il ?? TURKIYE;
    const liste = gruplar.get(anahtar);
    if (liste) liste.push(s);
    else gruplar.set(anahtar, [s]);
  }

  const trSatirlar = gruplar.get(TURKIYE) ?? [];
  const trSeri: Nokta[] = trSatirlar.map((s) => ({ donem: s.donem, m2: s.m2_fiyat }));
  const trSon = trSatirlar[trSatirlar.length - 1];

  const bolgeler: BolgeEndeks[] = [];
  for (const [il, liste] of gruplar) {
    if (il === TURKIYE) continue;
    const seri = liste.map((s) => ({ donem: s.donem, m2: s.m2_fiyat }));
    const son = liste[liste.length - 1]!;
    bolgeler.push({
      il,
      m2: son.m2_fiyat,
      projeSayisi: son.proje_sayisi,
      daireSayisi: son.daire_sayisi,
      aylik: degisim(seri, 1),
      yillik: degisim(seri, 12),
      seri,
    });
  }

  bolgeler.sort((a, b) => b.m2 - a.m2);

  return {
    guncelDonem: trSon?.donem ?? null,
    turkiye: {
      m2: trSon?.m2_fiyat ?? null,
      projeSayisi: trSon?.proje_sayisi ?? 0,
      daireSayisi: trSon?.daire_sayisi ?? 0,
      aylik: degisim(trSeri, 1),
      yillik: degisim(trSeri, 12),
      besYillik: degisim(trSeri, 60),
      seri: trSeri,
    },
    bolgeler,
  };
}

/** '2026-08' → 'Ağustos 2026' */
const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function donemAdi(donem: string | null): string | null {
  if (!donem) return null;
  const [yil, ay] = donem.split('-');
  const i = Number(ay) - 1;
  return AYLAR[i] ? `${AYLAR[i]} ${yil}` : null;
}
