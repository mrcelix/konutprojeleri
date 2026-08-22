import 'dotenv/config';
import { prisma } from '../lib/db';

/**
 * Var olan bir hesabı ADMIN'e yükseltir.
 *
 *   npm run yonetici -- ornek@eposta.com
 *
 * NEDEN AYRI BETİK: ilk yöneticiyi açmanın tavuk-yumurta sorunu var.
 * `/yonetim/kullanicilar` ekranından rol değiştirilebiliyor ama o
 * ekrana girmek için zaten bir yönetici gerekiyor. `db:seed-uretim`
 * hesabı `YONETICI_EPOSTA`/`YONETICI_PAROLA` ile açıyor; bu betik
 * ise PAROLAYA HİÇ DOKUNMADAN yalnızca rolü çeviriyor — kişi
 * `/kayit`tan kendi parolasıyla kaydolmuşsa doğru yol bu.
 *
 * Hesap yoksa OLUŞTURMUYOR: parolasız bir hesap açmak, sonradan
 * "parolamı unuttum" akışıyla ele geçirilebilecek bir yönetici
 * bırakırdı. Kişi önce kendisi kaydolmalı.
 */
async function main() {
  const eposta = process.argv[2]?.trim().toLowerCase();
  if (!eposta) {
    console.error('Kullanım: npm run yonetici -- ornek@eposta.com');
    process.exit(1);
  }

  const k = await prisma.kullanici.findUnique({
    where: { eposta },
    select: { id: true, eposta: true, rol: true, aktif: true, ad: true },
  });

  if (!k) {
    console.error(
      `\n  ${eposta} adresiyle bir hesap yok.\n\n`
      + '  Önce siteden kaydolun (/kayit) — parolayı siz belirleyin —\n'
      + '  sonra bu betiği tekrar çalıştırın. Betik parola oluşturmuyor.\n',
    );
    process.exit(1);
  }

  if (k.rol === 'ADMIN' && k.aktif) {
    console.log(`\n  ${k.eposta} zaten aktif bir ADMIN. Değişiklik yok.\n`);
    return;
  }

  const guncel = await prisma.kullanici.update({
    where: { id: k.id },
    /* `aktif` de açılıyor: pasif bir ADMIN panele giremiyor ve
       "rolü verdim ama hâlâ giremiyorum" durumunun sebebi bu. */
    data: { rol: 'ADMIN', aktif: true },
    select: { eposta: true, rol: true, aktif: true, ad: true },
  });

  /* DENETİME YAZILIYOR. İlk sürüm yazmıyordu ve sonuç şuydu: denetim
     defterinde hesabın `ziyaretci.kayit` satırı var, birkaç dakika
     sonra yönetici işlemleri var, ARADA rolün nasıl değiştiğine dair
     hiçbir kayıt yok. Yetki yükseltmesi tam da defterin tutulma
     sebebi; komut satırından yapılmış olması onu istisna yapmıyor.

     `denetimYaz` yerine doğrudan yazılıyor: o yardımcı `headers()`
     çağırıyor ve istek bağlamı olmayan bir betikte çalışmıyor. IP
     alanı da bilerek boş — burada bir istek yok, kabuk var. */
  await prisma.denetimKaydi.create({
    data: {
      kullaniciId: k.id,
      eylem: 'kullanici.rol.yukseltme',
      varlik: 'kullanici',
      varlikId: k.id,
      detay: {
        eposta: guncel.eposta,
        oncekiRol: k.rol,
        yeniRol: 'ADMIN',
        oncekiAktif: k.aktif,
        kaynak: 'scripts/yonetici-yap.ts',
      },
    },
  });

  console.log(
    `\n  ${guncel.eposta} → ${guncel.rol} (${guncel.aktif ? 'aktif' : 'pasif'})`
    + `${guncel.ad ? ` · ${guncel.ad}` : ''}\n`
    + `  Önceki rol: ${k.rol}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
