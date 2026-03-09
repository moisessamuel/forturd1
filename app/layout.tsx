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
  description: 'Tu decides tu suerte. Una BMW X6 y una BMW X7 esperando dueño. Compra tus boletos y gana.',
  generator: 'FortuRD',
  metadataBase: new URL('https://www.forturd1.com'),
  openGraph: {
    title: 'FortuRD - Arranca tu sueño, Enciende tu fortuna',
    description: 'Tu decides tu suerte. Una BMW X6 y una BMW X7 esperando dueño. Compra tus boletos y gana.',
    url: 'https://www.forturd1.com',
    siteName: 'FortuRD',
    images: [
      {
        url: '/images/og-image.png',
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
    description: 'Tu decides tu suerte. Una BMW X6 y una BMW X7 esperando dueño. Compra tus boletos y gana.',
    images: ['/images/og-image.png'],
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
