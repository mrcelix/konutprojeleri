import 'dotenv/config';
import { resolveTxt, resolveMx, resolveCname } from 'node:dns/promises';

/**
 * E-posta teslim edilebilirliği DNS kontrolü.
 *
 *   npm run dns:kontrol                  → EPOSTA_GONDEREN alan adını kontrol eder
 *   npm run dns:kontrol -- konutprojeleri.com → belirtilen alan adını kontrol eder
 *
 * SPF, DKIM ve DMARC kayıtları olmadan gönderilen e-postalar Gmail ve
 * Outlook tarafından spam'e düşer veya tamamen reddedilir. Bu üçü DNS
 * kaydı olduğu için koddan çözülemez — bu script yalnızca durumu raporlar.
 */

const R = { ok: '\x1b[32m', uyari: '\x1b[33m', hata: '\x1b[31m', soluk: '\x1b[90m', bit: '\x1b[0m' };
const ok = (m: string) => console.log(`  ${R.ok}✓${R.bit} ${m}`);
const uyari = (m: string) => console.log(`  ${R.uyari}!${R.bit} ${m}`);
const hata = (m: string) => console.log(`  ${R.hata}✗${R.bit} ${m}`);
const not = (m: string) => console.log(`    ${R.soluk}${m}${R.bit}`);

let eksik = 0;

const txt = async (ad: string): Promise<string[]> => {
  try {
    return (await resolveTxt(ad)).map((p) => p.join(''));
  } catch {
    return [];
  }
};

async function spf(alan: string) {
  console.log('\n═══ SPF — hangi sunucular bu alan adına e-posta gönderebilir ═══');
  const kayitlar = (await txt(alan)).filter((k) => k.toLowerCase().startsWith('v=spf1'));

  if (kayitlar.length === 0) {
    hata('SPF kaydı yok');
    not('TXT @  →  v=spf1 include:_spf.google.com ~all');
    not('Sağlayıcınızın (Resend, Yandex, Google) verdiği include değerini kullanın.');
    eksik++;
    return;
  }
  if (kayitlar.length > 1) {
    hata(`${kayitlar.length} adet SPF kaydı var — RFC 7208 tek kayda izin verir`);
    not('Birden fazla SPF kaydı tüm kontrolü geçersiz kılar. Tek kayıtta birleştirin.');
    eksik++;
  }

  for (const k of kayitlar) {
    ok(k.length > 90 ? k.slice(0, 90) + '…' : k);
    if (k.includes('+all')) {
      hata('"+all" herkesin sizin adınıza göndermesine izin verir — kaldırın');
      eksik++;
    } else if (k.includes('~all')) {
      ok('~all (softfail) — yaygın ve güvenli başlangıç');
    } else if (k.includes('-all')) {
      ok('-all (hardfail) — en katı, tüm gönderenler listelenmişse doğru tercih');
    } else {
      uyari('"all" mekanizması yok — kayıt eksik davranıyor');
    }

    const lookup = (k.match(/include:|a:|mx:|ptr|exists:|redirect=/g) ?? []).length;
    if (lookup > 10) {
      hata(`${lookup} DNS sorgusu — sınır 10, aşılırsa SPF permerror verir`);
      eksik++;
    }
  }
}

async function dkim(alan: string) {
  console.log('\n═══ DKIM — giden e-postanın imzası ═══');
  // Sağlayıcılar farklı seçici (selector) kullanıyor; yaygın olanları deniyoruz.
  const seciciler = ['resend', 'default', 'google', 'mail', 'k1', 's1', 's2', 'selector1', 'selector2'];
  const bulunan: string[] = [];

  for (const s of seciciler) {
    const ad = `${s}._domainkey.${alan}`;
    const kayit = await txt(ad);
    if (kayit.some((k) => k.includes('p='))) {
      bulunan.push(s);
      ok(`${s}._domainkey — imza anahtarı var`);
      continue;
    }
    try {
      const c = await resolveCname(ad);
      bulunan.push(s);
      ok(`${s}._domainkey → ${c[0]} (CNAME, sağlayıcıya devredilmiş)`);
    } catch { /* bu seçici yok, normal */ }
  }

  if (bulunan.length === 0) {
    hata('Bilinen seçicilerin hiçbirinde DKIM kaydı bulunamadı');
    not(`Denenen: ${seciciler.join(', ')}`);
    not('Farklı bir seçici kullanıyor olabilirsiniz — sağlayıcı panelinden doğrulayın.');
    not('DKIM olmadan DMARC "quarantine/reject" politikası e-postalarınızı düşürür.');
    eksik++;
  }
}

async function dmarc(alan: string) {
  console.log('\n═══ DMARC — SPF/DKIM başarısız olursa ne yapılsın ═══');
  const kayitlar = (await txt(`_dmarc.${alan}`)).filter((k) => k.toLowerCase().startsWith('v=dmarc1'));

  if (kayitlar.length === 0) {
    hata('DMARC kaydı yok');
    not(`TXT _dmarc.${alan}  →  v=DMARC1; p=none; rua=mailto:dmarc@${alan}`);
    not('p=none ile başlayın: hiçbir e-posta düşmez, yalnızca rapor toplarsınız.');
    not('Raporlar temiz görününce p=quarantine, sonra p=reject yapın.');
    eksik++;
    return;
  }

  const k = kayitlar[0];
  ok(k);
  const politika = k.match(/p=(\w+)/)?.[1];
  if (politika === 'none') uyari('p=none — izleme modu, sahtecilik engellenmiyor (başlangıç için doğru)');
  else if (politika === 'quarantine') ok('p=quarantine — başarısızlar spam klasörüne');
  else if (politika === 'reject') ok('p=reject — en güçlü koruma');
  if (!k.includes('rua=')) uyari('rua= yok — toplu rapor alamazsınız, sorunları göremezsiniz');
}

async function mx(alan: string) {
  console.log('\n═══ MX — bu alan adına gelen e-posta ═══');
  try {
    const kayitlar = await resolveMx(alan);
    if (kayitlar.length === 0) throw new Error('boş');
    for (const m of kayitlar.sort((a, b) => a.priority - b.priority)) {
      ok(`${m.priority.toString().padStart(3)} ${m.exchange}`);
    }
  } catch {
    uyari('MX kaydı yok — bu alan adına e-posta ALINAMAZ');
    not('Yalnızca gönderim yapacaksanız sorun değil; ancak yanıtlar ve');
    not('bounce bildirimleri kaybolur. En azından bir yönlendirme kurun.');
  }
}

async function main() {
  const argAlan = process.argv[2];
  const gonderen = process.env.EPOSTA_GONDEREN ?? '';
  const alan = argAlan ?? gonderen.split('@')[1] ?? 'konutprojeleri.com';

  console.log(`\nAlan adı: ${R.ok}${alan}${R.bit}`);
  if (!argAlan && gonderen) console.log(`${R.soluk}(EPOSTA_GONDEREN = ${gonderen})${R.bit}`);

  await spf(alan);
  await dkim(alan);
  await dmarc(alan);
  await mx(alan);

  console.log('');
  if (eksik === 0) {
    console.log(`${R.ok}Teslim edilebilirlik kayıtları tamam.${R.bit}\n`);
    process.exit(0);
  }
  console.log(`${R.hata}${eksik} kritik eksik var.${R.bit} Bunlar düzeltilmeden gönderim yapmayın —`);
  console.log('spam klasörüne düşen e-postalar alan adı itibarını kalıcı olarak zedeler.\n');
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
