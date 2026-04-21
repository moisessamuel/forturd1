import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { WhatsAppBubble } from '@/components/whatsapp-bubble'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'FortuRD - Arranca tu sueño, Enciende tu fortuna',
  description: 'Tú decides tu suerte. Una BMW X6 y una BMW X7 esperando dueño. Compra tus boletos y gana.',
  generator: 'FortuRD',
  metadataBase: new URL('https://www.forturd1.com'),
  openGraph: {
    title: 'FortuRD - Arranca tu sueño, Enciende tu fortuna',
    description: 'Tú decides tu suerte. Una BMW X6 y una BMW X7 esperando dueño. Compra tus boletos y gana.',
    url: 'https://www.forturd1.com',
    siteName: 'FortuRD',
    images: [
      {
        url: 'https://www.forturd1.com/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FortuRD - BMW X6 y X7',
      },
    ],
    locale: 'es_DO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FortuRD - Arranca tu sueño, Enciende tu fortuna',
    description: 'Tú decides tu suerte. Una BMW X6 y una BMW X7 esperando dueño. Compra tus boletos y gana.',
    images: ['https://www.forturd1.com/images/og-image.png'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.jpg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.jpg',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta property="og:image" content="https://www.forturd1.com/images/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:title" content="FortuRD - Arranca tu sueño, Enciende tu fortuna" />
        <meta property="og:description" content="Tu decides tu suerte. Una BMW X6 y una BMW X7 esperando dueño. Compra tus boletos y gana." />
        <meta property="og:url" content="https://www.forturd1.com" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="FortuRD" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'FortuRD',
              url: 'https://www.forturd1.com',
              description: 'Tú decides tu suerte. Una BMW X6 y una BMW X7 esperando dueño. Compra tus boletos y gana.',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://www.forturd1.com/verificar?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Event',
              name: 'Sorteo FortuRD - BMW X6 y BMW X7',
              description: 'Tú decides tu suerte. Una BMW X6 y una BMW X7 esperando dueño. Boletos a 1,000 DOP.',
              image: 'https://www.forturd1.com/images/og-image.png',
              organizer: {
                '@type': 'Organization',
                name: 'FortuRD',
                url: 'https://www.forturd1.com',
              },
              location: {
                '@type': 'Place',
                name: 'Santo Domingo, Distrito Nacional',
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: 'Santo Domingo',
                  addressRegion: 'Distrito Nacional',
                  addressCountry: 'DO',
                },
              },
              offers: {
                '@type': 'Offer',
                price: '1000',
                priceCurrency: 'DOP',
                url: 'https://www.forturd1.com',
                availability: 'https://schema.org/InStock',
              },
            }),
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
        <WhatsAppBubble />
        <Toaster 
          position="top-center" 
          richColors 
          toastOptions={{
            style: {
              background: 'oklch(0.12 0 0)',
              border: '1px solid oklch(0.25 0.02 85)',
              color: 'oklch(0.95 0 0)',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
