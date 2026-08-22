import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { denetimYaz, oturumAc } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { googleAcikMi, googleKisi } from '@/lib/google';
import { istekIp, sinirKontrol } from '@/lib/hiz-sinir';
import { abs } from '@/lib/site';

/* ============================================================
   Google ile girişin DÖNÜŞÜ.

   Sıra:
     1. durum (state) çerezi ile geri gelen `state` karşılaştırılıyor
     2. yetki kodu + PKCE doğrulayıcısı ile jeton alınıyor
     3. `sub` ile hesap aranıyor; yoksa e-posta ile EŞLEŞTİRİLİYOR
     4. hâlâ yoksa ZIYARETCI hesabı açılıyor
     5. iki adımlı doğrulaması açık hesapta oturum yetki VERMİYOR;
        kullanıcı ikinci aşamaya gidiyor

   E-postası Google'da DOĞRULANMAMIŞ hesap kabul edilmiyor:
   doğrulanmamış adresle, başkasının e-postasına sahip bir Google
   hesabı açıp o kişinin taleplerini görmek mümkün olurdu.
   ============================================================ */

export const dynamic = 'force-dynamic';

const CEREZ_DURUM = 'vn_g_durum';
const CEREZ_PKCE = 'vn_g_pkce';
const CEREZ_HEDEF = 'vn_g_hedef';

function hataya(sebep: string) {
  return NextResponse.redirect(abs(`/giris?google=${encodeURIComponent(sebep)}`));
}

async function cerezleriSil() {
  const c = await cookies();
  c.delete(CEREZ_DURUM);
  c.delete(CEREZ_PKCE);
  c.delete(CEREZ_HEDEF);
}

export async function GET(istek: Request) {
  if (!googleAcikMi()) {
    return NextResponse.json({ hata: 'Google ile giriş kapalı.' }, { status: 404 });
  }

  const ip = await istekIp();
  const sinir = await sinirKontrol('girisIp', `google:${ip}`);
  if (!sinir.izin) return hataya('sinir');

  const url = new URL(istek.url);
  const kod = url.searchParams.get('code');
  const durum = url.searchParams.get('state');
  const hataKodu = url.searchParams.get('error');

  const c = await cookies();
  const beklenenDurum = c.get(CEREZ_DURUM)?.value;
  const dogrulayici = c.get(CEREZ_PKCE)?.value;
  const hedef = c.get(CEREZ_HEDEF)?.value;
  await cerezleriSil();

  // Kullanıcı onay ekranında vazgeçtiyse hata değil
  if (hataKodu === 'access_denied') return NextResponse.redirect(abs('/giris'));
  if (hataKodu || !kod || !durum) return hataya('eksik');
  if (!beklenenDurum || !dogrulayici || durum !== beklenenDurum) return hataya('durum');

  const kisi = await googleKisi(kod, dogrulayici);
  if (!kisi) return hataya('jeton');
  if (!kisi.epostaDogrulandi) return hataya('dogrulanmamis');

  /* 1) `sub` ile: kullanıcı Google'da e-postasını değiştirmiş olsa
        bile aynı hesaba giriyor. */
  let k = await prisma.kullanici.findUnique({
    where: { googleAlt: kisi.sub },
    select: { id: true, rol: true, aktif: true, totpAktif: true, totpGizli: true },
  });

  /* 2) İlk bağlama: aynı e-postayla açılmış hesap varsa ONA
        bağlanıyor. Yeni hesap açmak, firmanın panelini göremediği
        ikinci bir hesapla karşılaşması demekti. */
  if (!k) {
    const epostayla = await prisma.kullanici.findUnique({
      where: { eposta: kisi.eposta },
      select: { id: true, rol: true, aktif: true, totpAktif: true, totpGizli: true, googleAlt: true },
    });
    if (epostayla) {
      if (epostayla.googleAlt && epostayla.googleAlt !== kisi.sub) return hataya('baska');
      await prisma.kullanici.update({
        where: { id: epostayla.id }, data: { googleAlt: kisi.sub },
      });
      await denetimYaz(epostayla.id, 'google.baglandi', 'kullanici', epostayla.id);
      k = epostayla;
    }
  }

  /* 3) Hiç yoksa ZIYARETCI hesabı. Parola YAZILMIYOR: bu hesabın
        parolası hiç olmadı; boş bir hash yazmak "parola yok" ile
        "parola boş" ayrımını silerdi. */
  if (!k) {
    const yeni = await prisma.kullanici.create({
      data: { ad: kisi.ad, eposta: kisi.eposta, rol: 'ZIYARETCI', googleAlt: kisi.sub },
      select: { id: true, rol: true, aktif: true, totpAktif: true, totpGizli: true },
    });
    await denetimYaz(yeni.id, 'ziyaretci.kayit.google', 'kullanici', yeni.id, { eposta: kisi.eposta });
    k = yeni;
  }

  if (!k.aktif) return hataya('kapali');

  // İki adımlı doğrulama açıksa oturum henüz yetki vermiyor
  if (k.totpAktif && k.totpGizli) {
    await oturumAc(k.id, true);
    await denetimYaz(k.id, 'giris.ikinci_asama', 'kullanici', k.id, { yol: 'google' });
    return NextResponse.redirect(abs('/giris/dogrulama'));
  }

  await oturumAc(k.id);
  await denetimYaz(k.id, 'giris.basarili', 'kullanici', k.id, { yol: 'google' });

  const varis = hedef && hedef.startsWith('/') && !hedef.startsWith('//')
    ? hedef
    : (k.rol === 'ADMIN' ? '/yonetim' : k.rol === 'ZIYARETCI' ? '/hesap' : '/panel');
  return NextResponse.redirect(abs(varis));
}
