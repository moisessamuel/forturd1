import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get active prizes
    const { data: premios, error } = await supabase
      .from('ruleta_premios')
      .select('*')
      .eq('activo', true)
      .order('probabilidad', { ascending: false })

    if (error) {
      console.error('Error fetching prizes:', error)
      return NextResponse.json({ error: 'Error fetching prizes' }, { status: 500 })
    }

    return NextResponse.json(premios)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { 
      nombre, 
      telefono, 
      email, 
      monto, 
      moneda, 
      metodo_pago, 
      comprobante_url,
      es_gratis = false,
      origen = 'compra'
    } = body

    // Create or get player
    let { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('telefono', telefono)
      .single()

    if (!player) {
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({ nombre, telefono, email })
        .select('id')
        .single()

      if (playerError) {
        console.error('Error creating player:', playerError)
        return NextResponse.json({ error: 'Error creating player' }, { status: 500 })
      }
      player = newPlayer
    }

    // Create spin record
    const { data: jugada, error: jugadaError } = await supabase
      .from('ruleta_jugadas')
      .insert({
        player_id: player.id,
        nombre,
        telefono,
        email,
        monto: es_gratis ? 0 : monto,
        moneda: es_gratis ? 'DOP' : moneda,
        metodo_pago: es_gratis ? 'gratis' : metodo_pago,
        comprobante_url,
        estado: es_gratis ? 'confirmado' : 'pendiente',
        es_gratis,
        origen,
      })
      .select('id')
      .single()

    if (jugadaError) {
      console.error('Error creating spin:', jugadaError)
      return NextResponse.json({ error: 'Error creating spin' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      jugada_id: jugada.id,
      estado: es_gratis ? 'confirmado' : 'pendiente'
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
