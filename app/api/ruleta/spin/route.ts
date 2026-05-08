import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// NOTE: giros_usados is now updated ONLY in /api/ruleta/spin-count
// This endpoint now ONLY reads the current state and returns remaining spins
// This prevents double-counting that was causing the spin count bug
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { jugada_id, premio_id, resultado } = body

    // Get current state of the jugada (giros_usados is already updated by spin-count)
    const { data: jugada, error: fetchError } = await supabase
      .from('ruleta_jugadas')
      .select('giros_usados, cantidad_giros, estado')
      .eq('id', jugada_id)
      .single()

    if (fetchError) {
      console.error('Error fetching jugada:', fetchError)
      return NextResponse.json({ error: 'Error fetching spin' }, { status: 500 })
    }

    const currentUsados = jugada?.giros_usados || 0
    const totalGiros = jugada?.cantidad_giros || 1
    
    // Calculate remaining spins (giros_usados already incremented by spin-count)
    const girosRestantes = Math.max(0, totalGiros - currentUsados)

    // Only update premio_id and resultado (NOT giros_usados - that's handled by spin-count)
    const { error } = await supabase
      .from('ruleta_jugadas')
      .update({
        premio_id,
        resultado,
        jugado_at: new Date().toISOString(),
      })
      .eq('id', jugada_id)

    if (error) {
      console.error('Error updating spin result:', error)
      return NextResponse.json({ error: 'Error updating spin' }, { status: 500 })
    }

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
