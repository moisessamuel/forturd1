'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { MapPin, Search, Shield } from 'lucide-react'

const GALLERY_IMAGES = [
  { src: '/images/gallery1.jpg', alt: 'BMW X7 y X6 en túnel de noche' },
  { src: '/images/gallery2.jpg', alt: 'BMW X7 y X6 trasera en gasolinera' },
  { src: '/images/gallery3.jpg', alt: 'BMW X6 y X7 frontal en estacionamiento' },
]
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { UnifiedPurchaseSection } from '@/components/unified-purchase-section'

interface Config {
  precio_boleto_dop: number
  total_boletos: number
}

export function HeroSection() {
  const [config, setConfig] = useState<Config | null>(null)
  const [progress, setProgress] = useState(0)
  const totalSlides = GALLERY_IMAGES.length + 1 // portada + gallery
  const [currentSlide, setCurrentSlide] = useState(0) // 0 = portada, 1+ = gallery

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides)
    }, 2500)
    return () => clearInterval(interval)
  }, [totalSlides])

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        setConfig(data)
      })
      .catch(console.error)

    fetch('/api/progress')
      .then((res) => res.json())
      .then((data) => {
        setProgress(data.porcentaje || 0)
      })
      .catch(console.error)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO').format(amount)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero Card */}
      <div className="mb-8 grid gap-8 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
          {/* Portada - slide 0 */}
          <div
            className="absolute inset-0 transition-opacity duration-500 ease-in-out"
            style={{ opacity: currentSlide === 0 ? 1 : 0 }}
          >
            <Image
              src="/images/hero-portada.jpg"
              alt="FortuRD - BMW X6 y BMW X7 - Arranca tu sueno, Enciende tu fortuna"
              fill
              className="object-cover"
              priority
            />
          </div>
          {/* Gallery images - slides 1, 2, 3 */}
          {GALLERY_IMAGES.map((img, index) => (
            <div
              key={img.src}
              className="absolute inset-0 transition-opacity duration-500 ease-in-out"
              style={{ opacity: currentSlide === index + 1 ? 1 : 0 }}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover"
              />
            </div>
          ))}
          {/* Slide indicators */}
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'w-6 bg-primary' : 'w-2 bg-foreground/40'
                }`}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
          <Badge className="absolute left-4 top-4 z-10 bg-green-600 text-white">
            EN CURSO
          </Badge>
        </div>

        <div className="flex flex-col justify-center">
          <h1 className="mb-2 text-2xl font-extrabold uppercase text-primary md:text-3xl lg:text-4xl">
            {'TÚ DECIDES TU SUERTE. UNA X6 Y UNA X7 ESPERANDO DUEÑO.'}
          </h1>
          <div className="mb-4 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Santo Domingo, Distrito Nacional</span>
          </div>
          <p className="mb-6 text-foreground/80">
{'La BMW X6 es una SUV deportiva tipo coupé, conocida por su potencia y tecnología avanzada. La BMW X7 es una SUV ejecutiva de gran tamaño, diseñada para máximo confort.'}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">PRECIO DEL BOLETO</p>
                <p className="text-xl font-bold text-foreground">
                  {config ? formatCurrency(config.precio_boleto_dop) : '1,000'} DOP
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">PROGRESO</p>
                <p className="text-xl font-bold text-green-500">
                  {progress.toFixed(2)} %
                </p>
              </CardContent>
            </Card>
          </div>

          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-green-500" />
            Compra mínima garantizada por sistema seguro.
          </p>
        </div>
      </div>

      {/* Tagline */}
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold tracking-widest text-primary" style={{ textShadow: '0 0 10px rgba(218, 165, 32, 0.6), 0 0 20px rgba(218, 165, 32, 0.3)' }}>
          POTENCIA - LUJO - EXCLUSIVIDAD
        </p>
      </div>

      {/* Unified Purchase Flow - All steps in one view */}
      <UnifiedPurchaseSection />

      {/* Verify ticket card */}
      <Card className="my-8 border-border/50 bg-card/50">
        <CardContent className="flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-primary" />
            <div>
              <p className="text-lg font-semibold">{'¿Ya compraste tu boleto?'}</p>
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

      {/* Prize information panel */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <p className="mb-2 font-semibold text-primary">Importante sobre los premios:</p>
        <p className="mb-3 text-sm text-foreground/80">
          Los dos vehículos serán otorgados como premios independientes. Cada premio tendrá su propio ganador. Tercer premio sorpresa, el cual será anunciado próximamente.
        </p>
        <p className="mb-1 text-sm font-semibold text-primary">Las fechas de nuestros sorteos son las siguientes:</p>
        <ul className="mb-3 space-y-1 text-sm text-foreground/80">
          <li>{"1er sorteo: entre 15/06/2026 al 15/07/2026, se seleccionará un día para sortear el primero de los premios (sorpresa)."}</li>
          <li>{"2do sorteo: entre 15/07/2026 al 15/08/2026, se seleccionará un día para sortear el segundo de los premios (BMW X7 o BMW X6)."}</li>
          <li>{"3er sorteo: entre 15/08/2026 al 15/09/2026, se seleccionará un día para sortear el tercero de los premios (BMW restante)."}</li>
        </ul>
        <p className="mb-2 text-sm text-foreground/80">
          <span className="font-semibold text-primary">Dato importante:</span> Recordando que los boletos son limitados, si se completa la totalidad de boletos vendidos se procedería a realizar el sorteo de los tres premios juntos.
        </p>
        <p className="mb-1 text-sm font-semibold text-primary">{"Selección del ganador:"}</p>
        <p className="text-sm text-foreground/80">
          {"El ganador será seleccionado de forma transparente mediante los números emitidos en el sorteo de la quiniela de la Lotería Nacional Gana Más, eliminando el último dígito de los números presentados."}
        </p>
      </div>
    </div>
  )
}
