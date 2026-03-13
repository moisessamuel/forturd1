'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check, Clock, X, User } from 'lucide-react'
import Link from 'next/link'

interface Ticket {
  id: string
  numero_boleto: string
  status: string
  created_at: string
}

interface PurchaseGroup {
  id: string
  total_tickets: number
  monto: number
  moneda: string
  estado: string
  banco: string | null
  created_at: string
  tickets: Ticket[]
}

interface PlayerData {
  player: {
    id: string
    nombre: string
    phone_number: string
    email: string | null
  }
  qr_code: {
    id: string
    qr_value: string
  }
  purchase_groups: PurchaseGroup[]
}

export default function JugadorPage() {
  const params = useParams()
  const qr = params.qr as string
  const [data, setData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/player/${qr}`)
      .then((res) => {
        if (!res.ok) throw new Error('QR no encontrado')
        return res.json()
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [qr])

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') return `US$ ${new Intl.NumberFormat('en-US').format(amount)}`
    return `RD$ ${new Intl.NumberFormat('es-DO').format(amount)}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aprobado':
      case 'verified':
        return <Check className="h-4 w-4 text-green-500" />
      case 'rechazado':
      case 'rejected':
        return <X className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprobado':
      case 'verified':
        return 'Verificado'
      case 'rechazado':
      case 'rejected':
        return 'Rechazado'
      default:
        return 'Pendiente'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprobado':
      case 'verified':
        return 'text-green-500'
      case 'rechazado':
      case 'rejected':
        return 'text-red-500'
      default:
        return 'text-yellow-500'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-destructive/50">
          <CardContent className="p-6 text-center">
            <X className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-bold">QR no encontrado</h2>
            <p className="mb-4 text-muted-foreground">{error || 'El codigo QR no esta registrado en el sistema.'}</p>
            <Link href="/">
              <Button className="bg-primary text-primary-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalTickets = data.purchase_groups.reduce((sum, g) => sum + g.total_tickets, 0)
  const verifiedTickets = data.purchase_groups
    .filter((g) => g.estado === 'aprobado')
    .reduce((sum, g) => sum + g.total_tickets, 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Player Header */}
        <Card className="mb-6 border-primary/30 bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{data.player.nombre}</h1>
                <p className="text-sm text-muted-foreground">{data.player.phone_number}</p>
                <p className="font-mono text-xs text-primary">{data.qr_code.qr_value}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <div className="flex-1 rounded-lg bg-primary/10 p-3 text-center">
                <p className="text-2xl font-bold text-primary">{totalTickets}</p>
                <p className="text-xs text-muted-foreground">Total Boletos</p>
              </div>
              <div className="flex-1 rounded-lg bg-green-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-green-500">{verifiedTickets}</p>
                <p className="text-xs text-muted-foreground">Verificados</p>
              </div>
              <div className="flex-1 rounded-lg bg-yellow-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-500">{data.purchase_groups.length}</p>
                <p className="text-xs text-muted-foreground">Compras</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Groups */}
        <h2 className="mb-4 text-lg font-bold">Historial de Compras</h2>
        {data.purchase_groups.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-6 text-center text-muted-foreground">
              No hay compras registradas.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data.purchase_groups.map((group) => (
              <Card key={group.id} className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(group.estado)}
                      <span className={`text-sm font-medium ${getStatusColor(group.estado)}`}>
                        {getStatusText(group.estado)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatCurrency(group.monto, group.moneda)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(group.created_at).toLocaleDateString('es-DO')}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-background/50 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {group.tickets.length} {group.tickets.length === 1 ? 'boleto' : 'boletos'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.tickets.map((ticket) => (
                        <span
                          key={ticket.id}
                          className={`rounded-md px-2 py-1 font-mono text-sm font-medium ${
                            ticket.status === 'verified'
                              ? 'bg-green-500/20 text-green-500'
                              : ticket.status === 'rejected'
                              ? 'bg-red-500/20 text-red-500'
                              : 'bg-yellow-500/20 text-yellow-500'
                          }`}
                        >
                          #{ticket.numero_boleto.padStart(5, '0')}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Link href="/">
            <Button variant="outline" className="w-full border-primary text-primary">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
