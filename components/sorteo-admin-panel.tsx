'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  RefreshCw, 
  LogOut, 
  DollarSign, 
  Users, 
  Clock, 
  Receipt,
  Check,
  X,
  Eye,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
  Trash2,
  ArrowLeft,
  Settings
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
import type { PurchaseGroup, Sorteo } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'

interface SorteoAdminStats {
  ventas_totales: number
  ventas_dop: number
  ventas_usd: number
  pagos_pendientes: number
  transacciones_totales: number
  boletos_vendidos: number
  boletos_disponibles: number
  total_boletos: number
}

interface SorteoAdminPanelProps {
  sorteoSlug: string
}

export function SorteoAdminPanel({ sorteoSlug }: SorteoAdminPanelProps) {
  const router = useRouter()
  const [sorteo, setSorteo] = useState<Sorteo | null>(null)
  const [stats, setStats] = useState<SorteoAdminStats | null>(null)
  const [compras, setCompras] = useState<PurchaseGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'pendiente' | 'aprobado' | 'rechazado'>('todos')
  
  // Sections collapse state
  const [sectionsOpen, setSectionsOpen] = useState({
    stats: true,
    compras: true,
  })

  // Image preview
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Fetch sorteo info
      const sorteoRes = await fetch(`/api/sorteos?slug=${sorteoSlug}`)
      const sorteoData = await sorteoRes.json()
      setSorteo(sorteoData)
      
      // Fetch stats for this sorteo
      const statsRes = await fetch(`/api/admin/sorteo-stats?slug=${sorteoSlug}`)
      const statsData = await statsRes.json()
      setStats(statsData)
      
      // Fetch compras for this sorteo using the dedicated admin endpoint
      const comprasRes = await fetch(`/api/admin/sorteo-compras?sorteo_slug=${sorteoSlug}&estado=${estadoFilter}&search=${searchTerm}`)
      const comprasData = await comprasRes.json()
      
      if (Array.isArray(comprasData)) {
        setCompras(comprasData)
      } else {
        console.error('Invalid compras data:', comprasData)
        setCompras([])
      }
      
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }, [sorteoSlug, estadoFilter, searchTerm])

  useEffect(() => {
    // Check authentication using sessionStorage based on sorteo
    // Only run on client-side
    if (typeof window === 'undefined') return
    
    let isAuth = false
    if (sorteoSlug === 'bmw-x6') {
      isAuth = !!sessionStorage.getItem('bmwx6_admin_session')
    } else if (sorteoSlug === 'bmw-x7') {
      isAuth = !!sessionStorage.getItem('bmwx7_admin_session')
    }
    
    if (!isAuth) {
      router.push('/admin')
      return
    }
    
    fetchData()
  }, [fetchData, router, sorteoSlug])

  const handleLogout = () => {
    // Clear session based on sorteo
    if (sorteoSlug === 'bmw-x6') {
      sessionStorage.removeItem('bmwx6_admin_session')
    } else if (sorteoSlug === 'bmw-x7') {
      sessionStorage.removeItem('bmwx7_admin_session')
    }
    router.push('/admin')
  }

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch('/api/admin/sorteo-compras', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: 'aprobado' }),
      })
      
      if (!response.ok) throw new Error('Error al aprobar')
      
      toast.success('Compra aprobada exitosamente')
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Error al aprobar la compra')
    }
  }

  const handleReject = async (id: string) => {
    try {
      const response = await fetch('/api/admin/sorteo-compras', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: 'rechazado' }),
      })
      
      if (!response.ok) throw new Error('Error al rechazar')
      
      toast.success('Compra rechazada')
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Error al rechazar la compra')
    }
  }

  const handleReset = async (id: string) => {
    try {
      const response = await fetch('/api/admin/sorteo-compras', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: 'pendiente' }),
      })
      
      if (!response.ok) throw new Error('Error al restablecer')
      
      toast.success('Compra restablecida a pendiente')
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Error al restablecer la compra')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta compra? Esta acción no se puede deshacer.')) {
      return
    }
    
    try {
      const response = await fetch('/api/admin/sorteo-compras', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      
      if (!response.ok) throw new Error('Error al eliminar')
      
      toast.success('Compra eliminada exitosamente')
      fetchData()
    } catch (error) {
      console.error(error)
      toast.error('Error al eliminar la compra')
    }
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setEstadoFilter('todos')
    fetchData()
    toast.success('Filtros restablecidos')
  }

  const formatCurrency = (amount: number, currency: string = 'DOP') => {
    if (currency === 'USD') {
      return `US$ ${new Intl.NumberFormat('en-US').format(amount)}`
    }
    return `RD$ ${new Intl.NumberFormat('es-DO').format(amount)}`
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return <Badge className="bg-green-600">Aprobado</Badge>
      case 'rechazado':
        return <Badge className="bg-red-600">Rechazado</Badge>
      default:
        return <Badge className="bg-yellow-600">Pendiente</Badge>
    }
  }

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Cargando panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Panel Principal
              </Button>
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-bold text-primary">
              Admin: {sorteo?.nombre || sorteoSlug}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restablecer
            </Button>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Stats Section */}
        <Card className="mb-6">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('stats')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Estadisticas - {sorteo?.nombre}
              </CardTitle>
              {sectionsOpen.stats ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
          {sectionsOpen.stats && (
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Ventas DOP</p>
                    <p className="text-2xl font-bold text-green-500">
                      {formatCurrency(stats?.ventas_dop || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/30">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Ventas USD</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {formatCurrency(stats?.ventas_usd || 0, 'USD')}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-500/10 border-yellow-500/30">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Pendientes</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {stats?.pagos_pendientes || 0}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-500/10 border-purple-500/30">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Boletos Vendidos</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {stats?.boletos_vendidos || 0} / 99,999
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Compras Section */}
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('compras')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Compras de {sorteo?.nombre}
              </CardTitle>
              {sectionsOpen.compras ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
          {sectionsOpen.compras && (
            <CardContent>
              {/* Filters */}
              <div className="mb-4 flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o telefono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value as typeof estadoFilter)}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="aprobado">Aprobados</option>
                  <option value="rechazado">Rechazados</option>
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Telefono</TableHead>
                      <TableHead>Boletos</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Comprobante</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compras.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No hay compras para este sorteo
                        </TableCell>
                      </TableRow>
                    ) : (
                      compras.map((compra) => (
                        <TableRow key={compra.id}>
                          <TableCell className="font-medium">
                            {compra.nombre || compra.player?.nombre || 'N/A'}
                          </TableCell>
                          <TableCell>{compra.telefono || compra.player?.phone_number || 'N/A'}</TableCell>
                          <TableCell>{compra.cantidad_boletos || compra.total_tickets || 1}</TableCell>
                          <TableCell>
                            {formatCurrency(compra.monto, compra.moneda)}
                          </TableCell>
                          <TableCell>{compra.banco || 'N/A'}</TableCell>
                          <TableCell>{getEstadoBadge(compra.estado)}</TableCell>
                          <TableCell>
                            {compra.comprobante_url && (
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
                                      src={compra.comprobante_url}
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
                            <div className="flex gap-1">
                              {compra.estado === 'pendiente' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-green-500 hover:text-green-600"
                                    onClick={() => handleApprove(compra.id)}
                                    title="Aprobar"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => handleReject(compra.id)}
                                    title="Rechazar"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {(compra.estado === 'rechazado' || compra.estado === 'aprobado') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-yellow-500 hover:text-yellow-600"
                                  onClick={() => handleReset(compra.id)}
                                  title="Restablecer a pendiente"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-500"
                                onClick={() => handleDelete(compra.id)}
                                title="Eliminar compra"
                              >
                                <Trash2 className="h-4 w-4" />
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
      </div>
    </div>
  )
}
