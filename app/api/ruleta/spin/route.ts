import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { jugada_id, premio_id, resultado } = body

    // First, get current giros_usados and cantidad_giros
    const { data: jugada, error: fetchError } = await supabase
      .from('ruleta_jugadas')
      .select('giros_usados, cantidad_giros')
      .eq('id', jugada_id)
      .single()

    if (fetchError) {
      console.error('Error fetching jugada:', fetchError)
      return NextResponse.json({ error: 'Error fetching spin' }, { status: 500 })
    }

    const currentUsados = jugada?.giros_usados || 0
    const totalGiros = jugada?.cantidad_giros || 1
    const newGirosUsados = currentUsados + 1
    
    // Determine new estado - if all spins used, mark as 'jugado', otherwise keep as 'confirmado'
    const newEstado = newGirosUsados >= totalGiros ? 'jugado' : 'confirmado'

    // Update the spin record with result and increment giros_usados
    const { error } = await supabase
      .from('ruleta_jugadas')
      .update({
        premio_id,
        resultado,
        estado: newEstado,
        jugado_at: new Date().toISOString(),
        giros_usados: newGirosUsados,
      })
      .eq('id', jugada_id)

    if (error) {
      console.error('Error updating spin:', error)
      return NextResponse.json({ error: 'Error updating spin' }, { status: 500 })
    }

    // Calculate remaining spins
    const girosRestantes = totalGiros - newGirosUsados

    return NextResponse.json({ 
      success: true,
      giros_restantes: girosRestantes,
      all_spins_used: girosRestantes <= 0
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
