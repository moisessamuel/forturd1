import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/phone-utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const telefonoRaw = searchParams.get('telefono')

    if (!telefonoRaw) {
      return NextResponse.json({ error: 'Telefono es requerido' }, { status: 400 })
    }

    // Normalizar el número de teléfono (soporta múltiples formatos)
    const telefono = normalizePhone(telefonoRaw)
    if (!telefono) {
      return NextResponse.json({ error: 'Número de teléfono inválido. Debe tener 10 dígitos.' }, { status: 400 })
    }

    // =============================================
    // STEP 1: Check for FREE SPINS from ticket purchases (sorteo boletos)
    // Each ticket = 1 free spin. Must be APPROVED to use.
    // =============================================
    
    // First, find the player by phone number
    const { data: player } = await supabase
      .from('players')
      .select('id, nombre, phone_number')
      .eq('phone_number', telefono)
      .single()

    let pendingTicketsCount = 0
    let approvedTicketsCount = 0
    let playerName = ''

    if (player) {
      playerName = player.nombre || ''
      
      // Get purchase groups for this player - SOLO SORTEOS BMW (bmw-x6 y bmw-x7)
      // IMPORTANTE: Solo boletos de sorteos BMW generan giros gratis
      // Las compras directas de giros NO generan giros adicionales
      const { data: purchaseGroups } = await supabase
        .from('purchase_groups')
        .select('id, estado')
        .eq('player_id', player.id)
        .in('sorteo_slug', ['bmw-x6', 'bmw-x7']) // SOLO sorteos BMW
        .order('created_at', { ascending: false })

      // Separate pending vs approved ticket purchases (SOLO BMW)
      const pendingTicketPurchases = purchaseGroups?.filter(pg => pg.estado === 'pendiente') || []
      const approvedTicketPurchases = purchaseGroups?.filter(pg => pg.estado === 'aprobado') || []

      // Count PENDING BMW tickets (each ticket = 1 pending free spin)
      if (pendingTicketPurchases.length > 0) {
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .in('purchase_group_id', pendingTicketPurchases.map(pg => pg.id))
        pendingTicketsCount = count || 0
      }

      // Count APPROVED BMW tickets (each ticket = 1 free spin available)
      if (approvedTicketPurchases.length > 0) {
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .in('purchase_group_id', approvedTicketPurchases.map(pg => pg.id))
        approvedTicketsCount = count || 0
      }
    }

    // Count how many FREE spins have been USED and boletos already snapshot
    const { data: freeSpinUsageData } = await supabase
      .from('ruleta_giros_gratis')
      .select('giros_usados, boletos_contados')
      .eq('telefono', telefono)
      .single()

    const freeSpinsUsed = freeSpinUsageData?.giros_usados || 0
    const boletosContados = freeSpinUsageData?.boletos_contados || 0

    // FÓRMULA CORRECTA (evita resurrección de giros al comprar más boletos):
    // boletosNuevos = boletos aprobados por encima del último snapshot
    // girasNuevas = FLOOR(boletosNuevos / 2)
    // girosDisponibles = girasNuevas (las anteriores ya están "consumidas" en el snapshot)
    const boletosNuevos = Math.max(0, approvedTicketsCount - boletosContados)
    const totalGirosGratis = Math.floor(boletosNuevos / 2)
    const freeSpinsAvailable = totalGirosGratis

    // =============================================
    // STEP 2: Check for PAID spins (ruleta_jugadas - direct spin purchases)
    // =============================================
    
    const { data: jugadas, error } = await supabase
      .from('ruleta_jugadas')
      .select('*')
      .eq('telefono', telefono)
      .eq('es_gratis', false) // Solo giros comprados directamente, NO giros gratis por boletos
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jugadas:', error)
      return NextResponse.json({ error: 'Error al verificar' }, { status: 500 })
    }

    // Separate pending vs confirmed paid spin purchases
    // IMPORTANT: Only include 'confirmado' jugadas that STILL HAVE spins remaining
    // Do NOT include 'jugado' (fully used) jugadas - they have 0 remaining spins
    const pendingJugadas = jugadas?.filter(j => j.estado === 'pendiente') || []
    
    // ONLY include jugadas that are 'confirmado' (approved but not fully used)
    // 'jugado' means ALL spins were used, so exclude them completely
    const activeJugadas = jugadas?.filter(j => j.estado === 'confirmado') || []



    // =============================================
    // FIX: Only use the MOST RECENT jugada with available spins
    // Do NOT sum across multiple jugadas - this causes ghost spins
    // When a user buys new spins, they get a NEW jugada
    // Old jugadas should be 'jugado' (fully used) and ignored
    // =============================================
    let paidSpinsAvailable = 0
    let latestActiveJugada = null

    // activeJugadas is already sorted by created_at DESC (most recent first)
    for (const jugada of activeJugadas) {
      const cantidadGiros = jugada.cantidad_giros || 1
      const girosUsados = jugada.giros_usados || 0
      const girosRestantes = cantidadGiros - girosUsados
      
      if (girosRestantes > 0 && !latestActiveJugada) {
        // Use ONLY the most recent jugada with available spins
        latestActiveJugada = jugada
        paidSpinsAvailable = girosRestantes
        break // Stop here - only use one jugada
      } else if (girosRestantes <= 0) {
        // This jugada has no remaining spins but is still 'confirmado'
        // Auto-fix: mark it as 'jugado' to prevent future issues
        await supabase
          .from('ruleta_jugadas')
          .update({ estado: 'jugado' })
          .eq('id', jugada.id)
      }
    }

    // =============================================
    // DECISION LOGIC
    // =============================================

    // If user ONLY has PENDING items (no approved tickets, no confirmed paid spins)
    const hasOnlyPendingStuff = 
      pendingTicketsCount > 0 && 
      approvedTicketsCount === 0 && 
      activeJugadas.length === 0

    if (hasOnlyPendingStuff) {
      return NextResponse.json({
        success: false,
        pending: true,
        pending_tickets: pendingTicketsCount,
        error: `Tienes ${pendingTicketsCount} boleto${pendingTicketsCount > 1 ? 's' : ''} pendiente${pendingTicketsCount > 1 ? 's' : ''} de confirmación. Una vez aprobado${pendingTicketsCount > 1 ? 's' : ''} podrás usar tu${pendingTicketsCount > 1 ? 's' : ''} giro${pendingTicketsCount > 1 ? 's' : ''} gratis.`
      })
    }

    // If user has only pending paid spins and nothing else
    if (pendingJugadas.length > 0 && activeJugadas.length === 0 && approvedTicketsCount === 0) {
      return NextResponse.json({
        success: false,
        pending: true,
        error: 'Tu pago aún no ha sido confirmado. Por favor espera la verificación.'
      })
    }

    // Calculate total available spins (free + paid)
    const totalSpinsAvailable = freeSpinsAvailable + paidSpinsAvailable

    // If no spins available at all
    if (totalSpinsAvailable <= 0) {
      // Check if they have pending items to inform them
      if (pendingTicketsCount > 0) {
        return NextResponse.json({
          success: false,
          pending: true,
          pending_tickets: pendingTicketsCount,
          error: `Ya usaste tus giros disponibles. Tienes ${pendingTicketsCount} boleto${pendingTicketsCount > 1 ? 's' : ''} pendiente${pendingTicketsCount > 1 ? 's' : ''} de confirmación.`
        })
      }
      
      return NextResponse.json({
        success: false,
        error: 'No tienes giros disponibles. Ya usaste todos tus giros o compra más para participar.'
      })
    }

    // User has available spins!
    return NextResponse.json({
      success: true,
      // Free spins from tickets (REGLA: FLOOR(boletosNuevos/2) por snapshot)
      giros_gratis_disponibles: freeSpinsAvailable,
      giros_gratis_totales: totalGirosGratis,
      giros_gratis_usados: freeSpinsUsed,
      // Paid spins
      giros_pagados_disponibles: paidSpinsAvailable,
      giros_pagados_totales: latestActiveJugada?.cantidad_giros || 0,
      giros_pagados_usados: latestActiveJugada?.giros_usados || 0,
      // Combined
      giros_disponibles: totalSpinsAvailable,
      // Pending info
      boletos_pendientes: pendingTicketsCount,
      // Legacy fields for compatibility
      jugada_id: latestActiveJugada?.id,
      nombre: latestActiveJugada?.nombre || playerName || '',
      telefono: telefono,
    })

  } catch (error) {
    console.error('Verify spins error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
