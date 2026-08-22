import Icon from './Icon';
import type { IkonAdi } from '@/lib/types';

/* ============================================================
   Hero'nun altındaki güven şeridi.

   Aynı vaatler üst çubukta da akıyor ama orası 11 piksellik gri bir
   satır: göz oraya gitmiyor. Şerit hero fotoğrafının ALT KENARINDA,
   villa detayındaki cam kutuyla (`.g-cam`) aynı dilde — arkasındaki
   fotoğraf bulanıklaşıyor, yazı altın.

   Cam ancak ARKASINDA BİR ŞEY VARSA cam gibi duruyor; bu yüzden
   şerit hero'nun altına ayrı bir bant olarak değil, fotoğrafın son
   şeridine oturuyor. Dar ekranda fotoğraf 200 pikselik bir bant ve
   metin onun altında — orada şeridin arkasında beyaz zemin kalıyor,
   bu yüzden cam yerine koyu bir hap oluyor (bkz. `globals.css`).

   İki kopya basılıyor: kesintisiz akış için şerit kendi
   genişliğinin yarısı kadar kayıyor. İkinci kopya ekran okuyucuya
   kapalı, yoksa bütün vaatler iki kez okunurdu.
   ============================================================ */

/** Vaadin başındaki simge — hepsi aynı olursa şerit tek tip okunuyor. */
const SIMGE: IkonAdi[] = ['shield', 'check', 'spark', 'key', 'heart', 'star'];

export default function GuvenSeridi({ maddeler }: { maddeler: string[] }) {
  if (maddeler.length === 0) return null;

  const oge = (g: string, i: number) => (
    <span className="gs-oge" key={`${g}-${i}`}>
      <Icon n={SIMGE[i % SIMGE.length]} s={14} sw={2.2} />
      <b>{g}</b>
    </span>
  );

  return (
    <div className="gs">
      <div className="gs-cam">
        <div className="gs-ray">
          {maddeler.map(oge)}
          <span className="gs-kopya" aria-hidden="true">
            {maddeler.map(oge)}
          </span>
        </div>
      </div>
    </div>
  );
}
