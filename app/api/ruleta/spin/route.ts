import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { jugada_id, premio_id, resultado } = body

    // Update the spin record with result
    const { error } = await supabase
      .from('ruleta_jugadas')
      .update({
        premio_id,
        resultado,
        estado: 'jugado',
        jugado_at: new Date().toISOString(),
      })
      .eq('id', jugada_id)

    if (error) {
      console.error('Error updating spin:', error)
      return NextResponse.json({ error: 'Error updating spin' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
