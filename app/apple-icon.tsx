import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Icon used when someone adds ClassPilot to their iPhone/iPad home screen.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ffb26b, #f2704a)',
        }}
      >
        <svg width="112" height="112" viewBox="0 0 24 24" fill="none">
          <path d="M12 3l7 4v5c0 4-3 6.5-7 9-4-2.5-7-5-7-9V7l7-4z" stroke="#2b1220" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.5 12.5l2 2 3.5-4" stroke="#2b1220" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
