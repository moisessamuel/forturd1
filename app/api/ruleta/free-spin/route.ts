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
        telefono: telefono || '',
        email: '',
        monto: 0, // Free spin
        moneda: 'DOP',
        banco: 'Giro Gratis',
        estado: 'jugado',
        premio_id: premio_id || null,
        resultado: resultado || null,
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

    // Also update the free spin tracking table (ruleta_giros_gratis)
    // This tracks how many free spins from tickets have been used
    if (telefono) {
      const { data: existingRecord } = await supabase
        .from('ruleta_giros_gratis')
        .select('giros_usados')
        .eq('telefono', telefono)
        .single()

      if (existingRecord) {
        // Increment existing record
        await supabase
          .from('ruleta_giros_gratis')
          .update({ 
            giros_usados: existingRecord.giros_usados + 1,
            ultimo_giro_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('telefono', telefono)
      } else {
        // Create new record
        await supabase
          .from('ruleta_giros_gratis')
          .insert({
            telefono,
            giros_usados: 1,
            ultimo_giro_at: new Date().toISOString()
          })
      }
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
