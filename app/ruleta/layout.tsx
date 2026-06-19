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
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-SB1xsos189hxh2hzaMpuPkOrgrMwVS.png',
        width: 1600,
        height: 1000,
        alt: 'FortuRD Ruleta - Premios Disponibles',
      },
    ],
    locale: 'es_DO',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FortuRD Ruleta - Gira y Gana Premios',
    description: 'Juega en la Ruleta FortuRD y gana premios increíbles. Participantes con boletos ganan giros gratis.',
    images: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-SB1xsos189hxh2hzaMpuPkOrgrMwVS.png'],
  },
}

export default function RuletaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
