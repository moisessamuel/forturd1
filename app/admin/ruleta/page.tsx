'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
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
  RefreshCw,
  AlertTriangle,
  Trash2,
  Undo2
} from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

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
  es_giro_gratis: boolean
  origen: string
  numero_boleto_referencia: string | null
  source_table: string
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

// Prize milestones configuration - OFFICIAL FORTURD PRIZES (cyclic/repeating)
// Each prize repeats every X spins (e.g., boleto every 12 spins: 12, 24, 36, ...)
const PRIZE_MILESTONES = [
  { spins: 12, prize: '1 Boleto BMW X6', icon: Ticket, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { spins: 71, prize: '2 Boletos BMW X6', icon: Ticket, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { spins: 211, prize: 'RD$5,000', icon: Banknote, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { spins: 3504, prize: 'Patineta Electrica / PS5 / Smart TV', icon: Gamepad2, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  { spins: 8605, prize: 'iPhone', icon: Smartphone, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { spins: 12506, prize: 'RD$100,000', icon: Banknote, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  { spins: 16207, prize: 'Motor', icon: Bike, color: 'text-red-500', bgColor: 'bg-red-500/10' },
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
  const [showResetModal, setShowResetModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [jugadaToDelete, setJugadaToDelete] = useState<RuletaJugada | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [resetType, setResetType] = useState<'counters' | 'all'>('counters')
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const realtimeChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const ruletaSession = sessionStorage.getItem('ruleta_admin_session')
    const adminSession = sessionStorage.getItem('admin_session')

    if (!ruletaSession && !adminSession) {
      router.push('/admin')
      return
    }

    // referido_plus users are not allowed in this panel — redirect to their own dashboard
    try {
      const session = adminSession ? JSON.parse(adminSession) : null
      if (session?.role === 'referido_plus') {
        router.push('/admin/dashboard')
        return
      }
    } catch {
      // Continue
    }

    setIsAuthenticated(true)
    setIsLoading(false)
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
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }, [estadoFilter, searchTerm])

  // ─── SUPABASE REALTIME SUBSCRIPTION ──────────────────────────────────────
  // Subscribes to INSERT/UPDATE on all three ruleta tables.
  // Any spin from any user triggers an immediate fetchData() call.
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return

    // Initial data load
    fetchData()

    const supabase = createClient()

    // Create a single channel that listens to all three tables
    const channel = supabase
      .channel('admin-ruleta-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ruleta_jugadas' },
        () => {
          fetchData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jugadas_ruleta' },
        () => {
          fetchData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spins_individuales' },
        () => {
          fetchData()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false)
        }
      })

    realtimeChannelRef.current = channel

    // Fallback polling every 15s in case realtime has a hiccup
    const fallbackInterval = setInterval(fetchData, 15000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(fallbackInterval)
      setIsRealtimeConnected(false)
    }
  }, [isAuthenticated, fetchData])

  const handleUpdateEstado = async (id: string, nuevoEstado: string, sourceTable?: string) => {
    setUpdating(id)
    try {
      const response = await fetch('/api/admin/ruleta', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: nuevoEstado, source_table: sourceTable }),
      })
      
      const responseData = await response.json()
      
      if (response.ok) {
        if (nuevoEstado === 'confirmado') {
          toast.success('Giro confirmado exitosamente')
        } else if (nuevoEstado === 'cancelado') {
          toast.success('Giro cancelado')
        } else if (nuevoEstado === 'pendiente') {
          toast.success('Giro revertido a pendiente')
        }
        await fetchData()
        setShowDetailModal(false)
      } else {
        toast.error('Error al actualizar el estado: ' + (responseData.error || 'Unknown'))
      }
    } catch (error) {
      console.error('Error updating:', error)
      toast.error('Error de conexion')
    }
    setUpdating(null)
  }

  const handleDeleteJugada = async () => {
    if (!jugadaToDelete) return
    
    setIsDeleting(true)
    try {
      const deleteUrl = `/api/admin/ruleta?id=${jugadaToDelete.id}&source_table=${jugadaToDelete.source_table || 'ruleta_jugadas'}`
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      })
      
      const responseData = await response.json()
      
      if (response.ok) {
        toast.success('Registro eliminado exitosamente')
        setShowDeleteModal(false)
        setJugadaToDelete(null)
        await fetchData()
      } else {
        toast.error('Error al eliminar: ' + (responseData.error || 'Unknown'))
      }
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error de conexion')
    }
    setIsDeleting(false)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('ruleta_admin_session')
    router.push('/admin/ruleta/login')
  }

  const handleReset = async (type: 'counters' | 'all') => {
    setIsResetting(true)
    try {
      const response = await fetch(`/api/admin/ruleta?reset=${type}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        if (type === 'counters') {
          toast.success('Contadores reiniciados (historial intacto)')
        } else {
          toast.success('Todos los datos han sido eliminados')
        }
        setShowResetModal(false)
        await fetchData()
      } else {
        toast.error('Error al restablecer los datos')
      }
    } catch (error) {
      console.error('Error resetting:', error)
      toast.error('Error de conexion')
    }
    setIsResetting(false)
  }

  const handleRefresh = async () => {
    toast.info('Actualizando datos...')
    await fetchData()
    toast.success('Datos actualizados')
  }

  // Calculate progress for ALL prizes simultaneously (cyclic/parallel)
  const getAllPrizesProgress = (currentSpins: number) => {
    return PRIZE_MILESTONES.map((milestone) => {
      // How many complete cycles of this prize have been delivered
      const completedCycles = Math.floor(currentSpins / milestone.spins)
      // Progress toward the NEXT cycle of this prize
      const progressInCurrentCycle = currentSpins % milestone.spins
      const remaining = milestone.spins - progressInCurrentCycle
      const progressPercent = (progressInCurrentCycle / milestone.spins) * 100
      
      return {
        ...milestone,
        completedCycles,
        progressInCurrentCycle,
        remaining,
        progressPercent,
        nextMilestone: (completedCycles + 1) * milestone.spins,
      }
    })
  }

  // Get the NEAREST upcoming prize (smallest remaining spins)
  const getNextPrizeMilestone = (currentSpins: number) => {
    const allProgress = getAllPrizesProgress(currentSpins)
    // Sort by remaining spins to find the closest one
    const sorted = [...allProgress].sort((a, b) => a.remaining - b.remaining)
    return sorted[0] || null
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
          {/* Realtime status indicator */}
          <div className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/50 px-3 py-1.5">
            <span 
              className={`h-2 w-2 rounded-full ${isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} 
            />
            <span className="text-xs text-muted-foreground">
              {isRealtimeConnected ? 'En vivo' : 'Desconectado'}
            </span>
            {lastUpdate && (
              <span className="hidden text-[10px] text-muted-foreground/60 md:block">
                · {lastUpdate.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
          <Button 
            variant="outline" 
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            onClick={() => setShowResetModal(true)}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Restablecer
          </Button>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
          >
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
                (al llegar a {nextPrize.nextMilestone?.toLocaleString() || nextPrize.spins} giros totales)
              </p>
              {nextPrize.completedCycles > 0 && (
                <p className="text-sm text-green-500">
                  Este premio ya se ha entregado {nextPrize.completedCycles} vez(es)
                </p>
              )}
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
            Por defecto sale &quot;Sigue Intentando&quot;. Los premios son CICLICOS — cada premio se repite al completar su ciclo. 
            Todos los contadores avanzan en PARALELO con cada giro.
          </p>
          <div className="grid gap-4 md:grid-cols-7">
            {stats && getAllPrizesProgress(stats.giros_jugados).map((prizeProgress) => {
              const Icon = prizeProgress.icon
              const hasCompletedAtLeastOnce = prizeProgress.completedCycles > 0
              // Extract color name for glow effect (e.g., "green" from "text-green-500")
              const colorName = prizeProgress.color.replace('text-', '').replace('-500', '')
              const glowColor = `${colorName}-500`
              
              return (
                <div
                  key={prizeProgress.spins}
                  className={`relative overflow-hidden rounded-xl border p-4 text-center transition-all duration-500 ${
                    hasCompletedAtLeastOnce 
                      ? 'border-green-500/50 bg-gradient-to-b from-green-500/10 to-transparent' 
                      : 'border-border/50 bg-card/30 hover:border-border'
                  }`}
                >
                  {/* Subtle glow effect based on progress */}
                  <div 
                    className={`absolute inset-0 opacity-20 blur-xl transition-opacity duration-700`}
                    style={{ 
                      background: `radial-gradient(circle at center, var(--${glowColor}, #DAA520) 0%, transparent 70%)`,
                      opacity: prizeProgress.progressPercent > 50 ? 0.3 : 0.1
                    }}
                  />
                  
                  <div className="relative z-10">
                    <Icon className={`mx-auto h-6 w-6 ${prizeProgress.color} drop-shadow-sm`} />
                    <p className="mt-2 text-xl font-bold">{prizeProgress.spins.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">giros</p>
                    <p className="mt-2 text-xs font-medium leading-tight">{prizeProgress.prize}</p>
                    
                    {/* Enhanced Progress Bar with percentage */}
                    <div className="mt-4">
                      {/* Percentage display */}
                      <p className={`mb-1 text-lg font-bold ${prizeProgress.color}`}>
                        {prizeProgress.progressPercent.toFixed(0)}%
                      </p>
                      
                      {/* Animated progress bar with glow */}
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
                        {/* Glow layer */}
                        <div 
                          className={`absolute inset-y-0 left-0 rounded-full blur-sm transition-all duration-700 ease-out`}
                          style={{ 
                            width: `${prizeProgress.progressPercent}%`,
                            background: `linear-gradient(90deg, transparent, var(--${glowColor}, #DAA520))`
                          }}
                        />
                        {/* Main progress bar */}
                        <div 
                          className={`relative h-full rounded-full transition-all duration-700 ease-out ${prizeProgress.color.replace('text-', 'bg-')}`}
                          style={{ 
                            width: `${prizeProgress.progressPercent}%`,
                            boxShadow: `0 0 8px var(--${glowColor}, #DAA520)`
                          }}
                        />
                      </div>
                      
                      {/* Counter */}
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {prizeProgress.progressInCurrentCycle.toLocaleString()}/{prizeProgress.spins.toLocaleString()}
                      </p>
                    </div>
                    
                    {/* Completed cycles indicator */}
                    {hasCompletedAtLeastOnce && (
                      <Badge className="mt-2 bg-green-500/90 text-[10px] shadow-sm shadow-green-500/30">
                        {prizeProgress.completedCycles}x entregado
                      </Badge>
                    )}
                    
                    {/* Remaining spins */}
                    <p className={`mt-1.5 text-[11px] font-medium ${prizeProgress.color}`}>
                      Faltan {prizeProgress.remaining.toLocaleString()} giros
                    </p>
                  </div>
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
            placeholder="Buscar por nombre o teléfono..."
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
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Boleto Ref.</TableHead>
                  <TableHead>Monto</TableHead>
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
                      {jugada.numero_boleto_referencia ? (
                        <span className="font-mono text-sm font-bold text-primary">#{jugada.numero_boleto_referencia}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {jugada.es_gratis || jugada.es_giro_gratis ? (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-400">GRATIS</Badge>
                      ) : (
                        <span className="font-medium">
                          {jugada.moneda === 'DOP' ? 'RD$' : 'US$'}
                          {jugada.monto}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {jugada.es_gratis || jugada.es_giro_gratis ? (
                        <Badge className="bg-blue-500">Verificador</Badge>
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
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedJugada(jugada)
                            setShowDetailModal(true)
                          }}
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {jugada.estado === 'pendiente' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                              onClick={() => handleUpdateEstado(jugada.id, 'confirmado', jugada.source_table)}
                              disabled={updating === jugada.id}
                              title="Aprobar"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                              onClick={() => handleUpdateEstado(jugada.id, 'cancelado', jugada.source_table)}
                              disabled={updating === jugada.id}
                              title="Cancelar"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {(jugada.estado === 'confirmado' || jugada.estado === 'cancelado' || jugada.estado === 'jugado') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white"
                            onClick={() => handleUpdateEstado(jugada.id, 'pendiente', jugada.source_table)}
                            disabled={updating === jugada.id}
                            title="Revertir a pendiente"
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                          onClick={() => {
                            setJugadaToDelete(jugada)
                            setShowDeleteModal(true)
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                  <p className="text-sm text-muted-foreground">Teléfono</p>
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
                  {/* Use native img with /api/file proxy to serve private Vercel Blob URLs */}
                  <img
                    src={`/api/file?pathname=${encodeURIComponent(selectedJugada.comprobante_url)}`}
                    alt="Comprobante de pago"
                    className="w-full rounded-lg object-contain"
                    style={{ maxHeight: '400px' }}
                    onError={(e) => {
                      // Fallback: try direct URL in case it's a public blob
                      const target = e.currentTarget
                      if (!target.src.includes('fallback')) {
                        target.src = selectedJugada.comprobante_url + '?fallback=1'
                      }
                    }}
                  />
                  <a
                    href={`/api/file?pathname=${encodeURIComponent(selectedJugada.comprobante_url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-center text-xs text-blue-400 underline"
                  >
                    Abrir en pantalla completa
                  </a>
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

      {/* Reset Confirmation Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="max-w-md border-red-500 bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              Restablecer Datos
            </DialogTitle>
            <DialogDescription>
              Selecciona el tipo de restablecimiento:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Option 1: Reset counters only */}
            <div 
              className={`cursor-pointer rounded-lg border p-4 transition-all ${
                resetType === 'counters' ? 'border-yellow-500 bg-yellow-500/10' : 'border-border hover:border-yellow-500/50'
              }`}
              onClick={() => setResetType('counters')}
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-yellow-500" />
                <h4 className="font-bold">Restablecer Contadores</h4>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Reinicia el contador de giros a 0. El historial permanece intacto.
              </p>
            </div>

            {/* Option 2: Reset everything */}
            <div 
              className={`cursor-pointer rounded-lg border p-4 transition-all ${
                resetType === 'all' ? 'border-red-500 bg-red-500/10' : 'border-border hover:border-red-500/50'
              }`}
              onClick={() => setResetType('all')}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                <h4 className="font-bold text-red-500">Volver a 0 (Eliminar TODO)</h4>
              </div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <p>• Todos los giros registrados</p>
                <p>• Historial de jugadores</p>
                <p>• Comprobantes de pago</p>
                <p>• Estadísticas y contadores</p>
              </div>
              <p className="mt-2 text-xs font-bold text-red-500">
Esta acción NO se puede deshacer
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResetModal(false)}
              disabled={isResetting}
            >
              Cancelar
            </Button>
            <Button
              variant={resetType === 'all' ? 'destructive' : 'default'}
              onClick={() => handleReset(resetType)}
              disabled={isResetting}
            >
              {isResetting ? 'Procesando...' : resetType === 'all' ? 'Eliminar Todo' : 'Restablecer Contadores'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Record Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md border-red-500 bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <Trash2 className="h-5 w-5" />
              Confirmar Eliminacion
            </DialogTitle>
            <DialogDescription>
              Estas a punto de eliminar este registro permanentemente.
            </DialogDescription>
          </DialogHeader>
          
          {jugadaToDelete && (
            <div className="rounded-lg bg-muted/50 p-4">
              <p><strong>Jugador:</strong> {jugadaToDelete.nombre}</p>
              <p><strong>Teléfono:</strong> {jugadaToDelete.telefono}</p>
              <p><strong>Estado:</strong> {jugadaToDelete.estado}</p>
              <p><strong>Monto:</strong> {jugadaToDelete.es_gratis || jugadaToDelete.es_giro_gratis ? 'GRATIS' : `${jugadaToDelete.moneda === 'DOP' ? 'RD$' : 'US$'}${jugadaToDelete.monto}`}</p>
            </div>
          )}

          <p className="text-center text-sm font-bold text-red-500">
            Esta accion NO se puede deshacer
          </p>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false)
                setJugadaToDelete(null)
              }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteJugada}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Si, Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

