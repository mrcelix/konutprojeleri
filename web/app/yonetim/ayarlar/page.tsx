import PanelKabuk from '@/components/panel/PanelKabuk';
import AyarFormu from '@/components/panel/AyarFormu';
import { prisma } from '@/lib/db';
import { yonetimBaglam } from '@/lib/panel-baglam';
import { ayariVarsayilan } from '@/lib/site-ayar';

/* ============================================================
   Site bilgileri.

   Telefon, WhatsApp, e-posta, adres, belge numaraları ve sosyal
   hesaplar koda gömülüydü: numarayı değiştirmek dağıtım demekti.
   Buradaki dolu alanlar koddaki varsayılanların üzerine yazıyor,
   boş bırakılan alan varsayılana dönüyor.

   Değerler altbilgide, iletişim satırlarında, WhatsApp bağlantısında
   ve arama motoruna giden kurum şemasında (JSON-LD) kullanılıyor.
   ============================================================ */

export const dynamic = 'force-dynamic';

export default async function YonetimAyarlar() {
  const b = await yonetimBaglam();
  const kayit = await prisma.siteAyar.findUnique({ where: { id: 1 } });
  const v = ayariVarsayilan();
  const d = (x: string | null | undefined) => x ?? '';

  const gruplar = [
    {
      baslik: 'Kimlik',
      alanlar: [
        { ad: 'unvan', etiket: 'Ticari unvan', deger: d(kayit?.unvan), varsayilan: v.unvan },
        { ad: 'slogan', etiket: 'Slogan', deger: d(kayit?.slogan), varsayilan: v.slogan },
        {
          ad: 'aciklama',
          etiket: 'Kurum açıklaması',
          deger: d(kayit?.aciklama),
          varsayilan: v.aciklama,
          cok: true,
          ipucu: 'Arama motoruna giden kurum şemasında ve paylaşım kartlarında kullanılıyor.',
        },
      ],
    },
    {
      baslik: 'İletişim',
      alanlar: [
        { ad: 'telefon', etiket: 'Telefon', deger: d(kayit?.telefon), varsayilan: v.telefon },
        {
          ad: 'whatsapp',
          etiket: 'WhatsApp numarası',
          deger: d(kayit?.whatsapp),
          varsayilan: v.whatsapp,
          ipucu: 'Yalnızca rakam, ülke koduyla ve işaretsiz: 905XXXXXXXXX',
        },
        { ad: 'eposta', etiket: 'E-posta', deger: d(kayit?.eposta), varsayilan: v.eposta },
      ],
    },
    {
      baslik: 'Adres',
      alanlar: [
        { ad: 'adresSokak', etiket: 'Cadde / sokak', deger: d(kayit?.adresSokak), varsayilan: v.adres.sokak },
        { ad: 'adresIlce', etiket: 'İlçe', deger: d(kayit?.adresIlce), varsayilan: v.adres.ilce },
        { ad: 'adresIl', etiket: 'İl', deger: d(kayit?.adresIl), varsayilan: v.adres.il },
        { ad: 'adresPosta', etiket: 'Posta kodu', deger: d(kayit?.adresPosta), varsayilan: v.adres.postaKodu },
      ],
    },
    {
      baslik: 'Belgeler',
      alanlar: [
        {
          ad: 'tursab',
          etiket: 'TÜRSAB belge no',
          deger: d(kayit?.tursab),
          varsayilan: v.belge.tursab,
          ipucu: 'Boş bırakılan belge satırı altbilgide hiç basılmıyor.',
        },
        { ad: 'bakanlik', etiket: 'Bakanlık belge no', deger: d(kayit?.bakanlik), varsayilan: v.belge.bakanlik },
        { ad: 'etbis', etiket: 'ETBİS kayıt no', deger: d(kayit?.etbis), varsayilan: v.belge.etbis },
        { ad: 'mersis', etiket: 'MERSİS no', deger: d(kayit?.mersis), varsayilan: v.belge.mersis },
      ],
    },
    {
      baslik: 'Sosyal hesaplar',
      alanlar: [
        {
          ad: 'sosyal',
          etiket: 'Adresler',
          deger: (kayit?.sosyal ?? []).join('\n'),
          varsayilan: v.sosyal.join(' , '),
          cok: true,
          ipucu: 'Her satıra bir tam adres (https:// ile). Kurum şemasında da yayınlanıyor.',
        },
      ],
    },
  ];

  return (
    <PanelKabuk
      kullanici={b.kullanici} nav={b.nav} kok={b.kok}
      baslik="Site bilgileri"
      aciklama="Altbilgi, iletişim satırları, WhatsApp bağlantısı ve arama motoruna giden kurum bilgisi buradan besleniyor."
    >
      <AyarFormu gruplar={gruplar} />
    </PanelKabuk>
  );
}
