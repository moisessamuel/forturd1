import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const boleto = searchParams.get('boleto')

    if (!boleto) {
      return NextResponse.json({ error: 'Número de boleto requerido' }, { status: 400 })
    }

    const supabase = await createClient()
    const cleanBoleto = boleto.replace(/[^0-9]/g, '')

    // Try new tickets table first
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, player:players(*), purchase_group:purchase_groups(*)')
      .eq('numero_boleto', cleanBoleto)
      .single()

    if (ticket) {
      return NextResponse.json({
        numero_boleto: ticket.numero_boleto,
        nombre: ticket.player?.nombre,
        estado: ticket.purchase_group?.estado || 'pendiente',
        cantidad_boletos: ticket.purchase_group?.total_tickets || 1,
        monto: ticket.purchase_group?.monto,
        moneda: ticket.purchase_group?.moneda,
        fecha: ticket.created_at,
        source: 'new',
      })
    }

    // Fallback to old compras table
    const { data: compra } = await supabase
      .from('compras')
      .select('*')
      .eq('numero_boleto', cleanBoleto)
      .single()

    if (compra) {
      return NextResponse.json({
        numero_boleto: compra.numero_boleto,
        nombre: compra.nombre_comprador,
        estado: compra.estado,
        cantidad_boletos: compra.cantidad_boletos,
        monto: compra.monto,
        moneda: compra.moneda,
        fecha: compra.created_at,
        source: 'legacy',
      })
    }

    return NextResponse.json({ error: 'Boleto no encontrado' }, { status: 404 })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
