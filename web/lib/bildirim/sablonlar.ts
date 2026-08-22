import 'server-only';
import { TL, TLkisa, trTamUTC } from '../bicim';
import { abs, site } from '../site';

/* ============================================================
   E-posta şablonları.

   Tasarım kararları:
   - Tablo tabanlı düzen ve satır içi CSS — Outlook ve Gmail'de
     harici stil sayfası ve flex/grid güvenilir çalışmıyor.
   - Tek sütun, 600 px — mobil istemcilerde bölünmüyor.
   - Her e-postanın düz metin karşılığı var; spam puanı düşer ve
     metin okuyucular için erişilebilir olur.
   - Marka renkleri sitedeki token'larla aynı (sabit yazılmak zorunda).
   ============================================================ */

const R = {
  bg: '#F3EFE9',
  yuzey: '#FFFFFF',
  murekkep: '#16211F',
  murekkep2: '#46565A',
  murekkep3: '#7C8A8C',
  cizgi: '#E8E2D9',
  ana: '#0E5C5A',
  vurgu: '#C7663E',
  basari: '#2E7D5B',
};

export interface Sablon {
  konu: string;
  html: string;
  metin: string;
}

const trTam = trTamUTC;

/** Ortak dış kabuk: başlık, gövde, altbilgi. */
/* Altbilgi künyesi: tüzel unvan ve adres alanları boş bırakılabiliyor
   (bkz. lib/site.ts). Boş parçaları ayıklayıp hiçbiri yoksa satırı
   tümüyle atlıyoruz — " · /" gibi yarım künye basmaktansa hiç basmamak. */
function kunye(): string {
  const yer = [site.adres.ilce, site.adres.il].filter(Boolean).join('/');
  return [site.unvan, yer].filter(Boolean).join(' · ');
}

function kabuk(baslik: string, icerik: string, dugme?: { metin: string; yol: string }) {
  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${baslik}</title></head>
<body style="margin:0;padding:0;background:${R.bg};font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${R.bg};padding:28px 12px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${R.yuzey};border:1px solid ${R.cizgi};border-radius:14px;overflow:hidden;">

    <tr><td style="padding:22px 28px;border-bottom:1px solid ${R.cizgi};">
      <a href="${site.url}" style="text-decoration:none;color:${R.murekkep};font-size:19px;font-weight:700;letter-spacing:-.02em;">
        ${site.ad}
      </a>
    </td></tr>

    <tr><td style="padding:30px 28px 8px;">
      <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:${R.murekkep};font-weight:700;">${baslik}</h1>
      ${icerik}
    </td></tr>

    ${dugme ? `<tr><td style="padding:6px 28px 30px;">
      <a href="${abs(dugme.yol)}" style="display:inline-block;background:${R.ana};color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;">
        ${dugme.metin}
      </a>
    </td></tr>` : '<tr><td style="height:22px"></td></tr>'}

    <tr><td style="padding:20px 28px;border-top:1px solid ${R.cizgi};background:#FBF9F6;">
      <p style="margin:0 0 6px;font-size:12.5px;color:${R.murekkep3};line-height:1.6;">
        Bu e-posta ${site.ad} tarafından gönderildi. Sorularınız için
        <a href="mailto:${site.eposta}" style="color:${R.ana};">${site.eposta}</a> adresine yazabilirsiniz.
      </p>
      ${kunye() ? `<p style="margin:0;font-size:12.5px;color:${R.murekkep3};">${kunye()}</p>` : ''}
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}

