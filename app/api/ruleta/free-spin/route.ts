import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Constants for expired sorteo handling
const EXPIRED_SORTEO_SLUG = 'DEFAULT'

// Helper to check if a purchase is a "boleto fisico" (physical ticket)
function isBoletoFisico(referidoCodigo: string | null, playerNombre: string | null): boolean {
  if (referidoCodigo?.toUpperCase() === 'BOLETOFISICO') return true
  if (playerNombre) {
    const nombreLower = playerNombre.toLowerCase()
    if (nombreLower.includes('boleto fisico') || nombreLower.includes('boletofisico')) return true
  }
  return false
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { numero_boleto, nombre, telefono, premio_id, resultado } = body

    if (!numero_boleto || !nombre) {
      return NextResponse.json(
        { error: 'numero_boleto y nombre son requeridos' },
        { status: 400 }
      )
    }

    // =============================================
    // SECURITY: Validate that user has APPROVED tickets before allowing free spin
    // Also block expired sorteo (DEFAULT) and physical tickets
    // This prevents bypassing the frontend restriction
    // =============================================
    if (telefono) {
      // Find the player
      const { data: player } = await supabase
        .from('players')
        .select('id, nombre')
        .eq('phone_number', telefono)
        .single()

      if (player) {
        // Get purchase groups for this player WITH sorteo_slug and referido_codigo
        const { data: purchaseGroups } = await supabase
          .from('purchase_groups')
          .select('id, estado, sorteo_slug, referido_codigo')
          .eq('player_id', player.id)

        // SECURITY: Block if all tickets are from expired sorteo (DEFAULT) and NOT physical tickets
        const nonPhysicalPurchases = purchaseGroups?.filter(pg => !isBoletoFisico(pg.referido_codigo, player.nombre)) || []
        const allFromExpiredSorteo = nonPhysicalPurchases.length > 0 && 
          nonPhysicalPurchases.every(pg => pg.sorteo_slug?.toUpperCase() === EXPIRED_SORTEO_SLUG)
        
        if (allFromExpiredSorteo) {
          return NextResponse.json(
            { error: 'Boleto caducado, comunicarse con soporte +1 (829) 805-9020' },
            { status: 403 }
          )
        }

        // SECURITY: Block physical tickets from getting free spins
        const isPhysicalTicketUser = isBoletoFisico(null, player.nombre)
        if (isPhysicalTicketUser) {
          return NextResponse.json(
            { error: 'Los boletos fisicos no incluyen giros gratis en la ruleta.' },
            { status: 403 }
          )
        }

        // Filter to only non-expired, non-physical approved purchases
        const validApprovedPurchases = purchaseGroups?.filter(pg => 
          pg.estado === 'aprobado' && 
          pg.sorteo_slug?.toUpperCase() !== EXPIRED_SORTEO_SLUG &&
          !isBoletoFisico(pg.referido_codigo, player.nombre)
        ) || []
        
        if (validApprovedPurchases.length === 0) {
          // No valid approved tickets - check if they have pending ones
          const pendingPurchases = purchaseGroups?.filter(pg => 
            pg.estado === 'pendiente' &&
            pg.sorteo_slug?.toUpperCase() !== EXPIRED_SORTEO_SLUG &&
            !isBoletoFisico(pg.referido_codigo, player.nombre)
          ) || []
          
          if (pendingPurchases.length > 0) {
            return NextResponse.json(
              { error: 'Tus boletos aun no han sido confirmados. Una vez confirmados podras usar tus giros gratis.' },
              { status: 403 }
            )
          }
          
          return NextResponse.json(
            { error: 'No tienes boletos validos para giros gratis.' },
            { status: 403 }
          )
        }

        // Count valid approved tickets (non-expired, non-physical)
        let approvedTicketsCount = 0
        if (validApprovedPurchases.length > 0) {
          const { count } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .in('purchase_group_id', validApprovedPurchases.map(pg => pg.id))
          approvedTicketsCount = count || 0
        }

        // NEW LOGIC: Require 2+ approved tickets for free spins
        if (approvedTicketsCount < 2) {
          return NextResponse.json(
            { error: 'Te falta 1 boleto más para activar tus giradas gratis.' },
            { status: 403 }
          )
        }

        // Check how many free spins have been used
        const { data: usageData } = await supabase
          .from('ruleta_giros_gratis')
          .select('giros_usados')
          .eq('telefono', telefono)
          .single()

        const freeSpinsUsed = usageData?.giros_usados || 0
        const freeSpinsAvailable = approvedTicketsCount - freeSpinsUsed

        if (freeSpinsAvailable <= 0) {
          return NextResponse.json(
            { error: 'No tienes giros gratis disponibles. Ya usaste todos tus giros.' },
            { status: 403 }
          )
        }
      }
    }

    // Insert free spin record into jugadas_ruleta
    const { data, error } = await supabase
      .from('jugadas_ruleta')
      .insert({
        nombre,
        telefono: telefono || '',
        email: '',
        monto: 0, // Free spin
        moneda: 'DOP',
        banco: 'Giro Gratis',
        estado: 'jugado',
        premio_id: premio_id || null,
        resultado: resultado || null,
        numero_boleto_referencia: numero_boleto,
        es_giro_gratis: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording free spin:', error)
      return NextResponse.json(
        { error: 'Error al registrar el giro gratis' },
        { status: 500 }
      )
    }

    // NOTE: giros_usados is now updated ONLY in /api/ruleta/spin-count
    // This prevents double-counting that was causing the spin count bug
    // The spin-count endpoint handles all giros_usados tracking for both paid and free spins

    return NextResponse.json({
      success: true,
      jugada_id: data.id,
      message: 'Giro gratis registrado exitosamente',
    })
  } catch (error) {
    console.error('Free spin API error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
