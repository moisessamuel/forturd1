import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const boleto = searchParams.get('boleto')

    if (!boleto) {
      return NextResponse.json(
        { error: 'Número de boleto requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Clean the ticket number (remove any formatting)
    const cleanBoleto = boleto.replace(/[^0-9]/g, '')

    const { data: compra, error } = await supabase
      .from('compras')
      .select('*')
      .eq('numero_boleto', cleanBoleto)
      .single()

    if (error || !compra) {
      return NextResponse.json(
        { error: 'Boleto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      numero_boleto: compra.numero_boleto,
      nombre: compra.nombre_comprador,
      estado: compra.estado,
      cantidad_boletos: compra.cantidad_boletos,
      monto: compra.monto,
      moneda: compra.moneda,
      fecha: compra.created_at,
    })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
