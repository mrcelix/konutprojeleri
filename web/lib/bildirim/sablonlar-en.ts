import 'server-only';
import { site } from '../site';
import type { Sablon } from './sablonlar';

/* ============================================================
   İngilizce e-posta şablonları.

   Türkçe şablonlarla AYNI yapı ve aynı tasarım kararları:
   tablo tabanlı düzen, satır içi CSS, her e-postanın düz metin
   karşılığı. Ayrı dosya olmasının sebebi metin uzunluklarının
   farklı olması — İngilizce satırlar Türkçeye göre kısa, ve
   şablonu tek dosyada koşullarla doldurmak ikisini de okunmaz
   hale getiriyordu.

   Para birimi TL kalıyor. Kur her gün değişiyor; gösterilen tutarla
   yazılan tutar farklı olursa alıcı haklı olarak güvenmiyor.
   İngilizce metinde "TRY" açıkça yazılıyor.

   BAĞLANTILAR `/en/` AĞACINA gidiyor. Türkçe yola bağlamak,
   e-postayı çevirmenin yarısını boşa çıkarıyor: okur İngilizce bir
   mektuptan Türkçe bir sayfaya düşüyor. Yollar `EN_PROJE` üzerinden
   tek yerden kuruluyor; `lib/i18n.ts` içindeki `KOK.en` ile aynı
   olmalı. */

const MARKA = '#0E5C5A';
const METIN = '#16211F';
const SOLUK = '#46565A';
const CIZGI = '#E8E2D9';

const TL = (n: number) => `TRY ${new Intl.NumberFormat('en-GB').format(n)}`;

/** İngilizce rota ağacındaki proje kökü — `lib/i18n.ts` → `KOK.en.proje`. */
const EN_PROJE = '/en/project';

