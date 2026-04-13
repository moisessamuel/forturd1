import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ticketIds, nombre, phone_number, email } = body

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return NextResponse.json({ error: 'Ticket IDs required' }, { status: 400 })
    }

    if (!nombre?.trim() || !phone_number?.trim()) {
      return NextResponse.json({ error: 'Nombre y telefono son requeridos' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if a player with this phone number already exists
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('phone_number', phone_number.trim())
      .single()

    let playerId: string

    if (existingPlayer) {
      // Update existing player
      const { error: updateError } = await supabase
        .from('players')
        .update({
          nombre: nombre.trim(),
          email: email?.trim() || null,
        })
        .eq('id', existingPlayer.id)

      if (updateError) throw updateError
      playerId = existingPlayer.id
    } else {
      // Create new player for the bulk edit
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          nombre: nombre.trim(),
          phone_number: phone_number.trim(),
          email: email?.trim() || null,
        })
        .select()
        .single()

      if (playerError) throw playerError
      playerId = newPlayer.id
    }

    // Update all selected tickets to point to this player
    const { error: ticketsError } = await supabase
      .from('tickets')
      .update({ player_id: playerId })
      .in('id', ticketIds)

    if (ticketsError) throw ticketsError

    return NextResponse.json({ 
      success: true, 
      updatedCount: ticketIds.length,
      playerId 
    })
  } catch (error) {
    console.error('Error bulk editing tickets:', error)
    return NextResponse.json(
      { error: 'Error al actualizar los boletos' },
      { status: 500 }
    )
  }
}
