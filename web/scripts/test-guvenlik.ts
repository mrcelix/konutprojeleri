import 'dotenv/config';
import { parolaDogrula, parolaHashle } from '../lib/auth';
import { adresNormalle, engelEkle, engelKaldir, engelliMi, telefonGecerli } from '../lib/bildirim/engel';
import { imzaDogrula, resendOlayIsle } from '../lib/bildirim/webhook';
import { prisma } from '../lib/db';
import { smsParca } from '../lib/sms/saglayicilar';
import * as SS from '../lib/sms/sablonlar';
import {
  gizliOkunakli, gizliUret, kodDogrula, otpauthUri, suankiKod, yedekKodUret, yedekNormalle,
} from '../lib/totp';
import { createHmac } from 'node:crypto';

/**
 * Faz 8 testleri: TOTP, gönderim engeli, webhook imzası, SMS.
 *   node --conditions=react-server --import tsx scripts/test-guvenlik.ts
 */

let gecen = 0, kalan = 0;
const bekle = (ad: string, kosul: boolean, detay = '') => {
  console.log(`  ${kosul ? '✓' : '✗'} ${ad}${detay ? ` — ${detay}` : ''}`);
  kosul ? gecen++ : kalan++;
};

const TEST_EPOSTA = 'engel-testi@demo-guvenlik.test';
const TEST_TEL = '+905559998877';

