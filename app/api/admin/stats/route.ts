import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get config
    const { data: config } = await supabase
      .from('config')
      .select('total_boletos')
      .single()

    // Get purchase groups (new system)
    const { data: purchaseGroups } = await supabase
      .from('purchase_groups')
      .select('monto, estado, total_tickets, moneda')

    // Get old compras (legacy)
    const { data: compras } = await supabase
      .from('compras')
      .select('monto, estado, cantidad_boletos, moneda')

    // Get active referidos count
    const { count: agentesActivos } = await supabase
      .from('referidos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    // Calculate stats from BOTH systems
    const pgApproved = purchaseGroups?.filter((pg) => pg.estado === 'aprobado') || []
    const oldApproved = compras?.filter((c) => c.estado === 'aprobado') || []

    const ventasTotales =
      pgApproved.reduce((sum, pg) => sum + Number(pg.monto), 0) +
      oldApproved.reduce((sum, c) => sum + Number(c.monto), 0)

    const ventasDOP =
      pgApproved.filter((pg) => (pg.moneda || 'DOP') === 'DOP').reduce((sum, pg) => sum + Number(pg.monto), 0) +
      oldApproved.filter((c) => (c.moneda || 'DOP') === 'DOP').reduce((sum, c) => sum + Number(c.monto), 0)

    const ventasUSD =
      pgApproved.filter((pg) => pg.moneda === 'USD').reduce((sum, pg) => sum + Number(pg.monto), 0) +
      oldApproved.filter((c) => c.moneda === 'USD').reduce((sum, c) => sum + Number(c.monto), 0)

    const pagosPendientes =
      (purchaseGroups?.filter((pg) => pg.estado === 'pendiente').length || 0) +
      (compras?.filter((c) => c.estado === 'pendiente').length || 0)

    const transaccionesTotales =
      (purchaseGroups?.length || 0) + (compras?.length || 0)

    const boletosAsignados =
      pgApproved.reduce((sum, pg) => sum + pg.total_tickets, 0) +
      oldApproved.reduce((sum, c) => sum + c.cantidad_boletos, 0)

    const boletosDisponibles = (config?.total_boletos || 200000) - boletosAsignados

    // Stats for boleto_fisico panel - count all tickets with BOLETOSFISICOS referido
    const pgBoletosFisicos = purchaseGroups?.filter((pg) => 
      pg.referido_codigo?.toUpperCase() === 'BOLETOSFISICOS'
    ) || []
    
    const boletosFisicosTotal = pgBoletosFisicos.reduce((sum, pg) => sum + pg.total_tickets, 0)
    const boletosFisicosAsignados = pgBoletosFisicos
      .filter(pg => pg.estado === 'aprobado')
      .reduce((sum, pg) => sum + pg.total_tickets, 0)
    const boletosFisicosPendientes = pgBoletosFisicos
      .filter(pg => pg.estado === 'pendiente')
      .reduce((sum, pg) => sum + pg.total_tickets, 0)

    return NextResponse.json({
      ventas_totales: ventasTotales,
      ventas_dop: ventasDOP,
      ventas_usd: ventasUSD,
      agentes_activos: agentesActivos || 0,
      pagos_pendientes: pagosPendientes,
      transacciones_totales: transaccionesTotales,
      boletos_asignados: boletosAsignados,
      boletos_disponibles: boletosDisponibles,
      total_boletos: config?.total_boletos || 200000,
      // Boletos fisicos specific stats
      boletos_fisicos_total: boletosFisicosTotal,
      boletos_fisicos_asignados: boletosFisicosAsignados,
      boletos_fisicos_pendientes: boletosFisicosPendientes,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
