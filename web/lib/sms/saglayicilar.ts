import 'server-only';
import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import type { SmsMesaji, SmsSaglayici, SmsSonucu } from './tipler';

/* ============================================================
   SMS sağlayıcıları.

   sahte       → varsayılan. Göndermez; .postakutusu/sms.log dosyasına yazar.
   netgsm      → Türkiye'de en yaygın; XML ve REST API'si var, REST kullanıyoruz.
   iletimerkezi→ ikinci yaygın seçenek.

   Her ikisi de "gönderici adı" (originator/başlık) zorunlu kılıyor ve bu
   başlığın önceden onaylanması gerekiyor — kayıt olur olmaz gönderim
   yapılamıyor. SMS_BASLIK ortam değişkeni bu onaylı başlık.
   ============================================================ */

const baslik = () => process.env.SMS_BASLIK ?? 'KONUTPROJELERI';

/* ---------------- sahte ---------------- */

const KUTU = path.join(process.cwd(), '.postakutusu');

export const sahteSms: SmsSaglayici = {
  ad: 'sahte',
  gercek: false,

  async gonder(mesaj: SmsMesaji): Promise<SmsSonucu> {
    const satir = `[${new Date().toISOString()}] ${mesaj.alici} (${mesaj.metin.length} krktr)\n${mesaj.metin}\n${'─'.repeat(60)}\n`;
    try {
      await mkdir(KUTU, { recursive: true });
      await appendFile(path.join(KUTU, 'sms.log'), satir, 'utf8');
      console.log(`✆ ${mesaj.alici} — ${mesaj.metin.slice(0, 48)}…`);
      return { basarili: true, referans: `sahte-${Date.now()}` };
    } catch (e) {
      return { basarili: false, hata: e instanceof Error ? e.message : 'yazılamadı' };
    }
  },
};

/* ---------------- Netgsm ---------------- */

export const netgsmSms: SmsSaglayici = {
  ad: 'netgsm',
  gercek: true,

  async gonder(mesaj: SmsMesaji): Promise<SmsSonucu> {
    const kullanici = process.env.NETGSM_KULLANICI;
    const parola = process.env.NETGSM_PAROLA;
    if (!kullanici || !parola) {
      return { basarili: false, hata: 'NETGSM_KULLANICI / NETGSM_PAROLA tanımlı değil' };
    }

    try {
      const yanit = await fetch('https://api.netgsm.com.tr/sms/rest/v2/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${kullanici}:${parola}`).toString('base64')}`,
        },
        body: JSON.stringify({
          msgheader: baslik(),
          // Numaralar başındaki + olmadan bekleniyor
          messages: [{ msg: mesaj.metin, no: mesaj.alici.replace(/^\+/, '') }],
          encoding: 'TR',
          iysfilter: '', // işlemsel mesaj — İYS filtresine tabi değil
        }),
      });

      const govde = (await yanit.json().catch(() => ({}))) as { code?: string; jobid?: string; description?: string };

      // Netgsm '00' başarı kodu döner; diğerleri hata.
      if (govde.code === '00') return { basarili: true, referans: govde.jobid };

      // 20: mesaj metni hatalı, 30: yetki, 40: başlık onaysız, 70: parametre
      const kaliciKodlar = ['20', '30', '40', '70'];
      return {
        basarili: false,
        hata: `netgsm ${govde.code ?? yanit.status}: ${govde.description ?? 'bilinmeyen'}`,
        kalici: kaliciKodlar.includes(govde.code ?? ''),
      };
    } catch (e) {
      return { basarili: false, hata: e instanceof Error ? e.message : 'ağ hatası' };
    }
  },
};

/* ---------------- İletimerkezi ---------------- */

export const iletimerkeziSms: SmsSaglayici = {
  ad: 'iletimerkezi',
  gercek: true,

  async gonder(mesaj: SmsMesaji): Promise<SmsSonucu> {
    const anahtar = process.env.ILETIMERKEZI_ANAHTAR;
    const gizli = process.env.ILETIMERKEZI_GIZLI;
    if (!anahtar || !gizli) {
      return { basarili: false, hata: 'ILETIMERKEZI_ANAHTAR / ILETIMERKEZI_GIZLI tanımlı değil' };
    }

    try {
      const yanit = await fetch('https://api.iletimerkezi.com/v1/send-sms/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: {
            authentication: { key: anahtar, hash: gizli },
            order: {
              sender: baslik(),
              message: { text: mesaj.metin, receipents: { number: [mesaj.alici.replace(/^\+/, '')] } },
            },
          },
        }),
      });

      const govde = (await yanit.json().catch(() => ({}))) as {
        response?: { status?: { code?: string; message?: string }; order?: { id?: string } };
      };
      const kod = govde.response?.status?.code;

      if (kod === '200') return { basarili: true, referans: govde.response?.order?.id };
      return {
        basarili: false,
        hata: `iletimerkezi ${kod ?? yanit.status}: ${govde.response?.status?.message ?? 'bilinmeyen'}`,
        kalici: ['401', '403', '451'].includes(kod ?? ''),
      };
    } catch (e) {
      return { basarili: false, hata: e instanceof Error ? e.message : 'ağ hatası' };
    }
  },
};

/* ---------------- seçim ---------------- */

export function smsSaglayici(): SmsSaglayici {
  switch ((process.env.SMS_SAGLAYICI ?? 'sahte').toLowerCase()) {
    case 'netgsm': return netgsmSms;
    case 'iletimerkezi': return iletimerkeziSms;
    default: return sahteSms;
  }
}

export const gercekSms = () => smsSaglayici().gercek;

/**
 * SMS ücretlendirmesi karakter sayısına göre.
 * GSM 7-bit alfabesinde 160, Türkçe karakter varsa (UCS-2) 70 karakter/parça.
 * Şablonlar bunu bilerek kısa tutuluyor; yine de hesabı gösteriyoruz.
 */
export function smsParca(metin: string): { alfabe: 'GSM' | 'UCS2'; parca: number; karakter: number } {
  const turkce = /[ğĞıİşŞçÇöÖüÜ]/.test(metin);
  const sinir = turkce ? 70 : 160;
  const cokluSinir = turkce ? 67 : 153;
  const n = metin.length;
  return {
    alfabe: turkce ? 'UCS2' : 'GSM',
    parca: n <= sinir ? 1 : Math.ceil(n / cokluSinir),
    karakter: n,
  };
}
