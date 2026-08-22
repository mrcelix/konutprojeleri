export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Firma paneli',
  robots: { index: false, follow: false },
};

/** Yetki kontrolü her sayfada `firmaBaglam()` içinde yapılır. */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
