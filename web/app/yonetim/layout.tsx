export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Yönetim',
  robots: { index: false, follow: false },
};

/** Yetki kontrolü her sayfada `yonetimBaglam()` içinde yapılır. */
export default function YonetimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
