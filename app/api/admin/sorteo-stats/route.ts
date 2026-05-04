import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  try {
    // Get sorteo info
    const { data: sorteo, error: sorteoError } = await supabase
      .from('sorteos')
      .select('total_boletos')
      .eq('slug', slug)
      .single()

    if (sorteoError) {
      console.error('Error fetching sorteo:', sorteoError)
    }

    const totalBoletos = sorteo?.total_boletos || 1000

    // Get purchase groups for this sorteo
    const { data: groups, error: groupsError } = await supabase
      .from('purchase_groups')
      .select('id, monto, moneda, estado, player_id')
      .eq('sorteo_slug', slug)

    if (groupsError) {
      console.error('Error fetching groups:', groupsError)
      return NextResponse.json({ error: 'Error fetching data' }, { status: 500 })
    }

    // Calculate stats
    let ventasDOP = 0
    let ventasUSD = 0
    let pagosPendientes = 0
    let boletosVendidos = 0
    const uniquePlayerIds = new Set<string>()

    for (const group of groups || []) {
      if (group.player_id) {
        uniquePlayerIds.add(group.player_id)
      }
      if (group.estado === 'aprobado') {
        if (group.moneda === 'USD') {
          ventasUSD += Number(group.monto)
        } else {
          ventasDOP += Number(group.monto)
        }

        // Count tickets in this group
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('purchase_group_id', group.id)

        boletosVendidos += count || 0
      } else if (group.estado === 'pendiente') {
        pagosPendientes++
      }
    }

    // Also check legacy compras table
    const { data: legacyCompras } = await supabase
      .from('compras')
      .select('monto, moneda, estado, cantidad')
      .eq('sorteo_slug', slug)

    for (const compra of legacyCompras || []) {
      if (compra.estado === 'aprobado') {
        if (compra.moneda === 'USD') {
          ventasUSD += Number(compra.monto)
        } else {
          ventasDOP += Number(compra.monto)
        }
        boletosVendidos += compra.cantidad || 0
      } else if (compra.estado === 'pendiente') {
        pagosPendientes++
      }
    }

    return NextResponse.json({
      ventas_totales: ventasDOP + ventasUSD,
      ventas_dop: ventasDOP,
      ventas_usd: ventasUSD,
      pagos_pendientes: pagosPendientes,
      transacciones_totales: (groups?.length || 0) + (legacyCompras?.length || 0),
      boletos_vendidos: boletosVendidos,
      boletos_disponibles: totalBoletos - boletosVendidos,
      total_boletos: totalBoletos,
      usuarios_unicos: uniquePlayerIds.size,
    })
  } catch (error) {
    console.error('Error in sorteo-stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
