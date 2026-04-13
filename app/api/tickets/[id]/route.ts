import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH - Update ticket buyer info (creates new player or updates existing)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params
    const { nombre, phone_number, email } = await request.json()

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
    }

    // Get current ticket info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, purchase_group:purchase_groups(*)')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Check if this ticket already has a different player than the purchase group
    // If so, update that player. Otherwise, create a new player for this ticket
    const purchaseGroup = ticket.purchase_group
    
    if (ticket.player_id !== purchaseGroup.player_id) {
      // Ticket already has its own player - update it
      const { error: updateError } = await supabase
        .from('players')
        .update({
          nombre,
          phone_number,
          email: email || null,
        })
        .eq('id', ticket.player_id)

      if (updateError) throw updateError
    } else {
      // Ticket shares player with purchase group - create new player for this ticket
      // First check if a player with this phone already exists
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('phone_number', phone_number)
        .single()

      let newPlayerId: string

      if (existingPlayer) {
        // Update existing player
        await supabase
          .from('players')
          .update({ nombre, email: email || null })
          .eq('id', existingPlayer.id)
        newPlayerId = existingPlayer.id
      } else {
        // Create new player
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            nombre,
            phone_number,
            email: email || null,
          })
          .select()
          .single()

        if (createError) throw createError
        newPlayerId = newPlayer.id
      }

      // Update ticket to point to new player
      const { error: linkError } = await supabase
        .from('tickets')
        .update({ player_id: newPlayerId })
        .eq('id', ticketId)

      if (linkError) throw linkError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating ticket:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el boleto' },
      { status: 500 }
    )
  }
}
