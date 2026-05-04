'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Sorteo } from '@/lib/types'

interface SorteoWithProgress extends Sorteo {
  progress?: number
}

export function SorteosDisponibles() {
  const [sorteos, setSorteos] = useState<SorteoWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSorteos = async () => {
      try {
        // Fetch all active sorteos
        const response = await fetch('/api/sorteos?active=true')
        const data = await response.json()
        
        // Fetch progress for each sorteo
        const sorteosWithProgress = await Promise.all(
          (data || []).map(async (sorteo: Sorteo) => {
            try {
              const progressRes = await fetch(`/api/sorteos/${sorteo.slug}/progress`)
              const progressData = await progressRes.json()
              return { ...sorteo, progress: progressData.porcentaje || 0 }
            } catch {
              return { ...sorteo, progress: 0 }
            }
          })
        )
        
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
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-2xl font-bold text-primary drop-shadow-[0_0_10px_rgba(218,165,32,0.8)] md:text-3xl lg:text-4xl" style={{ textShadow: '0 0 20px rgba(218,165,32,0.6), 0 0 40px rgba(218,165,32,0.4)' }}>
              TU DECIDES TU SUERTE. UNA X6 Y UNA X7 ESPERANDO DUENO.
            </h1>
            <p className="mb-2 text-sm font-semibold tracking-widest text-primary">
              Participa!
            </p>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight text-foreground md:text-4xl">
              DISPONIBLES
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeSorteos.map((sorteo) => (
              <Card 
                key={sorteo.id} 
                className="group overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
              >
                <Link href={`/${sorteo.slug}`} className="block">
                  <div className="relative aspect-[4/3] cursor-pointer overflow-hidden">
                    <Image
                      src={sorteo.imagen_url || '/images/placeholder-vehicle.jpg'}
                      alt={sorteo.nombre}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
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
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>CON LA VENTA DEL 100%</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-bold text-primary">{(sorteo.progress || 0).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500"
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
