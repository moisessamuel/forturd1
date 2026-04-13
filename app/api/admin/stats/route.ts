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
    const userRole = session.role || 'admin'

    // Get config
    const { data: config } = await supabase
      .from('config')
      .select('total_boletos')
      .single()

    // Get purchase groups (new system)
    const { data: purchaseGroups } = await supabase
      .from('purchase_groups')
      .select('monto, estado, total_tickets, moneda, referido_codigo')

    // Get old compras (legacy)
    const { data: compras } = await supabase
      .from('compras')
      .select('monto, estado, cantidad_boletos, moneda, referido_codigo')

    // Get active referidos count
    const { count: agentesActivos } = await supabase
      .from('referidos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    // Filter by role - Backend separation of BOLETOFISICO tickets
    let filteredPG = purchaseGroups || []
    let filteredCompras = compras || []
    
    if (userRole === 'boleto_fisico') {
      // Physical tickets panel: Only show BOLETOFISICO referral tickets
      filteredPG = filteredPG.filter((pg) => pg.referido_codigo?.toUpperCase() === 'BOLETOFISICO')
      filteredCompras = filteredCompras.filter((c) => c.referido_codigo?.toUpperCase() === 'BOLETOFISICO')
    } else if (userRole === 'admin') {
      // Admin panel: Exclude BOLETOFISICO referral tickets
      filteredPG = filteredPG.filter((pg) => pg.referido_codigo?.toUpperCase() !== 'BOLETOFISICO')
      filteredCompras = filteredCompras.filter((c) => c.referido_codigo?.toUpperCase() !== 'BOLETOFISICO')
    } else if (userRole === 'referido_plus') {
      // Referido Plus: Only show GAMUNDI referral tickets
      filteredPG = filteredPG.filter((pg) => pg.referido_codigo?.toUpperCase() === 'GAMUNDI')
      filteredCompras = filteredCompras.filter((c) => c.referido_codigo?.toUpperCase() === 'GAMUNDI')
    }

    // Calculate stats from filtered data
    const pgApproved = filteredPG.filter((pg) => pg.estado === 'aprobado')
    const oldApproved = filteredCompras.filter((c) => c.estado === 'aprobado')

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
      filteredPG.filter((pg) => pg.estado === 'pendiente').length +
      filteredCompras.filter((c) => c.estado === 'pendiente').length

    const transaccionesTotales =
      filteredPG.length + filteredCompras.length

    const boletosAsignados =
      pgApproved.reduce((sum, pg) => sum + pg.total_tickets, 0) +
      oldApproved.reduce((sum, c) => sum + c.cantidad_boletos, 0)

    const boletosDisponibles = (config?.total_boletos || 200000) - boletosAsignados

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
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
