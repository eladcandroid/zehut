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
        {/* Logo area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Stylized logo text */}
          <div
            style={{
              fontSize: '120px',
              fontWeight: 900,
              color: '#2b7eb5',
              lineHeight: 1,
              letterSpacing: '-2px',
            }}
          >
            זהות.
          </div>
          <div
            style={{
              fontSize: '28px',
              color: '#64748b',
              fontWeight: 500,
            }}
          >
            תנועה ישראלית יהודית
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '120px',
            height: '4px',
            background: '#2b7eb5',
            borderRadius: '2px',
            margin: '32px 0',
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: '36px',
            color: '#1e293b',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          מרכז התוכן לפעילים
        </div>
        <div
          style={{
            fontSize: '22px',
            color: '#64748b',
            marginTop: '12px',
            textAlign: 'center',
          }}
        >
          גלו ושתפו את התכנים של זהות ומשה פייגלין
        </div>

        {/* Platform icons row */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginTop: '36px',
            fontSize: '18px',
            color: '#94a3b8',
          }}
        >
          <span>YouTube</span>
          <span>•</span>
          <span>Instagram</span>
          <span>•</span>
          <span>X</span>
          <span>•</span>
          <span>Telegram</span>
          <span>•</span>
          <span>Spotify</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
