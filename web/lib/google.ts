import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { abs } from './site';

/* ============================================================
   Google ile giriş.

   Kütüphane KULLANILMIYOR: akışın tamamı iki HTTP çağrısı ve bir
   yönlendirme. Bir kimlik kütüphanesi kendi oturum modelini,
   kendi tablolarını ve kendi çerezlerini getirirdi; bu projede
   oturum zaten var (`lib/auth.ts`) ve iki sistem yan yana
   durduğunda "hangi oturum geçerli" sorusu doğuyor.

   YAPILANDIRILMAMIŞSA KAPALI: `GOOGLE_ISTEMCI_ID` ve
   `GOOGLE_ISTEMCI_GIZLI` tanımlı değilse düğme hiç görünmüyor ve
   uç noktalar 404 veriyor. Yarım yapılandırmayla açık bir giriş
   yolu, hata ekranına götüren bir düğmeden daha kötü.

   Kimlik `sub` ile eşleşiyor, e-postayla değil: kullanıcı Google'da
   e-postasını değiştirebiliyor, `sub` değişmiyor. E-posta yalnızca
   İLK bağlamada var olan hesabı bulmak için kullanılıyor.
   ============================================================ */

const YETKI_UCU = 'https://accounts.google.com/o/oauth2/v2/auth';
const JETON_UCU = 'https://oauth2.googleapis.com/token';
const BILGI_UCU = 'https://openidconnect.googleapis.com/v1/userinfo';

export const GOOGLE_DONUS_YOLU = '/api/giris/google/geri';

export function googleAyarlari(): { id: string; gizli: string } | null {
  const id = process.env.GOOGLE_ISTEMCI_ID?.trim();
  const gizli = process.env.GOOGLE_ISTEMCI_GIZLI?.trim();
  if (!id || !gizli) return null;
  return { id, gizli };
}

export const googleAcikMi = () => googleAyarlari() !== null;

/** PKCE doğrulayıcısı ve ondan türeyen meydan okuma. */
export function pkceUret() {
  const dogrulayici = randomBytes(32).toString('base64url');
  const meydan = createHash('sha256').update(dogrulayici).digest('base64url');
  return { dogrulayici, meydan };
}

export const durumUret = () => randomBytes(16).toString('base64url');

/**
 * Google'ın onay ekranının adresi.
 *
 * `prompt=select_account`: aynı tarayıcıda birden fazla Google
 * hesabı olan kullanıcı hangisiyle gireceğini seçebilmeli. Varsayılan
 * davranış sessizce ilk hesabı kullanıyor ve yanlış hesapla giren
 * kullanıcı bunu ancak sonra fark ediyor.
 */
export function googleYetkiAdresi(durum: string, meydan: string): string | null {
  const ayar = googleAyarlari();
  if (!ayar) return null;
  const p = new URLSearchParams({
    client_id: ayar.id,
    redirect_uri: abs(GOOGLE_DONUS_YOLU),
    response_type: 'code',
    scope: 'openid email profile',
    state: durum,
    code_challenge: meydan,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  return `${YETKI_UCU}?${p.toString()}`;
}

export interface GoogleKisi {
  sub: string;
  eposta: string;
  ad: string;
  epostaDogrulandi: boolean;
}

/**
 * Yetki kodunu kullanıcı bilgisine çevirir.
 *
 * `id_token`ın imzası DOĞRULANMIYOR — gerekmiyor: jeton, Google'ın
 * kendi uç noktasından TLS üzerinden doğrudan alınıyor. İmza
 * doğrulaması, jetonu üçüncü bir taraftan devraldığımızda gerekir.
 * Kullanıcı bilgisi de ayrıca `userinfo` uçundan okunuyor.
 */
export async function googleKisi(kod: string, dogrulayici: string): Promise<GoogleKisi | null> {
  const ayar = googleAyarlari();
  if (!ayar) return null;

  const jetonYaniti = await fetch(JETON_UCU, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: kod,
      client_id: ayar.id,
      client_secret: ayar.gizli,
      redirect_uri: abs(GOOGLE_DONUS_YOLU),
      grant_type: 'authorization_code',
      code_verifier: dogrulayici,
    }),
    cache: 'no-store',
  }).catch(() => null);

  if (!jetonYaniti?.ok) return null;
  const jeton = await jetonYaniti.json().catch(() => null) as { access_token?: string } | null;
  if (!jeton?.access_token) return null;

  const bilgiYaniti = await fetch(BILGI_UCU, {
    headers: { Authorization: `Bearer ${jeton.access_token}` },
    cache: 'no-store',
  }).catch(() => null);

  if (!bilgiYaniti?.ok) return null;
  const b = await bilgiYaniti.json().catch(() => null) as {
    sub?: string; email?: string; email_verified?: boolean; name?: string;
  } | null;

  if (!b?.sub || !b.email) return null;
  return {
    sub: b.sub,
    eposta: b.email.trim().toLowerCase(),
    ad: (b.name ?? '').trim() || b.email.split('@')[0],
    epostaDogrulandi: b.email_verified === true,
  };
}
