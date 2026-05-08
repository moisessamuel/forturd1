import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { jugada_id, premio_id, resultado } = body

    console.log(`[v0] spin API called for jugada_id=${jugada_id}`)

    // First, get current giros_usados and cantidad_giros
    const { data: jugada, error: fetchError } = await supabase
      .from('ruleta_jugadas')
      .select('giros_usados, cantidad_giros, estado, telefono')
      .eq('id', jugada_id)
      .single()

    if (fetchError) {
      console.error('[v0] Error fetching jugada:', fetchError)
      return NextResponse.json({ error: 'Error fetching spin' }, { status: 500 })
    }

    console.log(`[v0] Current jugada state: cantidad=${jugada?.cantidad_giros}, usados=${jugada?.giros_usados}, estado=${jugada?.estado}`)

    const currentUsados = jugada?.giros_usados || 0
    const totalGiros = jugada?.cantidad_giros || 1
    const newGirosUsados = currentUsados + 1
    
    // Determine new estado - if all spins used, mark as 'jugado', otherwise keep as 'confirmado'
    const newEstado = newGirosUsados >= totalGiros ? 'jugado' : 'confirmado'
    
    console.log(`[v0] Updating: newGirosUsados=${newGirosUsados}, newEstado=${newEstado}`)

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
      console.error('[v0] Error updating spin:', error)
      return NextResponse.json({ error: 'Error updating spin' }, { status: 500 })
    }

    // Calculate remaining spins
    const girosRestantes = totalGiros - newGirosUsados
    
    console.log(`[v0] Spin recorded successfully: restantes=${girosRestantes}, all_used=${girosRestantes <= 0}`)

    return NextResponse.json({ 
      success: true,
      giros_restantes: girosRestantes,
      all_spins_used: girosRestantes <= 0
    })
  } catch (error) {
    console.error('[v0] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
