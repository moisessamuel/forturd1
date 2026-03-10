import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Try purchase_groups first (new system - id is the purchase group id)
    const { data: group } = await supabase
      .from('purchase_groups')
      .select('*, player:players(*), tickets(*), qr_code:qr_codes(*)')
      .eq('id', id)
      .single()

    if (group) {
      return NextResponse.json({
        id: group.id,
        nombre_comprador: group.player?.nombre,
        telefono: group.player?.phone_number,
        email: group.player?.email,
        cedula: group.player?.cedula,
        cantidad_boletos: group.total_tickets,
        monto: group.monto,
        moneda: group.moneda,
        banco: group.banco,
        estado: group.estado,
        referido_codigo: group.referido_codigo,
        created_at: group.created_at,
        tickets: group.tickets,
        qr_code: group.qr_code,
        source: 'new',
      })
    }

    // Fallback to old compras table
    const { data: compra } = await supabase
      .from('compras')
      .select('*')
      .eq('id', id)
      .single()

    if (compra) {
      return NextResponse.json({
        ...compra,
        nombre_comprador: compra.nombre_comprador,
        tickets: [{ numero_boleto: compra.numero_boleto, status: compra.estado === 'aprobado' ? 'verified' : 'pending' }],
        source: 'legacy',
      })
    }

    return NextResponse.json({ error: 'Boleto no encontrado' }, { status: 404 })
  } catch (error) {
    console.error('Boleto fetch error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
