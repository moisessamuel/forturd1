import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FortuRD Ruleta - Gira y Gana Premios',
  description: 'Juega en la Ruleta FortuRD y gana premios increíbles. Participantes con boletos ganan giros gratis.',
  openGraph: {
    title: 'FortuRD Ruleta - Gira y Gana Premios',
    description: 'Juega en la Ruleta FortuRD y gana premios increíbles. Participantes con boletos ganan giros gratis.',
    url: 'https://www.forturd1.com/ruleta',
    siteName: 'FortuRD',
    images: [
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2014%20jun%202026%2C%2010_46_52%20%282%29-uVsQFDEwcmSkT4Daic2XGPIWksxUvh.png',
        width: 1200,
        height: 630,
        alt: 'FortuRD Ruleta',
      },
    ],
    locale: 'es_DO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FortuRD Ruleta - Gira y Gana Premios',
    description: 'Juega en la Ruleta FortuRD y gana premios increíbles. Participantes con boletos ganan giros gratis.',
    images: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2014%20jun%202026%2C%2010_46_52%20%282%29-uVsQFDEwcmSkT4Daic2XGPIWksxUvh.png'],
  },
}

export default function RuletaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
