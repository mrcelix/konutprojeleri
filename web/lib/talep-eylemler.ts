'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import {
  talepOlustur,
  type OdemeSekli,
  type TalepNiyeti,
  type TalepSonucu,
} from './talep';
import { yeniTalepBildirimi } from './bildirim/baglayici';
import { istekIp, sinirKontrol } from './hiz-sinir';

/* ============================================================
   Satış talebi — herkese açık yazma eylemi.

   Giriş gerektirmiyor: projeye bakan kişiyi numarasını bırakmadan
   önce kayıt ekranıyla karşılamak, formun kendisini anlamsız
   kılardı.

   Hız sınırı bu yüzden şart: kimlik doğrulaması olmayan bir yazma
   ucu, sınırsız bırakılırsa satış ekibinin gerçek talepleri
   göremediği bir kuyruğa dönüşüyor.
   ============================================================ */

const NIYETLER: readonly TalepNiyeti[] = ['BILGI', 'FIYAT_LISTESI', 'KATALOG', 'RANDEVU'];
const ODEMELER: readonly OdemeSekli[] = ['BELIRTILMEDI', 'PESIN', 'KREDI', 'TAKSIT', 'TAKAS'];

/** Formdan gelen sayı — boş, bozuk ya da negatifse null. */
function sayi(ham: FormDataEntryValue | null): number | null {
  const s = String(ham ?? '').replace(/[^\d]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

export async function talepGonder(
  _onceki: TalepSonucu | null,
  form: FormData,
): Promise<TalepSonucu> {
  const ip = await istekIp();
  const sinir = await sinirKontrol('talep', ip);
  if (!sinir.izin) return { tamam: false, hata: sinir.mesaj };

  const projeSlug = String(form.get('proje') ?? '').trim();
  let projeId: string | null = null;
  if (projeSlug) {
    const p = await prisma.proje.findUnique({ where: { slug: projeSlug }, select: { id: true } });
    projeId = p?.id ?? null;
  }

  const daireTipiId = String(form.get('daireTipi') ?? '').trim() || null;

  /* Niyet ve ödeme şekli formdan geliyor ama İSTEMCİYE GÜVENİLMİYOR:
     bilinmeyen bir değer varsayılana düşüyor, satış ekibi yanlışlıkla
     randevu hazırlığı yapmıyor. */
  const hamNiyet = String(form.get('niyet') ?? '') as TalepNiyeti;
  const niyet: TalepNiyeti = NIYETLER.includes(hamNiyet) ? hamNiyet : 'BILGI';

  const hamOdeme = String(form.get('odemeSekli') ?? '') as OdemeSekli;
  const odemeSekli: OdemeSekli = ODEMELER.includes(hamOdeme) ? hamOdeme : 'BELIRTILMEDI';

  const h = await headers();
  const sonuc = await talepOlustur({
    projeId,
    daireTipiId,
    ad: String(form.get('ad') ?? ''),
    telefon: String(form.get('telefon') ?? ''),
    eposta: String(form.get('eposta') ?? '') || null,
    niyet,
    butceMin: sayi(form.get('butceMin')),
    butceMax: sayi(form.get('butceMax')),
    odemeSekli,
    saat: String(form.get('saat') ?? '') || null,
    not: String(form.get('not') ?? '') || null,
    kaynak: h.get('referer') ?? null,
    /* Onay kutusu işaretliyse tarayıcı "on" gönderiyor; işaretli
       değilse alan hiç gelmiyor. Varlığına bakmak yeterli. */
    kvkkOnay: form.get('kvkkOnay') != null,
    ip,
  });

  /* Bildirim YALNIZCA yeni kayıtta: mükerrer talep yutulduğunda
     `id` gelmiyor ve satış ekibi aynı kişi için ikinci e-postayı
     almıyor. Hata ziyaretçiye YANSIMIYOR — talep zaten yazıldı,
     sağlayıcı arızasını "gönderilemedi" diye göstermek yazılmış bir
     kaydı yazılmamış gibi sunardı. */
  if (sonuc.id) {
    try { await yeniTalepBildirimi(sonuc.id); } catch { /* yutuluyor */ }
  }

  if (sonuc.tamam) revalidatePath('/yonetim/talepler');
  return sonuc;
}
