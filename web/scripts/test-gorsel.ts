import 'dotenv/config';
import { readFile, rm, stat } from 'node:fs/promises';
import sharp from 'sharp';
import {
  EN_COK_BAYT, gorseliIsle, HEDEF_GENISLIK, turuOku,
} from '../lib/gorsel-isle';
import {
  ANAHTAR_KALIBI, anahtarUret, depoEksigi, depoOnbelleginiTemizle, depo,
} from '../lib/depo';
import { yerelTamYol } from '../lib/depo/yerel';

/**
 * Faz 30 görsel yükleme testleri.
 *   node --conditions=react-server --import tsx scripts/test-gorsel.ts
 *
 * En önemli iddia 2. bölümde: telefonla çekilmiş fotoğrafın EXIF
 * içindeki GPS koordinatı yayınlanmıyor. Şantiyenin yaklaşık konumunu
 * bilerek yayınlıyoruz; ev sahibinin evinin tam koordinatı başka şey.
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

/** Deneme görseli üretir. */
const gorselUret = (g: number, y: number) =>
  sharp({
    create: { width: g, height: y, channels: 3, background: { r: 30, g: 90, b: 140 } },
  });

async function main() {
  console.log('\n═══ 1. Tür içerikten okunuyor ═══');
  const jpeg = await gorselUret(1200, 900).jpeg().toBuffer();
  const png = await gorselUret(1200, 900).png().toBuffer();
  const webp = await gorselUret(1200, 900).webp().toBuffer();

  bekle('JPEG tanınıyor', turuOku(jpeg) === 'jpeg');
  bekle('PNG tanınıyor', turuOku(png) === 'png');
  bekle('WebP tanınıyor', turuOku(webp) === 'webp');
  bekle('düz metin tanınmıyor', turuOku(Buffer.from('bu bir resim değil, sadece metin')) === null);
  bekle('kısa girdi tanınmıyor', turuOku(Buffer.from([0xff, 0xd8])) === null);

  // HEIC kutusu: 4. bayttan "ftypheic"
  const heic = Buffer.concat([
    Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), Buffer.alloc(12),
  ]);
  bekle('HEIC ayırt ediliyor', turuOku(heic) === 'heif');

  /* .jpg uzantısı ve image/jpeg başlığıyla gelen bir betik dosyası:
     tarayıcının söylediğine bakılsaydı geçerdi. */
  const sahte = Buffer.from('<script>alert(1)</script>'.repeat(60));
  const sahteSonuc = await gorseliIsle(sahte);
  bekle('görsel olmayan dosya reddediliyor', sahteSonuc.tamam === false);
  bekle('reddetme gerekçesi anlaşılır',
    /görsel dosyası değil/.test(sahteSonuc.hata ?? ''), sahteSonuc.hata ?? '');

  console.log('\n═══ 2. EXIF / konum bilgisi siliniyor ═══');
  /* Telefon fotoğrafının taşıdığı üst veriyi taklit ediyoruz. */
  const konumlu = await gorselUret(1600, 1200)
    // GPS bloğu sharp'ın tip tanımında yok ama çalışma zamanında
    // yazılıyor (exiftool bloğu olduğu gibi geçiriliyor).
    .withExif({
      IFD0: { Copyright: 'Ev Sahibi', Make: 'Apple', Model: 'iPhone 15 Pro' },
      GPS: { GPSLatitudeRef: 'N', GPSLatitude: '36/1 12/1 26/1', GPSLongitudeRef: 'E', GPSLongitude: '29/1 37/1 18/1' },
    } as Parameters<sharp.Sharp['withExif']>[0])
    .jpeg()
    .toBuffer();

  const girdiUst = await sharp(konumlu).metadata();
  bekle('deneme görselinde EXIF gerçekten var', girdiUst.exif !== undefined);

  const islenmis = await gorseliIsle(konumlu);
  bekle('konumlu görsel işlendi', islenmis.tamam === true, islenmis.hata ?? '');
  const ciktiUst = await sharp(islenmis.gorsel!.veri).metadata();
  bekle('çıktıda EXIF yok', ciktiUst.exif === undefined);
  // Ham baytlarda da arıyoruz: üst veri okuyucusu atlarsa gözden kaçmasın
  bekle('ham baytlarda GPS izi yok',
    !islenmis.gorsel!.veri.includes(Buffer.from('GPS')));
  bekle('ham baytlarda cihaz modeli yok',
    !islenmis.gorsel!.veri.includes(Buffer.from('iPhone')));

  console.log('\n═══ 3. Yeniden kodlama ═══');
  bekle('çıktı WebP', islenmis.gorsel!.icerikTipi === 'image/webp');
  bekle('çıktı gerçekten WebP baytları', turuOku(islenmis.gorsel!.veri) === 'webp');

  /* Girdiye gömülü metin çıktıya taşınmamalı: aynı anda geçerli JPEG
     ve geçerli HTML olan dosyalar yeniden kodlamadan sağ çıkamaz. */
  const gomulu = await gorselUret(1200, 900)
    .withExif({ IFD0: { ImageDescription: '<script>alert(1)</script>' } })
    .jpeg().toBuffer();
  const gomuluSonuc = await gorseliIsle(gomulu);
  bekle('gömülü betik metni çıktıya taşınmıyor',
    gomuluSonuc.tamam === true
    && !gomuluSonuc.gorsel!.veri.includes(Buffer.from('<script>')));

  console.log('\n═══ 4. Yön ve boyut ═══');
  // Orientation 6 = 90° saat yönünde döndürülmüş; dik çekilmiş telefon fotoğrafı
  // Yön `withExif` ile değil `withMetadata` ile yazılıyor — sharp
  // Orientation'ı EXIF bloğundan ayrı tutuyor.
  const yatik = await gorselUret(1600, 1200)
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  bekle('deneme görselinde yön etiketi var',
    (await sharp(yatik).metadata()).orientation === 6);
  const yatikSonuc = await gorseliIsle(yatik);
  bekle('EXIF yönü uygulanıyor (dik fotoğraf yan yatmıyor)',
    yatikSonuc.gorsel!.genislik === 1200 && yatikSonuc.gorsel!.yukseklik === 1600,
    `${yatikSonuc.gorsel!.genislik}×${yatikSonuc.gorsel!.yukseklik}`);

  const buyuk = await gorselUret(4000, 3000).jpeg().toBuffer();
  const buyukSonuc = await gorseliIsle(buyuk);
  bekle('büyük görsel küçültülüyor',
    buyukSonuc.gorsel!.genislik === HEDEF_GENISLIK, `${buyukSonuc.gorsel!.genislik} px`);

  const kucuk = await gorselUret(1000, 750).jpeg().toBuffer();
  const kucukSonuc = await gorseliIsle(kucuk);
  bekle('küçük görsel büyütülmüyor',
    kucukSonuc.gorsel!.genislik === 1000, `${kucukSonuc.gorsel!.genislik} px`);
  bekle('dosya küçülüyor', kucukSonuc.gorsel!.veri.length < kucuk.length,
    `${kucuk.length} → ${kucukSonuc.gorsel!.veri.length} bayt`);

  console.log('\n═══ 5. Sınırlar ═══');
  bekle('boş dosya reddediliyor', (await gorseliIsle(Buffer.alloc(0))).tamam === false);

  // Boyut kontrolü tür kontrolünden ÖNCE: dev dosyayı çözmeye çalışmamalı
  const sisman = Buffer.concat([jpeg, Buffer.alloc(EN_COK_BAYT)]);
  const sismanSonuc = await gorseliIsle(sisman);
  bekle('büyük dosya reddediliyor', sismanSonuc.tamam === false);
  bekle('boyut hatası MB cinsinden anlatılıyor',
    /MB/.test(sismanSonuc.hata ?? ''), sismanSonuc.hata ?? '');

  const dusuk = await gorselUret(400, 300).jpeg().toBuffer();
  const dusukSonuc = await gorseliIsle(dusuk);
  bekle('düşük çözünürlük reddediliyor', dusukSonuc.tamam === false);
  bekle('gereken en az boyut söyleniyor',
    /800×600/.test(dusukSonuc.hata ?? ''), dusukSonuc.hata ?? '');

  const bozuk = Buffer.concat([jpeg.subarray(0, 40), Buffer.from('bozuk veri'.repeat(50))]);
  bekle('bozuk dosya çökertmiyor', (await gorseliIsle(bozuk)).tamam === false);

  console.log('\n═══ 6. Depo anahtarı ve yol geçişi ═══');
  const anahtar = anahtarUret('cly123abc', 'RaStGeLe_-9');
  bekle('üretilen anahtar kalıba uyuyor', ANAHTAR_KALIBI.test(anahtar), anahtar);
  bekle('üst dizin anahtarı reddediliyor', !ANAHTAR_KALIBI.test('proje/../../.env'));
  bekle('nokta-nokta içeren anahtar reddediliyor', !ANAHTAR_KALIBI.test('proje/x/../y.webp'));
  bekle('webp dışı uzantı reddediliyor', !ANAHTAR_KALIBI.test('proje/x/y.html'));
  bekle('eğik çizgi sayısı fazlaysa reddediliyor', !ANAHTAR_KALIBI.test('proje/a/b/c.webp'));

  let yolHatasi = false;
  try { yerelTamYol('proje/../../gizli.webp'); } catch { yolHatasi = true; }
  bekle('yerel sürücü geçersiz yolu reddediyor', yolHatasi);

  console.log('\n═══ 7. Yerel sürücü yaz / oku / sil ═══');
  process.env.DEPO_SURUCU = 'yerel';
  depoOnbelleginiTemizle();
  const d = depo();
  bekle('yerel sürücü kuruldu', d?.ad === 'yerel');
  bekle('eksik yok', depoEksigi() === null, depoEksigi() ?? '');

  const testAnahtar = anahtarUret('zzzf30test', 'deneme_-1');
  await d!.yaz(testAnahtar, islenmis.gorsel!.veri, 'image/webp');
  const yol = yerelTamYol(testAnahtar);
  bekle('dosya diske yazıldı', (await stat(yol)).size === islenmis.gorsel!.veri.length);
  bekle('okunan içerik aynı',
    (await readFile(yol)).equals(islenmis.gorsel!.veri));
  bekle('açık adres /api/gorsel altında',
    d!.url(testAnahtar) === `/api/gorsel/${testAnahtar}`);

  await d!.sil(testAnahtar);
  let silindi = false;
  try { await stat(yol); } catch { silindi = true; }
  bekle('dosya silindi', silindi);
  let ikinciSilme = true;
  try { await d!.sil(testAnahtar); } catch { ikinciSilme = false; }
  bekle('olmayan dosyayı silmek hata vermiyor', ikinciSilme);

  console.log('\n═══ 8. Yapılandırma uyarıları ═══');
  process.env.DEPO_SURUCU = '';
  depoOnbelleginiTemizle();
  bekle('sürücü yoksa sebebi söyleniyor', /DEPO_SURUCU/.test(depoEksigi() ?? ''));
  bekle('sürücü yoksa depo null', depo() === null);

  process.env.DEPO_SURUCU = 'supabase';
  const eskiUrl = process.env.SUPABASE_URL;
  const eskiAnahtar = process.env.SUPABASE_SERVICE_ROLE;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE;
  depoOnbelleginiTemizle();
  bekle('supabase anahtarı eksikse söyleniyor',
    /SUPABASE_URL|SERVICE_ROLE/.test(depoEksigi() ?? ''), depoEksigi() ?? '');
  bekle('eksik yapılandırmada depo null', depo() === null);

  process.env.DEPO_SURUCU = 'bilinmeyen';
  depoOnbelleginiTemizle();
  bekle('bilinmeyen sürücü söyleniyor', /Bilinmeyen/.test(depoEksigi() ?? ''));

  if (eskiUrl) process.env.SUPABASE_URL = eskiUrl;
  if (eskiAnahtar) process.env.SUPABASE_SERVICE_ROLE = eskiAnahtar;
  process.env.DEPO_SURUCU = 'yerel';
  depoOnbelleginiTemizle();

  console.log('\n═══ 9. Temizlik ═══');
  await rm(yerelTamYol(anahtarUret('zzzf30test', 'x_-1')).replace(/[^/\\]+$/, ''), {
    recursive: true, force: true,
  });
  bekle('deneme dizini kaldırıldı', true);

  console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
  process.exit(kalan === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
