'use client'

import { useState, useEffect, useCallback } from 'react'
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
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  DollarSign, 
  Users, 
  Gift, 
  RotateCcw, 
  Search, 
  CheckCircle, 
  XCircle, 
  LogOut,
  Target,
  Smartphone,
  Gamepad2,
  Ticket,
  Bike,
  Eye,
  Banknote,
  RefreshCw
} from 'lucide-react'
import Image from 'next/image'

interface RuletaJugada {
  id: string
  nombre: string
  telefono: string
  email: string | null
  monto: number
  moneda: string
  metodo_pago: string
  comprobante_url: string | null
  estado: string
  resultado: string | null
  es_gratis: boolean
  origen: string
  created_at: string
  confirmado_at: string | null
  jugado_at: string | null
}

interface Stats {
  total_giros: number
  giros_confirmados: number
  giros_pendientes: number
  giros_jugados: number
  ventas_dop: number
  ventas_usd: number
  jugadores_unicos: number
  premios_entregados: number
  giros_gratis: number
}

// Prize milestones configuration - based on user requirements
const PRIZE_MILESTONES = [
  { spins: 201, prize: '1 Boleto BMW X6 + 1 Boleto BMW X7', icon: Ticket, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { spins: 753, prize: '5,000 Pesos', icon: Banknote, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { spins: 3504, prize: 'Patineta Electrica / PS5 / Smart TV', icon: Gamepad2, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { spins: 7605, prize: 'iPhone', icon: Smartphone, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { spins: 12506, prize: 'Motor', icon: Bike, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
]

export default function RuletaAdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [jugadas, setJugadas] = useState<RuletaJugada[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [estadoFilter, setEstadoFilter] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedJugada, setSelectedJugada] = useState<RuletaJugada | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    const session = sessionStorage.getItem('ruleta_admin_session')
    if (!session) {
      router.push('/admin/ruleta/login')
    } else {
      setIsAuthenticated(true)
      setIsLoading(false)
    }
  }, [router])

  const fetchData = useCallback(async () => {
    try {
      const [jugadasRes, statsRes] = await Promise.all([
        fetch(`/api/admin/ruleta?estado=${estadoFilter}&search=${searchTerm}`),
        fetch('/api/admin/ruleta/stats'),
      ])
      
      const jugadasData = await jugadasRes.json()
      const statsData = await statsRes.json()
      
      setJugadas(jugadasData.jugadas || jugadasData || [])
      setStats(statsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }, [estadoFilter, searchTerm])

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
      const interval = setInterval(fetchData, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, fetchData])

  const handleUpdateEstado = async (id: string, nuevoEstado: string) => {
    setUpdating(id)
    try {
      await fetch('/api/admin/ruleta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: nuevoEstado }),
      })
      await fetchData()
      setShowDetailModal(false)
    } catch (error) {
      console.error('Error updating:', error)
    }
    setUpdating(null)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('ruleta_admin_session')
    router.push('/admin/ruleta/login')
  }

  const getNextPrizeMilestone = (currentSpins: number) => {
    for (const milestone of PRIZE_MILESTONES) {
      if (currentSpins < milestone.spins) {
        return { ...milestone, remaining: milestone.spins - currentSpins }
      }
    }
    // After completing all milestones, show cycling info
    return null
  }

  const getCompletedMilestones = (currentSpins: number) => {
    return PRIZE_MILESTONES.filter(m => currentSpins >= m.spins)
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

  const nextPrize = stats ? getNextPrizeMilestone(stats.giros_jugados) : null
  const completedMilestones = stats ? getCompletedMilestones(stats.giros_jugados) : []

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image
            src="/images/ruleta-forturd.png"
            alt="Ruleta FortuRD"
            width={60}
            height={60}
            className="rounded-full"
          />
          <div>
            <h1 className="text-2xl font-bold text-primary">Panel Ruleta FortuRD</h1>
            <p className="text-sm text-muted-foreground">Administracion de giros y premios</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => {
            setEstadoFilter('todos')
            setSearchTerm('')
          }}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restablecer
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Giros</CardTitle>
            <RotateCcw className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_giros || 0}</div>
            <p className="text-xs text-muted-foreground">
              Jugados: {stats?.giros_jugados || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas DOP</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              RD${(stats?.ventas_dop || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas USD</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              US${(stats?.ventas_usd || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Jugadores</CardTitle>
            <Users className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats?.jugadores_unicos || 0}</div>
            <p className="text-xs text-muted-foreground">
              Gratis: {stats?.giros_gratis || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Premios</CardTitle>
            <Gift className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">{stats?.premios_entregados || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pendientes: {stats?.giros_pendientes || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Prize Milestone */}
      {nextPrize && stats && (
        <Card className="mb-8 border-primary bg-gradient-to-r from-primary/10 to-yellow-500/10">
          <CardContent className="flex flex-col items-center gap-6 p-6 md:flex-row">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-primary">Proximo Premio Garantizado</h3>
              <p className="text-2xl font-bold">{nextPrize.prize}</p>
              <p className="text-muted-foreground">
                Faltan <span className="font-bold text-primary">{nextPrize.remaining}</span> giros 
                (al llegar a {nextPrize.spins} giros totales)
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Giros jugados</p>
              <p className="text-4xl font-bold text-primary">{stats.giros_jugados}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prize Milestones Progress */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Premios por Giros (Reglas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Por defecto sale &quot;Sigue Intentando&quot;. Los premios garantizados se otorgan al alcanzar los siguientes hitos:
          </p>
          <div className="grid gap-4 md:grid-cols-5">
            {PRIZE_MILESTONES.map((milestone) => {
              const Icon = milestone.icon
              const isCompleted = stats && stats.giros_jugados >= milestone.spins
              const progress = stats ? Math.min((stats.giros_jugados / milestone.spins) * 100, 100) : 0
              return (
                <div
                  key={milestone.spins}
                  className={`rounded-lg border p-4 text-center transition-all ${
                    isCompleted 
                      ? 'border-green-500 bg-green-500/10' 
                      : 'border-border'
                  }`}
                >
                  <Icon className={`mx-auto h-8 w-8 ${milestone.color}`} />
                  <p className="mt-2 text-xl font-bold">{milestone.spins.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">giros</p>
                  <p className="mt-2 text-sm font-medium">{milestone.prize}</p>
                  {isCompleted ? (
                    <Badge className="mt-2 bg-green-500">Alcanzado</Badge>
                  ) : (
                    <div className="mt-2">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{progress.toFixed(0)}%</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o telefono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="confirmado">Confirmados</SelectItem>
            <SelectItem value="jugado">Jugados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={fetchData} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Jugadas Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Giros ({jugadas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Metodo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jugadas.map((jugada) => (
                  <TableRow key={jugada.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(jugada.created_at).toLocaleString('es-DO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="font-medium">{jugada.nombre}</TableCell>
                    <TableCell>{jugada.telefono}</TableCell>
                    <TableCell>
                      {jugada.es_gratis ? (
                        <Badge variant="secondary">GRATIS</Badge>
                      ) : (
                        <span className="font-medium">
                          {jugada.moneda === 'DOP' ? 'RD$' : 'US$'}
                          {jugada.monto}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{jugada.metodo_pago}</TableCell>
                    <TableCell>
                      {jugada.es_gratis ? (
                        <Badge className="bg-blue-500">{jugada.origen?.replace('compra_', '')}</Badge>
                      ) : (
                        <Badge variant="outline">Compra</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          jugada.estado === 'confirmado'
                            ? 'bg-green-500'
                            : jugada.estado === 'pendiente'
                            ? 'bg-yellow-500'
                            : jugada.estado === 'jugado'
                            ? 'bg-blue-500'
                            : 'bg-red-500'
                        }
                      >
                        {jugada.estado.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {jugada.resultado ? (
                        <span className={jugada.resultado === 'Sigue Intentando' ? 'text-muted-foreground' : 'font-bold text-primary'}>
                          {jugada.resultado}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
                        {jugada.estado === 'pendiente' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                              onClick={() => handleUpdateEstado(jugada.id, 'confirmado')}
                              disabled={updating === jugada.id}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                              onClick={() => handleUpdateEstado(jugada.id, 'cancelado')}
                              disabled={updating === jugada.id}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {jugadas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No hay giros registrados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-lg border-border bg-background">
          <DialogHeader>
            <DialogTitle>Detalle del Giro</DialogTitle>
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
                {selectedJugada.email && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedJugada.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="font-medium">
                    {selectedJugada.es_gratis 
                      ? 'GRATIS' 
                      : `${selectedJugada.moneda === 'DOP' ? 'RD$' : 'US$'}${selectedJugada.monto}`
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Metodo</p>
                  <p className="font-medium">{selectedJugada.metodo_pago}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge
                    className={
                      selectedJugada.estado === 'confirmado'
                        ? 'bg-green-500'
                        : selectedJugada.estado === 'pendiente'
                        ? 'bg-yellow-500'
                        : selectedJugada.estado === 'jugado'
                        ? 'bg-blue-500'
                        : 'bg-red-500'
                    }
                  >
                    {selectedJugada.estado.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resultado</p>
                  <p className="font-medium">{selectedJugada.resultado || '-'}</p>
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
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {selectedJugada.estado === 'pendiente' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => handleUpdateEstado(selectedJugada.id, 'confirmado')}
                    disabled={updating === selectedJugada.id}
                    className="flex-1 bg-green-600 hover:bg-green-500"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar Pago
                  </Button>
                  <Button
                    onClick={() => handleUpdateEstado(selectedJugada.id, 'cancelado')}
                    disabled={updating === selectedJugada.id}
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
