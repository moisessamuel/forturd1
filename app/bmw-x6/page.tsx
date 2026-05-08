'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Search, Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UnifiedPurchaseSection } from '@/components/unified-purchase-section'
import type { Sorteo } from '@/lib/types'

const BMWX6Images = [
  '/images/bmw-x6-1.jpg',
  '/images/bmw-x6-2.jpg',
  '/images/bmw-x6-3.jpg',
]

export default function BMWX6Page() {
  const [sorteo, setSorteo] = useState<Sorteo | null>(null)
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    fetch(`/api/sorteos?slug=bmw-x6`)
      .then((res) => res.json())
      .then((data) => {
        setSorteo(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching sorteo:', err)
        setLoading(false)
      })

    const fetchProgress = async () => {
      try {
        const res = await fetch(`/api/sorteos/bmw-x6/progress`)
        const data = await res.json()
        setProgress(data.porcentaje || 0)
      } catch (error) {
        console.error('Error fetching progress:', error)
      }
    }

    fetchProgress()

    const interval = setInterval(fetchProgress, 5000)
    return () => clearInterval(interval)
  }, [])

  // ─── ROTACION AUTOMATICA DE IMAGENES ────────────────────────────────────
  // Rota automáticamente entre las 3 imágenes cada 3 segundos
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const imageRotationInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % BMWX6Images.length)
    }, 3000)

    return () => clearInterval(imageRotationInterval)
  }, [])

  const formatCurrency = (amount: number, currency: 'DOP' | 'USD' = 'DOP') => {
    if (currency === 'USD') {
      return `US$ ${new Intl.NumberFormat('en-US').format(amount)}`
    }
    return `RD$ ${new Intl.NumberFormat('es-DO').format(amount)}`
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-muted-foreground">Cargando sorteo...</p>
        </div>
      </div>
    )
  }

  if (!sorteo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-foreground">Sorteo no encontrado</h1>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <div className="border-b border-border/50 bg-card/50">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/forturd-logo.png"
              alt="FortuRD"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero Card */}
        <div className="mb-8 grid gap-8 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
            <Image
              src={BMWX6Images[currentImageIndex]}
              alt={`${sorteo.nombre} - Vista ${currentImageIndex + 1}`}
              fill
              className="object-cover transition-opacity duration-1000"
              priority
            />
            {sorteo.agotado ? (
              <Badge className="absolute left-4 top-4 z-10 bg-red-600 text-white">
                AGOTADO
              </Badge>
            ) : (
              <Badge className="absolute left-4 top-4 z-10 bg-green-600 text-white">
                EN CURSO
              </Badge>
            )}

            {/* Image indicators */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {BMWX6Images.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentImageIndex ? 'w-4 bg-white' : 'w-2 bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <h1 className="mb-2 text-2xl font-extrabold uppercase text-primary md:text-3xl lg:text-4xl">
              {sorteo.nombre}
            </h1>
            <div className="mb-4 flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Santo Domingo, Distrito Nacional</span>
            </div>
            <p className="mb-6 text-foreground/80">
              {sorteo.descripcion}
            </p>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">PRECIO (DOP)</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(sorteo.precio_dop)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">PRECIO (USD)</p>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(sorteo.precio_usd, 'USD')}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-4 border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">PROGRESO DE VENTA</p>
                  <p className="text-sm font-bold text-green-500">{progress.toFixed(2)}%</p>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4 text-green-500" />
              Compra segura garantizada por FortuRD.
            </p>
          </div>
        </div>

        {/* Tagline */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-widest text-primary" style={{ textShadow: '0 0 10px rgba(218, 165, 32, 0.6), 0 0 20px rgba(218, 165, 32, 0.3)' }}>
            POTENCIA - LUJO - EXCLUSIVIDAD
          </p>
        </div>

        {/* Purchase Section */}
        {!sorteo.agotado ? (
          <UnifiedPurchaseSection
            sorteoSlug={sorteo.slug}
            precioDop={sorteo.precio_dop}
            precioUsd={sorteo.precio_usd}
          />
        ) : (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="p-8 text-center">
              <h2 className="mb-2 text-2xl font-bold text-red-500">SORTEO AGOTADO</h2>
              <p className="text-muted-foreground">
                Todos los boletos para este sorteo han sido vendidos. Gracias por tu interes.
              </p>
              <Link href="/" className="mt-4 inline-block">
                <Button variant="outline" className="border-primary text-primary">
                  Ver otros sorteos disponibles
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Verify ticket card */}
        <Card className="my-8 border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-semibold">{'Ya compraste tu boleto?'}</p>
                <p className="text-lg text-muted-foreground">
                  Verifica el estado de tu boleto aquí.
                </p>
              </div>
            </div>
            <Link href="/verificar">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Verificar Boleto
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
