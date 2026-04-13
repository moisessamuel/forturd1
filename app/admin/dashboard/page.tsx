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
  AlertTriangle,
  RotateCcw,
  Trash2,
  Pencil
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  ventas_dop: number
  ventas_usd: number
  agentes_activos: number
  pagos_pendientes: number
  transacciones_totales: number
  boletos_asignados: number
  boletos_disponibles: number
  total_boletos: number
}

// v1.2 - Added referido cedula, telefono, search
export default function AdminDashboard() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [userRole, setUserRole] = useState<string>('admin')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [config, setConfig] = useState<Config | null>(null)
  const [compras, setCompras] = useState<PurchaseGroup[]>([])
  const [referidos, setReferidos] = useState<Referido[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'pendiente' | 'aprobado' | 'rechazado'>('todos')
  const [pendingSearchTerm, setPendingSearchTerm] = useState('')
  
  // Config form
  const [totalBoletos, setTotalBoletos] = useState('')
  const [manualProgress, setManualProgress] = useState(0)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  
  // New referido form
  const [newReferidoNombre, setNewReferidoNombre] = useState('')
  const [newReferidoCodigo, setNewReferidoCodigo] = useState('')
  const [newReferidoCedula, setNewReferidoCedula] = useState('')
  const [newReferidoTelefono, setNewReferidoTelefono] = useState('')
  const [isCreatingReferido, setIsCreatingReferido] = useState(false)
  const [referidoSearch, setReferidoSearch] = useState('')
  
  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Revert to pending
  const [revertingId, setRevertingId] = useState<string | null>(null)
  const [revertMotivo, setRevertMotivo] = useState('')
  const [isReverting, setIsReverting] = useState(false)
  
  // Delete purchase
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Edit player data (for boleto_fisico panel)
  const [editingPlayer, setEditingPlayer] = useState<{ id: string; nombre: string; phone_number: string; email: string } | null>(null)
  const [isEditingPlayer, setIsEditingPlayer] = useState(false)

  // Reset for boleto_fisico
  const [showResetBoletoFisico, setShowResetBoletoFisico] = useState(false)
  const [isResettingBoletoFisico, setIsResettingBoletoFisico] = useState(false)
  
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
      setManualProgress(configData.manual_progress || 0)
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
    fetch('/api/admin/session')
      .then(async (res) => {
        if (!res.ok) {
          router.push('/admin')
          return
        }
        const data = await res.json()
        setUsername(data.user.username)
        setUserRole(data.user.role || 'admin')
        fetchData()
      })
      .catch(() => router.push('/admin'))
  }, [router, fetchData])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin')
    } catch {
      toast.error('Error al cerrar sesion')
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

  // Update player data (name, phone, email)
  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return
    setIsEditingPlayer(true)
    try {
      const res = await fetch(`/api/players/${editingPlayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editingPlayer.nombre,
          phone_number: editingPlayer.phone_number,
          email: editingPlayer.email || null,
        }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      toast.success('Datos del comprador actualizados')
      setEditingPlayer(null)
      fetchData()
    } catch {
      toast.error('Error al actualizar los datos')
    } finally {
      setIsEditingPlayer(false)
    }
  }

  // Reset only boleto_fisico purchases
  const handleResetBoletoFisico = async () => {
    setIsResettingBoletoFisico(true)
    try {
      const res = await fetch('/api/admin/reset-boleto-fisico', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Boletos fisicos restablecidos correctamente')
      setShowResetBoletoFisico(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al restablecer')
    } finally {
      setIsResettingBoletoFisico(false)
    }
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
          manual_progress: manualProgress,
        }),
      })

      if (!response.ok) throw new Error('Error saving config')

      toast.success('Configuracion guardada')
      fetchData()
    } catch {
      toast.error('Error al guardar configuracion')
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

  const handleRevertToPending = async () => {
    if (!revertingId || !revertMotivo.trim()) {
      toast.error('Debe ingresar un motivo para la reversion')
      return
    }
    setIsReverting(true)
    try {
      const response = await fetch(`/api/compras/${revertingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'pendiente', motivo: revertMotivo.trim() }),
      })

      if (!response.ok) throw new Error('Error al revertir')

      toast.success('Compra revertida a pendiente')
      setRevertingId(null)
      setRevertMotivo('')
      fetchData()
    } catch {
      toast.error('Error al revertir la compra')
    } finally {
      setIsReverting(false)
    }
  }

  const handleDeletePurchase = async () => {
    if (!deletingId) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/compras/${deletingId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Error al eliminar')

      toast.success('Compra eliminada completamente. Los numeros de boletos estan disponibles nuevamente.')
      setDeletingId(null)
      fetchData()
    } catch {
      toast.error('Error al eliminar la compra')
    } finally {
      setIsDeleting(false)
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
          cedula: newReferidoCedula,
          telefono: newReferidoTelefono,
          created_by: userRole === 'referido_plus' ? 'referido_plus_gamundi' : 'admin',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error creating referido')
      }

      toast.success('Referido creado exitosamente')
      setNewReferidoNombre('')
      setNewReferidoCodigo('')
      setNewReferidoCedula('')
      setNewReferidoTelefono('')
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear referido')
    } finally {
      setIsCreatingReferido(false)
    }
  }

  const formatCurrency = (amount: number, moneda: string = 'DOP') => {
    if (moneda === 'USD') {
      return `US$ ${new Intl.NumberFormat('en-US').format(amount)}`
    }
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

  // Filter compras based on user role
  // Helper: check if a purchase belongs to the "boleto fisico" panel
  const isBoletoFisicoCompra = (c: PurchaseGroup) => {
    const refCode = (c.referido_codigo || '').toUpperCase()
    const buyerName = (c.player?.nombre || '').toLowerCase()
    return refCode === 'BOLETOFISICO' || buyerName.includes('boleto fisico') || buyerName.includes('boletofisico')
  }

  const filteredCompras = userRole === 'referido_plus' 
    ? compras.filter((c: PurchaseGroup) => (c.referido_codigo || '').toUpperCase() === 'GAMUNDI')
    : userRole === 'boleto_fisico'
    ? compras.filter((c: PurchaseGroup) => isBoletoFisicoCompra(c))
    : compras.filter((c: PurchaseGroup) => !isBoletoFisicoCompra(c))

  // Filter pending payments with optional search by ticket number
  const pendingPayments = filteredCompras
    .filter((c: PurchaseGroup) => c.estado === 'pendiente')
    .filter((c: PurchaseGroup) => {
      if (!pendingSearchTerm.trim()) return true
      const term = pendingSearchTerm.toLowerCase().replace('#', '')
      return c.tickets?.some((t) => t.numero_boleto.toLowerCase().includes(term))
    })

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
            <div className={`h-3 w-3 rounded-full ${userRole === 'referido_plus' ? 'bg-green-500' : userRole === 'boleto_fisico' ? 'bg-cyan-500' : 'bg-primary'}`} />
            <span className="font-medium">
              {userRole === 'referido_plus' ? 'REFERIDO PLUS GAMUNDI' : userRole === 'boleto_fisico' ? 'PANEL DE BOLETOS FISICOS' : 'ADMINISTRADOR DEL PANEL'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {'Sesion: '}<span className="text-foreground">{username}</span>
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
          <h1 className={`text-2xl font-bold ${userRole === 'referido_plus' ? 'text-green-500' : userRole === 'boleto_fisico' ? 'text-cyan-500' : 'text-primary'}`}>
            {userRole === 'referido_plus' ? 'Panel Referido Plus Gamundi' : userRole === 'boleto_fisico' ? 'Panel de Boletos Fisicos' : 'Panel de Administracion'}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            {userRole === 'admin' && (
              <Button 
                variant="outline" 
                className="text-red-500 border-red-500/50 hover:bg-red-500/10"
                onClick={() => setShowResetConfirm(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Restablecer
              </Button>
            )}
            {userRole === 'boleto_fisico' && (
              <Button 
                variant="outline" 
                className="text-red-500 border-red-500/50 hover:bg-red-500/10"
                onClick={() => setShowResetBoletoFisico(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Restablecer
              </Button>
            )}
          </div>
        </div>

        {/* Reset Boleto Fisico Confirmation Modal */}
        {showResetBoletoFisico && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-red-500/30 bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                  <Settings className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-red-500">Restablecer Boletos Fisicos</h3>
              </div>
              <p className="mb-6 text-foreground/80">
                Esta accion eliminara TODOS los boletos fisicos (compras con referido BOLETOFISICO o nombre &quot;Boleto Fisico&quot;). 
                Esta accion no puede deshacerse. Los boletos del panel administrativo NO seran afectados.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowResetBoletoFisico(false)}
                  disabled={isResettingBoletoFisico}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  onClick={handleResetBoletoFisico}
                  disabled={isResettingBoletoFisico}
                >
                  {isResettingBoletoFisico ? 'Restableciendo...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          </div>
        )}

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
                {'Esta accion es irreversible.'}
              </p>
              <p className="mb-6 text-sm text-muted-foreground">
                {'Al restablecer el sistema, se eliminaran TODAS las compras, boletos asignados, comprobantes de pago y datos de referidos. Todo volvera a cero como si fuera un sistema nuevo. Esta seguro de continuar?'}
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
                  {isResetting ? 'Restableciendo...' : 'Si, confirmo restablecer'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Player Modal */}
        {editingPlayer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-cyan-500/30 bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10">
                  <Pencil className="h-6 w-6 text-cyan-500" />
                </div>
                <h3 className="text-xl font-bold text-cyan-500">Editar Datos del Comprador</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Nombre</label>
                  <Input
                    value={editingPlayer.nombre}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, nombre: e.target.value })}
                    placeholder="Nombre completo"
                    className="bg-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Telefono</label>
                  <Input
                    value={editingPlayer.phone_number}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, phone_number: e.target.value })}
                    placeholder="Numero de telefono"
                    className="bg-input"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Correo Electronico</label>
                  <Input
                    value={editingPlayer.email}
                    onChange={(e) => setEditingPlayer({ ...editingPlayer, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="bg-input"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingPlayer(null)}
                  disabled={isEditingPlayer}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-cyan-600 text-white hover:bg-cyan-700"
                  onClick={handleUpdatePlayer}
                  disabled={isEditingPlayer}
                >
                  {isEditingPlayer ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Revert Confirmation Modal */}
        {revertingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-yellow-500/30 bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                  <RotateCcw className="h-6 w-6 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-yellow-500">Revertir a Pendiente</h3>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                {'Esta accion revertira el estado de esta compra a pendiente para ser verificada nuevamente. Los boletos asociados tambien volveran a estado pendiente.'}
              </p>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-foreground">
                  {'Motivo de reversion *'}
                </label>
                <Textarea
                  placeholder="Escriba el motivo por el cual revierte esta compra..."
                  value={revertMotivo}
                  onChange={(e) => setRevertMotivo(e.target.value)}
                  className="bg-input"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setRevertingId(null)
                    setRevertMotivo('')
                  }}
                  disabled={isReverting}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-yellow-600 text-white hover:bg-yellow-700"
                  onClick={handleRevertToPending}
                  disabled={isReverting || !revertMotivo.trim()}
                >
                  {isReverting ? 'Revirtiendo...' : 'Confirmar Reversion'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-red-500/30 bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                  <Trash2 className="h-6 w-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-red-500">Eliminar Compra</h3>
              </div>
              <p className="mb-2 text-sm text-muted-foreground">
                {'Esta accion eliminara permanentemente:'}
              </p>
              <ul className="mb-4 ml-4 list-disc text-sm text-muted-foreground">
                <li>La compra y todos sus datos</li>
                <li>Los boletos asociados (quedaran disponibles para otros)</li>
                <li>El QR de validacion</li>
                <li>Los datos del jugador (si no tiene otras compras)</li>
              </ul>
              <p className="mb-4 text-sm font-semibold text-red-400">
                {'Esta accion no se puede deshacer.'}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  onClick={handleDeletePurchase}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Config Section - Admin only */}
        {userRole === 'admin' && (
        <Card className="mb-6 border-border/50 bg-card">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('config')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-primary">
                <Settings className="h-5 w-5" />
                {'Configuracion de Boletos'}
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
                        {'Define el rango maximo de boletos (1 hasta N)'}
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
                    {'Los numeros de boleto se generan aleatoriamente dentro de este rango. No se pueden repetir.'}
                  </p>
                </div>

                {/* Manual Progress Slider */}
                <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-primary">Control de Progreso Manual</p>
                      <p className="text-xs text-muted-foreground">
                        Ajusta el porcentaje de progreso que se muestra en la pagina principal
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-500">{manualProgress.toFixed(2)}%</p>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.01"
                    value={manualProgress}
                    onChange={(e) => setManualProgress(parseFloat(e.target.value))}
                    className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                  />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
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
                      <p className="text-lg font-bold">{formatCurrency(stats?.ventas_dop || 0, 'DOP')}</p>
                      {(stats?.ventas_usd || 0) > 0 && (
                        <p className="text-lg font-bold text-green-400">{formatCurrency(stats?.ventas_usd || 0, 'USD')}</p>
                      )}
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
        )}

        {/* Pending Payments Section - Admin and Boleto Fisico */}
        {(userRole === 'admin' || userRole === 'boleto_fisico') && (
        <Card className="mb-6 border-border/50 bg-card">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection('pagos')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-primary">
                <Clock className="h-5 w-5" />
                {'Pagos Pendientes de Validacion'}
              </span>
              {sectionsOpen.pagos ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {sectionsOpen.pagos && (
            <CardContent>
              {/* Search input for pending tickets - visible for boleto_fisico */}
              {userRole === 'boleto_fisico' && (
                <div className="mb-4">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por numero de boleto..."
                      value={pendingSearchTerm}
                      onChange={(e) => setPendingSearchTerm(e.target.value)}
                      className="bg-input pl-9"
                    />
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{'Boleto #'}</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>{'Telefono'}</TableHead>
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
                            <span className="font-medium text-foreground">
                              {pg.player?.nombre || '?'}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{pg.player?.phone_number}</TableCell>
                          <TableCell>{pg.total_tickets}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(pg.monto, pg.moneda)}</TableCell>
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
                            {(userRole === 'admin' || userRole === 'boleto_fisico') ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-cyan-500/50 text-cyan-500 hover:bg-cyan-500 hover:text-white"
                                  onClick={() => setEditingPlayer({
                                    id: pg.player?.id || '',
                                    nombre: pg.player?.nombre || '',
                                    phone_number: pg.player?.phone_number || '',
                                    email: pg.player?.email || '',
                                  })}
                                >
                                  <Pencil className="mr-1 h-4 w-4" />
                                  Editar
                                </Button>
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
                            ) : (
                              <span className="text-xs text-muted-foreground">Solo lectura</span>
                            )}
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
        )}

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
                      {filteredCompras.filter((c: PurchaseGroup) => c.estado === 'aprobado').length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(filteredCompras.filter((c: PurchaseGroup) => c.estado === 'aprobado' && (c.moneda || 'DOP') === 'DOP').reduce((s: number, c: PurchaseGroup) => s + c.monto, 0), 'DOP')}
                    </p>
                    {filteredCompras.filter((c: PurchaseGroup) => c.estado === 'aprobado' && c.moneda === 'USD').length > 0 && (
                      <p className="text-xs text-green-400">
                        {formatCurrency(filteredCompras.filter((c: PurchaseGroup) => c.estado === 'aprobado' && c.moneda === 'USD').reduce((s: number, c: PurchaseGroup) => s + c.monto, 0), 'USD')}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">CON REFERIDO</p>
                        <p className="text-2xl font-bold">{filteredCompras.filter((c: PurchaseGroup) => c.referido_codigo).length}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(filteredCompras.filter((c: PurchaseGroup) => c.referido_codigo && (c.moneda || 'DOP') === 'DOP').reduce((s: number, c: PurchaseGroup) => s + c.monto, 0), 'DOP')}
                        </p>
                        {filteredCompras.filter((c: PurchaseGroup) => c.referido_codigo && c.moneda === 'USD').length > 0 && (
                          <p className="text-xs text-green-400">
                            {formatCurrency(filteredCompras.filter((c: PurchaseGroup) => c.referido_codigo && c.moneda === 'USD').reduce((s: number, c: PurchaseGroup) => s + c.monto, 0), 'USD')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">COMPRA DIRECTA</p>
                    <p className="text-2xl font-bold">{filteredCompras.filter((c: PurchaseGroup) => !c.referido_codigo).length}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(filteredCompras.filter((c: PurchaseGroup) => !c.referido_codigo && (c.moneda || 'DOP') === 'DOP').reduce((s: number, c: PurchaseGroup) => s + c.monto, 0), 'DOP')}
                    </p>
                    {filteredCompras.filter((c: PurchaseGroup) => !c.referido_codigo && c.moneda === 'USD').length > 0 && (
                      <p className="text-xs text-green-400">
                        {formatCurrency(filteredCompras.filter((c: PurchaseGroup) => !c.referido_codigo && c.moneda === 'USD').reduce((s: number, c: PurchaseGroup) => s + c.monto, 0), 'USD')}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-secondary/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">BOLETOS VENDIDOS</p>
                    <p className="text-2xl font-bold text-primary">
                      {filteredCompras.filter((c: PurchaseGroup) => c.estado === 'aprobado').reduce((s: number, c: PurchaseGroup) => s + c.total_tickets, 0)}
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
                    placeholder="Buscar nombre, telefono, boleto, cedula..."
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
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompras.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground">
                          {searchTerm ? 'No se encontraron resultados' : 'No hay compras registradas'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCompras.map((pg: PurchaseGroup) => (
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
                          <TableCell className="font-medium">{formatCurrency(pg.monto, pg.moneda)}</TableCell>
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
                          <TableCell>
                            {(userRole === 'admin' || userRole === 'boleto_fisico') ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-cyan-500/50 text-cyan-500 hover:bg-cyan-500 hover:text-white"
                                  onClick={() => setEditingPlayer({
                                    id: pg.player?.id || '',
                                    nombre: pg.player?.nombre || '',
                                    phone_number: pg.player?.phone_number || '',
                                    email: pg.player?.email || '',
                                  })}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {(pg.estado === 'aprobado' || pg.estado === 'rechazado') && (
                                  <Button
                                    size="sm"
                                    className="bg-yellow-600 text-white hover:bg-yellow-700"
                                    onClick={() => setRevertingId(pg.id)}
                                  >
                                    <RotateCcw className="mr-1 h-4 w-4" />
                                    Revertir
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white"
                                  onClick={() => setDeletingId(pg.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Solo lectura</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-right text-xs text-muted-foreground">
                {filteredCompras.length} resultados
              </p>
            </CardContent>
          )}
        </Card>

        {/* Bottom two columns - hidden for boleto_fisico */}
        {userRole !== 'boleto_fisico' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Referidos Section - Admin and Referido Plus can see/create */}
          <Card className="border-border/50 bg-card">
            <CardHeader>
              <CardTitle className="text-lg">
                {userRole === 'referido_plus' ? 'Mis Referidos' : 'Gestion de Referidos'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Create new referido */}
              <div className="mb-4 rounded-lg border border-border/50 bg-secondary/50 p-4">
                <p className="mb-3 text-sm font-medium">CREAR NUEVO REFERIDO</p>
                <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Input
                    placeholder="Nombre del Agente"
                    value={newReferidoNombre}
                    onChange={(e) => setNewReferidoNombre(e.target.value)}
                    className="bg-input"
                  />
                  <Input
                    placeholder="Codigo (ej. JUAN10)"
                    value={newReferidoCodigo}
                    onChange={(e) => setNewReferidoCodigo(e.target.value.toUpperCase())}
                    className="bg-input"
                  />
                  <Input
                    placeholder="Cedula o Pasaporte"
                    value={newReferidoCedula}
                    onChange={(e) => setNewReferidoCedula(e.target.value)}
                    className="bg-input"
                  />
                  <Input
                    placeholder="Telefono"
                    value={newReferidoTelefono}
                    onChange={(e) => setNewReferidoTelefono(e.target.value)}
                    className="bg-input"
                  />
                </div>
                <Button
                  onClick={handleCreateReferido}
                  disabled={isCreatingReferido}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                >
                  <Plus className="mr-1 h-4 w-4" /> Crear Referido
                </Button>
              </div>

              {/* Search referidos - Admin only */}
              {userRole === 'admin' && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o codigo..."
                    value={referidoSearch}
                    onChange={(e) => setReferidoSearch(e.target.value)}
                    className="bg-input pl-9"
                  />
                </div>
              </div>
              )}

              {/* Referidos table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agente</TableHead>
                      <TableHead>{'Codigo'}</TableHead>
                      <TableHead>{'Cedula / Pasaporte'}</TableHead>
                      <TableHead>{'Telefono'}</TableHead>
                      <TableHead>Ventas Aprobadas</TableHead>
                      <TableHead>Ventas (DOP)</TableHead>
                      <TableHead>{'Comision (10%)'}</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // First filter by role - GAMUNDI only sees referidos they created
                      const roleFiltered = userRole === 'referido_plus' 
                        ? referidos.filter((r: Referido & { created_by?: string }) => r.created_by === 'referido_plus_gamundi')
                        : referidos
                      
                      const filtered = roleFiltered.filter((r: Referido) => {
                        if (!referidoSearch.trim()) return true
                        const term = referidoSearch.toLowerCase()
                        return (
                          r.nombre_agente.toLowerCase().includes(term) ||
                          r.codigo.toLowerCase().includes(term)
                        )
                      })
                      if (filtered.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground">
                              {referidoSearch.trim() ? 'No se encontraron referidos' : 'No hay referidos registrados'}
                            </TableCell>
                          </TableRow>
                        )
                      }
                      return filtered.map((referido: Referido & { ventas_aprobadas?: number; comision?: number }) => (
                        <TableRow key={referido.id}>
                          <TableCell>{referido.nombre_agente}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{referido.codigo}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{referido.cedula || '-'}</TableCell>
                          <TableCell className="text-sm">{referido.telefono || '-'}</TableCell>
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
                    })()}
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
                      <TableHead>{'Boleto #'}</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>{'Telefono'}</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompras.slice(0, 20).map((pg: PurchaseGroup) => (
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
                        <TableCell>{formatCurrency(pg.monto, pg.moneda)}</TableCell>
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
                        <TableCell>
                          {(pg.estado === 'aprobado' || pg.estado === 'rechazado') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400"
                              onClick={() => setRevertingId(pg.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
        )}
      </div>
    </main>
  )
}
