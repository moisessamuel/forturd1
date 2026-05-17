'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Search, Shield, CheckCircle, Clock, XCircle, Ticket, Phone, Gift, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

type SearchMode = 'boleto' | 'telefono'

interface TicketResult {
  numero_boleto: string
  nombre: string
  telefono?: string
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'caducado'
  cantidad_boletos: number
  monto: number
  moneda: string
  fecha: string
  banco?: string
  sorteo_slug?: string
  giros_gratis_disponibles?: number
  giros_gratis_usados?: number
  es_boleto_fisico?: boolean
  caducado?: boolean
  mensaje_caducado?: string
}

export default function VerificarPage() {
  const router = useRouter()
  const [searchMode, setSearchMode] = useState<SearchMode>('boleto')
  const [searchValue, setSearchValue] = useState('')
  const [singleResult, setSingleResult] = useState<TicketResult | null>(null)
  const [multiResults, setMultiResults] = useState<TicketResult[]>([])
  const [totalApprovedBmw, setTotalApprovedBmw] = useState(0)
  const [boletosContados, setBoletosContados] = useState(0)
  const [freeSpinsForAll, setFreeSpinsForAll] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSearchParams, setLastSearchParams] = useState<{ mode: SearchMode; value: string } | null>(null)

  // Function to refresh current results
  const refreshResults = useCallback(async (silent = false) => {
    if (!lastSearchParams) return
    
    if (!silent) setIsRefreshing(true)
    
    try {
      const param = lastSearchParams.mode === 'boleto'
        ? `boleto=${encodeURIComponent(lastSearchParams.value)}`
        : `telefono=${encodeURIComponent(lastSearchParams.value)}`

      const response = await fetch(`/api/verificar?${param}`)

      if (response.ok) {
        const data = await response.json()
        
        if (lastSearchParams.mode === 'telefono' && data.results) {
          setMultiResults(data.results)
          setTotalApprovedBmw(data.totalApprovedBmw || 0)
          setBoletosContados(data.boletosContados || 0)
          setFreeSpinsForAll(data.freeSpinsForAll || 0)
        } else {
          setSingleResult(data)
        }
        
        if (!silent) toast.success('Datos actualizados')
      }
    } catch {
      if (!silent) toast.error('Error al actualizar')
    } finally {
      setIsRefreshing(false)
    }
  }, [lastSearchParams])

  // Auto-refresh every 10 seconds when there are results
  useEffect(() => {
    if (!lastSearchParams || (!singleResult && multiResults.length === 0)) return

    const interval = setInterval(() => {
      refreshResults(true) // Silent refresh
    }, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [lastSearchParams, singleResult, multiResults.length, refreshResults])

  const handleFreeSpinClick = (ticket: TicketResult) => {
    // Store ticket info in sessionStorage for the free spin
    const girosDisponibles = ticket.giros_gratis_disponibles ?? ticket.cantidad_boletos
    sessionStorage.setItem('freeSpin', JSON.stringify({
      numero_boleto: ticket.numero_boleto,
      nombre: ticket.nombre,
      telefono: ticket.telefono || '',
      used: girosDisponibles <= 0,
      total_boletos: ticket.cantidad_boletos,
      giros_usados: ticket.giros_gratis_usados || 0,
      giros_disponibles: girosDisponibles,
    }))
    router.push('/ruleta?freeSpin=true')
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchValue.trim()) {
      toast.error(searchMode === 'boleto' ? 'Ingresa un número de boleto' : 'Ingresa un número de teléfono')
      return
    }

    setIsLoading(true)
    setSearched(true)
    setSingleResult(null)
    setMultiResults([])
    setTotalApprovedBmw(0)
    setBoletosContados(0)
    setFreeSpinsForAll(0)

    try {
      const param = searchMode === 'boleto'
        ? `boleto=${encodeURIComponent(searchValue)}`
        : `telefono=${encodeURIComponent(searchValue)}`

      const response = await fetch(`/api/verificar?${param}`)

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(searchMode === 'boleto' ? 'Boleto no encontrado.' : 'No se encontraron boletos para este teléfono.')
        } else {
          throw new Error('Error al verificar')
        }
        return
      }

      const data = await response.json()

      // Store search params for auto-refresh
      setLastSearchParams({ mode: searchMode, value: searchValue })

      if (searchMode === 'telefono' && data.results) {
        setMultiResults(data.results)
        setTotalApprovedBmw(data.totalApprovedBmw || 0)
        setBoletosContados(data.boletosContados || 0)
        setFreeSpinsForAll(data.freeSpinsForAll || 0)
      } else {
        setSingleResult(data)
      }
    } catch {
      toast.error('Error al verificar. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = (mode: SearchMode) => {
    setSearchMode(mode)
    setSearchValue('')
    setSingleResult(null)
    setMultiResults([])
    setTotalApprovedBmw(0)
    setBoletosContados(0)
    setFreeSpinsForAll(0)
    setSearched(false)
    setLastSearchParams(null)
  }

  const getStatusConfig = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/50',
          label: 'Aprobado',
        }
      case 'rechazado':
        return {
          icon: XCircle,
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/50',
          label: 'Rechazado',
        }
      case 'caducado':
        return {
          icon: XCircle,
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/50',
          label: 'Caducado',
        }
      default:
        return {
          icon: Clock,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/50',
          label: 'Pendiente',
        }
    }
  }

  const formatCurrency = (amount: number, currency: string = 'DOP') => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount)
    }
    return `RD$ ${new Intl.NumberFormat('es-DO').format(amount)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const hasResults = singleResult || multiResults.length > 0
  const noResults = searched && !hasResults && !isLoading

  return (
    <main className="min-h-screen abstract-bg">
      <Header />

      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold italic">Verificar Boleto</h1>
          <p className="text-center text-muted-foreground">
            Busca por número de boleto o por teléfono para ver todos tus tickets.
          </p>
        </div>

        <Card className="mb-8 border-border/50 bg-card/50">
          <CardContent className="p-6">
            {/* Search mode tabs */}
            <div className="mb-4 flex rounded-lg border border-border/50 bg-background/50 p-1">
              <button
                type="button"
                onClick={() => switchMode('boleto')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  searchMode === 'boleto'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Ticket className="h-4 w-4" />
                No. Boleto
              </button>
              <button
                type="button"
                onClick={() => switchMode('telefono')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  searchMode === 'telefono'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Phone className="h-4 w-4" />
                Teléfono
              </button>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                {searchMode === 'boleto' ? (
                  <Ticket className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                ) : (
                  <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={searchMode === 'boleto' ? 'Ej. 00042' : 'Ej. 8091234567'}
                  className="bg-input pl-10 font-mono"
                  type={searchMode === 'telefono' ? 'tel' : 'text'}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? 'Buscando...' : searchMode === 'boleto' ? 'Verificar Boleto' : 'Buscar mis Boletos'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Single ticket result */}
        {singleResult && (
          <Card className={`mb-4 border-2 ${getStatusConfig(singleResult.estado).borderColor} ${getStatusConfig(singleResult.estado).bgColor}`}>
            <CardContent className="p-6">
              {/* Refresh button */}
              <div className="mb-4 flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refreshResults(false)}
                  disabled={isRefreshing}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`mr-1 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Actualizando...' : 'Actualizar'}
                </Button>
              </div>
              
              <div className="mb-4 flex items-center justify-center">
                {(() => {
                  const StatusIcon = getStatusConfig(singleResult.estado).icon
                  return <StatusIcon className={`h-16 w-16 ${getStatusConfig(singleResult.estado).color}`} />
                })()}
              </div>

              <h2 className="mb-2 text-center text-xl font-bold">
                Estado: {getStatusConfig(singleResult.estado).label}
              </h2>
              
              {singleResult.sorteo_slug && (
                <p className="mb-2 text-center text-xl font-bold">
                  {singleResult.sorteo_slug === 'bmw-x6' ? 'BMW X6' : singleResult.sorteo_slug === 'bmw-x7' ? 'BMW X7' : singleResult.sorteo_slug.toUpperCase()}
                </p>
              )}

              <div className="mb-4 text-center">
                <p className="text-sm text-muted-foreground">Número de Boleto</p>
                <p className="font-mono text-2xl font-bold text-primary">
                  #{singleResult.numero_boleto.padStart(5, '0')}
                </p>
              </div>

              <div className="space-y-3 rounded-lg bg-background/50 p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span className="font-medium">{singleResult.nombre}</span>
                </div>
                {singleResult.telefono && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono:</span>
                    <span className="font-medium">{singleResult.telefono}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cantidad de boletos:</span>
                  <span className="font-medium">{singleResult.cantidad_boletos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-medium">{formatCurrency(singleResult.monto, singleResult.moneda)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de compra:</span>
                  <span className="text-sm font-medium">{formatDate(singleResult.fecha)}</span>
                </div>
              </div>

              {/* Free Spin Button */}
              <div className="mt-4">
                {(() => {
                  const girosDisponibles = singleResult.giros_gratis_disponibles ?? singleResult.cantidad_boletos
                  const girosUsados = singleResult.giros_gratis_usados ?? 0
                  const isPending = singleResult.estado === 'pendiente'
                  const isCaducado = singleResult.estado === 'caducado' || singleResult.caducado
                  const esBoletoFisico = singleResult.es_boleto_fisico
                  
                  // Caducado tickets show expired message
                  if (isCaducado) {
                    return (
                      <div className="rounded-lg border border-orange-500/50 bg-orange-500/10 p-4 text-center">
                        <XCircle className="mx-auto mb-2 h-8 w-8 text-orange-500" />
                        <p className="font-bold text-orange-500">Boleto Caducado</p>
                        <p className="mt-2 text-sm text-orange-400">
                          {singleResult.mensaje_caducado || 'Boleto caducado, comunicarse con soporte +1 (829) 805-9020'}
                        </p>
                      </div>
                    )
                  }
                  
                  // Physical tickets don't get free spins
                  if (esBoletoFisico) {
                    return (
                      <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4 text-center">
                        <Ticket className="mx-auto mb-2 h-8 w-8 text-blue-500" />
                        <p className="font-bold text-blue-500">Boleto Fisico</p>
                        <p className="mt-2 text-sm text-blue-400">
                          Los boletos fisicos no incluyen giros gratis en la ruleta.
                        </p>
                      </div>
                    )
                  }
                  
                  if (isPending) {
                    return (
                      <>
                        <Button
                          disabled
                          className="w-full bg-yellow-600/50 text-yellow-200 font-bold cursor-not-allowed"
                        >
                          <Clock className="mr-2 h-5 w-5" />
                          GIRO GRATIS PENDIENTE
                        </Button>
                        <p className="mt-2 text-center text-xs text-yellow-500">
                          Tu boleto esta pendiente de confirmacion. Una vez aprobado podras usar tu giro gratis.
                        </p>
                      </>
                    )
                  }
                  
                  return (
                    <>
                      <Button
                        onClick={() => handleFreeSpinClick(singleResult)}
                        className="w-full bg-gradient-to-r from-primary to-yellow-500 text-black font-bold hover:from-yellow-500 hover:to-primary"
                      >
                        <Gift className="mr-2 h-5 w-5" />
                        {girosDisponibles > 0 
                          ? `${girosDisponibles} GIRO${girosDisponibles > 1 ? 'S' : ''} GRATIS` 
                          : 'COMPRAR GIROS'}
                      </Button>
                      <p className="mt-2 text-center text-xs text-muted-foreground">
                        {girosDisponibles > 0 
                          ? `${singleResult.cantidad_boletos} boleto${singleResult.cantidad_boletos > 1 ? 's' : ''} = ${singleResult.cantidad_boletos} giro${singleResult.cantidad_boletos > 1 ? 's' : ''} gratis. Usados: ${girosUsados}`
                          : 'Ya usaste tus giros gratis. Puedes comprar mas giros.'}
                      </p>
                    </>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Multiple results (phone search) */}
        {multiResults.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center relative">
              {/* Refresh button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshResults(false)}
                disabled={isRefreshing}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <p className="text-sm text-muted-foreground">Boletos encontrados para este teléfono</p>
              <p className="mt-1 text-2xl font-bold text-primary">{multiResults.length}</p>
              {multiResults[0]?.nombre && (
                <p className="mt-1 text-sm font-medium">{multiResults[0].nombre}</p>
              )}
            </div>

            {(() => {
              // bmw_index comes from the API, assigned chronologically (oldest=0)
              // boletos_contados tells us how many have been "consumed" into spins
              const totalBmwApproved = multiResults.filter(
                t => (t.sorteo_slug === 'bmw-x6' || t.sorteo_slug === 'bmw-x7') && t.estado === 'aprobado' && !t.caducado
              ).length

              return multiResults.map((ticket, idx) => {
              const status = getStatusConfig(ticket.estado)
              const StatusIcon = status.icon
              return (
                <Card key={idx} className={`border ${status.borderColor} ${status.bgColor}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <StatusIcon className={`h-10 w-10 shrink-0 ${status.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-lg font-bold text-primary">
                            #{ticket.numero_boleto.padStart(5, '0')}
                          </p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {ticket.sorteo_slug && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Sorteo: </span>
                              <span className="font-bold">{ticket.sorteo_slug === 'bmw-x6' ? 'BMW X6' : ticket.sorteo_slug === 'bmw-x7' ? 'BMW X7' : ticket.sorteo_slug.toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Monto: </span>
                            <span className="font-medium">{formatCurrency(ticket.monto, ticket.moneda)}</span>
                          </div>
                          {ticket.banco && (
                            <div>
                              <span className="text-muted-foreground">Banco: </span>
                              <span className="font-medium">{ticket.banco}</span>
                            </div>
                          )}
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Fecha: </span>
                            <span className="font-medium">{formatDate(ticket.fecha)}</span>
                          </div>
                          <div className="col-span-2 mt-2">
                            {(() => {
                              const isPending = ticket.estado === 'pendiente'
                              const isCaducado = ticket.estado === 'caducado' || ticket.caducado
                              const esBoletoFisico = ticket.es_boleto_fisico
                              const isApproved = ticket.estado === 'aprobado'
                              const isBmwXTicket = ticket.sorteo_slug === 'bmw-x6' || ticket.sorteo_slug === 'bmw-x7'
                              
                              // Caducado tickets show expired message
                              if (isCaducado) {
                                return (
                                  <div className="rounded border border-orange-500/50 bg-orange-500/10 p-2 text-center">
                                    <p className="text-xs font-bold text-orange-500">Boleto Caducado</p>
                                    <p className="mt-1 text-xs text-orange-400">
                                      {ticket.mensaje_caducado || 'Comunicarse con soporte +1 (809) 272-5841'}
                                    </p>
                                  </div>
                                )
                              }
                              
                              // Physical tickets don't get free spins
                              if (esBoletoFisico) {
                                return (
                                  <div className="rounded border border-blue-500/50 bg-blue-500/10 p-2 text-center">
                                    <p className="text-xs font-bold text-blue-500">Boleto Fisico</p>
                                    <p className="mt-1 text-xs text-blue-400">Sin giro gratis</p>
                                  </div>
                                )
                              }
                              
                              if (isPending) {
                                return (
                                  <Button
                                    size="sm"
                                    disabled
                                    className="w-full bg-yellow-600/50 text-yellow-200 font-bold cursor-not-allowed"
                                  >
                                    <Clock className="mr-2 h-4 w-4" />
                                    GIRO GRATIS PENDIENTE
                                  </Button>
                                )
                              }
                              
                              // For approved BMW X6/X7 tickets, check combined count
                              if (isBmwXTicket && isApproved) {
                                if (totalApprovedBmw < 2) {
                                  return (
                                    <div className="rounded border border-red-500/50 bg-red-500/10 p-3 text-center">
                                      <Button
                                        size="sm"
                                        disabled
                                        className="w-full bg-red-600/50 text-red-200 font-bold cursor-not-allowed mb-2"
                                      >
                                        <Gift className="mr-2 h-4 w-4" />
                                        GIRO GRATIS BLOQUEADO
                                      </Button>
                                      <p className="text-xs text-red-400">
                                        Te falta {2 - totalApprovedBmw} boleto{2 - totalApprovedBmw !== 1 ? 's' : ''} más para activar tus giradas gratis.
                                      </p>
                                    </div>
                                  )
                                }

                                // bmw_index from API (chronological, oldest=0)
                                // If bmw_index < boletosContados → already consumed
                                const bmwIdx = (ticket as any).bmw_index ?? -1
                                const isUsed = bmwIdx >= 0 && bmwIdx < boletosContados

                                if (isUsed) {
                                  return (
                                    <Button
                                      size="sm"
                                      disabled
                                      className="w-full bg-gray-700/60 text-gray-400 font-bold cursor-not-allowed"
                                    >
                                      <Gift className="mr-2 h-4 w-4" />
                                      GIROS USADOS
                                    </Button>
                                  )
                                }

                                // Available giros — show green button
                                return (
                                  <Button
                                    size="sm"
                                    onClick={() => handleFreeSpinClick(ticket)}
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold hover:from-emerald-500 hover:to-green-600"
                                  >
                                    <Gift className="mr-2 h-4 w-4" />
                                    {freeSpinsForAll > 0
                                      ? `${freeSpinsForAll} GIRO${freeSpinsForAll > 1 ? 'S' : ''} GRATIS`
                                      : 'GIROS GRATIS'}
                                  </Button>
                                )
                              }
                              
                              return (
                                <Button
                                  size="sm"
                                  onClick={() => handleFreeSpinClick(ticket)}
                                  className="w-full bg-gradient-to-r from-primary to-yellow-500 text-black font-bold hover:from-yellow-500 hover:to-primary"
                                >
                                  <Gift className="mr-2 h-4 w-4" />
                                  COMPRAR GIROS
                                </Button>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
            })()}
          </div>
        )}

        {/* No results */}
        {noResults && (
          <Card className="border-2 border-red-500/50 bg-red-500/10">
            <CardContent className="p-6 text-center">
              <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
              <h2 className="mb-2 text-xl font-bold">
                {searchMode === 'boleto' ? 'Boleto no encontrado' : 'Sin resultados'}
              </h2>
              <p className="text-muted-foreground">
                {searchMode === 'boleto'
                  ? 'El número de boleto ingresado no existe en nuestro sistema. Por favor verifica el número e intenta de nuevo.'
                  : 'No se encontraron boletos asociados a este número de teléfono. Verifica el número e intenta de nuevo.'}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mt-8 border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm">
              {'Los pagos son verificados en un máximo de '}
              <span className="font-bold text-primary">24 horas</span>
              {'. Si tienes dudas, contacta a nuestro equipo de soporte.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
