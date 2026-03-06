import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: compra, error } = await supabase
      .from('compras')
      .select('id, numero_boleto, nombre_comprador, telefono, email, cedula, cantidad_boletos, monto, moneda, banco, estado, origen, referido_codigo, created_at')
      .eq('id', id)
      .single()

    if (error || !compra) {
      return NextResponse.json(
        { error: 'Boleto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(compra)
  } catch (error) {
    console.error('Boleto fetch error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
