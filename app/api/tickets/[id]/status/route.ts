import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH - Update individual ticket status (approve/reject/revert)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params
    const { estado } = await request.json()

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
    }

    if (!['aprobado', 'rechazado', 'pendiente'].includes(estado)) {
      return NextResponse.json({ error: 'Invalid estado' }, { status: 400 })
    }

    // Get ticket info including purchase group
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, purchase_group:purchase_groups(*)')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const purchaseGroup = ticket.purchase_group

    // Map estado to ticket status
    const ticketStatus = estado === 'aprobado' ? 'verified' : estado === 'rechazado' ? 'rejected' : 'pending'

    // Update ticket status
    const { error: updateTicketError } = await supabase
      .from('tickets')
      .update({ status: ticketStatus })
      .eq('id', ticketId)

    if (updateTicketError) throw updateTicketError

    // Check all tickets in this purchase group to determine the group estado
    const { data: allTickets, error: allTicketsError } = await supabase
      .from('tickets')
      .select('status')
      .eq('purchase_group_id', purchaseGroup.id)

    if (allTicketsError) throw allTicketsError

    // Determine purchase group estado based on all tickets
    // If all approved -> aprobado
    // If all rejected -> rechazado
    // If any pending -> pendiente
    // If mixed approved/rejected -> aprobado (partial)
    let groupEstado: 'pendiente' | 'aprobado' | 'rechazado' = 'pendiente'
    
    const allVerified = allTickets.every(t => t.status === 'verified')
    const allRejected = allTickets.every(t => t.status === 'rejected')
    const anyPending = allTickets.some(t => t.status === 'pending')

    if (anyPending) {
      groupEstado = 'pendiente'
    } else if (allVerified) {
      groupEstado = 'aprobado'
    } else if (allRejected) {
      groupEstado = 'rechazado'
    } else {
      // Mixed - some approved, some rejected
      groupEstado = 'aprobado' // Consider partially approved as approved
    }

    // Update purchase group estado
    const { error: updatePgError } = await supabase
      .from('purchase_groups')
      .update({ estado: groupEstado })
      .eq('id', purchaseGroup.id)

    if (updatePgError) throw updatePgError

    return NextResponse.json({ 
      success: true, 
      ticketStatus,
      groupEstado
    })
  } catch (error) {
    console.error('Error updating ticket status:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el estado del boleto' },
      { status: 500 }
    )
  }
}
