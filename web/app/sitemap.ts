import type { MetadataRoute } from 'next';
import { sayfalar } from '@/lib/icerik';
import { yazilar } from '@/lib/yazi';
import { DIL_KODU, dilYolu, type Dil } from '@/lib/i18n';
import { yayindakiDiller } from '@/lib/ceviri';
import {
  getBolgeler, getFirmalar, getLandingKombinasyonlari, getProjeler,
} from '@/lib/queries';
import { getBolgelerEn, getLandingKombinasyonlariEn, getProjelerEn } from '@/lib/queries-en';
import { abs } from '@/lib/site';

/**
 * Bir Türkçe yol için sitemap `alternates` bloğu.
 *
 * Yalnızca GERÇEKTEN YAYINDA olan diller listeleniyor: rota ağacı
 * olmayan ya da içeriği girilmemiş bir dili alternatif diye bildirmek
 * Google'da "alternatif sayfa bulunamadı" hatası üretiyor ve iki
 * sayfayı birden zayıflatıyor. Karşılığı yoksa alan hiç eklenmiyor —
 * boş `alternates` de hata olarak raporlanıyor.
 */
function dilBaglari(trYol: string, diller: Dil[]) {
  const languages: Record<string, string> = {};
  for (const d of diller) {
    const yol = dilYolu(trYol, d);
    if (yol) languages[DIL_KODU[d]] = abs(yol);
  }
  // Tek dil varsa alternatif yok demektir
  if (Object.keys(languages).length < 2) return {};
  return { alternates: { languages } };
}

