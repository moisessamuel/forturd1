import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'FortuRD - Arranca tu sueño, Enciende tu fortuna'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
        }}
      >
        <img
          src={new URL('/images/forturd-bg-new.jpeg', process.env.NEXT_PUBLIC_SITE_URL || 'https://www.forturd1.com').toString()}
          width={1200}
          height={630}
          style={{
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