async function main() {
  console.log('\n═══ 1. TOTP üretimi ═══');
  const gizli = gizliUret();
  bekle('gizli anahtar base32', /^[A-Z2-7]+$/.test(gizli), `${gizli.length} karakter`);
  bekle('gizli anahtar 160 bit (32 karakter)', gizli.length === 32);
  bekle('her çağrı farklı anahtar üretir', gizliUret() !== gizliUret());
  bekle('okunaklı biçim 4'.concat("'erli gruplar"), gizliOkunakli(gizli).split(' ').every((g) => g.length <= 4));

  const uri = otpauthUri(gizli, 'test@konutprojeleri.com', 'KonutProjeleri');
  bekle('otpauth URI şeması', uri.startsWith('otpauth://totp/'));
  bekle('URI issuer içeriyor', uri.includes('issuer=KonutProjeleri'));
  bekle('URI gizli anahtarı taşıyor', uri.includes(`secret=${gizli}`));

  console.log('\n═══ 2. TOTP doğrulama ═══');
  const kod = suankiKod(gizli);
  bekle('kod 6 haneli', /^\d{6}$/.test(kod), kod);
  bekle('güncel kod kabul edilir', kodDogrula(gizli, kod));
  bekle('boşluklu kod da kabul edilir', kodDogrula(gizli, `${kod.slice(0, 3)} ${kod.slice(3)}`));
  bekle('yanlış kod reddedilir', !kodDogrula(gizli, '000000') || kod === '000000');
  bekle('kısa kod reddedilir', !kodDogrula(gizli, '123'));
  bekle('başka anahtarın kodu reddedilir', !kodDogrula(gizliUret(), kod));

  // RFC 6238 Ek B: bilinen test vektörü (gizli "12345678901234567890")
  // base32: GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
  const rfcGizli = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  const asilNow = Date.now;
  Date.now = () => 59_000; // T = 1
  const rfcKod = suankiKod(rfcGizli);
  Date.now = asilNow;
  bekle('RFC 6238 test vektörü (T=1 → 287082)', rfcKod === '287082', rfcKod);

  console.log('\n═══ 3. Yedek kodlar ═══');
  const yedekler = yedekKodUret(8);
  bekle('8 yedek kod üretildi', yedekler.length === 8);
  bekle('hepsi benzersiz', new Set(yedekler).size === 8);
  bekle('karıştırılabilir karakter yok (0,O,1,I)', yedekler.every((y) => !/[01OI]/.test(y)));
  bekle('normalizasyon tireyi atıyor', yedekNormalle('abc-de') === 'ABCDE');
  const yHash = await parolaHashle(yedekNormalle(yedekler[0]));
  bekle('yedek kod hash olarak saklanabiliyor', await parolaDogrula(yedekNormalle(yedekler[0]), yHash));
  bekle('düz yedek kod hash içinde geçmiyor', !yHash.includes(yedekNormalle(yedekler[0])));

  console.log('\n═══ 4. Adres normalizasyonu ═══');
  bekle('e-posta küçük harfe iner', adresNormalle('EPOSTA', ' Ali@KonutProjeleri.COM ') === 'ali@konutprojeleri.com');
  bekle('0532… → +90532…', adresNormalle('SMS', '0532 123 45 67') === '+905321234567');
  bekle('532… → +90532…', adresNormalle('SMS', '5321234567') === '+905321234567');
  bekle('90532… → +90532…', adresNormalle('SMS', '905321234567') === '+905321234567');
  bekle('0090… → +90…', adresNormalle('SMS', '00905321234567') === '+905321234567');
  bekle('zaten E.164 ise korunur', adresNormalle('SMS', '+905321234567') === '+905321234567');
  bekle('geçerli E.164 kabul', telefonGecerli('+905321234567'));
  bekle('+ olmadan reddedilir', !telefonGecerli('905321234567'));
  bekle('çok kısa numara reddedilir', !telefonGecerli('+90532'));

  console.log('\n═══ 5. Gönderim engeli ═══');
  await engelKaldir('EPOSTA', TEST_EPOSTA);
  await engelKaldir('SMS', TEST_TEL);

  bekle('temiz adres engelli değil', !(await engelliMi('EPOSTA', TEST_EPOSTA)));
  await engelEkle('EPOSTA', TEST_EPOSTA, 'KALICI_HATA', 'test', 'adres bulunamadı');
  bekle('eklendikten sonra engelli', await engelliMi('EPOSTA', TEST_EPOSTA));
  bekle('büyük harfli yazım da engelli', await engelliMi('EPOSTA', TEST_EPOSTA.toUpperCase()));

  // Aynı adres ikinci kez: sebep güncellenir, kayıt çoğalmaz
  await engelEkle('EPOSTA', TEST_EPOSTA, 'SIKAYET', 'test2');
  const sayi = await prisma.gonderimEngeli.count({ where: { adres: TEST_EPOSTA } });
  bekle('mükerrer kayıt oluşmuyor', sayi === 1, `${sayi} kayıt`);
  const guncel = await prisma.gonderimEngeli.findFirst({ where: { adres: TEST_EPOSTA } });
  bekle('daha ağır sebep üzerine yazılıyor', guncel?.sebep === 'SIKAYET');

  await engelEkle('SMS', '0555 999 88 77', 'ELLE', 'panel');
  bekle('SMS engeli E.164 olarak saklanıyor', await engelliMi('SMS', TEST_TEL));
  bekle('kanallar birbirinden bağımsız',
    (await engelliMi('EPOSTA', TEST_TEL)) === false);

  bekle('engel kaldırılabiliyor', await engelKaldir('EPOSTA', TEST_EPOSTA));
  bekle('kaldırınca gönderim serbest', !(await engelliMi('EPOSTA', TEST_EPOSTA)));
  bekle('olmayan kaydı kaldırmak false döner', !(await engelKaldir('EPOSTA', 'yok@yok.test')));

  console.log('\n═══ 6. Webhook imza doğrulaması ═══');
  const whGizli = 'whsec_' + Buffer.from('test-gizli-anahtar-32-bayt-uzun!!').toString('base64');
  const id = 'msg_test';
  const damga = Math.floor(Date.now() / 1000).toString();
  const govde = JSON.stringify({ type: 'email.bounced' });
  const dogruImza = 'v1,' + createHmac('sha256', Buffer.from(whGizli.replace(/^whsec_/, ''), 'base64'))
    .update(`${id}.${damga}.${govde}`).digest('base64');

  bekle('geçerli imza kabul', imzaDogrula(whGizli, id, damga, govde, dogruImza));
  bekle('gövde değişirse reddedilir',
    !imzaDogrula(whGizli, id, damga, govde + ' ', dogruImza));
  bekle('yanlış anahtarla reddedilir',
    !imzaDogrula('whsec_' + Buffer.from('baska-anahtar').toString('base64'), id, damga, govde, dogruImza));
  bekle('eski damga reddedilir (tekrar saldırısı)',
    !imzaDogrula(whGizli, id, '1000000', govde, dogruImza));
  bekle('imza başlığı boşsa reddedilir', !imzaDogrula(whGizli, id, damga, govde, ''));
  bekle('birden fazla imzadan biri tutarsa kabul',
    imzaDogrula(whGizli, id, damga, govde, `v1,sahte ${dogruImza}`));

  console.log('\n═══ 7. Webhook olay işleme ═══');
  await engelKaldir('EPOSTA', TEST_EPOSTA);

  const gecici = await resendOlayIsle({
    type: 'email.bounced',
    data: { to: [TEST_EPOSTA], bounce: { type: 'Transient', message: 'kutu dolu' } },
  });
  bekle('geçici bounce engellemiyor', gecici.durum === 'tamam' && !(await engelliMi('EPOSTA', TEST_EPOSTA)));

  const kaliciSonuc = await resendOlayIsle({
    type: 'email.bounced',
    data: { to: [TEST_EPOSTA], bounce: { type: 'Permanent', message: 'adres yok' } },
  });
  bekle('kalıcı bounce engelliyor', kaliciSonuc.durum === 'tamam' && (await engelliMi('EPOSTA', TEST_EPOSTA)));

  await engelKaldir('EPOSTA', TEST_EPOSTA);
  await resendOlayIsle({ type: 'email.complained', data: { to: [TEST_EPOSTA] } });
  const sik = await prisma.gonderimEngeli.findFirst({ where: { adres: TEST_EPOSTA } });
  bekle('şikâyet SIKAYET sebebiyle engelliyor', sik?.sebep === 'SIKAYET');

  const takip = await resendOlayIsle({ type: 'email.opened', data: { to: [TEST_EPOSTA] } });
  bekle('açılma takibi toplanmıyor', takip.durum === 'yoksay');
  const bilinmeyen = await resendOlayIsle({ type: 'email.uydurma', data: {} });
  bekle('bilinmeyen olay yoksayılıyor', bilinmeyen.durum === 'yoksay');

  console.log('\n═══ 8. SMS şablonları ═══');
  const PROJE = 'Meridyen Park Ataşehir';
  const randevu = new Date('2027-07-01T11:00:00Z');
  const sablonlar = [
    SS.randevuTeyit(PROJE, randevu, 'Barbaros Mah. satış ofisi'),
    SS.girisKodu('123456'),
    SS.ulasilamadi(PROJE),
    SS.katalogGonderildi(PROJE),
  ];
  bekle('4 SMS şablonu üretiliyor', sablonlar.length === 4);
  bekle('hepsinin etiketi ve metni var', sablonlar.every((s) => s.etiket && s.metin));
  bekle('hepsi marka adıyla başlıyor', sablonlar.every((s) => s.metin.startsWith('KonutProjeleri')));
  bekle('hiçbiri 3 parçayı geçmiyor',
    sablonlar.every((s) => smsParca(s.metin).parca <= 3),
    sablonlar.map((s) => smsParca(s.metin).parca).join('/'));
  /* İYS: bunlar TİCARİ İLETİ DEĞİL, talep sahibinin kendi başlattığı
     sürecin bilgilendirmesi. Metne bir kampanya cümlesi girdiği anda
     onay gerektiren bir ileti hâline gelir. */
  bekle('pazarlama ifadesi yok (İYS)',
    !sablonlar.some((s) => /kampanya|indirim|fırsat|hemen al/i.test(s.metin)));
  bekle('randevu teyidi yeri içeriyor',
    SS.randevuTeyit(PROJE, randevu, 'Barbaros Mah. satış ofisi').metin.includes('Barbaros'));
  /* Proje adı BOŞ gelebiliyor: genel talepte proje yok. Şablon o
     durumda da anlamlı bir cümle kurmalı, çift boşluklu bir metin değil. */
  bekle('projesiz şablon yine çalışıyor',
    SS.randevuTeyit(null, randevu, 'Merkez ofis').metin.length > 20
    && !SS.randevuTeyit(null, randevu, 'Merkez ofis').metin.includes('  '));

  console.log('\n═══ 9. SMS parça hesabı ═══');
  bekle('Türkçesiz 160 karakter tek parça', smsParca('a'.repeat(160)).parca === 1);
  bekle('Türkçesiz 161 karakter iki parça', smsParca('a'.repeat(161)).parca === 2);
  bekle('Türkçe karakter UCS2 yapıyor', smsParca('şğü').alfabe === 'UCS2');
  bekle('Türkçe 70 karakter tek parça', smsParca('ş'.repeat(70)).parca === 1);
  bekle('Türkçe 71 karakter iki parça', smsParca('ş'.repeat(71)).parca === 2);

  // temizlik
  await engelKaldir('EPOSTA', TEST_EPOSTA);
  await engelKaldir('SMS', TEST_TEL);

  console.log(`\n${kalan === 0 ? '✓ TÜM TESTLER GEÇTİ' : '✗ BAŞARISIZ'} — ${gecen} geçti, ${kalan} kaldı\n`);
  await prisma.$disconnect();
  process.exit(kalan === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
