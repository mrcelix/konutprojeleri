import type { IkonAdi } from '@/lib/types';

const PATHS: Record<IkonAdi, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>',
  star: '<path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8z" fill="currentColor" stroke="none"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6"/><path d="M17 5.5a3 3 0 0 1 0 5.6M18.5 20c0-2.4-.9-4-2.2-5"/>',
  bed: '<path d="M2 18v-6h20v6M2 12V7M22 12v6M6 12V9.5A1.5 1.5 0 0 1 7.5 8h9A1.5 1.5 0 0 1 18 9.5V12M2 18v2M22 18v2"/>',
  bath: '<path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 12V6.5A2.5 2.5 0 0 1 10.5 5"/><path d="M6 19l-1 2M18 19l1 2"/>',
  ruler: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  waves: '<path d="M2 7c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  flame: '<path d="M12 2.5c.6 3 3.5 4 4.6 6.6A6 6 0 1 1 6 12.6c0-1.6.7-2.7 1.6-3.6.3 1 1 1.7 1.8 1.9-.5-3.3.9-6.4 2.6-8.4z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.4 8.2-8 9.4C7.4 20.2 4 17 4 12V6z"/><path d="M9.4 12.2l1.9 1.9 3.4-3.6"/>',
  droplet: '<path d="M12 3.2s6 6.4 6 10a6 6 0 0 1-12 0c0-3.6 6-10 6-10z"/>',
  baby: '<circle cx="12" cy="11" r="7.5"/><path d="M9.5 10h.01M14.5 10h.01M9.5 14c1.6 1.3 3.4 1.3 5 0"/>',
  paw: '<ellipse cx="7" cy="9" rx="1.9" ry="2.4"/><ellipse cx="12" cy="7" rx="1.9" ry="2.4"/><ellipse cx="17" cy="9" rx="1.9" ry="2.4"/><path d="M12 12.5c3 0 5 2 5 4.2 0 1.8-1.6 2.8-3 2.3-1.3-.5-2.7-.5-4 0-1.4.5-3-.5-3-2.3 0-2.2 2-4.2 5-4.2z"/>',
  heart: '<path d="M12 20.3S3.5 15.4 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6c0 5.8-8.5 10.7-8.5 10.7z"/>',
  steam: '<path d="M4 20h16"/><path d="M8 16c0-2 2-2.6 2-4.5S8 9 8 7M12 16c0-2 2-2.6 2-4.5S12 9 12 7M16 16c0-2 2-2.6 2-4.5S16 9 16 7"/>',
  access: '<circle cx="12" cy="4.6" r="1.8"/><path d="M8 8.5l4 1.2 4-1.2M12 9.7V14h3.5l2 5M12 14H9l-2 5"/>',
  wifi: '<path d="M2.5 9a15 15 0 0 1 19 0M6 12.6a10 10 0 0 1 12 0M9.5 16.2a5 5 0 0 1 5 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>',
  snow: '<path d="M12 2v20M4.2 6.5l15.6 9M19.8 6.5l-15.6 9M12 6l-2.5-2M12 6l2.5-2M12 18l-2.5 2M12 18l2.5 2"/>',
  grill: '<path d="M4 5h16l-2.6 7H6.6z"/><path d="M8 12l-2 8M16 12l2 8M9 17h6"/>',
  car: '<path d="M4 16v-3.2L5.8 8A2 2 0 0 1 7.7 6.6h8.6A2 2 0 0 1 18.2 8L20 12.8V16"/><path d="M3 16h18v2.5h-3V16H6v2.5H3z"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/>',
  wash: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><circle cx="12" cy="13.5" r="4"/><path d="M8 6.5h.01M11 6.5h.01"/>',
  dish: '<path d="M4 13h16a8 8 0 0 1-16 0z"/><path d="M3 20h18M12 13V8a2 2 0 1 1 2-2"/>',
  tv: '<rect x="2.5" y="5" width="19" height="12.5" rx="2"/><path d="M8 21h8M12 17.5V21"/>',
  coffee: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.6a2.4 2.4 0 0 1 0 4.8H17M6 4.5V3M10 4.5V3M14 4.5V3"/>',
  game: '<rect x="2.5" y="7.5" width="19" height="10" rx="4"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.6" r=".9" fill="currentColor"/><circle cx="18.2" cy="13.8" r=".9" fill="currentColor"/>',
  cam: '<path d="M3 8.5l14-3.2 1.2 4.6L4.2 13z"/><path d="M6 12.6V17a2 2 0 0 0 2 2h1M18.4 10.3L22 9"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  chevD: '<path d="M6 9l6 6 6-6"/>',
  chevU: '<path d="M6 15l6-6 6 6"/>',
  arrowR: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-13.9-5.4L3 8.5"/><path d="M3 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 13.9 5.4L21 15.5"/><path d="M21 20v-4.5h-4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  share: '<path d="M12 15V3M8 6.5L12 3l4 3.5"/><path d="M4 13v6.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V13"/>',
  grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  map: '<path d="M9 3.5L3 6v14.5l6-2.5 6 2.5 6-2.5V3.5L15 6z"/><path d="M9 3.5V18M15 6v14.5"/>',
  scale: '<path d="M12 4v16M7 8H3l2-4 2 4zM3 8a2 2 0 0 0 4 0M21 8h-4l2-4 2 4zM17 8a2 2 0 0 0 4 0M8 20h8"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16.5 6.5l2 2M14 9l2 2"/>',
  spark: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.4l3.4 2"/>',
  home: '<path d="M3.5 10.5L12 3.5l8.5 7"/><path d="M5.5 9.6V20h13V9.6"/><path d="M9.8 20v-5.6h4.4V20"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  pool: '<path d="M2 18c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0"/><path d="M2 21.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0"/><path d="M7 15V5.5A2.5 2.5 0 0 1 12 5M17 15V5.5A2.5 2.5 0 0 0 12 5"/><path d="M7 9h10M7 12.5h10"/>',
  kapali: '<path d="M3 10.5L12 4l9 6.5"/><path d="M5 10v9h14v-9"/><path d="M7 16c1.4-1.3 2.8-1.3 4.2 0s2.8 1.3 4.2 0"/>',
  manzara: '<path d="M2 16c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0"/><path d="M3 12l4.5-5.5L11 11l3-3.5L21 12"/><circle cx="17" cy="5.5" r="1.8"/>',
  agac: '<path d="M12 21v-4.5"/><path d="M12 16.5a5 5 0 0 0 5-5 5 5 0 0 0-1.6-3.6A4.4 4.4 0 0 0 12 3a4.4 4.4 0 0 0-3.4 4.9A5 5 0 0 0 7 11.5a5 5 0 0 0 5 5z"/>',
  magaza: '<path d="M4 9h16v11H4z"/><path d="M3 9l1.5-5h15L21 9"/><path d="M9.5 20v-6h5v6"/>',
  mic: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/><path d="M8.5 21h7"/>',
  perde: '<path d="M3 4h18"/><path d="M6 4v16c3.5-1.4 3.5-6.6 3.5-8S9.5 5.4 6 4z"/><path d="M18 4v16c-3.5-1.4-3.5-6.6-3.5-8S14.5 5.4 18 4z"/>',
  /* Proje alanına özgü ikonlar. */
  building: '<path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21"/><path d="M14 10h4.5A1.5 1.5 0 0 1 20 11.5V21"/><path d="M2.5 21h19"/><path d="M7 8h.01M11 8h.01M7 12h.01M11 12h.01M7 16h.01M11 16h.01M17 14h.01M17 17.5h.01"/>',
  crane: '<path d="M4 21h6M7 21V6"/><path d="M7 6h13l-2.5 3.5"/><path d="M7 6L4.5 9.5"/><path d="M14 6v4.5"/><path d="M12.5 10.5h3l-1.5 3z"/>',
  plan: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 11h8M11 4v16M11 15h10"/>',
  deed: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none"/><path d="M6 6V4.5A1.5 1.5 0 0 1 7.7 3l9 1.6"/>',
  percent: '<path d="M6 18L18 6"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z"/>',
};

export default function Icon({ n, s = 18, sw = 1.7 }: { n: IkonAdi; s?: number; sw?: number }) {
  return (
    <svg
      width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[n] }}
    />
  );
}