/**
 * Sitemap yalnızca indekslenebilir sayfaları içerir.
 * /arama gibi faceted yüzeyler bilinçli olarak dışarıda bırakıldı.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [BOLGELER, PROJELER, FIRMALAR, kombinasyonlar_, BOLGELER_EN, PROJELER_EN] = await Promise.all([
    getBolgeler(), getProjeler(), getFirmalar(), getLandingKombinasyonlari(),
    getBolgelerEn(), getProjelerEn(),
  ]);
  const EN_LANDING = await getLandingKombinasyonlariEn();
  // Kurumsal sayfalar panelden yönetiliyor; listeyi sabit tutmak
  // yeni açılan bir sayfanın hiç taranmaması demekti
  const [KURUMSAL, KURUMSAL_EN] = await Promise.all([sayfalar('tr'), sayfalar('en')]);
  const YAZILAR = await yazilar();
  /* Hangi dillerin alternatif olarak bildirileceği ÇALIŞMA ZAMANINDA
     belirleniyor: içerik girilmemiş bir dil site haritasında görünmez.
     Sabit liste kullansaydık, Rusça içeriği girilmeden hreflang
     basılırdı. */
  const diller = await yayindakiDiller();
  const bugun = new Date();

  const sabit: MetadataRoute.Sitemap = [
    { url: abs('/'), lastModified: bugun, changeFrequency: 'daily', priority: 1, ...dilBaglari('/', diller) },
    { url: abs('/bolgeler'), lastModified: bugun, changeFrequency: 'weekly', priority: 0.9, ...dilBaglari('/bolgeler', diller) },
    { url: abs('/firmalar'), lastModified: bugun, changeFrequency: 'weekly', priority: 0.8 },
    { url: abs('/rehber'), lastModified: bugun, changeFrequency: 'weekly', priority: 0.7 },
    /* Firma başvurusu indekslenebilir: kişisel veri yok, yalnızca
       form var ve arz tarafındaki kazanım hunisinin girişi. */
    { url: abs('/firma-basvuru'), lastModified: bugun, changeFrequency: 'monthly', priority: 0.6 },
    // `indexle` kapalı sayfalar noindex basıyor; sitemap'e koymak
    // Google'a çelişkili sinyal göndermek olurdu
    ...KURUMSAL.filter((k) => k.indexle).map((k) => ({
      url: abs(`/${k.slug}`),
      lastModified: bugun,
      changeFrequency: 'monthly' as const,
      priority: k.slug === 'nasil-calisir' ? 0.5 : 0.4,
      ...dilBaglari(`/${k.slug}`, diller),
    })),
  ];

  const bolgeler: MetadataRoute.Sitemap = BOLGELER.map((b) => ({
    url: abs(`/projeler/${b.slug}`),
    lastModified: bugun,
    changeFrequency: 'daily',
    priority: 0.9,
    ...dilBaglari(`/projeler/${b.slug}`, diller),
  }));

  const kombinasyonlar: MetadataRoute.Sitemap = kombinasyonlar_.map((k) => ({
    url: abs(`/projeler/${k.bolge}/${k.ozellik}`),
    lastModified: bugun,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const projeler: MetadataRoute.Sitemap = PROJELER.map((p) => ({
    url: abs(`/proje/${p.slug}`),
    lastModified: new Date(p.guncelleme),
    changeFrequency: 'weekly',
    priority: 0.8,
    images: p.foto.slice(0, 4),
    ...dilBaglari(`/proje/${p.slug}`, diller),
  }));

  /* Firma sayfaları TARANIYOR: her projenin geliştiricisine bağlantı
     veriyor ve "X İnşaat projeleri" gerçek bir arama. Değişim sıklığı
     düşük — firma bilgisi projeden çok daha seyrek güncelleniyor. */
  const firmalar: MetadataRoute.Sitemap = FIRMALAR.map((f) => ({
    url: abs(`/firma/${f.slug}`),
    lastModified: bugun,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // İngilizce sayfalar ayrı girdiler olarak da listeleniyor: hreflang
  // karşılıklı olsa bile her URL'in sitemap'te kendi satırı olmalı,
  // aksi halde Google yalnızca alternatif olarak gördüğü sayfayı
  // taramada geri plana atıyor.
  const enSabit: MetadataRoute.Sitemap = [
    { url: abs('/en'), lastModified: bugun, changeFrequency: 'daily', priority: 0.9 },
    { url: abs('/en/regions'), lastModified: bugun, changeFrequency: 'weekly', priority: 0.8 },
    // İngilizce kurumsal sayfalar (arama noindex olduğu için listede yok)
    ...KURUMSAL_EN.filter((k) => k.indexle).map((k) => ({
      url: abs(`/en/${k.slug}`),
      lastModified: bugun,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ];

  const enBolgeler: MetadataRoute.Sitemap = BOLGELER_EN.map((b) => ({
    url: abs(`/en/developments/${b.slug}`),
    lastModified: bugun, changeFrequency: 'daily', priority: 0.8,
  }));

  const enProjeler: MetadataRoute.Sitemap = PROJELER_EN.map((p) => ({
    url: abs(`/en/project/${p.slug}`),
    lastModified: bugun, changeFrequency: 'weekly', priority: 0.7,
    images: p.foto.slice(0, 4),
  }));

  const enKombinasyonlar: MetadataRoute.Sitemap = EN_LANDING.map((k) => ({
    url: abs(`/en/developments/${k.bolge}/${k.ozellik}`),
    lastModified: bugun, changeFrequency: 'weekly', priority: 0.6,
  }));

  /* Yazının kendi güncelleme tarihi kullanılıyor: hepsine "bugün"
     yazmak, tarayıcıya değişmeyen sayfaları da yeniden çektiriyordu. */
  const yaziYollari: MetadataRoute.Sitemap = YAZILAR.map((y) => ({
    url: abs(`/rehber/${y.slug}`),
    lastModified: y.yayinTarihi, changeFrequency: 'monthly', priority: 0.6,
  }));

  return [
    ...sabit, ...bolgeler, ...kombinasyonlar, ...projeler, ...firmalar, ...yaziYollari,
    ...enSabit, ...enBolgeler, ...enProjeler, ...enKombinasyonlar,
  ];
}
