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
    setSiteUrl('https://www.forturd1.com')
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
      const W = 2048
      const H = 2048
      canvas.width = W
      canvas.height = H
      const cx = W / 2

      // Background negro
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, W, H)

      // Borde dorado doble
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 8
      ctx.strokeRect(30, 30, W - 60, H - 60)
      ctx.lineWidth = 3
      ctx.strokeRect(50, 50, W - 100, H - 100)

      // Linea decorativa superior
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(200, 130)
      ctx.lineTo(W - 200, 130)
      ctx.stroke()

      // Titulo FortuRD
      ctx.fillStyle = '#DAA520'
      ctx.font = 'bold 110px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('FortuRD', cx, 230)

      // Subtitulo
      ctx.fillStyle = '#cccccc'
      ctx.font = '42px sans-serif'
      ctx.fillText('Arranca tu sueño. Enciende tu fortuna', cx, 300)

      // Linea decorativa
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(200, 340)
      ctx.lineTo(W - 200, 340)
      ctx.stroke()

      // Texto escanea
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 48px sans-serif'
      ctx.fillText('ESCANEA EL CODIGO QR', cx, 420)

      // QR fondo blanco con borde dorado
      const qrSize = 900
      const qrX = (W - qrSize) / 2
      const qrY = 470
      const r = 30

      // Sombra dorada
      ctx.shadowColor = 'rgba(218, 165, 32, 0.4)'
      ctx.shadowBlur = 40
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // Fondo blanco redondeado
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(qrX + r, qrY)
      ctx.lineTo(qrX + qrSize - r, qrY)
      ctx.quadraticCurveTo(qrX + qrSize, qrY, qrX + qrSize, qrY + r)
      ctx.lineTo(qrX + qrSize, qrY + qrSize - r)
      ctx.quadraticCurveTo(qrX + qrSize, qrY + qrSize, qrX + qrSize - r, qrY + qrSize)
      ctx.lineTo(qrX + r, qrY + qrSize)
      ctx.quadraticCurveTo(qrX, qrY + qrSize, qrX, qrY + qrSize - r)
      ctx.lineTo(qrX, qrY + r)
      ctx.quadraticCurveTo(qrX, qrY, qrX + r, qrY)
      ctx.closePath()
      ctx.fill()

      // Reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0

      // Borde dorado del QR
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(qrX + r, qrY)
      ctx.lineTo(qrX + qrSize - r, qrY)
      ctx.quadraticCurveTo(qrX + qrSize, qrY, qrX + qrSize, qrY + r)
      ctx.lineTo(qrX + qrSize, qrY + qrSize - r)
      ctx.quadraticCurveTo(qrX + qrSize, qrY + qrSize, qrX + qrSize - r, qrY + qrSize)
      ctx.lineTo(qrX + r, qrY + qrSize)
      ctx.quadraticCurveTo(qrX, qrY + qrSize, qrX, qrY + qrSize - r)
      ctx.lineTo(qrX, qrY + r)
      ctx.quadraticCurveTo(qrX, qrY, qrX + r, qrY)
      ctx.closePath()
      ctx.stroke()

      // Dibujar QR
      const padding = 70
      ctx.drawImage(img, qrX + padding, qrY + padding, qrSize - padding * 2, qrSize - padding * 2)

      // URL
      ctx.fillStyle = '#DAA520'
      ctx.font = 'bold 56px sans-serif'
      ctx.fillText('www.forturd1.com', cx, 1500)

      // Descripcion vehiculos
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 40px sans-serif'
      ctx.fillText('BMW X6 Y BMW X7 ESPERANDO DUEÑO', cx, 1580)

      // Precio boleto
      ctx.fillStyle = '#DAA520'
      ctx.font = 'bold 52px sans-serif'
      ctx.fillText('BOLETOS: 1,000 DOP', cx, 1660)

      // Linea decorativa inferior
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(200, 1720)
      ctx.lineTo(W - 200, 1720)
      ctx.stroke()

      // Footer
      ctx.fillStyle = '#888888'
      ctx.font = '32px sans-serif'
      ctx.fillText('POTENCIA - LUJO - EXCLUSIVIDAD', cx, 1780)

      // Santo Domingo
      ctx.fillStyle = '#666666'
      ctx.font = '28px sans-serif'
      ctx.fillText('Santo Domingo, Distrito Nacional', cx, 1830)

      // Linea inferior
      ctx.strokeStyle = '#DAA520'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(200, 1920)
      ctx.lineTo(W - 200, 1920)
      ctx.stroke()

      // Descargar
      const link = document.createElement('a')
      link.download = 'FortuRD-QR-Flyer.png'
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'FortuRD - Arranca tu sueño, Enciende tu fortuna',
          text: 'Tu decides tu suerte. Una BMW X6 y una BMW X7 esperando dueño. Compra tus boletos en www.forturd1.com',
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
            Escanea el código QR para participar
          </p>

          {/* QR Code */}
          <div ref={qrRef} className="rounded-2xl bg-white p-6 shadow-lg">
            <QRCodeSVG
              value={`${siteUrl}/verificar`}
              size={220}
              bgColor="#ffffff"
              fgColor="#000000"
              level="H"
              includeMargin={false}
            />
          </div>

          {/* URL */}
          <p className="mt-4 text-sm font-medium text-primary">www.forturd1.com/verificar</p>
          <p className="mt-1 text-xs text-muted-foreground">Arranca tu sueño, Enciende tu fortuna</p>

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
