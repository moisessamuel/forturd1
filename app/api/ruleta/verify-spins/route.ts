import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const telefono = searchParams.get('telefono')

    if (!telefono) {
      return NextResponse.json({ error: 'Telefono es requerido' }, { status: 400 })
    }

    // =============================================
    // STEP 1: Check for FREE SPINS from ticket purchases (sorteo boletos)
    // Each ticket = 1 free spin. Must be APPROVED to use.
    // =============================================
    
    const { data: purchaseGroups } = await supabase
      .from('purchase_groups')
      .select('id, estado, nombre, telefono')
      .eq('telefono', telefono)
      .order('created_at', { ascending: false })

    // Separate pending vs approved ticket purchases
    const pendingTicketPurchases = purchaseGroups?.filter(pg => pg.estado === 'pendiente') || []
    const approvedTicketPurchases = purchaseGroups?.filter(pg => pg.estado === 'aprobado') || []

    // Count PENDING tickets (each ticket = 1 pending free spin)
    let pendingTicketsCount = 0
    if (pendingTicketPurchases.length > 0) {
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('purchase_group_id', pendingTicketPurchases.map(pg => pg.id))
      pendingTicketsCount = count || 0
    }

    // Count APPROVED tickets (each ticket = 1 free spin available)
    let approvedTicketsCount = 0
    if (approvedTicketPurchases.length > 0) {
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('purchase_group_id', approvedTicketPurchases.map(pg => pg.id))
      approvedTicketsCount = count || 0
    }

    // Count how many FREE spins have been USED for this phone number
    const { data: freeSpinUsageData } = await supabase
      .from('ruleta_giros_gratis')
      .select('giros_usados')
      .eq('telefono', telefono)
      .single()
    
    const freeSpinsUsed = freeSpinUsageData?.giros_usados || 0
    const freeSpinsAvailable = Math.max(0, approvedTicketsCount - freeSpinsUsed)

    // =============================================
    // STEP 2: Check for PAID spins (ruleta_jugadas - direct spin purchases)
    // =============================================
    
    const { data: jugadas, error } = await supabase
      .from('ruleta_jugadas')
      .select('*')
      .eq('telefono', telefono)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching jugadas:', error)
      return NextResponse.json({ error: 'Error al verificar' }, { status: 500 })
    }

    // Separate pending vs confirmed paid spin purchases
    const pendingJugadas = jugadas?.filter(j => j.estado === 'pendiente') || []
    const activeJugadas = jugadas?.filter(j => j.estado === 'confirmado' || j.estado === 'jugado') || []

    // Calculate paid spins available
    let totalPaidSpins = 0
    let totalPaidSpinsUsed = 0
    let latestActiveJugada = null

    for (const jugada of activeJugadas) {
      let cantidadGiros = jugada.cantidad_giros
      if (!cantidadGiros || cantidadGiros <= 1) {
        const monto = Number(jugada.monto) || 0
        if (jugada.moneda === 'DOP') {
          cantidadGiros = Math.max(1, Math.floor(monto / 100))
        } else if (jugada.moneda === 'USD') {
          cantidadGiros = Math.max(1, Math.floor(monto / 2))
        } else {
          cantidadGiros = 1
        }
      }
      
      totalPaidSpins += cantidadGiros
      totalPaidSpinsUsed += (jugada.giros_usados || 0)
      
      if (!latestActiveJugada && (cantidadGiros - (jugada.giros_usados || 0)) > 0) {
        latestActiveJugada = jugada
      }
    }

    const paidSpinsAvailable = totalPaidSpins - totalPaidSpinsUsed

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
      // Free spins from tickets
      giros_gratis_disponibles: freeSpinsAvailable,
      giros_gratis_totales: approvedTicketsCount,
      giros_gratis_usados: freeSpinsUsed,
      // Paid spins
      giros_pagados_disponibles: paidSpinsAvailable,
      giros_pagados_totales: totalPaidSpins,
      giros_pagados_usados: totalPaidSpinsUsed,
      // Combined
      giros_disponibles: totalSpinsAvailable,
      // Pending info
      boletos_pendientes: pendingTicketsCount,
      // Legacy fields for compatibility
      jugada_id: latestActiveJugada?.id,
      nombre: latestActiveJugada?.nombre || purchaseGroups?.[0]?.nombre || '',
      telefono: telefono,
    })

  } catch (error) {
    console.error('Verify spins error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
