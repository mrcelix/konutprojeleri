import type { Metadata } from 'next';
import { site } from '@/lib/site';

/**
 * İngilizce alt ağaç.
 *
 * Kök layout `<html lang="tr">` veriyor; İngilizce sayfalarda bunu
 * değiştirmek gerekiyor ama App Router iç içe layout'ta <html> etiketini
 * yeniden yazmaya izin vermiyor. Çözüm: kök layout'ta lang'i istemci
 * tarafında düzelten bir script yerine, İngilizce sayfaların kendi
 * <html lang> değerini `generateMetadata` üzerinden DEĞİL, kök layout'un
 * okuduğu bir başlıkla ayarlamak.
 *
 * Uygulamada en sade yol: kök layout `headers()` ile yolu okuyup
 * lang'i buna göre veriyor (bkz. app/layout.tsx).
 */
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
};

export default function EnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
