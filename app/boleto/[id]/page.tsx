'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Ticket, 
  User, 
  Phone, 
  Mail, 
  CreditCard, 
  DollarSign, 
  Calendar,
  Hash,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  ArrowLeft,
  IdCard
} from 'lucide-react'

interface TicketInfo {
  numero_boleto: string
  status: string
}

interface BoletoData {
  id: string
  nombre_comprador: string
  telefono: string
  email: string | null
  cedula: string | null
  cantidad_boletos: number
  monto: number
  moneda: string
  banco: string
  estado: string
  referido_codigo: string | null
  created_at: string
  tickets: TicketInfo[]
  qr_code?: { qr_value: string }
  source: 'new' | 'legacy'
}

export default function BoletoPage() {
  const params = useParams()
  const [compra, setCompra] = useState<BoletoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetch(`/api/boleto/${params.id}`)
        .then(res => {
          if (!res.ok) throw new Error('Boleto no encontrado')
          return res.json()
        })
        .then(data => {
          setCompra(data)
          setLoading(false)
        })
        .catch(err => {
          setError(err.message)
          setLoading(false)
        })
    }
  }, [params.id])

  const formatCurrency = (amount: number, moneda: string) => {
    if (moneda === 'USD') {
      return `US$ ${new Intl.NumberFormat('en-US').format(amount)}`
    }
    return `RD$ ${new Intl.NumberFormat('es-DO').format(amount)}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-sm font-medium text-green-500">
            <CheckCircle className="h-4 w-4" />
            Aprobado
          </span>
        )
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-3 py-1 text-sm font-medium text-yellow-500">
            <Clock className="h-4 w-4" />
            Pendiente de Validación
          </span>
        )
      case 'rechazado':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1 text-sm font-medium text-red-500">
            <XCircle className="h-4 w-4" />
            Rechazado
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            {estado}
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Cargando información del boleto…</p>
        </div>
      </div>
    )
  }

  if (error || !compra) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="mx-4 w-full max-w-md border-border/50 bg-card/50">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold">Boleto no encontrado</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              El boleto que buscas no existe o el enlace es inválido.
            </p>
            <Link href="/">
              <Button variant="outline" className="border-primary text-primary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/forturd-logo.png"
              alt="FortuRD"
              width={120}
              height={40}
              style={{ width: 'auto', height: '40px' }}
              className="object-contain"
            />
          </Link>
          <Link href="/verificar">
            <Button variant="outline" size="sm" className="border-primary/50 text-primary">
              Verificar otro boleto
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Ticket Numbers Header */}
        <Card className="mb-6 border-primary/50 bg-primary/10">
          <CardContent className="p-6 text-center">
            <p className="mb-2 text-sm text-muted-foreground">
              {compra.tickets.length > 1 ? 'NÚMEROS DE BOLETOS' : 'NÚMERO DE BOLETO'}
            </p>
            <div className="space-y-1">
              {compra.tickets.map((t, i) => (
                <p key={i} className="font-mono text-2xl font-bold text-primary">
                  # {t.numero_boleto.padStart(5, '0')}
                </p>
              ))}
            </div>
            <div className="mt-3">{getEstadoBadge(compra.estado)}</div>
          </CardContent>
        </Card>

        {/* Buyer Info */}
        <Card className="mb-6 border-border/50 bg-card/50">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Información del Comprador</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="font-medium">{compra.nombre_comprador}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{compra.telefono}</p>
                </div>
              </div>

              {compra.email && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Correo Electrónico</p>
                    <p className="font-medium">{compra.email}</p>
                  </div>
                </div>
              )}

              {compra.cedula && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <IdCard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cédula</p>
                    <p className="font-medium">{compra.cedula}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Purchase Details */}
        <Card className="mb-6 border-border/50 bg-card/50">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-foreground">Detalles de la Compra</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Ticket className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cantidad de Boletos</p>
                  <p className="font-medium">{compra.cantidad_boletos}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monto Total</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(compra.monto, compra.moneda)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Método de Pago</p>
                  <p className="font-medium">{compra.banco}</p>
                </div>
              </div>

              {compra.referido_codigo && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Hash className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Referido</p>
                    <p className="font-medium">{compra.referido_codigo}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de Compra</p>
                  <p className="font-medium">{formatDate(compra.created_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            FortuRD - Arranca tu sueño. Enciende tu fortuna.
          </p>
        </div>
      </div>
    </div>
  )
}
