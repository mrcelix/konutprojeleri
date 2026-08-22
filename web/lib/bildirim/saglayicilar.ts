import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { site } from '../site';
import type { EpostaMesaji, EpostaSaglayici, GonderimSonucu } from './tipler';

/* ============================================================
   E-posta sağlayıcıları.

   sahte  → varsayılan. Gönderim yapmaz; e-postayı .postakutusu/
            klasörüne HTML dosyası olarak yazar. Tarayıcıda açıp
            şablonun gerçekte nasıl göründüğü kontrol edilebilir.
   resend → HTTP API, bağımlılık gerektirmez (fetch)
   smtp   → nodemailer; Türkiye'deki çoğu barındırma sağlayıcısı SMTP veriyor
   ============================================================ */

const gonderen = () => ({
  ad: process.env.EPOSTA_GONDEREN_AD ?? site.ad,
  adres: process.env.EPOSTA_GONDEREN ?? 'bildirim@konutprojeleri.com',
});

/* ---------------- sahte ---------------- */

const POSTA_KUTUSU = path.join(process.cwd(), '.postakutusu');

export const sahteEposta: EpostaSaglayici = {
  ad: 'sahte',
  gercek: false,

  async gonder(mesaj: EpostaMesaji): Promise<GonderimSonucu> {
    const damga = new Date().toISOString().replace(/[:.]/g, '-');
    const guvenliAlici = mesaj.alici.replace(/[^a-z0-9@._-]/gi, '_');
    const dosya = path.join(POSTA_KUTUSU, `${damga}_${guvenliAlici}.html`);

    try {
      await mkdir(POSTA_KUTUSU, { recursive: true });
      // Üstte kime/ne zaman gittiğini gösteren bir şerit eklenir
      const serit = `<div style="background:#fffbe6;border-bottom:1px solid #e6d9a8;padding:12px 20px;font:13px/1.5 system-ui;color:#6b5a1e">
        <b>Gönderilmedi — geliştirme kopyası.</b><br>
        Kime: ${mesaj.alici} (${mesaj.aliciAd}) &nbsp;·&nbsp; Konu: ${mesaj.konu}
      </div>`;
      await writeFile(dosya, serit + mesaj.html, 'utf8');
      console.log(`  ✉  ${mesaj.alici} — ${mesaj.konu}  →  ${path.relative(process.cwd(), dosya)}`);
      return { basarili: true, referans: `SAHTE-${damga}` };
    } catch (e) {
      return { basarili: false, hata: e instanceof Error ? e.message : 'dosya yazılamadı' };
    }
  },
};

/* ---------------- resend ---------------- */

export const resendEposta: EpostaSaglayici = {
  ad: 'resend',
  gercek: true,

  async gonder(mesaj: EpostaMesaji): Promise<GonderimSonucu> {
    const anahtar = process.env.RESEND_API_KEY;
    if (!anahtar) return { basarili: false, hata: 'RESEND_API_KEY tanımlı değil' };

    const g = gonderen();
    try {
      const yanit = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${anahtar}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${g.ad} <${g.adres}>`,
          to: [mesaj.alici],
          subject: mesaj.konu,
          html: mesaj.html,
          text: mesaj.metin,
          ...(mesaj.yanitAdresi ? { reply_to: mesaj.yanitAdresi } : {}),
        }),
      });

      const govde = await yanit.json().catch(() => ({}));
      if (!yanit.ok) {
        return { basarili: false, hata: `${yanit.status}: ${(govde as { message?: string }).message ?? 'bilinmeyen hata'}` };
      }
      return { basarili: true, referans: String((govde as { id?: string }).id ?? '') };
    } catch (e) {
      return { basarili: false, hata: e instanceof Error ? e.message : 'ağ hatası' };
    }
  },
};

/* ---------------- smtp ---------------- */

export const smtpEposta: EpostaSaglayici = {
  ad: 'smtp',
  gercek: true,

  async gonder(mesaj: EpostaMesaji): Promise<GonderimSonucu> {
    const { SMTP_HOST, SMTP_PORT, SMTP_KULLANICI, SMTP_PAROLA } = process.env;
    if (!SMTP_HOST || !SMTP_KULLANICI || !SMTP_PAROLA) {
      return { basarili: false, hata: 'SMTP_HOST / SMTP_KULLANICI / SMTP_PAROLA tanımlı değil' };
    }

    try {
      // nodemailer yalnızca bu sağlayıcı seçildiğinde yüklenir
      const { createTransport } = await import('nodemailer');
      const port = Number(SMTP_PORT ?? 587);
      const g = gonderen();

      const tasiyici = createTransport({
        host: SMTP_HOST,
        port,
        secure: port === 465,
        auth: { user: SMTP_KULLANICI, pass: SMTP_PAROLA },
      });

      const sonuc = await tasiyici.sendMail({
        from: `"${g.ad}" <${g.adres}>`,
        to: mesaj.alici,
        subject: mesaj.konu,
        html: mesaj.html,
        text: mesaj.metin,
        ...(mesaj.yanitAdresi ? { replyTo: mesaj.yanitAdresi } : {}),
      });
      return { basarili: true, referans: sonuc.messageId };
    } catch (e) {
      return { basarili: false, hata: e instanceof Error ? e.message : 'SMTP hatası' };
    }
  },
};

const SAGLAYICILAR: Record<string, EpostaSaglayici> = {
  sahte: sahteEposta,
  resend: resendEposta,
  smtp: smtpEposta,
};

export function epostaSaglayici(): EpostaSaglayici {
  const secim = process.env.EPOSTA_SAGLAYICI ?? 'sahte';
  const s = SAGLAYICILAR[secim];
  if (!s) {
    throw new Error(
      `Bilinmeyen e-posta sağlayıcısı: "${secim}". Geçerli değerler: ${Object.keys(SAGLAYICILAR).join(', ')}`,
    );
  }
  return s;
}

export const gercekEposta = () => epostaSaglayici().gercek;
