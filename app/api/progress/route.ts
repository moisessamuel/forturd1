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

    // Get count of approved boletos sold
    const { data: compras } = await supabase
      .from('compras')
      .select('cantidad_boletos')
      .eq('estado', 'aprobado')

    const boletosVendidos = compras?.reduce((sum, c) => sum + c.cantidad_boletos, 0) || 0
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
