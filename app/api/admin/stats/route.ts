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

    // Get all compras
    const { data: compras } = await supabase
      .from('compras')
      .select('monto, estado, cantidad_boletos')

    // Get active referidos count
    const { count: agentesActivos } = await supabase
      .from('referidos')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    // Calculate stats
    const ventasTotales = compras
      ?.filter((c) => c.estado === 'aprobado')
      .reduce((sum, c) => sum + Number(c.monto), 0) || 0

    const pagosPendientes = compras?.filter((c) => c.estado === 'pendiente').length || 0
    const transaccionesTotales = compras?.length || 0

    const boletosAsignados = compras
      ?.filter((c) => c.estado === 'aprobado')
      .reduce((sum, c) => sum + c.cantidad_boletos, 0) || 0

    const boletosDisponibles = (config?.total_boletos || 200000) - boletosAsignados

    return NextResponse.json({
      ventas_totales: ventasTotales,
      agentes_activos: agentesActivos || 0,
      pagos_pendientes: pagosPendientes,
      transacciones_totales: transaccionesTotales,
      boletos_asignados: boletosAsignados,
      boletos_disponibles: boletosDisponibles,
      total_boletos: config?.total_boletos || 200000,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
