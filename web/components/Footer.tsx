import Link from 'next/link';
import type { RotaDili } from '@/lib/i18n';
import Icon from './Icon';
import { metinler } from '@/lib/icerik';
import { getBolgeler, getLandingKombinasyonlari, getLandingOzellikler } from '@/lib/queries';
import { site } from '@/lib/site';
import { siteBilgi } from '@/lib/site-ayar';

/* Footer aynı zamanda site genelinde iç bağlantı ağını besler (SEO). */
export default async function Footer({ dil = 'tr' }: { dil?: RotaDili }) {
  /* Kurum bilgileri panelden yönetiliyor; koddaki değerler
     varsayılan (bkz. lib/site-ayar.ts). */
  const bilgi = await siteBilgi();
  const en = dil === 'en';
  const [tumBolgeler, tumOzellikler, m, kombinasyonlar] = await Promise.all([
    getBolgeler(), getLandingOzellikler(), metinler(dil), getLandingKombinasyonlari(),
  ]);
  const bolgeler = tumBolgeler.slice(0, 6);

  /* "Proje özellikleri" sütunu her özelliği tek bir bölgeyle
     eşliyordu; o bölgede o özellik yoksa iniş sayfası üretilmiyor ve
     bağlantı 404 veriyordu. Her özellik için gerçekten sonuç veren
     ilk bölge seçiliyor. */
  const temaBolgesi = new Map<string, string>();
  for (const k of kombinasyonlar) {
    if (!temaBolgesi.has(k.ozellik)) temaBolgesi.set(k.ozellik, k.bolge);
  }
  const ozellikler = tumOzellikler.filter((o) => temaBolgesi.has(o.slug)).slice(0, 6);

  return (
    <footer className="footer">
      <div className="wrap">
        {/* Firma kutusu EN ÜSTTE ve tam genişlikte. Arz tarafının
            kazanımı ziyaretçi hunisinden ayrı bir iş: bülten formuyla
            yan yana dururken ikisi de zayıflıyor, otuz bağlantının
            arasında bir satır olarak ise tümden kayboluyordu.

            Giriş AYNI kapıdan: `/giris`. Yönetici bir kullanıcıya
            FIRMA rolü verdiğinde o kişi `/panel` altında yalnızca
            kendi projelerini görüyor — ayrı bir giriş sayfası ikinci
            bir kimlik doğrulama yüzeyi açardı. */}
        <div className="footer-sahip">
          <div>
            <b>Projenizi KonutProjeleri&apos;nde yayınlayın</b>
            <p>
              Şantiye görsellerini ekibimiz çekiyor, fiyat ve daire
              tiplerini siz yönetiyorsunuz. Gelen talepler doğrudan
              satış ekibinize düşüyor.
            </p>
          </div>
          <div className="footer-sahip-eylem">
            <Link className="btn btn-cta btn-sm" href="/firma-basvuru">
              Projenizi yayınlayın <Icon n="arrowR" s={15} />
            </Link>
            <Link className="btn btn-outline btn-sm" href="/giris">
              <Icon n="key" s={15} /> Firma girişi
            </Link>
          </div>
        </div>

        {/* Alt: solda bülten, sağda bağlantı sütunları */}
        <div className="footer-ust">
          <div className="footer-bulten">
            <Link className="logo" href="/">
                {/* Başlıkla aynı yazım: marka adı küçük harfle. */}
                <span className="logo-a">konut</span><span className="logo-b">projeleri</span><span className="dot">.</span>
            </Link>
            <p style={{ marginTop: 12 }}>{m('altbilgi.tanitim')}</p>
            <form className="footer-bulten-form" action="/bulten">
              <label className="sr" htmlFor="bulten-eposta">E-posta adresiniz</label>
              <input id="bulten-eposta" name="eposta" type="email" placeholder="ornek@eposta.com" />
              <button className="btn btn-primary btn-sm" type="submit">Yeni projelerden haberdar ol</button>
            </form>
            <div className="footer-rozetler">
              <span className="badge"><Icon n="shield" s={13} /> Her proje yerinde incelendi</span>
              <span className="badge badge-instant"><Icon n="check" s={13} /> Fiyat ve kat planı açık</span>
            </div>
          </div>

          <div className="footer-baglantilar">
            <div>
              <h2 className="footer-baslik">Bölgeler</h2>
              {bolgeler.map((b) => (
                <Link key={b.slug} href={`/projeler/${b.slug}`}>{b.ad} projeleri</Link>
              ))}
              <Link href="/bolgeler">Tüm bölgeler</Link>
            </div>
            <div>
              <h2 className="footer-baslik">Proje özellikleri</h2>
              {ozellikler.map((o) => (
                <Link key={o.slug} href={`/projeler/${temaBolgesi.get(o.slug)}/${o.slug}`}>{o.baslik}</Link>
              ))}
            </div>
            {/* On iki bağlantılık tek sütun, yanındaki iki sütunun iki
                katı uzuyor ve altbilgiyi dengesiz gösteriyordu. Konuya
                göre ikiye ayrıldı: alıcı yolculuğu ve kurum. */}
            <div>
              <h2 className="footer-baslik">Alıcılar için</h2>
              <Link href="/arama">Tüm projeler</Link>
              {/* Firmalar ve pano yalnızca başlık menüsündeydi. Altbilgi
                  sitenin dizini: buradan geçmeyen bölüm, menüyü açmayan
                  ziyaretçi için yok demek. */}
              <Link href="/firmalar">Geliştirici firmalar</Link>
              <Link href="/pano">Karşılaştırma panosu</Link>
              <Link href="/favoriler">Favorilerim</Link>
              <Link href="/nasil-calisir">Nasıl çalışır</Link>
              <Link href="/yerinde-inceleme">Yerinde inceleme</Link>
            </div>
            <div>
              <h2 className="footer-baslik">Kurumsal</h2>
              <Link href="/hakkimizda">Hakkımızda</Link>
              <Link href="/rehber">Konut alma rehberi</Link>
              <Link href="/sikca-sorulanlar">Sıkça sorulanlar</Link>
              <Link href="/iletisim">İletişim</Link>
              <Link href="/firma-rehberi">Firmalar için rehber</Link>
              <Link href="/veri-talebi">Veri talebi (KVKK)</Link>
            </div>
          </div>
        </div>

        {/* Belge satırı: rakiplerin hepsinde var, güvenin büyük kısmı
            buradan geliyor. Tanımsız belge hiç basılmıyor — olmayan
            belgeyi varmış gibi göstermek yerine gizlemek doğru.

            Belge, iletişim ve telif ARDIŞIK ÜÇ ŞERİTTİ; üçü de aynı
            ağırlıkta olduğu için altbilgi bitmek bilmiyordu. Şimdi
            tek bir kapalı bandın içinde. */}
        <div className="footer-alt-band">
        {(bilgi.belge.tursab || bilgi.belge.bakanlik || bilgi.belge.etbis || bilgi.belge.mersis) && (
          <div className="footer-belge">
            {bilgi.belge.tursab && <span><Icon n="shield" s={14} /> TÜRSAB üyesi · Belge no {bilgi.belge.tursab}</span>}
            {bilgi.belge.bakanlik && <span><Icon n="check" s={14} /> T.C. Kültür ve Turizm Bakanlığı onaylı · {bilgi.belge.bakanlik}</span>}
            {bilgi.belge.etbis && <span><Icon n="check" s={14} /> ETBİS kayıtlı · {bilgi.belge.etbis}</span>}
            {bilgi.belge.mersis && <span><Icon n="shield" s={14} /> MERSİS {bilgi.belge.mersis}</span>}
          </div>
        )}

        <div className="footer-iletisim">
          <a href={`tel:${bilgi.telefon.replace(/\s/g, '')}`}><Icon n="clock" s={14} /> {bilgi.telefon}</a>
          <a href={`mailto:${bilgi.eposta}`}><Icon n="share" s={14} /> {bilgi.eposta}</a>
          {bilgi.whatsapp && (
            <a href={`https://wa.me/${bilgi.whatsapp}`} target="_blank" rel="noopener noreferrer">
              <Icon n="check" s={14} /> WhatsApp hattı
            </a>
          )}
        </div>

        <div className="footer-bot">
          <span>{m('altbilgi.telif')}</span>
          <span>{m('altbilgi.yasal')}</span>
        </div>
        </div>
      </div>
    </footer>
  );
}
