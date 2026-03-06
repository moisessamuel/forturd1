'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Search, Shield, CheckCircle, Clock, XCircle, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

interface TicketResult {
  numero_boleto: string
  nombre: string
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  cantidad_boletos: number
  monto: number
  moneda: string
  fecha: string
}

export default function VerificarPage() {
  const [ticketNumber, setTicketNumber] = useState('')
  const [result, setResult] = useState<TicketResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!ticketNumber.trim()) {
      toast.error('Por favor ingresa un número de boleto')
      return
    }

    setIsLoading(true)
    setSearched(true)

    try {
      const response = await fetch(`/api/verificar?boleto=${encodeURIComponent(ticketNumber)}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setResult(null)
          toast.error('Boleto no encontrado')
        } else {
          throw new Error('Error al verificar boleto')
        }
        return
      }

      const data = await response.json()
      setResult(data)
    } catch {
      toast.error('Error al verificar el boleto')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
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
      default:
        return {
          icon: Clock,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/50',
          label: 'Pendiente de Validación',
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
            Ingresa el número de tu boleto para verificar su estado.
          </p>
        </div>

        <Card className="mb-8 border-border/50 bg-card/50">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={ticketNumber}
                      onChange={(e) => setTicketNumber(e.target.value)}
                      placeholder="Ej. 00042"
                      className="bg-input pl-10 font-mono"
                    />
                  </div>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                <Search className="mr-2 h-4 w-4" />
                {isLoading ? 'Verificando...' : 'Verificar Boleto'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {searched && result && (
          <Card className={`border-2 ${getStatusConfig(result.estado).borderColor} ${getStatusConfig(result.estado).bgColor}`}>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-center">
                {(() => {
                  const StatusIcon = getStatusConfig(result.estado).icon
                  return <StatusIcon className={`h-16 w-16 ${getStatusConfig(result.estado).color}`} />
                })()}
              </div>
              
              <h2 className="mb-2 text-center text-xl font-bold">
                Estado: {getStatusConfig(result.estado).label}
              </h2>
              
              <div className="mb-4 text-center">
                <p className="text-sm text-muted-foreground">Número de Boleto</p>
                <p className="font-mono text-2xl font-bold text-primary">
                  #{result.numero_boleto.padStart(6, '0')}
                </p>
              </div>

              <div className="space-y-3 rounded-lg bg-background/50 p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre:</span>
                  <span className="font-medium">{result.nombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cantidad de boletos:</span>
                  <span className="font-medium">{result.cantidad_boletos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monto:</span>
                  <span className="font-medium">{formatCurrency(result.monto, result.moneda)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de compra:</span>
                  <span className="font-medium text-sm">{formatDate(result.fecha)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {searched && !result && !isLoading && (
          <Card className="border-2 border-red-500/50 bg-red-500/10">
            <CardContent className="p-6 text-center">
              <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
              <h2 className="mb-2 text-xl font-bold">Boleto no encontrado</h2>
              <p className="text-muted-foreground">
                El número de boleto ingresado no existe en nuestro sistema.
                Por favor verifica el número e intenta de nuevo.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mt-8 border-primary/30 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-4">
            <Clock className="mt-0.5 h-5 w-5 text-primary" />
            <p className="text-sm">
              Los pagos son verificados en un máximo de <span className="font-bold text-primary">24 horas</span>. Si tienes dudas, contacta a nuestro equipo de soporte.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
