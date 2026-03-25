import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get config for total boletos and manual progress
    const { data: config } = await supabase
      .from('config')
      .select('total_boletos, manual_progress')
      .single()

    const totalBoletos = config?.total_boletos || 200000
    const manualProgress = config?.manual_progress || 0

    // Return the manual progress set by admin (not calculated from sales)
    return NextResponse.json({
      total_boletos: totalBoletos,
      boletos_vendidos: 0,
      porcentaje: Math.round(manualProgress * 100) / 100,
    })
  } catch (error) {
    console.error('Progress error:', error)
    return NextResponse.json(
      { total_boletos: 200000, boletos_vendidos: 0, porcentaje: 0 },
      { status: 200 }
    )
  }
}
