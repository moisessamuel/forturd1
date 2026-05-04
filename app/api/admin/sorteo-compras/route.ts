import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTicketApprovalEmail } from '@/lib/email'

// This endpoint is for the individual sorteo admin panels (BMW X6, BMW X7)
// Authentication is handled via sessionStorage on the client side
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const sorteoSlug = searchParams.get('sorteo_slug')
    const estado = searchParams.get('estado')
    const search = searchParams.get('search')

    if (!sorteoSlug) {
      return NextResponse.json({ error: 'sorteo_slug is required' }, { status: 400 })
    }

    // Query purchase_groups table with player data for this sorteo
    let query = supabase
      .from('purchase_groups')
      .select(`
        id,
        player_id,
        sorteo_slug,
        estado,
        monto,
        moneda,
        banco,
        total_tickets,
        comprobante_url,
        created_at,
        player:players(id, nombre, phone_number, email)
      `)
      .eq('sorteo_slug', sorteoSlug)
      .order('created_at', { ascending: false })

    if (estado && estado !== 'Todos' && estado !== 'todos') {
      query = query.eq('estado', estado.toLowerCase())
    }

    const { data: compras, error } = await query

    if (error) {
      console.error('Sorteo compras fetch error:', error)
      return NextResponse.json({ error: 'Error al obtener compras' }, { status: 500 })
    }

    // Filter by search if provided
    let result = compras || []
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(compra => {
        const nombre = compra.player?.nombre?.toLowerCase() || ''
        const telefono = compra.player?.phone_number?.toLowerCase() || ''
        return nombre.includes(searchLower) || telefono.includes(searchLower)
      })
    }

    // Get ticket numbers for each purchase group
    const purchaseIds = result.map(c => c.id)
    const { data: allTickets } = await supabase
      .from('tickets')
      .select('purchase_group_id, numero_boleto')
      .in('purchase_group_id', purchaseIds)

    // Group tickets by purchase_group_id
    const ticketsByPurchase: Record<string, string[]> = {}
    allTickets?.forEach(ticket => {
      if (!ticketsByPurchase[ticket.purchase_group_id]) {
        ticketsByPurchase[ticket.purchase_group_id] = []
      }
      ticketsByPurchase[ticket.purchase_group_id].push(ticket.numero_boleto)
    })

    // Transform to match the expected format in the admin panel
    const transformed = result.map(compra => ({
      id: compra.id,
      nombre: compra.player?.nombre || 'N/A',
      telefono: compra.player?.phone_number || 'N/A',
      email: compra.player?.email || null,
      cantidad_boletos: compra.total_tickets || 1,
      total_tickets: compra.total_tickets || 1,
      numeros_boletos: ticketsByPurchase[compra.id] || [],
      monto: compra.monto,
      moneda: compra.moneda || 'DOP',
      banco: compra.banco || 'N/A',
      comprobante_url: compra.comprobante_url,
      estado: compra.estado,
      sorteo_slug: compra.sorteo_slug,
      created_at: compra.created_at,
      player: compra.player,
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Sorteo compras error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Update estado (approve/reject/reset)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { id, estado } = body

    if (!id || !estado) {
      return NextResponse.json({ error: 'id and estado are required' }, { status: 400 })
    }

    // Map estado to ticket status
    const ticketStatus = estado === 'aprobado' ? 'verified' : estado === 'rechazado' ? 'rejected' : 'pending'

    // Update all tickets in this purchase group
    const { error: ticketsError } = await supabase
      .from('tickets')
      .update({ status: ticketStatus })
      .eq('purchase_group_id', id)

    if (ticketsError) {
      console.error('Update tickets status error:', ticketsError)
      // Don't fail, continue to update purchase group
    }

    // Update purchase_groups status
    const { data, error } = await supabase
      .from('purchase_groups')
      .update({ estado })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update estado error:', error)
      return NextResponse.json({ error: 'Error al actualizar estado' }, { status: 500 })
    }

    // If approved, send confirmation email to the player
    if (estado === 'aprobado' && data) {
      try {
        // Get player info and tickets
        const { data: player } = await supabase
          .from('players')
          .select('nombre, email, phone_number')
          .eq('id', data.player_id)
          .single()

        // Get ticket numbers for this purchase
        const { data: tickets } = await supabase
          .from('tickets')
          .select('numero_boleto')
          .eq('purchase_group_id', id)

        if (player?.email) {
          const ticketNumbers = tickets?.map(t => t.numero_boleto) || []
          const sorteoName = data.sorteo_slug === 'bmw-x6' ? 'BMW X6' : 
                            data.sorteo_slug === 'bmw-x7' ? 'BMW X7' : 
                            data.sorteo_slug.toUpperCase()

          await sendTicketApprovalEmail({
            playerEmail: player.email,
            playerName: player.nombre,
            ticketNumbers,
            totalAmount: data.monto,
            moneda: data.moneda || 'DOP',
            qrCodeUrl: '',
            purchaseDate: new Date().toISOString(),
            sorteoName,
          })
          console.log('Approval email sent to:', player.email)
        }
      } catch (emailError) {
        console.error('Error sending approval email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('PATCH error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Delete a purchase
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Accept id from either body or query params
    let id: string | null = null
    try {
      const body = await request.json()
      id = body.id
    } catch {
      const { searchParams } = new URL(request.url)
      id = searchParams.get('id')
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    // First delete associated tickets
    await supabase
      .from('tickets')
      .delete()
      .eq('purchase_group_id', id)

    // Then delete the purchase group
    const { error } = await supabase
      .from('purchase_groups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete purchase error:', error)
      return NextResponse.json({ error: 'Error al eliminar compra' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
