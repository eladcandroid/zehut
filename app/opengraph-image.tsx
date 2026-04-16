import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'זהות | מרכז התוכן לפעילים';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Zehut logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://zehut.vercel.app/zehut-logo.png"
          width={280}
          height={210}
          alt=""
        />

        {/* Divider */}
        <div
          style={{
            width: '120px',
            height: '4px',
            background: '#2b7eb5',
            borderRadius: '2px',
            margin: '24px 0',
          }}
        />

        {/* Platform icons row */}
        <div
          style={{
            display: 'flex',
            gap: '20px',
            fontSize: '24px',
            color: '#475569',
            fontWeight: 600,
          }}
        >
          <span>YouTube</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span>Instagram</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span>X</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span>Telegram</span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span>Spotify</span>
        </div>

        {/* URL */}
        <div
          style={{
            fontSize: '18px',
            color: '#94a3b8',
            marginTop: '24px',
          }}
        >
          zehut.vercel.app
        </div>
      </div>
    ),
    { ...size }
  );
}
