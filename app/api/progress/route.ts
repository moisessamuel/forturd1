import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get config for total boletos
    const { data: config } = await supabase
      .from('config')
      .select('total_boletos')
      .single()

    const totalBoletos = config?.total_boletos || 200000

    // Get count from both old compras and new purchase_groups
    const [{ data: oldCompras }, { data: newGroups }] = await Promise.all([
      supabase
        .from('compras')
        .select('cantidad_boletos')
        .eq('estado', 'aprobado'),
      supabase
        .from('purchase_groups')
        .select('total_tickets')
        .eq('estado', 'aprobado'),
    ])

    const boletosVendidos =
      (oldCompras?.reduce((sum, c) => sum + c.cantidad_boletos, 0) || 0) +
      (newGroups?.reduce((sum, pg) => sum + pg.total_tickets, 0) || 0)

    const porcentaje = totalBoletos > 0 ? (boletosVendidos / totalBoletos) * 100 : 0

    return NextResponse.json({
      total_boletos: totalBoletos,
      boletos_vendidos: boletosVendidos,
      porcentaje: Math.round(porcentaje * 100) / 100,
    })
  } catch (error) {
    console.error('Progress error:', error)
    return NextResponse.json(
      { total_boletos: 200000, boletos_vendidos: 0, porcentaje: 0 },
      { status: 200 }
    )
  }
}
