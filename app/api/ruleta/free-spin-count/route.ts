import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const numeroBoleto = searchParams.get('numero_boleto')

    if (!numeroBoleto) {
      return NextResponse.json({ error: 'Numero de boleto requerido' }, { status: 400 })
    }

    // Get ticket info to count total tickets for this purchase
    const { data: ticket } = await supabase
      .from('tickets')
      .select('purchase_group_id, numero_boleto')
      .eq('numero_boleto', numeroBoleto)
      .single()

    if (!ticket) {
      return NextResponse.json({ 
        total_boletos: 1, 
        giros_usados: 0,
        estado: 'pendiente'
      })
    }

    // Get purchase group estado
    const { data: purchaseGroup } = await supabase
      .from('purchase_groups')
      .select('estado')
      .eq('id', ticket.purchase_group_id)
      .single()

    const estado = purchaseGroup?.estado || 'pendiente'

    // Count total tickets in the same purchase group
    const { count: totalBoletos } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('purchase_group_id', ticket.purchase_group_id)

    // Count free spins already used for any ticket in this purchase group
    const { data: ticketsInGroup } = await supabase
      .from('tickets')
      .select('numero_boleto')
      .eq('purchase_group_id', ticket.purchase_group_id)

    const ticketNumbers = ticketsInGroup?.map(t => t.numero_boleto) || [numeroBoleto]

    const { count: girosUsados } = await supabase
      .from('jugadas_ruleta')
      .select('*', { count: 'exact', head: true })
      .in('numero_boleto_referencia', ticketNumbers)
      .eq('es_giro_gratis', true)

    return NextResponse.json({
      total_boletos: totalBoletos || 1,
      giros_usados: girosUsados || 0,
      ticket_numbers: ticketNumbers,
      estado,
    })
  } catch (error) {
    console.error('Error fetching free spin count:', error)
    return NextResponse.json({ 
      total_boletos: 1, 
      giros_usados: 0,
      error: 'Error fetching data' 
    })
  }
}