const p = (metin: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${R.murekkep2};">${metin}</p>`;

/** Ad–değer satırlarından oluşan özet kutusu. */
function kutu(satirlar: [string, string][], vurgulu?: [string, string]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background:#FBF9F6;border:1px solid ${R.cizgi};border-radius:10px;margin:4px 0 20px;">
    ${satirlar.map(([a, d]) => `<tr>
      <td style="padding:10px 16px;font-size:14px;color:${R.murekkep3};">${a}</td>
      <td style="padding:10px 16px;font-size:14px;color:${R.murekkep};font-weight:600;text-align:right;">${d}</td>
    </tr>`).join('')}
    ${vurgulu ? `<tr>
      <td style="padding:12px 16px;font-size:15px;color:${R.murekkep};font-weight:700;border-top:1px solid ${R.cizgi};">${vurgulu[0]}</td>
      <td style="padding:12px 16px;font-size:16px;color:${R.ana};font-weight:700;text-align:right;border-top:1px solid ${R.cizgi};">${vurgulu[1]}</td>
    </tr>` : ''}
  </table>`;
}

const duzMetin = (satirlar: string[]) =>
  satirlar.filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n').trim();


/* ============================================================
   Satış talebi
   ============================================================ */

const NIYET_ADI: Record<string, string> = {
  BILGI: 'Bilgi talebi',
  FIYAT_LISTESI: 'Fiyat listesi talebi',
  KATALOG: 'Katalog talebi',
  RANDEVU: 'Randevu talebi',
};

const ODEME_ADI: Record<string, string> = {
  BELIRTILMEDI: 'Belirtilmedi',
  PESIN: 'Peşin',
  KREDI: 'Konut kredisi',
  TAKSIT: 'Firmadan taksit',
  TAKAS: 'Takas',
};

export interface TalepEkipBaglam {
  kod: string;
  niyet: string;
  ad: string;
  telefon: string;
  eposta: string | null;
  projeAd: string | null;
  projeFiyat: number | null;
  daireTipi: string | null;
  butceMin: number | null;
  butceMax: number | null;
  odemeSekli: string;
  saat: string | null;
  not: string | null;
}

/** Bütçeyi okunur aralığa çevirir; ikisi de boşsa satır basılmıyor. */
function butceMetni(min: number | null, max: number | null): string | null {
  if (min && max) return `${TLkisa(min)} – ${TLkisa(max)}`;
  if (min) return `${TLkisa(min)} ve üzeri`;
  if (max) return `${TLkisa(max)}'ye kadar`;
  return null;
}

/**
 * Satış ekibine: yeni talep düştü.
 *
 * TELEFON GÖVDEDE — ekip e-postadan çıkıp panele girmeden arayabilsin.
 * Konut satışında ilk teması kimin ne kadar hızlı kurduğu belirleyici;
 * bir panel sekmesi açtırmak o hızı harcıyor.
 *
 * Konu satırında NİYET var: randevu talebi telefonu bugün açmayı
 * gerektiriyor, katalog talebi aynı aciliyette değil.
 */
export function talepEkip(b: TalepEkipBaglam): Sablon {
  const baslik = NIYET_ADI[b.niyet] ?? 'Yeni talep';
  const butce = butceMetni(b.butceMin, b.butceMax);

  const satirlar: [string, string][] = [
    ['Talep kodu', b.kod],
    ['Ad soyad', b.ad],
    ['Telefon', b.telefon],
  ];
  if (b.eposta) satirlar.push(['E-posta', b.eposta]);
  if (b.projeAd) satirlar.push(['Proje', b.projeAd]);
  if (b.daireTipi) satirlar.push(['İlgilendiği tip', b.daireTipi]);
  if (b.projeFiyat) satirlar.push(['Projede başlangıç', TLkisa(b.projeFiyat)]);
  if (butce) satirlar.push(['Bütçe', butce]);
  if (b.odemeSekli !== 'BELIRTILMEDI') satirlar.push(['Ödeme', ODEME_ADI[b.odemeSekli] ?? b.odemeSekli]);
  if (b.saat) satirlar.push(['Uygun saat', b.saat]);

  return {
    konu: `${baslik} — ${b.ad}${b.projeAd ? ` · ${b.projeAd}` : ''}`,
    html: kabuk(
      baslik,
      kutu(satirlar) +
      (b.not
        ? `<blockquote style="margin:16px 0 20px;padding:14px 18px;background:#FBF9F6;border-left:3px solid ${R.ana};
            font-size:15px;line-height:1.6;color:${R.murekkep2};border-radius:0 8px 8px 0;">${b.not}</blockquote>`
        : '') +
      p(b.niyet === 'RANDEVU'
        ? '<b>Randevu talebi:</b> tarih ve saat teyidi için bugün arayın.'
        : 'Form <b>aynı gün içinde dönüş</b> sözü veriyor.'),
      { metin: 'Panelde aç', yol: '/yonetim/talepler' },
    ),
    metin: duzMetin([
      baslik, '',
      ...satirlar.map(([a, d]) => `${a}: ${d}`),
      ...(b.not ? ['', `Not: ${b.not}`] : []),
      '', `Panel: ${abs('/yonetim/talepler')}`,
    ]),
  };
}

/**
 * Talep sahibine: aldık.
 *
 * TALEP KODU GÖVDEDE: kişi durumunu kendi sorgulayabilsin diye. Kod
 * olmadan "ne oldu benim talebime" sorusunun tek yanıtı yeniden form
 * doldurmak oluyordu ve ekip aynı kişiyi iki kez arıyordu.
 */
export function talepAlindi(
  ad: string, kod: string, projeAd: string | null, projeSlug: string | null,
): Sablon {
  return {
    konu: `Talebiniz alındı — ${kod}`,
    html: kabuk(
      'Talebiniz bize ulaştı',
      p(`Merhaba ${ad},`) +
      p(projeAd
        ? `<b>${projeAd}</b> hakkındaki talebinizi aldık. Satış ekibimiz en kısa sürede sizi arayacak.`
        : 'Talebinizi aldık. Satış ekibimiz en kısa sürede sizi arayacak.') +
      kutu([['Talep kodunuz', `<code style="font-family:ui-monospace,Menlo,monospace;font-size:15px;">${kod}</code>`]]) +
      p('Bu kodu saklayın: talebinizin durumunu sorgularken kullanabilirsiniz.'),
      projeSlug ? { metin: 'Projeyi incele', yol: `/proje/${projeSlug}` } : undefined,
    ),
    metin: duzMetin([
      `Merhaba ${ad},`, '',
      projeAd ? `${projeAd} hakkındaki talebinizi aldık.` : 'Talebinizi aldık.',
      `Talep kodunuz: ${kod}`, '',
      projeSlug ? `Proje: ${abs(`/proje/${projeSlug}`)}` : '',
    ]),
  };
}

/** Talep sahibine: randevu teyidi. */
export function randevuTeyit(
  ad: string, kod: string, projeAd: string | null, ne: Date, nerede: string,
): Sablon {
  return {
    konu: `Randevunuz onaylandı — ${trTam(ne)}`,
    html: kabuk(
      'Randevunuz onaylandı',
      p(`Merhaba ${ad},`) +
      kutu([
        ['Talep kodu', kod],
        ...(projeAd ? [['Proje', projeAd] as [string, string]] : []),
        ['Tarih', trTam(ne)],
        ['Yer', nerede],
      ]) +
      p('Değişiklik gerekirse bu e-postayı yanıtlayabilir ya da bizi arayabilirsiniz.'),
    ),
    metin: duzMetin([
      `Merhaba ${ad},`, '',
      'Randevunuz onaylandı.',
      `Talep kodu: ${kod}`,
      projeAd ? `Proje: ${projeAd}` : '',
      `Tarih: ${trTam(ne)}`,
      `Yer: ${nerede}`,
    ]),
  };
}

/* ============================================================
   Proje soruları
   ============================================================ */

export function yeniSoru(
  aliciAd: string, soranAd: string, projeAd: string, soru: string, konusmaId: string,
): Sablon {
  return {
    konu: `${projeAd} hakkında yeni soru`,
    html: kabuk(
      'Yeni soru geldi',
      p(`Merhaba ${aliciAd},`) +
      p(`<b>${soranAd}</b>, ${projeAd} hakkında soru sordu:`) +
      `<blockquote style="margin:0 0 20px;padding:14px 18px;background:#FBF9F6;border-left:3px solid ${R.ana};
        font-size:15px;line-height:1.6;color:${R.murekkep2};border-radius:0 8px 8px 0;">${soru}</blockquote>` +
      p('Hızlı yanıt vermek talebe dönüşme oranını belirgin artırıyor.'),
      { metin: 'Panelden yanıtla', yol: `/panel/mesajlar?k=${konusmaId}` },
    ),
    metin: duzMetin([
      `Merhaba ${aliciAd},`, '',
      `${soranAd}, ${projeAd} hakkında sordu:`, '', soru, '',
      `Yanıtla: ${abs(`/panel/mesajlar?k=${konusmaId}`)}`,
    ]),
  };
}

export function soruYanitlandi(
  soranAd: string, firmaAd: string, projeAd: string, projeSlug: string, yanit: string,
): Sablon {
  return {
    konu: `${projeAd} · sorunuz yanıtlandı`,
    html: kabuk(
      'Sorunuz yanıtlandı',
      p(`Merhaba ${soranAd},`) +
      p(`<b>${firmaAd}</b>, ${projeAd} hakkındaki sorunuzu yanıtladı:`) +
      `<blockquote style="margin:0 0 20px;padding:14px 18px;background:#FBF9F6;border-left:3px solid ${R.ana};
        font-size:15px;line-height:1.6;color:${R.murekkep2};border-radius:0 8px 8px 0;">${yanit}</blockquote>` +
      p('Başka sorunuz varsa bu e-postayı yanıtlayabilirsiniz.'),
      { metin: 'Projeyi incele', yol: `/proje/${projeSlug}` },
    ),
    metin: duzMetin([
      `Merhaba ${soranAd},`, '',
      `${firmaAd} yanıtladı:`, '', yanit, '',
      `Proje: ${abs(`/proje/${projeSlug}`)}`,
    ]),
  };
}

/* ============================================================
   Hesap
   ============================================================ */

export function hesapOlusturuldu(ad: string, eposta: string, geciciParola: string, rol: string): Sablon {
  const panelAdi = rol === 'ADMIN' ? 'yönetim' : 'firma';
  return {
    konu: `${site.ad} panel hesabınız hazır`,
    html: kabuk(
      'Panel hesabınız oluşturuldu',
      p(`Merhaba ${ad},`)
      + p(`${site.ad} ${panelAdi} paneline erişiminiz açıldı.`)
      + kutu([
        ['E-posta', eposta],
        ['Geçici parola', `<code style="font-family:ui-monospace,Menlo,monospace;font-size:15px;">${geciciParola}</code>`],
      ])
      + p('<b>İlk girişten sonra parolanızı değiştirin.</b> Bu e-postayı sildiğinizden emin olun; '
        + 'geçici parola burada düz metin olarak duruyor.'),
      { metin: 'Panele giriş yap', yol: '/giris' },
    ),
    metin: duzMetin([
      `Merhaba ${ad},`, '',
      `${site.ad} panel hesabınız açıldı.`,
      `E-posta: ${eposta}`, `Geçici parola: ${geciciParola}`, '',
      `Giriş: ${abs('/giris')}`, '',
      'İlk girişten sonra parolanızı değiştirin.',
    ]),
  };
}

export function parolaSifirlandi(ad: string, geciciParola: string): Sablon {
  return {
    konu: `${site.ad} parolanız sıfırlandı`,
    html: kabuk(
      'Parolanız sıfırlandı',
      p(`Merhaba ${ad},`)
      + p('Yönetici hesabınızın parolasını sıfırladı. Açık oturumlarınız sonlandırıldı.')
      + kutu([['Yeni geçici parola', `<code style="font-family:ui-monospace,Menlo,monospace;font-size:15px;">${geciciParola}</code>`]])
      + p('Bu işlemi siz talep etmediyseniz hemen bizimle iletişime geçin.'),
      { metin: 'Giriş yap', yol: '/giris' },
    ),
    metin: duzMetin([
      `Merhaba ${ad},`, '',
      `Parolanız sıfırlandı. Yeni geçici parola: ${geciciParola}`,
      `Giriş: ${abs('/giris')}`,
    ]),
  };
}

/* ============================================================
   KVKK
   ============================================================ */

/**
 * KVKK talebi doğrulama bağlantısı.
 *
 * İçinde HİÇBİR KİŞİSEL VERİ YOK — ne ad, ne talep bilgisi. Yanlış
 * adrese gitmiş olabilir; posta kutusuna düşen bir e-postanın kendisi
 * veri sızıntısı olmamalı. Adres kayıtlı değilse de bu posta
 * gönderiliyor, çünkü aksi hâlde e-postanın gelmemesi "bu adres
 * sistemde yok" bilgisini sızdırırdı.
 */
export function kvkkDogrulama(tip: 'ERISIM' | 'SILME', jeton: string): Sablon {
  const silme = tip === 'SILME';
  const baslik = silme ? 'Veri silme talebiniz' : 'Veri erişim talebiniz';
  const yol = `/veri-talebi/dogrula?jeton=${jeton}`;

  return {
    konu: `${baslik} — doğrulama gerekiyor`,
    html: kabuk(
      baslik,
      p('Merhaba,')
      + p(silme
        ? `${site.ad}’da bu e-posta adresine bağlı kişisel verilerin <b>silinmesi</b> için bir talep alındı.`
        : `${site.ad}’da bu e-posta adresine bağlı kişisel verilerin <b>gösterilmesi</b> için bir talep alındı.`)
      + p('Talebin size ait olduğunu doğrulamak için aşağıdaki bağlantıya tıklayın. Bağlantı <b>48 saat</b> geçerli.')
      + p('<b>Bu talebi siz oluşturmadıysanız hiçbir şey yapmanıza gerek yok.</b> Doğrulanmayan talep işleme alınmaz ve kendiliğinden düşer.'),
      { metin: silme ? 'Silme talebimi doğrula' : 'Verilerimi görüntüle', yol },
    ),
    metin: duzMetin([
      'Merhaba,', '',
      silme
        ? `${site.ad}'da bu adrese bağlı kişisel verilerin silinmesi için talep alındı.`
        : `${site.ad}'da bu adrese bağlı kişisel verilerin gösterilmesi için talep alındı.`,
      '',
      'Doğrulamak için (48 saat geçerli):', abs(yol), '',
      'Bu talebi siz oluşturmadıysanız bir şey yapmanıza gerek yok.',
    ]),
  };
}

/* ============================================================
   Firma başvurusu
   ============================================================ */

/**
 * Ekibe: yeni firma başvurusu.
 *
 * Başvuranın telefonu GÖVDEDE — ekip e-postadan çıkıp panele girmeden
 * arayabilsin. Süreç telefonla ilerliyor.
 */
export function basvuruAlindi(
  ad: string, telefon: string, eposta: string, firmaAd: string,
  bolge: string, projeSayisi: number, mesaj: string | null,
): Sablon {
  return {
    konu: `Yeni firma başvurusu — ${firmaAd}`,
    html: kabuk(
      'Yeni firma başvurusu',
      kutu([
        ['Firma', firmaAd],
        ['Yetkili', ad],
        ['Telefon', telefon],
        ['E-posta', eposta],
        ['Bölge', bolge],
        ['Proje sayısı', String(projeSayisi)],
      ])
      + (mesaj
        ? `<blockquote style="margin:16px 0 20px;padding:14px 18px;background:#FBF9F6;border-left:3px solid ${R.ana};
            font-size:15px;line-height:1.6;color:${R.murekkep2};border-radius:0 8px 8px 0;">${mesaj}</blockquote>`
        : '')
      + p('Form <b>2 iş günü içinde telefonla dönüş</b> sözü veriyor.'),
      { metin: 'Panelde aç', yol: '/yonetim/basvurular' },
    ),
    metin: duzMetin([
      'Yeni firma başvurusu', '',
      `Firma: ${firmaAd}`, `Yetkili: ${ad}`, `Telefon: ${telefon}`, `E-posta: ${eposta}`,
      `Bölge: ${bolge}`, `Proje sayısı: ${projeSayisi}`,
      ...(mesaj ? ['', `Mesaj: ${mesaj}`] : []),
      '', `Panel: ${abs('/yonetim/basvurular')}`,
    ]),
  };
}

export function basvuruOnaylandi(ad: string): Sablon {
  return {
    konu: `Başvurunuz onaylandı — ${site.ad}`,
    html: kabuk(
      'Aramıza hoş geldiniz',
      p(`Merhaba ${ad},`)
      + p(`${site.ad} firma kaydınız açıldı. Bundan sonraki adım projeyi yerinde görmek: ekibimiz şantiye ziyareti için sizi arayacak.`)
      + p('<b>Görselleri ve kat planlarını panelden siz yüklüyorsunuz</b>; ekibimiz yerinde inceleme raporunu hazırlıyor ve ikisi birlikte yayına giriyor.')
      + p('Panel erişimi bu e-postanın ardından tanımlanıyor; proje, daire tipi ve fiyatları oradan yönetiyorsunuz.'),
      { metin: 'Nasıl çalıştığını okuyun', yol: '/firma-basvuru' },
    ),
    metin: duzMetin([
      `Merhaba ${ad},`, '',
      `${site.ad} firma kaydınız açıldı. Ekibimiz yerinde inceleme için arayacak.`, '',
      abs('/firma-basvuru'),
    ]),
  };
}

/**
 * Başvurana: reddedildi.
 *
 * GEREKÇE GÖVDEDE. Sebebini söylemeden reddetmek, kişiyi neyi
 * düzelteceğini bilmeden bırakıyor; koşullar değişince yeniden
 * başvurabileceği de yazılı.
 */
export function basvuruReddedildi(ad: string, gerekce: string): Sablon {
  return {
    konu: `Başvurunuz hakkında — ${site.ad}`,
    html: kabuk(
      'Başvurunuz sonuçlandı',
      p(`Merhaba ${ad},`)
      + p(`${site.ad} firma başvurunuzu şu an için değerlendiremedik:`)
      + `<blockquote style="margin:0 0 20px;padding:14px 18px;background:#FBF9F6;border-left:3px solid ${R.ana};
        font-size:15px;line-height:1.6;color:${R.murekkep2};border-radius:0 8px 8px 0;">${gerekce}</blockquote>`
      + p('Koşullar değiştiğinde yeniden başvurabilirsiniz. İlginiz için teşekkür ederiz.'),
    ),
    metin: duzMetin([
      `Merhaba ${ad},`, '',
      `${site.ad} firma başvurunuzu şu an için değerlendiremedik:`, '',
      gerekce, '',
      'Koşullar değiştiğinde yeniden başvurabilirsiniz.',
    ]),
  };
}

/* ============================================================
   Fiyat alarmı
   ============================================================ */

export function alarmDogrulama(projeAdi: string, hedef: number, jeton: string): Sablon {
  /* Hedef 0 → kişi fiyat düşüşü değil "satışa çıktı" haberi istiyor.
     Lansman öncesi projelerde alarmın asıl kullanımı bu ve sıfırı
     "₺0 altına düşünce" diye yazmak anlamsızdı. */
  const satisaCikis = hedef <= 0;
  return {
    konu: `Fiyat alarmınızı onaylayın — ${projeAdi}`,
    html: kabuk(
      'Son bir adım kaldı',
      p(satisaCikis
        ? `<b>${projeAdi}</b> için takip kurdunuz. Proje satışa çıktığında haber vereceğiz.`
        : `<b>${projeAdi}</b> için fiyat alarmı kurdunuz. Başlangıç fiyatı `
          + `<b>${TLkisa(hedef)}</b> altına düştüğünde haber vereceğiz.`)
      + p('Alarmı etkinleştirmek için aşağıdaki düğmeye tıklayın. '
        + 'Bu isteği siz yapmadıysanız hiçbir şey yapmanıza gerek yok — '
        + '<b>onaylamadan hiçbir e-posta göndermiyoruz</b>.'),
      { metin: 'Alarmı etkinleştir', yol: `/alarm/${jeton}?islem=onayla` },
    ),
    metin: duzMetin([
      'Fiyat alarmınızı onaylayın', '',
      `Proje: ${projeAdi}`,
      satisaCikis ? 'Satışa çıktığında haber verilecek.' : `Hedef fiyat: ${TLkisa(hedef)}`, '',
      `Etkinleştirin: ${abs(`/alarm/${jeton}?islem=onayla`)}`, '',
      'Bu isteği siz yapmadıysanız görmezden gelin; onaylamadan e-posta göndermiyoruz.',
    ]),
  };
}

/** Takipçiye: fiyat düştü. */
export function alarmDusus(
  projeAdi: string, projeSlug: string, eskiFiyat: number, yeniFiyat: number,
  hedef: number, jeton: string,
): Sablon {
  const fark = eskiFiyat - yeniFiyat;
  const oran = eskiFiyat > 0 ? Math.round((fark / eskiFiyat) * 100) : 0;
  return {
    konu: `Fiyat düştü — ${projeAdi} artık ${TLkisa(yeniFiyat)}`,
    html: kabuk(
      'İzlediğiniz projenin fiyatı düştü',
      p(`<b>${projeAdi}</b> başlangıç fiyatı <b>${TLkisa(yeniFiyat)}</b> oldu.`)
      + kutu([
        ['Alarm kurduğunuzdaki fiyat', TL(eskiFiyat)],
        ['Şimdiki fiyat', TL(yeniFiyat)],
        ['Fark', `${TL(fark)} · %${oran} indirim`],
        ['Hedefiniz', TL(hedef)],
      ])
      + p('Proje fiyatları stok ve inşaat aşamasına göre değişiyor; '
        + 'güncel daire tiplerini ve kalan adetleri proje sayfasından görebilirsiniz.'),
      { metin: 'Projeyi görüntüle', yol: `/proje/${projeSlug}` },
    ),
    metin: duzMetin([
      'İzlediğiniz projenin fiyatı düştü', '',
      `${projeAdi}`,
      `Önceki: ${TL(eskiFiyat)} → Şimdi: ${TL(yeniFiyat)} (%${oran} indirim)`,
      `Hedefiniz: ${TL(hedef)}`, '',
      `Proje: ${abs(`/proje/${projeSlug}`)}`, '',
      `Alarmı kaldır: ${abs(`/alarm/${jeton}?islem=iptal`)}`,
    ]),
  };
}

/** Takipçiye: "yakında" projesi satışa çıktı. */
export function alarmSatista(
  projeAdi: string, projeSlug: string, fiyatMin: number, jeton: string,
): Sablon {
  return {
    konu: `Satışa çıktı — ${projeAdi}`,
    html: kabuk(
      'İzlediğiniz proje satışa çıktı',
      p(`<b>${projeAdi}</b> satışa açıldı. Başlangıç fiyatı <b>${TLkisa(fiyatMin)}</b>.`)
      + p('Lansman döneminde daire tipi seçenekleri en geniş hâlinde; '
        + 'kat ve cephe tercihi bu aşamada yapılabiliyor.'),
      { metin: 'Daire tiplerini gör', yol: `/proje/${projeSlug}` },
    ),
    metin: duzMetin([
      `${projeAdi} satışa çıktı.`,
      `Başlangıç fiyatı: ${TLkisa(fiyatMin)}`, '',
      `Proje: ${abs(`/proje/${projeSlug}`)}`, '',
      `Alarmı kaldır: ${abs(`/alarm/${jeton}?islem=iptal`)}`,
    ]),
  };
}
