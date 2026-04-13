export interface Config {
  id: string
  total_boletos: number
  precio_boleto_dop: number
  precio_boleto_usd: number
  comision_referido: number
  manual_progress: number
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  username: string
  password_hash: string
  created_at: string
}

export interface Banco {
  id: string
  nombre: string
  titular: string
  cuenta: string
  tipo_cuenta: string
  moneda: string
  activo: boolean
  logo_url: string | null
  created_at: string
}

export interface Referido {
  id: string
  nombre_agente: string
  codigo: string
  cedula: string | null
  telefono: string | null
  activo: boolean
  created_at: string
}

export type EstadoCompra = 'pendiente' | 'aprobado' | 'rechazado'

export interface Compra {
  id: string
  numero_boleto: string
  nombre_comprador: string
  telefono: string
  email: string | null
  cedula: string | null
  cantidad_boletos: number
  monto: number
  moneda: string
  banco: string
  metodo_pago: string
  referido_codigo: string | null
  comprobante_url: string | null
  estado: EstadoCompra
  origen: 'directo' | 'referido'
  created_at: string
  updated_at: string
}

// New system types
export interface Player {
  id: string
  phone_number: string
  nombre: string
  email: string | null
  cedula: string | null
  created_at: string
}

export interface QRCode {
  id: string
  qr_value: string
  player_id: string
  created_at: string
}

export interface PurchaseGroup {
  id: string
  player_id: string
  qr_code_id: string
  total_tickets: number
  monto: number
  moneda: string
  banco: string | null
  comprobante_url: string | null
  referido_codigo: string | null
  estado: EstadoCompra
  created_at: string
  fecha_aprobacion: string | null
  // Joined fields
  player?: Player
  qr_code?: QRCode
  tickets?: Ticket[]
}

export interface Ticket {
  id: string
  numero_boleto: string
  purchase_group_id: string
  player_id: string
  status: 'pending' | 'verified' | 'rejected'
  created_at: string
  // Joined fields
  player?: Player
  ticket_player?: Player // Individual player for this specific ticket (used in boleto_fisico panel)
  purchase_group?: PurchaseGroup
}

export interface PurchaseFormData {
  cantidad: number
  nombre: string
  telefono: string
  email?: string
  cedula?: string
  banco: string
  referido_codigo?: string
}

// Flattened ticket for individual display in boleto_fisico panel
export interface FlattenedTicket {
  id: string // ticket id
  numero_boleto: string
  purchase_group_id: string
  player_id: string
  status: 'pending' | 'verified' | 'rejected'
  created_at: string
  // From purchase group
  monto_unitario: number
  moneda: string
  banco: string | null
  comprobante_url: string | null
  referido_codigo: string | null
  estado: EstadoCompra
  fecha_compra: string
  // Player info (can be edited per ticket)
  nombre: string
  phone_number: string
  email: string | null
}

export interface AdminStats {
  ventas_totales: number
  agentes_activos: number
  pagos_pendientes: number
  transacciones_totales: number
  boletos_asignados: number
  boletos_disponibles: number
}
