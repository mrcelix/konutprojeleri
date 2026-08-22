import 'server-only';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { ANAHTAR_KALIBI, type DepoSurucu } from './index';

/* ============================================================
   Yerel disk sürücüsü — yalnızca geliştirme.

   `web/.yukleme/` altına yazıyor, `/api/gorsel/...` üzerinden servis
   ediliyor. Vercel'de dosya sistemi salt okunur olduğu için üretimde
   kullanılamaz; `depoEksigi()` bunu söylüyor.
   ============================================================ */

export const YEREL_KOK = resolve(process.cwd(), '.yukleme');

function tamYol(anahtar: string): string {
  /* Anahtar biçimi burada da doğrulanıyor. Çağıranın doğruladığına
     güvenmek, tek bir yeni çağrı noktasında yol geçişi açığı demek. */
  if (!ANAHTAR_KALIBI.test(anahtar)) throw new Error('Geçersiz depo anahtarı');
  const yol = join(YEREL_KOK, anahtar);
  // Kalıp zaten `..` geçirmiyor; bu ikinci kilit, kalıp gevşetilirse diye
  if (!yol.startsWith(YEREL_KOK)) throw new Error('Geçersiz depo anahtarı');
  return yol;
}

export function yerelSurucu(): DepoSurucu {
  return {
    ad: 'yerel',

    async yaz(anahtar, veri) {
      const yol = tamYol(anahtar);
      await mkdir(dirname(yol), { recursive: true });
      await writeFile(yol, veri);
    },

    async sil(anahtar) {
      // Dosya yoksa sorun değil: satır silinmeli, kayıp dosya engel olmamalı
      await unlink(tamYol(anahtar)).catch(() => {});
    },

    url(anahtar) {
      return `/api/gorsel/${anahtar}`;
    },
  };
}

export { tamYol as yerelTamYol };
