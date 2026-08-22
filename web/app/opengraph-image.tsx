import { ImageResponse } from 'next/og';
import { site } from '@/lib/site';

export const alt = `${site.ad} — ${site.slogan}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: 72,
          background: 'linear-gradient(135deg, #102A38 0%, #0A5C87 55%, #1B5E3F 165%)',
          color: '#FFFFFF', fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 36, fontWeight: 700 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 58, height: 58, borderRadius: 16, marginRight: 18,
              background: 'rgba(255,255,255,.18)', fontSize: 30, fontWeight: 800,
            }}
          >
            K
          </div>
          <div style={{ display: 'flex' }}>{site.ad}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 78, fontWeight: 800, letterSpacing: -2 }}>Konut, villa ve</div>
          <div style={{ display: 'flex', fontSize: 78, fontWeight: 800, letterSpacing: -2 }}>ofis projeleri.</div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 30, opacity: 0.88 }}>
            Kat planı, daire tipi, teslim tarihi ve fiyat aralığı bir arada
          </div>
        </div>
      </div>
    ),
    size,
  );
}
