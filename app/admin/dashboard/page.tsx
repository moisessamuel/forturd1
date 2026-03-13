'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  RefreshCw, 
  LogOut, 
  Settings, 
  DollarSign, 
  Users, 
  Clock, 
  Receipt,
  Check,
  X,
  Eye,
  Plus,
  Search,
  Hash,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Referido, Config, PurchaseGroup } from '@/lib/types'
import Image from 'next/image'

interface AdminStats {
  ventas_totales: number
  agentes_activos: number
  pagos_pendientes: number
  transacciones_totales: number
  boletos_asignados: number
  boletos_disponibles: number
  total_boletos: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [compras, setCompras] = useState<PurchaseGroup[]>([])
  const [referidos, setReferidos] = useState<Referido[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'pendiente' | 'aprobado' | 'rechazado'>('todos')
  
  
  // Config form
  const [totalBoletos, setTotalBoletos] = useState('')
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  
  // New referido form
  const [newReferidoNombre, setNewReferidoNombre] = useState('')
  const [newReferidoCodigo, setNewReferidoCodigo] = useState('')
  const [isCreatingReferido, setIsCreatingReferido] = useState(false)
  
  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  // Sections collapse state
  const [sectionsOpen, setSectionsOpen] = useState({
    config: true,
    pagos: true,
    compras: true,
    referidos: true,
    transacciones: true,
  })

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, configRes, comprasRes, referidosRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/config'),
        fetch(`/api/compras?estado=${estadoFilter}&search=${searchTerm}`),
        fetch('/api/referidos'),
      ])

      if (!statsRes.ok || !configRes.ok) {
        throw new Error('Error fetching data')
      }

      const [statsData, configData, comprasData, referidosData] = await Promise.all([
        statsRes.json(),
        configRes.json(),
        comprasRes.ok ? comprasRes.json() : [],
        referidosRes.ok ? referidosRes.json() : [],
      ])

      setStats(statsData)
      setConfig(configData)
      setTotalBoletos(configData.total_boletos.toString())
      setCompras(comprasData)
      setReferidos(referidosData)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setIsLoading(false)
    }
  }, [estadoFilter, searchTerm])

  useEffect(() => {
    // Check session
    fetch('/api/admin/session')
      .then(async (res) => {
        if (!res.ok) {
          router.push('/admin')
          return
        }
        const data = await res.json()
        setUsername(data.user.username)
        fetchData()
      })
      .catch(() => router.push('/admin'))
  }, [router, fetchData])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Sistema restablecido correctamente')
      setShowResetConfirm(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al restablecer')
    } finally {
      setIsResetting(false)
    }
  }

  const handleRefresh = () => {
    setIsLoading(true)
    fetchData()
    toast.success('Datos actualizados')
  }

  const handleSaveConfig = async () => {
    setIsSavingConfig(true)
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          total_boletos: parseInt(totalBoletos),
        }),
      })

      if (!response.ok) throw new Error('Error saving config')

      toast.success('Configuración guardada')
      fetchData()
    } catch {
      toast.error('Error al guardar configuración')
    } finally {
      setIsSavingConfig(false)
    }
  }

  const handleUpdateCompraEstado = async (id: string, estado: 'aprobado' | 'rechazado') => {
    try {
      const response = await fetch(`/api/compras/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      })

      if (!response.ok) throw new Error('Error updating compra')

      toast.success(estado === 'aprobado' ? 'Pago aprobado' : 'Pago rechazado')
      fetchData()
    } catch {
      toast.error('Error al actualizar el estado')
    }
  }

  const handleCreateReferido = async () => {
    if (!newReferidoNombre || !newReferidoCodigo) {
      toast.error('Por favor completa todos los campos')
      return
    }

    setIsCreatingReferido(true)
    try {
      const response = await fetch('/api/referidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_agente: newReferidoNombre,
          codigo: newReferidoCodigo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error creating referido')
      }

      toast.success('Referido creado exitosamente')
      setNewReferidoNombre('')
      setNewReferidoCodigo('')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear referido')
    } finally {
      setIsCreatingReferido(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `${new Intl.NumberFormat('es-DO').format(amount)} DOP`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const pendingPayments = compras.filter((c: PurchaseGroup) => c.estado === 'pendiente')

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="font-medium">ADMINISTRADOR DEL PANEL</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Sesión: <span className="text-foreground">{username}</span>
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 lg:p-6">
        {/* Title and actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-primary">Panel de Administración</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button 
              variant="outline" 
              className="text-red-500 border-red-500/50 hover:bg-red-500/10"
              onClick={() => setShowResetConfirm(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              Restablecer
            </Button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-red-500/30 bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-red-500">ADVERTENCIA</h3>
              </div>
              <p className="mb-2 text-base font-medium text-foreground">
                Esta acción es irreversible.
              </p>
              <p className="mb-6 text-sm text-muted-foreground">
                {'Al restablecer el sistema, se eliminarán TODAS las compras, boletos asignados, comprobantes de pago y datos de referidos. Todo volverá a cero como si fuera un sistema nuevo. ¿Está seguro de continuar?'}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  onClick={handleReset}
                  disabled={isResetting}
                >
                  {isResetting ? 'Restableciendo...' : 'Sí, confirmo restablecer'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Config Section */}
        <Card className="mb-6 border-border/50 bg-card">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('config')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-primary">
                <Settings className="h-5 w-5" />
                Configuración de Boletos
              </span>
              {sectionsOpen.config ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {sectionsOpen.config && (
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <Hash className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Total de boletos</p>
                      <p className="text-xs text-muted-foreground">
                        Define el rango máximo de boletos (1 hasta N)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={totalBoletos}
                      onChange={(e) => setTotalBoletos(e.target.value)}
                      className="bg-input"
                    />
                    <Button 
                      onClick={handleSaveConfig}
                      disabled={isSavingConfig}
                      className="bg-primary text-primary-foreground"
                    >
                      {isSavingConfig ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Los números de boleto se generan aleatoriamente dentro de este rango. No se pueden repetir.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-border/50 bg-secondary/50">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">TOTAL</p>
                      <p className="text-2xl font-bold text-primary">
                        {stats?.total_boletos.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50 bg-secondary/50">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">ASIGNADOS</p>
                      <p className="text-2xl font-bold text-blue-500">
                        {stats?.boletos_asignados.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border/50 bg-secondary/50">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground">DISPONIBLES</p>
                      <p className="text-2xl font-bold text-green-500">
                        {stats?.boletos_disponibles.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Stats cards */}
              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <DollarSign className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Ventas Totales</p>
                      <p className="text-xl font-bold">{formatCurrency(stats?.ventas_totales || 0)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Users className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Agentes Activos</p>
                      <p className="text-xl font-bold">{stats?.agentes_activos || 0}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Clock className="h-8 w-8 text-yellow-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pagos Pendientes</p>
                      <p className="text-xl font-bold">{stats?.pagos_pendientes || 0}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Receipt className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Transacciones totales</p>
                      <p className="text-xl font-bold">{stats?.transacciones_totales || 0}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Pending Payments Section */}
        <Card className="mb-6 border-border/50 bg-card">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('pagos')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                Pagos Pendientes de Validación
              </span>
              {sectionsOpen.pagos ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {sectionsOpen.pagos && (
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Boleto #</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Boletos</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Referido</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                          No hay pagos pendientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingPayments.map((pg: PurchaseGroup) => (
                        <TableRow key={pg.id}>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {pg.tickets?.map((t) => (
                                <Badge key={t.id} variant="outline" className="bg-primary/20 text-primary text-xs">
                                  #{t.numero_boleto.padStart(5, '0')}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-600 text-white">
                              {pg.player?.nombre?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '?'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{pg.player?.phone_number}</TableCell>
                          <TableCell>{pg.total_tickets}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(pg.monto)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-500/20 text-green-500">
                              {pg.banco}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pg.referido_codigo ? (
                              <Badge variant="outline">{pg.referido_codigo}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(pg.created_at)}</TableCell>
                          <TableCell>
                            {pg.comprobante_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Comprobante de Pago</DialogTitle>
                                  </DialogHeader>
                                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                    <Image
                                      src={pg.comprobante_url}
                                      alt="Comprobante"
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 text-white hover:bg-green-700"
                                onClick={() => handleUpdateCompraEstado(pg.id, 'aprobado')}
                              >
                                <Check className="mr-1 h-4 w-4" />
                                Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleUpdateCompraEstado(pg.id, 'rechazado')}
                              >
                                <X className="mr-1 h-4 w-4" />
                                Rechazar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Compras Section */}
        <Card className="mb-6 border-border/50 bg-card">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('compras')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-primary">
                <Receipt className="h-5 w-5" />
                Compras de Boletos
              </span>
              {sectionsOpen.compras ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {sectionsOpen.compras && (
            <CardContent>
              {/* Stats cards */}
              <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">COMPRAS APROBADAS</p>
                    <p className="text-2xl font-bold text-green-500">
                      {compras.filter((c: PurchaseGroup) => c.estado === 'aprobado').length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(compras.filter((c: PurchaseGroup) => c.estado === 'aprobado').reduce((s: number, c: PurchaseGroup) => s + c.monto, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">CON REFERIDO</p>
                        <p className="text-2xl font-bold">{compras.filter((c: PurchaseGroup) => c.referido_codigo).length}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(compras.filter((c: PurchaseGroup) => c.referido_codigo).reduce((s: number, c: PurchaseGroup) => s + c.monto, 0))}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">COMPRA DIRECTA</p>
                    <p className="text-2xl font-bold">{compras.filter((c: PurchaseGroup) => !c.referido_codigo).length}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(compras.filter((c: PurchaseGroup) => !c.referido_codigo).reduce((s: number, c: PurchaseGroup) => s + c.monto, 0))}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">BOLETOS VENDIDOS</p>
                    <p className="text-2xl font-bold text-primary">
                      {compras.filter((c: PurchaseGroup) => c.estado === 'aprobado').reduce((s: number, c: PurchaseGroup) => s + c.total_tickets, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">boletos aprobados</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="mb-4 flex flex-wrap gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nombre, teléfono, boleto, cédula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-input pl-9"
                  />
                </div>
                
                <div className="flex gap-2">
                  {(['todos', 'pendiente', 'aprobado', 'rechazado'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant={estadoFilter === filter ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEstadoFilter(filter)}
                      className={estadoFilter === filter ? 'bg-primary text-primary-foreground' : ''}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Boletos</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Cedula</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Referido</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Comprobante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compras.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground">
                          {searchTerm ? 'No se encontraron resultados' : 'No hay compras registradas'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      compras.map((pg: PurchaseGroup) => (
                        <TableRow key={pg.id}>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-48">
                              {pg.tickets?.map((t) => (
                                <Badge key={t.id} variant="outline" className="bg-primary/20 text-primary text-xs">
                                  #{t.numero_boleto.padStart(5, '0')}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-600 text-white">
                              {pg.player?.nombre?.split(' ').slice(0, 2).join(' ') || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{pg.player?.phone_number}</TableCell>
                          <TableCell>{pg.player?.cedula || '-'}</TableCell>
                          <TableCell>{pg.total_tickets}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(pg.monto)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-500/20 text-green-500">
                              {pg.banco}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pg.referido_codigo ? (
                              <Badge variant="outline">{pg.referido_codigo}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                pg.estado === 'aprobado'
                                  ? 'bg-green-500 text-white'
                                  : pg.estado === 'rechazado'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-yellow-500 text-black'
                              }
                            >
                              {pg.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{formatDate(pg.created_at)}</TableCell>
                          <TableCell>
                            {pg.comprobante_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" /> Ver
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Comprobante de Pago</DialogTitle>
                                  </DialogHeader>
                                  <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                                    <Image
                                      src={pg.comprobante_url}
                                      alt="Comprobante"
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-right text-xs text-muted-foreground">
                {compras.length} resultados
              </p>
            </CardContent>
          )}
        </Card>

        {/* Bottom two columns */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Referidos Section */}
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Gestión de Referidos</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Create new referido */}
              <div className="mb-4 rounded-lg border border-border/50 bg-secondary/50 p-4">
                <p className="mb-3 text-sm font-medium">CREAR NUEVO ENLACE</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del Agente"
                    value={newReferidoNombre}
                    onChange={(e) => setNewReferidoNombre(e.target.value)}
                    className="flex-1 bg-input"
                  />
                  <Input
                    placeholder="Código (ej. JUAN10)"
                    value={newReferidoCodigo}
                    onChange={(e) => setNewReferidoCodigo(e.target.value.toUpperCase())}
                    className="w-40 bg-input"
                  />
                  <Button
                    onClick={handleCreateReferido}
                    disabled={isCreatingReferido}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Referidos table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agente</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Ventas Aprobadas</TableHead>
                      <TableHead>Ventas (DOP)</TableHead>
                      <TableHead>Comisión (10%)</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referidos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No hay referidos registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      referidos.map((referido: Referido & { ventas_aprobadas?: number; comision?: number }) => (
                        <TableRow key={referido.id}>
                          <TableCell>{referido.nombre_agente}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{referido.codigo}</Badge>
                          </TableCell>
                          <TableCell>{referido.ventas_aprobadas || 0}</TableCell>
                          <TableCell>{formatCurrency(referido.ventas_aprobadas || 0)}</TableCell>
                          <TableCell className="text-green-500">
                            {formatCurrency(referido.comision || 0)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-500/10 hover:text-red-400"
                              onClick={async () => {
                                if (!confirm(`Seguro que deseas eliminar al referido "${referido.nombre_agente}" (${referido.codigo})?`)) return
                                try {
                                  const res = await fetch(`/api/referidos?id=${referido.id}`, { method: 'DELETE' })
                                  if (!res.ok) throw new Error('Error al eliminar')
                                  toast.success('Referido eliminado')
                                  fetchData()
                                } catch {
                                  toast.error('Error al eliminar referido')
                                }
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* All Transactions Section */}
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Todas las Transacciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Boleto #</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compras.slice(0, 20).map((pg: PurchaseGroup) => (
                      <TableRow key={pg.id}>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {pg.tickets?.slice(0, 3).map((t) => (
                              <Badge key={t.id} variant="outline" className="bg-primary/20 text-primary text-xs">
                                #{t.numero_boleto.padStart(5, '0')}
                              </Badge>
                            ))}
                            {(pg.tickets?.length || 0) > 3 && (
                              <Badge variant="outline" className="text-xs">+{(pg.tickets?.length || 0) - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-600 text-white">
                            {pg.player?.nombre?.split(' ').slice(0, 2).join(' ') || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{pg.player?.phone_number}</TableCell>
                        <TableCell>{formatCurrency(pg.monto)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-500/20 text-green-500">
                            {pg.banco}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              pg.estado === 'aprobado'
                                ? 'bg-green-500 text-white'
                                : pg.estado === 'rechazado'
                                ? 'bg-red-500 text-white'
                                : 'bg-yellow-500 text-black'
                            }
                          >
                            {pg.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
