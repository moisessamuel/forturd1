import type { Metadata } from 'next'
import { Geist, Geist_Mono, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import { WhatsAppBubble } from '@/components/whatsapp-bubble'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FortuRD - Arranca tu sueño, Enciende tu fortuna',
  description: 'Tú decides tu suerte. La BMW X6 esperando dueño. Compra tus boletos y gana.',
  generator: 'FortuRD',
  metadataBase: new URL('https://www.forturd1.com'),
  openGraph: {
    title: 'FortuRD - Arranca tu sueño, Enciende tu fortuna',
    description: 'Tú decides tu suerte. La BMW X6 esperando dueño. Compra tus boletos y gana.',
    url: 'https://www.forturd1.com',
    siteName: 'FortuRD',
    images: [
      {
        url: 'https://www.forturd1.com/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'FortuRD - BMW X6',
      },
    ],
    locale: 'es_DO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FortuRD - Arranca tu sueño, Enciende tu fortuna',
    description: 'Tú decides tu suerte. La BMW X6 esperando dueño. Compra tus boletos y gana.',
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
    <html lang="es" className="bg-background" suppressHydrationWarning>
      <head>
        <meta property="og:image" content="https://www.forturd1.com/images/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:title" content="FortuRD - Arranca tu sueño, Enciende tu fortuna" />
        <meta property="og:description" content="Tu decides tu suerte. La BMW X6 esperando dueño. Compra tus boletos y gana." />
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
              description: 'Tú decides tu suerte. La BMW X6 esperando dueño. Compra tus boletos y gana.',
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
              description: 'Tú decides tu suerte. La BMW X6 esperando dueño. Boletos a 300 DOP.',
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
                price: '300',
                priceCurrency: 'DOP',
                url: 'https://www.forturd1.com',
                availability: 'https://schema.org/InStock',
              },
            }),
          }}
        />
      </head>
      <body className={`font-sans antialiased ${playfair.variable}`} suppressHydrationWarning>
        <ThemeProvider>
          {children}
          <WhatsAppBubble />
          <Toaster 
            position="top-center" 
            richColors 
            theme="system"
            toastOptions={{
              style: {
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              },
            }}
          />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