const AYLAR = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const tarih = (d: Date) => `${d.getUTCDate()} ${AYLAR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

function kabuk(baslik: string, icerik: string, dugme?: { metin: string; yol: string }) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${baslik}</title></head>
<body style="margin:0;padding:0;background:#F3EFE9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EFE9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td style="background:${MARKA};padding:20px 28px;">
    <span style="color:#fff;font-size:19px;font-weight:700;letter-spacing:-.02em;">${site.ad}</span>
  </td></tr>
  <tr><td style="padding:28px;">
    <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:${METIN};font-weight:700;">${baslik}</h1>
    ${icerik}
    ${dugme ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr>
      <td style="background:${MARKA};border-radius:999px;">
        <a href="${site.url}${dugme.yol}" style="display:inline-block;padding:13px 26px;color:#fff;text-decoration:none;font-size:15px;font-weight:600;">${dugme.metin}</a>
      </td></tr></table>` : ''}
  </td></tr>
  <tr><td style="padding:18px 28px 26px;border-top:1px solid ${CIZGI};">
    <p style="margin:0;font-size:12px;line-height:1.6;color:${SOLUK};">
      ${site.unvan ? `${site.unvan} · ` : ''}<a href="${site.url}/en" style="color:${MARKA};">${site.url.replace(/^https?:\/\//, '')}</a><br>
      Questions? Reply to this email or write to
      <a href="mailto:${site.eposta}" style="color:${MARKA};">${site.eposta}</a>.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const p = (metin: string) =>
  `<p style="margin:0 0 13px;font-size:15px;line-height:1.65;color:${METIN};">${metin}</p>`;

const kutu = (satirlar: [string, string][], vurgulu = false) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:${vurgulu ? '#E2EFEE' : '#F7F4EF'};border-radius:10px;">
   <tr><td style="padding:16px 18px;">
   ${satirlar.map(([k, v]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
     <td style="padding:4px 0;font-size:14px;color:${SOLUK};">${k}</td>
     <td style="padding:4px 0;font-size:14px;color:${METIN};font-weight:600;text-align:right;">${v}</td>
   </tr></table>`).join('')}
   </td></tr></table>`;

/** HTML'i düz metne indirger — her e-postanın metin karşılığı olmalı. */
const duzMetin = (satirlar: string[]) => satirlar.filter(Boolean).join('\n');

/* ---------------- Şablonlar ---------------- */


/**
 * Buyer: we received your enquiry.
 *
 * The reference code is in the body so the buyer can check the status
 * without filling the form again — otherwise the sales team ends up
 * calling the same person twice.
 */
export function talepAlindi(
  ad: string, kod: string, projeAd: string | null, projeSlug: string | null,
): Sablon {
  return {
    konu: `Enquiry received — ${kod}`,
    html: kabuk(
      'We have your enquiry',
      p(`Hello ${ad},`)
      + p(projeAd
        ? `We received your enquiry about <b>${projeAd}</b>. Our sales team will call you shortly.`
        : 'We received your enquiry. Our sales team will call you shortly.')
      + kutu([['Your reference', `<code style="font-family:ui-monospace,Menlo,monospace;font-size:15px;">${kod}</code>`]])
      + p('Keep this reference — you can use it to check the status of your enquiry.'),
      projeSlug ? { metin: 'View the development', yol: `${EN_PROJE}/${projeSlug}` } : undefined,
    ),
    metin: duzMetin([
      `Hello ${ad},`, '',
      projeAd ? `We received your enquiry about ${projeAd}.` : 'We received your enquiry.',
      `Your reference: ${kod}`, '',
      projeSlug ? `Development: ${site.url}${EN_PROJE}/${projeSlug}` : '',
    ]),
  };
}

/** Buyer: viewing appointment confirmed. */
export function randevuTeyit(
  ad: string, kod: string, projeAd: string | null, ne: Date, nerede: string,
): Sablon {
  return {
    konu: `Appointment confirmed — ${tarih(ne)}`,
    html: kabuk(
      'Your appointment is confirmed',
      p(`Hello ${ad},`)
      + kutu([
        ['Reference', kod],
        ...(projeAd ? [['Development', projeAd] as [string, string]] : []),
        ['Date', tarih(ne)],
        ['Location', nerede],
      ])
      + p('If you need to change it, reply to this email or call us.'),
    ),
    metin: duzMetin([
      `Hello ${ad},`, '',
      'Your appointment is confirmed.',
      `Reference: ${kod}`,
      projeAd ? `Development: ${projeAd}` : '',
      `Date: ${tarih(ne)}`,
      `Location: ${nerede}`,
    ]),
  };
}

/** Buyer: the developer answered your question. */
export function soruYanitlandi(
  soranAd: string, firmaAd: string, projeAd: string, projeSlug: string, yanit: string,
): Sablon {
  return {
    konu: `${projeAd} · your question was answered`,
    html: kabuk(
      'Your question was answered',
      p(`Hello ${soranAd},`)
      + p(`<b>${firmaAd}</b> answered your question about ${projeAd}:`)
      + `<blockquote style="margin:0 0 20px;padding:14px 18px;background:#F7F4EF;border-left:3px solid ${MARKA};
        font-size:15px;line-height:1.6;color:${SOLUK};border-radius:0 8px 8px 0;">${yanit}</blockquote>`
      + p('If you have another question, just reply to this email.'),
      { metin: 'View the development', yol: `${EN_PROJE}/${projeSlug}` },
    ),
    metin: duzMetin([
      `Hello ${soranAd},`, '',
      `${firmaAd} answered:`, '', yanit, '',
      `Development: ${site.url}${EN_PROJE}/${projeSlug}`,
    ]),
  };
}

/**
 * GDPR/KVKK request verification link.
 *
 * Carries NO PERSONAL DATA — no name, no enquiry details. It may have
 * reached the wrong inbox; the email itself must not be a leak. It is
 * also sent for addresses we hold no data for, because staying silent
 * would reveal that the address is not in our records.
 */
export function kvkkDogrulama(tip: 'ERISIM' | 'SILME', jeton: string): Sablon {
  const silme = tip === 'SILME';
  const baslik = silme ? 'Your erasure request' : 'Your data access request';
  const yol = `/veri-talebi/dogrula?jeton=${jeton}`;

  return {
    konu: `${baslik} — verification needed`,
    html: kabuk(
      baslik,
      p('Hello,')
      + p(silme
        ? `We received a request to <b>erase</b> the personal data linked to this email address at ${site.ad}.`
        : `We received a request to <b>disclose</b> the personal data linked to this email address at ${site.ad}.`)
      + p('To confirm the request is yours, use the link below. It is valid for <b>48 hours</b>.')
      /* Doğrulama sayfası BİLEREK Türkçe: hak adları Türk mevzuatından
         (KVKK md. 11) geliyor ve çevirisi hukuki karşılık taşımıyor.
         Okuru hazırlıksız Türkçe bir sayfaya düşürmemek için burada
         söyleniyor. */
      + p('The verification page itself is <b>in Turkish</b>: the rights it lists come from Turkish data protection law and a translation would not carry the same legal meaning.')
      + p('<b>If you did not make this request, no action is needed.</b> Unverified requests are never processed and expire on their own.'),
      { metin: silme ? 'Confirm erasure request' : 'View my data', yol },
    ),
    metin: duzMetin([
      'Hello,', '',
      silme
        ? `We received a request to erase the personal data linked to this address at ${site.ad}.`
        : `We received a request to disclose the personal data linked to this address at ${site.ad}.`,
      '',
      'Confirm here (valid 48 hours):', `${site.url}${yol}`, '',
      'The verification page is in Turkish — the rights it lists come from Turkish law.', '',
      'If you did not make this request, no action is needed.',
    ]),
  };
}

/** Follower: the development you watch went on sale. */
export function alarmSatista(
  projeAdi: string, projeSlug: string, fiyatMin: number, jeton: string,
): Sablon {
  return {
    konu: `Now on sale — ${projeAdi}`,
    html: kabuk(
      'A development you follow is on sale',
      p(`<b>${projeAdi}</b> has been released. Prices start at <b>${TL(fiyatMin)}</b>.`)
      + p('At launch the choice of unit types is at its widest; floor and aspect can still be selected at this stage.'),
      { metin: 'See unit types', yol: `${EN_PROJE}/${projeSlug}` },
    ),
    metin: duzMetin([
      `${projeAdi} is now on sale.`,
      `Prices start at ${TL(fiyatMin)}`, '',
      `Development: ${site.url}${EN_PROJE}/${projeSlug}`, '',
      `Unsubscribe: ${site.url}/alarm/${jeton}?islem=iptal`,
    ]),
  };
}
