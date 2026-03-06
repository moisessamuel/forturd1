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
  description: 'Participa en la rifa de apartamentos de lujo en Punta Cana, República Dominicana. Compra tus boletos y gana.',
  generator: 'FortuRD',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
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
