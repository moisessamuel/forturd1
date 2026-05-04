'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  DollarSign, 
  Clock, 
  Gift, 
  CheckCircle, 
  XCircle, 
  Eye,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface Jugada {
  id: string
  nombre: string
  telefono: string
  email: string
  monto: number
  moneda: string
  metodo_pago: string
  comprobante_url: string
  estado: string
  resultado: string | null
  es_gratis: boolean
  created_at: string
  premio?: {
    nombre: string
  }
}

interface Stats {
  ventas_dop: number
  ventas_usd: number
  pendientes: number
  jugados: number
  premios_entregados: number
  giros_totales: number
  giros_gratis: number
}

export default function RuletaAdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [jugadas, setJugadas] = useState<Jugada[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [selectedJugada, setSelectedJugada] = useState<Jugada | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const session = localStorage.getItem('admin_session')
    if (!session) {
      router.push('/admin')
    } else {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, estadoFilter])

  const fetchData = async () => {
    try {
      const [jugadasRes, statsRes] = await Promise.all([
        fetch(`/api/admin/ruleta?estado=${estadoFilter}`),
        fetch('/api/admin/ruleta/stats'),
      ])

      const [jugadasData, statsData] = await Promise.all([
        jugadasRes.json(),
        statsRes.json(),
      ])

      setJugadas(jugadasData)
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const updateEstado = async (id: string, estado: string) => {
    setUpdating(true)
    try {
      await fetch('/api/admin/ruleta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado }),
      })
      fetchData()
      setShowDetailModal(false)
    } catch (error) {
      console.error('Error updating:', error)
    }
    setUpdating(false)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge className="bg-yellow-500">Pendiente</Badge>
      case 'confirmado':
        return <Badge className="bg-blue-500">Confirmado</Badge>
      case 'jugado':
        return <Badge className="bg-green-500">Jugado</Badge>
      case 'cancelado':
        return <Badge className="bg-red-500">Cancelado</Badge>
      default:
        return <Badge>{estado}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-primary">Panel Ruleta FortuRD</h1>
            <p className="text-sm text-muted-foreground">Administracion de giros y premios</p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-green-500/30 bg-green-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" /> Ventas DOP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">
                RD${stats.ventas_dop.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30 bg-blue-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" /> Ventas USD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-500">
                US${stats.ventas_usd.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/30 bg-yellow-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-500">{stats.pendientes}</p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-purple-500/10">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                <Gift className="h-4 w-4" /> Premios Ganados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-500">{stats.premios_entregados}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex items-center gap-4">
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="confirmado">Confirmados</SelectItem>
            <SelectItem value="jugado">Jugados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jugadas.map((jugada) => (
                <TableRow key={jugada.id}>
                  <TableCell className="text-sm">
                    {new Date(jugada.created_at).toLocaleDateString('es-DO')}
                  </TableCell>
                  <TableCell className="font-medium">{jugada.nombre}</TableCell>
                  <TableCell>{jugada.telefono}</TableCell>
                  <TableCell>
                    {jugada.es_gratis ? (
                      <Badge variant="outline">Gratis</Badge>
                    ) : (
                      `${jugada.moneda === 'DOP' ? 'RD$' : 'US$'}${jugada.monto}`
                    )}
                  </TableCell>
                  <TableCell>{getEstadoBadge(jugada.estado)}</TableCell>
                  <TableCell>
                    {jugada.resultado || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedJugada(jugada)
                        setShowDetailModal(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg border-border bg-background">
          <DialogHeader>
            <DialogTitle>Detalle de Giro</DialogTitle>
          </DialogHeader>

          {selectedJugada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{selectedJugada.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefono</p>
                  <p className="font-medium">{selectedJugada.telefono}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="font-medium">
                    {selectedJugada.es_gratis 
                      ? 'Gratis' 
                      : `${selectedJugada.moneda === 'DOP' ? 'RD$' : 'US$'}${selectedJugada.monto}`
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Metodo</p>
                  <p className="font-medium">{selectedJugada.metodo_pago}</p>
                </div>
              </div>

              {selectedJugada.comprobante_url && (
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">Comprobante</p>
                  <Image
                    src={selectedJugada.comprobante_url}
                    alt="Comprobante"
                    width={400}
                    height={300}
                    className="rounded-lg"
                  />
                </div>
              )}

              {selectedJugada.estado === 'pendiente' && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateEstado(selectedJugada.id, 'confirmado')}
                    disabled={updating}
                    className="flex-1 bg-green-600 hover:bg-green-500"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar
                  </Button>
                  <Button
                    onClick={() => updateEstado(selectedJugada.id, 'cancelado')}
                    disabled={updating}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
