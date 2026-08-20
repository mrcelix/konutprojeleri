import postgres from 'postgres';

/**
 * Panel erişimi tanı aracı.
 *
 * En sık yapılan hata: Supabase Auth'ta kullanıcı açılıyor ama
 * kullanici tablosuna YANLIŞ UID yazılıyor (ya da hiç yazılmıyor).
 * Sonuç kafa karıştırıcı — giriş başarılı oluyor, panel yine de
 * "erişiminiz yok" diyor, çünkü kimlik doğru ama yetki kaydı yok.
 *
 * Bu araç ikisini yan yana koyar ve eşleşmeyeni gösterir.
 *
 *   node --env-file=.env.local scripts/panel-kontrol.mjs
 */

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL / DIRECT_URL tanımlı değil.');
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });
let sorun = 0;

try {
  const authVar = await sql`select to_regclass('auth.users') is not null as var`;
  const auth = authVar[0].var;

  const kullanicilar = await sql`
    select k.id::text as id, k.eposta::text as eposta, k.ad, k.rol,
           k.firma_id, k.aktif,
           to_char(k.son_giris, 'YYYY-MM-DD HH24:MI') as son_giris,
           f.ad as firma_ad
    from kullanici k
    left join firma f on f.id = k.firma_id
    order by k.olusturuldu
  `;

  console.log(`\nPANEL KULLANICILARI (${kullanicilar.length})`);
  if (kullanicilar.length === 0) {
    console.log('  Hiç kayıt yok. Supabase Auth\'ta kullanıcı açtıysanız');
    console.log('  kullanici tablosuna da satır eklemeniz gerekiyor:');
    console.log("    insert into kullanici (id, eposta, ad, rol)");
    console.log("    values ('AUTH-UID', 'siz@ornek.com', 'Adınız', 'admin');");
    sorun++;
  }

  for (const k of kullanicilar) {
    const etiket = [
      k.rol,
      k.aktif ? 'aktif' : 'PASİF',
      k.firma_ad ? `firma: ${k.firma_ad}` : null,
      k.son_giris ? `son giriş: ${k.son_giris}` : 'hiç giriş yapmamış',
    ].filter(Boolean).join(' · ');
    console.log(`  ${k.eposta.padEnd(32)} ${etiket}`);

    if (!k.aktif) {
      console.log('     ! aktif = false; bu hesap panele giremez');
      sorun++;
    }
    if (k.rol === 'firma' && !k.firma_id) {
      console.log('     ! firma rolü var ama firma_id boş');
      sorun++;
    }
  }

  if (!auth) {
    console.log('\nauth.users bu ortamda yok (Supabase dışı); UID eşleşmesi kontrol edilemedi.');
  } else {
    const eslesme = await sql`
      select u.id::text as id, u.email::text as eposta,
             (k.id is not null) as yetki_var,
             u.email_confirmed_at is not null as onayli
      from auth.users u
      left join kullanici k on k.id = u.id
      order by u.created_at
    `;

    console.log(`\nSUPABASE AUTH HESAPLARI (${eslesme.length})`);
    if (eslesme.length === 0) {
      console.log('  Hiç hesap yok. Supabase panelinde');
      console.log('  Authentication → Users → Add user ile açın.');
      sorun++;
    }
    for (const u of eslesme) {
      console.log(
        `  ${String(u.eposta).padEnd(32)} ${u.yetki_var ? 'yetki kaydı VAR' : 'YETKİ KAYDI YOK'}` +
        `${u.onayli ? '' : ' · e-posta ONAYSIZ'}`
      );
      if (!u.yetki_var) {
        console.log(`     → insert into kullanici (id, eposta, ad, rol)`);
        console.log(`       values ('${u.id}', '${u.eposta}', 'Adınız', 'admin');`);
        sorun++;
      }
      if (!u.onayli) {
        console.log('     ! e-posta onaylanmamış; giriş reddedilebilir.');
        console.log('       Add user ekranında "Auto Confirm User" işaretlenmeliydi.');
        sorun++;
      }
    }

    // Yetki kaydı olup Auth hesabı olmayanlar: elle yazılmış yanlış UID
    const oksuz = await sql`
      select k.eposta::text as eposta, k.id::text as id
      from kullanici k
      left join auth.users u on u.id = k.id
      where u.id is null
    `;
    if (oksuz.length > 0) {
      console.log('\nEŞLEŞMEYEN YETKİ KAYITLARI');
      for (const o of oksuz) {
        console.log(`  ${o.eposta} → UID ${o.id} Auth\'ta yok`);
        console.log('     UID kopyalanırken hata yapılmış olabilir.');
        sorun++;
      }
    }
  }

  const [g] = await sql`
    select count(*)::int as toplam,
           count(*) filter (where not basarili)::int as basarisiz
    from giris_kaydi`;
  console.log(`\nGİRİŞ DENEMELERİ: ${g.toplam} (başarısız: ${g.basarisiz})`);

  console.log(sorun === 0 ? '\nHer şey yerinde.' : `\n${sorun} sorun bulundu.`);
} finally {
  await sql.end();
}
