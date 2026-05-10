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
import { Slider } from '@/components/ui/slider'
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
  const [progress, setProgress] = useState(0)
  const [isSavingProgress, setIsSavingProgress] = useState(false)
  
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

      // Fire all 3 independent requests in parallel
      const [sorteoRes, statsRes, comprasRes] = await Promise.all([
        fetch(`/api/sorteos?slug=${sorteoSlug}`),
        fetch(`/api/admin/sorteo-stats?slug=${sorteoSlug}`),
        fetch(`/api/admin/sorteo-compras?sorteo_slug=${sorteoSlug}&estado=${estadoFilter}&search=${searchTerm}`),
      ])

      const [sorteoData, statsData, comprasData] = await Promise.all([
        sorteoRes.json(),
        statsRes.json(),
        comprasRes.json(),
      ])

      setSorteo(sorteoData)
      setStats(statsData)
      // progreso_manual already included in sorteo select('*') — no extra fetch needed
      setProgress(sorteoData.progreso_manual || 0)

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
    fetchData()
  }, [fetchData])

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

  const handleProgressChange = async (value: number[]) => {
    const newProgress = value[0]
    setProgress(newProgress)
    
    try {
      setIsSavingProgress(true)
      
      const response = await fetch(`/api/sorteos/${sorteoSlug}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ porcentaje: newProgress }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar progreso')
      }
      
      toast.success(`Progreso actualizado a ${newProgress.toFixed(2)}%`)
    } catch (error) {
      console.error('Error saving progress:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar el progreso')
      setProgress(0)
      await fetchData()
    } finally {
      setIsSavingProgress(false)
    }
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    // Formato compacto: 07/05 14:30
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    return `${day}/${month} ${hours}:${mins}`
  }

  // Truncar texto largo con tooltip
  const truncateText = (text: string, maxLen: number = 20) => {
    if (!text || text.length <= maxLen) return text
    return text.slice(0, maxLen) + '...'
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
        return <Badge className="bg-green-600 px-1.5 py-0 text-[10px]">OK</Badge>
      case 'rechazado':
        return <Badge className="bg-red-600 px-1.5 py-0 text-[10px]">No</Badge>
      default:
        return <Badge className="bg-yellow-600 px-1.5 py-0 text-[10px]">Pend.</Badge>
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
                Estadísticas - {sorteo?.nombre}
              </CardTitle>
              {sectionsOpen.stats ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
          {sectionsOpen.stats && (
            <CardContent>
              {/* Progress Control */}
              <div className="mb-6 rounded-lg bg-primary/5 p-4 border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground">
                    Progreso del Sorteo
                  </label>
                  <span className="text-lg font-bold text-primary">
                    {typeof progress === 'number' ? progress.toFixed(2) : progress}%
                  </span>
                </div>
                <Slider
                  value={[progress]}
                  onValueChange={handleProgressChange}
                  min={0}
                  max={100}
                  step={0.01}
                  disabled={isSavingProgress}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Ajusta el porcentaje de progreso del sorteo. Los cambios se guardan automáticamente.
                </p>
              </div>

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
                    placeholder="Buscar por nombre o teléfono..."
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

              {/* Table - Compacta */}
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="text-[11px]">
                      <TableHead className="px-2 py-2">Boleto</TableHead>
                      <TableHead className="px-2 py-2">Comprador</TableHead>
                      <TableHead className="px-2 py-2">Tel.</TableHead>
                      <TableHead className="px-2 py-2">Correo</TableHead>
                      <TableHead className="px-2 py-2">Ref.</TableHead>
                      <TableHead className="px-2 py-2 text-center">Qty</TableHead>
                      <TableHead className="px-2 py-2">Monto</TableHead>
                      <TableHead className="px-2 py-2">Banco</TableHead>
                      <TableHead className="px-2 py-2">Fecha</TableHead>
                      <TableHead className="px-2 py-2">Estado</TableHead>
                      <TableHead className="px-2 py-2 text-center">Comp.</TableHead>
                      <TableHead className="px-2 py-2">Acc.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compras.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="py-4 text-center text-muted-foreground">
                          No hay compras para este sorteo
                        </TableCell>
                      </TableRow>
                    ) : (
                      compras.map((compra) => (
                        <TableRow key={compra.id} className="text-[11px]">
                          <TableCell className="px-2 py-1.5">
                            {compra.numeros_boletos && compra.numeros_boletos.length > 0 ? (
                              <div className="flex flex-wrap gap-0.5">
                                {compra.numeros_boletos.map((num: string) => (
                                  <Badge key={num} variant="outline" className="px-1 py-0 text-[10px] font-mono text-primary border-primary/50">
                                    #{num}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 font-medium max-w-[120px]" title={compra.nombre || compra.player?.nombre || ''}>
                            {truncateText(compra.nombre || compra.player?.nombre || 'N/A', 18)}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 whitespace-nowrap">{compra.telefono || compra.player?.phone_number || 'N/A'}</TableCell>
                          <TableCell className="px-2 py-1.5 text-muted-foreground max-w-[100px]" title={compra.email || compra.player?.email || ''}>
                            {compra.email || compra.player?.email 
                              ? truncateText(compra.email || compra.player?.email || '', 15)
                              : <span className="italic">Sin correo</span>
                            }
                          </TableCell>
                          <TableCell className="px-2 py-1.5">
                            {compra.referido_codigo
                              ? <span className="rounded bg-primary/10 px-1 py-0 font-mono text-[10px] text-primary">{compra.referido_codigo}</span>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell className="px-2 py-1.5 text-center">{compra.cantidad_boletos || compra.total_tickets || 1}</TableCell>
                          <TableCell className="px-2 py-1.5 whitespace-nowrap font-medium">
                            {formatCurrency(compra.monto, compra.moneda)}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 max-w-[80px]" title={compra.banco || ''}>
                            {truncateText(compra.banco || 'N/A', 12)}
                          </TableCell>
                          <TableCell className="px-2 py-1.5 whitespace-nowrap text-muted-foreground">
                            {formatDateTime(compra.created_at)}
                          </TableCell>
                          <TableCell className="px-2 py-1.5">{getEstadoBadge(compra.estado)}</TableCell>
                          <TableCell className="px-2 py-1.5 text-center">
                            {compra.comprobante_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Comprobante de Pago</DialogTitle>
                                  </DialogHeader>
                                  <div className="relative w-full overflow-hidden rounded-lg">
                                    {/* Use native img with /api/file proxy for private Vercel Blob URLs */}
                                    <img
                                      src={`/api/file?pathname=${encodeURIComponent(compra.comprobante_url)}`}
                                      alt="Comprobante de pago"
                                      className="w-full rounded-lg object-contain"
                                      style={{ maxHeight: '70vh' }}
                                      onError={(e) => {
                                        // Fallback: try direct URL
                                        const target = e.currentTarget
                                        if (!target.src.includes('fallback')) {
                                          target.src = compra.comprobante_url + '?fallback=1'
                                        }
                                      }}
                                    />
                                    <a
                                      href={`/api/file?pathname=${encodeURIComponent(compra.comprobante_url)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-2 block text-center text-sm text-blue-400 hover:underline"
                                    >
                                      Abrir en pantalla completa
                                    </a>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-1.5">
                            <div className="flex gap-0.5">
                              {compra.estado === 'pendiente' && (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-green-500 hover:text-green-600"
                                    onClick={() => handleApprove(compra.id)}
                                    title="Aprobar"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-red-500 hover:text-red-600"
                                    onClick={() => handleReject(compra.id)}
                                    title="Rechazar"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {(compra.estado === 'rechazado' || compra.estado === 'aprobado') && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-yellow-500 hover:text-yellow-600"
                                  onClick={() => handleReset(compra.id)}
                                  title="Restablecer a pendiente"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-400 hover:text-red-500"
                                onClick={() => handleDelete(compra.id)}
                                title="Eliminar compra"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
