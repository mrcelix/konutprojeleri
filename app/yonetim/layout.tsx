import type { Metadata } from 'next';

/**
 * Panelin kök yerleşimi.
 *
 * Kabuk burada DEĞİL: giriş sayfası da /yonetim altında ve ona
 * gezinti çubuğu gösterilemez. Kabuk (panel) grup yerleşiminde,
 * yetki kontrolüyle birlikte.
 */

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function YonetimKok({ children }: { children: React.ReactNode }) {
  return children;
}
