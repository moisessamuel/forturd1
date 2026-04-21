import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const boleto = searchParams.get('boleto')
    const telefono = searchParams.get('telefono')

    if (!boleto && !telefono) {
      return NextResponse.json({ error: 'Número de boleto o teléfono requerido' }, { status: 400 })
    }

    const supabase = await createClient()

    // Search by phone number - returns all tickets for that person
    if (telefono) {
      // Strip all non-digit characters for flexible matching
      const digitsOnly = telefono.replace(/[^0-9]/g, '')
      const results: Array<{
        numero_boleto: string
        nombre: string
        telefono: string
        estado: string
        cantidad_boletos: number
        monto: number
        moneda: string
        fecha: string
        banco: string
        source: string
      }> = []

      // Get all players and match by normalized phone number (digits only)
      const { data: allPlayers } = await supabase
        .from('players')
        .select('*')

      // Find matching players by comparing only digits
      const matchingPlayers = (allPlayers || []).filter(p => {
        if (!p.phone_number) return false
        const playerDigits = p.phone_number.replace(/[^0-9]/g, '')
        
        // Match if digits are equal, or if one contains the other (for country code variations)
        // Also match last 10 digits (typical phone number without country code)
        const searchLast10 = digitsOnly.slice(-10)
        const playerLast10 = playerDigits.slice(-10)
        
        return digitsOnly === playerDigits || 
               playerDigits.endsWith(digitsOnly) || 
               digitsOnly.endsWith(playerDigits) ||
               (searchLast10.length >= 7 && searchLast10 === playerLast10)
      })

      // Process all matching players
      for (const player of matchingPlayers) {
        // Search tickets directly where this player is the ticket_player (individual edits)
        const { data: directTickets } = await supabase
          .from('tickets')
          .select('*, purchase_group:purchase_groups(*)')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false })

        if (directTickets) {
          for (const ticket of directTickets) {
            const pg = ticket.purchase_group
            const totalTickets = pg?.total_tickets || 1
            const individualMonto = (pg?.monto || 0) / totalTickets
            const ticketStatus = ticket.status === 'verified' ? 'aprobado' : ticket.status === 'rejected' ? 'rechazado' : 'pendiente'
            
            // Skip if already added
            if (results.some(r => r.numero_boleto === ticket.numero_boleto)) continue
            
            results.push({
              numero_boleto: ticket.numero_boleto,
              nombre: player.nombre,
              telefono: player.phone_number,
              estado: ticketStatus,
              cantidad_boletos: 1, // Individual ticket
              monto: individualMonto,
              moneda: pg?.moneda || 'DOP',
              fecha: ticket.created_at,
              banco: pg?.banco || '',
              source: 'new',
            })
          }
        }

        // Also search where this player is the purchase_group player (original purchases)
        const { data: purchaseGroups } = await supabase
          .from('purchase_groups')
          .select('*, tickets(*)')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false })

        if (purchaseGroups) {
          for (const pg of purchaseGroups) {
            for (const ticket of (pg.tickets || [])) {
              // Skip if ticket was already added
              const alreadyAdded = results.some(r => r.numero_boleto === ticket.numero_boleto)
              if (alreadyAdded) continue
              
              const totalTickets = pg.total_tickets || 1
              const individualMonto = pg.monto / totalTickets
              const ticketStatus = ticket.status === 'verified' ? 'aprobado' : ticket.status === 'rejected' ? 'rechazado' : 'pendiente'
              
              results.push({
                numero_boleto: ticket.numero_boleto,
                nombre: player.nombre,
                telefono: player.phone_number,
                estado: ticketStatus,
                cantidad_boletos: 1, // Individual ticket
                monto: individualMonto,
                moneda: pg.moneda,
                fecha: ticket.created_at,
                banco: pg.banco || '',
                source: 'new',
              })
            }
          }
        }
      }

      // Also search in legacy compras table with flexible matching
      const { data: allCompras } = await supabase
        .from('compras')
        .select('*')
        .order('fecha', { ascending: false })

      if (allCompras) {
        for (const compra of allCompras) {
          if (!compra.numero_boleto || !compra.telefono) continue
          
          // Normalize compra phone number and compare
          const compraDigits = compra.telefono.replace(/[^0-9]/g, '')
          const searchLast10 = digitsOnly.slice(-10)
          const compraLast10 = compraDigits.slice(-10)
          
          const isMatch = digitsOnly === compraDigits ||
                         compraDigits.endsWith(digitsOnly) ||
                         digitsOnly.endsWith(compraDigits) ||
                         (searchLast10.length >= 7 && searchLast10 === compraLast10)
          
          if (isMatch && !results.some(r => r.numero_boleto === compra.numero_boleto)) {
            results.push({
              numero_boleto: compra.numero_boleto,
              nombre: compra.nombre_comprador,
              telefono: compra.telefono,
              estado: compra.estado,
              cantidad_boletos: compra.cantidad_boletos,
              monto: compra.monto,
              moneda: compra.moneda,
              fecha: compra.created_at || compra.fecha,
              banco: compra.banco || '',
              source: 'legacy',
            })
          }
        }
      }

      if (results.length === 0) {
        return NextResponse.json({ error: 'No se encontraron boletos para este teléfono' }, { status: 404 })
      }

      return NextResponse.json({ telefono: telefono, results })
    }

    // Search by ticket number - single result
    const cleanBoleto = boleto!.replace(/[^0-9]/g, '')

    // Try new tickets table first
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, purchase_group:purchase_groups(*, player:players(*))')
      .eq('numero_boleto', cleanBoleto)
      .single()

    if (ticket) {
      // Get the ticket's individual player if player_id differs from purchase group's player_id
      let ticketPlayer = null
      if (ticket.player_id && ticket.player_id !== ticket.purchase_group?.player_id) {
        const { data: individualPlayer } = await supabase
          .from('players')
          .select('*')
          .eq('id', ticket.player_id)
          .single()
        ticketPlayer = individualPlayer
      }
      
      // Use individual ticket player if exists, otherwise fall back to purchase group player
      const groupPlayer = ticket.purchase_group?.player
      const playerInfo = ticketPlayer || groupPlayer
      
      // Calculate individual ticket amount
      const totalTickets = ticket.purchase_group?.total_tickets || 1
      const totalMonto = ticket.purchase_group?.monto || 0
      const individualMonto = totalMonto / totalTickets
      
      // Determine ticket-specific status from ticket.status field
      const ticketStatus = ticket.status === 'verified' ? 'aprobado' : ticket.status === 'rejected' ? 'rechazado' : 'pendiente'
      
      return NextResponse.json({
        numero_boleto: ticket.numero_boleto,
        nombre: playerInfo?.nombre || 'N/A',
        telefono: playerInfo?.phone_number || '',
        estado: ticketStatus,
        cantidad_boletos: 1, // Each ticket is individual
        monto: individualMonto,
        moneda: ticket.purchase_group?.moneda || 'DOP',
        fecha: ticket.created_at,
        banco: ticket.purchase_group?.banco || '',
        source: 'new',
      })
    }

    // Fallback to old compras table
    const { data: compra } = await supabase
      .from('compras')
      .select('*')
      .eq('numero_boleto', cleanBoleto)
      .single()

    if (compra) {
      return NextResponse.json({
        numero_boleto: compra.numero_boleto,
        nombre: compra.nombre_comprador,
        telefono: compra.telefono || '',
        estado: compra.estado,
        cantidad_boletos: compra.cantidad_boletos,
        monto: compra.monto,
        moneda: compra.moneda,
        fecha: compra.created_at,
        banco: compra.banco || '',
        source: 'legacy',
      })
    }

    return NextResponse.json({ error: 'Boleto no encontrado' }, { status: 404 })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
