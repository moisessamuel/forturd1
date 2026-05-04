import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { numero_boleto, nombre, telefono, premio_id, resultado } = body

    if (!numero_boleto || !nombre) {
      return NextResponse.json(
        { error: 'numero_boleto y nombre son requeridos' },
        { status: 400 }
      )
    }

    // Insert free spin record into jugadas_ruleta
    const { data, error } = await supabase
      .from('jugadas_ruleta')
      .insert({
        nombre,
        telefono: telefono || null,
        monto: 0, // Free spin
        moneda: 'DOP',
        metodo_pago: 'GIRO GRATIS',
        estado: 'completado',
        premio_ganado: resultado || null,
        numero_boleto_referencia: numero_boleto,
        es_giro_gratis: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording free spin:', error)
      return NextResponse.json(
        { error: 'Error al registrar el giro gratis' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      jugada_id: data.id,
      message: 'Giro gratis registrado exitosamente',
    })
  } catch (error) {
    console.error('Free spin API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
