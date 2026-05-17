import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'

// Constants for expired sorteo handling
const EXPIRED_SORTEO_SLUG = 'DEFAULT'
const EXPIRED_MESSAGE = 'Boleto caducado, comunicarse con soporte +1 (829) 805-9020'

// Helper to check if a purchase is a "boleto fisico" (physical ticket)
// Physical tickets are exempt from the expired sorteo block
function isBoletoFisico(referidoCodigo: string | null, playerNombre: string | null): boolean {
  if (referidoCodigo?.toUpperCase() === 'BOLETOFISICO') return true
  if (playerNombre) {
    const nombreLower = playerNombre.toLowerCase()
    if (nombreLower.includes('boleto fisico') || nombreLower.includes('boletofisico')) return true
  }
  return false
}

// Helper to check if ticket belongs to expired sorteo (DEFAULT)
function isExpiredSorteo(sorteoSlug: string | null | undefined): boolean {
  if (!sorteoSlug) return false
  return sorteoSlug.toUpperCase() === EXPIRED_SORTEO_SLUG.toUpperCase()
}

// Helper function to get free spins available for a ticket
async function getFreeSpinCount(supabase: SupabaseClient, purchaseGroupId: string, ticketNumber: string) {
  try {
    // Count total tickets in the purchase group
    const { count: totalBoletos } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('purchase_group_id', purchaseGroupId)

    // Get all ticket numbers in the purchase group
    const { data: ticketsInGroup } = await supabase
      .from('tickets')
      .select('numero_boleto')
      .eq('purchase_group_id', purchaseGroupId)

    const ticketNumbers = ticketsInGroup?.map(t => t.numero_boleto) || [ticketNumber]

    // Count free spins already used for any ticket in this group
    const { count: girosUsados } = await supabase
      .from('jugadas_ruleta')
      .select('*', { count: 'exact', head: true })
      .in('numero_boleto_referencia', ticketNumbers)
      .eq('es_giro_gratis', true)

    return {
      total_boletos: totalBoletos || 1,
      giros_usados: girosUsados || 0,
      giros_disponibles: (totalBoletos || 1) - (girosUsados || 0),
    }
  } catch {
    return { total_boletos: 1, giros_usados: 0, giros_disponibles: 1 }
  }
}

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
        sorteo_slug: string
        source: string
        es_boleto_fisico?: boolean
        caducado?: boolean
        mensaje_caducado?: string
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
            let ticketStatus = ticket.status === 'verified' ? 'aprobado' : ticket.status === 'rejected' ? 'rechazado' : 'pendiente'
            
            // Skip if already added
            if (results.some(r => r.numero_boleto === ticket.numero_boleto)) continue
            
            // Check if this is an expired sorteo ticket (DEFAULT)
            const sorteoSlug = pg?.sorteo_slug || ''
            const esBoletoFisico = isBoletoFisico(pg?.referido_codigo, player.nombre)
            const esExpired = isExpiredSorteo(sorteoSlug) && !esBoletoFisico
            
            results.push({
              numero_boleto: ticket.numero_boleto,
              nombre: player.nombre,
              telefono: player.phone_number,
              estado: esExpired ? 'caducado' : ticketStatus,
              cantidad_boletos: 1, // Individual ticket
              monto: individualMonto,
              moneda: pg?.moneda || 'DOP',
              fecha: ticket.created_at,
              banco: pg?.banco || '',
              sorteo_slug: sorteoSlug,
              source: 'new',
              es_boleto_fisico: esBoletoFisico,
              caducado: esExpired,
              mensaje_caducado: esExpired ? EXPIRED_MESSAGE : undefined,
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
              let ticketStatus = ticket.status === 'verified' ? 'aprobado' : ticket.status === 'rejected' ? 'rechazado' : 'pendiente'
              
              // Check if this is an expired sorteo ticket (DEFAULT)
              const sorteoSlug = pg.sorteo_slug || ''
              const esBoletoFisico = isBoletoFisico(pg.referido_codigo, player.nombre)
              const esExpired = isExpiredSorteo(sorteoSlug) && !esBoletoFisico
              
              results.push({
                numero_boleto: ticket.numero_boleto,
                nombre: player.nombre,
                telefono: player.phone_number,
                estado: esExpired ? 'caducado' : ticketStatus,
                cantidad_boletos: 1, // Individual ticket
                monto: individualMonto,
                moneda: pg.moneda,
                fecha: ticket.created_at,
                banco: pg.banco || '',
                sorteo_slug: sorteoSlug,
                source: 'new',
                es_boleto_fisico: esBoletoFisico,
                caducado: esExpired,
                mensaje_caducado: esExpired ? EXPIRED_MESSAGE : undefined,
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
            // Check if this is an expired sorteo ticket (DEFAULT)
            const sorteoSlug = compra.sorteo_slug || ''
            const esBoletoFisico = isBoletoFisico(compra.referido_codigo, compra.nombre_comprador)
            const esExpired = isExpiredSorteo(sorteoSlug) && !esBoletoFisico
            
            results.push({
              numero_boleto: compra.numero_boleto,
              nombre: compra.nombre_comprador,
              telefono: compra.telefono,
              estado: esExpired ? 'caducado' : compra.estado,
              cantidad_boletos: compra.cantidad_boletos,
              monto: compra.monto,
              moneda: compra.moneda,
              fecha: compra.created_at || compra.fecha,
              banco: compra.banco || '',
              sorteo_slug: sorteoSlug,
              source: 'legacy',
              es_boleto_fisico: esBoletoFisico,
              caducado: esExpired,
              mensaje_caducado: esExpired ? EXPIRED_MESSAGE : undefined,
            })
          }
        }
      }

      if (results.length === 0) {
        return NextResponse.json({ error: 'No se encontraron boletos para este teléfono' }, { status: 404 })
      }

      // Count approved BMW X6 and BMW X7 tickets
      // Sort chronologically ASC so the oldest tickets get the lowest bmw_index
      // This matches how boletos_contados is incremented (oldest first)
      const approvedBmwTickets = results
        .filter(r => (r.sorteo_slug === 'bmw-x6' || r.sorteo_slug === 'bmw-x7') && r.estado === 'aprobado' && !r.caducado)
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

      const totalApprovedBmw = approvedBmwTickets.length

      // Get boletos_contados from ruleta_giros_gratis (snapshot of already-processed tickets)
      const cleanPhone = telefono.replace(/[^0-9]/g, '')
      const { data: girosGratisRecord } = await supabase
        .from('ruleta_giros_gratis')
        .select('boletos_contados, giros_usados')
        .eq('telefono', cleanPhone)
        .single()

      const boletosContados = girosGratisRecord?.boletos_contados || 0
      const boletosNuevos = Math.max(0, totalApprovedBmw - boletosContados)
      const freeSpinsForAll = Math.floor(boletosNuevos / 2)

      // Assign bmw_index to each result so the frontend knows which tickets are "used"
      // Index is based on chronological order: 0 = oldest, matches boletos_contados
      const bmwIndexByBoleto: Record<string, number> = {}
      approvedBmwTickets.forEach((t, i) => {
        bmwIndexByBoleto[t.numero_boleto] = i
      })

      // Attach bmw_index to each result
      const resultsWithIndex = results.map(r => ({
        ...r,
        bmw_index: bmwIndexByBoleto[r.numero_boleto] ?? -1,
      }))

      return NextResponse.json({ 
        telefono: telefono, 
        results: resultsWithIndex,
        totalApprovedBmw,
        boletosContados,
        freeSpinsForAll,
      })
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
      let ticketStatus = ticket.status === 'verified' ? 'aprobado' : ticket.status === 'rejected' ? 'rechazado' : 'pendiente'
      
      // Check if this is an expired sorteo ticket (DEFAULT)
      const sorteoSlug = ticket.purchase_group?.sorteo_slug || ''
      const esBoletoFisico = isBoletoFisico(ticket.purchase_group?.referido_codigo, playerInfo?.nombre)
      const esExpired = isExpiredSorteo(sorteoSlug) && !esBoletoFisico
      
      // Get free spin count for this purchase group
      // Physical tickets and expired tickets don't get free spins
      const spinCount = (esExpired || esBoletoFisico) 
        ? { total_boletos: 0, giros_usados: 0, giros_disponibles: 0 }
        : await getFreeSpinCount(supabase, ticket.purchase_group?.id, ticket.numero_boleto)
      
      // For BMW X6/X7 tickets, apply the combined logic (need total approved across both sorteos)
      let totalApprovedBmw = 0
      let boletosContados = 0
      let freeSpinsForAll = 0

      const isBmwTicket = sorteoSlug === 'bmw-x6' || sorteoSlug === 'bmw-x7'
      if (isBmwTicket && playerInfo?.id && !esExpired && !esBoletoFisico) {
        // Count ALL approved BMW X6+X7 tickets for this player
        const { data: bmwPurchaseGroups } = await supabase
          .from('purchase_groups')
          .select('id')
          .eq('player_id', playerInfo.id)
          .eq('estado', 'aprobado')
          .in('sorteo_slug', ['bmw-x6', 'bmw-x7'])

        if (bmwPurchaseGroups && bmwPurchaseGroups.length > 0) {
          const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .in('purchase_group_id', bmwPurchaseGroups.map(pg => pg.id))
          totalApprovedBmw = count || 0
        }

        // Get snapshot from ruleta_giros_gratis
        const cleanPhone = (playerInfo.phone_number || '').replace(/[^0-9]/g, '')
        const { data: girosRecord } = await supabase
          .from('ruleta_giros_gratis')
          .select('boletos_contados, giros_usados')
          .eq('telefono', cleanPhone)
          .single()

        boletosContados = girosRecord?.boletos_contados || 0
        const boletosNuevos = Math.max(0, totalApprovedBmw - boletosContados)
        freeSpinsForAll = Math.floor(boletosNuevos / 2)
      }

      // Calculate bmw_index for this specific ticket (chronological position among approved BMW tickets)
      let bmwIndex = -1
      const isBmwTicketForIndex = sorteoSlug === 'bmw-x6' || sorteoSlug === 'bmw-x7'
      if (isBmwTicketForIndex && playerInfo?.id && !esExpired && !esBoletoFisico) {
        const { data: allBmwPGs } = await supabase
          .from('purchase_groups')
          .select('id, fecha_aprobacion')
          .eq('player_id', playerInfo.id)
          .eq('estado', 'aprobado')
          .in('sorteo_slug', ['bmw-x6', 'bmw-x7'])
          .order('fecha_aprobacion', { ascending: true })

        if (allBmwPGs && allBmwPGs.length > 0) {
          const { data: allBmwTickets } = await supabase
            .from('tickets')
            .select('numero_boleto, purchase_group_id')
            .in('purchase_group_id', allBmwPGs.map(pg => pg.id))
          
          if (allBmwTickets) {
            // Sort by purchase_group order (chronological via fecha_aprobacion)
            const pgOrder = allBmwPGs.map(pg => pg.id)
            const sorted = allBmwTickets.sort((a, b) => {
              return pgOrder.indexOf(a.purchase_group_id) - pgOrder.indexOf(b.purchase_group_id)
            })
            bmwIndex = sorted.findIndex(t => t.numero_boleto === ticket.numero_boleto)
          }
        }
      }

      return NextResponse.json({
        numero_boleto: ticket.numero_boleto,
        nombre: playerInfo?.nombre || 'N/A',
        telefono: playerInfo?.phone_number || '',
        estado: esExpired ? 'caducado' : ticketStatus,
        cantidad_boletos: spinCount.total_boletos,
        monto: individualMonto,
        moneda: ticket.purchase_group?.moneda || 'DOP',
        fecha: ticket.created_at,
        banco: ticket.purchase_group?.banco || '',
        sorteo_slug: sorteoSlug,
        source: 'new',
        giros_gratis_disponibles: spinCount.giros_disponibles,
        giros_gratis_usados: spinCount.giros_usados,
        es_boleto_fisico: esBoletoFisico,
        caducado: esExpired,
        mensaje_caducado: esExpired ? EXPIRED_MESSAGE : undefined,
        // BMW combined logic fields
        totalApprovedBmw,
        boletosContados,
        freeSpinsForAll,
        bmw_index: bmwIndex,
      })
    }

    // Fallback to old compras table
    const { data: compra } = await supabase
      .from('compras')
      .select('*')
      .eq('numero_boleto', cleanBoleto)
      .single()

    if (compra) {
      // Check if this is an expired sorteo ticket (DEFAULT)
      const sorteoSlug = compra.sorteo_slug || ''
      const esBoletoFisico = isBoletoFisico(compra.referido_codigo, compra.nombre_comprador)
      const esExpired = isExpiredSorteo(sorteoSlug) && !esBoletoFisico
      
      return NextResponse.json({
        numero_boleto: compra.numero_boleto,
        nombre: compra.nombre_comprador,
        telefono: compra.telefono || '',
        estado: esExpired ? 'caducado' : compra.estado,
        cantidad_boletos: compra.cantidad_boletos,
        monto: compra.monto,
        moneda: compra.moneda,
        fecha: compra.created_at,
        banco: compra.banco || '',
        sorteo_slug: sorteoSlug,
        source: 'legacy',
        es_boleto_fisico: esBoletoFisico,
        caducado: esExpired,
        mensaje_caducado: esExpired ? EXPIRED_MESSAGE : undefined,
      })
    }

    return NextResponse.json({ error: 'Boleto no encontrado' }, { status: 404 })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
