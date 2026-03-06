'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { Download, ArrowLeft, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function QRPage() {
  const [siteUrl, setSiteUrl] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSiteUrl(window.location.origin)
  }, [])

  const handleDownload = () => {
    if (!qrRef.current) return
    const svg = qrRef.current.querySelector('svg')
    if (!svg) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new window.Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      canvas.width = 1024
      canvas.height = 1024

      // Background
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, 1024, 1024)

      // Gold border
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 4
      ctx.strokeRect(20, 20, 984, 984)

      // Title
      ctx.fillStyle = '#DAA520'
      ctx.font = 'bold 48px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('FortuRD', 512, 80)

      // Subtitle
      ctx.fillStyle = '#999999'
      ctx.font = '20px sans-serif'
      ctx.fillText('Escanea para participar', 512, 115)

      // QR white background
      const qrSize = 600
      const qrX = (1024 - qrSize) / 2
      const qrY = 150
      ctx.fillStyle = '#ffffff'
      const radius = 20
      ctx.beginPath()
      ctx.moveTo(qrX + radius, qrY)
      ctx.lineTo(qrX + qrSize - radius, qrY)
      ctx.quadraticCurveTo(qrX + qrSize, qrY, qrX + qrSize, qrY + radius)
      ctx.lineTo(qrX + qrSize, qrY + qrSize - radius)
      ctx.quadraticCurveTo(qrX + qrSize, qrY + qrSize, qrX + qrSize - radius, qrY + qrSize)
      ctx.lineTo(qrX + radius, qrY + qrSize)
      ctx.quadraticCurveTo(qrX, qrY + qrSize, qrX, qrY + qrSize - radius)
      ctx.lineTo(qrX, qrY + radius)
      ctx.quadraticCurveTo(qrX, qrY, qrX + radius, qrY)
      ctx.closePath()
      ctx.fill()

      // Draw QR
      const padding = 40
      ctx.drawImage(img, qrX + padding, qrY + padding, qrSize - padding * 2, qrSize - padding * 2)

      // URL text
      ctx.fillStyle = '#DAA520'
      ctx.font = 'bold 28px sans-serif'
      ctx.fillText(siteUrl, 512, 820)

      // Bottom text
      ctx.fillStyle = '#666666'
      ctx.font = '18px sans-serif'
      ctx.fillText('Arranca tu sueno, Enciende tu fortuna', 512, 860)

      // Powered by
      ctx.fillStyle = '#444444'
      ctx.font = '14px sans-serif'
      ctx.fillText('forturd.com', 512, 960)

      const link = document.createElement('a')
      link.download = 'FortuRD-QR.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FortuRD - Rifa de Apartamentos',
          text: 'Participa en la rifa de apartamentos de lujo en Punta Cana!',
          url: siteUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(siteUrl)
      alert('Enlace copiado al portapapeles')
    }
  }

  if (!siteUrl) return null

  return (
    <main className="min-h-screen abstract-bg flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Volver al inicio
      </Link>

      <Card className="w-full max-w-md border-primary/30 bg-card/90 shadow-2xl shadow-primary/10">
        <CardContent className="flex flex-col items-center p-8">
          {/* Logo */}
          <Image
            src="/images/forturd-logo.png"
            alt="FortuRD"
            width={300}
            height={100}
            className="mb-2 object-contain"
            style={{ width: 'auto', height: '90px' }}
          />
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Escanea el codigo QR para participar
          </p>

          {/* QR Code */}
          <div ref={qrRef} className="rounded-2xl bg-white p-6 shadow-lg">
            <QRCodeSVG
              value={siteUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              includeMargin={false}
            />
          </div>

          {/* URL */}
          <p className="mt-4 text-sm font-medium text-primary">{siteUrl}</p>
          <p className="mt-1 text-xs text-muted-foreground">Arranca tu sueno, Enciende tu fortuna</p>

          {/* Actions */}
          <div className="mt-6 flex w-full gap-3">
            <Button
              onClick={handleDownload}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1 border-primary/50 text-primary hover:bg-primary/10"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Compartir
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Imprime este QR y colocalo donde desees para que las personas puedan escanear y participar.
      </p>
    </main>
  )
}
