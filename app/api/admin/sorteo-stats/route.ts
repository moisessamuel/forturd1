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
    // Fire all 3 independent queries in parallel instead of sequentially
    const [sorteoResult, groupsResult, comprasResult] = await Promise.all([
      supabase
        .from('sorteos')
        .select('total_boletos')
        .eq('slug', slug)
        .single(),

      // Fetch all purchase_groups with their ticket count in a single join query
      supabase
        .from('purchase_groups')
        .select('id, monto, moneda, estado, player_id, tickets(count)')
        .eq('sorteo_slug', slug),

      supabase
        .from('compras')
        .select('monto, moneda, estado, cantidad_boletos')
        .eq('sorteo_slug', slug),
    ])

    const totalBoletos = sorteoResult.data?.total_boletos || 1000

    if (groupsResult.error) {
      console.error('Error fetching groups:', groupsResult.error)
      return NextResponse.json({ error: 'Error fetching data' }, { status: 500 })
    }

    // Calculate stats from purchase_groups — all ticket counts already loaded via join
    let ventasDOP = 0
    let ventasUSD = 0
    let pagosPendientes = 0
    let boletosVendidos = 0
    const uniquePlayerIds = new Set<string>()

    for (const group of groupsResult.data || []) {
      if (group.player_id) {
        uniquePlayerIds.add(group.player_id)
      }
      if (group.estado === 'aprobado') {
        if (group.moneda === 'USD') {
          ventasUSD += Number(group.monto)
        } else {
          ventasDOP += Number(group.monto)
        }
        // tickets count already loaded via join — no extra query per group
        const ticketCount = Array.isArray((group as any).tickets)
          ? (group as any).tickets[0]?.count ?? 0
          : 0
        boletosVendidos += Number(ticketCount)
      } else if (group.estado === 'pendiente') {
        pagosPendientes++
      }
    }

    // Also aggregate from compras table
    for (const compra of comprasResult.data || []) {
      if (compra.estado === 'aprobado') {
        if (compra.moneda === 'USD') {
          ventasUSD += Number(compra.monto)
        } else {
          ventasDOP += Number(compra.monto)
        }
        boletosVendidos += compra.cantidad_boletos || 1
      } else if (compra.estado === 'pendiente') {
        pagosPendientes++
      }
    }

    return NextResponse.json({
      ventas_totales: ventasDOP + ventasUSD,
      ventas_dop: ventasDOP,
      ventas_usd: ventasUSD,
      pagos_pendientes: pagosPendientes,
      transacciones_totales: (groupsResult.data?.length || 0) + (comprasResult.data?.length || 0),
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
