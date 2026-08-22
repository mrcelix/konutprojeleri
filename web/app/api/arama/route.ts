import { NextResponse } from 'next/server';
import { aramaSorgusu, type AramaGirdisi, type Siralama } from '@/lib/arama';
import { istekIp, sinirKontrol } from '@/lib/hiz-sinir';
import type { ProjeDurumu, ProjeTipi } from '@/lib/types';

/* ============================================================
   Arama uç noktası.

   Harita hareket ettikçe ve filtre değiştikçe istemci burayı çağırıyor.
   Tüm projeleri istemciye gönderip orada filtrelemek sekiz projeyle
   çalışıyordu; birkaç yüz projeyle hem ilk yükleme hem bellek sorun
   olurdu.

   robots.txt zaten /api/ yolunu taramaya kapatıyor.
   ============================================================ */

export const dynamic = 'force-dynamic';

const SIRALAMALAR: Siralama[] = ['alaka', 'onerilen', 'ucuz', 'pahali', 'yeni', 'teslim', 'ilerleme'];
const TIPLER: ProjeTipi[] = ['KONUT', 'VILLA', 'OFIS', 'KARMA'];
const DURUMLAR: ProjeDurumu[] = ['YAKINDA', 'SATISTA', 'SON_DAIRELER', 'TUKENDI', 'TESLIM_EDILDI'];

const sayi = (v: string | null): number | undefined => {
  if (v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const tarih = (v: string | null): Date | undefined => {
  if (!v) return undefined;
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export async function GET(request: Request) {
  // Kazımaya (scraping) karşı sınır. Meşru kullanım için bol: dakikada
  // 120 istek, geciktirilmiş arama ve harita hareketiyle bile aşılmıyor.
  const sinir = await sinirKontrol('arama', await istekIp());
  if (!sinir.izin) {
    return NextResponse.json({ hata: sinir.mesaj }, {
      status: 429,
      headers: sinir.acilis
        ? { 'Retry-After': String(Math.ceil((sinir.acilis.getTime() - Date.now()) / 1000)) }
        : {},
    });
  }

  const p = new URL(request.url).searchParams;

  // Sınır kutusu "güney,batı,kuzey,doğu"
  let kutu: AramaGirdisi['kutu'];
  const kutuHam = p.get('kutu');
  if (kutuHam) {
    const parcalar = kutuHam.split(',').map(Number);
    if (parcalar.length === 4 && parcalar.every(Number.isFinite)) {
      kutu = parcalar as [number, number, number, number];
    }
  }

  let merkez: AramaGirdisi['merkez'];
  const merkezHam = p.get('merkez');
  if (merkezHam) {
    const parcalar = merkezHam.split(',').map(Number);
    if (parcalar.length === 2 && parcalar.every(Number.isFinite)) {
      merkez = parcalar as [number, number];
    }
  }

  const siralaHam = p.get('sirala');
  const sirala = SIRALAMALAR.includes(siralaHam as Siralama) ? (siralaHam as Siralama) : undefined;

  const tipHam = p.get('tip');
  const tip = TIPLER.includes(tipHam as ProjeTipi) ? (tipHam as ProjeTipi) : undefined;

  /* Durum ÇOKLU seçilebiliyor: "satışta ve son daireler" doğal bir
     istek, "yalnızca son daireler" değil. Tanınmayan değerler
     ayıklanıyor; hepsi ayıklanırsa filtre hiç uygulanmıyor ve
     varsayılan (satılabilir) devreye giriyor. */
  const durum = p.get('durum')?.split(',')
    .filter((d): d is ProjeDurumu => DURUMLAR.includes(d as ProjeDurumu));

  const girdi: AramaGirdisi = {
    q: p.get('q') ?? undefined,
    bolge: p.get('bolge') ?? undefined,
    ozellikler: p.get('f')?.split(',').filter(Boolean).slice(0, 12),
    tip,
    durum: durum?.length ? durum : undefined,
    firma: p.get('firma') ?? undefined,
    oda: p.get('oda')?.split(',').filter(Boolean).slice(0, 8),
    minM2: sayi(p.get('minM2')),
    minFiyat: sayi(p.get('minFiyat')),
    maxFiyat: sayi(p.get('maxFiyat')),
    maxTeslim: tarih(p.get('teslim')),
    krediyeUygun: p.get('kredi') === '1',
    takas: p.get('takas') === '1',
    maxPesinat: sayi(p.get('maxPesinat')),
    minVade: sayi(p.get('minVade')),
    kutu,
    merkez,
    yaricapKm: sayi(p.get('yaricap')),
    sirala,
    sayfa: sayi(p.get('sayfa')),
    limit: sayi(p.get('limit')),
  };

  try {
    const cevap = await aramaSorgusu(girdi);
    return NextResponse.json(cevap, {
      headers: {
        /* Kısa süreli kenar önbelleği: aynı filtreyle gelen ardışık
           istekler veritabanına inmesin, ama fiyat ve kalan daire
           adedi bayatlamasın. */
        'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (e) {
    console.error('Arama hatası:', e);
    return NextResponse.json({ hata: 'Arama yapılamadı' }, { status: 500 });
  }
}
