'use client';

import { usePathname } from 'next/navigation';
import Icon from './Icon';
import { site } from '@/lib/site';

/* ============================================================
   WhatsApp hattı.

   Konut alımında ilk temasın önemli bir kısmı WhatsApp'tan geliyor:
   alıcı form doldurmadan önce fiyat ve teslim tarihi soruyor.

   Mesaj SAYFAYA GÖRE ön dolduruluyor. "Merhaba" diye başlayan boş bir
   sohbet, karşı tarafta hangi proje için yazıldığı bilinmeyen bir
   mesaj demek; proje sayfasından yazan kişinin ilk cümlesinde proje
   adı geçiyor.

   Numara tanımlı değilse bileşen hiç basılmıyor — çalışmayan bir
   iletişim düğmesi, hiç olmamasından kötü.
   ============================================================ */

export default function WhatsAppHatti(
  { projeAdi, numara }: { projeAdi?: string; numara?: string },
) {
  const yol = usePathname();
  /* Numara panelden geliyor (`lib/site-ayar.ts`); verilmezse koddaki
     varsayılan. İstemci bileşeni olduğu için veritabanını kendisi
     okuyamıyor, düzen bileşeni çözüp geçiriyor. */
  const hat = numara ?? site.whatsapp;
  if (!hat) return null;

  const mesaj = projeAdi
    ? `Merhaba, ${projeAdi} için fiyat listesi ve teslim tarihi bilgisi alabilir miyim?`
    : yol.startsWith('/projeler/')
      ? 'Merhaba, bu bölgedeki projeler hakkında bilgi alabilir miyim?'
      : `Merhaba, ${site.ad} üzerinden proje arıyorum.`;

  return (
    <a
      className="wa-hat"
      href={`https://wa.me/${hat}?text=${encodeURIComponent(mesaj)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp hattından yazın"
    >
      <span className="wa-ikon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.73 2.64 4.2 3.7.59.25 1.04.4 1.4.52.59.18 1.12.16 1.54.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28z" />
        </svg>
      </span>
      <span className="wa-metin">WhatsApp</span>
    </a>
  );
}
