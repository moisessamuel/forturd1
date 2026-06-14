'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MiniRuletaPreview } from '@/components/mini-ruleta-preview'
import type { Sorteo } from '@/lib/types'

interface SorteoWithProgress extends Sorteo {
  progress?: number
}

const carouselImages = [
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-UHzMAPHm4Z49bcIwCkEbVy8bjStXSi.png',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2014%20jun%202026%2C%2010_46_54%20%287%29-sN5x7xzJk90iflSeDITmvQRY3kT8KJ.png',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2014%20jun%202026%2C%2010_46_53%20%284%29-DgVK2VhcE9JtCqFdbocrIWhwt0J2w4.png',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2014%20jun%202026%2C%2010_46_52%20%282%29-uVsQFDEwcmSkT4Daic2XGPIWksxUvh.png',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2014%20jun%202026%2C%2010_46_52%20%281%29-5j1WJMuaawR223yWU3N2LYhU53cpo2.png',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%2014%20jun%202026%2C%2010_20_01-qiVEwPIXjBVZr4B6WvCfwUYNMppV5S.png',
]

export function SorteosDisponibles() {
  const [sorteos, setSorteos] = useState<SorteoWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Auto-rotate carousel images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchSorteos = async () => {
      try {
        // Single fetch — progreso_manual is already included in select('*')
        const response = await fetch('/api/sorteos?active=true')
        const data = await response.json()

        const sorteosWithProgress = (data || []).map((sorteo: Sorteo & { progreso_manual?: number }) => ({
          ...sorteo,
          progress: sorteo.progreso_manual || 0,
        }))

        setSorteos(sorteosWithProgress)
      } catch (error) {
        console.error('Error fetching sorteos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSorteos()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO').format(amount)
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-2 text-muted-foreground">Cargando sorteos...</p>
      </div>
    )
  }

  if (sorteos.length === 0) {
    return null
  }

  // Separate active and sold out sorteos
  const activeSorteos = sorteos.filter(s => !s.agotado && s.activo)
  const soldOutSorteos = sorteos.filter(s => s.agotado)

  return (
    <section className="py-12">
      {/* Active Sorteos */}
      {activeSorteos.length > 0 && (
        <>
          {/* Image Carousel Section */}
          <div className="mb-10">
            {/* Carousel */}
            <div className="relative mx-auto mb-6 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl border-2 border-primary/30 shadow-[0_0_30px_rgba(218,165,32,0.3)]">
              {carouselImages.map((src, index) => (
                <div
                  key={src}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Image
                    src={src}
                    alt={`BMW X6 y X7 - Imagen ${index + 1}`}
                    fill
                    className={index === 0 ? 'object-contain' : 'object-cover'}
                    priority={index === 0}
                  />
                </div>
              ))}
              {/* Carousel indicators */}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                {carouselImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-2 w-8 rounded-full transition-all ${
                      index === currentImageIndex 
                        ? 'bg-primary shadow-[0_0_10px_rgba(218,165,32,0.8)]' 
                        : 'bg-white/50 hover:bg-white/70'
                    }`}
                    aria-label={`Ver imagen ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Text below carousel */}
            <div className="text-center px-4">
              <h1 
                className="mb-6 text-4xl font-extrabold uppercase text-primary md:text-5xl lg:text-7xl"
                style={{ 
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                  fontStyle: 'italic',
                  textShadow: '0 0 25px rgba(218,165,32,1), 0 0 50px rgba(218,165,32,0.7), 0 0 80px rgba(218,165,32,0.4)',
                  letterSpacing: '0.06em',
                  lineHeight: '1.1',
                }}
              >
                Participa y Gana con FortuRD
              </h1>
              <p 
                className="mx-auto max-w-3xl font-semibold text-white"
                style={{
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                  fontStyle: 'italic',
                  textShadow: '0 0 20px rgba(255,255,255,0.95), 0 0 40px rgba(255,255,255,0.5)',
                  fontSize: 'clamp(1.15rem, 2.2vw, 1.6rem)',
                  letterSpacing: '0.03em',
                  lineHeight: '1.9',
                }}
              >
                ¡Solo faltan 2 meses! Esta máquina BMW X6 puede ser tuya… o si prefieres, llévate RD$4,000,000 en efectivo. Tú decides. Por la compra de 2 boletos obtienes 1 giro{' '}
                <span 
                  className="font-extrabold not-italic text-primary"
                  style={{ textShadow: '0 0 20px rgba(218,165,32,1), 0 0 40px rgba(218,165,32,0.8)' }}
                >
                  GRATIS
                </span>{' '}
                en la Ruleta FortuRD.
              </p>
            </div>
          </div>

          {/* Section title */}
          <div className="mb-8 text-center">
            <p className="mb-2 text-sm font-semibold tracking-widest text-primary">
              Sorteos Activos
            </p>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight text-foreground md:text-4xl">
              DISPONIBLES
            </h2>
          </div>

          <div
            className={
              activeSorteos.length === 1
                ? 'flex justify-center'
                : 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
            }
          >
            {activeSorteos.map((sorteo) => (
              <Card 
                key={sorteo.id} 
                className={`group overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10${
                  activeSorteos.length === 1 ? ' w-full max-w-xl' : ''
                }`}
              >
                <Link href={`/${sorteo.slug}`} className="block">
                  <div className="relative aspect-[4/3] cursor-pointer overflow-hidden">
                    <Image
                      src={sorteo.imagen_url || '/images/placeholder-vehicle.jpg'}
                      alt={sorteo.nombre}
                      fill
                      className="object-cover"
                    />
                    <Badge className="absolute left-3 top-3 bg-green-600 text-white">
                      EN CURSO
                    </Badge>
                  </div>
                </Link>
                <CardContent className="p-4">
                  <Link href={`/${sorteo.slug}`} className="block">
                    <h3 className="mb-2 cursor-pointer text-lg font-bold text-foreground transition-colors hover:text-primary">
                      {sorteo.nombre}
                    </h3>
                  </Link>
                  <div className="mb-3 text-sm text-muted-foreground">
                    {sorteo.slug === 'bmw-x6' ? (
                      <span>Deportivo, elegante y potente. Diseñado para destacar.</span>
                    ) : (
                      <span>CON LA VENTA DEL 100%</span>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-bold text-green-500">{(sorteo.progress || 0).toFixed(2)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-green-500 transition-all duration-500"
                        style={{ width: `${Math.min(sorteo.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      RD${formatCurrency(sorteo.precio_dop)} / US${sorteo.precio_usd}
                    </span>
                  </div>

                  <Link href={`/${sorteo.slug}`} className="block">
                    <Button className="w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90">
                      PARTICIPA AQUI
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Roulette Promo */}
      <div className="mt-12">
        <Card className="overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 to-yellow-500/10">
          <CardContent className="flex flex-col items-center gap-6 p-6 md:flex-row md:p-8">
            <div className="flex-shrink-0">
              <MiniRuletaPreview size={180} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="mb-2 text-2xl font-bold text-primary" style={{ textShadow: '0 0 10px rgba(218,165,32,0.5)' }}>
                Ruleta FortuRD
              </h3>
              <p className="mb-2 text-lg font-bold text-foreground">
                RD$100 / US$2 por giro
              </p>
              <p className="mb-4 text-muted-foreground">
                Gira la ruleta y gana increíbles premios como pueden ser: Motocicleta, iPhone 17, PlayStation 5, Smart TV, dinero en efectivo, boletos para el sorteo y mucho más!
              </p>
              <p className="mb-4 text-sm text-primary">
                Al comprar boletos BMW recibes un giro GRATIS!
              </p>
              <Link href="/ruleta">
                <Button className="bg-gradient-to-r from-primary to-yellow-500 font-bold text-black hover:from-yellow-500 hover:to-primary">
                  GIRAR AHORA
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Verify Ticket Button */}
        <div className="mt-8">
          <Link href="/verificar" className="block">
            <div className="group relative mx-auto overflow-hidden rounded-2xl border-2 border-primary bg-gradient-to-r from-primary/20 via-yellow-500/15 to-primary/20 p-1 shadow-[0_0_30px_rgba(218,165,32,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(218,165,32,0.6)]">
              <div className="rounded-xl bg-background/95 px-6 py-6 text-center backdrop-blur-sm transition-all group-hover:bg-background/90 md:px-10 md:py-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary/80">
                  Ya compraste tu boleto?
                </p>
                <p 
                  className="text-xl font-extrabold uppercase tracking-wide text-primary drop-shadow-[0_0_15px_rgba(218,165,32,0.7)] md:text-2xl lg:text-3xl"
                  style={{ textShadow: '0 0 20px rgba(218,165,32,0.6), 0 0 40px rgba(218,165,32,0.3)' }}
                >
                  Verifica tu boleto aquí y obtén tu giro gratis
                </p>
              </div>
              {/* Animated shimmer effect */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />
            </div>
          </Link>
        </div>
      </div>

      {/* Sold Out Sorteos */}
      {soldOutSorteos.length > 0 && (
        <div className="mt-12">
          <div className="mb-6 text-center">
            <h3 className="text-xl font-bold text-muted-foreground">AGOTADOS</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {soldOutSorteos.map((sorteo) => (
              <Card 
                key={sorteo.id} 
                className="overflow-hidden border-border/50 bg-card/30 opacity-75"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={sorteo.imagen_url || '/images/placeholder-vehicle.jpg'}
                    alt={sorteo.nombre}
                    fill
                    className="object-cover grayscale"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Badge className="rotate-[-15deg] scale-150 bg-red-600 px-6 py-2 text-lg font-bold text-white">
                      AGOTADO
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="mb-2 text-lg font-bold text-muted-foreground">
                    {sorteo.nombre}
                  </h3>
                  <div className="mb-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div className="h-full w-full rounded-full bg-red-600" />
                    </div>
                    <p className="mt-1 text-right text-xs font-bold text-red-500">100%</p>
                  </div>
                  <Button disabled className="w-full bg-red-600/50 font-bold text-white">
                    AGOTADO!
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
