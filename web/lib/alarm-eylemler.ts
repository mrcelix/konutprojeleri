'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { alarmKur } from './fiyat-alarmi';
import { alarmDogrulamaBildirimi } from './bildirim/baglayici';
import { istekIp, sinirKontrol } from './hiz-sinir';

/* ============================================================
   Fiyat alarmı / proje takibi — herkese açık yazma eylemi.

   Giriş gerektirmiyor: takip kurmak için hesap açtırmak, özelliğin
   tek amacını (ilgiyi kaybetmeden yakalamak) baltalardı.

   ÇİFT ONAY: doğrulama postası gönderiliyor, kişi tıklamadan tek bir
   bildirim bile çıkmıyor. Başkasının adresini forma yazan biri bizi
   istenmeyen posta göndericisi yapamasın.
   ============================================================ */

export interface EylemSonucu {
  tamam?: boolean;
  hata?: string;
  bilgi?: string;
  /** Adres zaten doğrulanmışsa yeni posta gönderilmiyor. */
  zatenOnayli?: boolean;
}

export async function fiyatAlarmiKur(
  _onceki: EylemSonucu | null,
  form: FormData,
): Promise<EylemSonucu> {
  const sinir = await sinirKontrol('alarm', await istekIp());
  if (!sinir.izin) return { hata: sinir.mesaj };

  const slug = String(form.get('proje') ?? '').trim();
  const proje = await prisma.proje.findUnique({
    where: { slug }, select: { id: true, ad: true },
  });
  if (!proje) return { hata: 'Proje bulunamadı.' };

  const eposta = String(form.get('eposta') ?? '');
  /* Hedef BOŞ BIRAKILABİLİR: lansman öncesi projede kişi fiyat
     düşüşünü değil "satışa çıktı" haberini istiyor ve o durumda
     hedef sıfır (bkz. lib/fiyat-alarmi.ts). */
  const hedef = Number(String(form.get('hedef') ?? '').replace(/[^\d]/g, '')) || 0;

  const sonuc = await alarmKur(proje.id, eposta, hedef);
  if (!sonuc.tamam) return { hata: sonuc.hata };

  if (sonuc.zatenOnayli) {
    return {
      tamam: true, zatenOnayli: true,
      bilgi: 'Yeni hedefiniz kaydedildi. Adresiniz zaten doğrulanmıştı, yeni bir onay postası göndermedik.',
    };
  }

  /* Gönderim `baglayici` üzerinden: bildirimin ne zaman gideceği tek
     dosyada toplu dursun. Hata orada yutuluyor — alarm satırı zaten
     yazıldı. */
  if (sonuc.alarmId) await alarmDogrulamaBildirimi(sonuc.alarmId);

  revalidatePath('/yonetim/alarmlar');
  return { tamam: true };
}
